// サイトの構成(ビルドとブラウザの両方で使う唯一の正本)。サイドバーは2階層まで。
export const SITE = { url: 'https://sfc-campus-map.affiliate-web-cf.workers.dev', name: 'SFC Map', title: 'SFC キャンパスマップ', tagline: '新入生のための、非公式キャンパスガイド' };

export const NAV = [
  { group: 'はじめに', items: [
    { id: 'home', path: '/', label: 'ホーム', icon: 'home' },
    { id: 'guide', path: '/guide/', label: '新入生ガイド', icon: 'guide', top: true },
    { id: 'faq', path: '/faq/', label: 'よくある質問', icon: 'faq', top: true, opt: true },
  ] },
  { group: 'キャンパス', items: [
    { id: 'map', path: '/map/', label: 'マップ', icon: 'map', top: true },
    { id: 'rooms', path: '/rooms/', label: '教室を探す', icon: 'rooms', top: true },
    { id: 'life', path: '/life/', label: '施設ガイド', icon: 'life', top: true, opt: true },
    { id: 'access', path: '/access/', label: 'アクセス', icon: 'bus', top: true, opt: true },
  ] },
  { group: 'ツール', items: [
    { id: 'route', path: '/route/', label: '経路・徒歩時間', icon: 'route', top: true },
    { id: 'timetable', path: '/timetable/', label: '時間割', icon: 'timetable', top: true },
  ] },
  { group: 'このサイト', items: [
    { id: 'about', path: '/about/', label: 'このサイトについて', icon: 'info' },
  ] },
];

// モバイルの下タブ(最大5)
export const TABS = [
  { id: 'home', path: '/', label: 'ホーム', icon: 'home' },
  { id: 'map', path: '/map/', label: 'マップ', icon: 'map' },
  { id: 'rooms', path: '/rooms/', label: '教室', icon: 'rooms' },
  { id: 'guide', path: '/guide/', label: 'ガイド', icon: 'guide' },
];

export const flatNav = () => NAV.flatMap((g) => g.items);
