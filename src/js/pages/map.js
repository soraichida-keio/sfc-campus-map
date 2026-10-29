import { CampusScene } from '../scene.js';
import geom from '../../geom.json';
import { BLD, CATS, ROOM_SZ, roomUrl } from '../data.js';
import { roomPath, buildingPath } from '../slug.js';
import { norm, bIds, roomsByB, roomByCode, ROOMS, searchBuildings, searchRooms } from '../search.js';
import { POIS, loadRouter, resolvePlace, routeBetween, fmtMin } from '../route.js';
import { parsePlaces } from '../nel/brain.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isMobile = () => matchMedia('(max-width: 860px)').matches;

const bldColor = (id) => CATS[BLD[id].cat].color;
const symHtml = (id, cls = '') => `<span class="sym ${cls}${BLD[id].sym.length > 1 ? ' long' : ''}" style="--c:${bldColor(id)}" aria-hidden="true">${esc(BLD[id].sym)}</span>`;
function mark(text, q) {
  if (!q) return esc(text);
  const n = norm(text), i = n.indexOf(q);
  if (i < 0 || n.length !== text.length) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

// ---------- 状態 ----------
const state = { sel: null, floor: null, room: null, tab: 'bld', cats: new Set(), labelsOn: true };
const rf = { b: new Set(), sz: new Set(), min: 0, k4: false, ac: false };
const stage = $('#stage');
const scene = new CampusScene(stage, { onPick: (hit) => onPick(hit), onHover: (id, ev) => onHover(id, ev) });

// ---------- ラベル ----------
const labelsEl = $('#labels');
const BUS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-2M16 21v-2M8 14h.01M16 14h.01"/></svg>';
const GATE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h13l-3 4 3 4H5"/></svg>';
const labels = [];
function makeLabel(html, cls, data) { const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; labelsEl.appendChild(el); const o = { el, w: 90, ...data }; labels.push(o); return o; }
for (const id of bIds) {
  const m = BLD[id]; const mini = m.pri <= 3;
  const nm = m.ja.length > 12 ? m.ja.slice(0, 12) + '…' : m.ja;
  const l = makeLabel(`${symHtml(id)}<span class="nm">${esc(nm)}</span>`, mini ? 'mini' : '', { kind: 'b', id, pri: m.pri });
  l.el.style.setProperty('--c', bldColor(id));
}
for (const [ja, , x, z] of geom.poi.gate) makeLabel(`${GATE_SVG}<span>${esc(ja)}</span>`, 'poi', { kind: 'gate', x, z, pri: 0 });
for (const [ja, , x, z] of geom.poi.bus) makeLabel(`${BUS_SVG}<span>${esc(ja)}</span>`, 'poi', { kind: 'bus', x, z, pri: 0 });
for (const [ja, , x, z] of geom.poi.area) makeLabel(`<span>${esc(ja)}</span>`, 'area', { kind: 'area', x, z, pri: 0 });
const measureLabels = () => { for (const l of labels) l.w = l.el.offsetWidth || l.w; };
document.fonts?.ready.then(() => { measureLabels(); scene.invalidate(); });
setTimeout(measureLabels, 400);

function updateLabels() {
  const dist = scene.getDistance();
  const minPri = dist > 760 ? 9 : dist > 520 ? 8 : dist > 360 ? 7 : dist > 260 ? 5 : dist > 190 ? 4 : dist > 130 ? 3 : 1;
  const W = stage.clientWidth, H = stage.clientHeight; const placed = [];
  const order = labels.map((l) => {
    let p = l.pri; const on = l.kind === 'b' && (l.id === state.sel || l.id === scene.hoverId);
    if (on) p = 99; else if (l.kind === 'b' && scene.focusSet && scene.focusSet.has(l.id)) p += 20;
    return { l, p, on };
  }).sort((a, b) => b.p - a.p);
  for (const { l, p, on } of order) {
    let show = false, x = 0, y = 0;
    if (l.kind === 'b') {
      const [ax, ay, az] = scene.labelAnchor(l.id);
      const yy = (scene.selected === l.id && scene.explodeT > 0) ? ay + scene.explodeT * 7 * (Math.max(...scene.buildings[l.id].blocks.map((b) => b.fl)) - 1) : ay;
      const pr = scene.project(ax, yy, az); x = pr.x; y = pr.y;
      show = pr.vis && (on || p >= minPri || (scene.focusSet && scene.focusSet.has(l.id)));
      if (!state.labelsOn && !on) show = false;
      if (state.sel && !on && !scene.focusSet) show = show && dist > 140 && p >= minPri + 1;
    } else {
      const pr = scene.project(l.x, 1, l.z); x = pr.x; y = pr.y;
      const lim = l.kind === 'gate' ? 1100 : l.kind === 'bus' ? 520 : 650;
      show = pr.vis && dist < lim && state.labelsOn;
    }
    if (show && (x < -40 || x > W + 40 || y < 10 || y > H + 10)) show = false;
    const h = l.kind === 'area' ? 16 : (l.el.classList.contains('mini') ? 22 : 28);
    if (show && !on) { const r = { x: x - l.w / 2 - 3, y: y - h - 4, w: l.w + 6, h: h + 4 }; for (const q of placed) if (r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y) { show = false; break; } }
    if (show) placed.push({ x: x - l.w / 2 - 3, y: y - h - 4, w: l.w + 6, h: h + 4 });
    l.el.classList.toggle('show', show); l.el.classList.toggle('on', !!on);
    if (show) l.el.style.transform = `translate3d(${Math.round(x - l.w / 2)}px, ${Math.round(y - h - 4)}px, 0)`;
  }
}
function updateCompass() {
  const t = scene.controls.target;
  const a = scene.project(t.x, 0, t.z), b = scene.project(t.x + 80, 0, t.z); // この地図の北は +x(画像の右)
  $('#needle').style.transform = `rotate(${(Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI).toFixed(1)}deg)`;
  const flat = scene.getPolar() < 0.25; const bt = $('#b-view'); const txt = flat ? '3D' : '2D';
  if (bt.textContent !== txt) { bt.textContent = txt; bt.setAttribute('aria-label', flat ? '斜めから見る' : '真上から見る'); }
}
scene.onFrame = () => { updateLabels(); updateCompass(); };
scene.uiOffset = () => {
  const w = innerWidth, h = innerHeight, has = document.body.classList.contains('has-detail');
  if (w <= 860) { // 上の検索・タブと、下のシート・タブバーに隠れない中央に置く
    const cls = document.body.classList; const rm = cls.contains('route-mode');
    const top = 50 + (rm ? 112 : cls.contains('has-detail') ? 62 : 124);
    let bottom = 66;
    if (rm) { if (cls.contains('has-route')) bottom += $('#r-out').getBoundingClientRect().height + 10; }
    else { const sheet = cls.contains('has-detail') ? $('#detail') : $('#side .side-body'); bottom += (sheet.hidden || getComputedStyle(sheet).display === 'none') ? 0 : sheet.getBoundingClientRect().height; }
    return { x: 0, y: (top - bottom) / 2 };
  }
  const nel = document.body.classList.contains('nel-open');
  const L = (has && w < 1180) || (nel && w < 1180) ? 0 : 390, R = has ? 400 : nel ? 440 : 0;
  return { x: (L - R) / 2, y: 0 };
};

// ---------- ホバー・クリック ----------
const tip = $('#hover-tip');
function onHover(id, ev) {
  if (!id || state.sel === id) { tip.hidden = true; return; }
  const m = BLD[id]; tip.textContent = `${m.sym.length === 1 ? m.sym + ' ' : ''}${m.ja}${m.sub ? ' · ' + m.sub : ''}`; tip.hidden = false;
  tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px';
}
function onPick(hit) {
  if (hit && hit.id) {
    if (hit.id === state.sel && hit.floor) { setFloor(state.floor === hit.floor ? null : hit.floor); return; }
    if (hit.id !== state.sel) openBuilding(hit.id);
  } else if (state.sel) closeDetail();
  if (isMobile() && !(hit && hit.id)) $('#side').dataset.state = 'peek';
}

// ---------- 詳細パネル ----------
const detail = $('#detail');
const capBar = (n, color) => `<div class="bar" style="--w:${(clamp(Math.log(n) / Math.log(650), 0.05, 1) * 100).toFixed(0)}%;--c:${color}"><i></i></div>`;
function roomMore(r) {
  const sz = ROOM_SZ[r.sz]; const ds = (r.ds || []).filter((x) => x.length > 4).slice(0, 2);
  const rows = [
    ['定員', `<b>${r.n}</b>人`], ['種別', esc(sz.ja + (r.sub ? `(${r.sub})` : '') + (r.k4 ? ' · 4K対応' : ''))],
    r.desk.length ? ['机・椅子', esc(r.desk.join(' / ')) + (r.ac ? ' · アクティブラーニング対応' : '')] : (r.ac ? ['机・椅子', 'アクティブラーニング対応'] : null),
    r.pod.length ? ['教卓', esc(r.pod.join(' / '))] : null, r.rn ? ['改修', esc(r.rn)] : null, r.nt.length ? ['備考', esc(r.nt.join(' / '))] : null,
  ].filter(Boolean);
  return `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    ${ds.length ? `<p style="margin:0 0 10px">${ds.map(esc).join('<br>')}</p>` : ''}
    ${r.eq.length ? `<div class="eq" aria-label="設置機材">${r.eq.map((e) => `<span>${esc(e)}</span>`).join('')}</div>` : ''}
    <p style="margin-top:12px;display:flex;gap:16px;flex-wrap:wrap"><button class="mlink" type="button" data-route-to="${esc(r.c)}">バス停からの道のり</button><a class="mlink" href="${roomPath(r)}">この教室のページ</a><a class="mlink" href="${roomUrl(r.c)}" target="_blank" rel="noopener noreferrer">公式の教室ページ ↗</a></p>`;
}
function roomCard(r) {
  const sz = ROOM_SZ[r.sz]; const on = state.room === r.c;
  return `<div class="rc" role="button" tabindex="0" data-room="${esc(r.c)}" aria-pressed="${on}"><div class="code">${esc(r.c)}</div>
    <div class="meta"><span style="color:${sz.color};font-weight:700">${esc(sz.ja)}</span><b>${r.n}<small style="font-weight:500;color:var(--ink3)">人</small></b></div>${capBar(r.n, sz.color)}<div class="more">${roomMore(r)}</div></div>`;
}
function renderDetail() {
  const id = state.sel; if (!id) return;
  const m = BLD[id], cat = CATS[m.cat], c = cat.color, e = scene.buildings[id];
  const nFl = Math.max(...e.blocks.map((b) => b.fl)); const rs = roomsByB[id] || [];
  let floorsHtml = '';
  if (rs.length || nFl > 1) {
    const byF = {}; for (const r of rs) (byF[r.f ?? 0] ||= []).push(r);
    const btns = []; for (let f = 1; f <= nFl; f++) { const n = (byF[f] || []).length; btns.push(`<button class="fl-btn" data-floor="${f}" aria-pressed="${state.floor === f}" aria-label="${f}階"><span>${f}F</span><small>${n ? n + '室' : (rs.length ? '—' : '')}</small></button>`); }
    floorsHtml = `<div class="d-sec"><h3>階を選ぶ <small>3Dの階をクリックしても選べます</small></h3><div class="floors">${btns.join('')}</div></div>`;
  }
  let roomsHtml = '';
  if (rs.length) {
    const list = state.floor ? rs.filter((r) => r.f === state.floor) : rs;
    roomsHtml = `<div class="d-sec"><h3>教室 <small>${state.floor ? state.floor + '階 · ' + list.length + '室' : '全' + rs.length + '室'}</small></h3>
      ${list.length ? `<div class="rooms">${list.map(roomCard).join('')}</div>` : `<p class="desc" style="margin:0">この階の教室情報は掲載がありません。</p>`}
      <p class="d-note"><b>階の読み方:</b> 教室番号の十の位を階とみなしています(例 κ21 → 2階)。公式の説明ではなく推測です。棟の中の間取り・方角は公式に掲載がないため、3Dでは階のみを示します。</p></div>`;
  }
  const facHtml = m.fac.length ? `<div class="d-sec"><h3>施設・設備</h3><ul class="fac">${m.fac.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>` : '';
  const routeHtml = `<div class="d-sec"><h3>歩いてみる</h3><button class="btn plain sm" type="button" data-route-to="${id}">バス停からの道のりを表示</button> <a class="btn plain sm" href="${buildingPath(id)}">この建物のページ</a></div>`;
  detail.style.setProperty('--c', c);
  detail.innerHTML = `
    <button class="grab" id="d-grab" aria-label="パネルの高さを切り替え"><span></span></button>
    <div class="d-head">
      <button class="tbtn close" id="d-close" aria-label="閉じる">${'<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'}</button>
      <div class="d-title">${symHtml(id, 'lg')}<div><h2>${esc(m.ja)}</h2><p>${esc(m.sub)}</p></div></div>
      <div class="tags"><span class="tag" style="--c:${c}"><i></i>${esc(cat.ja)}</span>${m.no ? `<span class="tag">公式マップ No.${m.no}</span>` : ''}<span class="tag">約${nFl}階建て(目安)</span></div>
    </div>
    <div class="d-body" id="d-body"><p class="desc">${esc(m.desc)}</p>${facHtml}${floorsHtml}${roomsHtml}${routeHtml}<p class="d-note" style="margin-top:20px">${esc(m.en)}</p></div>`;
  detail.hidden = false; document.body.classList.add('has-detail');
  if (isMobile() && !detail.dataset.touched) detail.dataset.state = 'half';
}
function openBuilding(id, { floor = null, room = null, fly = true, hash = true, panel = true } = {}) {
  if (!BLD[id]) return;
  state.sel = id; state.floor = floor; state.room = room;
  if (panel) document.body.classList.add('has-detail'); else { detail.hidden = true; document.body.classList.remove('has-detail'); }
  if (panel && isMobile() && document.body.classList.contains('route-mode')) { setTab('bld'); $('#side').dataset.state = 'peek'; }
  if (panel) renderDetail();   // 先にシートを出して、その高さを避けた位置へ地図を寄せる
  scene.select(id, floor); if (fly) scene.flyToBuilding(id);
  if (room) requestAnimationFrame(() => $(`.rc[data-room="${CSS.escape(room)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  markRows(); if (hash) setHash(room ? 'r=' + room : 'b=' + id);
}
function openRoom(code, opts = {}) { const r = roomByCode[code]; if (r) openBuilding(r.b, { floor: r.f, room: code, ...opts }); }
function closeDetail() {
  state.sel = null; state.floor = null; state.room = null; scene.select(null);
  detail.hidden = true; document.body.classList.remove('has-detail'); markRows(); setHash(''); updateLabels();
}
function setFloor(f) { state.floor = f; if (state.room && roomByCode[state.room]?.f !== f) state.room = null; scene.setFloor(f); renderDetail(); }
function toggleRoom(code) {
  const r = roomByCode[code]; if (!r) return;
  if (state.room === code) { state.room = null; renderDetail(); setHash('b=' + state.sel); return; }
  state.room = code; if (r.f && state.floor !== r.f) { state.floor = r.f; scene.setFloor(r.f); }
  renderDetail(); setHash('r=' + code);
  requestAnimationFrame(() => $(`.rc[data-room="${CSS.escape(code)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}
const cycleSheet = (el) => { const o = ['peek', 'half', 'full']; el.dataset.state = o[(o.indexOf(el.dataset.state) + 1) % 3]; el.dataset.touched = '1'; };
detail.addEventListener('click', (ev) => {
  const t = ev.target;
  if (t.closest('#d-close')) return closeDetail();
  if (t.closest('#d-grab')) return cycleSheet(detail);
  const rt = t.closest('[data-route-to]'); if (rt) { routeFromBus(rt.dataset.routeTo); return; }
  const fb = t.closest('.fl-btn'); if (fb) { const f = +fb.dataset.floor; return setFloor(state.floor === f ? null : f); }
  if (t.closest('a')) return;
  const rc = t.closest('.rc'); if (rc) toggleRoom(rc.dataset.room);
});
detail.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList?.contains('rc')) { ev.preventDefault(); toggleRoom(ev.target.dataset.room); } });
$('#grab').addEventListener('click', () => cycleSheet($('#side')));

// ---------- 左パネル: 棟・施設 ----------
const paneB = $('#pane-bld'), paneR = $('#pane-room'), paneRt = $('#pane-route');
function renderBldPane() {
  const chips = Object.keys(CATS).map((k) => `<button class="chip" data-cat="${k}" aria-pressed="${state.cats.has(k)}"><i class="dot" style="--c:${CATS[k].color}"></i>${esc(CATS[k].ja)}</button>`).join('');
  let html = `<div class="chips" role="group" aria-label="種類で絞り込み">${chips}</div>`;
  for (const k of Object.keys(CATS)) {
    const ids = bIds.filter((id) => BLD[id].cat === k).sort((a, b) => (BLD[b].pri - BLD[a].pri) || (BLD[a].no - BLD[b].no));
    if (!ids.length) continue;
    html += `<div class="group-h" style="--c:${CATS[k].color}"><i></i>${esc(CATS[k].ja)}</div>`;
    for (const id of ids) { const n = (roomsByB[id] || []).length; html += `<button class="row" data-b="${id}">${symHtml(id)}<span class="t"><b>${esc(BLD[id].ja)}</b><small>${esc(BLD[id].sub)}</small></span>${n ? `<span class="n">${n}室</span>` : ''}</button>`; }
  }
  paneB.innerHTML = html; markRows();
}
function markRows() { $$('.row[data-b]', paneB).forEach((el) => el.classList.toggle('on', el.dataset.b === state.sel)); }
paneB.addEventListener('click', (ev) => {
  const chip = ev.target.closest('.chip[data-cat]');
  if (chip) { const k = chip.dataset.cat; state.cats.has(k) ? state.cats.delete(k) : state.cats.add(k); chip.setAttribute('aria-pressed', state.cats.has(k)); scene.setFocus(new Set(bIds.filter((id) => state.cats.has(BLD[id].cat)))); return; }
  const row = ev.target.closest('.row[data-b]'); if (row) { openBuilding(row.dataset.b); if (isMobile()) $('#side').dataset.state = 'peek'; }
});

// ---------- 左パネル: 教室を探す ----------
const RB = ['kappa', 'epsilon', 'iota', 'omicron', 'lambda', 'omega', 'theta', 'tau'];
function renderRoomPane() {
  const bch = RB.map((b) => `<button class="chip" data-rb="${b}" aria-pressed="${rf.b.has(b)}" aria-label="${esc(BLD[b].ja)}"><i class="dot" style="--c:${bldColor(b)}"></i>${esc(BLD[b].sym)}</button>`).join('');
  const sch = Object.entries(ROOM_SZ).map(([k, v]) => `<button class="chip" data-rsz="${k}" aria-pressed="${rf.sz.has(k)}"><i class="dot" style="--c:${v.color}"></i>${esc(v.ja)}</button>`).join('');
  paneR.innerHTML = `<div class="filter">
    <div><h5>棟</h5><div class="chips">${bch}</div></div><div><h5>大きさ</h5><div class="chips">${sch}</div></div>
    <div><h5>定員</h5><div class="range"><input id="rf-min" type="range" min="0" max="400" step="10" value="${rf.min}" aria-label="最低の定員"><output id="rf-out">${rf.min ? rf.min + '人以上' : '指定なし'}</output></div></div>
    <div><h5>設備</h5><div class="chips"><button class="chip" data-rf="k4" aria-pressed="${rf.k4}">4Kディスプレイ</button><button class="chip" data-rf="ac" aria-pressed="${rf.ac}">アクティブラーニング</button></div></div>
  </div><div id="rf-list"></div>`;
  renderRoomList();
}
const filteredRooms = () => ROOMS.filter((r) => (!rf.b.size || rf.b.has(r.b)) && (!rf.sz.size || rf.sz.has(r.sz)) && r.n >= rf.min && (!rf.k4 || r.k4) && (!rf.ac || r.ac)).sort((a, b) => b.n - a.n || a.c.localeCompare(b.c, 'el'));
function renderRoomList() {
  const list = filteredRooms();
  const rows = list.map((r) => { const sz = ROOM_SZ[r.sz]; return `<button class="rrow" data-room="${esc(r.c)}"><span class="code" style="color:${bldColor(r.b)}">${esc(r.c)}</span><span class="t"><b style="font-size:14px">${esc(BLD[r.b].ja)}${r.f ? ' ' + r.f + 'F' : ''}</b><small>${esc(sz.ja)}${r.k4 ? ' · 4K' : ''}${r.ac ? ' · AL' : ''}</small>${capBar(r.n, sz.color)}</span><span class="cap">${r.n}<small>人</small></span></button>`; }).join('');
  $('#rf-list').innerHTML = `<div class="count"><b>${list.length}</b> 室が見つかりました</div>${rows || '<p class="sub">条件に合う教室がありません。条件をゆるめてみてください。</p>'}`;
}
paneR.addEventListener('click', (ev) => {
  const t = ev.target; const toggle = (set, k, btn) => { set.has(k) ? set.delete(k) : set.add(k); btn.setAttribute('aria-pressed', set.has(k)); renderRoomList(); };
  const rb = t.closest('[data-rb]'); if (rb) return toggle(rf.b, rb.dataset.rb, rb);
  const rz = t.closest('[data-rsz]'); if (rz) return toggle(rf.sz, rz.dataset.rsz, rz);
  const fk = t.closest('[data-rf]'); if (fk) { rf[fk.dataset.rf] = !rf[fk.dataset.rf]; fk.setAttribute('aria-pressed', rf[fk.dataset.rf]); return renderRoomList(); }
  const row = t.closest('.rrow'); if (row) openRoom(row.dataset.room);
});
paneR.addEventListener('input', (ev) => { if (ev.target.id === 'rf-min') { rf.min = +ev.target.value; $('#rf-out').textContent = rf.min ? rf.min + '人以上' : '指定なし'; renderRoomList(); } });

// ---------- 左パネル: 経路 ----------
const dl = $('#r-places');
dl.innerHTML = [
  ...Object.entries(POIS).map(([k, v]) => `<option value="${esc(v.label)}"></option>`),
  ...bIds.map((id) => `<option value="${esc(BLD[id].ja)}"></option>`),
  ...ROOMS.map((r) => `<option value="${esc(r.c)}" label="${esc(BLD[r.b].ja)} ${r.f ? r.f + '階' : ''}"></option>`),
].join('');
function placeKey(txt) {
  txt = txt.trim(); if (!txt) return null;
  for (const [k, v] of Object.entries(POIS)) if (v.label === txt || norm(v.label) === norm(txt)) return k;
  for (const id of bIds) if (BLD[id].ja === txt) return id;
  if (roomByCode[txt]) return txt;
  const p = parsePlaces(txt)[0]; return p ? p.key : null;
}
let lastRoute = null;
async function runRoute(fromKey, toKey, { setInputs = true, hash = true } = {}) {
  const out = $('#r-out');
  if (!fromKey || !toKey) { out.innerHTML = '<p class="note" style="margin-top:14px">出発と到着を、候補から選ぶか「κ21」のように入力してください。</p>'; return; }
  out.innerHTML = '<p class="sub" style="margin-top:14px">計算しています…</p>';
  await loadRouter();
  const from = resolvePlace(fromKey, roomByCode), to = resolvePlace(toKey, roomByCode);
  if (!from || !to) { out.innerHTML = '<p class="note" style="margin-top:14px">場所を読み取れませんでした。</p>'; return; }
  if (setInputs) { $('#r-from').value = from.label.replace(/^(.*)$/, '$1'); $('#r-to').value = to.label; }
  const r = routeBetween(from, to);
  const pair = (p) => `<span style="display:inline-flex;align-items:center;gap:6px">${p.b ? symHtml(p.b, 'sm') : ''}${esc(p.label)}${p.b && roomByCode[p.key] ? ` <span class="foot">${esc(BLD[p.b].ja)}</span>` : ''}</span>`;
  if (!r) { out.innerHTML = `<div class="r-card"><p>この2か所をつなぐ道が見つかりませんでした。</p></div>`; scene.clearRoute(); document.body.classList.add('has-route'); return; }
  if (r.same) { out.innerHTML = `<div class="r-card"><div class="r-pair">${pair(from)} → ${pair(to)}</div><p>同じ建物の中です。階段かエレベーターで移動します。</p></div>`; scene.clearRoute(); document.body.classList.add('has-route'); return; }
  const min = Math.max(1, Math.round(r.sec / 60)), fast = Math.max(1, Math.round(r.secFast / 60));
  lastRoute = { from: fromKey, to: toKey, min };
  const sub = [`約${Math.round(r.meters)}m`, `急ぎ足 約${fast}分`, r.climbSec ? `階の上り下り${Math.round(r.climbSec / 6) / 10}分を加算` : ''].filter(Boolean).join(' · ');
  out.innerHTML = `<div class="r-card"><div class="r-pair">${pair(from)} <span aria-hidden="true">→</span> ${pair(to)}</div>
    <div class="r-main"><div class="r-time">${min}<small>分</small></div><div class="r-sub"><b>ふつうに歩いて(目安)</b><span>${sub}</span></div></div>
    <p class="r-warn">目安です(階段・坂・混雑は含みません)</p>
    <div class="btns r-btns"><button class="btn plain sm" id="r-clear" type="button">線を消す</button><button class="btn plain sm" id="r-copy" type="button">リンクをコピー</button></div></div>`;
  document.body.classList.add('has-route');
  scene.showRoute(r.path);
  if (hash) setHash(`from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}`);
}
async function goRoute() { await runRoute(placeKey($('#r-from').value), placeKey($('#r-to').value)); }
$('#r-go').addEventListener('click', goRoute);
for (const id of ['r-from', 'r-to']) $('#' + id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goRoute(); } });
$('#r-swap').addEventListener('click', () => { const a = $('#r-from'), b = $('#r-to'); [a.value, b.value] = [b.value, a.value]; goRoute(); });
paneRt.addEventListener('click', async (e) => {
  if (e.target.closest('#r-clear')) { scene.clearRoute(); $('#r-out').innerHTML = ''; document.body.classList.remove('has-route'); setHash(''); }
  else if (e.target.closest('#r-close')) exitRoute();
  else if (e.target.closest('#r-copy')) { try { await navigator.clipboard.writeText(location.href); toast('リンクをコピーしました'); } catch { toast('コピーできませんでした'); } }
  const ex = e.target.closest('[data-ex]'); if (ex) { const [a, b] = ex.dataset.ex.split('>'); runRoute(a, b); }
});
$('#r-ex').innerHTML = [['poi:bus0>κ21', 'バス停 → κ21'], ['poi:gate3>Ω11', '北門 → Ω11'], ['κ21>λ12', 'κ21 → λ12'], ['poi:bus0>sigma', 'バス停 → シグマ館'], ['sigma>mu', 'シグマ館 → ミュー館']].map(([v, l]) => `<button class="chip" type="button" data-ex="${esc(v)}">${esc(l)}</button>`).join('');
async function routeFromBus(toKey) { if (isMobile() && state.sel) closeDetail(); setTab('route'); await runRoute('poi:bus0', toKey); }
// スマホ: 経路検索を閉じて、ふだんの検索とタブに戻る(地図の線は消す)
function exitRoute() { scene.clearRoute(); $('#r-out').innerHTML = ''; document.body.classList.remove('has-route'); setHash(''); setTab('bld'); $('#side').dataset.state = 'peek'; }

