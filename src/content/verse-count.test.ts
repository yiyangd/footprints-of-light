// 经文统计的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import fallJson from '../../content/episodes/gen-03-fall.json';
import brothersJson from '../../content/episodes/gen-04-brothers.json';
import bsbJson from '../../content/scripture/bsb.json';
import uiJson from '../../content/ui.json';
import type { EpisodeFile } from './types';
import { countVerses } from './verse-count';

const episodes = [creationJson, edenJson, fallJson, brothersJson] as unknown as EpisodeFile[];
const BSB = bsbJson.verses as Record<string, string>;

describe('countVerses', () => {
  const count = countVerses(episodes, [uiJson], BSB);

  it('同一节不重复算，每卷书的节数加起来等于总数', () => {
    expect(new Set(count.verses).size).toBe(count.verses.length);
    expect(Object.values(count.perBook).reduce((a, b) => a + b, 0)).toBe(count.verses.length);
  });

  it('封面上的诗 77:19 也算在内', () => {
    expect(count.verses).toContain('Ps 77:19');
  });

  it('每一章都报告范围里一共多少节、还缺哪些', () => {
    expect(count.coverage.map((c) => c.id)).toEqual(['gen-01-creation', 'gen-02-eden', 'gen-03-fall', 'gen-04-brothers']);
    expect(count.coverage[0].total).toBe(34);
    for (const c of count.coverage) for (const v of c.missing) expect(count.verses).not.toContain(v);
  });

  it('现在的两章都齐了：范围里的每一节都在剧情里（经文一节都不跳过）', () => {
    for (const c of count.coverage) expect(c.missing, c.id).toEqual([]);
  });

  it('从剧情里拿掉一节，就会报告缺了这一节', () => {
    const fewer = structuredClone(episodes);
    const lines = fewer[0].beats[0].lines;
    const gone = lines.findIndex((l) => l.ref === 'Gen 1:2');
    lines.splice(gone, 1);
    expect(countVerses(fewer, [uiJson], BSB).coverage[0].missing).toEqual(['Gen 1:2']);
});
});
