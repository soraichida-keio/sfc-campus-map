// 建物・カテゴリのメタデータ。
// 出典: 慶應義塾公式キャンパスマップ(湘南藤沢キャンパス)・SFC バリアフリーマップ(2021/2023年版)・SFC Classroom(classroom.sfc.keio.ac.jp)
// 高さ(fl)は公式図のエレベーター表記(例: 1F-5F)などからの目安で、実測値ではありません。

export const CATS = {
  main:     { ja: '本館',            color: '#e11d48', tint: '#fff1f2' },
  lecture:  { ja: '教室棟',          color: '#3b82f6', tint: '#eff6ff' },
  hall:     { ja: '大講義室・ホール', color: '#8b5cf6', tint: '#f5f3ff' },
  research: { ja: '研究・大学院',    color: '#0d9488', tint: '#f0fdfa' },
  life:     { ja: '図書館・食堂・生活', color: '#ca8a04', tint: '#fefce8' },
  sports:   { ja: '体育・運動',      color: '#0891b2', tint: '#ecfeff' },
  club:     { ja: 'クラブハウス',    color: '#db2777', tint: '#fdf2f8' },
  village:  { ja: 'ヴィレッジ・ハウス', color: '#ea580c', tint: '#fff7ed' },
  school:   { ja: '中等部・高等部',  color: '#64748b', tint: '#f8fafc' },
};

