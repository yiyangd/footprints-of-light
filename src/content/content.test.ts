// 内容数据的测试。运行：npm test
// 检查本身写在 validate.ts 里（npm run validate:content 用的是同一套，报错更详细）；
// 这里确认两件事：现在的内容全部通过检查；内容写错的时候，检查真的能发现。
import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { BEATS, EPISODE_FILES, refText, UI, UI_FILE } from './index';
import { checkPage, fillPage } from './page';
import type { EpisodeFile, UiFile } from './types';
import { findTodos, validateContent } from './validate';
import type { Loaded, Problem } from './validate';

const UI_NAME = 'content/ui.json';
const nameOf = (ep: EpisodeFile): string => `content/episodes/${ep.id}.json`;

/** 复制一份内容，照 change 改坏一处，再检查。原来的内容不会被改动 */
function checkAfter(change: (episodes: EpisodeFile[], ui: UiFile) => void): Problem[] {
  const episodes: EpisodeFile[] = structuredClone(EPISODE_FILES);
  const ui: UiFile = structuredClone(UI_FILE);
  change(episodes, ui);
  return validateContent(episodes.map((data): Loaded => ({ file: nameOf(data), data })), { file: UI_NAME, data: ui });
}

/** 把问题写成一行一行的字，方便在测试里找 */
const report = (problems: Problem[]): string => problems.map((p) => `${p.file} ${p.where}：${p.message}`).join('\n');

describe('现在的内容', () => {
  it('全部通过检查（和 npm run validate:content 一样）', () => {
    expect(report(checkAfter(() => {}))).toBe('');
  });

  it('序章一共 14 段（主页的 timeline.json 里 play.beats 也是 14）', () => {
    expect(BEATS).toHaveLength(14);
  });

  it('没有还没补上的经文（TODO）', () => {
    const files = [...EPISODE_FILES.map((data) => ({ file: nameOf(data), data })), { file: UI_NAME, data: UI_FILE }];
    expect(report(findTodos(files))).toBe('');
  });

  it('ESV 的版权声明还在（AGENTS.md 第 2 条：必须保留）', () => {
    expect(UI.esvNotice).toContain('ESV');
    expect(UI.esvNotice).toContain('Crossway');
    expect(UI.esvNotice).toContain('All rights reserved');
  });

  it('出处能显示成 Genesis 1:3 / 创 1:3', () => {
    expect(refText('Gen 1:3')).toEqual({ en: 'Genesis 1:3', zh: '创 1:3' });
    expect(refText('Gen 1:3', 'full')).toEqual({ en: 'Genesis 1:3', zh: '创世记 1:3' });
    expect(refText('Gen 2', 'name')).toEqual({ en: 'Genesis 2', zh: '创世记' });
  });
});

