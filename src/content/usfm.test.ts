// 读 USFM、整理和合本文字的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import { readUsfm, tidyCuv } from './usfm';

describe('readUsfm（把一卷书拆成一节一节）', () => {
  const usfm = [
    '\\id GEN', '\\h 创世记', '\\c 2  ', '\\p', '\\v 22 第一句。  ', '\\v 23 那人说：  ', '\\q1 第一行，  ', '\\q1 第二行。   ',
    '\\p', '\\r （代上1·1—4）', '\\c 24', '\\v 29-30 合在一起的两节。',
  ].join('\n');

  it('认得章、节，诗歌分行的文字接在同一节后面，小标题不算经文', () => {
    const verses = readUsfm(usfm);
    expect(verses.map((v) => `${v.chapter}:${v.verse}`)).toEqual(['2:22', '2:23', '24:29-30']);
    expect(tidyCuv(verses[1].raw).text).toBe('那人说：第一行，第二行。');
  });

  it('遇到不认识的记号就报错，不悄悄丢字', () => {
    expect(() => readUsfm('\\c 1\n\\zz 奇怪的一行')).toThrow(/不认识的记号/);
  });
});

describe('tidyCuv（只整理排版，不动字）', () => {
  it('去掉“神”字前的空格，引号换成 “”', () => {
    expect(tidyCuv('\u3000神说：「要有光」，就有了光。  ')).toEqual({ text: '神说：“要有光”，就有了光。' });
  });

  it('去掉专有名词和补充字的记号，字留下', () => {
    expect(tidyCuv('成了有灵的活人，\\add 名叫 \\+pn 亚当\\+pn*\\add*。').text).toBe('成了有灵的活人，名叫亚当。');
  });

  it('去掉脚注', () => {
    expect(tidyCuv('名叫\\pn 法勒\\pn*\\f - \\fr 10:25 \\ft 就是分的意思\\f*，因为').text).toBe('名叫法勒，因为');
  });

  it('专有名词后面空了一格，说明来源缺了字：要报告出来', () => {
    expect(tidyCuv('来到\\pn 希伯 \\pn*、\\pn 幔利\\pn*的橡树那里').gap).toContain('“希伯”后面缺了一个字');
  });
});
