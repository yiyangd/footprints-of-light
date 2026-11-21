// 第 1 章《创造七日》（创 1:1–2:3）专属的效果。
// 内容在 content/episodes/gen-01-creation.json：那里每一行字幕的 fx 写着这里的一个效果名。
//
// 每个效果都收到一个 instant：
//   false = 玩家正在看这一幕，要放动画和声音；
//   true  = 读档，直接把世界变成“这件事已经发生过”的样子。
import * as THREE from 'three';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { damp } from '../core/math';
import { scene } from '../core/renderer';
import { U, W } from '../core/state';
import { glowSprite } from '../core/textures';
import { tween } from '../core/tween';
import { setFocus } from '../player/camera';
import { player } from '../player/player';
import type { Effect } from '../story/effects';
import { showAnimals } from '../world/animals';
import { showBirds } from '../world/birds';
import { showFish } from '../world/fish';
import { growth } from '../world/plants';
import { startEvening, sunDirection } from '../world/sky';

// —— 东方的两道光（第六日造人）：神照着自己的形像造男造女。人不直接画出来，只在东方亮起两道光 ——
const eastLights: THREE.Sprite[] = [glowSprite('#ffe9c2', 4, 0), glowSprite('#ffe9c2', 4, 0)];
eastLights.forEach((s, i) => {
  s.position.set(55 + i * 2.2, 7, -21 + i * 1.2);
  scene.add(s);
});
let eastLightsOn = false;

/** 让东方的两道光暗下去（走进伊甸、真的见到人的时候） */
export function dimEastLights(): void {
  eastLightsOn = false;
}

/** 让镜头抬头看一会儿天，过 holdMs 毫秒再放下来 */
function lookUpForAWhile(amount: number, holdMs: number): void {
  tween(W, 'lookUp', amount, 2);
  setTimeout(() => tween(W, 'lookUp', 0, 2.5), holdMs);
}

export const effects: Record<string, Effect> = {
  /** 创 1:2 神的灵运行在水面上：起一阵风 */
  wind(instant) {
    if (instant) return;
    tween(W, 'wind', 1, 2);
    sfx.whoosh();
  },
  /** 第一日：要有光。手里的灯也被点亮 */
  light(instant) {
    tween(W, 'light', 1, 3.2, instant);
    W.lampLit = true;
    if (instant) return;
    flash('white', 0.85);
    sfx.swell();
    music.set('day1');
  },
  /** 第二日：天 */
  sky(instant) {
    tween(W, 'sky', 1, 6, instant);
    if (instant) return;
    W.lookUp = 0;
    lookUpForAWhile(0.6, 5500);
    music.set('day2');
  },
  /** 第三日：旱地露出来 */
  land(instant) {
    tween(W, 'land', 1, instant ? 0 : 7);
    if (instant) return;
    sfx.rumble();
    music.set('day3');
  },
  /** 第三日：地发生青草、菜蔬和树木 */
  plants(instant) {
    growth.main.start.value = instant ? -100 : U.time.value + 0.3;
    tween(W, 'green', 1, 5, instant);
  },
  /** 第四日：日、月、星。镜头转过去看太阳 */
  lights(instant) {
    tween(W, 'lights', 1, 5, instant);
    if (instant) return;
    const d = sunDirection;
    setFocus(player.pos.x + d.x * 40, player.pos.y + d.y * 40, player.pos.z + d.z * 40, 1, 7);
    music.set('day4');
  },
  /** 第五日：鱼和飞鸟 */
  creatures(instant) {
    showBirds(instant);
    showFish();
    if (instant) return;
    lookUpForAWhile(0.5, 6000);
    music.set('day5');
  },
  /** 第六日：走兽 */
  animals(instant) {
    showAnimals(instant);
    if (!instant) music.set('day6');
  },
  /** 第六日：造人。东方亮起两道光，镜头转过去看 */
  humans(instant) {
    eastLightsOn = true;
    for (const s of eastLights) s.material.opacity = instant ? 0.9 : 0;
    if (!instant) setFocus(56, 6, -20, 0.9, 6);
  },
  /** 第七日：安息 */
  rest(instant) {
    tween(W, 'rest', 1, 6, instant);
    if (!instant) music.set('rest');
  },
  /** 有晚上，有早晨：每一日结束时天暗一下再亮起来 */
  evening(instant) {
    if (instant) return;
    startEvening();
    sfx.chime(0);
  },
  /** 走完七日：通往东方园子的路开了 */
  openEden() {
    W.edenOpen = true;
  },
};

/** 每一帧：东方的两道光慢慢亮起（或暗下），并轻轻上下浮动 */
export function update(dt: number, t: number): void {
  eastLights.forEach((s, i) => {
    s.material.opacity = damp(s.material.opacity, eastLightsOn ? 0.9 : 0, 1.5, dt);
    s.position.y = 6 + Math.sin(t * 0.9 + i) * 0.5;
    s.visible = s.material.opacity > 0.01;
  });
}
