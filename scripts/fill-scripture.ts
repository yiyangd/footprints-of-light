// 照出处把英文经文从 BSB 原文填进内容里。用法：npm run fill:scripture
// 写新的一行经文时，只要写好 kind、ref，英文先随便写个占位（例如 "TODO(经文)"），运行这个命令就会填上原文。
// 中文（和合本）不归它管，要照着圣经填。
import fs from 'node:fs';
import path from 'node:path';
import { findScripture, sourceText } from '../src/content/scripture';
import { draftFiles, episodeFiles, readJson, ROOT } from './read-content';

const source = (readJson('content/scripture/bsb.json') as { verses: Record<string, string> }).verses;
let changed = 0;
for (const file of [...episodeFiles(), ...draftFiles(), 'content/ui.json']) {
  const data = readJson(file);
  let here = 0;
  for (const { where, line } of findScripture(data)) {
    const text = sourceText(source, line.ref);
    if (line.text.en !== text) {
      line.text.en = text;
      here++;
      console.log(`填好 ${file} › ${where}（${line.ref}）`);
    }
  }
  if (here) fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + '\n');
  changed += here;
}
console.log(changed ? `一共填了 ${changed} 行` : '每一行英文经文都已经和 BSB 原文一致，没有要改的');
