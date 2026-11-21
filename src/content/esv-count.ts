// 数一数游戏里用了多少节 ESV 经文（AGENTS.md 第 2 条）。
// Crossway 的标准使用指引：整个作品引用 ESV 不超过 500 节、不超过任何一卷书的一半、
// 不超过作品全部文字的 25%；超过就要先向 Crossway 申请书面许可。
// 这里只有计算，可以写测试（见 esv-count.test.ts）；读文件、打印结果在 scripts/count-esv.ts。
import { bookOf, versesIn } from './refs';
import type { EpisodeFile, UiFile } from './types';

/** 不用申请许可的上限 */
export const ESV_VERSE_LIMIT = 500;
export const ESV_SHARE_LIMIT = 0.25;

export interface EsvCount {
  /** 用到的每一节，例如 Gen 1:3（同一节出现几次只算一次） */
  verses: string[];
  /** 每卷书用了多少节 */
  perBook: Record<string, number>;
  /** 陶片、信物的说明里提到的出处：如果那里直接引用了 ESV 原文，也要算进去，需要人来判断 */
  mentioned: string[];
  /** 经文的英文词数、全部英文词数、全部中文字数 */
  esvWords: number;
  enWords: number;
  zhChars: number;
  /** 经文占英文文字的比例、占中英文全部文字的比例（中文按约 1.5 个字 = 1 个词估算） */
  shareOfEnglish: number;
  shareOfAll: number;
}

const countWords = (s: string): number => (s.match(/[A-Za-z’'-]+/g) ?? []).length;

interface Tally { esvWords: number; enWords: number; zhChars: number; refs: string[] }

/**
 * 把一份内容从头到尾走一遍：每遇到一段 { en, zh } 就数它的字数；
 * 如果它属于一行经文（kind 是 scripture），英文算作 ESV，并记下出处。
 */
function walk(node: unknown, tally: Tally): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const item of node) walk(item, tally); return; }
  const o = node as Record<string, unknown>;
  const text = o.text as { en?: unknown; zh?: unknown } | undefined;
  if (o.kind === 'scripture' && typeof o.ref === 'string' && text && typeof text.en === 'string' && typeof text.zh === 'string') {
    // 一行经文
    tally.refs.push(o.ref);
    tally.esvWords += countWords(text.en);
    tally.enWords += countWords(text.en);
    tally.zhChars += text.zh.length;
    return;
  }
  if (typeof o.en === 'string' && typeof o.zh === 'string') {
    // 一段普通的双语文字
    tally.enWords += countWords(o.en);
    tally.zhChars += o.zh.length;
    return;
  }
  for (const [key, value] of Object.entries(o)) {
    if (key === 'note') continue; // note 是写给制作者看的说明，不显示给玩家
    if (typeof value === 'string' && /notice/i.test(key)) tally.enWords += countWords(value); // 版权声明是单语的一句话
    walk(value, tally);
  }
}

/** 陶片和信物的说明里写到的出处，例如 “(Genesis 2:11–12)” */
function mentionedRefs(episodes: EpisodeFile[]): string[] {
  // 书卷名（可以带 1、2、3）后面跟着 章:节，例如 Genesis 2:11–12、1 Samuel 17:4
  const pattern = /(?:[1-3] )?[A-Z][a-z]+ \d+:\d+(?:–\d+)?/g;
  const found = new Set<string>();
  for (const e of episodes) {
    for (const text of [...e.cards.map((c) => c.text.en), ...e.relics.map((r) => r.desc.en)]) {
      for (const m of text.matchAll(pattern)) found.add(m[0]);
    }
  }
  return [...found];
}

/** 数出整个游戏的 ESV 用量 */
export function countEsv(episodes: EpisodeFile[], ui: UiFile): EsvCount {
  const tally: Tally = { esvWords: 0, enWords: 0, zhChars: 0, refs: [] };
  for (const e of episodes) walk(e, tally);
  walk(ui, tally);
  const verses = [...new Set(tally.refs.flatMap(versesIn))];
  const perBook: Record<string, number> = {};
  for (const v of verses) perBook[bookOf(v)] = (perBook[bookOf(v)] ?? 0) + 1;
  const zhAsWords = Math.round(tally.zhChars / 1.5);
  return {
    verses, perBook, mentioned: mentionedRefs(episodes),
    esvWords: tally.esvWords, enWords: tally.enWords, zhChars: tally.zhChars,
    shareOfEnglish: tally.esvWords / tally.enWords,
    shareOfAll: tally.esvWords / (tally.enWords + zhAsWords),
  };
}
