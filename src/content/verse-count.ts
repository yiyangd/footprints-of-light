// 数一数每一章用了多少节经文，还缺哪些节。
// 这个游戏的规矩是“经文一节都不跳过”：一章的经文范围（range）里的每一节都要出现在剧情里。
// 这里只有计算，可以写测试（见 verse-count.test.ts）；读文件、打印结果在 scripts/count-verses.ts。
import { bookOf, versesIn } from './refs';
import { findScripture, versesBetween, type VerseTable } from './scripture';
import type { EpisodeFile } from './types';

/** 一章的经文覆盖情况 */
export interface Coverage {
  id: string;
  range: string;
  /** 范围里一共有多少节 */
  total: number;
  /** 范围里还没有出现在剧情里的节 */
  missing: string[];
}

export interface VerseCount {
  /** 整个游戏用到的每一节（同一节出现几次只算一次） */
  verses: string[];
  /** 每卷书用了多少节 */
  perBook: Record<string, number>;
  /** 每一章的覆盖情况 */
  coverage: Coverage[];
}

/** 一份内容里用到的每一节 */
const versesUsed = (content: unknown): string[] => findScripture(content).flatMap(({ line }) => versesIn(line.ref));

/** 数出整个游戏用了哪些经文，每一章还缺哪些节。others 是章节以外也有经文的内容（例如界面文字里封面的那一节） */
export function countVerses(episodes: EpisodeFile[], others: unknown[], source: VerseTable): VerseCount {
  const verses = [...new Set([...episodes, ...others].flatMap(versesUsed))];
  const perBook: Record<string, number> = {};
  for (const v of verses) perBook[bookOf(v)] = (perBook[bookOf(v)] ?? 0) + 1;
  const coverage = episodes.map((e) => {
    const wanted = versesBetween(source, e.range), used = new Set(versesUsed(e));
    return { id: e.id, range: e.range, total: wanted.length, missing: wanted.filter((v) => !used.has(v)) };
  });
  return { verses, perBook, coverage };
}
