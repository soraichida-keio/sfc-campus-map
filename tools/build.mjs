// ビルド: JS/CSS を esbuild でまとめ(ハッシュ付き)、各ページの静的 HTML を書き出す。
//   node tools/build.mjs          本番ビルド
//   node tools/build.mjs --watch  変更を監視して再ビルド
import { build, context } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pages } from '../src/pages/index.mjs';
import { renderPage } from './shell.mjs';
import { FAQ_EXTRA, FAQS_FULL } from '../src/js/faq_full.js';
import SAY_ALT from '../src/js/faq_say_alt.json' with { type: 'json' };
import { detailPages, sitemap, robots } from './detail.mjs';

const watch = process.argv.includes('--watch');
const OUT = 'public';

const jsEntries = {
  shell: 'src/js/shell.js',
  home: 'src/js/pages/home.js',
  map: 'src/js/pages/map.js',
  rooms: 'src/js/pages/rooms.js',
  guide: 'src/js/pages/guide.js',
  timetable: 'src/js/pages/timetable.js',
  life: 'src/js/pages/life.js',
  access: 'src/js/pages/access.js',
  faq: 'src/js/pages/faq.js',
  about: 'src/js/pages/about.js',
};
const cssEntries = { 'css-site': 'src/css/site.css', 'css-map': 'src/css/map.css' };

async function runBuild() {
  rmSync(join(OUT, 'assets'), { recursive: true, force: true });
  mkdirSync(join(OUT, 'assets'), { recursive: true });
  const common = {
    bundle: true, minify: !watch, sourcemap: false, legalComments: 'none', logLevel: 'warning',
    outdir: join(OUT, 'assets'), entryNames: '[name]-[hash]', assetNames: 'a-[hash]', metafile: true,
    loader: { '.json': 'json' }, target: ['es2020'], charset: 'utf8', // 日本語を \\uXXXX に直さない(約1/3 に縮む)
  };
  const js = await build({ ...common, entryPoints: jsEntries, format: 'esm', splitting: true, chunkNames: 'chunk-[hash]' });
  const css = await build({ ...common, entryPoints: cssEntries, loader: { '.json': 'json', '.png': 'dataurl', '.svg': 'dataurl' } });
  const assets = { js: {}, css: {} };
  for (const [file, meta] of Object.entries({ ...js.metafile.outputs, ...css.metafile.outputs })) {
    if (!meta.entryPoint) continue;
    const name = file.split('/').pop().replace(/-[A-Z0-9]+\.(js|css)$/, '');
    const url = '/' + file.replace(/^public\//, '');
    if (file.endsWith('.js')) assets.js[name] = url;
    else assets.css[name.replace(/^css-/, '')] = url;
  }
  // 教室・建物の個別ページはデータから自動で作る(tools/detail.mjs)
  const allPages = [...pages, ...(await detailPages())];
  // 各ページの HTML
  for (const page of allPages) {
    const html = renderPage(page, assets);
    const file = page.file ? join(OUT, page.file) : page.path === '/' ? join(OUT, 'index.html') : join(OUT, page.path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  }
  // ねるが追加 FAQ の答えを読むための全文(必要なときだけ取得)。キーは FAQ の id
  const extra = new Set(FAQ_EXTRA.map((f) => f.id));
  writeFileSync(join(OUT, 'faq-full.json'), JSON.stringify(Object.fromEntries(FAQS_FULL.map(({ id, a, say, src, expr, bld, link }) => [id, { ...(extra.has(id) ? { a, say, src, expr, ...(bld ? { bld } : {}), ...(link ? { link } : {}) } : {}), say_alt: SAY_ALT[id] || [] }]))));
  // Service Worker(静的アセットの事前キャッシュ)。ハッシュ付きファイル名を埋め込む。
  const precache = ['/', ...allPages.filter((p) => !p.noCache).map((p) => p.path).filter((p) => p !== '/'), '/manifest.webmanifest', '/ground.png',
    ...Object.values(assets.js), ...Object.values(assets.css)];
  const sw = `// 自動生成(tools/build.mjs)
const V = 'sfcmap-${Date.now().toString(36)}';
const PRE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok && (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/nel/') || u.pathname.startsWith('/voice/') || u.pathname === '/ground.png' || u.pathname === '/faq-full.json')) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; })));
});
`;
  writeFileSync(join(OUT, 'sw.js'), sw);
  const kb = (n) => (n / 1024).toFixed(0) + 'KB';
  const sizes = Object.entries({ ...js.metafile.outputs, ...css.metafile.outputs }).map(([f, m]) => `${f.replace('public/', '')} ${kb(m.bytes)}`);
  console.log(sizes.join('\n'));
  writeFileSync(join(OUT, 'sitemap.xml'), sitemap(allPages));
  writeFileSync(join(OUT, 'robots.txt'), robots());
  console.log(`pages: ${allPages.length}(個別ページ ${allPages.length - pages.length})`);
}

mkdirSync(OUT, { recursive: true });
if (watch) {
  await runBuild();
  const { watch: fsWatch } = await import('node:fs');
  let t; const rebuild = () => { clearTimeout(t); t = setTimeout(() => runBuild().catch((e) => console.error(e.message)), 150); };
  for (const d of ['src', 'tools']) fsWatch(d, { recursive: true }, rebuild);
  console.log('watching…');
} else {
  await runBuild();
}
