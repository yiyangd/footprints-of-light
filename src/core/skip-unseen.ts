// 有些东西虽然开着（visible 是 true），其实一点也看不见：
// 透明度已经降到 0（例如淡出以后的光、停了的雨），或者缩到几乎没有（例如还没长出来、已经收起的东西）。
// 它们照样要占一次绘制（draw call）。手机上绘制次数要少（AGENTS.md 第 10 条：少于 150），
// 所以每一帧真正画画面之前，先把这些东西暂时藏起来，画完马上恢复。
// 各章效果自己管的 visible 不会被改掉，画面也一点不变。
import type * as THREE from 'three';

/** 缩到这么小（不到原来的千分之二）就算看不见 */
const TINY_SCALE = 0.002;
/** 透明度低于这个就算看不见 */
const CLEAR_OPACITY = 0.004;

/** 这一帧暂时藏起来的东西，画完以后要恢复 */
const hidden: THREE.Object3D[] = [];

/** 这个东西的透明度是不是已经是 0（只看用一种材质的东西） */
function isClear(o: THREE.Object3D): boolean {
  const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  if (!mat || Array.isArray(mat)) return false;
  return mat.transparent && mat.opacity < CLEAR_OPACITY;
}

/** 这个东西（连同它下面挂着的）是不是缩到几乎没有了 */
function isTiny(o: THREE.Object3D): boolean {
  const s = o.scale;
  return Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) < TINY_SCALE;
}

/** 一层层往下找。缩没了的整组藏起来；透明的只藏没有挂别的东西的（免得连带藏了看得见的） */
function sweep(parent: THREE.Object3D): void {
  for (const o of parent.children) {
    if (!o.visible) continue;
    if (isTiny(o) || (o.children.length === 0 && isClear(o))) {
      o.visible = false;
      hidden.push(o);
      continue;
    }
    sweep(o);
  }
}

/** 画画面之前调用：把看不见的东西暂时藏起来 */
export function hideUnseen(scene: THREE.Scene): void {
  sweep(scene);
}

/** 画完画面以后调用：把刚才藏起来的东西恢复 */
export function restoreUnseen(): void {
  for (const o of hidden) o.visible = true;
  hidden.length = 0;
}
