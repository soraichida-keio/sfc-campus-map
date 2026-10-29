// FAQ・用語の取り込み。research/faq_drafts/*.json を検査して src/js/faq_extra.json / terms_extra.json に書き出す。
//   node tools/faq/merge.mjs          検査して書き出す(エラーがあれば書かない)
//   node tools/faq/merge.mjs --check  検査だけ
// 検査: 必須項目・id 重複・say の長さ(70字)・ラテン文字・出典・リンク先・建物ID・質問の重複・断定語
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DIR = 'research/faq_drafts';
const checkOnly = process.argv.includes('--check');
const EXPR = new Set(['nikkori', 'komari', 'fuan', 'odoroki', 'wink', 'tere']);
const LINKS = new Set(['/guide/', '/timetable/', '/life/', '/access/', '/rooms/', '/map/', '/route/', '/faq/']);
const LATIN_OK = /^(SFC|K-LMS|K-Support|PC|Wi-?Fi|AED|ID|4K|GPA|ITC|JR|ORF|BYOD|keio\.jp|WEB|Web|AO|TA|SA)$/;
const BAN = /100%|保証します|間違いなく/;
const SOFT = /必ず|絶対|確実に/; // 義務や禁止の言い方なら出典どおりでよい。警告だけ出して目で見る
const CAT_MAP = { 授業: '授業・履修', 履修: '授業・履修', 成績: '授業・履修', 卒業: '授業・履修', 学び: '授業・履修', 手続き: '手続き・お金', お金: '手続き・お金', 健康: '健康・安全', 安全: '健康・安全', IT: 'IT・ネット', 施設: '施設', 食: '施設', 図書館: '施設', 体育: '施設', バリアフリー: '施設', 課外: '課外・国際・キャリア', キャリア: '課外・国際・キャリア', 国際: '課外・国際・キャリア', 研究: '課外・国際・キャリア', 通学: '通学・入学', 入学: '通学・入学', 持ち物: '通学・入学', キャンパス: 'キャンパス', SFC: 'SFC について' };

