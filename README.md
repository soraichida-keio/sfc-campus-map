# SFC キャンパスマップ(非公式)

慶應義塾大学 湘南藤沢キャンパス(SFC)の建物と教室を 3D で見て探せる、新入生向けの非公式サイト。
建物・教室の検索、教室から教室までの徒歩時間、時間割プランナー、新入生ガイド、案内キャラ「ねる」(口パク・声つき)。

- 公開: https://sfc-campus-map.affiliate-web-cf.workers.dev (Cloudflare Workers の静的アセット)
- 慶應義塾とは関係のない学生のサイトです。建物の形は公式のバリアフリーマップ、教室情報は SFC Classroom、案内は SFC GUIDE 2026 などをもとにしています(`about` ページに出典と注意)。

## 使い方
```bash
npm install
node tools/build.mjs        # public/ に静的サイトを生成
python3 -m http.server 8791 --directory public   # ローカルで確認(http://localhost:8791)
npx wrangler deploy         # Cloudflare に公開
```

## 構成
- `src/js/` 画面とロジック(`scene.js`=3D、`route.js`=徒歩経路、`nel/`=ねる、`content.js`=本文データ)
- `src/pages/` 各ページの HTML テンプレート、`src/css/` スタイル
- `src/geom.json` 建物の輪郭など、`src/rooms.json` 教室66室
- `public/` 静的アセット(`ground.png`、`nel/`=キャラ画像、`voice/`=事前録音した声、`icons/`)
- `tools/voice/gen.mjs` 声の事前生成(AivisSpeech の「まお」を起動してから実行)
- `tools/pipeline/` 地図データの作り方(公式 PDF から)
- `tools/test/` 単体テスト(`node tools/test/route.test.mjs` など)
- `research/freshman_facts.md` 公式資料の事実調査(出典つき)

## 注意
- 地図の1単位は 1.2787m、北は +x(画像の右)。OpenStreetMap の建物との突き合わせで確認(平均誤差 2.5m)。
- 教室の階は番号の十の位からの推定。歩く時間は目安(階段・坂・混雑は含まない)。
- 声は AivisSpeech(まお)の合成音声(Aivis Common Model License 1.0)。人の声ではなく、公式の声でもない。
- ねるのキャラクター画像は運営者の素材。再利用する場合は運営者に確認。
- 時限・窓口の時間などは 2026 年度の公式資料時点。毎年 `src/js/content.js` を更新する。
