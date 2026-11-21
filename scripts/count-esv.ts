// 数一数游戏里用了多少节 ESV 经文。用法：npm run count:esv
// 每次加了经文都要运行，并把结果写进回复（AGENTS.md 第 2 条）。超过 500 节会报错停下来。
import { countEsv, ESV_SHARE_LIMIT, ESV_VERSE_LIMIT } from '../src/content/esv-count';
import type { EpisodeFile, UiFile } from '../src/content/types';
import { episodeFiles, readJson } from './read-content';

const percent = (x: number): string => `${(x * 100).toFixed(1)}%`;

const episodes = episodeFiles().map((file) => readJson(file) as EpisodeFile);
const ui = readJson('content/ui.json') as UiFile;
const count = countEsv(episodes, ui);

const books = Object.entries(count.perBook).map(([book, n]) => `${ui.books[book]?.zhFull ?? book} ${n} 节`).join('，');
console.log(`ESV 经文：${count.verses.length} 节（上限 ${ESV_VERSE_LIMIT}）。其中 ${books}`);
console.log(`陶片和信物的说明里提到的出处：${count.mentioned.join('、') || '无'}（如果那里直接引用了 ESV 原文，也要算进去）`);
console.log(`经文占英文文字：${percent(count.shareOfEnglish)}；占中英文全部文字：约 ${percent(count.shareOfAll)}（指引上限 ${percent(ESV_SHARE_LIMIT)}）`);
if (count.shareOfAll > ESV_SHARE_LIMIT) {
  console.log('提醒：经文占全部文字的比例超过了指引的上限，公开发布前请带领人向 Crossway 确认（见 CREDITS.md）');
}
if (count.verses.length > ESV_VERSE_LIMIT) {
  console.error(`✗ 已经超过 ${ESV_VERSE_LIMIT} 节：请先停下来，由带领人向 Crossway 申请书面许可（见 CREDITS.md）`);
  process.exit(1);
}
