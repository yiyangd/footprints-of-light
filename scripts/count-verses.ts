// 数一数用了多少节经文，每一章还缺哪些节。用法：npm run count:verses
// 规矩是“经文一节都不跳过”，所以每一章都应该显示“齐了”。
import { countVerses } from '../src/content/verse-count';
import type { EpisodeFile, UiFile } from '../src/content/types';
import { episodeFiles, readJson } from './read-content';

const episodes = episodeFiles().map((file) => readJson(file) as EpisodeFile);
const ui = readJson('content/ui.json') as UiFile;
const source = (readJson('content/scripture/bsb.json') as { verses: Record<string, string> }).verses;
const count = countVerses(episodes, [ui], source);

const books = Object.entries(count.perBook).map(([book, n]) => `${ui.books[book]?.zhFull ?? book} ${n} 节`).join('，');
console.log(`一共用了 ${count.verses.length} 节经文：${books}`);
for (const c of count.coverage) {
  if (c.missing.length === 0) console.log(`✓ ${c.id}（${c.range}）：${c.total} 节，齐了`);
  else console.log(`… ${c.id}（${c.range}）：${c.total} 节里用了 ${c.total - c.missing.length} 节，还缺 ${c.missing.length} 节：${c.missing.join('、')}`);
}
