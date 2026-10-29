import { esc, icon, head, ext, BLD, CATS, symTok } from './util.mjs';
import { LIFE, ACCESS, SOURCES, FACT_YEAR, DATA_DATE, PERIODS } from '../js/content.js';
import { FAQS_FULL as FAQS } from '../js/faq_full.js';

// ---------- 時間割 ----------
export const timetable = {
  id: 'timetable', path: '/timetable/', script: 'timetable', title: '時間割プランナー',
  desc: '授業の時間割に教室を入れると、教室から教室までの徒歩時間と、休み時間に間に合うかの目安が分かります。データはこの端末の中だけに保存されます。',
  toc: [{ id: 'grid', label: '時間割' }, { id: 'day', label: 'この日の動き' }],
  body: `
${head('時間割プランナー', '次の教室まで、<br>間に合う？', '授業と教室を入れると、教室から教室までの徒歩の目安と、休み時間に間に合うかを表示します。')}
<div class="note" style="margin-bottom:18px"><b>データはこの端末の中だけ。</b> 入力した内容はブラウザに保存され、サーバーには送られません。別の端末で見たいときは「リンクをコピー」を使います(リンクに時間割が入ります)。</div>
<section id="grid" aria-label="時間割">
  <div class="btns" style="margin-bottom:12px"><button class="chip" type="button" id="tt-sat" aria-pressed="false">土曜も表示</button><button class="chip" type="button" id="tt-p7" aria-pressed="false">7限も表示</button><button class="chip" type="button" id="tt-copy">リンクをコピー</button><button class="chip" type="button" id="tt-clear">すべて消す</button></div>
  <div class="table-wrap"><table class="t tt" id="tt" style="min-width:640px"></table></div>
  <p class="foot" style="margin-top:10px">マスをクリックして、科目名と教室を入力します。時限の時刻は SFC GUIDE 2026 の表です(${PERIODS.length}限まで。7限は開講の有無が未確認)。</p>
</section>
<section id="day" class="section tight">
  <h2 class="t-title2" style="margin-bottom:12px">この日の動き</h2>
  <div class="chips" id="tt-days" role="tablist" aria-label="曜日"></div>
  <div class="tt-day" style="margin-top:16px">
    <div id="tt-flow" aria-live="polite"></div>
    <div class="card flat" style="padding:10px"><canvas id="tt-map" width="760" height="580" role="img" aria-label="この日の移動を示す地図" style="width:100%;height:auto;border-radius:14px"></canvas><p class="foot" style="margin:8px 6px 2px">線は徒歩ルートの目安です(階段・坂は考慮しません)。</p></div>
  </div>
</section>
<dialog id="tt-dlg" class="modal" aria-labelledby="tt-dlg-t"><form method="dialog" id="tt-form" style="display:grid;gap:14px"><h2 class="t-title3" id="tt-dlg-t">授業を入力</h2>
  <div class="field"><label for="tt-name">科目名(任意)</label><input id="tt-name" class="input" maxlength="30" autocomplete="off"></div>
  <div class="field"><label for="tt-room">教室</label><input id="tt-room" class="input" list="tt-rooms" placeholder="例: κ21" autocomplete="off" spellcheck="false"><datalist id="tt-rooms"></datalist></div>
  <div class="btns" style="justify-content:flex-end"><button class="btn plain" value="cancel" type="submit">キャンセル</button><button class="btn plain" value="clear" type="submit">この授業を消す</button><button class="btn primary" value="save" type="submit">保存</button></div></form></dialog>`,
};

