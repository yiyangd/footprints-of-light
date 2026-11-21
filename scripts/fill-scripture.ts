// 照出处把经文从原文填进内容里：英文从 BSB，中文从和合本。用法：npm run fill:scripture
// 写新的一行经文时，只要写好 kind、ref，英文和中文先都写 "TODO(经文)" 占位，运行这个命令就会填上原文。
// 两份原文在 content/scripture/ 下（bsb.json、cuv.json）。原文里没有或者不能用的节会列出来，不会乱填。
import fs from 'node:fs';
import path from 'node:path';
import { findScripture, sourceText } from '../src/content/scripture';
import { draftFiles, episodeFiles, readJson, ROOT, scriptureSources } from './read-content';

const sources = scriptureSources();
let changed = 0, failed = 0;
for (const file of [...episodeFiles(), ...draftFiles(), 'content/ui.json']) {
  const data = readJson(file);
  let here = 0;
  for (const { where, line } of findScripture(data)) {
    for (const source of sources) {
      let text: string;
      try {
        text = sourceText(source, line.ref);
      } catch (e) {
        console.error(`✗ ${file} › ${where}：${(e as Error).message}`);
        failed++;
        continue;
      }
      if (line.text[source.lang] !== text) {
        line.text[source.lang] = text;
        here++;
        console.log(`填好 ${file} › ${where}（${line.ref}，${source.label}）`);
      }
    }
  }
  if (here) fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + '\n');
  changed += here;
}
console.log(changed ? `一共填了 ${changed} 处` : '每一行经文都已经和原文一致，没有要改的');
if (failed) {
  console.error(`有 ${failed} 处没能填上，见上面的 ✗`);
  process.exit(1);
}
