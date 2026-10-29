// 全ページ共通の動き: ドロワー・検索(⌘K)・目次ハイライト・ふわっと表示・ねる・PWA

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できない環境では無視 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* 無視 */ } },
};

// ---------- ドロワー ----------
const drawer = $('#drawer'), scrim = $('#scrim');
function drawerOpen(on) {
  drawer.classList.toggle('on', on); scrim.classList.toggle('on', on);
  drawer.setAttribute('aria-hidden', String(!on)); $('#menu-btn')?.setAttribute('aria-expanded', String(on));
  if (on) $('#drawer-close')?.focus();
}
$('#menu-btn')?.addEventListener('click', () => drawerOpen(true));
$('#tab-more')?.addEventListener('click', () => drawerOpen(true));
$('#drawer-close')?.addEventListener('click', () => drawerOpen(false));
scrim?.addEventListener('click', () => drawerOpen(false));
drawer?.addEventListener('click', (e) => { if (e.target.closest('a')) drawerOpen(false); });

// ---------- 目次ハイライト ----------
const toc = $$('.sb-toc a');
if (toc.length) {
  const map = new Map(toc.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { toc.forEach((a) => a.classList.remove('on')); map.get(e.target.id)?.classList.add('on'); } }, { rootMargin: '-20% 0px -70% 0px' });
  for (const id of map.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
}

// ---------- ふわっと表示 ----------
const rv = $$('.reveal');
if (rv.length) {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) rv.forEach((e) => e.classList.add('in'));
  else { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 }); rv.forEach((e) => io.observe(e)); }
}

// ---------- 検索パレット(⌘K / Ctrl+K / "/") ----------
let palette = null;
async function openPalette() {
  if (!palette) { palette = (await import('./palette.js')).createPalette(); }
  palette.open();
}
$('#open-search')?.addEventListener('click', openPalette);
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); }
  else if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !document.activeElement?.isContentEditable && !$('#q')) { e.preventDefault(); openPalette(); }
});
window.openSearch = openPalette;

// ---------- ねる ----------
let nelP = null;
function loadNel() { return (nelP ||= import('./nel/assistant.js').then((m) => m.initNel())); }
$('#open-nel')?.addEventListener('click', async () => { const n = await loadNel(); n.toggle(); });
$('#tab-nel')?.addEventListener('click', async () => { const n = await loadNel(); n.toggle(); });
window.askNel = async (q) => { const n = await loadNel(); n.open(); if (q) n.ask(q); };
// 最初の描画のあとで、ねるのボタンだけ用意する(声・画像はクリックされるまで読み込まない)
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 800));
idle(() => { loadNel(); }, { timeout: 2500 });

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* 登録できなくても動く */ }); });
}

// data-ask ボタン(ページ内のどこからでも ねる に質問できる)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-ask]'); if (!b) return;
  e.preventDefault(); window.askNel(b.dataset.ask);
});
