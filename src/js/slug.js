// 教室・建物の個別ページの住所(ブラウザとビルドで共通)。Greek letter を URL に入れないよう、棟の英名+番号にする。
//   κ21 → /room/kappa-21/   θ館 → /room/theta-hall/   カッパ館 → /building/kappa/
export const roomSlug = (r) => `${r.b}-${(r.c.match(/\d+/) || ['hall'])[0]}`;
export const roomPath = (r) => `/room/${roomSlug(r)}/`;
export const buildingPath = (id) => `/building/${id}/`;
