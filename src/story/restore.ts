// 读档：把世界恢复成上次离开时的样子。
// 做法是把已经完成的节点里的效果“瞬间”重放一遍（instant = true），这样不用另外存一份世界状态。
import { save } from '../collect/save';
import type { SaveData } from '../collect/save-data';
import { BEATS } from '../content';
import type { Beat } from '../content/types';
import { player } from '../player/player';
import { groundAt, updateStones } from '../world/path';
import { runEffect } from './effects';
import { setHud } from './hud';

/** 瞬间重放一个节点里的所有效果（不放字幕、不发奖励） */
function replayEffects(b: Beat): void {
  for (const line of b.lines) {
    if (line.fx !== 'end') runEffect(line.fx, true); // end 是“显示结尾画面”，读档时不需要
  }
  runEffect(b.after, true);
}

/** 照着存档恢复进度、世界和玩家的位置 */
export function restoreFromSave(loaded: SaveData): void {
  Object.assign(save, loaded);
  const doneBeats = BEATS.filter((b) => save.done.includes(b.id));
  for (const b of doneBeats) replayEffects(b);
  const last = doneBeats[doneBeats.length - 1];
  if (last) setHud(last);
  if (loaded.pos) {
    player.pos.set(loaded.pos[0], loaded.pos[1], loaded.pos[2]);
    // 万一存的位置现在站不住（例如在水上），就回到最后完成的那个节点
    if (groundAt(player.pos.x, player.pos.z) === null) {
      const b = last ?? BEATS[0];
      player.pos.set(b.at[0], 0.5, b.at[1]);
    }
  }
  player.safe.copy(player.pos);
  updateStones();
}
