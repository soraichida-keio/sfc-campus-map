// ねるの頭脳。質問を読み取り、答え(吹き出し・声・表情・ボタン)を作る。
// 外部のAIには送らない。サイトの中のデータ(建物・教室・よくある質問)だけから答える決まりベースの仕組み。
// 答えられないことは「公式で確認してね」と言う(推測で埋めない)。
import { norm, bIds, roomsByB, roomByCode, ROOMS, searchBuildings, searchRooms } from '../search.js';
import { BLD, ROOM_SZ, CATS } from '../data.js';
import { FAQS, PERIODS, GLOSSARY } from '../content.js';
import { STOCK, roomSay, buildingSay, faqSay, routeSay, ROUTE_MIN_MAX } from '../lines.js';
import { roomPath, buildingPath } from '../slug.js';
import { POIS, loadRouter, resolvePlace, routeBetween, fmtMin, WALK_MPS, FAST_MPS } from '../route.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const line = (id, t) => ({ id, t });
const normK = (x) => String(x).normalize('NFKC').toLowerCase().replace(/[\s・、。,.\-_/／]+/g, '');

// ---------- 場所の読み取り ----------
const KANA_BLD = { かっぱ: 'κ', いぷしろん: 'ε', えぷしろん: 'ε', いおた: 'ι', おみくろん: 'ο', らむだ: 'λ', おめが: 'ω', しーた: 'θ', たう: 'τ' };
const ASCII = { k: 'κ', e: 'ε', i: 'ι', o: 'ο', l: 'λ', w: 'ω', t: 'τ', c: 'θ' };
const GREEK_CLASS = 'κεινοωλτθ';
const roomRe = new RegExp(`([${GREEK_CLASS}]|[keiowlt]|${Object.keys(KANA_BLD).join('|')})(?:かん)?[\\s-]*([0-9]{2})`, 'g');

const FACILITY = [
  { re: /食堂|学食|ごはん|ご飯|ランチ|お昼|おひる|生協|購買|コンビニ|ろーそん|ローソン|売店|atm/, key: 'sigma', label: '学食・購買・コンビニ' },
  { re: /図書館|としょかん|めでぃあせんたー|メディアセンター|ライブラリ/, key: 'mu', label: '図書館' },
  { re: /窓口|まどぐち|事務|学事|証明書|発行機|本館|ほんかん/, key: 'alpha', label: '窓口(本館)' },
  { re: /保健|診療|体調|病院|相談室|ほけん/, key: 'alpha', label: '保健・診療' },
  { re: /体育館|たいいくかん|ジム/, key: 'gamma', label: '体育館' },
  { re: /大学院/, key: 'tau', label: '大学院棟' },
  { re: /ほーる|ホール/, key: 'theta', label: 'ホール' },
  { re: /バス停|ばすてい|バス乗り場/, key: 'poi:bus0', label: 'バス停' },
  { re: /北門|正門|せいもん/, key: 'poi:gate3', label: '北門' },
  { re: /西門/, key: 'poi:gate0', label: '西門' },
  { re: /南門/, key: 'poi:gate1', label: '南門' },
  { re: /東門/, key: 'poi:gate2', label: '東門' },
];

function placeAliases() {
  const m = [];
  for (const id of bIds) {
    const b = BLD[id];
    const names = new Set([norm(b.ja)]);
    const ja2 = b.ja.replace(/館$/, '').replace(/ハウス$/, '').replace(/[・\s]/g, '');
    if (ja2.length >= 2) names.add(norm(ja2));
    for (const k of b.kana.split(/\s+/)) if (k.length >= 3) names.add(norm(k));
    m.push({ id, names: [...names].filter((x) => x.length >= 2).sort((a, c) => c.length - a.length) });
  }
  return m;
}
const ALIASES = placeAliases();

