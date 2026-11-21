// ESV 计数的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import uiJson from '../../content/ui.json';
import { countEsv, ESV_VERSE_LIMIT } from './esv-count';
import type { EpisodeFile, UiFile } from './types';

const episodes = [creationJson, edenJson] as unknown as EpisodeFile[];
const ui = uiJson as unknown as UiFile;

describe('countEsv', () => {
  const count = countEsv(episodes, ui);

  it('现在的用量远低于上限', () => {
    expect(count.verses.length).toBeGreaterThan(0);
    expect(count.verses.length).toBeLessThan(ESV_VERSE_LIMIT);
  });

  it('封面上的诗 77:19 也算在内', () => {
    expect(count.verses).toContain('Ps 77:19');
    expect(count.perBook.Ps).toBe(1);
  });

  it('连续几节的出处一节一节地算，同一节不重复算', () => {
    expect(count.verses).toContain('Gen 1:14');
    expect(count.verses).toContain('Gen 1:15');
    expect(new Set(count.verses).size).toBe(count.verses.length);
    expect(Object.values(count.perBook).reduce((a, b) => a + b, 0)).toBe(count.verses.length);
  });

  it('多加一行经文，节数跟着变', () => {
    const more = structuredClone(episodes);
    more[0].beats[0].lines.push({ kind: 'scripture', ref: 'Gen 9:12–13', text: { en: 'TODO(经文)', zh: 'TODO(经文)' } });
    expect(countEsv(more, ui).verses.length).toBe(count.verses.length + 2);
  });

  it('比例在 0 和 1 之间，占全部文字的比例比占英文的比例小', () => {
    expect(count.shareOfEnglish).toBeGreaterThan(0);
    expect(count.shareOfEnglish).toBeLessThan(1);
    expect(count.shareOfAll).toBeLessThan(count.shareOfEnglish);
  });

  it('列出陶片和信物的说明里提到的出处，供人判断', () => {
    expect(count.mentioned).toContain('Genesis 2:11–12');
    expect(count.mentioned).toContain('Exodus 28:9–12');
  });
});
