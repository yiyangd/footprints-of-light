// 把文字变成 HTML 的小工具。
// 这个文件故意不引用任何别的文件：这样游戏（core/i18n.ts）和打包设置（vite.config.ts 填 index.html 里的文字）
// 用的是同一份代码，双语文字在哪里都长得一样。

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** 把文字里的 < > & " 换掉，这样文字放进 HTML 里不会被当成标签 */
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** ESV 用小型大写字母印 LORD（耶和华）。这里只改显示的样子，不改文字本身 */
const smallCapsLord = (s: string): string => s.replace(/\bLORD\b/g, '<span class="sc">Lord</span>');

/**
 * 把一段双语文字变成 HTML：英文和中文各一个 <span>；English 模式下 CSS 会把 .zh 藏起来。
 * cls = 'blk'：中文另起一行（段落用）；不写：中文跟在英文后面（标签、按钮用）。
 */
export function bi(t: { en: string; zh: string } | string | number | null | undefined, cls?: string): string {
  if (t == null) return '';
  if (typeof t !== 'object') return esc(t);
  const zhClass = cls ? `zh ${cls}` : 'zh';
  return `<span class="en">${smallCapsLord(esc(t.en))}</span><span class="${zhClass}" lang="zh-CN">${esc(t.zh)}</span>`;
}
