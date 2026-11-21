// 内容数据的测试：确认 content/episodes/*.json 读进来以后是完整、自洽的。运行：npm test
// （下一步会有专门的 npm run validate:content，报错会更详细。）
import { describe, expect, it } from 'vitest';
import { BEATS, CARDS, EPISODES, GESTURES, KIND_LABEL, refText, RELICS, UI, verseText, WINDOWS } from './index';

const KINDS = ['scripture', 'history', 'imagination', 'reflection'];
const isBi = (t: unknown): boolean =>
  !!t && typeof t === 'object' && typeof (t as { en: unknown }).en === 'string' && typeof (t as { zh: unknown }).zh === 'string'
  && (t as { en: string }).en.length > 0 && (t as { zh: string }).zh.length > 0;

describe('剧情节点', () => {
  it('序章一共 14 段（主页的 timeline.json 里 play.beats 也是 14）', () => {
    expect(BEATS).toHaveLength(14);
  });

  it('每个节点的 id 都不重复，并且属于一个已知的章节', () => {
    const ids = BEATS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BEATS) expect(EPISODES[b.ep], `节点 ${b.id} 的章节 ${b.ep}`).toBeDefined();
  });

  it('每一行字幕都有种类和中英两份文字', () => {
    for (const b of BEATS) {
      expect(isBi(b.hud.label), `节点 ${b.id} 的 hud.label`).toBe(true);
      for (const [i, line] of b.lines.entries()) {
        expect(KINDS, `节点 ${b.id} 第 ${i + 1} 行的 kind`).toContain(line.kind);
        expect(isBi(line.text), `节点 ${b.id} 第 ${i + 1} 行的 text`).toBe(true);
      }
    }
  });

  it('经文必须带出处，出处能显示成 Genesis 1:3 / 创 1:3（AGENTS.md 第 1 条）', () => {
    for (const b of BEATS) {
      for (const line of b.lines) {
        if (line.kind !== 'scripture') continue;
        expect(line.ref, `节点 ${b.id} 的经文缺少出处`).toMatch(/^[1-3]?[A-Za-z]+ \d+:\d+(–\d+)?$/);
        const shown = refText(line.ref!);
        expect(shown.en).not.toContain('undefined');
        expect(shown.zh).not.toContain('undefined');
      }
    }
  });

  it('奖励里提到的信物、彩窗碎片、经文、姿态都存在', () => {
    for (const b of BEATS) {
      for (const r of b.rewards) {
        if (r.type === 'relic') expect(RELICS[r.id], `节点 ${b.id} 的信物 ${r.id}`).toBeDefined();
        if (r.type === 'gesture') expect(GESTURES[r.id], `节点 ${b.id} 的姿态 ${r.id}`).toBeDefined();
        if (r.type === 'verse') expect(verseText(r.ref), `节点 ${b.id} 的经文 ${r.ref}`).not.toBeNull();
        if (r.type === 'piece') expect(WINDOWS[r.win]?.pieces[r.i], `节点 ${b.id} 的彩窗 ${r.win} 第 ${r.i} 片`).toBeDefined();
      }
    }
  });

  it('每一片彩窗都有一个节点发出来（不然永远集不齐）', () => {
    for (const [key, w] of Object.entries(WINDOWS)) {
      w.pieces.forEach((_, i) => {
        const given = BEATS.some((b) => b.rewards.some((r) => r.type === 'piece' && r.win === key && r.i === i));
        expect(given, `彩窗 ${key} 的第 ${i} 片`).toBe(true);
      });
    }
  });
});

describe('收集品', () => {
  it('陶片的 id 不重复，每块都有种类、标题和正文', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CARDS) {
      expect(KINDS, `陶片 ${c.id} 的 kind`).toContain(c.kind);
      expect(isBi(c.title) && isBi(c.text), `陶片 ${c.id} 的文字`).toBe(true);
      expect(c.at, `陶片 ${c.id} 的位置`).toHaveLength(2);
    }
  });

  it('每件信物在图鉴里都有一句“还没找到时”的提示', () => {
    for (const id of Object.keys(RELICS)) expect(isBi(UI.relicHint[id]), `信物 ${id} 的提示`).toBe(true);
  });
});

describe('界面文字', () => {
  it('四种文字都有名字', () => {
    for (const kind of KINDS) expect(isBi(KIND_LABEL[kind as keyof typeof KIND_LABEL])).toBe(true);
  });

  it('ESV 的版权声明还在（AGENTS.md 第 2 条：必须保留）', () => {
    expect(UI.esvNotice).toContain('ESV');
    expect(UI.esvNotice).toContain('Crossway');
    expect(UI.esvNotice).toContain('All rights reserved');
  });
});
