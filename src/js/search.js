// 検索(サイト全体・マップ・ねる)で共有する索引。ページ・建物・教室・よくある質問を横断して引く。
import geom from '../geom.json';
import ROOMS from '../rooms.json';
import { BLD, CATS, ASCII2GREEK, ROOM_SZ } from './data.js';
import { NAV, flatNav } from './nav.js';
import { FAQS, GLOSSARY } from './content.js';

export const kata2hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const norm = (s) => kata2hira(String(s).normalize('NFKC').toLowerCase()).replace(/[\s・、。,.\-_/／]+/g, '');

export const bIds = Object.keys(geom.b).filter((id) => BLD[id]);
export const roomsByB = {};
for (const r of ROOMS) (roomsByB[r.b] ||= []).push(r);
for (const k in roomsByB) roomsByB[k].sort((a, b) => a.c.localeCompare(b.c, 'el'));
export const roomByCode = Object.fromEntries(ROOMS.map((r) => [r.c, r]));
export { ROOMS };

const bIndex = bIds.map((id) => {
  const m = BLD[id];
  return { id, name: norm(m.ja), sub: norm(m.sub), en: norm(m.en), sym: norm(m.sym), kana: norm(m.kana), kw: m.kw.map(norm), cat: norm(CATS[m.cat].ja) };
});
const rIndex = ROOMS.map((r) => ({ r, code: norm(r.c) }));
const pageIndex = flatNav().map((p) => ({ p, text: norm(p.label), kw: norm(p.label + (p.id === 'route' ? 'けいろ みち 徒歩 いきかた 行き方' : '') + (p.id === 'timetable' ? 'じかんわり 履修' : '') + (p.id === 'life' ? '食堂 学食 図書館 コンビニ' : '') + (p.id === 'access' ? 'バス 駅 通学 湘南台 辻堂' : '')) }));
const faqIndex = FAQS.map((f) => ({ f, text: norm(f.q + ' ' + (f.kw || []).join(' ')) }));
const glossIndex = GLOSSARY.map((g) => ({ g, text: norm(g.term + ' ' + (g.alias || []).join(' ')) }));

// 教室番号らしい入力を正規化(k21→κ21, ω11→ω11)
export function roomQuery(qn) {
  const m = qn.match(/^([a-zα-ω])(\d{0,2})$/);
  if (!m) return null;
  let l = m[1];
  if (/[a-z]/.test(l)) l = ASCII2GREEK[l] || null;
  if (!l) return null;
  return l + m[2];
}

export function searchBuildings(qn, limit = 7) {
  const out = [];
  for (const x of bIndex) {
    let s = 0;
    if (x.name.startsWith(qn) || x.kana.startsWith(qn) || x.sym === qn) s = 100;
    else if (x.name.includes(qn)) s = 85;
    else if (x.kana.includes(qn)) s = 75;
    else if (x.sub.includes(qn)) s = 66;
    else if (x.kw.some((k) => k === qn)) s = 64;
    else if (x.kw.some((k) => k.includes(qn) && qn.length > 1)) s = 58;
    else if (x.en.includes(qn)) s = 50;
    else if (x.cat.includes(qn)) s = 30;
    if (s) out.push({ id: x.id, s: s + (BLD[x.id].pri || 0) / 10 });
  }
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, limit);
}

export function searchRooms(qn, limit = 12) {
  let rs = [];
  const rq = roomQuery(qn);
  if (rq) rs = rIndex.filter((x) => x.code.startsWith(rq)).map((x) => x.r);
  else if (qn.length >= 2 && /\d/.test(qn)) rs = rIndex.filter((x) => x.code.includes(qn)).map((x) => x.r);
  return { list: rs.slice(0, limit), total: rs.length };
}

export function searchFaq(qn, limit = 5) {
  return faqIndex.filter((x) => x.text.includes(qn)).slice(0, limit).map((x) => x.f);
}

// サイト横断(コマンドパレット用)
export function searchAll(q) {
  const qn = norm(q);
  if (!qn) return { pages: [], b: [], r: [], faq: [], gloss: [], rTotal: 0 };
  const pages = pageIndex.filter((x) => x.kw.includes(qn)).map((x) => x.p).slice(0, 4);
  const b = searchBuildings(qn, 6);
  const rr = searchRooms(qn, 8);
  const faq = searchFaq(qn, 4);
  const gloss = glossIndex.filter((x) => x.text.includes(qn)).map((x) => x.g).slice(0, 3);
  return { pages, b, r: rr.list, rTotal: rr.total, faq, gloss };
}

export { BLD, CATS, ROOM_SZ };
