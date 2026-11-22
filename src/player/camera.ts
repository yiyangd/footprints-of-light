// 镜头：第三人称，平滑地跟在玩家身后。
import * as THREE from 'three';
import { isDone } from '../collect/save';
import { IS_TOUCH } from '../core/env';
import { input } from '../core/input';
import { angleDiff, clamp } from '../core/math';
import { camera } from '../core/renderer';
import { W } from '../core/state';
import { tween } from '../core/tween';
import { groundAt } from '../world/path';
import { TREE_SPOTS } from '../world/plants';
import { player } from './player';

/** 镜头的状态：yaw 左右转了多少，pitch 上下抬了多少，dist 离玩家多远 */
export const cam = {
  yaw: 0,
  pitch: 0.3,
  dist: IS_TOUCH ? 8 : 7,
  pos: new THREE.Vector3(0, 3, 56),
  look: new THREE.Vector3(),
};

/**
 * 剧情想让玩家看某个地方：镜头慢慢转过去。
 * @param amount  转过去多少，0 到 1
 * @param holdSec 看多少秒之后转回来；不写就一直看着
 */
export function setFocus(x: number, y: number, z: number, amount: number, holdSec?: number): void {
  W.focus.set(x, y, z);
  tween(W, 'focusAmt', amount, 1.6);
  if (holdSec) setTimeout(() => tween(W, 'focusAmt', 0, 2), holdSec * 1000);
}

const target = new THREE.Vector3(), offset = new THREE.Vector3(), desired = new THREE.Vector3(), lookAt = new THREE.Vector3();

/**
 * 镜头不要钻进树里：从最远的位置开始，一点点往玩家这边拉近，直到不挨着任何一棵树。
 * 返回值是 1（不用拉近）到 0.35（拉到最近）之间的比例。
 */
function pullInFromTrees(): number {
  if (W.green <= 0.5) return 1; // 树还没长出来
  let k = 1;
  for (; k > 0.35; k -= 0.08) {
    const px = target.x + offset.x * k, pz = target.z + offset.z * k;
    let hit = false;
    for (const [tx, tz, region] of TREE_SPOTS) {
      if (region === 'eden' && !isDone('e1')) continue; // 伊甸的树要走进园子才长出来
      if ((tx - px) ** 2 + (tz - pz) ** 2 < 3.2) { hit = true; break; }
    }
    if (!hit) break;
  }
  return k;
}

/**
 * 每一帧更新镜头。
 * @param moving 玩家是不是在走动
 */
export function updateCamera(dt: number, moving: boolean): void {
  // 拖动视角、滚轮缩放
  const sens = IS_TOUCH ? 0.006 : 0.005;
  cam.yaw -= input.look.dx * sens;
  cam.pitch = clamp(cam.pitch + input.look.dy * sens * 0.8, -0.12, 1.15);
  input.look.dx = input.look.dy = 0;
  if (input.zoom) { cam.dist = clamp(cam.dist * (1 + input.zoom * 0.1), 3.5, 15); input.zoom = 0; }
  // 走路时，如果玩家有一会儿没碰视角，镜头慢慢转到身后（像一位安静的同伴）
  if (moving && performance.now() - input.lastLook > 1600) {
    cam.yaw += angleDiff(player.facing + Math.PI, cam.yaw) * (1 - Math.exp(-0.9 * dt));
  }

  // 镜头想待的位置：玩家头顶上方一点，往后退 dist 那么远
  target.set(player.pos.x, player.pos.y + 1.25, player.pos.z);
  offset.set(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist);
  desired.copy(target).addScaledVector(offset, pullInFromTrees());
  // 镜头不能钻到地底下
  const gy = groundAt(desired.x, desired.z);
  // 镜头不能钻到地底下，也不能钻到水面下（第 6 章洪水的时候水面会涨高；平时 W.flood 是 0，和原来一样）
  const minY = gy === null ? 0.3 + W.flood : Math.max(gy + 0.6, W.flood + 0.3);
  if (desired.y < minY) desired.y = minY;
  cam.pos.lerp(desired, 1 - Math.exp(-9 * dt));
  camera.position.copy(cam.pos);

  // 镜头看向哪里：平时看玩家；剧情需要时抬头看天，或者看向某个地方
  lookAt.copy(target);
  lookAt.y += W.lookUp * 9;
  lookAt.lerp(W.focus, W.focusAmt * 0.65);
  cam.look.lerp(lookAt, 1 - Math.exp(-6 * dt));
  camera.lookAt(cam.look);
}
