// 闪一下：整个屏幕盖上一层白（或黑），再慢慢淡掉。“要有光”和掉进水里重来时用。
import { $ } from './env';

/**
 * @param color 白色还是黑色
 * @param peak  最亮（最黑）的时候有多不透明，0 到 1
 * @param hold  停留多少秒再开始淡掉
 */
export function flash(color: 'white' | 'black', peak = 0.8, hold = 0.25): void {
  const f = $('fade');
  f.classList.toggle('black', color === 'black');
  f.style.transition = 'opacity .35s ease';
  f.style.opacity = String(peak);
  setTimeout(() => {
    f.style.transition = 'opacity 1.6s ease';
    f.style.opacity = '0';
  }, hold * 1000);
}
