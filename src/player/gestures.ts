// 姿态：玩家从圣经人物那里学来的动作（安息、命名）。
import { save } from '../collect/save';
import { GESTURES, UI } from '../content';
import { music } from '../core/audio';
import { IS_TOUCH } from '../core/env';
import { game } from '../core/state';
import { hint } from '../story/hint';
import { player } from './player';

/** 做一个姿态；再按一次同一个姿态就结束 */
export function doGesture(id: string): void {
  if (game.state !== 'play' || !save.gestures.includes(id) || !player.onGround) return;
  player.gesture = player.gesture === id ? null : id;
  player.gestureT = 0;
  if (player.gesture === 'rest') {
    music.duck(true); // 安息时把音乐压低
    hint(UI.resting, 4);
  } else {
    music.duck(false);
  }
}

/** 触屏上的姿态按钮：学会了哪个姿态，就显示哪个按钮（按钮的 id 是 t-姿态名） */
export function updateGestureButtons(): void {
  if (!IS_TOUCH) return;
  for (const id of Object.keys(GESTURES)) {
    const button = document.getElementById(`t-${id}`);
    if (button) button.hidden = !save.gestures.includes(id);
  }
}
