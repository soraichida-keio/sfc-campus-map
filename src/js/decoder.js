// 教室番号のデコーダ(ホーム・ガイドで共通)。「κ21」→ 建物 κ / 階 2 / 教室 21。階は番号からの推定。
import { norm, roomByCode } from './search.js';
import { BLD, ROOM_SZ } from './data.js';
import { roomPath } from './slug.js';
import { parsePlaces } from './nel/brain.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function decode(text) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, msg: '教室番号を入れてください。' };
  const p = parsePlaces(t).find((x) => x.kind === 'room');
  if (p) {
    const r = roomByCode[p.key]; const b = BLD[r.b];
    const sym = r.c.startsWith('θ') ? 'θ' : r.c[0];
    return { ok: true, room: r, sym, floor: r.f ? String(r.f) : '—', num: r.c.startsWith('θ') ? '館' : r.c.slice(1),
      note: `${b.ja}${r.f ? 'の' + r.f + '階(番号からの推定)' : ''}。${ROOM_SZ[r.sz].ja}・定員${r.n}人${r.k4 ? '・4K対応' : ''}。`, href: `/map/#r=${encodeURIComponent(r.c)}`, page: roomPath(r) };
  }
  return { ok: false, msg: `「${esc(t)}」という教室は見つかりませんでした。κ21 や Ω11、λ12 のように入れてみてください。` };
}
