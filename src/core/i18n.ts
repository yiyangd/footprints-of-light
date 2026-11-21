// 双语 Bilingual
// 游戏只有两种语言模式：'en'（只显示英文）和 'bi'（英文在上、中文在下），默认 'bi'。
// 这个文件管“现在是哪种模式”和切换；把文字变成 HTML 的小工具（bi、fill、join）在 text.ts 里。
import { UI } from '../content';
import type { Lang } from '../content/types';

export { bi, esc, fill, join } from './text';

/** 语言选择存在浏览器里的名字。沿用旧工作名“光之约”，改了玩家的设置会丢，所以不要改 */
export const LANG_KEY = 'guangzhiyue-lang';

let lang: Lang = 'bi'; // 默认双语
const listeners: Array<() => void> = [];

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
