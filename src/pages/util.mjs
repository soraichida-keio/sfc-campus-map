import ROOMS from '../rooms.json' with { type: 'json' };
import { BLD, CATS, ROOM_SZ } from '../js/data.js';
import { icon } from '../js/icons.js';
export { ROOMS, BLD, CATS, ROOM_SZ, icon };

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ext = (u, l) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`;
export const symTok = (id, cls = '') => `<span class="sym ${cls}${BLD[id].sym.length > 1 ? ' long' : ''}" style="--c:${CATS[BLD[id].cat].color}" aria-hidden="true">${esc(BLD[id].sym)}</span>`;
export const head = (eyebrow, title, lead) => `<header class="page-head">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1 class="t-title1">${title}</h1>${lead ? `<p class="lead" style="margin-top:14px">${lead}</p>` : ''}</header>`;
export const stats = { rooms: ROOMS.length, buildings: Object.keys(BLD).length };