// 経路ペインの置き場所: PC は左パネルの中、スマホは画面の上に浮かせる
{
  const mq = matchMedia('(max-width: 860px)');
  const place = () => { if (mq.matches) $('#side').appendChild(paneRt); else $('.side-body').appendChild(paneRt); document.body.classList.toggle('route-mode', state.tab === 'route' && mq.matches); };
  mq.addEventListener('change', place); place();
}

// ---------- タブ ----------
function setTab(t) {
  state.tab = t;
  $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t));
  paneB.hidden = t !== 'bld'; paneR.hidden = t !== 'room'; paneRt.hidden = t !== 'route';
  document.body.classList.toggle('route-mode', t === 'route' && isMobile());   // スマホの経路検索は、上の細い入力欄だけ
}
$('.tabs').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-tab]'); if (!b) return;
  const side = $('#side'); const same = b.dataset.tab === state.tab;
  setTab(b.dataset.tab);
  if (isMobile() && b.dataset.tab === 'route') { if (document.body.classList.contains('has-detail')) closeDetail(); side.dataset.state = 'peek'; return; }
  if (isMobile()) { // 同じタブをもう一度押すと一覧を閉じる。別のタブなら開く
    if (document.body.classList.contains('has-detail')) closeDetail();
    side.dataset.state = (same && side.dataset.state !== 'peek') ? 'peek' : 'half';
  }
});

