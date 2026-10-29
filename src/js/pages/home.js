import { decode } from '../decoder.js';

const $ = (s, r = document) => r.querySelector(s);

// 教室番号デコーダ
const inp = $('#deco-in');
function renderDeco() {
  const d = decode(inp.value);
  const b = $('#deco-b'), f = $('#deco-f'), n = $('#deco-n'), note = $('#deco-note'), go = $('#deco-go');
  if (d.ok) { b.textContent = d.sym; f.textContent = d.floor; n.textContent = d.num; note.textContent = d.note; go.href = d.href; go.removeAttribute('aria-disabled'); go.style.opacity = ''; }
  else { b.textContent = '?'; f.textContent = '?'; n.textContent = '??'; note.textContent = d.msg.replace(/&quot;|&amp;/g, ''); go.href = '/rooms/'; }
}
inp.addEventListener('input', renderDeco);
document.addEventListener('click', (e) => { const c = e.target.closest('[data-deco]'); if (c) { inp.value = c.dataset.deco; renderDeco(); } });
renderDeco();

// ヒーローの 3D(文字を先に出し、あとから重ねる。データ節約モード・WebGL なしでは出さない)
async function hero() {
  const stage = $('#hero-stage'); if (!stage) return;
  if (navigator.connection && navigator.connection.saveData) return;
  try {
    const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) return;
    const { CampusScene } = await import('../scene.js');
    const s = new CampusScene(stage, { ambient: true }); s.startAmbient();
    new ResizeObserver(() => s.startAmbient()).observe(stage);
    stage.classList.add('ready');
  } catch (e) { console.warn('hero 3D を表示できませんでした', e); }
}
(window.requestIdleCallback || ((f) => setTimeout(f, 300)))(hero, { timeout: 1500 });
