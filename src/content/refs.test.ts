// 经文出处小工具的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import { bookOf, refText, versesIn } from './refs';

const BOOKS = {
  Gen: { en: 'Genesis', zh: '创', zhFull: '创世记' },
  Ps: { en: 'Psalm', zh: '诗', zhFull: '诗篇' },
};

describe('refText（把出处变成给人看的样子）', () => {
  it('英文用书卷全名，中文用简称', () => {
    expect(refText(BOOKS, 'Gen 1:3')).toEqual({ en: 'Genesis 1:3', zh: '创 1:3' });
    expect(refText(BOOKS, 'Gen 1:14–15')).toEqual({ en: 'Genesis 1:14–15', zh: '创 1:14–15' });
  });

  it("mode 'full'：中文用书卷全名", () => {
    expect(refText(BOOKS, 'Ps 77:19', 'full')).toEqual({ en: 'Psalm 77:19', zh: '诗篇 77:19' });
  });

  it("mode 'name'：中文只显示书卷名", () => {
    expect(refText(BOOKS, 'Gen 1:1–2:3', 'name')).toEqual({ en: 'Genesis 1:1–2:3', zh: '创世记' });
  });

  it('没登记过的书卷缩写会报错，并告诉人去哪里加', () => {
    expect(() => refText(BOOKS, 'Exod 14:21')).toThrow(/Exod.*content\/ui\.json 的 books/);
  });
});

describe('versesIn（把出处拆成一节一节）', () => {
  it('一节就是一节', () => {
    expect(versesIn('Gen 1:3')).toEqual(['Gen 1:3']);
  });

  it('连续几节拆开', () => {
    expect(versesIn('Gen 1:16–18')).toEqual(['Gen 1:16', 'Gen 1:17', 'Gen 1:18']);
  });

  it('跨章的范围、写反的节数、写法不对的都报错', () => {
    expect(() => versesIn('Gen 1:1–2:3')).toThrow();
    expect(() => versesIn('Gen 1:5–3')).toThrow(/写反/);
    expect(() => versesIn('创 1:3')).toThrow();
  });
});

describe('bookOf', () => {
  it('取出书卷缩写', () => {
    expect(bookOf('Gen 1:3')).toBe('Gen');
    expect(bookOf('1Sam 17:4')).toBe('1Sam');
  });
});
