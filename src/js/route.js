// 徒歩経路(目安)。地図の地面画像(ground.png)から「歩ける場所」の格子を作り、建物を障害物にして最短経路を探す。
// 階段・坂・混雑・建物内の通り抜けは考慮しない。時間は目安であり、授業間の移動に使う前に実際に歩いて確かめること。
import geom from '../geom.json';
import { BLD } from './data.js';

export const CELL = 1.5;        // 格子の大きさ(地図の単位)
// 地図の1単位は実際の 1.2787m。OpenStreetMap の SFC の建物25棟の位置と突き合わせて求めた(平均誤差 2.5m)。
// 公式 PDF の縮尺バーを読み違えて 1単位=1m としていたため、徒歩時間が約22%短く出ていた。
export const UNIT_M = 1.2787;
export const WALK_MPS = 1.25;   // ふつうの歩行速度(約4.5km/h)
export const FAST_MPS = 1.6;    // 急ぎ足
const FLOOR_SEC = 15;           // 1階分の上り下りにかかる時間の目安

const [W, D] = geom.size;
const GX = Math.ceil(W / CELL), GZ = Math.ceil(D / CELL);
let cost = null;        // Uint8: 0=通れない, それ以外は 10×歩きにくさ
let bMask = null;       // Int16: 建物のインデックス+1(0=なし)
const bIdx = Object.keys(geom.b);
let loading = null;

const toCell = (x, z) => [Math.floor((x + W / 2) / CELL), Math.floor((z + D / 2) / CELL)];
const toWorld = (cx, cz) => [(cx + 0.5) * CELL - W / 2, (cz + 0.5) * CELL - D / 2];

function inPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

// 画素(RGBA)から格子を作る。ブラウザと単体テスト(Node)の両方から使う
export function initFromPixels(px, pw, ph) {
  cost = new Uint8Array(GX * GZ);
  for (let cz = 0; cz < GZ; cz++) {
    for (let cx = 0; cx < GX; cx++) {
      const u = Math.min(pw - 1, Math.floor(((cx + 0.5) * CELL / W) * pw));
      const v = Math.min(ph - 1, Math.floor(((cz + 0.5) * CELL / D) * ph));
      const o = (v * pw + u) * 4; const r = px[o], gg = px[o + 1], b = px[o + 2], a = px[o + 3];
      let c;
      if (a < 128) c = 0;                                              // 敷地の外
      else if (b > 220 && r < 160) c = 0;                              // 池
      else if (gg > r + 18 && gg > b + 30 && r < 200) c = 22;          // 芝(歩けるが遠回りを避ける)
      else if (r > 215 && gg > 205 && b < 200) c = 15;                 // 運動場
      else c = 10;                                                     // 道・広場
      cost[cz * GX + cx] = c;
    }
  }
  bMask = new Int16Array(GX * GZ);
  bIdx.forEach((id, bi) => {
    for (const bl of geom.b[id]) {
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (const p of bl.p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
      const [x0, z0] = toCell(minX, minZ), [x1, z1] = toCell(maxX, maxZ);
      for (let cz = Math.max(0, z0); cz <= Math.min(GZ - 1, z1); cz++) for (let cx = Math.max(0, x0); cx <= Math.min(GX - 1, x1); cx++) {
        const [wx, wz] = toWorld(cx, cz);
        if (inPoly(wx, wz, bl.p)) bMask[cz * GX + cx] = bi + 1;
      }
    }
  });
}

export function loadRouter() {
  if (cost) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        initFromPixels(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height);
        resolve();
      } catch (e) { loading = null; reject(e); }
    };
    img.onerror = () => { loading = null; reject(new Error('ground.png を読み込めませんでした')); };
    img.src = '/ground.png';
  });
  return loading;
}

class Heap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop() {
    const k = this.k, v = this.v; const rk = k[0], rv = v[0]; const lk = k.pop(), lv = v.pop();
    if (k.length) { let i = 0; const n = k.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; }
    return [rk, rv];
  }
  get size() { return this.k.length; }
}

// 建物のまわりの歩ける格子(出入口の候補)
function frontage(id) {
  const bi = bIdx.indexOf(id) + 1; const cells = new Set();
  for (let ring = 1; ring <= 5 && cells.size === 0; ring++) {
    for (let cz = 0; cz < GZ; cz++) for (let cx = 0; cx < GX; cx++) {
      if (bMask[cz * GX + cx] !== bi) continue;
      for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GX || nz >= GZ) continue;
        const i = nz * GX + nx; if (cost[i] && !bMask[i]) cells.add(i);
      }
    }
  }
  return cells;
}