// fl: 階数。s=南側ブロック n=北側ブロック m=単棟。
// pri: ラベルの優先度(大きいほど遠くからでも表示)
export const BLD = {
  alpha:   { ja: 'アルファ館', sub: '本館', en: 'Alpha Building (Main)', sym: 'Α', kana: 'あるふぁ', no: 1, cat: 'main', fl: { m: 4 }, pri: 9,
             desc: '本館。履修・証明書・学生生活の窓口が1階に、心身ウェルネスセンターが2階にあります。',
             fac: ['学事・学生生活・就職の窓口(1F)', '証明書自動発行機(1F)', '心身ウェルネスセンター・診療所(2F)', 'エレベーター B1F〜4F', 'AED(1F)'], kw: ['本館', '事務', '救護', '保健'] },
  omega:   { ja: 'オメガ館', sub: '大講義室棟', en: 'Omega Building (Large Lecture Hall)', sym: 'Ω', kana: 'おめが', no: 2, cat: 'hall', fl: { m: 3 }, pri: 8, rooms: true,
             desc: '285〜388席の大教室が4室入る大講義室棟。', fac: ['大教室 Ω11・Ω12・Ω21・Ω22', '2階はスロープ経由で車いす可'], kw: ['大教室', '大講義室', '大きい教室'] },
  mu:      { ja: 'ミュー館', sub: 'メディアセンター', en: 'Mu Building (Media Center)', sym: 'Μ', kana: 'みゅー', no: 3, cat: 'life', fl: { m: 3 }, pri: 9,
             desc: '図書館(メディアセンター)と情報センターが入る建物。', fac: ['メディアセンター(図書館)', '情報センター・CNS 窓口(1F北側)', '槇文彦ルーム', 'スタジオ(B1F)', 'セキュリティゲート'], kw: ['図書館', 'ライブラリ', 'library', 'メディアセンター', '情報センター', '槇', '本', '勉強', '自習'] },
  kappa:   { ja: 'カッパ館', sub: '研究・教室棟', en: 'Kappa Building (Lab & Lecture)', sym: 'κ', kana: 'かっぱ', no: 4, cat: 'lecture', fl: { s: 3, n: 5 }, pri: 8, rooms: true,
             desc: '研究室と教室が入る研究・教室棟。κ11〜κ23の教室があります。', fac: ['教室 11室', 'エレベーター 1F〜5F(北側ブロック)'], kw: ['k'] },
  epsilon: { ja: 'エプシロン館', sub: '研究・教室棟', en: 'Epsilon Building (Lab & Lecture)', sym: 'ε', kana: 'いぷしろん えぷしろん', no: 5, cat: 'lecture', fl: { s: 3, n: 5 }, pri: 8, rooms: true,
             desc: '研究室と教室が入る研究・教室棟。ε11〜ε24の教室があります。', fac: ['教室 12室', '車いす対応トイレ(1F)'], kw: ['e'] },
  iota:    { ja: 'イオタ館', sub: '研究・教室棟', en: 'Iota Building (Lab & Lecture)', sym: 'ι', kana: 'いおた', no: 6, cat: 'lecture', fl: { s: 3, n: 5 }, pri: 8, rooms: true,
             desc: '研究室と教室が入る研究・教室棟。ι11〜ι23の教室があります。', fac: ['教室 11室', 'AED(1F)'], kw: ['i'] },
  omicron: { ja: 'オミクロン館', sub: '研究・教室棟', en: 'Omicron Building (Lab & Lecture)', sym: 'ο', kana: 'おみくろん', no: 7, cat: 'lecture', fl: { s: 3, n: 5 }, pri: 8, rooms: true,
             desc: '研究室と教室が入る研究・教室棟。ο11〜ο18の教室があります。', fac: ['教室 8室'], kw: ['o'] },
  lambda:  { ja: 'ラムダ館', sub: '研究・教室棟', en: 'Lambda Building (Lab & Lecture)', sym: 'λ', kana: 'らむだ', no: 8, cat: 'lecture', fl: { s: 3, n: 5 }, pri: 8, rooms: true,
             desc: '研究室と教室が入る研究・教室棟。λ11〜λ25。PC教室(Windows・Mac)があります。', fac: ['教室 13室', '特別教室(Windows)λ11', '特別教室(Mac)λ21', 'エレベーター 1F〜5F(北側ブロック)'], kw: ['l', 'pc', 'パソコン', 'mac', 'windows'] },
  theta:   { ja: 'シータ館', sub: '多目的ホール', en: 'Theta Building (Lecture Hall)', sym: 'Θ', kana: 'しーた', no: 9, cat: 'hall', fl: { m: 3 }, pri: 8, rooms: true,
             desc: '600人を収容できる多目的ホール。講義のほか各種イベントにも使われます。', fac: ['多目的ホール(600人)', '32面マルチディスプレイ', '車いす対応トイレ(1F)'], kw: ['ホール', 'イベント', 'c'] },
  delta:   { ja: 'デルタ館', sub: '研究棟', en: 'Delta Building (Research)', sym: 'Δ', kana: 'でるた', no: 10, cat: 'research', fl: { m: 2 }, pri: 6,
             desc: '研究棟。', fac: ['エレベーター 1F〜2F', '車いす対応トイレ'], kw: ['研究室'] },
  tau:     { ja: 'タウ館', sub: '大学院棟', en: 'Tau Building (Graduate School)', sym: 'τ', kana: 'たう', no: 11, cat: 'research', fl: { m: 4 }, pri: 7, rooms: true,
             desc: '大学院棟。τ11〜τ32の教室があります。', fac: ['エレベーター 1F〜4F', '教室 6室'], kw: ['大学院', 't', '院'] },
  psi:     { ja: 'サイ館', sub: 'クラブハウス棟', en: 'Psi Building (Clubroom)', sym: 'Ψ', kana: 'さい ぷさい', no: 12, cat: 'club', fl: { m: 3 }, pri: 4,
             desc: 'サークル・部活動の部室が入るクラブハウス棟。', fac: ['部室'], kw: ['部室', 'サークル', 'クラブ', '部活'] },
  phi:     { ja: 'フィー館', sub: 'クラブハウス棟', en: 'Phi Building (Clubroom)', sym: 'Φ', kana: 'ふぃー ふぁい', no: 13, cat: 'club', fl: { m: 3 }, pri: 4,
             desc: 'サークル・部活動の部室が入るクラブハウス棟。', fac: ['部室'], kw: ['部室', 'サークル', 'クラブ', '部活'] },
  gamma:   { ja: 'ガンマ館', sub: '体育館', en: 'Gamma Building (Gymnasium)', sym: 'Γ', kana: 'がんま', no: 14, cat: 'sports', fl: { m: 3 }, pri: 7,
             desc: '体育館。', fac: ['体育館', 'AED(1F)', '車いす対応トイレ'], kw: ['体育', 'ジム', '運動', 'スポーツ'] },
  sigma:   { ja: 'シグマ館', sub: '生協・学生食堂', en: 'Sigma Building (Dining Services)', sym: 'Σ', kana: 'しぐま', no: 15, cat: 'life', fl: { m: 2 }, pri: 9,
             desc: '学食・購買・コンビニが集まる生活の拠点。公式のバリアフリーマップでは、「慶応中高等部前」のバス停からシグマ館を通って入ると坂が少ない、と案内されています。',
             fac: ['生協食堂(B1F)', 'ローソン・ATM(B1F)', '生協購買部(1F)', 'ファカルティクラブ', '鴨池ラウンジ(B1F)'], kw: ['食堂', '学食', '生協', '購買', 'コンビニ', '売店', 'ごはん', 'ランチ', '昼', '食べ', 'kiosk'] },
  kamoike: { ja: '鴨池ラウンジ', sub: '池のほとりのラウンジ', en: 'Kamoike Lounge', sym: '池', kana: 'かもいけ らうんじ', no: 16, cat: 'life', fl: { m: 1 }, pri: 7,
             desc: '鴨池(ガリバー池)のほとりにあるラウンジ。', fac: ['ラウンジ', '飲食スペース(1F)'], kw: ['ラウンジ', '休憩', 'カフェ', '食堂', '池'] },
  guest:   { ja: 'セミナーゲストハウス', sub: '宿泊・研修', en: 'Seminar Guesthouse', sym: 'GH', kana: 'げすとはうす', no: 20, cat: 'life', fl: { m: 2 }, pri: 4,
             desc: 'ゼミ合宿や来訪者向けの宿泊・研修施設。', fac: ['セミナーゲストハウス'], kw: ['宿泊', 'ゲストハウス', '合宿'] },
  zeta:    { ja: 'ゼータ館', sub: '研究棟', en: 'Zeta Building (Research)', sym: 'Ζ', kana: 'ぜーた', no: 22, cat: 'research', fl: { m: 3 }, pri: 6,
             desc: '研究棟。', fac: ['エレベーター 1F〜3F', '車いす対応トイレ(1F)'], kw: ['研究室'] },
  iij:     { ja: 'IIJ ハウス', sub: 'ν棟(ニュー棟)エリア', en: 'IIJ House (Nu Building area)', sym: 'ν', kana: 'にゅー あいあいじぇい', no: 21, cat: 'research', fl: { m: 2 }, pri: 3,
             desc: 'ニュー棟(研究棟)周辺のハウス。公式マップでは ν棟 は番号表示のみで、周辺のハウス群の一帯にあたります。', fac: ['研究棟エリア'], kw: ['nu', 'ニュー', '研究'] },
  ntt:     { ja: 'NTT ドコモハウス', sub: 'ν棟(ニュー棟)エリア', en: 'NTT DoCoMo House (Nu Building area)', sym: 'ν', kana: 'にゅー えぬてぃーてぃー どこも', no: 21, cat: 'research', fl: { m: 2 }, pri: 3,
             desc: 'ニュー棟(研究棟)周辺のハウス。', fac: ['研究棟エリア'], kw: ['nu', 'ニュー', '研究', 'docomo'] },
  dnp:     { ja: 'DNP ハウス', sub: 'ν棟(ニュー棟)エリア', en: 'DNP House (Nu Building area)', sym: 'ν', kana: 'にゅー でぃーえぬぴー', no: 21, cat: 'research', fl: { m: 2 }, pri: 3,
             desc: 'ニュー棟(研究棟)周辺のハウス。', fac: ['研究棟エリア'], kw: ['nu', 'ニュー', '研究'] },
  mori:    { ja: '森アトリエ', sub: 'Mori Atelier', en: 'Mori Atelier', sym: 'M', kana: 'もりあとりえ', no: 0, cat: 'research', fl: { m: 2 }, pri: 3,
             desc: '公式マップに記載のあるアトリエ棟。', fac: [], kw: ['アトリエ'] },
  tateuchi:{ ja: '立内ハウス', sub: 'Tateuchi House', en: 'Tateuchi House', sym: 'T', kana: 'たてうち', no: 0, cat: 'research', fl: { m: 1 }, pri: 2,
             desc: 'テニスコート脇にある小さなハウス。AED が設置されています。', fac: ['AED'], kw: [] },
  archery: { ja: '弓道場', sub: 'Japanese Archery Range', en: 'Japanese Archery Range', sym: '弓', kana: 'きゅうどうじょう', no: 25, cat: 'sports', fl: { m: 1 }, pri: 4,
             desc: '弓道場。', fac: [], kw: ['弓道', '部活'] },
  storage: { ja: 'グラウンド倉庫', sub: '運動場', en: 'Sports Ground Storage', sym: '倉', kana: 'ぐらうんど そうこ', no: 0, cat: 'sports', fl: { m: 1 }, pri: 1,
             desc: '中高グラウンドの倉庫。', fac: [], kw: [] },
  salt:    { ja: 'ソルト・ハウス', sub: 'イータヴィレッジ(食堂)', en: 'Salt House (Eta Village)', sym: 'Η', kana: 'そると はうす いーた', no: 27, cat: 'village', fl: { m: 2 }, pri: 6,
             desc: 'イータヴィレッジの学生食堂(昼食のみ)。', fac: ['ソルトダイニング(昼のみ・毎日 11:00〜14:00、臨時休業あり)', 'AED(1F)', 'エレベーター 1F〜2F'], kw: ['食堂', '学食', 'ランチ', '昼', 'イータ'] },
  rosemary:{ ja: 'ローズマリー・ハウス', sub: 'イータヴィレッジ', en: 'Rosemary House (Eta Village)', sym: 'Η', kana: 'ろーずまりー いーた', no: 27, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'イータヴィレッジの一棟。', fac: [], kw: ['イータ'] },
  basil:   { ja: 'バジル・ハウス', sub: 'イータヴィレッジ', en: 'Basil House (Eta Village)', sym: 'Η', kana: 'ばじる いーた', no: 27, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'イータヴィレッジの一棟。', fac: [], kw: ['イータ'] },
  paprika: { ja: 'パプリカ・ハウス', sub: 'イータヴィレッジ', en: 'Paprika House (Eta Village)', sym: 'Η', kana: 'ぱぷりか いーた', no: 27, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'イータヴィレッジの一棟。', fac: [], kw: ['イータ'] },
  turmeric:{ ja: 'ターメリック・ハウス', sub: 'イータヴィレッジ', en: 'Turmeric House (Eta Village)', sym: 'Η', kana: 'たーめりっく いーた', no: 27, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'イータヴィレッジの一棟。', fac: [], kw: ['イータ'] },
  bstudio: { ja: 'βスタジオ', sub: 'ベータヴィレッジ', en: 'Beta Studio', sym: 'β', kana: 'べーた すたじお', no: 23, cat: 'village', fl: { m: 1 }, pri: 3, desc: 'ベータヴィレッジのスタジオ。', fac: [], kw: ['ベータ', 'beta'] },
  bdome:   { ja: 'βドーム', sub: 'ベータヴィレッジ', en: 'Beta Dome', sym: 'β', kana: 'べーた どーむ', no: 23, cat: 'village', fl: { m: 1 }, pri: 4, desc: 'ベータヴィレッジの円形ドーム。', fac: [], kw: ['ベータ', 'beta'] },
  beta1:   { ja: 'β1', sub: 'ベータヴィレッジ', en: 'Beta 1', sym: 'β', kana: 'べーた', no: 23, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'ベータヴィレッジの一棟。', fac: [], kw: ['ベータ', 'beta'] },
  beta2:   { ja: 'β2', sub: 'ベータヴィレッジ', en: 'Beta 2', sym: 'β', kana: 'べーた', no: 23, cat: 'village', fl: { m: 3 }, pri: 3, desc: 'ベータヴィレッジの一棟。', fac: [], kw: ['ベータ', 'beta'] },
  beta3:   { ja: 'β3', sub: 'ベータヴィレッジ', en: 'Beta 3', sym: 'β', kana: 'べーた', no: 23, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'ベータヴィレッジの一棟。', fac: [], kw: ['ベータ', 'beta'] },
  beta4:   { ja: 'β4', sub: 'ベータヴィレッジ', en: 'Beta 4', sym: 'β', kana: 'べーた', no: 23, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'ベータヴィレッジの一棟。', fac: [], kw: ['ベータ', 'beta'] },
  bfactory:{ ja: 'βファクトリー', sub: 'ベータヴィレッジ', en: 'Beta Factory', sym: 'β', kana: 'べーた ふぁくとりー', no: 23, cat: 'village', fl: { m: 2 }, pri: 3, desc: 'ベータヴィレッジの工房。', fac: [], kw: ['ベータ', 'beta'] },
  hs_south:{ ja: '南校舎・普通教室棟', sub: '中等部・高等部', en: 'JHS/SHS South & Regular Classroom Building', sym: '中高', kana: 'ちゅうこう', no: 24, cat: 'school', fl: { m: 4 }, pri: 5, desc: '慶應義塾湘南藤沢中等部・高等部の校舎。', fac: ['車いす対応トイレ', 'エレベーター B1F〜1F'], kw: ['中高', '中等部', '高等部', '高校', '中学'] },
  hs_shared:{ja: '共用教室棟', sub: '中等部・高等部', en: 'JHS/SHS Shared Classroom Building', sym: '中高', kana: 'ちゅうこう', no: 24, cat: 'school', fl: { m: 4 }, pri: 3, desc: '慶應義塾湘南藤沢中等部・高等部の共用教室棟。', fac: ['エレベーター 1F〜5F'], kw: ['中高', '中等部', '高等部'] },
  hs_gym12:{ ja: '第1・第2体育館', sub: '中等部・高等部', en: 'JHS/SHS 1st & 2nd Gymnasium', sym: '中高', kana: 'ちゅうこう たいいくかん', no: 24, cat: 'school', fl: { m: 3 }, pri: 4, desc: '慶應義塾湘南藤沢中等部・高等部の体育館。', fac: ['AED(1F)'], kw: ['中高', '体育館'] },
  hs_west: { ja: '西校舎・第3体育館', sub: '中等部・高等部', en: 'JHS/SHS West School & 3rd Gymnasium', sym: '中高', kana: 'ちゅうこう', no: 24, cat: 'school', fl: { m: 3 }, pri: 3, desc: '慶應義塾湘南藤沢中等部・高等部の西校舎と第3体育館。', fac: ['AED(1F)'], kw: ['中高', '体育館'] },
  hs_change:{ja: '更衣室', sub: '中等部・高等部', en: 'JHS/SHS Changing Room', sym: '中高', kana: 'こういしつ', no: 24, cat: 'school', fl: { m: 1 }, pri: 1, desc: 'プール脇の更衣室。', fac: [], kw: ['プール'] },
};

// 教室コードの頭文字(ASCII)→ギリシャ文字
export const ASCII2GREEK = { k: 'κ', e: 'ε', i: 'ι', o: 'ο', l: 'λ', w: 'ω', t: 'τ', c: 'θ', h: 'θ' };

export const ROOM_SZ = {
  small:   { ja: '小教室', color: '#38bdf8' },
  medium:  { ja: '中教室', color: '#3b82f6' },
  large:   { ja: '大教室', color: '#8b5cf6' },
  special: { ja: '特別教室(PC)', color: '#f59e0b' },
  hall:    { ja: 'ホール', color: '#ec4899' },
};

// 教室ページ(公式)のURL
const FOLDER = { κ: 'k', ε: 'e', ι: 'i', ο: 'o', λ: 'l', Ω: 'w', τ: 't', θ: 'c' };
export function roomUrl(code) {
  const g = code[0];
  const f = FOLDER[g];
  if (!f) return 'https://classroom.sfc.keio.ac.jp/';
  const n = code.slice(1).replace('館', '');
  return `https://classroom.sfc.keio.ac.jp/class/${f}-to/${f}-${n}.html`;
}
