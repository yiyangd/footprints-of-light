// 存档：玩家现在的进度，以及把它存进浏览器、从浏览器读出来。
// 存在玩家自己浏览器的 localStorage 里，不会上传到任何地方（AGENTS.md 第 7 条）。
import { BEATS, WINDOWS } from '../content';
import type { Beat } from '../content/types';
import { player } from '../player/player';
import { emptySave, parseSave, SAVE_KEY, type SaveData } from './save-data';

const WINDOW_IDS = Object.keys(WINDOWS);

/** 玩家现在的进度。整个游戏共用这一份 */
export const save: SaveData = emptySave(WINDOW_IDS);

/** 这个剧情节点完成了没有 */
export const isDone = (beatId: string): boolean => save.done.includes(beatId);

/** 下一个要去的剧情节点；全部完成了就是 null */
export const nextBeat = (): Beat | null => BEATS.find((b) => !isDone(b.id)) ?? null;

/** 一共得到了多少片彩窗 */
export const pieceCount = (): number => Object.values(save.pieces).reduce((sum, list) => sum + list.length, 0);

/** 把进度存进浏览器（连同玩家现在站的位置） */
export function persist(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, pos: [player.pos.x, player.pos.y, player.pos.z] }));
  } catch { /* 存不了也没关系（例如浏览器开了无痕模式） */ }
}

/** 从浏览器读出上次的进度；没有就返回 null */
export function loadSave(): SaveData | null {
  try { return parseSave(localStorage.getItem(SAVE_KEY), WINDOW_IDS); } catch { return null; }
}

/** 删掉存档（“从头开始”时用） */
export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* 删不了也没关系 */ }
}
