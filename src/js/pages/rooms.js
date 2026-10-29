// 教室一覧の絞り込みと並べ替え(表は HTML に書き出し済み。JS なしでも読める)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const tbody = $('#rt tbody'); const rows = $$('tr', tbody);
const f = { b: new Set(), sz: new Set(), min: 0, k4: false, ac: false };
function apply() {
  let n = 0;
  for (const r of rows) {
    const ok = (!f.b.size || f.b.has(r.dataset.b)) && (!f.sz.size || f.sz.has(r.dataset.sz)) && +r.dataset.n >= f.min && (!f.k4 || r.dataset.k4 === '1') && (!f.ac || r.dataset.ac === '1');
    r.hidden = !ok; if (ok) n++;
  }
  $('#f-count').textContent = n;
}
const toggle = (set, k, btn) => { set.has(k) ? set.delete(k) : set.add(k); btn.setAttribute('aria-pressed', set.has(k)); apply(); };
$('#f-b').addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (b) toggle(f.b, b.dataset.b, b); });
$('#f-sz').addEventListener('click', (e) => { const b = e.target.closest('[data-sz]'); if (b) toggle(f.sz, b.dataset.sz, b); });
$('#f-min').addEventListener('input', (e) => { f.min = +e.target.value; $('#f-out').textContent = f.min ? f.min + '人以上' : '指定なし'; apply(); });
for (const k of ['k4', 'ac']) $('#f-' + k).addEventListener('click', (e) => { f[k] = !f[k]; e.currentTarget.setAttribute('aria-pressed', f[k]); apply(); });
$('#f-reset').addEventListener('click', () => { f.b.clear(); f.sz.clear(); f.min = 0; f.k4 = f.ac = false; $$('#filter .chip[aria-pressed]').forEach((c) => c.setAttribute('aria-pressed', 'false')); $('#f-min').value = 0; $('#f-out').textContent = '指定なし'; apply(); });
// 並べ替え
let sort = { k: 'n', dir: -1 };
$$('#rt th[data-sort]').forEach((th) => th.addEventListener('click', () => {
  const k = th.dataset.sort; sort = { k, dir: sort.k === k ? -sort.dir : (k === 'n' ? -1 : 1) };
  const key = (r) => (k === 'n' ? +r.dataset.n : k === 'code' ? r.dataset.code : r.dataset[k]);
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.dataset.code.localeCompare(b.dataset.code, 'el'); }).forEach((r) => tbody.append(r));
  $$('#rt th').forEach((h) => h.removeAttribute('aria-sort')); th.setAttribute('aria-sort', sort.dir > 0 ? 'ascending' : 'descending');
}));
// 行のどこをクリックしても地図へ
tbody.addEventListener('click', (e) => { const tr = e.target.closest('tr'); if (tr && !e.target.closest('a')) location.href = tr.dataset.page; });
tbody.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr'); if (tr) location.href = tr.dataset.page; } });
apply();
