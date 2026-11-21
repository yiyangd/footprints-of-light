// 检查 content/ 下的内容有没有写错。用法：npm run validate:content
//
// 查三样：
//   1. content/episodes/*.json（每一章）和 content/ui.json（界面文字）的形状对不对
//   2. 文件之间互相提到的东西对不对得上（奖励、书卷名、提示……）
//   3. index.html 里的文字记号 {{…}} 在 ui.json 里都找得到
// 检查的规矩写在 src/content/schema.ts 和 src/content/validate.ts 里。
import fs from 'node:fs';
import path from 'node:path';
import { EPISODE_FILES } from '../src/content/index';
import { checkPage } from '../src/content/page';
import { findTodos, validateContent } from '../src/content/validate';
import type { Loaded, Problem } from '../src/content/validate';

const ROOT = path.resolve(import.meta.dirname, '..');
const EPISODE_DIR = 'content/episodes';
const UI_FILE = 'content/ui.json';

const problems: Problem[] = [];

/** 读一个 JSON 文件；连 JSON 的写法都不对（少了逗号、引号）就记下来 */
function load(file: string): Loaded | null {
  try {
    return { file, data: JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) };
  } catch (e) {
    problems.push({ file, where: '（整个文件）', message: `读不了，JSON 的写法有错（常见的是少了逗号或引号）：${(e as Error).message}` });
    return null;
  }
}

const episodeNames = fs.readdirSync(path.join(ROOT, EPISODE_DIR)).filter((name) => name.endsWith('.json')).sort();
const episodes = episodeNames.map((name) => load(`${EPISODE_DIR}/${name}`));
const ui = load(UI_FILE);
const loaded = [...episodes, ui].filter((f): f is Loaded => f !== null);

// 文件都读得进来，才接着查里面的内容
if (!problems.length && ui) problems.push(...validateContent(episodes as Loaded[], ui));

// index.html 里的文字记号
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const marks = html.match(/\{\{/g)?.length ?? 0;
if (ui) for (const message of checkPage(html, ui.data)) problems.push({ file: 'index.html', where: '文字记号', message });

// 打印结果：一个文件一段
const files = [...episodeNames.map((name) => `${EPISODE_DIR}/${name}`), UI_FILE, 'index.html'];
for (const file of files) {
  const mine = problems.filter((p) => p.file === file);
  console.log(mine.length ? `✗ ${file}` : `✓ ${file}`);
  for (const p of mine) console.log(`    ${p.where}：${p.message}`);
}
console.log(`\n查了 ${episodeNames.length} 章、界面文字，和 index.html 里的 ${marks} 个文字记号。`);

// 提醒（不算错）：还没登记的章节、还没补上的经文
const registered = new Set(EPISODE_FILES.map((ep) => ep.id));
for (const ep of episodes) {
  const id = (ep?.data as { id?: unknown } | undefined)?.id;
  if (ep && typeof id === 'string' && !registered.has(id)) {
    console.log(`提醒：${ep.file} 还没有在 src/content/index.ts 里登记，游戏里不会出现这一章。`);
  }
}
const todos = findTodos(loaded);
for (const t of todos) console.log(`提醒：${t.file} 的 ${t.where} 还写着 ${t.message}，要请人照圣经补上（不能凭记忆写）。`);

if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题。改好以后再运行一次 npm run validate:content。`);
  process.exit(1);
}
console.log('全部通过。');
