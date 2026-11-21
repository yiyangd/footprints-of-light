// 把双语文字变成 HTML 的小工具。
// 每段文字是 { en, zh }。bi() 把它变成两个 <span>；English 模式下 CSS 会把 .zh 藏起来，
// 所以切换语言不需要重画任何东西。
// 这个文件不依赖别的代码，游戏运行时和打包时（src/content/page-text.ts）都用它；测试见 i18n.test.ts。
import type { Bi } from '../content/types';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** 把文字里的 < > & " 换掉，这样文字放进 HTML 里不会被当成标签 */
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** 英文圣经用小型大写字母印 LORD（耶和华）。这里只改显示的样子，不改文字本身 */
const smallCapsLord = (s: string): string => s.replace(/\bLORD\b/g, '<span class="sc">Lord</span>');

/**
 * 把一段双语文字变成 HTML。
 * cls = 'blk'：中文另起一行（段落用）；不写：中文跟在英文后面（标签、按钮用）。
 */
export function bi(t: Bi | string | number | null | undefined, cls?: string): string {
  if (t == null) return '';
  if (typeof t !== 'object') return esc(t);
  const zhClass = cls ? `zh ${cls}` : 'zh';
  return `<span class="en">${smallCapsLord(esc(t.en))}</span><span class="${zhClass}" lang="zh-CN">${esc(t.zh)}</span>`;
}

/**
 * 把文字里的 {名字} 换成实际的值。
 * fill({ en: '{n} collected', zh: '已收集 {n}' }, { n: '3/7' }) → { en: '3/7 collected', zh: '已收集 3/7' }
 */
export function fill(t: Bi, vars: Record<string, string | number | Bi>): Bi {
  const replace = (s: string, which: 'en' | 'zh'): string =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = vars[k];
      return v && typeof v === 'object' ? v[which] : String(v);
    });
  return { en: replace(t.en, 'en'), zh: replace(t.zh, 'zh') };
}

/** 把几段文字连起来。单独的字符串（例如 ' · '）两种语言里都会用到 */
export function join(...parts: Array<Bi | string>): Bi {
  return {
    en: parts.map((p) => (typeof p === 'object' ? p.en : p)).join(''),
    zh: parts.map((p) => (typeof p === 'object' ? p.zh : p)).join(''),
  };
}