export function parsePlaces(q) {
  const s = norm(q), sk = normK(q);
  const found = [];
  const used = [];
  const take = (idx, len) => { for (const [a, b] of used) if (idx < b && idx + len > a) return false; used.push([idx, idx + len]); return true; };
  // 教室コード
  for (const m of s.matchAll(roomRe)) {
    let g = m[1]; g = KANA_BLD[g] || ASCII[g] || g; if (g === 'ω') g = 'Ω';
    const code = (g === 'Ω' ? 'Ω' : g) + m[2];
    const r = roomByCode[code] || roomByCode[code.replace('ω', 'Ω')];
    if (r && take(m.index, m[0].length)) found.push({ kind: 'room', key: r.c, idx: m.index, label: r.c });
  }
  if (/θ館|しーたかん|しーた館/.test(s) && roomByCode['θ館']) { const i = s.search(/θ館|しーたかん|しーた館/); if (take(i, 2)) found.push({ kind: 'room', key: 'θ館', idx: i, label: 'シータ館' }); }
  // 建物名
  for (const a of ALIASES) {
    for (const n of a.names) {
      const i = s.indexOf(n);
      if (i >= 0 && take(i, n.length)) { found.push({ kind: 'bld', key: a.id, idx: i, label: BLD[a.id].ja }); break; }
    }
  }
  // 施設ことば
  for (const f of FACILITY) {
    const mm = s.match(f.re) || sk.match(f.re);
    if (mm && take(mm.index, mm[0].length)) found.push({ kind: f.key.startsWith('poi:') ? 'poi' : 'bld', key: f.key, idx: mm.index, label: f.key.startsWith('poi:') ? POIS[f.key].label : BLD[f.key].ja, via: f.label });
  }
  found.sort((a, b) => a.idx - b.idx);
  return found;
}

const ROUTE_WORDS = /行き方|いきかた|経路|けいろ|ルート|徒歩|歩い|何分|なんぷん|どうやって|どう行|どうい|道|みち|移動|間に合|まで|から行/;
const INFO_WORDS = /どこ|どの|場所|ばしょ|何階|なんかい|について|教えて|おしえて|とは|ある\?|あるの|何|なに|どんな/;

// ---------- 答えの部品 ----------
const act = {
  map: (b, room) => ({ t: 'map', b, room, label: '地図で見る' }),
  page: (h, label) => ({ t: 'page', href: h, label }),
  route: (from, to) => ({ t: 'route', from, to, label: '地図に線を出す' }),
  ext: (u, label) => ({ t: 'ext', href: u, label }),
};

