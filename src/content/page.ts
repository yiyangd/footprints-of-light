// 把 index.html 里的“记号”换成 content/ui.json 里的文字。
//
// index.html 里不写死任何给玩家看的文字（AGENTS.md 第 3 条），只留这样的记号：
//   {{bi:page.hud.map}}          一段双语文字，中文跟在英文后面（按钮、标签）
//   {{blk:page.start.title}}     一段双语文字，中文另起一行（标题、段落）
//   {{keys:page.start.helpDesk}} 和 blk 一样，并且把 [W] 这样方括号里的按键画成键帽
//   {{text:aria.scene}}          不分语言的一行字（读屏软件念的说明、版权声明）
// 冒号后面是这段文字在 ui.json 里的位置，一层一层用点连起来。
//
// 打包（npm run build）和开发（npm run dev）时，vite.config.ts 会调用 fillPage，
// 所以浏览器拿到的 index.html 已经是填好字的，页面一打开就有字。
//
// 这个文件是打包设置直接运行的，所以只引用 core/html.ts 一个文件，而且引用时要写上 .ts。
import { bi, esc } from '../core/html.ts';

/** 记号的写法：{{做法:位置}} */
const MARK = /\{\{(\w+):([\w.-]+)\}\}/g;

const isBi = (v: unknown): v is { en: string; zh: string } =>
  !!v && typeof v === 'object' && typeof (v as { en: unknown }).en === 'string' && typeof (v as { zh: unknown }).zh === 'string';

/** 照着 'page.start.title' 这样的位置，一层一层往里找 */
function lookUp(ui: unknown, path: string): unknown {
  let here = ui;
  for (const key of path.split('.')) {
    if (!here || typeof here !== 'object') return undefined;
    here = (here as Record<string, unknown>)[key];
  }
  return here;
}

/** 把 [W] 这样的按键变成键帽 <kbd>W</kbd> */
const keycaps = (html: string): string => html.replace(/\[([^\]]+)\]/g, '<kbd>$1</kbd>');

/** 一个记号换成什么。写错了就抛出错误，错误里说清楚是哪个记号、错在哪 */
function render(ui: unknown, how: string, path: string): string {
  const value = lookUp(ui, path);
  if (value === undefined) throw new Error(`content/ui.json 里没有 ${path}`);
  if (how === 'text') {
    if (typeof value !== 'string') throw new Error(`${path} 应该是一行字（text 只能用在不分语言的文字上）`);
    return esc(value);
  }
  if (!isBi(value)) throw new Error(`${path} 应该是 { en, zh }`);
  if (how === 'bi') return bi(value);
  if (how === 'blk') return bi(value, 'blk');
  if (how === 'keys') return keycaps(bi(value, 'blk'));
  throw new Error(`不认识的做法 ${how}（只有 bi、blk、keys、text 四种）`);
}

/** 检查 html 里的每一个记号，把有问题的列出来（npm run validate:content 用）。没有问题就是空的。ui 是 ui.json 的内容 */
export function checkPage(html: string, ui: unknown): string[] {
  const problems: string[] = [];
  for (const [mark, how, path] of html.matchAll(MARK)) {
    try { render(ui, how, path); } catch (e) { problems.push(`${mark}：${(e as Error).message}`); }
  }
  // 去掉写对了的记号以后，如果还剩下 {{，说明有一个记号写得不对（例如少了冒号）
  const left = html.replace(MARK, '').match(/\{\{[^}]*\}?\}?/);
  if (left) problems.push(`${left[0]}：记号要写成 {{bi:page.start.title}} 这样`);
  return problems;
}

/** 把 html 里所有的记号都换成文字。有一个记号写错就报错，免得把“{{…}}”原样显示给玩家 */
export function fillPage(html: string, ui: unknown): string {
  const problems = checkPage(html, ui);
  if (problems.length) throw new Error(`index.html 里的文字记号有问题：\n  ${problems.join('\n  ')}`);
  return html.replace(MARK, (_, how: string, path: string) => render(ui, how, path));
}
