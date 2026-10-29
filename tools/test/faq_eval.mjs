// 独立した評価セットで、ねるの FAQ の当たり具合を測る。
//   node tools/test/faq_eval.mjs [--label before] [--dir research/faq_eval]
// 評価セットは research/faq_eval/E*.json(質問の書き手は検索の仕組みを見ていない=盲検。学習用の T*.json とは別)。
// 先に node tools/build.mjs で public/faq-full.json を作っておく。
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const label = arg('--label', 'run'), dir = arg('--dir', 'research/faq_eval');

const bundle = async (entry, name) => { const o = join(tmpdir(), name); await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' }); return import(o + '?t=' + Date.now()); };
const FULL = readFileSync('public/faq-full.json');
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(FULL) });
const { answer } = await bundle('src/js/nel/brain.js', 'sfcmap-eval-brain.mjs');
const { FAQS } = await bundle('src/js/content.js', 'sfcmap-eval-content.mjs');
const idByQ = new Map(FAQS.map((f) => [f.q, f.id]));
const catOf = Object.fromEntries(FAQS.map((f) => [f.id, f.cat]));

const files = readdirSync(dir).filter((f) => /^E\d+\.json$/.test(f)).sort();
const items = [], off = [], unc = [];
for (const f of files) { const d = JSON.parse(readFileSync(join(dir, f), 'utf8')); items.push(...d.items); off.push(...d.neg_offtopic); unc.push(...d.neg_sfc_uncovered); }

async function ask(q) {
  try {
    const a = await answer(q, {});
    const id = (a.lines[0]?.id || '-').replace(/^(faq:[^:]+):\d+$/, '$1'); // 言い回し違いの答え(faq:id:1)も同じ FAQ として数える
    const chips = (a.chips || []).map((c) => idByQ.get(c.q)).filter(Boolean);
    return { id, chips };
  } catch { return { id: 'route', chips: [] }; }
}

const STY = ['A', 'B', 'C'];
const stat = { top1: 0, top3: 0, wrongFaq: 0, fallback: 0, other: 0, n: 0 };
const bySty = Object.fromEntries(STY.map((s) => [s, { top1: 0, n: 0 }]));
const byCat = {};
const fails = [];
for (const it of items) {
  for (let k = 0; k < it.p.length; k++) {
    const q = it.p[k], r = await ask(q);
    const want = `faq:${it.id}`, isFaq = r.id.startsWith('faq:');
    stat.n++; bySty[STY[k]].n++; (byCat[catOf[it.id]] ||= { top1: 0, n: 0 }).n++;
    if (r.id === want) { stat.top1++; stat.top3++; bySty[STY[k]].top1++; byCat[catOf[it.id]].top1++; }
    else {
      if (r.chips.includes(it.id)) stat.top3++;
      if (isFaq) stat.wrongFaq++; else if (/^stock:(unknown|pickFaq|open|help)/.test(r.id)) stat.fallback++; else stat.other++;
      fails.push({ id: it.id, sty: STY[k], q, got: r.id, inChips: r.chips.includes(it.id) });
    }
  }
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
console.log(`【${label}】評価の質問 ${stat.n}問(FAQ ${items.length}件 × 3)`);
console.log(`  1位が正解          ${stat.top1}/${stat.n}  ${pct(stat.top1, stat.n)}`);
console.log(`  正解が答えかボタンに入る ${stat.top3}/${stat.n}  ${pct(stat.top3, stat.n)}`);
console.log(`  別のFAQを答えた(誤答) ${stat.wrongFaq}  ${pct(stat.wrongFaq, stat.n)}`);
console.log(`  「分からない」「どれ？」に落ちた ${stat.fallback}  ${pct(stat.fallback, stat.n)}`);
console.log(`  その他(教室・建物など) ${stat.other}  ${pct(stat.other, stat.n)}`);
console.log('  書き方別 1位正解:', STY.map((s) => `${s} ${pct(bySty[s].top1, bySty[s].n)}`).join(' / '), '(A=短い口語 B=状況つき C=言い換え大)');
console.log('  分類別 1位正解:', Object.entries(byCat).map(([c, v]) => `${c} ${pct(v.top1, v.n)}`).join(' / '));

let fp = 0; for (const q of off) if ((await ask(q)).id.startsWith('faq:')) fp++;
console.log(`  関係ない質問 ${off.length}問のうち FAQ に誤爆: ${fp}  ${pct(fp, off.length)}`);
const uncDist = {}; for (const q of unc) { const r = (await ask(q)).id; const k = r.startsWith('faq:') ? 'FAQを答えた' : /^stock:(unknown|pickFaq)/.test(r) ? '分からない/どれ？' : r.split(':')[0]; uncDist[k] = (uncDist[k] || 0) + 1; }
console.log(`  SFCの個別の質問(FAQに載らない想定)${unc.length}問の行き先:`, JSON.stringify(uncDist));

writeFileSync(join(dir, `_report_${label}.json`), JSON.stringify({ label, stat, bySty, byCat, offFalsePositive: fp, offN: off.length, uncDist, fails }, null, 1));