const fcache = new Map();
function ptFront(x, z) {
  const [cx0, cz0] = toCell(x, z); const cells = new Set();
  for (let ring = 0; ring <= 12 && cells.size === 0; ring++) {
    for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      const nx = cx0 + dx, nz = cz0 + dz; if (nx < 0 || nz < 0 || nx >= GX || nz >= GZ) continue;
      const i = nz * GX + nx; if (cost[i] && !bMask[i] && cost[i] <= 10) cells.add(i);
    }
  }
  return cells;
}
// a は建物id か [x,z](バス停・門など)
const getFront = (a) => {
  const key = Array.isArray(a) ? a.join(',') : a;
  if (!fcache.has(key)) fcache.set(key, Array.isArray(a) ? ptFront(a[0], a[1]) : frontage(a));
  return fcache.get(key);
};

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop(); let md = 0, mi = -1;
    const [ax, az] = pts[s], [bx, bz] = pts[e]; const dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz) || 1;
    for (let i = s + 1; i < e; i++) { const d = Math.abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = true; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** 建物 a から建物 b までの経路。{ meters, path:[[x,z]…] } か { same:true } か null(経路なし) */
export function findRoute(a, b) {
  if (!cost) throw new Error('router not loaded');
  if (typeof a === 'string' && a === b) return { same: true, meters: 0, path: [] };
  const src = getFront(a), dst = getFront(b);
  if (!src.size || !dst.size) return null;
  const dist = new Float64Array(GX * GZ).fill(Infinity);
  const prev = new Int32Array(GX * GZ).fill(-1);
  const h = new Heap();
  for (const i of src) { dist[i] = 0; h.push(0, i); }
  const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  let end = -1;
  while (h.size) {
    const [d, i] = h.pop(); if (d > dist[i]) continue;
    if (dst.has(i)) { end = i; break; }
    const cx = i % GX, cz = (i / GX) | 0;
    for (const [dx, dz, w] of N8) {
      const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GX || nz >= GZ) continue;
      const j = nz * GX + nx; const c = cost[j]; if (!c || (bMask[j] && !dst.has(j) && !src.has(j))) continue;
      if (dx && dz && (!cost[cz * GX + nx] || !cost[nz * GX + cx] || bMask[cz * GX + nx] || bMask[nz * GX + cx])) continue; // 角抜け禁止
      const nd = d + w * (c / 10) * CELL;
      if (nd < dist[j]) { dist[j] = nd; prev[j] = i; h.push(nd, j); }
    }
  }
  if (end < 0) return null;
  const cells = []; for (let i = end; i >= 0; i = prev[i]) cells.push(i);
  cells.reverse();
  let pts = cells.map((i) => toWorld(i % GX, (i / GX) | 0));
  pts = simplify(pts, 1.2);
  let meters = 0; for (let i = 1; i < pts.length; i++) meters += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { meters: meters * UNIT_M, path: pts };
}

// バス停・門(地図上の点)。経路の出発点としてよく使う
export const POIS = {
  'poi:bus0': { label: '慶応大学本館前(バス停)', pt: geom.poi.bus[0].slice(2) },
  'poi:bus1': { label: '慶応中高等部前(バス停)', pt: geom.poi.bus[1].slice(2) },
  'poi:gate0': { label: '西門', pt: geom.poi.gate[0].slice(2) },
  'poi:gate1': { label: '南門', pt: geom.poi.gate[1].slice(2) },
  'poi:gate2': { label: '東門', pt: geom.poi.gate[2].slice(2) },
  'poi:gate3': { label: '北門(正門)', pt: geom.poi.gate[3].slice(2) },
};

/** 場所(教室コード・建物id・POI)を { b|pt, f, label } に解決 */
export function resolvePlace(key, rooms) {
  if (POIS[key]) return { pt: POIS[key].pt, f: 1, label: POIS[key].label, key };
  if (BLD[key]) return { b: key, f: 1, label: BLD[key].ja, key };
  const r = rooms[key]; if (r) return { b: r.b, f: r.f || 1, label: r.c, key };
  return null;
}

export function routeBetween(from, to) {
  const res = findRoute(from.b || from.pt, to.b || to.pt);
  if (!res) return null;
  const climb = ((from.f || 1) - 1 + (to.f || 1) - 1) * FLOOR_SEC;
  const walk = res.meters / WALK_MPS, fast = res.meters / FAST_MPS;
  return { ...res, from, to, climbSec: climb, sec: Math.round(walk + climb), secFast: Math.round(fast + climb * 0.8) };
}

export const fmtMin = (sec) => { const m = Math.max(1, Math.round(sec / 60)); return `約${m}分`; };
export const WORLD = { W, D };