// ---------- 検索 ----------
const qEl = $('#q'), resEl = $('#results'); let resItems = [], resIdx = -1;
function renderResults() {
  const qn = norm(qEl.value);
  if (!qn) { resEl.hidden = true; qEl.setAttribute('aria-expanded', 'false'); return; }
  const b = searchBuildings(qn, 7), rr = searchRooms(qn, 12); resItems = []; let html = '';
  if (b.length) { html += '<h4>棟・施設</h4>'; for (const x of b) { resItems.push({ t: 'b', id: x.id }); html += `<button class="res" role="option" data-i="${resItems.length - 1}">${symHtml(x.id)}<span class="t"><b>${mark(BLD[x.id].ja, qn)}</b><small>${esc(BLD[x.id].sub)}${(roomsByB[x.id] || []).length ? ' · ' + roomsByB[x.id].length + '室' : ''}</small></span></button>`; } }
  if (rr.list.length) { html += `<h4>教室${rr.total > rr.list.length ? ` (${rr.total}件中${rr.list.length}件)` : ''}</h4>`; for (const x of rr.list) { resItems.push({ t: 'r', code: x.c }); const sz = ROOM_SZ[x.sz]; html += `<button class="res" role="option" data-i="${resItems.length - 1}">${symHtml(x.b)}<span class="t"><b>${esc(x.c)} <span style="font-weight:500;color:var(--ink3);font-size:13px">${esc(BLD[x.b].ja)}${x.f ? ' ' + x.f + 'F' : ''}</span></b><small>${esc(sz.ja)} · ${x.n}人${x.k4 ? ' · 4K' : ''}</small></span></button>`; } }
  if (!html) html = '<div class="empty">見つかりませんでした。<br>「κ21」「図書館」「食堂」のように入力してみてください。</div>';
  resEl.innerHTML = html; resEl.hidden = false; qEl.setAttribute('aria-expanded', 'true'); resIdx = resItems.length ? 0 : -1; markRes();
}
function markRes() { $$('.res', resEl).forEach((el, i) => el.setAttribute('aria-selected', i === resIdx)); $$('.res', resEl)[resIdx]?.scrollIntoView({ block: 'nearest' }); }
function chooseRes(i) {
  const it = resItems[i]; if (!it) return; qEl.blur(); resEl.hidden = true; qEl.setAttribute('aria-expanded', 'false');
  if (it.t === 'b') openBuilding(it.id); else openRoom(it.code);
  qEl.value = ''; if (isMobile()) $('#side').dataset.state = 'peek';
}
qEl.addEventListener('input', renderResults);
qEl.addEventListener('focus', () => { renderResults(); });
qEl.addEventListener('keydown', (ev) => {
  if (ev.isComposing) return;
  if (ev.key === 'ArrowDown') { ev.preventDefault(); if (resItems.length) { resIdx = (resIdx + 1) % resItems.length; markRes(); } }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (resItems.length) { resIdx = (resIdx - 1 + resItems.length) % resItems.length; markRes(); } }
  else if (ev.key === 'Enter') { ev.preventDefault(); if (resIdx >= 0) chooseRes(resIdx); else if (qEl.value.trim() && window.askNel) window.askNel(qEl.value); }
  else if (ev.key === 'Escape') { qEl.value = ''; resEl.hidden = true; qEl.blur(); }
});
resEl.addEventListener('mousedown', (ev) => { const b = ev.target.closest('.res'); if (b) { ev.preventDefault(); chooseRes(+b.dataset.i); } });
resEl.addEventListener('touchstart', (ev) => { const b = ev.target.closest('.res'); if (b) { ev.preventDefault(); chooseRes(+b.dataset.i); } }, { passive: false });
qEl.addEventListener('blur', () => setTimeout(() => { resEl.hidden = true; qEl.setAttribute('aria-expanded', 'false'); }, 120));
document.addEventListener('keydown', (ev) => {
  const tag = document.activeElement?.tagName;
  if (ev.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { ev.preventDefault(); qEl.focus(); qEl.select(); }
  else if (ev.key === 'Escape' && state.sel && tag !== 'INPUT') closeDetail();
});

// ---------- ツールバー ----------
$('#b-zin').onclick = () => scene.zoomBy(0.7);
$('#b-zout').onclick = () => scene.zoomBy(1.45);
$('#b-rl').onclick = () => scene.rotateBy(Math.PI / 4);
$('#b-rr').onclick = () => scene.rotateBy(-Math.PI / 4);
$('#b-view').onclick = () => scene.viewMode(scene.getPolar() < 0.25 ? '3d' : '2d');
$('#b-reset').onclick = () => { if (state.sel) closeDetail(); scene.resetView(); };
$('#compass').onclick = () => scene.flyTo({ azimuth: -Math.PI / 2 }, 0.7); // 北が上になる向き
$('#b-labels').onclick = (ev) => { state.labelsOn = !state.labelsOn; ev.currentTarget.setAttribute('aria-pressed', state.labelsOn); scene.invalidate(); };

function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }

