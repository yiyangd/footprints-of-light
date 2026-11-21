// 经文出处的小工具。出处在 JSON 里统一写成 Gen 1:3 这样，显示时再换成 Genesis 1:3 / 创 1:3。
// 这里只有计算，可以写测试（见 refs.test.ts）。
import type { Bi, BookName } from './types';

/** 出处里的书卷缩写：bookOf('Gen 1:3') → 'Gen' */
export const bookOf = (ref: string): string => ref.slice(0, ref.indexOf(' '));

/**
 * 把出处变成给人看的样子：refText(books, 'Gen 1:3') → { en: 'Genesis 1:3', zh: '创 1:3' }
 * mode 'full'：中文用书卷全名（创世记 1:3）；mode 'name'：中文只显示书卷名（创世记）
 */
export function refText(books: Record<string, BookName>, ref: string, mode?: 'full' | 'name'): Bi {
  const abbr = bookOf(ref), book = books[abbr], rest = ref.slice(abbr.length + 1);
  if (!book) throw new Error(`出处 "${ref}" 里的书卷缩写 "${abbr}" 还没有登记：请在 content/ui.json 的 books 里加上它`);
  return {
    en: `${book.en} ${rest}`,
    zh: mode === 'name' ? book.zhFull : `${mode === 'full' ? book.zhFull : book.zh} ${rest}`,
  };
}

/**
 * 把一个出处拆成一节一节：versesIn('Gen 1:14–15') → ['Gen 1:14', 'Gen 1:15']
 * 按出处取原文、数用了多少节的时候用。只认同一章里的出处（Gen 1:3 或 Gen 1:14–15）。
 */
export function versesIn(ref: string): string[] {
  const m = /^([1-3]?[A-Za-z]+) (\d+):(\d+)(?:–(\d+))?$/.exec(ref);
  if (!m) throw new Error(`出处 "${ref}" 的写法不对：要写成 Gen 1:3 或 Gen 1:14–15`);
  const [, book, chapter, from, to] = m;
  const first = Number(from), last = Number(to ?? from);
  if (last < first) throw new Error(`出处 "${ref}" 的节数写反了`);
  return Array.from({ length: last - first + 1 }, (_, i) => `${book} ${chapter}:${first + i}`);
}
