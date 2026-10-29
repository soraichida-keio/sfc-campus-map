// 全ページ共通の HTML(上バー・サイドバー・ドロワー・下タブ・フッター)を組み立てる。
import { NAV, TABS, SITE } from '../src/js/nav.js';
import { icon } from '../src/js/icons.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sideNav(pageId, toc) {
  return NAV.map((g) => `
    <div class="sb-group">
      <div class="sb-title">${esc(g.group)}</div>
      ${g.items.map((it) => {
        const cur = it.id === pageId;
        const t = cur && toc && toc.length ? `<nav class="sb-toc" aria-label="このページの目次">${toc.map((x) => `<a href="#${x.id}">${esc(x.label)}</a>`).join('')}</nav>` : '';
        return `<a class="sb-link" href="${it.path}"${cur ? ' aria-current="page"' : ''}>${icon(it.icon)}<span>${esc(it.label)}</span></a>${t}`;
      }).join('')}
    </div>`).join('');
}

export function renderPage(page, assets) {
  const id = page.nav || page.id; // 個別ページ(教室・建物)は、親のページを「いま見ている場所」として強調する
  const ORDER = ['map', 'rooms', 'guide', 'route', 'timetable', 'life', 'access', 'faq'];
  const all = NAV.flatMap((g) => g.items);
  const topItems = ORDER.map((k) => all.find((i) => i.id === k)).filter(Boolean);
  const layoutCls = page.layout === 'app' ? 'app' : page.layout === 'wide' ? '' : 'has-side';
  const css = [assets.css.site, ...(page.css || []).map((c) => assets.css[c])].filter(Boolean)
    .map((h) => `<link rel="stylesheet" href="${h}">`).join('\n');
  const js = [assets.js.shell, assets.js[page.script]].filter(Boolean)
    .map((h) => `<script type="module" src="${h}"></script>`).join('\n');
  const title = page.id === 'home' ? `${SITE.title} — ${SITE.tagline}` : `${page.title} | ${SITE.title}`;
  const desc = page.desc || SITE.tagline;

  const header = `
<header class="topbar glass" role="banner">
  <button class="tbtn menu-btn" id="menu-btn" aria-label="メニューを開く" aria-controls="drawer" aria-expanded="false">${icon('menu')}</button>
  <a class="brand" href="/" aria-label="SFC Map ホーム"><span class="mark" aria-hidden="true">σ</span><span>${esc(SITE.name)}</span></a>
  <nav class="navlinks" aria-label="主なページ">
    ${topItems.map((i) => `<a href="${i.path}"${i.id === id ? ' aria-current="page"' : ''}${i.opt ? ' class="opt"' : ''}>${esc(i.label)}</a>`).join('')}
  </nav>
  <div class="navtools">
    <button class="tbtn txt" id="open-search" aria-label="検索" aria-keyshortcuts="Meta+K Control+K">${icon('search')}<span class="lbl">検索</span><kbd>⌘K</kbd></button>
    <button class="tbtn txt" id="open-nel" aria-label="ねるに聞く">${icon('sparkle')}<span class="lbl">ねるに聞く</span></button>
  </div>
</header>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" aria-label="サイトのメニュー" aria-hidden="true">
  <button class="tbtn dclose" id="drawer-close" aria-label="メニューを閉じる">${icon('close')}</button>
  ${sideNav(id, null)}
</aside>`;

  const sidebar = page.layout === 'app' || page.layout === 'wide' ? '' : `<aside class="sidebar glass" aria-label="サイトのメニュー">${sideNav(id, page.toc)}</aside>`;

  const tl = (id, path, label, ic) => `<a href="${path}"${id === (page.nav || page.id) ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`;
  const tabs = `
<nav class="tabbar glass" aria-label="下部のタブ">
  ${tl('map', '/map/', 'マップ', 'map')}
  ${tl('rooms', '/rooms/', '教室', 'rooms')}
  <button class="tab-nel" id="tab-nel" type="button" aria-label="案内キャラ「ねる」に質問する。タップすると質問でき、声で答えます" aria-haspopup="dialog">
    <span class="tab-nel-bubble" aria-hidden="true"><b>何でも聞いてね！</b><span>タップして質問 · 声で答えます</span></span>
    <span class="tab-nel-av"><img src="/nel/nikkori_m0.webp" alt="" width="136" height="136" decoding="async"><span class="nel-badge" aria-hidden="true">${icon('speaker')}</span></span>
    <span class="tab-nel-lbl">ねるに聞く</span>
  </button>
  ${tl('guide', '/guide/', 'ガイド', 'guide')}
  <button id="tab-more" type="button" aria-label="その他のメニュー">${icon('menu')}<span>その他</span></button>
</nav>`;

  const footer = page.layout === 'app' ? '' : `
<footer class="footer">
  <div class="wrap">
    <div class="cols">
      ${NAV.map((g) => `<div><h4>${esc(g.group)}</h4>${g.items.map((i) => `<a href="${i.path}">${esc(i.label)}</a>`).join('')}</div>`).join('')}
    </div>
    <p>これは学生による非公式のサイトです。慶應義塾・慶應義塾大学とは関係ありません。建物の形と配置は慶應義塾の公式キャンパスマップ、教室情報は SFC Classroom をもとにしています。授業・施設の最新情報は必ず公式サイトで確認してください。</p>
    <p>案内キャラクター「ねる」の声は AivisSpeech(話者: まお)の合成音声です。3D 表示は three.js(MIT)を使用しています。</p>
  </div>
</footer>`;

  const body = page.layout === 'app'
    ? `<main id="main">${page.body}</main>`
    : page.layout === 'wide'
      ? `<main id="main">${page.body}</main>${footer}`
      : `<div class="layout has-side">${sidebar}<main id="main">${page.body}</main></div>${footer}`;

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#f5f5f7">
<meta name="color-scheme" content="light">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.title)}">${page.file ? '' : `\n<meta property="og:url" content="${SITE.url}${page.path}">\n<link rel="canonical" href="${SITE.url}${page.path}">`}${page.jsonld ? `\n<script type="application/ld+json">${JSON.stringify(page.jsonld).replace(/</g, '\\u003c')}</script>` : ''}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SFC Map">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
${css}
</head>
<body data-page="${page.id}">
<a class="skip" href="#main">本文へ移動</a>
${header}
${body}
${tabs}
${js}
</body>
</html>
`;
}
