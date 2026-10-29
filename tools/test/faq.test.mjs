// FAQ の当たり具合の検査。node tools/test/faq.test.mjs(先に node tools/build.mjs で public/faq-full.json を作っておく)
//  1. 自己検索: 各 FAQ の質問文そのもので、その FAQ が1位になるか
//  2. 言い換え: 人が書いた言い換え(下の PARA)で、期待どおりの FAQ が1位か
//  3. 関係ない質問は「分からない」に落ちるか(誤爆の検査)
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(tmpdir(), 'sfcmap-brain-faq-test.mjs');
await build({ entryPoints: ['src/js/nel/brain.js'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const FULL = readFileSync('public/faq-full.json');
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(FULL) });
const { answer, rankFaq } = await import(out + '?t=' + Date.now());
const { FAQS } = await import((await (async () => { const o = join(tmpdir(), 'sfcmap-content-faq-test.mjs'); await build({ entryPoints: ['src/js/content.js'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' }); return o; })()) + '?t=' + Date.now());

const idByQ = new Map(FAQS.map((f) => [f.q, f.id]));
const chipIds = async (q) => { try { const a = await answer(q, {}); return (a.chips || []).map((c) => idByQ.get(c.q)).filter(Boolean); } catch { return []; } };
const idOf = async (q) => { try { const a = await answer(q, {}); return (a.lines[0]?.id || '-').replace(/^(faq:[^:]+):\d+$/, '$1'); } catch { return 'route'; } };

// 1. 自己検索
let selfOk = 0; const selfBad = [];
for (const f of FAQS) { const id = await idOf(f.q); if (id === `faq:${f.id}`) selfOk++; else selfBad.push(`${f.id} → ${id}`); }
console.log(`自己検索: ${selfOk}/${FAQS.length}`);
for (const b of selfBad) console.log('  ×', b);

// 2. 言い換え(期待する id の先頭一致でよい)
const PARA = [
  ['単位は何単位とれば卒業できる？', 'a-'], ['GPAって何', 'a-'], ['履修登録に失敗したらどうする', 'registration'],
  ['奨学金はいつ申し込むの', 'b-'], ['学生証をなくした', 'gakuseisho'], ['アルバイトはしていい？', ''],
  ['留学したい', 'd-'], ['留学するとお金はどのくらいかかる', 'd-'], ['サークルに入りたい', ''], ['就活はいつから', 'd-'],
  ['ノートパソコンは何を買えばいい', 'byod'], ['定期券はどこで買う', ''], ['トイレはどこ', ''], ['学費はいくら', 'b-gakuhi'],
  ['台風のとき授業はある？', 'a-typhoon'], ['図書館は何時まで', 'library'], ['健康診断はいつ', ''], ['成績が不安', 'a-'],
  ['プリンターの使い方', ''], ['Wi-Fiの設定', 'wifi'], ['落とし物をした', ''], ['研究会って何', 'kenkyukai'],
  ['自転車で通学していい？', 'bike'], ['ロッカーはある？', ''], ['AEDはどこ', ''], ['休学したい', ''],
];
let paraAny = 0; const paraRows = [];
for (const [q, want] of PARA) {
  const id = await idOf(q); let ok = id.startsWith('faq:') && (!want || id.includes(want)), mark = ok ? '○' : '×';
  if (!ok && id === 'stock:pickFaq') { const ch = await chipIds(q); if (ch.some((c) => !want || c.includes(want))) { ok = true; mark = '△'; } } // 聞き返しのボタンに正解が入っている
  if (ok) paraAny++; paraRows.push(`${mark} ${q.padEnd(20)} → ${id}`);
}
console.log(`言い換え: ${paraAny}/${PARA.length}(○=答えた △=聞き返しのボタンに正解が入っている)`);
for (const r of paraRows) console.log('  ' + r);

// 3. 関係ない質問
const NEG = ['好きな食べ物は？', '今日の天気は', 'ラーメンの作り方を教えて', '東京タワーの高さは', 'おすすめの映画は', 'こんにちは', 'ありがとう', '宇宙の広さは'];
let negOk = 0; const negRows = [];
for (const q of NEG) {
  const id = await idOf(q); const bad = id.startsWith('faq:'); if (!bad) negOk++; negRows.push(`${bad ? '×' : '○'} ${q.padEnd(18)} → ${id}`);
}
console.log(`関係ない質問が FAQ に誤爆しない: ${negOk}/${NEG.length}`);
for (const r of negRows) console.log('  ' + r);
