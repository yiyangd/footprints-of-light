// 检查 content/ 下的 JSON 有没有写错。用法：npm run validate:content
// 写错的地方会一条一条列出来：哪个文件、哪一项、怎么了。全部正确才会通过。
// 检查的规则在 src/content/schema.ts 和 src/content/check.ts。
import { checkContent, formatProblem } from '../src/content/check';
import { EFFECT_NAMES } from '../src/episodes/effect-names';
import { episodeFiles, readJson, readText } from './read-content';

function main(): number {
  const files = episodeFiles();
  let input;
  try {
    input = {
      episodes: Object.fromEntries(files.map((file) => [file, readJson(file)])),
      ui: { file: 'content/ui.json', data: readJson('content/ui.json') },
      pageHtml: readText('index.html'),
      effectNames: EFFECT_NAMES,
      scripture: (readJson('content/scripture/bsb.json') as { verses: Record<string, string> }).verses,
    };
  } catch (e) {
    console.error(`✗ ${(e as Error).message}`);
    return 1;
  }

  const problems = checkContent(input);
  // 章节文件放进了文件夹，但游戏还不知道它：提醒一下（不算错误）
  const loader = readText('src/content/index.ts');
  for (const file of files) {
    if (!loader.includes(file.replace('content/', ''))) console.warn(`提醒：${file} 还没有在 src/content/index.ts 里登记，游戏里看不到它`);
  }

  if (problems.length) {
    console.error(`内容里有 ${problems.length} 处问题：\n`);
    for (const p of problems) console.error(formatProblem(p) + '\n');
    return 1;
  }
  console.log(`内容检查通过：${files.length} 个章节文件 + content/ui.json`);
  return 0;
}

process.exit(main());
