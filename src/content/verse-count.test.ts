// 经文统计的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import bsbJson from '../../content/scripture/bsb.json';
import uiJson from '../../content/ui.json';
import type { EpisodeFile } from './types';
import { countVerses } from './verse-count';

const episodes = [creationJson, edenJson] as unknown as EpisodeFile[];
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
    expect(count.coverage.map((c) => c.id)).toEqual(['gen-01-creation', 'gen-02-eden']);
    expect(count.coverage[0].total).toBe(34);
    for (const c of count.coverage) for (const v of c.missing) expect(count.verses).not.toContain(v);
  });

  it('把缺的一节加进剧情，它就不再算缺', () => {
    const [first] = count.coverage;
    if (first.missing.length === 0) return; // 已经齐了就没什么可试的
    const more = structuredClone(episodes);
    more[0].beats[0].lines.push({ kind: 'scripture', ref: first.missing[0], text: { en: BSB[first.missing[0]], zh: 'TODO(经文)' } });
    expect(countVerses(more, [uiJson], BSB).coverage[0].missing).toHaveLength(first.missing.length - 1);
  });
});