// ---------- 施設ガイド ----------
const cats = [...new Set(LIFE.map((l) => l.cat))];
export const life = {
  id: 'life', path: '/life/', script: 'life', title: '施設ガイド',
  desc: '学食・購買・コンビニ・図書館・窓口・保健など、SFC の施設の場所と営業時間(公式)をまとめました。',
  toc: cats.map((c, i) => ({ id: 'c' + i, label: c })),
  body: `
${head('施設ガイド', '学食から窓口まで、<br>どこにある？', `場所は公式の資料をもとにしています。営業時間は変わるので、リンク先の公式ページを確認してください(${esc(FACT_YEAR)}時点)。`)}
${cats.map((c, i) => `<section id="c${i}" class="section tight"><h2 class="t-title2" style="margin-bottom:14px">${esc(c)}</h2><div class="grid c2">
  ${LIFE.filter((l) => l.cat === c).map((l) => `<article class="card" style="display:grid;gap:10px">
    <div style="display:flex;gap:12px;align-items:center">${l.bld ? symTok(l.bld) : `<span class="sym" style="--c:var(--ink3)">${icon('pin')}</span>`}<div><h3 class="t-headline" style="margin:0">${esc(l.name)}</h3><p class="foot">${esc(l.place)}</p></div></div>
    <p class="sub">${icon('clock').replace('width="22" height="22"', 'width="16" height="16" style="display:inline;vertical-align:-3px"')} ${esc(l.hours)}</p>
    <p style="display:flex;gap:16px;flex-wrap:wrap">${l.bld ? `<a class="btn link sm" href="/map/#b=${l.bld}">地図で見る${icon('chevron')}</a>` : ''}${l.link ? `<a class="btn link sm" href="${l.link.u}" target="_blank" rel="noopener noreferrer">${esc(l.link.l)} ↗</a>` : ''}</p>
  </article>`).join('')}</div></section>`).join('')}
<div class="note warn" style="margin-top:28px"><b>注意:</b> 営業時間・開館時間は学期や曜日で変わります。学生ラウンジ(サブウェイ・鴨池テラス)は、公式ページに「オメガ館の横」とあるため、地図にはピンを置いていません。</div>`,
};

// ---------- アクセス ----------
export const access = {
  id: 'access', path: '/access/', script: 'access', title: 'アクセス',
  desc: '湘南台駅・辻堂駅から SFC へのバス(神奈中バス)の乗り場と所要時間、キャンパス内のバス停をまとめました。',
  toc: [{ id: 'routes', label: '駅からのバス' }, { id: 'stops', label: 'キャンパス内のバス停' }, { id: 'tips', label: '気をつけること' }],
  body: `
${head('アクセス', '駅からは、<br>バスで15〜25分。', '公式の案内に載っている2つの駅からの行き方です。時刻表は変わるので、バス会社の公式サイトで確認してください。')}
<section id="routes" class="section tight"><div class="grid c2">
  ${ACCESS.routes.map((r) => `<article class="card" style="display:grid;gap:12px"><div style="display:flex;align-items:baseline;gap:10px"><h2 class="t-title2" style="margin:0">${esc(r.from)}</h2><span class="badge" style="--c:var(--accent)">${esc(r.min)}</span></div>
    <p class="foot">${esc(r.lines)}</p>
    <dl class="kv"><dt>乗り場</dt><dd><b>${esc(r.stop)}</b></dd><dt>バス</dt><dd>${esc(r.bus)}</dd><dt>メモ</dt><dd>${esc(r.note)}</dd></dl></article>`).join('')}
</div>
<div class="note" style="margin-top:16px">藤沢駅からの直通の案内は、公式資料には見つかりませんでした。バスの路線検索で確認してください。</div></section>
<section id="stops" class="section tight"><h2 class="t-title2" style="margin-bottom:14px">キャンパス内のバス停</h2>
  <div class="grid c2"><div class="card"><h3 class="t-headline" style="margin-bottom:10px">神奈中バス</h3><dl class="kv">${ACCESS.campusStops.map((s) => `<dt><span class="badge" style="--c:var(--ink)">${s.k}</span></dt><dd>${esc(s.n)}</dd>`).join('')}</dl><p class="foot" style="margin-top:10px">行き先が「慶応大学」のバスは大学の中心まで。「中高降車場」は中高側の停留所です。</p></div>
  <div class="card"><h3 class="t-headline" style="margin-bottom:10px">構内巡回バス「鴨池急行 SoKanKan」(無料)</h3><dl class="kv">${ACCESS.sokankan.map((s) => `<dt><span class="badge" style="--c:var(--ink)">${s.k}</span></dt><dd>${esc(s.n)}</dd>`).join('')}</dl></div></div>
  <p style="margin-top:18px"><a class="btn primary" href="/route/">バス停から教室までの歩く時間を調べる</a></p></section>
<section id="tips" class="section tight"><h2 class="t-title2" style="margin-bottom:14px">気をつけること</h2>
  <ul class="prose" style="padding-left:1.2em;list-style:disc;display:grid;gap:8px"><li>バスの行き先を確認する(辻堂駅は「慶応大学」行きと「慶応中高降車場」行きがあります)。</li><li>通学定期の通学証明書は、学内の証明書発行機かコンビニで印刷できます(学内は無料、コンビニは60円)。</li><li>自転車は、防犯登録をして、北門を入って右手の駐輪場へ。構内への自動車の乗り入れは原則禁止です。</li><li>バスは一般の方も乗ります。車内ではマナーに気をつけましょう(公式の注意)。</li></ul>
  <div style="margin-top:18px"><b class="label">公式リンク</b><div class="chips" style="margin-top:8px">${ACCESS.links.map((l) => `<a class="chip" href="${l.u}" target="_blank" rel="noopener noreferrer">${esc(l.l)} ↗</a>`).join('')}</div></div></section>`,
};

