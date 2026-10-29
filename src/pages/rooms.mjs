import { esc, icon, head, ROOMS, BLD, CATS, ROOM_SZ } from './util.mjs';
import { roomPath } from '../js/slug.js';

const RB = ['kappa', 'epsilon', 'iota', 'omicron', 'lambda', 'omega', 'theta', 'tau'];
const row = (r) => `<tr class="row" data-code="${esc(r.c)}" data-page="${roomPath(r)}" data-b="${r.b}" data-sz="${r.sz}" data-n="${r.n}" data-k4="${r.k4 ? 1 : 0}" data-ac="${r.ac ? 1 : 0}" tabindex="0">
  <td><a href="${roomPath(r)}" style="font:700 18px var(--serif);color:var(--ink)">${esc(r.c)}</a> <a class="foot" href="/map/#r=${encodeURIComponent(r.c)}" aria-label="${esc(r.c)}を3Dマップで見る">地図</a></td>
  <td><span style="display:inline-flex;align-items:center;gap:8px"><span class="sym sm" style="--c:${CATS[BLD[r.b].cat].color}">${esc(BLD[r.b].sym)}</span>${esc(BLD[r.b].ja)}</span></td>
  <td>${r.f ? r.f + '階' : '—'}</td>
  <td><span class="badge" style="--c:${ROOM_SZ[r.sz].color}">${esc(ROOM_SZ[r.sz].ja)}</span>${r.sub ? ` <span class="foot">${esc(r.sub)}</span>` : ''}</td>
  <td style="font-variant-numeric:tabular-nums;font-weight:700">${r.n}<span class="foot">人</span></td>
  <td>${esc(r.desk.join(' / ') || '—')}</td>
  <td>${r.k4 ? '<span class="badge soft">4K</span> ' : ''}${r.ac ? '<span class="badge soft">AL</span>' : ''}</td>
</tr>`;

export default {
  id: 'rooms', path: '/rooms/', script: 'rooms', title: '教室を探す',
  desc: `SFC の教室${ROOMS.length}室を、棟・大きさ・定員・4K・アクティブラーニングで絞り込み。教室番号から場所を3Dマップで確認できます。`,
  toc: [{ id: 'filter', label: '絞り込み' }, { id: 'list', label: '一覧' }, { id: 'about', label: 'この一覧について' }],
  body: `
${head('教室を探す', '教室を、条件で探す。', `SFC の教室 ${ROOMS.length} 室の定員・大きさ・机の種類・設備です。教室番号をクリックすると、その教室のページ(場所の地図・バス停からの徒歩時間)に進みます。`)}
<section id="filter" aria-label="絞り込み">
  <div class="card flat" style="display:grid;gap:18px">
    <div><div class="label" style="margin-bottom:8px">棟</div><div class="chips" id="f-b">${RB.map((b) => `<button class="chip" type="button" data-b="${b}" aria-pressed="false"><i class="dot" style="--c:${CATS[BLD[b].cat].color}"></i>${esc(BLD[b].sym)} ${esc(BLD[b].ja)}</button>`).join('')}</div></div>
    <div><div class="label" style="margin-bottom:8px">大きさ</div><div class="chips" id="f-sz">${Object.entries(ROOM_SZ).map(([k, v]) => `<button class="chip" type="button" data-sz="${k}" aria-pressed="false"><i class="dot" style="--c:${v.color}"></i>${esc(v.ja)}</button>`).join('')}</div></div>
    <div class="grid c2" style="align-items:end">
      <div class="field"><label for="f-min">定員(人以上)</label><div style="display:flex;align-items:center;gap:14px"><input id="f-min" type="range" min="0" max="400" step="10" value="0" style="flex:1;accent-color:var(--accent);height:32px"><output id="f-out" style="min-width:5.5em;text-align:right;font-weight:800">指定なし</output></div></div>
      <div class="chips"><button class="chip" type="button" id="f-k4" aria-pressed="false">4K ディスプレイ</button><button class="chip" type="button" id="f-ac" aria-pressed="false">アクティブラーニング</button><button class="chip" type="button" id="f-reset">リセット</button></div>
    </div>
  </div>
</section>
<section id="list" style="margin-top:28px">
  <p class="count" style="margin:0 0 10px" aria-live="polite"><b id="f-count" style="font-size:24px;font-weight:800">${ROOMS.length}</b> 室が見つかりました</p>
  <div class="table-wrap"><table class="t" id="rt">
    <thead><tr><th data-sort="code">教室</th><th data-sort="b">棟</th><th>階(推定)</th><th data-sort="sz">大きさ</th><th data-sort="n" aria-sort="descending">定員</th><th>机・椅子</th><th>設備</th></tr></thead>
    <tbody>${[...ROOMS].sort((a, b) => b.n - a.n).map(row).join('')}</tbody>
  </table></div>
  <p class="foot" style="margin-top:12px">AL = アクティブラーニング対応。表の見出しをクリックすると並び替えられます。</p>
</section>
<section id="about" class="section tight">
  <div class="note"><b>この一覧について:</b> 定員・机・設備・改修年は、SFC Classroom(公式)の各教室ページをもとにしています。階は教室番号の十の位からの推定で、公式の説明ではありません。授業で使う教室や最新の改修は変わるので、履修・利用の前に公式情報を確認してください。 <a href="https://classroom.sfc.keio.ac.jp/" target="_blank" rel="noopener noreferrer">SFC Classroom ↗</a></div>
</section>`,
};
