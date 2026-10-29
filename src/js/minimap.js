// 2D 地図の描画(北が上)。時間割の動線とねるの「場所を地図で見せる」カードで共有する。
// 地図の座標系: x = 北、z = 東(画像では右が北・下が東)。OpenStreetMap の建物との突き合わせで確認済み。
import geom from '../geom.json';
import { BLD, CATS } from './data.js';

const [W, D] = geom.size;
let imgP = null;
function groundImage() {
  if (!imgP) imgP = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/ground.png'; });
  return imgP;
}

function bounds(points) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [x, z] of points) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, z); d = Math.max(d, z); }
  return { x0: a, x1: b, z0: c, z1: d };
}
export function buildingPoints(ids) { const out = []; for (const id of ids) for (const bl of geom.b[id] || []) for (const p of bl.p) out.push(p); return out; }
export function buildingCenter(id) { const b = bounds(buildingPoints([id])); return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]; }

/**
 * @param {HTMLCanvasElement} cv
 * @param {{ fit?: number[][], whole?: boolean, highlight?: string[], routes?: {path:number[][],color?:string}[], markers?: {x:number,z:number,label:string,fill?:string}[], pins?: {x:number,z:number,text:string}[], minSpan?: number, pad?: number }} o
 */
export async function drawMap(cv, o = {}) {
  const img = await groundImage();
  const g = cv.getContext('2d'); const cw = cv.width, ch = cv.height;
  // 表示範囲(単位は地図の単位)。north=up なので、画面の縦=x、横=z
  let pts = o.whole ? [[-W / 2, -D / 2], [W / 2, D / 2]] : (o.fit && o.fit.length ? o.fit : [[0, 0]]);
  const bb = bounds(pts); const pad = o.pad ?? 40, minSpan = o.minSpan ?? 110;
  const spanZ = Math.max(bb.z1 - bb.z0 + pad * 2, minSpan * (cw / ch)), spanX = Math.max(bb.x1 - bb.x0 + pad * 2, minSpan);
  const s = Math.min(cw / spanZ, ch / spanX);
  const cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2;
  const T = [0, -s, s, 0, cw / 2 - s * cz, ch / 2 + s * cx]; // setTransform(a,b,c,d,e,f): sx = c*z + e, sy = b*x + f
  const toScr = (x, z) => [T[2] * z + T[4], T[1] * x + T[5]];

  g.clearRect(0, 0, cw, ch); g.fillStyle = '#dfe4ec'; g.fillRect(0, 0, cw, ch);
  g.save(); g.setTransform(...T); g.imageSmoothingQuality = 'high'; g.drawImage(img, -W / 2, -D / 2, W, D);
  const hi = new Set(o.highlight || []); const dim = hi.size > 0;
  const px = (n) => n / s;
  for (const id of Object.keys(geom.b)) {
    if (!BLD[id]) continue; const c = CATS[BLD[id].cat].color; const on = hi.has(id);
    for (const bl of geom.b[id]) {
      g.beginPath(); bl.p.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
      if (on) { g.shadowColor = c; g.shadowBlur = px(18); }
      g.fillStyle = on ? c : c + (dim ? '66' : 'cc'); g.fill(); g.shadowBlur = 0;
      g.lineWidth = px(on ? 3 : 1); g.strokeStyle = on ? '#ffffff' : 'rgba(0,0,0,.28)'; g.stroke();
    }
  }
  g.lineJoin = g.lineCap = 'round';
  for (const r of o.routes || []) {
    g.beginPath(); r.path.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.lineWidth = px(8); g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = px(4.5); g.strokeStyle = r.color || '#ff9f0a'; g.stroke();
  }
  g.restore();

  // 文字・ピンは画面座標で描く(回転・拡大の影響を受けない)
  const font = '700 13px -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
  const halo = (t, x, y, col = '#1d1d1f') => { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); };
  for (const id of hi) { const [x, z] = buildingCenter(id); const [sx, sy] = toScr(x, z); halo(BLD[id].ja, sx, sy - 22 * 1); }
  for (const m of o.markers || []) {
    const [sx, sy] = toScr(m.x, m.z); g.beginPath(); g.arc(sx, sy, 11, 0, 7); g.fillStyle = m.fill || '#e5484d'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = '800 12px -apple-system, "Hiragino Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(m.label, sx, sy + 0.5);
  }
  for (const p of o.pins || []) {
    const [sx, sy] = toScr(p.x, p.z);
    g.beginPath(); g.arc(sx, sy, 22, 0, 7); g.fillStyle = 'rgba(229,72,77,.22)'; g.fill();
    g.beginPath(); g.moveTo(sx, sy); g.bezierCurveTo(sx - 15, sy - 16, sx - 13, sy - 38, sx, sy - 38); g.bezierCurveTo(sx + 13, sy - 38, sx + 15, sy - 16, sx, sy); g.fillStyle = '#e5484d'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.beginPath(); g.arc(sx, sy - 27, 5, 0, 7); g.fillStyle = '#fff'; g.fill();
    if (p.text) { g.font = '800 15px -apple-system, "Hiragino Sans", sans-serif'; const w = g.measureText(p.text).width + 18; const bx = Math.min(cw - w / 2 - 6, Math.max(w / 2 + 6, sx)), by = sy - 56;
      g.fillStyle = '#1d1d1f'; g.beginPath(); g.roundRect(bx - w / 2, by - 13, w, 26, 13); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.text, bx, by + 0.5); }
  }
  // 北を示す印(北が上)
  g.save(); g.translate(cw - 26, 28); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill();
  g.fillStyle = '#e5484d'; g.beginPath(); g.moveTo(0, -12); g.lineTo(5, 3); g.lineTo(-5, 3); g.closePath(); g.fill();
  g.fillStyle = '#1d1d1f'; g.font = '800 10px -apple-system, sans-serif'; g.textAlign = 'center'; g.fillText('N', 0, 12); g.restore();
  return { toScr, s };
}
