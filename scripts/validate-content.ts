// 检查 content/ 下的 JSON 有没有写错。用法：npm run validate:content
// 写错的地方会一条一条列出来：哪个文件、哪一项、怎么了。全部正确才会通过。
// 检查的规则在 src/content/schema.ts 和 src/content/check.ts。
import { checkContent, formatProblem } from '../src/content/check';
import { DRAFT_EFFECT_NAMES, EFFECT_NAMES } from '../src/episodes/effect-names';
import { EpisodeFileSchema } from '../src/content/schema';
import { findScripture, sourceText, type Source } from '../src/content/scripture';
import { draftFiles, episodeFiles, readJson, readText, scriptureSources } from './read-content';

/** 一份草稿的情况：格式、还剩几处 TODO、经文和原文一不一样、效果名代码里有没有 */
function draftReport(file: string, sources: Source[]): string[] {
  const data = readJson(file);
  const result = EpisodeFileSchema.safeParse(data);
  const todo = (readText(file).match(/TODO\(经文\)/g) ?? []).length;
  const report = [result.success ? '格式没问题' : `格式有 ${result.error.issues.length} 处问题`, `还有 ${todo} 处 TODO(经文) 等人补`];
  // 经文：和原文不一样的有几行（还写着 TODO 的不算）
  let different = 0;
  for (const { line } of findScripture(data)) {
    for (const source of sources) {
      const text = line.text[source.lang];
      try { if (!text.includes('TODO(') && text !== sourceText(source, line.ref)) different++; } catch { different++; }
    }
  }
  report.push(different ? `有 ${different} 处经文和原文不一样（运行 npm run fill:scripture）` : '经文和原文一致');
  // 效果名
  const used = [...readText(file).matchAll(/"(?:fx|after)": "(\w+)"/g)].map((m) => m[1]);
  const unknown = [...new Set(used.filter((name) => !DRAFT_EFFECT_NAMES.includes(name)))];
  report.push(unknown.length ? `有 ${unknown.length} 个效果代码里还没有：${unknown.join('、')}` : '效果名代码里都有');
  return report;
}

function main(): number {
  const files = episodeFiles();
  let input;
  try {
    input = {
      episodes: Object.fromEntries(files.map((file) => [file, readJson(file)])),
      ui: { file: 'content/ui.json', data: readJson('content/ui.json') },
      pageHtml: readText('index.html'),
      effectNames: EFFECT_NAMES,
      sources: scriptureSources(),
    } satisfies Parameters<typeof checkContent>[0] & { sources: Source[] };
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

  // 草稿（content/drafts/）还没有进游戏：有问题也只是提醒，不算错误
  for (const file of draftFiles()) console.log(`草稿 ${file}：${draftReport(file, input.sources).join('，')}`);

  if (problems.length) {
    console.error(`内容里有 ${problems.length} 处问题：\n`);
    for (const p of problems) console.error(formatProblem(p) + '\n');
    return 1;
  }
  console.log(`内容检查通过：${files.length} 个章节文件 + content/ui.json`);
  return 0;
}

process.exit(main());
