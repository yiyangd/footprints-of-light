// 存档读取的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import { emptySave, parseSave, startAtChapter, SAVE_KEY } from './save-data';

const WINDOWS = ['creation', 'eden'];

describe('存档的名字', () => {
  it('不能改：主页也读它，改了玩家的进度会丢（见 docs/STATUS.md）', () => {
    expect(SAVE_KEY).toBe('guangzhiyue-proto-v1');
  });
});

describe('emptySave', () => {
  it('每扇彩窗都有一个空的碎片列表', () => {
    expect(emptySave(WINDOWS)).toEqual({
      done: [], cards: [], relics: [], pieces: { creation: [], eden: [] }, verses: [], gestures: [],
    });
  });
});

describe('parseSave', () => {
  it('没有存档、文字坏了、不是存档，都返回 null', () => {
    expect(parseSave(null, WINDOWS)).toBeNull();
    expect(parseSave('', WINDOWS)).toBeNull();
    expect(parseSave('{ 坏掉的', WINDOWS)).toBeNull();
    expect(parseSave('"hello"', WINDOWS)).toBeNull();
    expect(parseSave('{"cards":[]}', WINDOWS)).toBeNull(); // 没有 done
  });

  it('读出一份正常的存档', () => {
    const text = JSON.stringify({
      done: ['begin', 'day1'], cards: ['ruach'], relics: ['first-light'],
      pieces: { creation: [0], eden: [] }, verses: ['Gen 1:1', 'Gen 1:3'], gestures: [], pos: [0, 0.22, 40],
    });
    expect(parseSave(text, WINDOWS)).toEqual({
      done: ['begin', 'day1'], cards: ['ruach'], relics: ['first-light'],
      pieces: { creation: [0], eden: [] }, verses: ['Gen 1:1', 'Gen 1:3'], gestures: [], pos: [0, 0.22, 40],
    });
  });

  it('v0.1 的旧存档：经文出处从“创 1:3”改成“Gen 1:3”', () => {
    const old = JSON.stringify({ done: ['begin'], verses: ['创 1:1', '创 1:3'] });
    expect(parseSave(old, WINDOWS)?.verses).toEqual(['Gen 1:1', 'Gen 1:3']);
  });

  it('存档里缺的部分补成空的，不会让游戏出错', () => {
    const save = parseSave('{"done":["begin"]}', WINDOWS);
    expect(save).toEqual({
      done: ['begin'], cards: [], relics: [], pieces: { creation: [], eden: [] }, verses: [], gestures: [],
    });
    // 只存了一扇窗的碎片时，另一扇也要有
    expect(parseSave('{"done":[],"pieces":{"creation":[0,1]}}', WINDOWS)?.pieces).toEqual({ creation: [0, 1], eden: [] });
  });

  it('位置的格式不对就不要它', () => {
    expect(parseSave('{"done":[],"pos":[1,2]}', WINDOWS)?.pos).toBeUndefined();
    expect(parseSave('{"done":[],"pos":["a","b","c"]}', WINDOWS)?.pos).toBeUndefined();
  });
});

describe('startAtChapter（从某一章开始）', () => {
  const had = { ...emptySave(['creation', 'eden']), done: ['begin', 'day1', 'day2', 'e1'], cards: ['ruach'], relics: ['onyx'], verses: ['Gen 1:3'], gestures: ['rest'], pos: [1, 2, 3] as [number, number, number] };

  it('进度换成前面各章的段；收集到的东西一样都不少', () => {
    const next = startAtChapter(had, ['begin', 'day1', 'day7'], [-3.5, -28.5]);
    expect(next.done).toEqual(['begin', 'day1', 'day7']);
    expect(next.cards).toEqual(['ruach']);
    expect(next.relics).toEqual(['onyx']);
    expect(next.verses).toEqual(['Gen 1:3']);
    expect(next.gestures).toEqual(['rest']);
    expect(next.pos).toEqual([-3.5, 2, -28.5]);
  });

  it('从第 1 章开始：一段都还没走，站在起点', () => {
    const next = startAtChapter(had, [], null);
    expect(next.done).toEqual([]);
    expect(next.pos).toBeUndefined();
    expect(next.relics).toEqual(['onyx']);
  });

  it('不改原来的那份存档', () => {
    startAtChapter(had, [], null);
    expect(had.done).toHaveLength(4);
  });
});
