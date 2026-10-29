// ビルド専用: 答えの全文つきの FAQ(FAQ ページの HTML・音声の事前生成・/faq-full.json に使う)。ブラウザのコードからは読み込まない。
import FAQ_EXTRA from './faq_extra.json' with { type: 'json' };
import { BASE_FAQS, catOf } from './content.js';
export { FAQ_EXTRA };
export const FAQS_FULL = [...BASE_FAQS, ...FAQ_EXTRA].map(catOf);