// ---------- よくある質問 ----------
const CAT_ORDER = ['通学・入学', '授業・履修', '手続き・お金', '施設', 'キャンパス', 'IT・ネット', '健康・安全', '課外・国際・キャリア', 'SFC について'];
const faqCats = [...new Set(FAQS.map((f) => f.cat))].sort((a, b) => (CAT_ORDER.indexOf(a) + 99) % 99 - (CAT_ORDER.indexOf(b) + 99) % 99);
export const faq = {
  id: 'faq', path: '/faq/', script: 'faq', title: 'よくある質問',
  desc: 'SFC 新入生のよくある質問(通学・授業・施設・手続き)に、公式資料をもとに答えます。',
  toc: faqCats.map((c, i) => ({ id: 'f' + i, label: c })),
  body: `
${head('よくある質問', '最初の「どうしよう」に。', `${esc(FACT_YEAR)}をもとにした答えです。最終的には公式の案内を確認してください。`)}
<div class="field" style="margin-bottom:22px;max-width:520px"><label for="faq-q">質問を絞り込む</label><input id="faq-q" class="input" type="search" placeholder="例: 履修、バス、食堂" autocomplete="off"></div>
<p class="foot" id="faq-none" hidden>当てはまる質問がありません。「ねるに聞く」も試してみてください。</p>
${faqCats.map((c, i) => `<section id="f${i}" class="section tight faq-sec"><h2 class="t-title2" style="margin-bottom:14px">${esc(c)}</h2><div class="acc">
${FAQS.filter((f) => f.cat === c).map((f) => `<details id="${f.id}" data-t="${esc(f.q + ' ' + (f.kw || []).join(' '))}"><summary>${esc(f.q)}<span class="chev">${icon('chevronDown')}</span></summary><div class="ans">${f.a.map((p) => `<p>${esc(p)}</p>`).join('')}
<p class="src">${(f.src || []).map((s) => `${ext(s.u, s.l)}`).join(' / ')}${f.link ? ` ${f.src && f.src.length ? ' · ' : ''}<a href="${f.link.h}">${esc(f.link.l)}</a>` : ''}</p></div></details>`).join('')}
</div></section>`).join('')}
<p style="margin-top:24px"><button class="btn plain" type="button" data-ask="できることを教えて">質問が見つからないときは、ねるに聞く</button></p>`,
};

