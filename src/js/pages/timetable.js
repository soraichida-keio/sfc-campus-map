// 時間割プランナー: 授業と教室を入れると、教室間の徒歩時間を休み時間と比べる。保存先はこの端末の localStorage だけ。
import { PERIODS } from '../content.js';
import { BLD } from '../data.js';
import { ROOMS, roomByCode } from '../search.js';
import { parsePlaces } from '../nel/brain.js';
import { POIS, loadRouter, resolvePlace, routeBetween } from '../route.js';
import { drawMap as drawBase, buildingCenter } from '../minimap.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['月', '火', '水', '木', '金', '土'];
const KEY = 'sfcmap-timetable-v1';
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 保存できなくても使える */ } } };

let st = store.get() || { slots: {}, sat: false, p7: false };
let day = Math.max(0, Math.min(5, (new Date().getDay() + 6) % 7)); if (day === 5 && !st.sat) day = 0;
const save = () => store.set(st);
const slotKey = (d, p) => `${d}-${p}`;

$('#tt-rooms').innerHTML = ROOMS.map((r) => `<option value="${esc(r.c)}" label="${esc(BLD[r.b].ja)} ${r.f ? r.f + '階' : ''}"></option>`).join('');

// ---------- 表 ----------
function renderGrid() {
  const nd = st.sat ? 6 : 5, np = st.p7 ? 7 : 6;
  let h = `<thead><tr><th style="width:92px">時限</th>${DAYS.slice(0, nd).map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>`;
  for (let p = 1; p <= np; p++) {
    const P = PERIODS[p - 1];
    h += `<tr><th scope="row" style="white-space:nowrap"><b style="color:var(--ink);font-size:15px">${p}限</b><br><span class="foot" style="font-weight:500">${P.s}〜${P.e}</span></th>`;
    for (let d = 0; d < nd; d++) {
      const s = st.slots[slotKey(d, p)];
      h += `<td style="padding:6px"><button type="button" class="tt-cell${s ? ' on' : ''}" data-d="${d}" data-p="${p}" aria-label="${DAYS[d]}曜${p}限${s ? ' ' + esc(s.name || '') + ' ' + esc(s.room || '') : '(空き)'}">${s ? `<b>${esc(s.name || '授業')}</b><span>${esc(s.room || '教室未設定')}</span>` : '<i>+</i>'}</button></td>`;
    }
    h += '</tr>';
  }
  $('#tt').innerHTML = h + '</tbody>';
  $('#tt-sat').setAttribute('aria-pressed', st.sat); $('#tt-p7').setAttribute('aria-pressed', st.p7);
}
function renderDays() {
  const nd = st.sat ? 6 : 5;
  $('#tt-days').innerHTML = DAYS.slice(0, nd).map((d, i) => `<button class="chip" role="tab" type="button" data-day="${i}" aria-selected="${i === day}" aria-pressed="${i === day}">${d}曜日</button>`).join('');
}

// ---------- 入力ダイアログ ----------
const dlg = $('#tt-dlg'); let editing = null;
$('#tt').addEventListener('click', (e) => {
  const c = e.target.closest('.tt-cell'); if (!c) return;
  editing = { d: +c.dataset.d, p: +c.dataset.p }; const s = st.slots[slotKey(editing.d, editing.p)] || {};
  $('#tt-dlg-t').textContent = `${DAYS[editing.d]}曜 ${editing.p}限`; $('#tt-name').value = s.name || ''; $('#tt-room').value = s.room || '';
  dlg.showModal(); $('#tt-room').focus();
});
$('#tt-form').addEventListener('submit', (e) => {
  const v = e.submitter && e.submitter.value; const k = slotKey(editing.d, editing.p);
  if (v === 'save') {
    const name = $('#tt-name').value.trim(); let room = $('#tt-room').value.trim();
    if (room) { const p = parsePlaces(room).find((x) => x.kind === 'room' || x.kind === 'bld'); room = p ? (p.kind === 'room' ? p.key : BLD[p.key].ja) : room; }
    if (name || room) st.slots[k] = { name, room }; else delete st.slots[k];
  } else if (v === 'clear') delete st.slots[k];
  save(); renderGrid(); renderFlow();
});
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

$('#tt-sat').onclick = () => { st.sat = !st.sat; if (!st.sat && day === 5) day = 0; save(); renderGrid(); renderDays(); renderFlow(); };
$('#tt-p7').onclick = () => { st.p7 = !st.p7; save(); renderGrid(); };
$('#tt-clear').onclick = () => { if (Object.keys(st.slots).length && !confirm('時間割をすべて消しますか？')) return; st.slots = {}; save(); renderGrid(); renderFlow(); };
$('#tt-copy').onclick = async () => {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify({ s: st.slots, a: st.sat ? 1 : 0, p: st.p7 ? 1 : 0 }))));
  const url = location.origin + location.pathname + '#t=' + data;
  try { await navigator.clipboard.writeText(url); toast('リンクをコピーしました。開くと時間割が入ります'); } catch { prompt('このリンクをコピーしてください', url); }
};
function toast(m) { let t = $('#tt-toast'); if (!t) { t = document.createElement('div'); t.id = 'tt-toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }
$('#tt-days').addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { day = +b.dataset.day; renderDays(); renderFlow(); } });

