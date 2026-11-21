// 把中文和合本（新标点和合本，简体）的经文原文存进仓库：content/scripture/cuv.json。
// 游戏里的中文经文都从这份文件按出处取（npm run fill:scripture），不手抄、不凭记忆写。
//
// 用法：先从 eBible.org 下载这个译本的 USFM 压缩包并解压：
//   https://ebible.org/Scriptures/cmn-cu89s_usfm.zip
// 然后运行：npx tsx scripts/import-cuv.ts 解压出来的文件夹
// 要用到新的书卷时，在下面的 WHOLE_BOOKS 里加上它，再运行一次。
//
// 文字怎么整理（只动排版，不动字）写在 src/content/usfm.ts 的 tidyCuv 里，也会写进生成的文件。
import fs from 'node:fs';
import path from 'node:path';
import { readUsfm, tidyCuv } from '../src/content/usfm';
import { ROOT } from './read-content';

/** 整卷存进来的书：USFM 文件名里的书卷代号 → 出处里用的缩写（和 content/ui.json 的 books 一致） */
const WHOLE_BOOKS: Record<string, string> = { GEN: 'Gen' };
/** 只用到零星几节的书：书卷代号 → 要哪几节（写成出处） */
const SINGLE_VERSES: Record<string, { abbr: string; verses: string[] }> = { PSA: { abbr: 'Ps', verses: ['77:19'] } };

const dir = process.argv[2];
if (!dir) {
  console.error('用法：npx tsx scripts/import-cuv.ts <解压出来的 usfm 文件夹>');
  process.exit(1);
}

/** 找到某一卷书的文件（文件名像 02-GENcmn-cu89s.usfm） */
function bookFile(code: string): string {
  const name = fs.readdirSync(dir).find((n) => n.endsWith('.usfm') && n.includes(`-${code}`));
  if (!name) throw new Error(`文件夹里找不到 ${code} 这卷书的 .usfm 文件`);
  return path.join(dir, name);
}

const verses: Record<string, string> = {};
const gaps: Record<string, string> = {};
function importBook(code: string, abbr: string, only?: string[]): void {
  for (const v of readUsfm(fs.readFileSync(bookFile(code), 'utf8'))) {
    const [first, last] = v.verse.split('-').map(Number);
    if (only && !only.includes(`${v.chapter}:${first}`)) continue;
    const { text, gap } = tidyCuv(v.raw);
    if (last !== undefined) {
      // 和合本把几节合成了一段，分不出哪句属于哪一节：先都记成“不能用”
      for (let n = first; n <= last; n++) gaps[`${abbr} ${v.chapter}:${n}`] = `和合本把第 ${first}–${last} 节合成了一段，还不能按节取`;
    } else if (gap) gaps[`${abbr} ${v.chapter}:${first}`] = gap;
    else verses[`${abbr} ${v.chapter}:${first}`] = text;
  }
}
for (const [code, abbr] of Object.entries(WHOLE_BOOKS)) importBook(code, abbr);
for (const [code, { abbr, verses: only }] of Object.entries(SINGLE_VERSES)) importBook(code, abbr, only);

const out = {
  note: '中文经文的原文：新标点和合本（简体）。这个文件是用 scripts/import-cuv.ts 从 eBible.org 的文本生成的，请不要手改；游戏里的中文经文用 npm run fill:scripture 从这里取。',
  name: '新标点和合本（Chinese Union Version with New Punctuation），简体',
  license: 'eBible.org 把这份电子文本标为公有领域（Public Domain）；香港圣经公会称代理《新标点和合本》的版权，两边说法不一致，公开宣传之前要向圣经公会确认，见 CREDITS.md',
  source: 'ebible.org/Scriptures/cmn-cu89s_usfm.zip',
  rules: [
    '字和标点照原文，只整理排版：',
    '去掉脚注、小标题和专有名词、补充字的记号（字留下，不加方括号）',
    '去掉“神”字前面的空格和诗歌分行留下的空格',
    '引号 「」『』 换成 “”‘’',
    '连续几节直接连在一起，中间不加空格',
  ],
  verses,
  gaps,
};
fs.writeFileSync(path.join(ROOT, 'content/scripture/cuv.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`写好了 content/scripture/cuv.json：${Object.keys(verses).length} 节`);
const gapList = Object.entries(gaps);
if (gapList.length) {
  console.log(`另有 ${gapList.length} 节来源的文本有问题，没有收进来（用到的时候要人工核对）：`);
  for (const [ref, why] of gapList) console.log(`  ${ref}：${why}`);
}