// ---------- このサイトについて ----------
export const about = {
  id: 'about', path: '/about/', script: 'about', title: 'このサイトについて',
  desc: 'SFC Map の出典・注意・クレジット。非公式サイトであることと、データの正確さについて。',
  toc: [{ id: 'what', label: 'これは何' }, { id: 'sources', label: 'データの出典' }, { id: 'caveats', label: '正確さの注意' }, { id: 'credits', label: 'クレジット' }, { id: 'privacy', label: 'プライバシー' }],
  body: `
${head('このサイトについて', '非公式の、学生による<br>キャンパスガイド。', '慶應義塾・慶應義塾大学とは関係がありません。')}
<section id="what" class="section tight prose"><h2 class="t-title2">これは何</h2><p>SFC の建物と教室を3Dで見て探し、教室から教室までの歩く時間を調べるためのサイトです。新入生が最初の数週間で迷わないことを目的にしています。データの更新日は ${esc(DATA_DATE)} です。</p></section>
<section id="sources" class="section tight"><h2 class="t-title2" style="margin-bottom:14px">データの出典</h2>
  <div class="table-wrap"><table class="t" style="min-width:520px"><thead><tr><th>出典</th><th>使った内容</th></tr></thead><tbody>${SOURCES.map((s) => `<tr><td>${ext(s.u, s.l)}</td><td>${esc(s.n)}</td></tr>`).join('')}</tbody></table></div></section>
<section id="caveats" class="section tight prose"><h2 class="t-title2">正確さの注意</h2><ul>
  <li><b>階は推定です。</b>教室番号の十の位を階とみなしています(κ21 → 2階)。公式の説明は見つかっていません。棟の中の間取り・方角も公式に掲載がないため、示していません。</li>
  <li><b>建物の高さ・階数は目安です。</b>公式図のエレベーター表記などから決めました。樹木は演出で、実際の位置ではありません。</li>
  <li><b>歩く時間は目安です。</b>地図の道から最短を計算し、ふつうは秒速1.25m(約4.5km/h)で歩くとしています。階段・坂・混雑・建物の中の通り抜けは含みません。</li>
  <li><b>ν棟の位置は推測です。</b>公式図では番号だけの表示なので、周辺の IIJ・NTTドコモ・DNP ハウスの一帯として表示しています。</li>
  <li><b>情報は変わります。</b>時限・窓口の時間・営業時間・推奨スペックは、${esc(FACT_YEAR)}時点です。必ず公式の最新情報を確認してください。</li>
  <li><b>ねるの答えは、このサイトのデータだけから作っています。</b>外部の AI には質問を送りません。分からないことは「分からない」と答えます。</li></ul></section>
<section id="credits" class="section tight prose"><h2 class="t-title2">クレジット</h2><ul>
  <li>案内キャラクター「ねる」: サイト運営者が用意したイラスト素材。</li>
  <li>声: <b>AivisSpeech(話者: まお)</b>の合成音声(Aivis Common Model License 1.0)。人間の声ではなく、公式の音声でもありません。</li>
  <li>3D 表示: ${ext('https://threejs.org/', 'three.js')}(MIT License)。</li>
  <li>地図の形: 慶應義塾の公式キャンパスマップ・バリアフリーマップをもとに、色分けして輪郭を取り出して作図しました。</li></ul></section>
<section id="privacy" class="section tight prose"><h2 class="t-title2">プライバシー</h2><p>このサイトは、アカウント登録も、アクセス解析も、広告も使いません。チェックリストや時間割は、この端末のブラウザ(localStorage)にだけ保存され、サーバーには送られません。ねるへの質問も、ブラウザの中で処理され、外部には送られません。</p></section>
<section class="section tight"><div class="note">間違いを見つけたときは、公式の情報が正しいです。修正の連絡先は、運営者(学生)に直接お伝えください。</div></section>`,
};
