import { decode } from '../decoder.js';
import { GUIDE_CHECK } from '../content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'sfcmap-checklist-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 保存できなくても使える */ } };
let st = load(); const boxes = $$('[data-ck]'); const total = GUIDE_CHECK.reduce((n, g) => n + g.items.length, 0);
function paint() {
  const done = boxes.filter((b) => b.checked).length;
  $('#ck-n').textContent = `${done} / ${total}`; $('#ck-bar').style.width = (done / total * 100).toFixed(0) + '%';
}
boxes.forEach((b) => { b.checked = !!st[b.dataset.ck]; b.addEventListener('change', () => { st[b.dataset.ck] = b.checked; save(st); paint(); }); });
$('#ck-reset').addEventListener('click', () => { st = {}; save(st); boxes.forEach((b) => { b.checked = false; }); paint(); });
paint();

const inp = $('#gd-in'), out = $('#gd-out');
function deco() {
  const d = decode(inp.value);
  out.innerHTML = d.ok
    ? `<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div style="font:700 44px/1 var(--serif)">${d.sym}<span style="font-size:.7em;color:var(--ink3)"> ${d.floor}F </span>${d.num}</div><div class="sub" style="flex:1;min-width:200px">${d.note}<br><a href="${d.href}">地図で見る →</a> · <a href="${d.page}">この教室のページ →</a></div></div>`
    : `<p class="sub">${d.msg}</p>`;
}
inp.addEventListener('input', deco); deco();
