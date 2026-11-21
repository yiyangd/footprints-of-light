// 把 index.html 里的占位符换成 content/ui.json 里的文字。
// 这一步在打包（和 npm run dev）的时候做，所以玩家拿到的页面里文字已经写好了，一打开就能看到，
// 而页面上的每一段文字仍然只在 content/ui.json 里写一次。
//
// 占位符有两种：
//   <!--ui:page.cover.title-->         一段双语文字，变成英文、中文两个 <span>
//   <!--ui:page.cover.title:blk-->     同上，中文另起一行
//   <!--ui:page.cover.helpDesk:rich--> 同上，文字里的 [[W A S D]] 显示成键盘按键的样子
//   {{ui:text.esvNotice}}              一句单语的文字（标题、版权声明、读屏软件念的文字），原样放进去
// 名字就是它在 ui.json 里的位置。如果那一项是一节经文（有 kind、ref、text），
// 会照旁边名字加 Format 的那一项（例如 verseFormat）拼上引号、出处和译本。
// 下面两行特意写了 .ts：这个文件会被打包配置（vite.config.ts）直接读取，那里要求写全文件名
import { bi, esc, fill } from '../core/text.ts';
import { refText } from './refs.ts';
import type { Bi, Line, UiFile } from './types';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isBi = (v: unknown): v is Bi =>
  isObject(v) && typeof v.en === 'string' && typeof v.zh === 'string' && Object.keys(v).length === 2;
const isLine = (v: unknown): v is Line => isObject(v) && typeof v.kind === 'string' && isBi(v.text);

/** 按名字（例如 page.cover.title）在 ui.json 里找到那一项；找不到就是 undefined */
function lookup(ui: UiFile, key: string): unknown {
  let node: unknown = ui;
  for (const part of key.split('.')) {
    if (!isObject(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** 一节经文：照 Format 那一项拼上引号、出处和译本的名字（AGENTS.md 第 2 条：经文旁要标出 ESV） */
function formatScripture(ui: UiFile, key: string, line: Line): Bi {
  const format = lookup(ui, key + 'Format');
  if (!isBi(format)) throw new Error(`content/ui.json 里 "${key}" 是一节经文，旁边还需要一项 "${key}Format" 说明怎么显示它`);
  if (!line.ref) throw new Error(`content/ui.json 里的经文 "${key}" 缺少出处 ref`);
  const ref = { en: refText(ui.books, line.ref).en, zh: refText(ui.books, line.ref, 'full').zh };
  return fill(format, { text: line.text, ref, version: ui.text.version });
}

/** 和 bi() 一样，但把 [[W A S D]] 变成键盘按键的样子 */
function richBi(t: Bi, cls?: string): string {
  const keys = (s: string): string => esc(s).replace(/\[\[(.+?)\]\]/g, '<kbd>$1</kbd>');
  return `<span class="en">${keys(t.en)}</span><span class="${cls ? `zh ${cls}` : 'zh'}" lang="zh-CN">${keys(t.zh)}</span>`;
}

/** 把页面里所有的占位符换成文字。有占位符找不到对应的文字时直接报错，这样打包会停下来 */
export function fillPageText(html: string, ui: UiFile): string {
  const filled = html.replace(/<!--ui:([\w.]+)((?::\w+)*)-->/g, (placeholder: string, key: string, flagText: string) => {
    const flags = flagText.split(':').filter(Boolean);
    const value = lookup(ui, key);
    if (value === undefined) throw new Error(`index.html 里的占位符 ${placeholder}：content/ui.json 里没有 "${key}" 这一项`);
    let text: Bi;
    if (isLine(value)) text = formatScripture(ui, key, value);
    else if (isBi(value)) text = value;
    else throw new Error(`index.html 里的占位符 ${placeholder}：content/ui.json 里的 "${key}" 不是一段双语文字（要写成 { "en": "...", "zh": "..." }）`);
    const cls = flags.includes('blk') ? 'blk' : undefined;
    return flags.includes('rich') ? richBi(text, cls) : bi(text, cls);
  });
  return filled.replace(/\{\{ui:([\w.]+)\}\}/g, (placeholder: string, key: string) => {
    const value = lookup(ui, key);
    if (typeof value !== 'string') throw new Error(`index.html 里的占位符 ${placeholder}：content/ui.json 里的 "${key}" 应该是一句文字`);
    return esc(value);
  });
}