describe('内容写错的时候，检查能指出是哪个文件、哪一项', () => {
  it('kind 写错', () => {
    const text = report(checkAfter((eps) => { (eps[0].beats[2].lines[0] as { kind: string }).kind = 'scriptur'; }));
    expect(text).toContain('content/episodes/gen-01-creation.json beats[2]（day2）.lines[0].kind');
    expect(text).toContain('scripture / history / imagination / reflection');
  });

  it('经文缺少出处（AGENTS.md 第 1 条）', () => {
    const text = report(checkAfter((eps) => { delete eps[0].beats[1].lines[1].ref; }));
    expect(text).toContain('beats[1]（day1）.lines[1].ref：经文（scripture）必须带出处');
  });

  it('出处的写法不对（用了 - 而不是 –）', () => {
    const text = report(checkAfter((eps) => { eps[0].beats[5].lines[0].ref = 'Gen 1:14-15'; }));
    expect(text).toContain('beats[5]（day5）.lines[0].ref：出处要写成 Gen 1:3');
  });

  it('位置不是两个数字', () => {
    const text = report(checkAfter((eps) => { (eps[1].cards[0] as { at: number[] }).at = [1, 2, 3]; }));
    expect(text).toContain('content/episodes/gen-02-eden.json cards[0]（eden-name）.at：位置要写成 [x, z]');
  });

  it('缺中文，或者文字是空的', () => {
    const text = report(checkAfter((eps, ui) => {
      delete (eps[0].cards[0].title as { zh?: string }).zh;
      ui.game.startOver.en = '';
    }));
    expect(text).toContain('cards[0]（bereshit）.title.zh：缺少这一项');
    expect(text).toContain('content/ui.json game.startOver.en：不能是空的');
  });

  it('字段名拼错', () => {
    const text = report(checkAfter((eps) => { (eps[0].relics[0] as Record<string, unknown>).naem = 'x'; }));
    expect(text).toContain('relics[0]（first-light）：多了不认识的字段：naem');
  });

  it('奖励里的东西不存在', () => {
    const text = report(checkAfter((eps) => {
      eps[0].beats[0].rewards.push({ type: 'relic', id: 'nope' }, { type: 'piece', win: 'creation', i: 99 });
    }));
    expect(text).toContain('没有 nope 这件信物');
    expect(text).toContain('没有第 99 片');
  });

  it('有一片彩窗没有节点发出来（玩家永远集不齐）', () => {
    const text = report(checkAfter((eps) => { eps[0].window.pieces.push({ en: 'Extra', zh: '多的一片' }); }));
    expect(text).toContain('window.pieces[7]：没有哪个节点的奖励发这一片');
  });

  it('两个节点用了同一个 id', () => {
    const text = report(checkAfter((eps) => { eps[1].beats[0].id = 'day1'; }));
    expect(text).toContain('节点 day1：这个 id 重复了');
  });

  it('用到了 ui.json 里没有的书卷', () => {
    const text = report(checkAfter((eps) => { eps[0].beats[1].lines[1].ref = 'Exod 3:14'; }));
    expect(text).toContain('books 里没有 Exod 这卷书');
  });

  it('信物没有写“没找到时”的提示', () => {
    const text = report(checkAfter((_, ui) => { delete ui.game.relicHint.onyx; }));
    expect(text).toContain('content/ui.json game.relicHint.onyx：信物 onyx 还没有写');
  });
});

describe('index.html 里的文字记号', () => {
  it('每一个记号都能在 ui.json 里找到', () => {
    expect(checkPage(indexHtml, UI_FILE)).toEqual([]);
  });

  it('填好以后没有剩下的记号，开始页的经文一个字不差', () => {
    const html = fillPage(indexHtml, UI_FILE);
    expect(html).not.toContain('{{');
    expect(html).toContain(`<span class="en">${UI_FILE.titleVerse.text.en}</span>`);
    expect(html).toContain(`lang="zh-CN">${UI_FILE.titleVerse.text.zh}</span>`);
    expect(html).toContain(UI.esvNotice);
  });

  it('三种做法：bi 中文跟在后面，blk 中文另起一行，keys 把 [W] 画成键帽', () => {
    const ui = { a: { en: 'Press [W]', zh: '按 [W]' }, note: 'A & B' };
    expect(fillPage('{{bi:a}}', ui)).toBe('<span class="en">Press [W]</span><span class="zh" lang="zh-CN">按 [W]</span>');
    expect(fillPage('{{blk:a}}', ui)).toContain('class="zh blk"');
    expect(fillPage('{{keys:a}}', ui)).toBe('<span class="en">Press <kbd>W</kbd></span><span class="zh blk" lang="zh-CN">按 <kbd>W</kbd></span>');
    expect(fillPage('{{text:note}}', ui)).toBe('A &amp; B');
  });

  it('记号写错会报错，不会把 {{…}} 原样显示给玩家', () => {
    expect(() => fillPage('{{bi:page.start.nope}}', UI_FILE)).toThrow('content/ui.json 里没有 page.start.nope');
    expect(() => fillPage('{{bi:game.esvNotice}}', UI_FILE)).toThrow('应该是 { en, zh }');
    expect(() => fillPage('{{page.start.title}}', UI_FILE)).toThrow('记号要写成');
  });
});