function roomDetail(r) {
  const b = BLD[r.b]; const sz = ROOM_SZ[r.sz];
  const rows = [
    ['建物', `${esc(b.ja)}(${esc(b.sym)})`], ['階', r.f ? `${r.f}階(番号からの推定)` : '—'], ['定員', `${r.n}人`],
    ['種類', esc(sz.ja + (r.sub ? `・${r.sub}` : '') + (r.k4 ? '・4K対応' : ''))],
  ];
  if (r.desk.length || r.ac) rows.push(['机・椅子', esc([...r.desk, r.ac ? 'アクティブラーニング対応' : ''].filter(Boolean).join(' / '))]);
  if (r.rn) rows.push(['改修', esc(r.rn)]);
  return `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function answerRoom(r) {
  return { expr: r.sz === 'large' || r.sz === 'hall' ? 'odoroki' : 'nikkori', lines: [line(`room:${r.c}`, roomSay(r))], detail: roomDetail(r),
    actions: [act.map(r.b, r.c), act.page(roomPath(r), '教室のページ'), { t: 'ext', href: `https://classroom.sfc.keio.ac.jp/`, label: '公式の教室ページ', rooms: r.c }], focus: { b: r.b, room: r.c },
    mini: { highlight: [r.b], pins: [{ b: r.b, text: r.f ? `${r.c}(${r.f}階)` : r.c }] },
    chips: [{ q: `バス停から${r.c}`, l: 'バス停から歩く' }, { q: `${BLD[r.b].ja}について`, l: `${BLD[r.b].ja}は？` }] };
}
function answerBuilding(id, via) {
  const b = BLD[id]; const rs = roomsByB[id] || [];
  const facs = b.fac.length ? `<ul>${b.fac.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
  const rooms = rs.length ? `<p>教室は ${rs.length}室(${esc(rs[0].c)}〜${esc(rs[rs.length - 1].c)})です。</p>` : '';
  return { expr: 'nikkori', lines: [line(`b:${id}`, buildingSay(id))], detail: `<p>${esc(b.desc)}</p>${facs}${rooms}`,
    actions: [act.map(id), act.page(buildingPath(id), '建物のページ'), ...(rs.length ? [act.page('/rooms/', '教室を探す')] : [])], focus: { b: id },
    mini: { highlight: [id], pins: [{ b: id, text: b.ja }] },
    chips: [{ q: `バス停から${b.ja}`, l: 'バス停から歩く' }] };
}
// 追加分の FAQ は質問とキーワードだけをブラウザに入れてあり、答えの全文は /faq-full.json から必要なときに取る
let FULL = null;
async function hydrate(f) {
  if (f.a && f.say_alt) return f;
  try {
    FULL ||= fetch('/faq-full.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const d = (await FULL)[f.id]; if (!d) return f.a ? f : null;
    Object.assign(f, d); f.say_alt ||= []; return f;
  } catch { FULL = null; return f.a ? f : null; }
}
const faqOffline = (f) => ({ expr: 'fuan', lines: [line('stock:faqLoad', STOCK.faqLoad)], detail: '<p>詳しい答えを読み込めませんでした。<a href="/faq/#' + esc(f.id) + '">よくある質問のページ</a>で読めます。</p>', actions: [act.page('/faq/#' + f.id, 'よくある質問で見る')] });
// 同じ質問を続けて聞かれたら、言い回しの違う答えに切り替える(声はどれも事前に録音してある)
const SAYN = new Map();
let LAST = null; // 直前に答えた FAQ(「もっと詳しく」「ほかには？」用)
const relChips = (f, skip = []) => (f.rel || []).map((id) => FAQS.find((x) => x.id === id)).filter((x) => x && !skip.includes(x.id)).map(chipOf);
function answerFaq(f) {
  const body = f.a.map((p) => `<p>${esc(p)}</p>`).join('');
  const src = f.src && f.src.length ? `<p class="foot">出典: ${f.src.map((s) => `<a href="${s.u}" target="_blank" rel="noopener noreferrer">${esc(s.l)}</a>`).join(' / ')}</p>` : '';
  const actions = [];
  if (f.bld) actions.push(act.map(f.bld));
  if (f.link) actions.push(act.page(f.link.h, f.link.l));
  const pool = [faqSay(f), ...(f.say_alt || [])], n = SAYN.get(f.id) || 0; SAYN.set(f.id, n + 1); LAST = f;
  const k = n % pool.length;
  return { expr: f.expr || 'nikkori', lines: [line(k ? `faq:${f.id}:${k}` : `faq:${f.id}`, pool[k])], detail: body + src, actions, focus: f.bld ? { b: f.bld } : null,
    chips: relChips(f).slice(0, 3),
    mini: f.bld ? { highlight: [f.bld], pins: [{ b: f.bld, text: BLD[f.bld].ja }] } : null };
}

async function answerRoute(fromP, toP) {
  await loadRouter();
  const rooms = roomByCode;
  const from = resolvePlace(fromP.key, rooms), to = resolvePlace(toP.key, rooms);
  if (!from || !to) return null;
  const r = routeBetween(from, to);
  if (r && r.same) return { expr: 'komari', lines: [line('stock:sameB', STOCK.sameB)], detail: `<p>${esc(from.label)} と ${esc(to.label)} は同じ建物です。階の移動(階段・エレベーター)だけです。</p>`, actions: [act.map(from.b)], focus: { b: from.b } };
  if (!r) return { expr: 'fuan', lines: [line('stock:noRoute', STOCK.noRoute)], detail: '<p>経路が見つかりませんでした。</p>', actions: [], focus: null };
  const min = Math.min(ROUTE_MIN_MAX, Math.max(1, Math.round(r.sec / 60)));
  const fast = Math.max(1, Math.round(r.secFast / 60));
  const detail = `<p><b>${esc(from.label)} → ${esc(to.label)}</b></p>
    <dl class="kv"><dt>距離</dt><dd>約${Math.round(r.meters)}m</dd><dt>ふつうに歩く</dt><dd>${fmtMin(r.sec)}</dd><dt>急ぎ足</dt><dd>約${fast}分</dd></dl>
    <p class="foot">目安です。階段・坂・混雑は含みません${r.climbSec ? `(上り下り${Math.round(r.climbSec / 60 * 10) / 10}分ぶんを加算)` : ''}。実際に歩いて確かめてね。</p>`;
  return { expr: min >= 12 ? 'komari' : 'nikkori', lines: [line(`route:${min}`, routeSay(min))], detail, actions: [act.route(fromP.key, toP.key), act.page(`/route/#from=${encodeURIComponent(fromP.key)}&to=${encodeURIComponent(toP.key)}`, '経路ページで見る')], focus: { route: [fromP.key, toP.key] },
    mini: { highlight: [from.b, to.b].filter(Boolean), routes: [r.path], markers: [{ ...(from.pt ? { pt: from.pt } : { b: from.b }), label: 'A', fill: '#2fbf71' }, { ...(to.pt ? { pt: to.pt } : { b: to.b }), label: 'B', fill: '#e5484d' }], pins: [] } };
}

