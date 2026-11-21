// 调试开关：网址末尾加 #debug 才会启用。
// 启用后左下角显示帧率和绘制次数，浏览器控制台里可以用 __gzy 做这些事：
//   __gzy.completeNext()   立刻完成下一个剧情节点
//   __gzy.teleport(x, z)   传送到地图上的 (x, z)
import { closeModals, openBook, openCard, showEnd } from './collect/journal';
import { grant } from './collect/rewards';
import { nextBeat, save } from './collect/save';
import { BEATS, CARDS, HINTS, UI } from './content';
import { $ } from './core/env';
import { setLang } from './core/i18n';
import { camera, renderer, scene } from './core/renderer';
import { W } from './core/state';
import { cam } from './player/camera';
import { guideDebug, moveGuide } from './player/guide';
import { player } from './player/player';
import { story } from './story/beats';
import { runEffect } from './story/effects';
import { hint } from './story/hint';
import { setDays, setHud } from './story/hud';
import { groundAt, updateStones } from './world/path';

declare global {
  interface Window { __gzy?: Record<string, unknown> }
}

/** 立刻完成下一个剧情节点：效果瞬间生效，奖励照发，但不放字幕。返回这个节点的 id */
function completeNext(): string | null {
  const b = nextBeat();
  if (!b) return null;
  player.pos.set(b.at[0], groundAt(b.at[0], b.at[1]) ?? 0.3, b.at[1]);
  for (const line of b.lines) if (line.fx !== 'end') runEffect(line.fx, true);
  save.done.push(b.id);
  b.rewards.forEach(grant);
  runEffect(b.after, true);
  setHud(b);
  setDays();
  moveGuide();
  updateStones();
  return b.id;
}

/** 把玩家传送到 (x, z)；yaw 是镜头的朝向，可以不写 */
function teleport(x: number, z: number, yaw?: number): void {
  player.pos.set(x, groundAt(x, z) ?? 0.3, z);
  if (yaw !== undefined) { cam.yaw = yaw; player.facing = yaw + Math.PI; }
  cam.pos.set(x + Math.sin(cam.yaw) * cam.dist, player.pos.y + 3, z + Math.cos(cam.yaw) * cam.dist);
}

/** 打开调试功能。start 是 main.ts 里的“开始游戏”函数 */
export function initDebug(start: (fromSave: boolean) => void): void {
  $('fps').hidden = false;
  window.__gzy = {
    W, save, player, cam, BEATS, scene, camera, guide: guideDebug.guide, trail: guideDebug.trail,
    completeNext, teleport, start, story, openBook, closeModals, showEnd, hint, setLang, HINTS, UI,
    openCard: (id: string) => { const c = CARDS.find((x) => x.id === id); if (c) openCard(c); },
  };
}

let fpsTime = 0, fpsFrames = 0;

/** 每一帧调用：每半秒更新一次帧率和绘制次数 */
export function updateFps(dt: number): void {
  fpsTime += dt;
  fpsFrames++;
  if (fpsTime > 0.5) {
    $('fps').textContent = `${Math.round(fpsFrames / fpsTime)} fps · ${renderer.info.render.calls} calls`;
    fpsTime = 0;
    fpsFrames = 0;
  }
}
