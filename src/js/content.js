// 本文データ(ビルドとブラウザで共有)。出典は research/freshman_facts.md(2026-10-22 調査)。
// 数字・時間は「2026年度の公式資料」時点。毎年変わるものは公式で確認するよう必ず添える。
import FAQ_INDEX from './faq_index.json' with { type: 'json' };
import TERMS_EXTRA from './terms_extra.json' with { type: 'json' };
import FAQ_META from './faq_meta.json' with { type: 'json' }; // id → { alt: 言い換え質問, rel: 関連する質問の id }
// 基本の FAQ・用語はこのファイル、追加分は research/faq_drafts から tools/faq/merge.mjs が検査して書き出す。ブラウザには質問とキーワードだけ入れ(faq_index.json)、答えの全文は /faq-full.json を必要なときだけ読む(重くしないため)。全文は faq_full.js(ビルド専用)
export const FACT_YEAR = '2026年度の公式資料';
export const DATA_DATE = '2026年10月22日';

const SFCGUIDE = { l: 'SFC GUIDE 2026(公式PDF)', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf' };
const MAPSRC = { l: '慶應義塾 SFC キャンパスマップ', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/map/' };
const FACILITY = { l: '塾生サイト 窓口・学内施設', u: 'https://www.students.keio.ac.jp/sfc/pmei/life/facility/sfc.html' };

export const PERIODS = [
  { n: 1, s: '9:25', e: '10:55', brk: 15 },
  { n: 2, s: '11:10', e: '12:40', brk: 20 },
  { n: 3, s: '13:00', e: '14:30', brk: 15 },
  { n: 4, s: '14:45', e: '16:15', brk: 15 },
  { n: 5, s: '16:30', e: '18:00', brk: 10 },
  { n: 6, s: '18:10', e: '19:40', brk: 10 },
  { n: 7, s: '19:50', e: '21:20', brk: 0 },
];
export const PERIOD_NOTE = '時限は SFC GUIDE 2026 の表です(1コマ90分)。休み時間は時限表の差から計算した値で、公式の記載ではありません。7限は SFC GUIDE に載っていますが、公式の振鈴表ページには1〜6限のみで、実際に開講されるかは確認できていません。';

// よくある質問。a=ページに出す本文(段落の配列)、say=ねるが声で言う短い答え、kw=検索語
export const BASE_FAQS = [
  { id: 'roomcode', cat: 'キャンパス', q: '教室の番号(κ21 など)はどう読むの？', kw: ['教室番号', '読み方', 'κ21', 'カッパ', 'ギリシャ文字', '号室'], expr: 'nikkori',
    a: ['最初のギリシャ文字が建物の名前、続く数字が教室です。たとえば κ21 は「カッパ館」の教室です。このサイトでは、数字の十の位を「階」として扱っています(κ21 → 2階)。', '十の位=階という読み方は、公式教室一覧の並び(κ11〜κ18、κ21〜κ23 など)から考えたもので、公式の説明ではありません。授業の教室は K-Support やシラバスのお知らせで確認してください。'],
    say: 'ギリシャ文字が建物の名前で、そのあとの数字の十の位が階だと考えると分かりやすいよ。ただ、公式の説明はないから、推測なんだ。',
    src: [{ l: 'SFC Classroom(教室一覧)', u: 'https://classroom.sfc.keio.ac.jp/' }], link: { l: '教室を探す', h: '/rooms/' } },
  { id: 'to-shonandai', cat: '通学', q: '湘南台駅からキャンパスへの行き方は？', kw: ['湘南台', 'バス', '通学', '行き方', 'アクセス', '小田急', '相鉄', 'ブルーライン', '神奈中'], expr: 'nikkori',
    a: ['湘南台駅西口の1番のりばから、神奈川中央交通バスの湘23・湘24・湘25系統「慶応大学」行きに乗ります。所要時間は約15分です。途中「慶応中高等部前」にも止まります。', '時刻表は変わるので、神奈中バスの公式サイトで確認してください。'],
    say: '湘南台駅の西口、1番のりばから、神奈中バスの慶応大学行きに乗ってね。だいたい15分だよ。',
    src: [{ l: '慶應義塾 SFC キャンパス案内', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/' }, { l: '神奈川中央交通', u: 'https://www.kanachu.co.jp/' }], link: { l: 'アクセスを見る', h: '/access/' } },
  { id: 'to-tsujido', cat: '通学', q: '辻堂駅からキャンパスへの行き方は？', kw: ['辻堂', 'バス', 'JR', '東海道線', '通学'], expr: 'nikkori',
    a: ['辻堂駅北口の2番のりばから、神奈中バスの辻34系統「慶応大学」行きに乗ります。所要時間は約25分です。辻35系統は「慶応中高降車場」行きなので、大学へ行くときは行き先に注意してください。'],
    say: '辻堂駅の北口、2番のりばから、辻34系統の慶応大学行きだよ。25分くらいかかるよ。',
    src: [{ l: '慶應義塾 SFC キャンパス案内', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/' }], link: { l: 'アクセスを見る', h: '/access/' } },
  { id: 'to-fujisawa', cat: '通学', q: '藤沢駅からも行ける？', kw: ['藤沢駅', '藤沢', 'バス'], expr: 'komari',
    a: ['公式の案内で紹介されているのは湘南台駅と辻堂駅の2駅です。藤沢駅からの直通の案内は、公式資料には見つかりませんでした。バスの路線検索で確認してください。'],
    say: '公式の案内に出ているのは、湘南台駅と辻堂駅の2つだけなんだ。藤沢駅からは、バスの路線検索で調べてみてね。',
    src: [{ l: '神奈川中央交通', u: 'https://www.kanachu.co.jp/' }] },
  { id: 'periods', cat: '授業', q: '1限は何時から？ 授業の時間は？', kw: ['1限', '時限', '時間割', '授業時間', '何時', '振鈴', '開始'], expr: 'nikkori',
    a: ['1限は 9:25〜10:55、2限は 11:10〜12:40、3限は 13:00〜14:30、4限は 14:45〜16:15、5限は 16:30〜18:00、6限は 18:10〜19:40 です(1コマ90分)。', PERIOD_NOTE, '三田・日吉・矢上とは時間が違います(それらの1限は 9:00 開始)。'],
    say: '1限は9時25分から。2限は11時10分、3限は午後1時、4限は2時45分、5限は4時半からだよ。',
    src: [SFCGUIDE], link: { l: '時間割プランナー', h: '/timetable/' } },
  { id: 'break', cat: '授業', q: '休み時間は何分？ 教室移動に間に合う？', kw: ['休み時間', '移動', '間に合う', '徒歩', '何分', '教室移動'], expr: 'komari',
    a: ['時限表から計算すると、休み時間は10〜20分です(1→2限 15分、2→3限 20分、3→4限 15分、4→5限 15分、5→6限 10分)。', 'キャンパスの端から端までは、歩いて10分ほどかかることもあります。「経路・徒歩時間」で、教室から教室までの目安を確認できます。'],
    say: '休み時間は10分から20分くらい。移動が長い日は、経路のページで歩く時間を調べておくと安心だよ。',
    src: [SFCGUIDE], link: { l: '経路・徒歩時間', h: '/route/' } },
  { id: 'cafeteria', cat: '施設', q: '学食・購買・コンビニはどこ？', kw: ['食堂', '学食', '生協', '購買', 'コンビニ', 'ローソン', 'ランチ', 'ごはん', '昼', 'ATM'], expr: 'nikkori', bld: 'sigma',
    a: ['シグマ(Σ)館に、生協食堂(地下1階)、ローソン(地下1階・ATMあり)、生協購買部(1階)があります。', 'お昼だけの学生食堂として、イータヴィレッジのソルトハウス(ソルトダイニング)もあります(公式ページには毎日 11:00〜14:00、臨時休業あり、と記載)。', '営業時間は変わります。生協の公式ページで確認してください。'],
    say: '学食は、シグマ館の地下1階だよ。ローソンも地下1階で、購買は1階にあるよ。',
    src: [{ l: '生協 営業時間', u: 'https://www.univcoop.jp/keio/time/#s05' }, { l: '学食・生協(慶應義塾)', u: 'https://www.keio.ac.jp/ja/sfc/amenities/cafe-coop/' }], link: { l: '施設ガイド', h: '/life/' } },
  { id: 'library', cat: '施設', q: '図書館はどこ？ 何時まで？', kw: ['図書館', 'メディアセンター', 'ライブラリ', '自習', '勉強', '開館'], expr: 'nikkori', bld: 'mu',
    a: ['ミュー(Μ)館にメディアセンター(図書館)があります。学期中の平日は 9:15〜22:00 が基本です。', '開館日・時間は変わるので、開館カレンダーで確認してください。'],
    say: '図書館はミュー館のメディアセンターだよ。学期中の平日は、夜の10時までが基本だよ。',
    src: [{ l: '湘南藤沢メディアセンター 開館カレンダー', u: 'https://www.lib.keio.ac.jp/sfc/calendar/' }], link: { l: 'ミュー館を見る', h: '/map/#b=mu' } },
  { id: 'office', cat: '手続き', q: '履修や証明書の窓口はどこ？', kw: ['窓口', '事務', '学事', '学生課', '証明書', '在学証明', '通学証明', '発行機', 'アルファ', '本館'], expr: 'nikkori', bld: 'alpha',
    a: ['学事(履修・証明書)・学生生活・就職の窓口は、アルファ(Α)館1階です。平日 9:15〜16:30(授業期間・2026年度)です。', '証明書の自動発行機もアルファ館1階の窓口前にあり、月〜土 9:15〜20:00 です(授業・試験のない土曜、日曜、祝日は停止)。コンビニでも発行できます(オンラインで事前申請が必要)。'],
    say: '窓口は、アルファ館の1階だよ。証明書の発行機も、同じ1階にあるよ。',
    src: [FACILITY, SFCGUIDE], link: { l: 'アルファ館を見る', h: '/map/#b=alpha' } },
  { id: 'health', cat: '施設', q: '具合が悪いとき・相談したいときは？', kw: ['保健', '体調', '病院', '診療所', '相談', 'カウンセリング', '心身', 'ウェルネス', '救護'], expr: 'fuan', bld: 'alpha',
    a: ['アルファ(Α)館2階に、心身ウェルネスセンター(保健管理センター・湘南藤沢診療所・学生相談)があります。保健管理センターは月〜金 9:00〜17:30、診療所は 9:15〜12:00 / 13:00〜16:15 です(医師の診察日は要確認)。'],
    say: '具合が悪いときは、アルファ館の2階の、心身ウェルネスセンターへ行ってね。相談もできるよ。',
    src: [{ l: '保健管理センター(SFC)', u: 'https://www.hcc.keio.ac.jp/ja/admissions/sfc.html' }, { l: '学生相談', u: 'https://counseling.sfc.keio.ac.jp/counseling.html' }] },
  { id: 'keiojp', cat: '手続き', q: 'keio.jp(慶應ID)って何？', kw: ['keio.jp', '慶應ID', 'ID', 'ログイン', 'アカウント', 'MFA', '認証'], expr: 'nikkori',
    a: ['慶應の共通認証です。ほぼすべてのサービスの入口になります。入学手続後に、新入生が自分で登録します。', '2026年2月から学生は多要素認証(MFA)が必須、と日吉向けの案内にあります。SFC 向けの案内での確認はできていません。登録の最新手順は、大学から届く案内を見てください。'],
    say: 'keio.jpは、慶應のいろんなサービスに入るための共通のIDだよ。入学の手続きのあとに、自分で登録するんだ。',
    src: [{ l: 'keio.jp', u: 'https://keio.jp/' }, { l: 'SFC ITC: keio.jp', u: 'https://www.sfc.itc.keio.ac.jp/en/keiojp.html' }] },
  { id: 'ksupport', cat: '手続き', q: 'K-Support と K-LMS は何に使うの？', kw: ['K-Support', 'ksupport', 'K-LMS', 'klms', 'LMS', '休講', 'お知らせ', '教室変更', 'レポート', '課題', 'Canvas'], expr: 'komari',
    a: ['K-Support は、事務室からのお知らせや各種申請、登録済み科目の確認ができる窓口です。休講・教室変更などのお知らせも出るので、毎日確認します(見落としの不利益は自己責任と SFC GUIDE に明記されています)。', 'K-LMS は教材の配布・レポート提出・お知らせに使う授業支援システムで、入口は K-Support の上部にあります。'],
    say: 'K-Supportは、毎日見るお知らせの場所だよ。休講や教室の変更もここに出るから、見落とさないでね。',
    src: [SFCGUIDE] },
  { id: 'registration', cat: '授業', q: '履修登録はいつ？ 忘れたらどうなる？', kw: ['履修', '履修申告', '履修登録', '申告', '登録', '単位', '時期', 'いつ', '退学'], expr: 'odoroki',
    a: ['学期ごとに、履修する科目を Web システムで申告します。春学期は4月上旬から、秋学期は9月下旬からです(2026年度の資料)。', '期間内に申告しないと、退学処分になりうると公式に明記されています。登録の完了画面を保存し、CHECK ボタンでエラーを確認してください。', '入学1学期目は、心身ウェルネス・体育1・言語コミュニケーション科目・情報基礎1が指定クラスで自動登録されます。'],
    say: '履修申告は、春学期なら4月のはじめから。期間内に申告しないと、退学になることもあるから、絶対に忘れないでね。',
    src: [{ l: '履修申告(塾生サイト)', u: 'https://www.students.keio.ac.jp/sfc/pmei/class/registration/' }, SFCGUIDE], link: { l: '新入生ガイド', h: '/guide/' } },
  { id: 'byod', cat: '準備', q: 'ノートパソコンは必要？ 何を買えばいい？', kw: ['パソコン', 'PC', 'ノートPC', 'BYOD', 'マック', 'Mac', 'Windows', 'スペック', '買う'], expr: 'komari',
    a: ['入学ガイダンスまでに、自分のノートPCを準備する決まりです(BYOD)。', '公式の推奨は、フルHD、RAM 16GB以上、SSD 256GB以上(512GB以上が望ましい)、Core i5 相当以上または Apple M2 以上、Wi-Fi 5GHz対応、HDMI出力、macOS 14 以降または Windows 11 以降です。Microsoft 365 Apps や MATLAB などは大学契約で無償です。故障時の貸出PCもあります。', '推奨スペックは更新されるので、購入前に公式ページを確認してください。'],
    say: 'パソコンは、自分のノートPCを入学ガイダンスまでに用意するのが決まりなんだ。買う前に、公式のおすすめスペックを見てね。',
    src: [{ l: 'BYOD(塾生サイト)', u: 'https://www.students.keio.ac.jp/sfc/pmei/class/byod/byod.html' }] },
  { id: 'kenkyukai', cat: '用語', q: '研究会って何？', kw: ['研究会', 'ゼミ', '研究', '卒プロ', '卒業プロジェクト'], expr: 'nikkori',
    a: ['SFC のカリキュラムの核で、ゼミに近い少人数の活動です。企業や官公庁との共同研究など、先端的な活動も多くあります(160超)。', '研究会A(週2コマ・4単位)と研究会B(週1コマ・2単位)があり、原則2年生から入りますが、1年生でも担当教員が認めれば参加できます。'],
    say: '研究会は、SFCの学びの中心になる少人数のゼミみたいなものだよ。原則2年生からだけど、1年生でも入れることがあるよ。',
    src: [SFCGUIDE] },
  { id: 'student-id', cat: '手続き', q: '学生証は持ち歩く必要がある？', kw: ['学生証', 'カード', 'IDカード', '窓口'], expr: 'odoroki',
    a: ['学生証は、カード・在籍確認シール・カードケースの3点セットで、卒業まで同じカードを使います。不携帯だと窓口の手続きが一切できない、と SFC GUIDE に書かれています。'],
    say: '学生証は、窓口で手続きをするときに必須だよ。持っていないと何もできないから、いつも持ち歩いてね。',
    src: [SFCGUIDE] },
  { id: 'bike', cat: '通学', q: '自転車・バイク・車で来てもいい？', kw: ['自転車', '駐輪', 'バイク', '車', '駐車', '原付'], expr: 'komari',
    a: ['自転車は、防犯登録をしたものを、北門を入って右手の駐輪場に停めます。バイクはアルファ館1階の窓口で登録が必要です。構内への自動車の乗り入れ・駐車は原則禁止です。', '放置した自転車・バイクは撤去されます。'],
    say: '自転車は、北門を入ってすぐ右の駐輪場だよ。バイクは窓口で登録が必要で、車は構内に入れないよ。',
    src: [SFCGUIDE] },
  { id: 'night', cat: '施設', q: '夜遅くまで残れる？', kw: ['夜', '残留', '徹夜', '泊まり', '深夜'], expr: 'komari',
    a: ['夜間の残留は原則禁止です。科目担当の許可を得た正課活動に限り、事前申請のうえ認められます(23:00〜翌8:00。2026年度の SFC GUIDE)。'],
    say: '夜は原則残れないよ。授業の活動で許可をもらったときだけ、事前に申請してね。',
    src: [SFCGUIDE] },
  { id: 'wifi', cat: '準備', q: '学内のネットワークやWi-Fiは？', kw: ['Wi-Fi', 'wifi', 'ネットワーク', 'CNS', '情報センター', 'KIC', 'VPN', 'プリント'], expr: 'nikkori', bld: 'mu',
    a: ['学内ネットワーク(CNS)の窓口は、ミュー館1階の湘南藤沢情報センター(KIC)にあります。機器の接続方法は ITC の案内ページに載っています。', 'CNS アカウントの扱いは入学年度で変わるので、2027年入学の方は大学からの案内を確認してください。'],
    say: 'ネットワークのことは、ミュー館の1階の情報センターで聞けるよ。接続の方法は、ITCのページにあるよ。',
    src: [{ l: '湘南藤沢情報センター(ITC)', u: 'https://www.sfc.itc.keio.ac.jp/' }] },
  { id: 'chuko', cat: 'キャンパス', q: '中等部・高等部と間違えないか心配', kw: ['中高', '中等部', '高等部', '高校', 'バス停', '降車場'], expr: 'komari',
    a: ['同じ敷地に慶應義塾湘南藤沢中等部・高等部があり、バス停も別にあります。行き先が「慶応大学」のバスは、大学の中心(A「慶応大学」・B「慶応大学本館前」)まで行きます。', '「中高降車場」は中高側の停留所です。辻堂駅の辻35系統のように、行き先が「慶応中高降車場」のバスもあるので、大学へ行くときは行き先を確認してください。', 'このサイトの3D マップでは、中高の建物を灰色で表示しています。'],
    say: '中高と同じ敷地だから、バスの行き先に気をつけてね。大学なら、慶応大学行きに乗るんだよ。',
    src: [MAPSRC, { l: '慶應義塾 SFC キャンパス案内', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/' }] },
  { id: 'kamoike', cat: 'キャンパス', q: '「鴨池」ってどこ？', kw: ['鴨池', 'ガリバー池', '池', 'ラウンジ'], expr: 'nikkori', bld: 'kamoike',
    a: ['ガリバー池の通称が「鴨池」です。キャンパスの中央にあり、鴨池ラウンジ・鴨池テラス・巡回バス「鴨池急行 SoKanKan」の名前の由来です。'],
    say: '鴨池は、キャンパスの真ん中にある、ガリバー池の呼び名だよ。',
    src: [MAPSRC] },
  { id: 'slope', cat: 'キャンパス', q: '坂や階段は多い？ 車いすでも移動できる？', kw: ['坂', '階段', '車いす', 'バリアフリー', 'スロープ', 'エレベーター'], expr: 'fuan',
    a: ['キャンパスには坂や段差があります。公式のバリアフリーマップに、スロープ・階段・エレベーター・車いす対応トイレの位置が載っています。', '公式のバリアフリーマップによると、車いすでバスで来る人は「慶応中高等部前」で降りて、シグマ館を通って入ると、坂が少なくキャンパスに入れます。学内の坂についての細かい注意書きは、確認できませんでした。'],
    say: '坂や階段はあるよ。公式のバリアフリーマップでは、中高等部前で降りて、シグマ館を通ると、坂が少ないって書いてあるよ。',
    src: [{ l: 'バリアフリーマップ(慶應義塾)', u: 'https://www.keio.ac.jp/files/52ee5c4df682fb7d54b3e4580c3f4e2ae377abb09afbc6930e9385174dc55f7c' }, MAPSRC] },
  { id: 'sokankan', cat: '通学', q: 'キャンパス内を回るバスはある？', kw: ['SoKanKan', '鴨池急行', '巡回', '無料バス', '構内バス'], expr: 'nikkori',
    a: ['無料の構内巡回バス「鴨池急行 SoKanKan」があります。停留所は、看護医療学部前・SFC-IV・アルファ館(本館北側)・デルタ館です(公式資料)。'],
    say: 'キャンパスの中をぐるっと回る、無料のバスがあるよ。鴨池急行っていう名前なんだ。',
    src: [SFCGUIDE] },
  { id: 'campus-village', cat: '準備', q: '新入生向けの相談会はある？', kw: ['相談会', 'Campus Village', 'キャンパスビレッジ', 'サークル', 'アルバイト', '寮', '履修相談'], expr: 'wink',
    a: ['学生の福利厚生団体が運営する新入生向け相談会「Campus Village」があります。履修・サークル・寮・アルバイト・通学などを先輩に相談できます。運営は学生で、時期や形式は毎年変わります。'],
    say: '先輩に相談できる、キャンパスビレッジっていう相談会があるよ。時期は毎年変わるから、お知らせを見てね。',
    src: [{ l: '塾生サイト(Campus Village)', u: 'https://www.students.keio.ac.jp/sfc/life/campus-village/notice.html' }] },
];

// SFC のことば
export const BASE_GLOSSARY = [
  { term: '研究会', alias: ['ゼミ', '研究会A', '研究会B'], def: 'SFC の学びの核になる少人数の活動(ゼミに近い)。原則2年生から。' },
  { term: '卒業プロジェクト(卒プロ)', alias: ['卒プロ'], def: '4年生で論文や作品をつくる取り組み。メンターの申請は3年次の後半から。' },
  { term: '総環設置科目', alias: ['総環'], def: '総合政策学部・環境情報学部が開く科目。他学部・他研究科の科目と区別される。' },
  { term: '履修申告', alias: ['履修登録'], def: '履修する科目を学期ごとに登録すること。期間内に申告がないと、退学処分になりうる。' },
  { term: '履修者選抜', alias: ['抽選'], def: '抽選や課題で、授業の履修者を授業開始前に決めること。' },
  { term: '2学期制と4学期制', alias: ['クォーター', '4学期制'], def: '春・秋の2学期制の科目と、前半・後半に分かれる4学期制の科目が混在する。' },
  { term: '学習指導(教員)', alias: ['学習指導'], def: '履修の相談ができる、学部が指定した教員。' },
  { term: 'ガイダンス', alias: [], def: '入学直後と各学期のはじめに行う説明会。欠席した不利益は本人の負担。' },
  { term: 'K-Support', alias: ['ケーサポート'], def: 'お知らせ・申請・登録科目の確認ができる窓口。毎日確認する。' },
  { term: 'K-LMS', alias: ['ケーエルエムエス', 'Canvas'], def: '教材の配布・レポート提出に使う授業支援システム。' },
  { term: 'BYOD', alias: ['ノートPC必携'], def: '自分のノートPCを入学ガイダンスまでに用意する決まり。' },
  { term: 'ガリバー池(鴨池)', alias: ['鴨池'], def: 'キャンパス中央の池。鴨池ラウンジなどの名前の由来。' },
  { term: 'SFS(SFC-SFS)', alias: ['SFS'], def: '古い資料に出てくる旧称のシステム。2026年の SFC GUIDE には登場しない。' },
  { term: '自由科目', alias: [], def: '進級・卒業に必要な単位には含まれない科目。' },
];

// 新入生の最初のステップ(順番に意味がある)
export const GUIDE_WEEK = [
  { id: 'g-keiojp', title: 'keio.jp(慶應ID)を登録する', body: '入学手続のあとに、自分で登録します。ほぼすべてのサービスの入口です。多要素認証(MFA)の設定も案内に従ってください。', faq: 'keiojp' },
  { id: 'g-notice', title: 'お知らせを確認する', body: '新入生お知らせシステムで学籍番号・クラス・ガイダンス資料を確認し、入学後は K-Support を毎日見ます。', faq: 'ksupport' },
  { id: 'g-pc', title: 'ノートPCを準備する', body: '入学ガイダンスまでに、自分のノートPCを用意します(BYOD)。公式のおすすめスペックを確認してから買いましょう。', faq: 'byod' },
  { id: 'g-guidance', title: 'ガイダンスに出る', body: '入学直後に説明会があります。欠席した不利益は本人の負担になります。日程は年度ごとに変わるので、大学からの案内を見てください。', faq: null },
  { id: 'g-registration', title: '履修申告をする', body: '春学期は4月上旬から(2026年度の資料)。期間内に申告しないと、退学処分になりうるので、必ず期間内に。完了画面は保存しておきます。', faq: 'registration' },
  { id: 'g-walk', title: 'キャンパスを歩いて、教室の場所を確かめる', body: '授業が始まる前に、最寄りのバス停から1限の教室まで歩いてみると安心です。このサイトの「経路・徒歩時間」が目安になります。', faq: 'break', suggest: true },
];

// 持ち物・チェックリスト(ブラウザに保存して進み具合を残す)
export const GUIDE_CHECK = [
  { group: '入学前', items: [
    { id: 'c-keiojp', t: 'keio.jp(慶應ID)を登録した' },
    { id: 'c-mfa', t: '多要素認証(MFA)を設定した' },
    { id: 'c-notice', t: '新入生お知らせシステムでクラス・学籍番号を確認した' },
    { id: 'c-pc', t: '公式のおすすめスペックを見て、ノートPCを用意した' },
  ] },
  { group: '入学後すぐ', items: [
    { id: 'c-card', t: '学生証(カード・シール・ケース)を受け取った' },
    { id: 'c-guid', t: 'ガイダンスに出席した' },
    { id: 'c-ksup', t: 'K-Support を見る習慣をつけた(毎日)' },
    { id: 'c-reg', t: '履修申告を期間内に済ませ、完了画面を保存した' },
    { id: 'c-check', t: '履修申告の CHECK ボタンでエラーがないか確認した' },
  ] },
  { group: '通学・キャンパス', items: [
    { id: 'c-bus', t: 'バス乗り場(湘南台は西口1番、辻堂は北口2番)を確認した' },
    { id: 'c-pass', t: '通学定期を用意した(通学証明書は発行機かコンビニで)' },
    { id: 'c-walk', t: '最寄りのバス停から1限の教室まで、歩いて確かめた' },
    { id: 'c-food', t: '学食・購買・コンビニ(シグマ館)の場所を確認した' },
    { id: 'c-lib', t: 'メディアセンター(ミュー館)を見に行った' },
  ] },
];

// 施設ガイド(場所は公式資料。時間は変わるので「公式で確認」)
export const LIFE = [
  { id: 'l-lib', name: 'メディアセンター(図書館)', bld: 'mu', place: 'ミュー館', hours: '学期中の平日 9:15〜22:00 が基本', link: { l: '開館カレンダー', u: 'https://www.lib.keio.ac.jp/sfc/calendar/' }, cat: '学ぶ' },
  { id: 'l-kic', name: '情報センター(CNS 窓口)', bld: 'mu', place: 'ミュー館 1階北側', hours: '平日 9:15〜17:00', link: { l: '湘南藤沢情報センター', u: 'https://www.sfc.itc.keio.ac.jp/' }, cat: '学ぶ' },
  { id: 'l-gakuji', name: '学事窓口(履修・証明書)', bld: 'alpha', place: 'アルファ館 1階', hours: '平日 9:15〜16:30(授業期間・2026年度)', link: { l: '窓口・学内施設', u: 'https://www.students.keio.ac.jp/sfc/pmei/life/facility/sfc.html' }, cat: '手続き' },
  { id: 'l-seikatsu', name: '学生生活の窓口・就職(CDP)', bld: 'alpha', place: 'アルファ館 1階', hours: '平日 9:15〜16:30(2026年度)', link: { l: '窓口・学内施設', u: 'https://www.students.keio.ac.jp/sfc/pmei/life/facility/sfc.html' }, cat: '手続き' },
  { id: 'l-cert', name: '証明書自動発行機', bld: 'alpha', place: 'アルファ館 1階 窓口前', hours: '月〜土 9:15〜20:00(授業・試験のない土曜、日曜、祝日は停止)', link: { l: 'SFC GUIDE 2026', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf' }, cat: '手続き' },
  { id: 'l-health', name: '心身ウェルネスセンター(保健・診療所・学生相談)', bld: 'alpha', place: 'アルファ館 2階', hours: '保健管理センター 月〜金 9:00〜17:30 / 診療所 9:15〜12:00・13:00〜16:15', link: { l: '保健管理センター', u: 'https://www.hcc.keio.ac.jp/ja/admissions/sfc.html' }, cat: '健康' },
  { id: 'l-shokudo', name: '生協食堂(学生食堂)', bld: 'sigma', place: 'シグマ館 地下1階', hours: '生協の公式ページを確認', link: { l: '生協 営業時間', u: 'https://www.univcoop.jp/keio/time/#s05' }, cat: '食べる' },
  { id: 'l-lawson', name: 'ローソン(ATMあり)', bld: 'sigma', place: 'シグマ館 地下1階', hours: '生協の公式ページを確認', link: { l: '生協 営業時間', u: 'https://www.univcoop.jp/keio/time/#s05' }, cat: '食べる' },
  { id: 'l-store', name: '生協購買部(書籍・文具)', bld: 'sigma', place: 'シグマ館 1階', hours: '生協の公式ページを確認', link: { l: '生協 営業時間', u: 'https://www.univcoop.jp/keio/time/#s05' }, cat: '食べる' },
  { id: 'l-salt', name: 'ソルトダイニング(昼のみの学生食堂)', bld: 'salt', place: 'イータヴィレッジ ソルト・ハウス 1階', hours: '毎日 11:00〜14:00(臨時休業あり)', link: { l: '学食・生協', u: 'https://www.keio.ac.jp/ja/sfc/amenities/cafe-coop/' }, cat: '食べる' },
  { id: 'l-subway', name: 'サブウェイ・鴨池テラス(学生ラウンジ)', bld: null, place: '学生ラウンジ(オメガ館の横)', hours: '平日 9:00〜19:00 / 土 10:00〜15:00', link: { l: '学食・生協', u: 'https://www.keio.ac.jp/ja/sfc/amenities/cafe-coop/' }, cat: '食べる' },
  { id: 'l-gym', name: '体育館・ジム', bld: 'gamma', place: 'ガンマ館', hours: '—', link: null, cat: '動く' },
  { id: 'l-bike', name: '駐輪場(自転車)', bld: null, place: '北門を入って右手', hours: '防犯登録した自転車のみ', link: { l: 'SFC GUIDE 2026', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf' }, cat: '通学' },
  { id: 'l-moto', name: 'バイク登録', bld: 'alpha', place: 'アルファ館 1階(学生支援グループ)', hours: '平日 9:15〜16:30', link: { l: 'SFC GUIDE 2026', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf' }, cat: '通学' },
  { id: 'l-locker', name: '貸しロッカー・保守管理室', bld: 'alpha', place: 'アルファ館 1階(保守管理室)', hours: '—', link: null, cat: '手続き' },
];

export const ACCESS = {
  routes: [
    { from: '湘南台駅', lines: '小田急江ノ島線・相鉄いずみ野線・横浜市営地下鉄ブルーライン', bus: '神奈中バス 湘23・湘24・湘25系統「慶応大学」行き', stop: '湘南台駅西口 1番のりば', min: '約15分', note: '途中「慶応中高等部前」にも停車' },
    { from: '辻堂駅', lines: 'JR東海道線', bus: '神奈中バス 辻34系統「慶応大学」行き', stop: '辻堂駅北口 2番のりば', min: '約25分', note: '辻35系統は「慶応中高降車場」行き(中高側)' },
  ],
  campusStops: [
    { k: 'A', n: '慶応大学' }, { k: 'B', n: '慶応大学本館前' }, { k: 'C', n: '中高降車場' }, { k: 'D', n: '慶応中高等部前' },
  ],
  sokankan: [{ k: 'E', n: '看護医療学部前' }, { k: 'F', n: 'SFC-IV' }, { k: 'G', n: 'アルファ館(本館北側)' }, { k: 'H', n: 'デルタ館' }],
  links: [
    { l: '神奈川中央交通(時刻表を検索)', u: 'https://www.kanachu.co.jp/' },
    { l: '慶應義塾 SFC キャンパス案内', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/' },
    { l: 'SFC GUIDE 2026(公式PDF)', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf' },
  ],
};

export const SOURCES = [
  { l: 'SFC GUIDE 2026(公式PDF)', u: 'https://www.students.keio.ac.jp/sfc/pmei/files/sfcguide2026.pdf', n: '時限・窓口・履修・駐輪など' },
  { l: '慶應義塾 SFC キャンパスマップ', u: 'https://www.keio.ac.jp/ja/about/campus/sfc/map/', n: '建物の形・配置・番号' },
  { l: 'SFC バリアフリーマップ(2023年2月版)', u: 'https://www.keio.ac.jp/files/52ee5c4df682fb7d54b3e4580c3f4e2ae377abb09afbc6930e9385174dc55f7c', n: '3D マップの輪郭の元データ' },
  { l: 'SFC Classroom', u: 'https://classroom.sfc.keio.ac.jp/', n: '教室66室の定員・設備・改修年' },
  { l: '塾生サイト 窓口・学内施設', u: 'https://www.students.keio.ac.jp/sfc/pmei/life/facility/sfc.html', n: '窓口の場所と時間' },
  { l: 'BYOD(塾生サイト)', u: 'https://www.students.keio.ac.jp/sfc/pmei/class/byod/byod.html', n: 'ノートPCの推奨スペック' },
  { l: '湘南藤沢メディアセンター', u: 'https://www.lib.keio.ac.jp/sfc/', n: '図書館の開館時間' },
  { l: '保健管理センター(SFC)', u: 'https://www.hcc.keio.ac.jp/ja/admissions/sfc.html', n: '保健・診療' },
];

// 分類は9つに統一(最初の24件は旧分類のまま書いてあるので、ここで寄せる)
const CAT_OLD = { 通学: '通学・入学', 準備: '通学・入学', 授業: '授業・履修', 学ぶ: '授業・履修', 手続き: '手続き・お金', 健康: '健康・安全', 動く: 'キャンパス', 食べる: '施設', 用語: 'キャンパス' };
export const catOf = (f) => ({ ...f, cat: CAT_OLD[f.cat] || f.cat });
export const FAQS = [...BASE_FAQS, ...FAQ_INDEX].map((f) => ({ ...catOf(f), alt: (FAQ_META[f.id] || {}).alt || [], rel: (FAQ_META[f.id] || {}).rel || [] })); // 追加分は a・say などを持たない(brain.js が /faq-full.json から補う)
export const GLOSSARY = [...BASE_GLOSSARY, ...TERMS_EXTRA];
