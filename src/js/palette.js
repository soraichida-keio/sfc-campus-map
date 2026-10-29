// コマンドパレット(サイト全体の検索)。ページ・建物・教室・よくある質問・用語を横断して引く。
import { searchAll, BLD, CATS, ROOM_SZ } from './search.js';
import { icon } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const symHtml = (id) => `<span class="sym sm${BLD[id].sym.length > 1 ? ' long' : ''}" style="--c:${CATS[BLD[id].cat].color}">${esc(BLD[id].sym)}</span>`;

export function createPalette() {
  const el = document.createElement('div');
  el.className = 'palette'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'サイト内検索');
  el.innerHTML = `<div class="pal-box"><div class="pal-in">${icon('search')}<input type="search" id="pal-q" autocomplete="off" spellcheck="false" placeholder="教室・建物・施設・質問を検索  例: κ21 / 図書館 / 履修" aria-label="検索" aria-controls="pal-list"><kbd class="kbd">Esc</kbd></div><div class="pal-list" id="pal-list" role="listbox"></div></div>`;
  document.body.append(el);
  const q = el.querySelector('#pal-q'), list = el.querySelector('#pal-list');
  let items = [], idx = 0, last = null;

  const quick = () => {
    items = [
      { h: 'よく使う', href: '/map/', t: 'マップを開く', s: '3D でキャンパスを見る', ic: 'map' },
      { href: '/rooms/', t: '教室を探す', s: '定員・設備で絞り込み', ic: 'rooms' },
      { href: '/route/', t: '経路・徒歩時間', s: '教室から教室まで何分？', ic: 'route' },
      { href: '/guide/', t: '新入生ガイド', s: '最初にやること', ic: 'guide' },
      { href: '/faq/', t: 'よくある質問', s: '通学・履修・施設', ic: 'faq' },
    ];
    render(true);
  };
  function render() {
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<div class="pal-empty">見つかりませんでした。「κ21」「図書館」「履修」のように入力してみてください。</div>'; return; }
    let h = '', n = 0;
    for (const it of items) {
      if (it.h) h += `<div class="pal-h">${esc(it.h)}</div>`;
      h += `<a class="pal-i" role="option" href="${it.href}" data-n="${n}" aria-selected="${n === idx}">${it.sym || `<span class="sym sm" style="--c:var(--ink3)">${icon(it.ic || 'chevron')}</span>`}<span><b>${esc(it.t)}</b><span class="sm">${esc(it.s || '')}</span></span></a>`;
      n++;
    }
    list.innerHTML = h;
  }
  function run() {
    const v = q.value;
    if (!v.trim()) return quick();
    const r = searchAll(v); items = []; idx = 0;
    r.pages.forEach((p, i) => items.push({ h: i ? '' : 'ページ', href: p.path, t: p.label, s: 'ページを開く', ic: p.icon }));
    r.b.forEach((x, i) => items.push({ h: i ? '' : '棟・施設', sym: symHtml(x.id), href: `/map/#b=${x.id}`, t: BLD[x.id].ja, s: BLD[x.id].sub }));
    r.r.forEach((x, i) => items.push({ h: i ? '' : `教室${r.rTotal > r.r.length ? `(${r.rTotal}件中${r.r.length}件)` : ''}`, sym: symHtml(x.b), href: `/map/#r=${encodeURIComponent(x.c)}`, t: x.c, s: `${BLD[x.b].ja}${x.f ? ' ' + x.f + '階' : ''} · ${ROOM_SZ[x.sz].ja} · ${x.n}人` }));
    r.faq.forEach((f, i) => items.push({ h: i ? '' : 'よくある質問', href: `/faq/#${f.id}`, t: f.q, s: f.cat, ic: 'faq' }));
    r.gloss.forEach((g, i) => items.push({ h: i ? '' : 'SFC のことば', href: '/guide/#words', t: g.term, s: g.def, ic: 'book' }));
    render();
  }
  function mark() { [...list.querySelectorAll('.pal-i')].forEach((a, i) => { a.setAttribute('aria-selected', String(i === idx)); if (i === idx) a.scrollIntoView({ block: 'nearest' }); }); }
  q.addEventListener('input', () => { idx = 0; run(); });
  q.addEventListener('keydown', (e) => {
    const n = items.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { idx = (idx + 1) % n; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { idx = (idx - 1 + n) % n; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) { location.href = items[idx].href; close(); } else if (q.value.trim() && window.askNel) { close(); window.askNel(q.value); } }
    else if (e.key === 'Escape') close();
  });
  el.addEventListener('click', (e) => { if (e.target === el) close(); if (e.target.closest('.pal-i')) close(); });
  list.addEventListener('mousemove', (e) => { const a = e.target.closest('.pal-i'); if (a) { idx = +a.dataset.n; mark(); } });
  function open() { last = document.activeElement; el.classList.add('on'); q.value = ''; idx = 0; quick(); q.focus(); }
  function close() { el.classList.remove('on'); last?.focus?.(); }
  return { open, close };
}
