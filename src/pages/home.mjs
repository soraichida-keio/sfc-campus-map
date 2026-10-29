import { esc, icon, stats, BLD, CATS } from './util.mjs';
import { GUIDE_WEEK } from '../js/content.js';

const tile = (href, ic, title, text, go, cls = '') => `
  <a class="tile reveal ${cls}" href="${href}">
    <span class="ti">${icon(ic)}</span>
    <span><h3>${title}</h3><p>${text}</p></span>
    <span class="go">${go}${icon('chevron')}</span>
  </a>`;

const place = (id, label) => `<a class="chip" href="/map/#b=${id}"><i class="dot" style="--c:${CATS[BLD[id].cat].color}"></i>${esc(label)}</a>`;

export default {
  id: 'home', path: '/', layout: 'wide', script: 'home', title: 'ホーム',
  desc: 'SFC の建物と教室を3Dで探せる、新入生のための非公式キャンパスガイド。教室から教室まで歩いて何分かも分かります。',
  body: `
<section class="hero" id="top">
  <div class="hero-stage" id="hero-stage" aria-hidden="true"></div>
  <div class="hero-scrim" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <p class="eyebrow">SFC キャンパスマップ</p>
    <h1 class="t-hero">SFCで、<br>迷わない。</h1>
    <p class="lead">建物も、教室も、バス停からの道のりも。3Dのキャンパスを触りながら、はじめての毎日を準備しよう。</p>
    <div class="btns">
      <a class="btn primary" href="/map/">マップを開く</a>
      <button class="btn plain" type="button" data-ask="できることを教えて">${icon('sparkle')}ねるに聞く</button>
      <a class="btn link" href="/guide/">新入生ガイドを読む${icon('chevron')}</a>
    </div>
    <div class="hero-stats" aria-label="収録内容">
      <span class="stat"><b>${stats.rooms}</b>教室</span>
      <span class="stat"><b>${stats.buildings}</b>建物・施設</span>
      <span class="stat"><b>3D</b>徒歩ルート付き</span>
    </div>
  </div>
</section>

<section class="section" id="features">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">できること</p><h2 class="t-title2">キャンパスの「わからない」を、ひとつずつ。</h2></div>
    <div class="bento">
      <a class="tile dark w4 reveal" href="/map/">
        <span class="ti">${icon('cube')}</span>
        <span><h3>3D マップ</h3><p>建物をクリックすると、階ごとに分解して教室を表示。真上からの表示にも切り替えられます。</p></span>
        <span style="display:flex;gap:8px;flex-wrap:wrap" aria-hidden="true">${['kappa', 'epsilon', 'iota', 'omicron', 'lambda', 'omega', 'theta', 'sigma'].map((id) => `<span class="sym" style="--c:${CATS[BLD[id].cat].color}">${esc(BLD[id].sym)}</span>`).join('')}</span>
        <span class="go">マップを開く${icon('chevron')}</span>
      </a>
      ${tile('/rooms/', 'rooms', '教室を探す', `${stats.rooms}教室を、定員・大きさ・4K で絞り込み。`, '教室一覧へ', 'half')}
      ${tile('/route/', 'route', '経路・徒歩時間', 'バス停から教室まで、教室から教室まで、歩いて何分？', '経路を調べる', 'half')}
      ${tile('/timetable/', 'timetable', '時間割プランナー', '次の授業に間に合うかを、移動時間つきで確認。', '時間割をつくる', 'half')}
      ${tile('/guide/', 'guide', '新入生ガイド', '最初の1週間でやることと、SFC のことば。', 'ガイドを読む', 'half')}
      <button class="tile nel-tile reveal" type="button" data-ask="できることを教えて">
        <img src="/nel/nikkori_m2.webp" width="160" height="160" alt="" loading="lazy" decoding="async">
        <span style="display:grid;gap:14px;max-width:34em"><span class="ti">${icon('sparkle')}</span><span><h3>ねるに聞く</h3><p>「κ21はどこ？」「バス停から Ω11 まで何分？」と話しかけると、声と吹き出しで答えて、地図も動かします。</p></span><span class="go">話しかける${icon('chevron')}</span></span>
      </button>
    </div>
  </div>
</section>

<section class="section" id="decoder" style="background:var(--bg-sunk)">
  <div class="wrap decoder">
    <div class="reveal">
      <p class="eyebrow">教室の番号</p>
      <h2 class="t-title2">κ21 は、<br>どこの教室？</h2>
      <p class="sub" style="margin-top:14px">SFC の教室は「ギリシャ文字の建物名 + 2桁の数字」。ためしに入力してみてください。</p>
      <div class="field" style="margin-top:20px;max-width:360px">
        <label for="deco-in">教室番号</label>
        <input id="deco-in" class="input" type="text" value="κ21" inputmode="text" autocomplete="off" spellcheck="false" aria-describedby="deco-note" maxlength="6">
      </div>
      <div class="chips" style="margin-top:12px" role="group" aria-label="例">${['κ21', 'Ω11', 'λ12', 'ο17', 'τ31', 'θ館'].map((c) => `<button class="chip" type="button" data-deco="${c}">${c}</button>`).join('')}</div>
    </div>
    <div class="reveal">
      <div class="deco-out" aria-live="polite">
        <div class="deco-cell"><div class="big" id="deco-b">κ</div><small>建物</small></div>
        <div class="deco-cell"><div class="big" id="deco-f">2</div><small>階(推定)</small></div>
        <div class="deco-cell"><div class="big" id="deco-n">21</div><small>教室</small></div>
      </div>
      <p class="deco-note sub" id="deco-note"></p>
      <div class="btns" style="margin-top:14px"><a class="btn primary sm" id="deco-go" href="/map/#r=%CE%BA21">地図で見る</a><a class="btn link sm" href="/faq/#roomcode">この読み方について${icon('chevron')}</a></div>
    </div>
  </div>
</section>

<section class="section" id="week">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">新入生へ</p><h2 class="t-title2">最初にやること。</h2><p class="sub">日程は年度ごとに変わります。ここでは、順番と理由だけをまとめました。</p></div>
    <ol class="steps">
      ${GUIDE_WEEK.slice(0, 4).map((s) => `<li class="step reveal"><div><h3>${esc(s.title)}</h3><p class="sub">${esc(s.body)}</p></div></li>`).join('')}
    </ol>
    <p style="margin-top:22px"><a class="btn plain" href="/guide/">すべてのステップとチェックリスト</a></p>
  </div>
</section>

<section class="section" id="nel-section" style="background:var(--bg-sunk)">
  <div class="wrap nel-intro">
    <div class="reveal"><img src="/nel/nikkori_m1.webp" width="300" height="300" alt="案内キャラクターのねる" style="width:100%;height:auto;border-radius:32px;background:var(--bg-elev);box-shadow:var(--shadow)" loading="lazy" decoding="async"></div>
    <div class="reveal">
      <p class="eyebrow">案内キャラ</p>
      <h2 class="t-title2">案内役の「ねる」が、<br>声で答えます。</h2>
      <p class="sub" style="margin:14px 0 20px;max-width:34em">教室の場所、食堂、図書館、バス停からの歩く時間まで。質問すると、口を動かして話しながら、地図も動かしてくれます。答えはこのサイトのデータだけから作るので、分からないことは分からないと言います。</p>
      <div class="chips">
        <button class="chip" type="button" data-ask="バス停からκ21">バス停からκ21まで歩くと？</button>
        <button class="chip" type="button" data-ask="食堂はどこ？">食堂はどこ？</button>
        <button class="chip" type="button" data-ask="履修登録はいつ？">履修登録はいつ？</button>
      </div>
      <p class="foot" style="margin-top:14px">ボタンを押すと声が出ます(ミュートもできます)。</p>
    </div>
  </div>
</section>

<section class="section tight" id="places">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">よく行く場所</p><h2 class="t-title2">まずはここから。</h2></div>
    <div class="chips reveal">
      ${place('sigma', '学食・購買・コンビニ(シグマ館)')}${place('mu', '図書館(ミュー館)')}${place('alpha', '窓口・保健(アルファ館)')}${place('omega', '大教室(オメガ館)')}${place('theta', 'ホール(シータ館)')}${place('gamma', '体育館(ガンマ館)')}
    </div>
    <p class="foot" style="margin-top:18px">これは学生による非公式のサイトです。慶應義塾とは関係ありません。<a href="/about/">出典と注意</a></p>
  </div>
</section>`,
};
