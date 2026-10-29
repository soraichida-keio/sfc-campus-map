// ねるの音声を AivisSpeech(話者: まお)で事前生成する。
//   node tools/voice/gen.mjs [--limit N] [--only prefix] [--force]
// 前提: AivisSpeech が http://127.0.0.1:10101 で起動していること。ffmpeg(libmp3lame)が使えること。
import { build } from 'esbuild';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENGINE = process.env.AIVIS_URL || 'http://127.0.0.1:10101';
const SPEAKER = Number(process.env.AIVIS_SPEAKER || 888753760); // まお(ノーマル)
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : (args[i + 1] ?? true); };
const limit = Number(opt('--limit', 0)), only = opt('--only', ''), force = args.includes('--force');

const tmp = join(tmpdir(), 'sfcmap-voice-entry.mjs');
await build({ entryPoints: ['tools/voice/entry.mjs'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, loader: { '.json': 'json' }, logLevel: 'error' });
const { allLines, ttsRead, lineKey, VOICE_TAG } = await import(tmp + '?t=' + Date.now());

mkdirSync('public/voice', { recursive: true });
const lines = allLines();
const seen = new Map();
for (const l of lines) { const spoken = ttsRead(l.t); const key = lineKey(l.t, VOICE_TAG); if (!seen.has(key)) seen.set(key, { ...l, spoken, key }); }
let todo = [...seen.values()].filter((l) => !only || l.id.startsWith(only));
if (!force) todo = todo.filter((l) => !existsSync(`public/voice/${l.key}.mp3`));
if (limit) todo = todo.slice(0, limit);
console.log(`lines total ${lines.length} / unique ${seen.size} / to generate ${todo.length}`);

async function post(path, body, json = true) {
  const r = await fetch(ENGINE + path, { method: 'POST', headers: json ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${path} ${r.status} ${await r.text().catch(() => '')}`);
  return r;
}
async function synth(text) {
  const q = await (await post(`/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(text)}`)).json();
  Object.assign(q, { speedScale: 1.05, intonationScale: 1.15, pitchScale: 0.0, volumeScale: 1.0, prePhonemeLength: 0.08, postPhonemeLength: 0.22, outputSamplingRate: 24000, outputStereo: false });
  const r = await post(`/synthesis?speaker=${SPEAKER}`, q);
  return Buffer.from(await r.arrayBuffer());
}
let done = 0, fail = 0;
for (const l of todo) {
  try {
    const wav = await synth(l.spoken);
    const w = join(tmpdir(), `sfcmap-${l.key}.wav`); writeFileSync(w, wav);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', `public/voice/${l.key}.mp3`]);
    unlinkSync(w); done++;
    if (done % 20 === 0) console.log(`  ${done}/${todo.length}`);
  } catch (e) { fail++; console.error('FAIL', l.id, e.message); }
}
// 一覧(確認用・失効した音声の掃除に使う)
const manifest = [...seen.values()].map((l) => ({ id: l.id, key: l.key, text: l.t, spoken: l.spoken, bytes: existsSync(`public/voice/${l.key}.mp3`) ? statSync(`public/voice/${l.key}.mp3`).size : 0 }));
writeFileSync('tools/voice/manifest.json', JSON.stringify({ voice: 'AivisSpeech まお(ノーマル)', speaker: SPEAKER, tag: VOICE_TAG, generated: new Date().toISOString(), lines: manifest }, null, 1));
console.log(`done ${done}, failed ${fail}, files ${manifest.filter((m) => m.bytes).length}/${manifest.length}`);
