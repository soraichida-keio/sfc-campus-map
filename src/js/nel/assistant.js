// 案内キャラ「ねる」: 口パク(声の音量に合わせて口の3段階を切り替え)と吹き出しで答える。
// 声は AivisSpeech「まお」で事前に作った音声。音声が無い/ミュート中は、文字だけで口を動かす。
import { answer, defaultChips } from './brain.js';
import { lineKey, VOICE_TAG } from '../reading.js';
import { icon } from '../icons.js';
import { STOCK } from '../lines.js';
import { roomUrl } from '../data.js';
import { drawMap, buildingCenter, buildingPoints } from '../minimap.js';

const $ = (s, r = document) => r.querySelector(s);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できない環境では無視 */ } },
};
const ASSET = '/nel/';

let instance = null; // window.nel は、id="nel" の要素と名前が衝突するので、存在確認には使わない
export function initNel() {
  if (instance) return instance;
  const page = document.body.dataset.page;

  const root = document.createElement('div');
  root.innerHTML = `
  <div class="nel-fab" id="nel-fab">
    <div class="nel-bubble-hint" id="nel-hint" role="presentation"><b>何でも聞いてね！</b><span class="sub">${icon('speaker')}タップして質問 · 声で答えます</span></div>
    <button class="nel-btn" id="nel-open" aria-label="案内キャラ「ねる」に質問する。タップすると質問でき、声で答えます" aria-haspopup="dialog" aria-expanded="false"><img src="${ASSET}nikkori_m0.webp" alt="" width="120" height="120" decoding="async"><span class="nel-badge" aria-hidden="true">${icon('speaker')}</span></button>
  </div>
  <section class="nel-panel" id="nel-panel" role="dialog" aria-label="案内キャラ ねる" aria-modal="false">
    <div class="nel-top">
      <div class="t">ねる<small>SFC 案内係(非公式)</small></div>
      <button class="nel-voice" id="nel-mute" aria-label="声を切り替え" aria-pressed="false"></button>
      <button class="tbtn" id="nel-close" aria-label="閉じる">${icon('close')}</button>
    </div>
    <div class="nel-stage">
      <div class="nel-char" id="nel-char" aria-hidden="true"></div>
      <div class="nel-say" id="nel-say" aria-live="polite"></div>
    </div>
    <div class="nel-log" id="nel-log"></div>
    <div class="nel-chips" id="nel-chips" role="group" aria-label="質問の例"></div>
    <form class="nel-form" id="nel-form" autocomplete="off">
      <input class="input" id="nel-input" type="text" enterkeyhint="send" placeholder="例: κ21はどこ？(声で答えます)" aria-label="ねるへの質問" maxlength="80">
      <button class="nel-send" type="submit" aria-label="送信">${icon('send')}</button>
    </form>
    <p class="nel-note">答えはこのサイトのデータだけから作っています。間違いがあるかもしれないので、大事なことは公式で確認してね。声は AivisSpeech(まお)の合成音声です。</p>
  </section>`;
  document.body.append(...root.children);

  const fab = $('#nel-fab'), btnOpen = $('#nel-open'), panel = $('#nel-panel'), sayEl = $('#nel-say'), logEl = $('#nel-log'), chipsEl = $('#nel-chips'), form = $('#nel-form'), input = $('#nel-input'), charEl = $('#nel-char'), hint = $('#nel-hint'), muteBtn = $('#nel-mute');

  // ---------- 表情と口 ----------
  const faces = new Map(); // expr -> [img0,img1,img2]
  let cur = { e: 'nikkori', m: 0 };
  function ensureFace(e) {
    if (faces.has(e)) return faces.get(e);
    const imgs = [0, 1, 2].map((m) => { const im = new Image(); im.src = `${ASSET}${e}_m${m}.webp`; im.alt = ''; im.decoding = 'async'; im.draggable = false; charEl.appendChild(im); return im; });
    faces.set(e, imgs); return imgs;
  }
  function setFace(e, m) {
    const imgs = ensureFace(e);
    for (const [k, list] of faces) list.forEach((im, i) => im.classList.toggle('on', k === e && i === m));
    cur = { e, m };
    if (imgs[m] && btnOpen) { const a = $('img', btnOpen); if (a && !isSpeaking) a.src = imgs[m].src; }
  }
  let isSpeaking = false;
  setFace('nikkori', 0);
  // まばたき(待機中だけ)
  let blinkT = 0;
  function scheduleBlink() {
    clearTimeout(blinkT);
    blinkT = setTimeout(() => {
      if (!isSpeaking && cur.e === 'nikkori' && panel.classList.contains('on') && !reduceMotion()) { setFace('metoji', 0); setTimeout(() => { if (!isSpeaking) setFace('nikkori', 0); }, 140); }
      scheduleBlink();
    }, 3500 + Math.random() * 3500);
  }

  // ---------- 声 ----------
  let muted = store.get('sfcmap-nel-mute') === '1';
  function renderMute() { muteBtn.innerHTML = (muted ? icon('speakerOff') : icon('speaker')) + `<span>声 ${muted ? 'オフ' : 'オン'}</span>`; muteBtn.setAttribute('aria-pressed', String(!muted)); muteBtn.setAttribute('aria-label', muted ? '声をオンにする(いまはオフ)' : '声をオフにする(いまはオン)'); }
  renderMute();
  let actx = null; const clips = new Map();
  async function ctx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state !== 'running') await Promise.race([actx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 700))]); // 許可が取れないときに待ち続けない
    return actx;
  }
  let blockedShown = false;
  function noteBlocked() {
    if (blockedShown) return; blockedShown = true;
    addTip('音がブロックされているようです。もう一度ねるをタップするか、ブラウザのサイト設定(音の自動再生)を確認してね。文字だけでも答えます。', false);
  }
  function envelope(buf) {
    const d = buf.getChannelData(0), step = Math.floor(buf.sampleRate / 30), e = [];
    for (let i = 0; i < d.length; i += step) { let s = 0; const n = Math.min(step, d.length - i); for (let j = 0; j < n; j++) s += d[i + j] * d[i + j]; e.push(Math.sqrt(s / n)); }
    const sorted = [...e].sort((a, b) => a - b); const ref = sorted[Math.floor(sorted.length * 0.92)] || 1;
    return e.map((v) => v / ref);
  }
  function loadClip(key) {
    if (clips.has(key)) return clips.get(key);
    const p = fetch(`/voice/${key}.mp3`).then((r) => { if (!r.ok) throw new Error('no clip'); return r.arrayBuffer(); })
      .then(async (ab) => { const c = await ctx(); const buf = await c.decodeAudioData(ab); return { buf, env: envelope(buf) }; }).catch(() => null);
    clips.set(key, p); return p;
  }

  let token = 0; let curSrc = null; let raf = 0;
  function stopSpeaking() { token++; try { curSrc && curSrc.stop(); } catch { /* 既に止まっている */ } curSrc = null; cancelAnimationFrame(raf); isSpeaking = false; setFace(cur.e, 0); }

  // 1つの台詞を話す(文字を少しずつ出し、口を動かす)。戻り値: 完了したら resolve
  function speakLine(l, expr, myToken) {
    return new Promise(async (resolve) => {
      const text = l.t; let clip = null;
      if (!muted) { try { await ctx(); if (actx.state !== 'running') noteBlocked(); else clip = await loadClip(lineKey(text, VOICE_TAG)); } catch { clip = null; } }
      if (myToken !== token) return resolve(false);
      const dur = clip ? clip.buf.duration : Math.max(1.4, text.length / 6.2);
      let t0;
      if (clip) { curSrc = actx.createBufferSource(); curSrc.buffer = clip.buf; curSrc.connect(actx.destination); curSrc.start(); t0 = actx.currentTime; curSrc.onended = () => { if (myToken === token) finish(); }; }
      else t0 = performance.now() / 1000;
      const now = () => (clip ? actx.currentTime : performance.now() / 1000) - t0;
      let done = false; let lastM = 0, lastChange = 0;
      const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); sayEl.textContent = text; setFace(expr, 0); resolve(true); };
      const tick = () => {
        if (myToken !== token || done) return;
        const t = now();
        const shown = reduceMotion() ? text.length : Math.min(text.length, Math.ceil((t / Math.max(0.3, dur - 0.15)) * text.length));
        sayEl.innerHTML = '';
        sayEl.append(document.createTextNode(text.slice(0, shown)));
        if (shown < text.length) { const c = document.createElement('span'); c.className = 'cur'; sayEl.append(c); }
        let m;
        if (clip) { const v = clip.env[Math.min(clip.env.length - 1, Math.floor(t * 30))] || 0; m = v < 0.2 ? 0 : v < 0.6 ? 1 : 2; }
        else { m = Math.floor(t * 9) % 3 === 0 ? 0 : (Math.floor(t * 9) % 2 ? 1 : 2); }
        const nowMs = performance.now();
        if (m !== lastM && nowMs - lastChange > 80) { lastM = m; lastChange = nowMs; setFace(expr, m); }
        if (!clip && t >= dur) return finish();
        if (clip && t >= dur + 0.05) return finish();
        raf = requestAnimationFrame(tick);
      };
      isSpeaking = true; setFace(expr, 0); tick();
      setTimeout(() => { if (myToken === token) finish(); }, (dur + 0.6) * 1000); // 裏のタブで描画が止まっても、話は必ず終わらせる
    });
  }
  async function speak(lines, expr) {
    stopSpeaking(); const my = token; isSpeaking = true;
    for (const l of lines) { const ok = await speakLine(l, expr, my); if (!ok) return; }
    if (my === token) { isSpeaking = false; setFace(expr, 0); }
  }

  // ---------- 会話 ----------
  function addMe(t) { const d = document.createElement('div'); d.className = 'nel-me'; d.textContent = t; logEl.append(d); trim(); logEl.scrollTop = logEl.scrollHeight; }
  // ミニマップ(北が上)。場所を聞かれたときに、いまのページを離れずに位置を見せる
  function renderMini(cv, m) {
    const pos = (x) => (x.pt ? x.pt : buildingCenter(x.b));
    const routes = (m.routes || []).map((path) => ({ path, color: '#ff9f0a' }));
    const markers = (m.markers || []).map((k) => { const [x, z] = pos(k); return { x, z, label: k.label, fill: k.fill }; });
    const pins = (m.pins || []).map((k) => { const [x, z] = pos(k); return { x, z, text: k.text }; });
    const fit = [...buildingPoints(m.highlight || []), ...routes.flatMap((r) => r.path), ...markers.map((k) => [k.x, k.z])];
    drawMap(cv, { fit, highlight: m.highlight, routes, markers, pins, minSpan: m.routes ? 90 : 120, pad: m.routes ? 36 : 50 }).catch(() => { cv.remove(); });
  }
  function addDet(html, actions, mini) {
    const d = document.createElement('div'); d.className = 'nel-det';
    if (mini) {
      const cv = document.createElement('canvas'); cv.className = 'nel-mini'; cv.width = 720; cv.height = 405; cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', '場所を示す地図(北が上)'); d.append(cv); renderMini(cv, mini);
    }
    const body = document.createElement('div'); body.innerHTML = html; d.append(body);
    if (actions && actions.length) {
      const b = document.createElement('div'); b.className = 'btns';
      for (const a of actions) {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'btn sm plain'; el.textContent = a.label;
        el.addEventListener('click', () => runAction(a)); b.append(el);
      }
      d.append(b);
    }
    logEl.append(d); trim(); logEl.scrollTop = logEl.scrollHeight;
  }
  // 声についての案内カード(最初に開いたとき1回)。「声を試す」で、いつでも聞き直せる
  function addTip(text, withTest = true) {
    const d = document.createElement('div'); d.className = 'nel-tip';
    d.innerHTML = `<span class="ico">${icon('speaker')}</span><div><b>${withTest ? '声で答えます' : '音について'}</b><p></p></div>`;
    d.querySelector('p').textContent = text;
    if (withTest) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm plain'; b.textContent = '声を試す'; b.addEventListener('click', () => { if (muted) { muted = false; store.set('sfcmap-nel-mute', '0'); renderMute(); } speak([{ id: 'stock:greet', t: STOCK.greet }], 'nikkori'); }); d.append(b); }
    logEl.append(d); logEl.scrollTop = logEl.scrollHeight;
  }
  function trim() { while (logEl.children.length > 8) logEl.firstChild.remove(); }
  function setChips(list) {
    chipsEl.innerHTML = '';
    for (const c of list.slice(0, 6)) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c.l; b.addEventListener('click', () => ask(c.q, c.l)); chipsEl.append(b); }
  }
  function ctxInfo() { const s = window.__sfc && window.__sfc.state; return { page, selected: s ? { b: s.sel, room: s.room } : null }; }

  function runAction(a) {
    const onMap = !!(window.__sfc && window.__sfc.openBuilding);
    if (a.t === 'map') {
      if (onMap) { window.__sfc.openBuilding(a.b, a.room ? { floor: window.__sfc.roomFloor?.(a.room) ?? null, room: a.room } : {}); if (innerWidth <= 860) close(); }
      else location.href = a.room ? `/map/#r=${encodeURIComponent(a.room)}` : `/map/#b=${a.b}`;
    } else if (a.t === 'route') {
      if (onMap && window.__sfc.showRoute) { window.__sfc.showRoute(a.from, a.to); if (innerWidth <= 860) close(); }
      else location.href = `/route/#from=${encodeURIComponent(a.from)}&to=${encodeURIComponent(a.to)}`;
    } else if (a.t === 'page') location.href = a.href;
    else if (a.t === 'ext') window.open(a.rooms ? roomUrl(a.rooms) : a.href, '_blank', 'noopener');
  }

  let busy = false;
  async function ask(q, label) {
    q = String(q || '').trim(); if (!q || busy) return;
    busy = true; open();
    addMe(label || q); input.value = '';
    let a;
    try { a = await answer(q, ctxInfo()); } catch (e) { console.error(e); a = { expr: 'fuan', lines: [{ id: 'stock:unknown', t: STOCK.unknown }], detail: '', actions: [] }; }
    setChips(a.chips && a.chips.length ? a.chips : defaultChips());
    // 地図ページなら、答えと同時に地図も動かす(右の詳細パネルは出さず、ねるの吹き出しの邪魔をしない)
    const onMap = !!(window.__sfc && window.__sfc.focusOn);
    if (onMap && a.focus) window.__sfc.focusOn(a.focus);
    const showMini = a.mini && !(onMap && innerWidth > 860); // 広い地図画面では本物の地図が見えているので出さない
    const sp = speak(a.lines, a.expr || 'nikkori');
    if (a.detail || showMini || (a.actions && a.actions.length)) setTimeout(() => addDet(a.detail || '', a.actions, showMini ? a.mini : null), 350);
    await sp; busy = false;
  }

  function open() {
    if (panel.classList.contains('on')) return;
    panel.classList.add('on'); document.body.classList.add('nel-open'); window.dispatchEvent(new Event('nel:open'));
    btnOpen.setAttribute('aria-expanded', 'true'); fab.style.display = 'none';
    scheduleBlink();
    if (!logEl.children.length) {
      setChips(defaultChips()); speak([{ id: 'stock:greet', t: STOCK.greet }], 'nikkori');
      addTip('ねるは声と吹き出しで答えます。下の入力欄か、例のボタンで質問してね。音が出ないときは、音量とマナーモード(iPhone は側面のスイッチ)を確認してね。');
    }
    setTimeout(() => input.focus({ preventScroll: true }), 120);
  }
  function close() { panel.classList.remove('on'); document.body.classList.remove('nel-open'); window.dispatchEvent(new Event('nel:close')); btnOpen.setAttribute('aria-expanded', 'false'); fab.style.display = ''; stopSpeaking(); clearTimeout(blinkT); btnOpen.focus({ preventScroll: true }); }

  btnOpen.addEventListener('click', open);
  $('#nel-close').addEventListener('click', close);
  muteBtn.addEventListener('click', () => { muted = !muted; store.set('sfcmap-nel-mute', muted ? '1' : '0'); renderMute(); if (muted) stopSpeaking(); else speak([{ id: 'stock:voiceOn', t: STOCK.voiceOn }], 'wink'); });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('on')) close(); });

  // 右下のアイコン: 吹き出しはいつも出しておく。アイコンは時々まばたきする(動きを減らす設定では止める)
  $('#nel-hint').addEventListener('click', open);
  const fabImg = $('img', btnOpen); ensureFace('metoji');
  (function fabBlink() {
    setTimeout(() => {
      if (!panel.classList.contains('on') && !isSpeaking && !reduceMotion() && document.visibilityState === 'visible') {
        fabImg.src = `${ASSET}metoji_m0.webp`; setTimeout(() => { fabImg.src = `${ASSET}nikkori_m0.webp`; }, 150);
      }
      fabBlink();
    }, 3200 + Math.random() * 3600);
  })();

  instance = { open, close, ask: (q, l) => ask(q, l), toggle: () => (panel.classList.contains('on') ? close() : open()) };
  window.__nel = instance;
  return instance;
}
