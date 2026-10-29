import { esc, icon, stats, BLD, ROOMS } from './util.mjs';

const bodyHtml = (tab) => `
<div id="stage" aria-label="3Dマップ"></div>
<div id="labels" aria-hidden="true"></div>

<aside id="side" class="glass" data-state="peek" aria-label="検索と一覧">
  <button class="grab" id="grab" aria-label="パネルの高さを切り替え"><span></span></button>
  <div class="search">
    ${icon('search')}
    <input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="教室・建物・施設を検索  例: κ21 / 図書館 / 食堂" aria-label="検索" aria-controls="results" aria-expanded="false">
    <kbd class="kbd">/</kbd>
    <ul id="results" class="results" role="listbox" hidden></ul>
  </div>
  <div class="tabs" role="tablist" aria-label="パネルの切り替え">
    <button role="tab" id="tab-bld" aria-selected="${tab === 'bld'}" data-tab="bld">棟・施設</button>
    <button role="tab" id="tab-room" aria-selected="${tab === 'room'}" data-tab="room">教室</button>
    <button role="tab" id="tab-route" aria-selected="${tab === 'route'}" data-tab="route">経路</button>
  </div>
  <div class="side-body">
    <section id="pane-bld" role="tabpanel" aria-labelledby="tab-bld"${tab === 'bld' ? '' : ' hidden'}></section>
    <section id="pane-room" role="tabpanel" aria-labelledby="tab-room"${tab === 'room' ? '' : ' hidden'}></section>
    <section id="pane-route" role="tabpanel" aria-labelledby="tab-route"${tab === 'route' ? '' : ' hidden'}>
      <button class="tbtn r-close" id="r-close" type="button" aria-label="経路検索を閉じる">${icon('close')}</button>
      <div class="route-form">
        <div class="field"><label for="r-from">出発</label><input id="r-from" class="input" list="r-places" placeholder="出発" autocomplete="off" spellcheck="false" value="慶応大学本館前(バス停)"></div>
        <button class="tbtn r-swap" id="r-swap" type="button" aria-label="出発と到着を入れ替え">${icon('route')}</button>
        <div class="field"><label for="r-to">到着</label><input id="r-to" class="input" list="r-places" placeholder="到着(例: κ21)" autocomplete="off" spellcheck="false"></div>
        <datalist id="r-places"></datalist>
        <button class="btn primary block" id="r-go" type="button" aria-label="経路を調べる"><span class="long">経路を調べる</span><span class="short">検索</span></button>
      </div>
      <div id="r-out" aria-live="polite"></div>
      <div class="chips" id="r-ex" style="margin-top:14px"></div>
      <p class="note r-note" style="margin-top:16px">歩く時間は目安です。階段・坂・混雑・建物の中の通り抜けは含みません。授業の前には、実際に歩いて確かめてください。</p>
    </section>
  </div>
</aside>

<section id="detail" class="glass" data-state="half" hidden aria-label="詳細"></section>

<div class="toolbar glass" role="toolbar" aria-label="表示の操作">
  <button class="tbtn" id="b-zin" aria-label="拡大" title="拡大">${icon('plus')}</button>
  <button class="tbtn" id="b-zout" aria-label="縮小" title="縮小"><svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>
  <i class="sep"></i>
  <button class="tbtn" id="b-rl" aria-label="左に回転" title="左に回転"><svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg></button>
  <button class="tbtn" id="b-rr" aria-label="右に回転" title="右に回転"><svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/></svg></button>
  <button class="tbtn" id="b-view" aria-label="真上から見る" title="真上 / 斜め の切り替え" style="font-weight:800">2D</button>
  <i class="sep"></i>
  <button class="tbtn" id="b-labels" aria-label="名前ラベルの表示" aria-pressed="true" title="ラベル"><svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="M8 11h8"/></svg></button>
  <button class="tbtn" id="b-reset" aria-label="全体表示に戻す" title="全体表示"><svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
</div>

<button id="compass" class="compass glass" aria-label="北を上にする" title="北を上にする">
  <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><g id="needle"><path d="M24 6 30 24H18z" fill="#e5484d"/><path d="M24 42 18 24h12z" fill="var(--ink3)"/></g><circle cx="24" cy="24" r="2.4" fill="var(--panel-solid)" stroke="var(--ink3)"/></svg>
  <span>N</span>
</button>
<div id="hover-tip" class="tip" hidden></div>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
<noscript><p style="position:fixed;inset:80px 16px auto;padding:16px;background:var(--bg-elev);border-radius:16px">3D マップの表示には JavaScript が必要です。<a href="/rooms/">教室一覧</a> や <a href="/life/">施設ガイド</a> は使えます。</p></noscript>`;

export const mapPage = {
  id: 'map', path: '/map/', layout: 'app', script: 'map', css: ['map'], title: 'マップ',
  desc: 'SFC のキャンパスを3Dで。建物をクリックすると階ごとに分解して教室を表示。教室から教室までの徒歩時間も分かります。',
  body: bodyHtml('bld'),
};
export const routePage = {
  id: 'route', path: '/route/', layout: 'app', script: 'map', css: ['map'], title: '経路・徒歩時間',
  desc: 'バス停から教室まで、教室から教室まで、歩いて何分かを3Dの地図に線で表示します。',
  body: bodyHtml('route'),
};
