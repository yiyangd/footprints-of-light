// 引路之光：一团飞在下一个剧情节点上空的光。玩家离它远的时候，还有一串光点从玩家指向它。
import * as THREE from 'three';
import { nextBeat } from '../collect/save';
import { clamp, damp, easeInOut } from '../core/math';
import { scene } from '../core/renderer';
import { game } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { groundAt } from '../world/path';
import { player } from './player';

const orb = glowSprite('#fff0c8', 1.8, 1);   // 外面一团柔光
const core = glowSprite('#ffffff', 0.5, 1);  // 中间一点亮芯
scene.add(orb);
scene.add(core);

/** 光现在的位置，以及正在从哪里飞到哪里（t 从 0 到 1 是飞行的进度） */
const guide = { pos: new THREE.Vector3(0, 1.6, 40), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, dur: 1 };

function buildTrail(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const n = 36, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ map: TEX.glow, size: 0.42, color: '#ffe2a6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  scene.add(p);
  return p;
}
const trail = buildTrail();

/** 光该悬在节点上方多高的地方 */
function hoverHeight(at: [number, number]): number {
  return Math.max(groundAt(at[0], at[1]) ?? 0.22, 0.22) + 1.7;
}

/** 让光飞向下一个剧情节点；全部完成了就把光收起来 */
export function moveGuide(): void {
  const b = nextBeat();
  if (!b) { orb.visible = core.visible = false; return; }
  guide.from.copy(guide.pos);
  guide.to.set(b.at[0], hoverHeight(b.at), b.at[1]);
  guide.dur = clamp(guide.from.distanceTo(guide.to) / 7, 0.8, 8); // 越远飞得越久
  guide.t = 0;
}

/** 游戏开始时：把光放在玩家面前，再让它飞向下一个节点 */
export function startGuideNear(pos: THREE.Vector3): void {
  guide.pos.set(pos.x, pos.y + 1.6, pos.z - 3);
  moveGuide();
}

const from = new THREE.Vector3(), dir = new THREE.Vector3();

/** 每一帧：让光飞一段，或者在节点上方轻轻浮动；更新指路的光点 */
export function updateGuide(dt: number, t: number): void {
  if (guide.t < 1) {
    // 正在飞：沿一条拱起来的弧线
    guide.t = Math.min(1, guide.t + dt / guide.dur);
    const k = easeInOut(guide.t);
    guide.pos.lerpVectors(guide.from, guide.to, k);
    guide.pos.y += Math.sin(k * Math.PI) * 3;
  } else {
    // 已经到了：上下浮动。地面的高度可能在变（陆地升起），所以每帧重新量一次
    const b = nextBeat();
    if (b) {
      guide.to.y = hoverHeight(b.at);
      guide.pos.y = damp(guide.pos.y, guide.to.y + Math.sin(t * 1.6) * 0.25, 3, dt);
    }
  }
  orb.position.copy(guide.pos);
  core.position.copy(guide.pos);
  orb.scale.setScalar(1.8 + Math.sin(t * 2.2) * 0.2);

  // 指路的光点：玩家离光超过 6 米时才出现
  const gd = player.pos.distanceTo(guide.pos);
  const showTrail = game.state === 'play' && gd > 6 && orb.visible;
  trail.material.opacity = damp(trail.material.opacity, showTrail ? 0.8 : 0, 3, dt);
  if (trail.material.opacity > 0.01) {
    const tp = trail.geometry.attributes.position, n = tp.count, span = Math.min(gd, 26);
    from.set(player.pos.x, player.pos.y + 1.0, player.pos.z);
    dir.copy(guide.pos).sub(from).normalize();
    for (let i = 0; i < n; i++) {
      const f = ((i / n) + t * 0.18) % 1, d = f * span;
      tp.setXYZ(i, from.x + dir.x * d, from.y + dir.y * d + Math.sin(f * Math.PI) * 0.6, from.z + dir.z * d);
    }
    tp.needsUpdate = true;
  }
}

/** 调试用：把内部状态交出去（见 src/debug.ts） */
export const guideDebug = { guide, trail };
