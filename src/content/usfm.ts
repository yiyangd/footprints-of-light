// 读 USFM 格式的圣经文本。USFM 是圣经电子文本常用的一种写法：每一行开头用 \c、\v 这样的记号
// 说明“这是第几章、第几节”。中文和合本的原文就是这种格式（见 scripts/import-cuv.ts）。
// 这里只有计算，不读文件，可以写测试（见 usfm.test.ts）。游戏本身用不到这个文件，只有导入脚本用。

/** 从 USFM 里读出来的一节 */
export interface UsfmVerse {
  chapter: number;
  /** 节数。和合本偶尔把两节合成一段，那时是 '29-30' 这样 */
  verse: string;
  /** 这一节的文字，里面还带着 \pn、\add 这些记号 */
  raw: string;
}

/** 这些记号开头的行不是经文（书名、小标题、对照的出处），跳过 */
const SKIP = ['id', 'h', 'toc1', 'toc2', 'toc3', 'mt1', 'mt2', 'ms1', 's1', 's2', 'r', 'd', 'cl'];
/** 这些记号只是排版（另起一段、诗歌换行），后面如果有字，是经文的一部分 */
const LAYOUT = ['p', 'm', 'b', 'nb', 'pi1', 'q1', 'q2', 'q3', 'qs', 'qr', 'li1'];

/** 把一卷书的 USFM 文本拆成一节一节。遇到不认识的记号就报错，免得悄悄丢字 */
export function readUsfm(usfm: string): UsfmVerse[] {
  const verses: UsfmVerse[] = [];
  let chapter = 0, current: UsfmVerse | undefined;
  for (const line of usfm.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = /^\\([a-z]+\d?)(?: (.*))?$/.exec(line.trimEnd());
    if (!m) {
      if (line.trim()) throw new Error(`USFM 里有一行看不懂：${line}`);
      continue;
    }
    const [, marker, rest = ''] = m;
    if (marker === 'c') { chapter = Number(rest.trim()); current = undefined; }
    else if (marker === 'v') {
      const v = /^(\d+(?:-\d+)?) (.*)$/.exec(rest);
      if (!v) throw new Error(`USFM 里有一节看不懂：${line}`);
      current = { chapter, verse: v[1], raw: v[2] };
      verses.push(current);
    }
    else if (SKIP.includes(marker)) continue;
    else if (LAYOUT.includes(marker)) { if (current) current.raw += rest; }
    else throw new Error(`USFM 里有不认识的记号 \\${marker}：${line}`);
  }
  return verses;
}

/**
 * 把一节和合本的文字整理成游戏里显示的样子。只动排版，不动字和标点的位置：
 *   1. 去掉脚注（\f … \f*）和记号（\pn 专有名词、\add 补充的字），字留下
 *   2. 去掉空格：“神”字前面的空格、诗歌分行留下的空格
 *   3. 引号 「」『』 换成 “”‘’
 * 如果发现来源的文本在这一节缺了字（专有名词后面空了一格），gap 里会写明，这一节就不能用。
 */
export function tidyCuv(raw: string): { text: string; gap?: string } {
  let text = raw.replace(/\\f .*?\\f\*/g, '');
  const hole = /\\\+?pn ([^\\]*?)[ 　]+\\\+?pn\*/.exec(text);
  text = text.replace(/\\\+?(?:pn|add)(?: |\*)/g, '');
  if (text.includes('\\')) throw new Error(`还有没处理的记号：${text}`);
  text = text.replace(/[ 　]/g, '')
    .replace(/「/g, '“').replace(/」/g, '”').replace(/『/g, '‘').replace(/』/g, '’');
  return hole ? { text, gap: `来源的文本在“${hole[1]}”后面缺了一个字` } : { text };
}
