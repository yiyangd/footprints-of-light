// 左上角的“时间线”：现在在哪卷书、哪一刻，以及创造七日的七个小圆点。
import { isDone } from '../collect/save';
import { EPISODES, refText, UI } from '../content';
import type { Beat } from '../content/types';
import { $ } from '../core/env';
import { bi, fill, getLang } from '../core/i18n';

/** 把时间线换成这个剧情节点的标题 */
export function setHud(b: Beat): void {
  const book = b.hud.book ?? EPISODES[b.ep]?.book;
  if (book) {
    // 英文显示书卷名加章节（Genesis 1:1–2:3），中文只显示书卷名（创世记）
    $('tl-book').innerHTML = bi({ en: refText(book).en, zh: refText(book, 'name').zh });
  }
  $('tl-label').innerHTML = bi(b.hud.label);
  $('tl-sub').innerHTML = bi(b.hud.sub);
  // 七个小圆点只在“创造七日”这一章显示
  $('tl-days').style.display = b.ep === 'creation' ? '' : 'none';
}

/** 重画七个小圆点：走完第几日，第几个就亮起来 */
export function setDays(): void {
  const d = $('tl-days');
  d.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const el = document.createElement('i');
    if (isDone('day' + i)) el.className = 'on';
    // 鼠标停在圆点上时显示“第几日”
    const t = fill(UI.day, { n: { en: String(i), zh: UI.dayNums[i - 1] } }); // Day 1 / 第一日
    el.title = getLang() === 'en' ? t.en : `${t.en} · ${t.zh}`;
    d.appendChild(el);
  }
}
