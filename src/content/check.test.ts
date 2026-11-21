// 内容检查的测试：现在的内容应该全部通过；故意改错一处，应该指出是哪个文件、哪一项。运行：npm test
import { describe, expect, it } from 'vitest';
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import uiJson from '../../content/ui.json';
import { EFFECT_NAMES } from '../episodes/effect-names';
import { checkContent, formatProblem, type ContentInput } from './check';

const CREATION = 'content/episodes/gen-01-creation.json', EDEN = 'content/episodes/gen-02-eden.json';

/** 一份全新的、可以随便改的内容（每次都重新复制，改坏了不影响别的测试） */
function content(): ContentInput & { creation: any; eden: any; uiData: any } {
  const creation = structuredClone(creationJson), eden = structuredClone(edenJson), uiData = structuredClone(uiJson);
  return {
    creation, eden, uiData,
    episodes: { [CREATION]: creation, [EDEN]: eden },
    ui: { file: 'content/ui.json', data: uiData },
    effectNames: EFFECT_NAMES,
  };
}

describe('现在的内容', () => {
  it('全部通过检查', () => {
    expect(checkContent(content()).map(formatProblem)).toEqual([]);
  });
});

describe('每个文件自己的规则', () => {
  it('kind 写错：指出是哪个文件、哪个节点、第几行', () => {
    const c = content();
    c.creation.beats[2].lines[0].kind = 'scriptur';
    const problems = checkContent(c);
    expect(problems).toHaveLength(1);
    expect(problems[0].file).toBe(CREATION);
    expect(problems[0].where).toBe('beats › day2 › lines › 第 1 行 › kind');
    expect(problems[0].message).toContain('scripture / history / imagination / reflection');
    expect(problems[0].message).toContain('"scriptur"');
  });

  it('经文缺少出处', () => {
    const c = content();
    delete c.creation.beats[1].lines[0].ref;
    const [p] = checkContent(c);
    expect(p.where).toBe('beats › day1 › lines › 第 1 行 › ref');
    expect(p.message).toContain('必须写出处');
  });

  it('文字缺中文，或者英文是空的', () => {
    const c = content();
    delete c.eden.cards[0].title.zh;
    c.eden.cards[1].text.en = '';
    const messages = checkContent(c).map(formatProblem).join('\n');
    expect(messages).toContain('cards › eden-name › title › zh');
    expect(messages).toContain('缺少中文（zh）');
    expect(messages).toContain('cards › tree-of-life › text › en');
    expect(messages).toContain('是空的');
  });

  it('坐标格式不对', () => {
    const c = content();
    c.creation.beats[0].at = [0, '47.5'];
    c.creation.cards[0].at = [1, 2, 3];
    const where = checkContent(c).map((p) => p.where);
    expect(where).toContain('beats › begin › at › 第 2 项');
    expect(where).toContain('cards › bereshit › at');
  });

  it('出处的写法不对（用了中文书卷名、短横线）', () => {
    const c = content();
    c.creation.beats[1].lines[0].ref = '创 1:3';
    c.creation.beats[4].lines[0].ref = 'Gen 1:14-15';
    const problems = checkContent(c);
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('Gen 1:3');
  });

  it('名字拼错了（多出一个不认识的字段）', () => {
    const c = content();
    c.creation.beats[0].rewads = [];
    const [p] = checkContent(c);
    expect(p.where).toBe('beats › begin');
    expect(p.message).toContain('rewads');
  });

  it('ESV 的版权声明不能删改（AGENTS.md 第 2 条）', () => {
    const c = content();
    c.uiData.text.esvNotice = 'Scripture from the ESV.';
    const [p] = checkContent(c);
    expect(p.file).toBe('content/ui.json');
    expect(p.where).toBe('text › esvNotice');
  });
});

describe('文件之间对不对得上', () => {
  it('奖励里的信物、姿态、彩窗碎片、经文都要存在', () => {
    const c = content();
    c.creation.beats[1].rewards = [
      { type: 'relic', id: 'no-such-relic' }, { type: 'gesture', id: 'dance' },
      { type: 'piece', win: 'creation', i: 9 }, { type: 'piece', win: 'creation', i: 0 }, { type: 'verse', ref: 'Gen 9:9' },
    ];
    const messages = checkContent(c).map((p) => p.message).join('\n');
    expect(messages).toContain('信物 "no-such-relic" 不存在');
    expect(messages).toContain('姿态 "dance" 不存在');
    expect(messages).toContain('没有第 9 片');
    expect(messages).toContain('经文 "Gen 9:9" 在剧情里找不到');
  });

  it('效果名写了代码里没有的', () => {
    const c = content();
    c.creation.beats[1].lines[0].fx = 'lite';
    c.creation.beats[1].after = 'evning';
    const problems = checkContent(c);
    expect(problems.map((p) => p.where)).toEqual(['beats › day1 › lines › 第 1 行 › fx', 'beats › day1 › after']);
    expect(problems[0].message).toContain('"lite"');
  });

  it('两个节点用了同一个 id', () => {
    const c = content();
    c.eden.beats[0].id = 'day1';
    expect(checkContent(c).map((p) => p.message).join('\n')).toContain('"day1" 出现了不止一次');
  });

  it('有一片彩窗没有任何节点发出来', () => {
    const c = content();
    c.creation.beats[1].rewards = c.creation.beats[1].rewards.filter((r: { type: string }) => r.type !== 'piece');
    const [p] = checkContent(c);
    expect(p.where).toBe('window › pieces › 第 1 片');
    expect(p.message).toContain('永远集不齐');
  });

  it('出处用了没登记过的书卷', () => {
    const c = content();
    c.eden.relics[0].ref = 'Exod 28:9';
    const [p] = checkContent(c);
    expect(p.where).toBe('relics › onyx › ref');
    expect(p.message).toContain('books');
  });

  it('新加的信物忘了写“没找到时的提示”', () => {
    const c = content();
    delete c.uiData.text.relicHint.onyx;
    const [p] = checkContent(c);
    expect(p.file).toBe('content/ui.json');
    expect(p.where).toBe('text › relicHint › onyx');
  });
});

describe('index.html 里的占位符', () => {
  it('ui.json 里找不到对应的文字时报错', () => {
    const c = content();
    c.pageHtml = '<h1><!--ui:page.cover.title:blk--></h1><p><!--ui:page.cover.nothing--></p>';
    const [p] = checkContent(c);
    expect(p.file).toBe('index.html');
    expect(p.message).toContain('page.cover.nothing');
  });
});
