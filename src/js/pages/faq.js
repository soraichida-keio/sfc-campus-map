const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const norm = (s) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const items = $$('details[data-t]');
function filter() {
  const q = norm($('#faq-q').value); let n = 0;
  for (const d of items) { const ok = !q || norm(d.dataset.t).includes(q); d.hidden = !ok; if (ok) n++; }
  $$('.faq-sec').forEach((s) => { s.hidden = !$$('details', s).some((d) => !d.hidden); });
  $('#faq-none').hidden = n > 0;
}
$('#faq-q').addEventListener('input', filter);
// #id で直接開く
function openHash() { const id = decodeURIComponent(location.hash.slice(1)); const d = id && document.getElementById(id); if (d && d.tagName === 'DETAILS') { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'center' }), 60); } }
addEventListener('hashchange', openHash); openHash();