// 共有リンクから読み込む
function fromHash() {
  const m = location.hash.match(/^#t=(.+)$/); if (!m) return;
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    const apply = () => { st = { slots: o.s || {}, sat: !!o.a, p7: !!o.p }; save(); history.replaceState(null, '', location.pathname); renderGrid(); renderDays(); renderFlow(); toast('共有された時間割を読み込みました'); };
    if (Object.keys(st.slots).length) { if (confirm('リンクの時間割を読み込みますか？(いまの内容は置き換わります)')) apply(); } else apply();
  } catch { toast('リンクを読み取れませんでした'); }
}

// ---------- この日の動き ----------
const fmtD = (min) => (min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 ? (min % 60) + '分' : ''}` : `${min}分`);
async function renderFlow() {
  const list = []; const np = st.p7 ? 7 : 6;
  for (let p = 1; p <= np; p++) { const s = st.slots[slotKey(day, p)]; if (s) list.push({ p, ...s }); }
  const flow = $('#tt-flow');
  if (!list.length) { flow.innerHTML = '<div class="card flat"><p class="sub">この曜日には授業が入っていません。上の表でマスをクリックして、授業と教室を入れてください。</p></div>'; drawMap([]); return; }
  await loadRouter();
  const places = list.map((s) => (s.room ? resolvePlace(roomByCode[s.room] ? s.room : (parsePlaces(s.room)[0]?.key || '_'), roomByCode) : null));
  const bus = resolvePlace('poi:bus0', roomByCode);
  const legs = []; let html = '<ol class="flow">';
  // 出発: バス停 → 最初の授業
  const first = places[0];
  const item = (cls, title, body) => `<li class="fl ${cls}"><div class="fl-dot"></div><div class="fl-b"><b>${title}</b>${body ? `<div class="sub">${body}</div>` : ''}</div></li>`;
  if (first) {
    const r = routeBetween(bus, first);
    if (r && !r.same) { legs.push({ r, label: 'バス停 → 1つ目' }); html += item('', `バス停(慶応大学本館前)から ${esc(list[0].room)}`, `歩いて約${Math.max(1, Math.round(r.sec / 60))}分(ふつう)。<span class="foot">バスの到着から授業開始までの余裕に使ってください。</span>`); }
  }
  list.forEach((s, i) => {
    const P = PERIODS[s.p - 1];
    html += item('cls', `${s.p}限 ${esc(s.name || '授業')} <span class="foot">${P.s}〜${P.e}</span>`, s.room ? `教室 ${esc(s.room)}${places[i]?.b ? ' · ' + esc(BLD[places[i].b].ja) : ''}` : '教室が未入力です');
    const nx = list[i + 1]; if (!nx) return;
    const gap = toMin(PERIODS[nx.p - 1].s) - toMin(P.e); const a = places[i], b = places[i + 1];
    if (!a || !b) { html += item('gap', `休み ${fmtD(gap)}`, '教室を入れると、歩く時間を計算します。'); return; }
    const r = routeBetween(a, b);
    if (!r) { html += item('gap', `休み ${fmtD(gap)}`, '経路を計算できませんでした。'); return; }
    if (r.same) { html += item('gap ok', `休み ${fmtD(gap)} · 同じ建物`, '階の移動(階段・エレベーター)だけです。'); return; }
    legs.push({ r, label: `${s.p}限 → ${nx.p}限` });
    const walk = Math.max(1, Math.round(r.sec / 60)), fast = Math.max(1, Math.round(r.secFast / 60));
    const v = walk <= gap - 3 ? ['ok', '余裕あり'] : walk <= gap ? ['warn', 'ぎりぎり'] : fast <= gap ? ['warn', '急げば間に合う目安'] : ['ng', '間に合わない目安'];
    html += item('gap ' + v[0], `休み ${fmtD(gap)} → 歩いて約${walk}分 <span class="badge ${v[0]}">${v[1]}</span>`, `${esc(s.room)} から ${esc(nx.room)}(距離 約${Math.round(r.meters)}m、急ぎ足で約${fast}分)。${v[0] === 'ng' ? '<br><b>教室が遠いので、早めに移動を始めるか、昼休みなどの長い休みを使いましょう。</b>' : ''}`);
  });
  flow.innerHTML = html + '</ol><p class="foot">歩く時間は目安です(階段・坂・混雑・建物内の通り抜けは含みません)。授業前に一度歩いて確かめてください。</p>';
  drawMap(legs.map((l) => l.r), list.map((s, i) => ({ s, pl: places[i] })), bus);
}

// ---------- 2D 地図(北が上) ----------
const LEG_COLORS = ['#ff9f0a', '#0a84ff', '#30d158', '#bf5af2', '#ff453a'];
async function drawMap(routes, stops = [], bus) {
  const markers = [], fit = [], hi = new Set(); const seen = new Map();
  for (const r of routes) for (const p of r.path) fit.push(p);
  if (bus && routes.length) { markers.push({ x: bus.pt[0], z: bus.pt[1], label: 'B', fill: '#1d1d1f' }); fit.push(bus.pt); }
  for (const { s, pl } of stops) {
    if (!pl || !pl.b) continue; hi.add(pl.b); const [x, z] = buildingCenter(pl.b); const k = seen.get(pl.b) || 0; seen.set(pl.b, k + 1);
    markers.push({ x: x - k * 7, z: z + k * 9, label: String(s.p), fill: '#e5484d' }); fit.push([x, z]);
  }
  await drawBase($('#tt-map'), { fit: fit.length ? fit : undefined, whole: !fit.length, highlight: [...hi], routes: routes.map((r, i) => ({ path: r.path, color: LEG_COLORS[i % LEG_COLORS.length] })), markers, minSpan: 130, pad: 45 });
}

renderGrid(); renderDays(); renderFlow(); fromHash();
