// 把 BSB（Berean Standard Bible，公有领域）的经文原文存进仓库：content/scripture/bsb.json。
// 游戏里的英文经文都从这份文件按出处取（npm run fill:scripture），不手抄、不凭记忆写。
//
// 用法：先从 BSB 的官方网站下载全文（一个文本文件，每行“书卷 章:节<Tab>经文”）：
//   https://bereanbible.com/bsb.txt
// 然后运行：npx tsx scripts/import-bsb.ts 下载的文件路径
// 要用到新的书卷时，在下面的 WHOLE_BOOKS 里加上它，再运行一次。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './read-content';

/** 整卷存进来的书：BSB 里的书名 → 出处里用的缩写（和 content/ui.json 的 books 一致） */
const WHOLE_BOOKS: Record<string, string> = { Genesis: 'Gen' };
/** 只用到零星几节的书：一节一节列出来 */
const SINGLE_VERSES: Record<string, string> = { 'Psalm 77:19': 'Ps 77:19' };

const file = process.argv[2];
if (!file) {
  console.error('用法：npx tsx scripts/import-bsb.ts <下载的 bsb.txt>');
  process.exit(1);
}
const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split('\n');
// 文件开头两行是 BSB 的署名和公有领域声明，原样留下来
const notice = lines.slice(0, 2).map((l) => l.trim()).join(' ');
const verses: Record<string, string> = {};
for (const line of lines) {
  const [name, text] = line.split('\t');
  if (!name || text === undefined) continue;
  const m = /^(.+) (\d+:\d+)$/.exec(name.trim());
  if (!m) continue;
  const abbr = WHOLE_BOOKS[m[1]];
  if (abbr) verses[`${abbr} ${m[2]}`] = text.trim();
  else if (SINGLE_VERSES[name.trim()]) verses[SINGLE_VERSES[name.trim()]] = text.trim();
}
const out = {
  note: '英文经文的原文：Berean Standard Bible（BSB）。这个文件是用 scripts/import-bsb.ts 从官方文本生成的，请不要手改；游戏里的英文经文用 npm run fill:scripture 从这里取。',
  name: 'Berean Standard Bible (BSB)',
  license: 'Public domain (dedicated to the public domain on April 30, 2023; see berean.bible/terms.htm)',
  source: 'bereanbible.com/bsb.txt',
  notice,
  verses,
};
fs.writeFileSync(path.join(ROOT, 'content/scripture/bsb.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`写好了 content/scripture/bsb.json：${Object.keys(verses).length} 节`);
console.log(`署名：${notice}`);