function listRooms(list, introId, introText) {
  const rows = list.map((r) => `<li><b>${esc(r.c)}</b> ${esc(BLD[r.b].ja)} ${r.n}人(${esc(ROOM_SZ[r.sz].ja)}${r.k4 ? '・4K' : ''})</li>`).join('');
  return { expr: 'nikkori', lines: [line(introId, introText)], detail: `<ul>${rows}</ul>`, actions: [act.page('/rooms/', '教室を探す')], chips: list.slice(0, 3).map((r) => ({ q: r.c, l: r.c })) };
}

function currentPeriod(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  for (const p of PERIODS) { const [sh, sm] = p.s.split(':').map(Number), [eh, em] = p.e.split(':').map(Number); if (m >= sh * 60 + sm && m < eh * 60 + em) return p; }
  return null;
}

// FAQ の採点: キーワード一致(長いほど高得点)+ 質問文との2文字一致(めずらしい2文字ほど重く、「ですか」のような誰にでも出る2文字はほぼ0)
const bg = (n) => { const o = []; for (let i = 0; i < n.length - 1; i++) o.push(n.slice(i, i + 2)); return o; };
const FILLER = /いつから|いつまで|いつ|どこ|どう|どの|どれ|なに|何|ですか|ますか|ください|教えて|おしえて|について|とは|ですが|できる|できます|したいです|したい|したくて/g; // 誰の質問にも出る言い回しは2文字一致に数えない(質問側・FAQ 側とも)
const FAQ_N = FAQS.length;
// 各 FAQ の「質問のいろいろな言い方」= 元の質問 + 言い換え(faq_meta.json)。それぞれ2文字の集合にしておく
const FAQ_V = FAQS.map((f) => [f.q, ...(f.alt || [])].map((t) => new Set(bg(norm(t).replace(FILLER, '')))).filter((g) => g.size));
const FAQ_U = FAQ_V.map((vs) => { const u = new Set(); for (const g of vs) for (const x of g) u.add(x); return u; });
const FAQ_DF = new Map();
for (const u of FAQ_U) for (const x of u) FAQ_DF.set(x, (FAQ_DF.get(x) || 0) + 1);
const FAQ_KWDF = new Map();
for (const f of FAQS) for (const k of new Set((f.kw || []).map(norm))) FAQ_KWDF.set(k, (FAQ_KWDF.get(k) || 0) + 1);
const kwW = (kn) => Math.max(0.35, Math.min(1, 1.15 * Math.log(FAQ_N / (FAQ_KWDF.get(kn) || 1)) / Math.log(FAQ_N))); // 「いつ」「どこ」のようにどの FAQ にも出る語は軽く
// 答える・聞き返す・分からないの境目(評価セット research/faq_eval の dev で調整、test で確認)
export const FAQ_P = { none: 4, ans: 7, sure: 17, margin: 3, wKw: 1.3, wIdf: 1.5, wCov: 1, wDice: 4, ratio: 1.6 }; // 評価セット dev(E1・E2)で、誤答5%以下・関係ない質問への回答3/40以下の条件で調整
export function rankFaq(sN, P = FAQ_P) {
  const core = sN.replace(FILLER, ''); // 「いつ」「どこ」「ですか」など誰の質問にも出る言葉は2文字一致の数に入れない
  const grams = new Set(bg(core)), out = [];
  FAQS.forEach((f, i) => {
    let s = 0;
    for (const k of f.kw || []) { const kn = norm(k); if (kn.length >= 2 && sN.includes(kn)) s += P.wKw * (kn.length >= 4 ? 3 : 2) * kwW(kn); else if (kn.length === 1 && sN === kn) s += 1; }
    for (const x of grams) if (FAQ_U[i].has(x)) s += P.wIdf * Math.max(0, Math.log(FAQ_N / (FAQ_DF.get(x) || 1)) / Math.log(FAQ_N));
    if (grams.size) {
      let cover = 0, dice = 0;
      for (const g of FAQ_V[i]) { let h = 0; for (const x of grams) if (g.has(x)) h++; cover = Math.max(cover, h / grams.size); dice = Math.max(dice, (2 * h) / (grams.size + g.size)); }
      s += P.wCov * cover + (dice > 0.5 ? P.wDice * dice : 0); // 質問のうちこの FAQ の言い方で説明できる割合 / 質問文そのものに近いときは決め手に
    }
    if (s > 0) out.push({ f, s });
  });
  return out.sort((a, b) => b.s - a.s);
}
/** 'answer'(これだと答える) / 'pick'(近い質問をボタンで出して聞き返す) / 'none'(分からない) */
export function decideFaq(rk, P = FAQ_P) {
  if (!rk.length || rk[0].s < P.none) return 'none';
  const s0 = rk[0].s, s1 = rk[1] ? rk[1].s : 0;
  if (s0 >= P.sure) return 'answer';
  return s0 >= P.ans && (s0 - s1 >= P.margin || s0 >= P.ratio * s1) ? 'answer' : 'pick';
}
const chipOf = (f) => ({ q: f.q, l: f.q.length > 18 ? f.q.slice(0, 17) + '…' : f.q });

