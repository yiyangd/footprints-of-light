// 屏幕下方的提示：一句话，过几秒自己消失。
import { HINTS } from '../content';
import type { Bi } from '../content/types';
import { $, IS_TOUCH } from '../core/env';
import { bi } from '../core/i18n';

let hintTimer = 0;

/** 显示一条提示，sec 秒后消失 */
export function hint(text: Bi, sec = 6): void {
  const h = $('hint');
  h.innerHTML = bi(text, 'blk');
  h.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => h.classList.remove('show'), sec * 1000);
}

/** 某个剧情节点结束后，如果内容里给它写了操作提示，就显示出来 */
export function afterBeatHint(beatId: string): void {
  const H = HINTS[beatId];
  if (!H) return;
  // 有些提示分手机 / 电脑两种
  const text = 'en' in H ? H : (IS_TOUCH ? H.touch : H.desk);
  setTimeout(() => hint(text, 7), 1600);
}