// 既存の内容(content.js)を読む
const tmp = join(tmpdir(), 'sfcmap-faq-content.mjs');
await build({ entryPoints: ['src/js/content.js'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, loader: { '.json': 'json' }, logLevel: 'error', define: {} });
const { BASE_FAQS, BASE_GLOSSARY } = await import(tmp + '?t=' + Date.now());
const BLD_IDS = new Set([...readFileSync('src/js/data.js', 'utf8').matchAll(/^\s{2}(\w+):\s*\{ ja:/gm)].map((m) => m[1]));

const errs = [], warns = [];
const err = (id, m) => errs.push(`${id}: ${m}`), warn = (id, m) => warns.push(`${id}: ${m}`);
const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[\s・、。,.\-_/／?？!！]+/g, '');
const bigrams = (s) => { const n = norm(s), o = new Set(); for (let i = 0; i < n.length - 1; i++) o.add(n.slice(i, i + 2)); return o; };
const sim = (a, b) => { const A = bigrams(a), B = bigrams(b); let h = 0; for (const x of A) if (B.has(x)) h++; return h / Math.max(1, Math.min(A.size, B.size)); };

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => /^[A-Z]\.json$/.test(f)).sort() : [];
const DROP = new Set(existsSync(join(DIR, 'drop.json')) ? JSON.parse(readFileSync(join(DIR, 'drop.json'), 'utf8')).map((d) => d.id) : []);
const KWX = existsSync(join(DIR, 'kw_extra.json')) ? JSON.parse(readFileSync(join(DIR, 'kw_extra.json'), 'utf8')) : {}; // テストで見つかった当たり漏れの補い(id → 追加キーワード)
const all = [];
for (const f of files) {
  let arr; try { arr = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch (e) { err(f, 'JSON が壊れている ' + e.message); continue; }
  for (const x of arr) if (!DROP.has(x.id)) all.push({ ...x, _file: f });
}
const ids = new Set(BASE_FAQS.map((f) => f.id));
const seenQ = BASE_FAQS.map((f) => ({ id: f.id, q: f.q }));
const out = [];
for (const x of all) {
  const id = x.id || '(idなし)';
  for (const k of ['id', 'cat', 'q', 'kw', 'a', 'say', 'src', 'evidence']) if (!x[k] || (Array.isArray(x[k]) && !x[k].length)) err(id, `${k} がない`);
  if (!x.id) continue;
  if (ids.has(x.id)) err(id, 'id が重複'); ids.add(x.id);
  if (!/^[a-z0-9-]+$/.test(x.id)) err(id, 'id は英小文字・数字・ハイフンのみ');
  if (x.expr && !EXPR.has(x.expr)) err(id, `expr が不正 ${x.expr}`);
  if (x.say) {
    const n = [...x.say].length;
    if (n > 78) err(id, `say が長い(${n}字)`); else if (n > 70) warn(id, `say がやや長い(${n}字)`);
    if (/[『』「」()()\[\]]/.test(x.say)) err(id, 'say に括弧');
    for (const w of x.say.match(/[A-Za-z][A-Za-z0-9.\-]*/g) || []) if (!LATIN_OK.test(w)) err(id, `say にラテン文字 ${w}`);
    if (BAN.test(x.say)) err(id, 'say に断定語');
    if (SOFT.test(x.say)) warn(id, 'say に強い言い方: ' + x.say.match(SOFT)[0]);
  }
  for (const p of x.a || []) { if (typeof p !== 'string') err(id, 'a は文字列の配列'); else if (BAN.test(p)) err(id, '本文に断定語: ' + (p.match(BAN) || [''])[0]); }
  for (const s of x.src || []) { if (!/^https:\/\//.test(s.u || '')) err(id, '出典URLが https でない'); if (!s.l) err(id, '出典名がない'); }
  if (x.link && !LINKS.has(x.link.h) && !(/^\/map\/#b=(\w+)$/.test(x.link.h) && BLD_IDS.has(x.link.h.slice(8)))) err(id, `link 先が不正 ${x.link.h}`);
  if (x.bld && !BLD_IDS.has(x.bld)) err(id, `bld が存在しない ${x.bld}`);
  if ((x.kw || []).length < 5) warn(id, 'kw が少ない');
  for (const s of seenQ) { const v = sim(x.q, s.q); if (v >= 0.8) warn(id, `質問が似ている(${s.id} ${v.toFixed(2)})`); }
  seenQ.push({ id: x.id, q: x.q });
  out.push({ id: x.id, cat: CAT_MAP[x.cat] || x.cat, q: x.q, kw: [...new Set([...(x.kw || []), ...(KWX[x.id] || [])])], expr: x.expr || 'nikkori', a: x.a, say: x.say, src: x.src, ...(x.bld ? { bld: x.bld } : {}), ...(x.link ? { link: x.link } : {}) });
}
// 用語
const terms = [], seenT = new Set(BASE_GLOSSARY.map((g) => norm(g.term)));
for (const f of existsSync(DIR) ? readdirSync(DIR).filter((f) => /_terms\.json$/.test(f)).sort() : []) {
  let arr; try { arr = JSON.parse(readFileSync(join(DIR, f), 'utf8')); } catch (e) { err(f, 'JSON が壊れている'); continue; }
  for (const t of arr) {
    if (!t.term || !t.def) { err(f, '用語に term/def がない'); continue; }
    const key = norm(t.term); if (seenT.has(key)) { warn(t.term, '用語が重複(取り込まない)'); continue; } seenT.add(key);
    if ([...t.def].length > 110) warn(t.term, `def が長い(${[...t.def].length}字)`);
    if (BAN.test(t.def)) err(t.term, 'def に断定語');
    terms.push({ term: t.term, alias: [...new Set(t.alias || [])], def: t.def, ...(t.src ? { src: t.src } : {}) });
  }
}

// ---------- 言い換え(alt)・言い回し違い(say_alt)・関連質問(rel) ----------
// research/faq_eval/T*.json(学習用。評価用の E*.json は読まない)から取り込む。say_alt は事実を足していないかを自動で確かめ、通らないものは捨てて記録する。
const EVAL_DIR = 'research/faq_eval';
const allFaqs = [...BASE_FAQS.map((f) => ({ id: f.id, cat: f.cat, q: f.q, kw: f.kw || [], say: f.say, a: f.a, bld: f.bld })), ...out.map((f) => ({ ...f }))];
const byId = Object.fromEntries(allFaqs.map((f) => [f.id, f]));
const meta = {}, sayAlt = {}, rejected = [];
const jac = (A, B) => { let h = 0; for (const x of A) if (B.has(x)) h++; return h / Math.max(1, A.size + B.size - h); };
const digits = (t) => (String(t).normalize('NFKC').replace(/(\d),(\d)/g, '$1$2').match(/\d+/g) || []);
if (existsSync(EVAL_DIR)) {
  for (const f of readdirSync(EVAL_DIR).filter((f) => /^T\d+\.json$/.test(f)).sort()) {
    let arr; try { arr = JSON.parse(readFileSync(join(EVAL_DIR, f), 'utf8')); } catch (e) { err(f, 'JSON が壊れている'); continue; }
    for (const x of arr) {
      const base = byId[x.id]; if (!base) { warn(x.id, `${f}: 知らない id`); continue; }
      const alt = [...new Set((x.alt || []).map((s) => String(s).trim()).filter((s) => s.length >= 2 && s.length <= 60 && s !== base.q))].slice(0, 5);
      const pool = norm(base.say + base.a.join(''));
      const okSay = [];
      for (const t0 of x.say_alt || []) {
        const t = String(t0).trim(); const why = [];
        if ([...t].length > 70) why.push('70字超');
        if (/[『』「」()()\[\]]/.test(t)) why.push('括弧');
        for (const w of t.match(/[A-Za-z][A-Za-z0-9.\-]*/g) || []) if (!LATIN_OK.test(w)) why.push('ラテン文字 ' + w);
        if (BAN.test(t)) why.push('断定語');
        if (/必ず|絶対/.test(t) && !/必ず|絶対/.test(base.say + base.a.join(''))) why.push('元にない強い言い方');
        const src = digits(base.say + base.a.join(' ')); for (const d of digits(t)) if (!src.includes(d)) why.push('元にない数字 ' + d);
        if (t === base.say || okSay.includes(t)) why.push('重複');
        if (jac(bigrams(t), bigrams(base.say)) < 0.10) why.push('元の答えと話題がずれている(別の側面)');
        if (why.length) rejected.push({ id: x.id, text: t, why }); else okSay.push(t);
      }
      meta[x.id] = { alt }; if (okSay.length) sayAlt[x.id] = okSay;
    }
  }
}
// 関連質問: 「質問+言い換え+キーワード」の文書どうしの TF-IDF 余弦類似度(2文字)。同じ分類と同じ建物は少し加点
const docOf = (f) => norm([f.q, ...((meta[f.id] || {}).alt || []), ...(f.kw || [])].join(' '));
const DOC = {}, DF = new Map();
for (const f of allFaqs) { const m = new Map(); const d = docOf(f); for (let i = 0; i < d.length - 1; i++) { const g = d.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } DOC[f.id] = m; for (const g of m.keys()) DF.set(g, (DF.get(g) || 0) + 1); }
const vecs = {};
for (const f of allFaqs) { const v = new Map(); let n = 0; for (const [g, c] of DOC[f.id]) { const w = (1 + Math.log(c)) * Math.log(1 + allFaqs.length / DF.get(g)); v.set(g, w); n += w * w; } vecs[f.id] = { v, n: Math.sqrt(n) || 1 }; }
const cos = (a, b) => { let d = 0; for (const [g, w] of a.v) { const x = b.v.get(g); if (x) d += w * x; } return d / (a.n * b.n); };
for (const f of allFaqs) {
  const sc = allFaqs.filter((g) => g.id !== f.id).map((g) => ({ id: g.id, s: cos(vecs[f.id], vecs[g.id]) + (g.cat === f.cat ? 0.03 : 0) + (f.bld && g.bld === f.bld ? 0.05 : 0) })).filter((x) => x.s >= 0.12 && x.s < 0.9).sort((a, b) => b.s - a.s).slice(0, 3);
  (meta[f.id] ||= { alt: [] }).rel = sc.map((x) => x.id);
}
const nAlt = Object.values(meta).reduce((n, m) => n + (m.alt || []).length, 0), nSay = Object.values(sayAlt).reduce((n, a) => n + a.length, 0), nRel = Object.values(meta).filter((m) => (m.rel || []).length).length;
console.log(`言い換え ${nAlt}個 / 言い回し違い ${nSay}個(不合格 ${rejected.length}) / 関連質問あり ${nRel}件`);
console.log(`FAQ 追加 ${out.length}件(既存 ${BASE_FAQS.length}) / 用語 追加 ${terms.length}件(既存 ${BASE_GLOSSARY.length}) / 警告 ${warns.length} / エラー ${errs.length}`);
const byCat = {}; for (const f of out) byCat[f.cat] = (byCat[f.cat] || 0) + 1; console.log(byCat);
for (const w of warns) console.log('WARN ', w);
for (const e of errs) console.log('ERROR', e);
if (errs.length) { console.log('エラーがあるので書き出しません'); process.exit(1); }
if (!checkOnly) {
  writeFileSync('src/js/faq_extra.json', JSON.stringify(out, null, 1));
  writeFileSync('src/js/faq_index.json', JSON.stringify(out.map(({ id, cat, q, kw, expr }) => ({ id, cat, q, kw, expr })), null, 0));
  writeFileSync('src/js/faq_meta.json', JSON.stringify(meta));
  writeFileSync('src/js/faq_say_alt.json', JSON.stringify(sayAlt));
  if (rejected.length) writeFileSync(join(EVAL_DIR, '_rejected_say_alt.json'), JSON.stringify(rejected, null, 1));
  writeFileSync('src/js/terms_extra.json', JSON.stringify(terms, null, 1));
  console.log('書き出した: src/js/faq_extra.json(全文・ビルド専用), src/js/faq_index.json(質問とキーワードだけ・ブラウザに入る), src/js/terms_extra.json');
}
