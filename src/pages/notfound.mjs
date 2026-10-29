import { head } from './util.mjs';
export default {
  id: 'notfound', path: '/404', file: '404.html', noCache: true, layout: 'wide', script: null, title: 'ページが見つかりません',
  desc: 'お探しのページは見つかりませんでした。',
  body: `<div class="wrap" style="padding:calc(var(--nav-h) + 80px) 0 40px;min-height:70vh">${head('404', 'ページが見つかりません。', 'アドレスが違うか、ページが移動したかもしれません。')}
  <div class="btns"><a class="btn primary" href="/">ホームへ</a><a class="btn plain" href="/map/">マップを開く</a><button class="btn plain" type="button" data-ask="できることを教えて">ねるに聞く</button></div></div>`,
};
