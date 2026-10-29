// ビルド専用: 事前生成する全ての台詞の一覧(声の生成 tools/voice/gen.mjs が使う)。ブラウザのコードからは読み込まない。
import ROOMS from '../rooms.json';
import { BLD } from './data.js';
import { SAY } from './say.js';
import { FAQS_FULL } from './faq_full.js';
import SAY_ALT from './faq_say_alt.json';
import { STOCK, roomSay, buildingSay, faqSay, routeSay, ROUTE_MIN_MAX } from './lines.js';

/** 事前生成する全ての台詞。{ id, t } の配列(t が画面表示と音声の元) */
export function allLines() {
  const out = [];
  for (const [k, t] of Object.entries(STOCK)) out.push({ id: `stock:${k}`, t });
  for (const r of ROOMS) out.push({ id: `room:${r.c}`, t: roomSay(r) });
  for (const id of Object.keys(SAY)) if (BLD[id]) out.push({ id: `b:${id}`, t: buildingSay(id) });
  for (const f of FAQS_FULL) { out.push({ id: `faq:${f.id}`, t: faqSay(f) }); (SAY_ALT[f.id] || []).forEach((t, i) => out.push({ id: `faq:${f.id}:${i + 1}`, t })); }
  for (let m = 1; m <= ROUTE_MIN_MAX; m++) out.push({ id: `route:${m}`, t: routeSay(m) });
  return out;
}