// ---------- URL ----------
let lastHash = '';
function setHash(v) { lastHash = v ? '#' + v : ''; try { history.replaceState(null, '', location.pathname + lastHash); } catch { /* 無視 */ } }
function applyHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')); if (!h) return false;
  const sp = new URLSearchParams(h.includes('=') && h.includes('&') ? h : '');
  if (sp.get('from') && sp.get('to')) { setTab('route'); runRoute(sp.get('from'), sp.get('to'), { hash: false }); return true; }
  const m = h.match(/^([br])=(.+)$/); if (!m) return false;
  if (m[1] === 'b' && BLD[m[2]]) { openBuilding(m[2], { hash: false }); return true; }
  if (m[1] === 'r' && roomByCode[m[2]]) { openRoom(m[2], { hash: false }); return true; }
  return false;
}
addEventListener('hashchange', () => { if (location.hash !== lastHash) applyHash(); });

// ---------- 起動 ----------
renderBldPane(); renderRoomPane();
document.body.classList.remove('has-detail');
if (!applyHash()) {
  scene.resetView();
  if (document.body.dataset.page === 'route') { setTab('route'); }  // 経路ページは、入力欄を出した状態で始める
  setTimeout(() => toast(isMobile() ? 'ドラッグで回転・ピンチで拡大・建物をタップ' : 'ドラッグで回転 ・ ホイールで拡大 ・ 建物をクリックで教室を表示', 5200), 1400);
}
// ねるが開いている間は右側の詳細パネルを出さず、閉じたら出す
window.addEventListener('nel:close', () => { if (state.sel && detail.hidden) { renderDetail(); } });
// ねるの答え(場所・経路)に合わせて地図を動かす
function focusOn({ b, room, route } = {}) {
  if (route) { setTab('route'); return runRoute(route[0], route[1]); }
  if (room) return openRoom(room, { panel: false });
  if (b) return openBuilding(b, { panel: false });
}
// 下から出るシートの高さを CSS 変数に出す(ねるのボタンがシートに隠れないように)
{
  const upd = () => {
    const el = document.body.classList.contains('has-detail') ? detail : $('#side');
    const h = el.hidden ? 0 : el.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--sheet-h', Math.round(h) + 'px');
    document.body.classList.toggle('sheet-full', isMobile() && h > innerHeight * 0.8);
    // 一覧や詳細が開いている間は、ねるの吹き出しを隠す(一覧に重ならないように)
    document.body.classList.toggle('sheet-open', isMobile() && (document.body.classList.contains('has-detail') || $('#side').dataset.state !== 'peek'));
  };
  const ro = new ResizeObserver(upd); ro.observe($('#side')); ro.observe(detail);
  new MutationObserver(upd).observe(document.body, { attributes: true, attributeFilter: ['class'] }); new MutationObserver(upd).observe($('#side'), { attributes: true, attributeFilter: ['data-state'] }); addEventListener('resize', upd); upd();
}
// ねる・他のスクリプトから使う入口
window.__sfc = {
  focusOn,
  scene, state, openBuilding, openRoom, closeDetail,
  roomFloor: (code) => roomByCode[code]?.f ?? null,
  showRoute: (a, b) => { setTab('route'); return runRoute(a, b); },
};
