import { build } from 'esbuild';
await build({ entryPoints: ['src/js/nel/brain.js'], bundle: true, format: 'esm', platform: 'node', outfile: '/tmp/brain_bundle_sfc.mjs', loader: { '.json': 'json' }, logLevel: 'error' });
import { readFileSync } from 'node:fs';
const FULL = readFileSync('public/faq-full.json'); globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(FULL) }); // /faq-full.json の代わり
const { answer, parsePlaces } = await import('/tmp/brain_bundle_sfc.mjs');
const qs = ['κ21はどこ？','k21','Ω11の定員は','カッパ21','食堂はどこ？','図書館','1限は何時から？','履修登録はいつ？','大きい教室は？','4Kの教室','パソコン教室','今何限？','ありがとう','あなたは誰','こんにちは','履修','通学','湘南台駅から行くには','研究会って何','toilet','λ12について教えて','θ館','アルファ館','シグマ館はどこ','ほげほげ'];
for (const q of qs) {
  const a = await answer(q, {}); 
  console.log(q.padEnd(16), '→', (a.lines[0]?.id||'-').padEnd(20), a.expr, '|', a.lines[0]?.t?.slice(0,50));
}
console.log(JSON.stringify(parsePlaces('バス停からκ21まで')));
