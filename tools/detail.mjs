// 教室(66)と建物(約42)の個別ページを、データから自動で作る。node tools/build.mjs から呼ばれる。
//   /room/kappa-21/  /building/kappa/  など。固有の中身: 定員・設備・推定階・バス停からの徒歩時間(ビルド時に計算)・静的な2D地図(SVG)。
// 階は教室番号からの推定、徒歩時間は目安。公式の説明ではないことを各ページに書く。
import { build } from 'esbuild';
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ROOMS from '../src/rooms.json' with { type: 'json' };
import geom from '../src/geom.json' with { type: 'json' };
import { BLD, CATS, ROOM_SZ } from '../src/js/data.js';
import { SAY } from '../src/js/say.js';
import { SITE } from '../src/js/nav.js';
import { roomSlug, roomPath, buildingPath } from '../src/js/slug.js';
import { FAQS_FULL } from '../src/js/faq_full.js';
import { DATA_DATE } from '../src/js/content.js';
import { esc, head } from '../src/pages/util.mjs';

const r1 = (n) => Math.round(n * 10) / 10;

// ---------- 徒歩時間(ブラウザと同じ経路探索をビルド時に動かす) ----------
async function loadRouter() {
  const out = join(tmpdir(), 'sfcmap-route-build.mjs');
  await build({ entryPoints: ['src/js/route.js'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
  const R = await import(out + '?t=' + Date.now());
  const { data, info } = await sharp('public/ground.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  R.initFromPixels(new Uint8Array(data), info.width, info.height);
  return R;
}

// ---------- 静的な2D地図(北が上。地図の x=北, z=東) ----------
const PLY = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p[1])} ${r1(-p[0])}`).join('') + 'Z';
const bbox = (pts) => pts.reduce((b, p) => ({ x0: Math.min(b.x0, p[1]), x1: Math.max(b.x1, p[1]), y0: Math.min(b.y0, -p[0]), y1: Math.max(b.y1, -p[0]) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
const bPts = (id) => (geom.b[id] || []).flatMap((bl) => bl.p);
const center = (id) => { const b = bbox(bPts(id)); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; };

function mapSvg({ highlight = [], path = null, marks = [], label }) {
  const pts = [...highlight.flatMap(bPts), ...(path || []), ...marks.map((m) => [m.x, m.z])];
  const bb = bbox(pts);
  let w = Math.max(bb.x1 - bb.x0 + 70, 120), h = Math.max(bb.y1 - bb.y0 + 70, 90);
  if (w / h > 4 / 3) h = w * 3 / 4; else w = h * 4 / 3;
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  const v = { x: cx - w / 2, y: cy - h / 2, w, h };
  const inView = (poly) => { const b = bbox(poly); return b.x1 >= v.x - 4 && b.x0 <= v.x + v.w + 4 && b.y1 >= v.y - 4 && b.y0 <= v.y + v.h + 4; };
  const fs = r1(w / 42);
  const hi = new Set(highlight);
  let body = `<rect x="${r1(v.x)}" y="${r1(v.y)}" width="${r1(v.w)}" height="${r1(v.h)}" fill="#e9eee4"/>`;
  for (const poly of geom.land || []) if (inView(poly.map((p) => [p[0], p[1]]))) body += `<path d="${PLY(poly)}" fill="#f1f3ec"/>`;
  for (const poly of geom.ponds || []) if (inView(poly)) body += `<path d="${PLY(poly)}" fill="#bcd9ec"/>`;
  const labels = [];
  for (const id of Object.keys(geom.b)) {
    if (!BLD[id]) continue;
    const on = hi.has(id), c = CATS[BLD[id].cat].color;
    for (const bl of geom.b[id]) {
      if (!inView(bl.p)) continue;
      body += `<path d="${PLY(bl.p)}" fill="${c}${on ? '' : '55'}" stroke="${on ? '#fff' : 'rgba(0,0,0,.25)'}" stroke-width="${r1(on ? w / 220 : w / 600)}" stroke-linejoin="round"/>`;
    }
    if (inView(bPts(id))) labels.push({ id, on, c: center(id) });
  }
  if (path && path.length > 1) {
    const d = path.map((p, i) => `${i ? 'L' : 'M'}${r1(p[1])} ${r1(-p[0])}`).join('');
    body += `<path d="${d}" fill="none" stroke="#fff" stroke-width="${r1(w / 95)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ff9f0a" stroke-width="${r1(w / 170)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const halo = `paint-order="stroke" stroke="#fff" stroke-width="${r1(fs / 3.2)}" stroke-linejoin="round"`;
  for (const l of labels) {
    const t = l.on ? BLD[l.id].ja : BLD[l.id].sym;
    body += `<text x="${r1(l.c[0])}" y="${r1(l.c[1])}" font-size="${l.on ? r1(fs * 1.15) : r1(fs * 0.8)}" font-weight="${l.on ? 800 : 700}" text-anchor="middle" dominant-baseline="central" fill="#1d1d1f" ${halo}>${esc(t)}</text>`;
  }
  for (const m of marks) {
    const rr = r1(w / 62);
    body += `<circle cx="${r1(m.z)}" cy="${r1(-m.x)}" r="${rr}" fill="${m.fill}" stroke="#fff" stroke-width="${r1(rr / 3)}"/><text x="${r1(m.z)}" y="${r1(-m.x)}" font-size="${r1(rr * 1.25)}" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#fff">${esc(m.t)}</text>`;
  }
  // 北を示す印
  const nx = r1(v.x + v.w - w / 18), ny = r1(v.y + w / 15), nr = r1(w / 40);
  body += `<g><circle cx="${nx}" cy="${ny}" r="${nr}" fill="rgba(255,255,255,.92)"/><path d="M${nx} ${r1(ny - nr * 0.75)}L${r1(nx + nr * 0.32)} ${r1(ny + nr * 0.1)}L${r1(nx - nr * 0.32)} ${r1(ny + nr * 0.1)}Z" fill="#e5484d"/><text x="${nx}" y="${r1(ny + nr * 0.55)}" font-size="${r1(nr * 0.5)}" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#1d1d1f">N</text></g>`;
  return `<svg class="dp-map" viewBox="${r1(v.x)} ${r1(v.y)} ${r1(v.w)} ${r1(v.h)}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

// ---------- 表示の部品 ----------
const READ = (id) => BLD[id].ja.replace(/館$/, '');
const roomRead = (r) => (/\d/.test(r.c) ? `${READ(r.b)}${r.c.match(/\d+/)[0]}` : BLD[r.b].ja);
const fmtMin = (sec) => Math.max(1, Math.round(sec / 60));
const FL = (fl) => { const k = Object.keys(fl); return k.length === 1 ? `${fl[k[0]]}階建て(公式図からの目安)` : `南側 ${fl.s}階 / 北側 ${fl.n}階(公式図からの目安)`; };
const kv = (rows) => `<dl class="kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const asks = (qs) => `<div class="chips">${qs.map((q) => `<button class="chip" type="button" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
const NOTE = '<div class="note"><b>この情報について:</b> 定員・机・設備・改修年は SFC Classroom(公式)の各教室ページをもとにしています。階は教室番号の十の位からの推定で、公式の説明ではありません。徒歩時間は地図の地面画像から計算した目安で、階段・坂・混雑・建物内の通り抜けは含みません。授業の前に実際に歩いて確かめてください。このサイトは学生による非公式のものです。</div>';

function walkBlock(w, toLabel, toKey) {
  if (!w) return '<p class="foot">この場所までの徒歩時間は計算できませんでした。</p>';
  const m = fmtMin(w.sec), f = fmtMin(w.secFast);
  return `<p class="dp-walk"><span class="dp-min">${m}<small>分</small></span><span><b>バス停「慶応大学本館前」から歩いて(目安)</b><br><span class="foot">約${Math.round(w.meters)}m · 急ぎ足 約${f}分${w.climbSec ? ` · 階の上り下り ${Math.round(w.climbSec / 6) / 10}分を加算` : ''}</span></span></p>
<div class="dp-btns"><a class="btn primary" href="/map/#${toKey.startsWith('r:') ? 'r=' + encodeURIComponent(toKey.slice(2)) : 'b=' + toKey.slice(2)}">3Dマップで見る</a><a class="btn" href="/route/#from=${encodeURIComponent('poi:bus0')}&to=${encodeURIComponent(toKey.slice(2))}">経路ページで調べる</a></div>`;
}

const crumbs = (items) => `<nav class="crumbs foot" aria-label="パンくず">${items.map(([l, h]) => (h ? `<a href="${h}">${esc(l)}</a>` : `<span>${esc(l)}</span>`)).join(' <span aria-hidden="true">›</span> ')}</nav>`;
const faqLinks = (bld) => {
  const l = FAQS_FULL.filter((f) => f.bld === bld).slice(0, 6);
  return l.length ? `<section class="section tight"><h2 class="t-title2" style="margin-bottom:10px">この建物に関するよくある質問</h2><ul class="dp-list">${l.map((f) => `<li><a href="/faq/#${f.id}">${esc(f.q)}</a></li>`).join('')}</ul></section>` : '';
};

export async function detailPages() {
  const R = await loadRouter();
  const byCode = Object.fromEntries(ROOMS.map((r) => [r.c, r]));
  const bus = R.resolvePlace('poi:bus0', byCode);
  const walk = (key) => {
    try { const to = R.resolvePlace(key, byCode) || R.resolvePlace(key, {}); if (!to) return null; const r = R.routeBetween(bus, to); return r && !r.same ? r : null; } catch { return null; }
  };
  const busMark = bus && bus.pt ? { x: bus.pt[0], z: bus.pt[1], t: 'A', fill: '#2fbf71' } : null;
  const pages = [];

  // 教室
  for (const r of ROOMS) {
    const b = BLD[r.b], sz = ROOM_SZ[r.sz], w = walk(r.c);
    const to = w ? w.path[w.path.length - 1] : null;
    const marks = [busMark, w && to ? { x: to[0], z: to[1], t: 'B', fill: '#e5484d' } : null].filter(Boolean);
    const sibs = ROOMS.filter((x) => x.b === r.b && x.c !== r.c).sort((a, c) => a.c.localeCompare(c.c, 'el'));
    const slug = roomSlug(r);
    const kind = `${sz.ja}${r.sub ? `(${r.sub})` : ''}`;
    const desc = `${r.c}(${roomRead(r)})は${b.ja}${r.f ? `の${r.f}階(番号からの推定)` : ''}にある定員${r.n}人の${kind}。${w ? `バス停「慶応大学本館前」から歩いて約${fmtMin(w.sec)}分(約${Math.round(w.meters)}m・目安)。` : ''}机・設備・場所の地図。`;
    const equip = [...(r.pod || []), ...(r.eq || [])];
    const body = `
${head('教室', `${esc(r.c)} <span class="dp-read">${esc(roomRead(r))}</span>`, `${esc(b.ja)}${r.f ? `の${r.f}階(推定)` : ''}にある、定員${r.n}人の${esc(kind)}です。`)}
${crumbs([['教室を探す', '/rooms/'], [b.ja, buildingPath(r.b)], [r.c, null]])}
<section class="dp-top" aria-label="教室の情報">
  <div class="card">
    ${kv([
    ['建物', `<a href="${buildingPath(r.b)}">${esc(b.ja)}(${esc(b.sym)})</a>`],
    ['階', r.f ? `${r.f}階(番号からの推定)` : '—'],
    ['定員', `${r.n}人`],
    ['種類', esc(kind) + (r.k4 ? '・4K対応' : '')],
    (r.desk || []).length || r.ac ? ['机・椅子', esc([...(r.desk || []), r.ac ? 'アクティブラーニング対応' : ''].filter(Boolean).join(' / '))] : null,
    r.rn ? ['改修', esc(r.rn)] : null,
  ])}
    ${equip.length ? `<h2 class="t-title3" style="margin:18px 0 6px">設備</h2><ul class="dp-list">${equip.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
  </div>
  <div class="card">
    ${mapSvg({ highlight: [r.b], path: w ? w.path : null, marks, label: `${r.c}の場所。バス停から${b.ja}までの道すじ(目安)` })}
    ${walkBlock(w, r.c, 'r:' + r.c)}
  </div>
</section>
<section class="section tight"><h2 class="t-title2" style="margin-bottom:10px">${esc(b.ja)}の、ほかの教室</h2>
  <div class="chips">${sibs.map((x) => `<a class="chip" href="${roomPath(x)}">${esc(x.c)}<span class="foot">${x.n}人</span></a>`).join('')}</div>
</section>
<section class="section tight"><h2 class="t-title2" style="margin-bottom:10px">ねるに聞く</h2>${asks([`バス停から${r.c}`, `${r.c}はどこ？`, `${b.ja}について`, '教室の番号の読み方は？'])}</section>
${NOTE}`;
    pages.push({
      id: `room:${slug}`, nav: 'rooms', path: roomPath(r), title: `${r.c}(${roomRead(r)})の場所・定員・設備`, desc, body, noCache: true,
      jsonld: { '@context': 'https://schema.org', '@type': 'Room', name: r.c, description: desc, occupancy: { '@type': 'QuantitativeValue', maxValue: r.n }, containedInPlace: { '@type': 'Place', name: `${b.ja}(慶應義塾大学 湘南藤沢キャンパス)` } },
    });
  }

  // 建物
  for (const id of Object.keys(BLD)) {
    if (!geom.b[id]) continue;
    const b = BLD[id], w = walk(id), cat = CATS[b.cat];
    const rs = ROOMS.filter((x) => x.b === id).sort((a, c) => a.c.localeCompare(c.c, 'el'));
    const to = w ? w.path[w.path.length - 1] : null;
    const marks = [busMark, w && to ? { x: to[0], z: to[1], t: 'B', fill: '#e5484d' } : null].filter(Boolean);
    const desc = `${b.ja}(${b.sym})は${b.sub}。${b.desc}${w ? `バス停「慶応大学本館前」から歩いて約${fmtMin(w.sec)}分(約${Math.round(w.meters)}m・目安)。` : ''}`;
    const body = `
${head('建物', `${esc(b.ja)} <span class="dp-read">${esc(b.sym)}</span>`, esc(b.desc))}
${crumbs([['マップ', '/map/'], [b.ja, null]])}
<section class="dp-top" aria-label="建物の情報">
  <div class="card">
    ${kv([
    ['種類', `<span class="badge" style="--c:${cat.color}">${esc(cat.ja)}</span> ${esc(b.sub)}`],
    ['英名', esc(b.en)],
    ['階数', esc(FL(b.fl))],
    rs.length ? ['教室', `${rs.length}室(${esc(rs[0].c)}〜${esc(rs[rs.length - 1].c)})`] : null,
  ])}
    ${b.fac && b.fac.length ? `<h2 class="t-title3" style="margin:18px 0 6px">主な施設</h2><ul class="dp-list">${b.fac.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${SAY[id] ? `<p class="dp-say"><span class="foot">ねるのひとこと</span><br>${esc(SAY[id])}</p>` : ''}
  </div>
  <div class="card">
    ${mapSvg({ highlight: [id], path: w ? w.path : null, marks, label: `${b.ja}の場所。バス停からの道すじ(目安)` })}
    ${walkBlock(w, b.ja, 'b:' + id)}
  </div>
</section>
${rs.length ? `<section class="section tight"><h2 class="t-title2" style="margin-bottom:10px">${esc(b.ja)}の教室</h2><div class="chips">${rs.map((x) => `<a class="chip" href="${roomPath(x)}">${esc(x.c)}<span class="foot">${x.n}人</span></a>`).join('')}</div></section>` : ''}
${faqLinks(id)}
<section class="section tight"><h2 class="t-title2" style="margin-bottom:10px">ねるに聞く</h2>${asks([`バス停から${b.ja}`, `${b.ja}について`, `${b.ja}はどこ？`])}</section>
${NOTE}`;
    pages.push({
      id: `building:${id}`, nav: 'map', path: buildingPath(id), title: `${b.ja}(${b.sym})の場所・施設・バス停からの徒歩時間`, desc, body, noCache: true,
      jsonld: { '@context': 'https://schema.org', '@type': 'Place', name: b.ja, description: desc, containedInPlace: { '@type': 'CollegeOrUniversity', name: '慶應義塾大学 湘南藤沢キャンパス' } },
    });
  }
  return pages;
}

export function sitemap(pages) {
  const base = SITE.url;
  const day = new Date().toISOString().slice(0, 10);
  const urls = pages.filter((p) => !p.file && p.path).map((p) => `<url><loc>${base}${p.path}</loc><lastmod>${day}</lastmod></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
void DATA_DATE;
