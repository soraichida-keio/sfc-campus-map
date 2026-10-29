// 音声合成の読み替え。画面には「κ21」と出し、声には「カッパにじゅういち」と読ませる。
const GREEK = { κ: 'カッパ', ε: 'イプシロン', ι: 'イオタ', ο: 'オミクロン', λ: 'ラムダ', ω: 'オメガ', Ω: 'オメガ', θ: 'シータ', Θ: 'シータ', τ: 'タウ', σ: 'シグマ', Σ: 'シグマ', Δ: 'デルタ', δ: 'デルタ', ζ: 'ゼータ', Ζ: 'ゼータ', ν: 'ニュー', η: 'イータ', Η: 'イータ', β: 'ベータ', α: 'アルファ', Α: 'アルファ', Μ: 'ミュー', μ: 'ミュー', Γ: 'ガンマ', Ψ: 'サイ', Φ: 'ファイ' };
const WORDS = [
  [/SFC/g, 'エスエフシー'], [/ORF/g, 'オーアールエフ'], [/GPA/g, 'ジーピーエー'], [/JR/g, 'ジェイアール'], [/BYOD/g, 'バイオーディー'], [/ITC/g, 'アイティーシー'], [/K-LMS/gi, 'ケーエルエムエス'], [/keio\.jp/gi, 'ケイオーどっとジェイピー'], [/ITC/g, 'アイティーシー'], [/SFS/g, 'エスエフエス'],
  [/4K/g, 'フォーケー'], [/PC/g, 'ピーシー'], [/Wi-?Fi/gi, 'ワイファイ'], [/AED/g, 'エーイーディー'], [/Windows/gi, 'ウィンドウズ'], [/\bMac\b/g, 'マック'],
  [/IIJ/g, 'アイアイジェイ'], [/NTT/g, 'エヌティーティー'], [/DNP/g, 'ディーエヌピー'], [/DoCoMo/gi, 'ドコモ'], [/ID/g, 'アイディー'],
  [/β/g, 'ベータ'], [/鴨池/g, 'かもいけ'], [/湘南台/g, 'しょうなんだい'], [/辻堂/g, 'つじどう'], [/慶應/g, 'けいおう'], [/履修/g, 'りしゅう'],
  [/~|〜/g, 'から'], [/%/g, 'パーセント'], [/\//g, '、'],
];
export function ttsRead(text) {
  let s = String(text);
  for (const [re, r] of WORDS) s = s.replace(re, r);
  // 「κ21」「Ω館」のようなギリシャ文字
  s = s.replace(/[A-Za-zα-ωΑ-Ω]/g, (c) => GREEK[c] || c);
  s = s.replace(/B1F/g, 'ちか1かい').replace(/(\d)F/g, '$1かい');
  return s;
}

// 文章の鍵(音声ファイル名)。FNV-1a 32bit → base36。表示用の文と音声ファイルを確実に対応させる。
export function lineKey(spoken, voiceTag = 'v1') {
  const s = voiceTag + '|' + spoken;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, '0');
}
export const VOICE_TAG = 'v1';
