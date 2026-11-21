// 经文原文工具的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import bsbJson from '../../content/scripture/bsb.json';
import { findScripture, sourceText, versesBetween } from './scripture';

const BSB = bsbJson.verses as Record<string, string>;

describe('BSB 原文（content/scripture/bsb.json）', () => {
  it('创世记 50 章 1533 节都在', () => {
    const genesis = Object.keys(BSB).filter((k) => k.startsWith('Gen '));
    expect(genesis).toHaveLength(1533);
    expect(genesis[0]).toBe('Gen 1:1');
    expect(genesis[genesis.length - 1]).toBe('Gen 50:26');
  });

  it('没有空的节，文件里写着公有领域的声明', () => {
    for (const [ref, text] of Object.entries(BSB)) expect(text.length, ref).toBeGreaterThan(0);
    expect(bsbJson.notice).toContain('dedicated to the public domain');
  });
});

describe('sourceText（按出处取原文）', () => {
  const verses = { 'Gen 1:1': 'A.', 'Gen 1:2': 'B.', 'Gen 1:3': 'C.' };

  it('一节就取一节，连续几节用空格连起来', () => {
    expect(sourceText(verses, 'Gen 1:2')).toBe('B.');
    expect(sourceText(verses, 'Gen 1:1–3')).toBe('A. B. C.');
  });

  it('原文里没有的节会报错', () => {
    expect(() => sourceText(verses, 'Gen 1:4')).toThrow(/没有 Gen 1:4/);
  });
});

describe('findScripture（找出内容里所有的经文）', () => {
  it('不管藏在哪一层都找得到，并说出它的位置', () => {
    const content = {
      beats: [{ id: 'day1', lines: [
        { kind: 'scripture', ref: 'Gen 1:3', text: { en: 'x', zh: 'y' } },
        { kind: 'imagination', text: { en: 'not scripture', zh: '不是经文' } },
      ] }],
      page: { cover: { verse: { kind: 'scripture', ref: 'Ps 77:19', text: { en: 'x', zh: 'y' } } } },
    };
    expect(findScripture(content).map((f) => [f.where, f.line.ref])).toEqual([
      ['beats › day1 › lines › 第 1 项', 'Gen 1:3'],
      ['page › cover › verse', 'Ps 77:19'],
    ]);
  });
});

describe('versesBetween（一段范围里的每一节）', () => {
  it('跨章的范围', () => {
    const list = versesBetween(BSB, 'Gen 1:1–2:3');
    expect(list).toHaveLength(34); // 第 1 章 31 节 + 第 2 章前 3 节
    expect(list[0]).toBe('Gen 1:1');
    expect(list[list.length - 1]).toBe('Gen 2:3');
  });

  it('同一章里的范围、一整章、单独一节', () => {
    expect(versesBetween(BSB, 'Gen 2:8–23')).toHaveLength(16);
    expect(versesBetween(BSB, 'Gen 3')).toHaveLength(24);
    expect(versesBetween(BSB, 'Gen 1:3')).toEqual(['Gen 1:3']);
    expect(versesBetween(BSB, 'Gen 1–11')).toHaveLength(299);
  });
});
