// ねるの「声の台本」の正本。ブラウザ(再生時の表示文)とビルド(音声の事前生成)の両方が、この同じ関数を使う。
// 文面を変えると lineKey が変わり、古い音声は使われない(再生成が必要)。
import ROOMS from '../rooms.json';
import { BLD } from './data.js';
import { SAY } from './say.js';
import { PERIODS } from './content.js';

export const STOCK = {
  greet: 'はじめまして、ねるだよ。SFCのこと、なんでも聞いてね。',
  hello: 'こんにちは！ 何を調べる？',
  thanks: 'どういたしまして！ また聞いてね。',
  who: 'わたしは、ねる。SFCの新入生を案内する、ガイド役だよ。',
  help: '教室の番号や、建物の名前で聞いてね。食堂や図書館の場所、バス停からの歩く時間も答えられるよ。',
  unknown: 'ごめんね、それはまだ分からないんだ。公式サイトで確かめてみてね。',
  unknown2: '教室の番号か、建物の名前で聞いてくれると、すぐ答えられるよ。',
  voiceOn: 'はーい、声をオンにしたよ。',
  mapOpen: '地図で見てみるね。',
  mapHere: 'いま見ている建物のことだね。',
  needTo: 'どこへ行きたいの？ 教室の番号か、建物の名前を教えてね。',
  needFrom: 'どこから行くの？ バス停からでいいなら、そう言ってね。',
  sameB: 'どっちも同じ建物だよ。階段かエレベーターで移動してね。',
  noRoute: 'ごめん、道が見つからなかったよ。',
  roomBig: '大きい教室を、順に並べるね。',
  room4k: '4Kのディスプレイがある教室だよ。',
  roomPc: 'パソコンが使える特別教室は、ラムダ11とラムダ21だよ。',
  roomSmall: '少人数の教室は、こんな感じだよ。',
  noPeriod: 'いまは、授業の時間じゃないみたい。',
  nowHint: '建物をクリックすると、教室が見られるよ。',
  open: 'ページを開くよ。',
  fromBus: 'バス停の、慶応大学本館前から歩くことにするね。',
  detailMore: 'くわしくは、画面の文章と出典に書いてあるよ。質問のページも開けるよ。',
  relMore: '近い質問を出したよ。ボタンを押してね。',
  pickFaq: 'どれのことかな？ 近い質問を出したよ。ボタンを押してね。',
  faqLoad: 'ごめんね、いま詳しい答えを読み込めなかったよ。よくある質問のページで見てみてね。',
};
for (const p of PERIODS) STOCK[`period${p.n}`] = `いまは、${p.n}限の時間だよ。`;

const SZ = { small: '小教室', medium: '中教室', large: '大教室', special: '特別教室', hall: 'ホール' };

export function roomSay(r) {
  const b = BLD[r.b];
  if (r.sz === 'hall') return `${r.c}は、${r.n}人が入れる多目的ホールだよ。`;
  const kind = r.sz === 'special' ? `${r.sub || 'パソコン'}のパソコンがある特別教室` : SZ[r.sz];
  const extra = r.k4 ? '4Kのディスプレイがあるよ。' : r.ac ? '机はアクティブラーニング向けだよ。' : '';
  return `${r.c}は、${b.ja}の、たぶん${r.f}階にある、定員${r.n}人の${kind}だよ。${extra}`;
}
export const buildingSay = (id) => SAY[id] || `${BLD[id].ja}だよ。`;
export const faqSay = (f) => f.say;
export function routeSay(min) {
  if (min <= 8) return `歩いて、約${min}分だよ。地図に線を出したよ。`;
  if (min <= 14) return `歩いて、約${min}分。ちょっと遠いから、余裕を持ってね。`;
  return `歩いて、約${min}分。かなり遠いよ。早めに出てね。`;
}
export const ROUTE_MIN_MAX = 40;
