import { esc, icon, head, ext } from './util.mjs';
import { GUIDE_WEEK, GUIDE_CHECK, PERIODS, PERIOD_NOTE, GLOSSARY, SOURCES, FACT_YEAR } from '../js/content.js';

export default {
  id: 'guide', path: '/guide/', script: 'guide', title: '新入生ガイド',
  desc: 'SFC 新入生が最初にやること、教室番号の読み方、授業の時間、SFC のことばを、公式資料をもとにまとめました。',
  toc: [{ id: 'week', label: '最初にやること' }, { id: 'check', label: 'チェックリスト' }, { id: 'code', label: '教室の番号' }, { id: 'periods', label: '授業の時間' }, { id: 'words', label: 'SFC のことば' }, { id: 'links', label: '公式リンク' }],
  body: `
${head('新入生ガイド', '入学前から、<br>最初の1週間まで。', `${esc(FACT_YEAR)}をもとにまとめました。日程や手順は年度ごとに変わるので、大学から届く案内が最優先です。`)}

<section id="week" class="section tight">
  <h2 class="t-title2" style="margin-bottom:6px">最初にやること</h2>
  <p class="sub" style="margin-bottom:18px">順番に意味があるので、上から順に。</p>
  <ol class="steps">
    ${GUIDE_WEEK.map((s) => `<li class="step" id="${s.id}"><div><h3>${esc(s.title)}</h3><p class="sub">${esc(s.body)}</p><p style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap">${s.faq ? `<a class="btn link sm" href="/faq/#${s.faq}">くわしく${icon('chevron')}</a>` : ''}${s.suggest ? `<a class="btn link sm" href="/route/">経路・徒歩時間${icon('chevron')}</a>` : ''}<button class="btn link sm" type="button" data-ask="${esc(s.title)}">ねるに聞く</button></p></div></li>`).join('')}
  </ol>
</section>

<section id="check" class="section tight">
  <h2 class="t-title2" style="margin-bottom:6px">チェックリスト</h2>
  <p class="sub" style="margin-bottom:18px">チェックはこの端末のブラウザにだけ保存されます(サーバーには送りません)。</p>
  <div class="card" id="checklist">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div style="flex:1;height:10px;border-radius:99px;background:var(--panel-2);overflow:hidden"><div id="ck-bar" style="height:100%;width:0;background:var(--accent);border-radius:99px;transition:width .4s var(--ease)"></div></div><b id="ck-n" style="font-variant-numeric:tabular-nums">0 / 0</b></div>
    ${GUIDE_CHECK.map((g) => `<fieldset style="border:0;padding:0;margin:0 0 14px"><legend class="label" style="padding:0 0 6px">${esc(g.group)}</legend>${g.items.map((i) => `<label class="ck"><input type="checkbox" data-ck="${i.id}"><span>${esc(i.t)}</span></label>`).join('')}</fieldset>`).join('')}
    <button class="btn plain sm" type="button" id="ck-reset">すべて外す</button>
  </div>
</section>

<section id="code" class="section tight">
  <h2 class="t-title2" style="margin-bottom:6px">教室の番号の読み方</h2>
  <div class="prose"><p>SFC の教室は、<b>ギリシャ文字の建物名</b>と<b>2桁の数字</b>で呼ばれます。このサイトでは、数字の十の位を「階」として扱っています(κ21 → κ館の2階)。ただし、これは公式教室一覧の並びから考えた<b>推測</b>で、公式の説明は見つかっていません。</p></div>
  <div class="grid c3" style="margin-top:14px" id="gd-decode">
    <div class="field"><label for="gd-in">教室番号を入れてみる</label><input id="gd-in" class="input" value="λ12" spellcheck="false" autocomplete="off" maxlength="6"></div>
    <div class="card flat" id="gd-out" aria-live="polite" style="grid-column: span 2"></div>
  </div>
</section>

<section id="periods" class="section tight">
  <h2 class="t-title2" style="margin-bottom:6px">授業の時間</h2>
  <div class="table-wrap" style="margin-top:14px"><table class="t" style="min-width:420px"><thead><tr><th>時限</th><th>時間</th><th>次までの休み</th></tr></thead>
    <tbody>${PERIODS.map((p) => `<tr><td><b>${p.n}限</b></td><td style="font-variant-numeric:tabular-nums">${p.s} 〜 ${p.e}</td><td>${p.brk ? p.brk + '分' + (p.n === 2 ? '(昼)' : '') : '—'}</td></tr>`).join('')}</tbody></table></div>
  <p class="foot" style="margin-top:10px">${esc(PERIOD_NOTE)} 出典: ${ext('https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf', 'SFC GUIDE 2026')}</p>
</section>

<section id="words" class="section tight">
  <h2 class="t-title2" style="margin-bottom:6px">SFC のことば</h2>
  <p class="sub" style="margin-bottom:14px">説明は SFC GUIDE 2026 をもとにした要約です。</p>
  <div class="acc">
    ${GLOSSARY.map((g) => `<details><summary>${esc(g.term)}<span class="chev">${icon('chevronDown')}</span></summary><div class="ans"><p>${esc(g.def)}</p></div></details>`).join('')}
  </div>
</section>

<section id="links" class="section tight">
  <h2 class="t-title2" style="margin-bottom:14px">公式リンク</h2>
  <div class="grid c2">
    ${SOURCES.slice(0, 6).map((s) => `<a class="card flat" href="${s.u}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;display:block"><b>${esc(s.l)} ${icon('external').replace('width="22" height="22"', 'width="14" height="14"')}</b><p class="foot" style="margin-top:4px">${esc(s.n)}</p></a>`).join('')}
  </div>
  <div class="note warn" style="margin-top:18px"><b>確認できなかったこと:</b> 2027年4月入学向けの SFC(総合政策・環境情報)公式案内ページは見つかりませんでした。日程や手続きは、入学手続後に大学から届く案内を確認してください。keio.jp 認証が必要なページ(K-Support など)の中身は、このサイトでは確認していません。</div>
</section>`,
};
