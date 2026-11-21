// 运行环境：是不是触屏、是不是调试模式，以及在页面上找元素的小工具。

/** 是不是触屏设备（手机、平板） */
export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

/** 网址末尾加 #debug 就打开调试模式：显示帧率，控制台里可以用 __gzy */
export const DEBUG = location.hash === '#debug';

/**
 * 按 id 找页面上的元素（index.html 里写着 id="..." 的那些）。
 * 找不到就直接报错，免得后面出现更难懂的错误。
 */
export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`index.html 里找不到 id 为 "${id}" 的元素`);
  return el;
}
