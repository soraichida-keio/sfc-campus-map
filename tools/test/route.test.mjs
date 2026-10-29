import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
await build({ entryPoints: ['src/js/route.js'], bundle: true, format: 'esm', platform: 'node', outfile: '/tmp/route_bundle_sfc.mjs', loader: { '.json': 'json' }, logLevel: 'error' });
const R = await import('/tmp/route_bundle_sfc.mjs');
const buf = readFileSync('/tmp/ground_rgba.bin'); const w = 2048, h = 1576;
let t = Date.now(); R.initFromPixels(new Uint8Array(buf), w, h); console.log('init ms', Date.now() - t);
const rooms = { 'κ21': { b: 'kappa', f: 2, c: 'κ21' }, 'Ω11': { b: 'omega', f: 1, c: 'Ω11' } };
for (const [a, b] of [['poi:bus0', 'κ21'], ['poi:gate3', 'Ω11'], ['sigma', 'mu'], ['κ21', 'Ω11'], ['poi:bus0', 'hs_south'], ['poi:bus0', 'beta2']]) {
  t = Date.now();
  const A = R.resolvePlace(a, rooms) || R.resolvePlace(a, {}), B = R.resolvePlace(b, rooms) || R.resolvePlace(b, {});
  const r = R.routeBetween(A, B);
  console.log(a, '->', b, r ? `${Math.round(r.meters)}m ${Math.round(r.sec / 60)}min path ${r.path?.length}` : r, Date.now() - t, 'ms');
}
