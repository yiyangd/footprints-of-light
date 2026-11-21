// 双语 Bilingual
// 游戏只有两种语言模式：'en'（只显示英文）和 'bi'（英文在上、中文在下），默认 'bi'。
// 每段文字是 { en, zh }。bi() 把它变成两个 <span>；English 模式下 CSS 会把 .zh 藏起来，
// 所以切换语言不需要重画任何东西。
import { UI } from '../content';
import type { Bi, Lang } from '../content/types';

/** 语言选择存在浏览器里的名字。沿用旧工作名“光之约”，改了玩家的设置会丢，所以不要改 */
export const LANG_KEY = 'guangzhiyue-lang';

let lang: Lang = 'bi'; // 默认双语
const listeners: Array<() => void> = [];

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** 把文字里的 < > & " 换掉，这样文字放进 HTML 里不会被当成标签 */
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** ESV 用小型大写字母印 LORD（耶和华）。这里只改显示的样子，不改文字本身 */
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

/** 现在是哪种语言模式 */
export const getLang = (): Lang => lang;

/** 语言一变就调用 fn（例如重画那些不是用 bi() 生成的文字） */
export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

/** 切换语言：换掉 <html> 上的类名、几处单语的小字，并把选择存进浏览器 */
export function setLang(v: Lang): void {
  lang = v === 'en' ? 'en' : 'bi';
  // 类名放在 <html> 上：页面头部的小脚本也会先设好，避免一打开先闪一下中文
  const root = document.documentElement;
  root.classList.toggle('lang-en', lang === 'en');
  root.classList.toggle('lang-bi', lang === 'bi');
  document.title = UI.title[lang];
  for (const b of document.querySelectorAll<HTMLElement>('[data-lang]')) {
    b.setAttribute('aria-checked', String(b.dataset.lang === lang));
  }
  const note = document.getElementById('lang-note');
  if (note) note.textContent = UI.langNote[lang];
  const chip = document.getElementById('lang-text');
  if (chip) chip.textContent = UI.langShort[lang];
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* 存不了也没关系 */ }
  for (const fn of listeners) fn();
}

/** 在两种模式之间来回切换（L 键和右上角的地球按钮） */
export function toggleLang(): void {
  setLang(lang === 'en' ? 'bi' : 'en');
}

/** 游戏打开时：读出上次的选择，并照它设置一遍 */
export function initLang(): void {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'bi') lang = v;
  } catch { /* 读不到就用默认 */ }
  setLang(lang);
}