async function faqReply(rk) {
  const top = await hydrate(rk[0].f); if (!top) return faqOffline(rk[0].f);
  const a = answerFaq(top);
  const near = rk.slice(1, 4).filter((x) => x.s >= rk[0].s * 0.7).slice(0, 2).map((x) => chipOf(x.f)); // 点が近い別の質問があれば先頭に
  a.chips = [...near, ...a.chips.filter((c) => !near.some((n) => n.q === c.q))].slice(0, 4);
  return a;
}

// ---------- 入口 ----------
/** @param {string} q 質問  @param {{selected?:{b?:string,room?:string}}} ctx */
export async function answer(q, ctx = {}) {
  const s = norm(q), k = normK(q);
  const T = (re) => re.test(s) || re.test(k);
  if (!s) return { expr: 'nikkori', lines: [line('stock:help', STOCK.help)], detail: '', actions: [] };

  // あいさつ・お礼・自己紹介
  if (T(/^(こんにちは|こんばんは|おはよう|やあ|はじめまして|よろしく|はろー|hello|hi)/) && s.length < 14) return { expr: 'nikkori', lines: [line('stock:hello', STOCK.hello)], detail: '', actions: [], chips: defaultChips() };
  if (T(/ありがと|感謝|たすかった|助かった|さんきゅ/)) return { expr: 'tere', lines: [line('stock:thanks', STOCK.thanks)], detail: '', actions: [] };
  if (T(/^(あなた|君|きみ|ねる)(は|って|とは)?(だれ|誰|何者|なにもの)|^(あなた|君|きみ|ねる)の(名前|なまえ)|(名前|なまえ)は(\?|？)?$|自己紹介/) && s.length < 14) return { expr: 'wink', lines: [line('stock:who', STOCK.who)], detail: '', actions: [], chips: defaultChips() };
  if (T(/^(この|ねるの|サイトの|これの|ここの)?(できること|使い方|つかいかた|ヘルプ|help|何ができ|なにができ)/) && s.length < 14) return { expr: 'nikkori', lines: [line('stock:help', STOCK.help)], detail: '<ul><li>「κ21どこ？」で教室の場所と定員</li><li>「食堂」「図書館」で場所</li><li>「バス停からλ11」で徒歩の目安</li><li>「大きい教室」「4Kの教室」で教室さがし</li></ul>', actions: [], chips: defaultChips() };

  // 今は何限？
  if (T(/今|いま|現在/) && T(/何限|なんげん|時間|じかん|授業/)) {
    const p = currentPeriod();
    return p ? { expr: 'nikkori', lines: [line(`stock:period${p.n}`, STOCK[`period${p.n}`])], detail: `<p>${p.n}限は ${p.s}〜${p.e} です(2026年度の時限表)。</p>`, actions: [act.page('/timetable/', '時間割プランナー')] }
      : { expr: 'komari', lines: [line('stock:noPeriod', STOCK.noPeriod)], detail: '<p>時限は 1限 9:25 〜 6限 19:40 です(7限 19:50〜21:20 は開講の有無が未確認)。</p>', actions: [act.page('/timetable/', '時間割プランナー')] };
  }

  // 直前の答えへの追い質問
  if (LAST && s.length < 14) {
    if (T(/^(もっと|もう少し|さらに)?(詳しく|くわしく)(教えて|おしえて|知りたい|お願い)?[?？!！]*$|^詳細(は|を|も)?(教えて)?[?？!！]*$|^それで[?？!！]*$|^続き(は)?[?？!！]*$/)) {
      const f = LAST, body = f.a.map((p) => `<p>${esc(p)}</p>`).join('');
      const src = f.src && f.src.length ? `<p class="foot">出典: ${f.src.map((x) => `<a href="${x.u}" target="_blank" rel="noopener noreferrer">${esc(x.l)}</a>`).join(' / ')}</p>` : '';
      return { expr: 'nikkori', lines: [line('stock:detailMore', STOCK.detailMore)], detail: body + src, actions: [act.page(`/faq/#${f.id}`, 'よくある質問のページで見る')], chips: relChips(f).slice(0, 3) };
    }
    if (T(/^(他|ほか)(に|には|にも)?(は|も)?(ある|何|なに)?[?？!！]*$|^関連(する)?(質問|こと)?(は)?[?？!！]*$|^似(た|てる)(質問|こと)?(は)?[?？!！]*$/)) {
      const ch = relChips(LAST); if (ch.length) return { expr: 'nikkori', lines: [line('stock:relMore', STOCK.relMore)], detail: '', actions: [], chips: ch.slice(0, 4) };
    }
  }
  LAST = null; // 追い質問でなければ、直前の答えは忘れる(FAQ を答えたときに answerFaq が入れ直す)
  const places = parsePlaces(q);
  const rk = rankFaq(s);
  // 場所の名前が出ていても、FAQ がはっきり当たるなら FAQ を先に(「ローソンは何時まで」→ 建物の紹介ではなく営業時間の答え)。教室番号と、場所の名前だけの質問は今までどおり。
  if (rk.length && !places.some((p) => p.kind === 'room') && s.length > 6 && decideFaq(rk) === 'answer' && rk[0].s >= (places.length >= 2 ? 11 : 0)) return faqReply(rk);
  const isRoute = T(ROUTE_WORDS);

  // 経路: 2か所、または1か所+「行き方」
  if (places.length >= 2 && (isRoute || T(/から/))) {
    const from = places[0], to = places[places.length - 1];
    const a = await answerRoute(from, to); if (a) return a;
  }
  if (places.length === 1 && T(/行き方|いきかた|どうやって|どう行|徒歩|何分|歩い|ルート|経路|行きたい|いきたい|行く|いく/) && !T(/から$/)) {
    const to = places[0];
    if (to.kind === 'poi') return { expr: 'komari', lines: [line('stock:needTo', STOCK.needTo)], detail: '', actions: [], chips: [{ q: `${to.label}から${ctx.selected?.room || 'κ21'}`, l: `${to.label}から…` }] };
    const from = { kind: 'poi', key: 'poi:bus0', label: POIS['poi:bus0'].label };
    const a = await answerRoute(from, to);
    if (a) { a.detail = `<p class="foot">出発点は「${esc(from.label)}」にしました。別の出発点なら「〇〇から${esc(to.label)}」と聞いてね。</p>` + a.detail; return a; }
  }
  // 1か所だけ → 情報
  const nonPoi = places.filter((p) => p.kind !== 'poi');
  if (nonPoi.length >= 1 && (!isRoute || T(INFO_WORDS) || places.length === 1)) {
    const p = nonPoi[0];
    if (p.kind === 'room') return answerRoom(roomByCode[p.key]);
    return answerBuilding(p.key, p.via);
  }
  if (places.length === 1 && places[0].kind === 'poi') {
    const p = places[0]; const near = p.key === 'poi:bus0' ? 'alpha' : null;
    return { expr: 'nikkori', lines: [line('stock:mapOpen', STOCK.mapOpen)], detail: `<p>${esc(p.label)}です。地図で位置を確かめられます。</p>`, actions: [act.page(`/map/`, '地図を開く')], focus: near ? { b: near } : null };
  }

  // 「この建物」「ここ」
  if (T(/この建物|ここは|これは|いま見て|今見て/) && ctx.selected && (ctx.selected.room || ctx.selected.b)) {
    const sel = ctx.selected; return sel.room ? answerRoom(roomByCode[sel.room]) : answerBuilding(sel.b);
  }

  // 教室さがし
  if (T(/大きい|広い|大教室|おおきい|一番大|いちばん大|でかい|人数が多|大人数/) && T(/教室|部屋|へや/)) {
    const top = [...ROOMS].sort((a, b) => b.n - a.n).slice(0, 5); return listRooms(top, 'stock:roomBig', STOCK.roomBig);
  }
  if (T(/4k|４k|よんけー|フォーケー/)) { const l = ROOMS.filter((r) => r.k4); return listRooms(l, 'stock:room4k', STOCK.room4k); }
  if (T(/パソコン教室|pc教室|ぴーしー|マック|mac|windows|ウィンドウズ|特別教室/)) { const l = ROOMS.filter((r) => r.sz === 'special'); return listRooms(l, 'stock:roomPc', STOCK.roomPc); }
  if (T(/小さい|少人数|ちいさい|せまい|狭い/) && T(/教室|部屋|へや/)) { const l = [...ROOMS].filter((r) => r.n <= 20).sort((a, b) => a.n - b.n).slice(0, 6); return listRooms(l, 'stock:roomSmall', STOCK.roomSmall); }

  // 用語
  for (const g of GLOSSARY) {
    const names = [g.term, ...(g.alias || [])].map(norm).filter((x) => x.length >= 2);
    if (names.some((n) => s.includes(n)) && T(/とは|って何|なに|意味|いみ|何/)) {
      const f = FAQS.find((x) => (x.kw || []).some((k) => names.includes(norm(k))));
      if (f) { const full = await hydrate(f); return full ? answerFaq(full) : faqOffline(f); }
      return { expr: 'nikkori', lines: [{ id: null, t: `${g.term}は、${g.def}` }], detail: `<p>${esc(g.def)}</p>`, actions: [act.page('/guide/#words', '用語集')] };
    }
  }

  // よくある質問
  if (decideFaq(rk) === 'answer') return faqReply(rk);

  // ページ案内
  const nav = [[/時間割|じかんわり/, '/timetable/', '時間割プランナー'], [/アクセス|通学|行き方|バス/, '/access/', 'アクセス'], [/ガイド|新入生|はじめて|最初/, '/guide/', '新入生ガイド'], [/施設|設備/, '/life/', '施設ガイド'], [/地図|マップ|まっぷ/, '/map/', 'マップ'], [/教室/, '/rooms/', '教室を探す'], [/質問|ふぁく|faq|よくある/, '/faq/', 'よくある質問']];
  for (const [re, h, l] of nav) if (T(re)) return { expr: 'nikkori', lines: [line('stock:open', STOCK.open)], detail: `<p>「${esc(l)}」のページが役に立つよ。</p>`, actions: [act.page(h, l + 'を開く')] };

  // あいまい検索 → 候補
  const bs = searchBuildings(s, 3); const rr = searchRooms(s, 3);
  if (bs.length || rr.list.length) {
    const chips = [...bs.map((x) => ({ q: BLD[x.id].ja, l: BLD[x.id].ja })), ...rr.list.map((r) => ({ q: r.c, l: r.c })), ...rk.filter((x) => x.s >= 1.2).slice(0, 2).map((x) => chipOf(x.f))].slice(0, 5);
    return { expr: 'komari', lines: [line('stock:unknown2', STOCK.unknown2)], detail: '<p>近いものを出したよ。ボタンを押してね。</p>', actions: [], chips };
  }
  if (rk.length && rk[0].s >= 0.9) return { expr: 'komari', lines: [line('stock:pickFaq', STOCK.pickFaq)], detail: '<p>近い質問を出したよ。ボタンを押してね。</p>', actions: [act.page('/faq/', 'よくある質問を見る')], chips: rk.slice(0, 4).map((x) => chipOf(x.f)) };
  return { expr: 'komari', lines: [line('stock:unknown', STOCK.unknown)], detail: '<p>公式の情報は <a href="https://www.students.keio.ac.jp/sfc/pmei/" target="_blank" rel="noopener noreferrer">塾生サイト</a> や SFC GUIDE で確認できます。</p>', actions: [act.page('/faq/', 'よくある質問を見る')], chips: rk.some((x) => x.s >= 1) ? rk.filter((x) => x.s >= 1).slice(0, 3).map((x) => chipOf(x.f)) : defaultChips() };
}

export function defaultChips() {
  return [{ q: 'バス停からκ21', l: 'バス停から歩くと？' }, { q: '食堂はどこ？', l: '食堂はどこ？' }, { q: '1限は何時から？', l: '1限は何時から？' }, { q: '大きい教室は？', l: '大きい教室は？' }, { q: '履修登録はいつ？', l: '履修登録は？' }];
}
