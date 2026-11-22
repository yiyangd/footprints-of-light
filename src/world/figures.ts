// 人：简单的身形（长衣、上身、头，女人多一块头巾），每个人合成一个网格（AGENTS.md 第 10 条：绘制次数要少）。
// 第 4 章（该隐、亚伯……）和第 5 章（亚当的家谱）都用它。不画脸，不画身体细节（AGENTS.md 第 6 条）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { angleDiff, damp } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { player } from '../player/player';
import { terrainY } from './heightmap';

/** 地图上的一个位置 [x, z] */
export type Spot = [number, number];

// —— 小工具：把几个形状合成一个网格，画的时候只算一次（AGENTS.md 第 10 条：绘制次数要少） ——

/** 给一个形状涂上一种颜色 */
export function paint(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** 把涂好颜色的几个形状合成一个 */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts);
  if (!g) throw new Error('figures.ts：几个形状合并失败（每个形状都要有 position、normal、uv 和 color）');
  return g;
}

// —— 人：简单的身形（长衣、上身、头），每个人一个网格 ——

export interface Figure {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  x: number;
  z: number;
  /** 要去的地方（走过去） */
  goal: Spot;
  /** 大小：小孩 0.5，大人 1 */
  size: number;
  sizeGoal: number;
  /** 显出来多少：0 看不见，1 完全看见 */
  shown: number;
  showGoal: number;
  /** 低头的程度 */
  bow: number;
  bowGoal: number;
  /** 站着的时候面向哪里；null = 面向玩家 */
  face: Spot | null;
  /** 走路的速度（米/秒） */
  speed: number;
  /** 洪水以后还在（第 6 章方舟里的人）。其余的人洪水以后不再出现 */
  survivor: boolean;
  /** 脚下有多高：不写就是地面；走在方舟的跳板上时用跳板的高度（第 6 章） */
  ground?: (x: number, z: number) => number;
}

const SKIN = '#ead8bc';

export function makeFigure(robe: string, female = false): Figure {
  const parts = [
    paint(new THREE.CylinderGeometry(0.2, 0.36, 1.1, 8).translate(0, 0.55, 0), robe),
    paint(new THREE.CylinderGeometry(0.15, 0.21, 0.36, 8).translate(0, 1.27, 0), robe),
    paint(new THREE.SphereGeometry(0.17, 10, 8).translate(0, 1.6, 0), SKIN),
  ];
  // 女人头上一块头巾
  if (female) parts.push(paint(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.25, 1).translate(0, 1.62, -0.03), '#6b5442'));
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true }));
  mesh.rotation.order = 'YXZ'; // 先转身，再低头
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, x: 0, z: 0, goal: [0, 0], size: 1, sizeGoal: 1, shown: 0, showGoal: 0, bow: 0, bowGoal: 0, face: null, speed: 1.6, survivor: false };
}

/** 让一个人出现在某个地方（不走过去，直接在那里慢慢显出来） */
export function appear(f: Figure, at: Spot, size: number, instant: boolean): void {
  f.x = at[0];
  f.z = at[1];
  f.goal = [at[0], at[1]];
  f.showGoal = 1;
  f.sizeGoal = size;
  if (instant) { f.shown = 1; f.size = size; }
  else if (f.shown < 0.01) f.size = size;
}

/** 让一个人走到某个地方；instant = true 时直接在那里 */
export function walk(f: Figure, to: Spot, instant: boolean): void {
  f.goal = [to[0], to[1]];
  if (instant) { f.x = to[0]; f.z = to[1]; }
}

/** 让一个人淡去 */
export function vanish(f: Figure, instant: boolean): void {
  f.showGoal = 0;
  if (instant) f.shown = 0;
}

export function updateFigure(f: Figure, dt: number, t: number): void {
  // 第 6 章洪水以后（W.perished = 1），前几章的人不再出现（不画死亡，只是不在了）
  f.shown = damp(f.shown, !f.survivor && W.perished > 0.5 ? 0 : f.showGoal, 1.4, dt);
  f.mesh.visible = f.shown > 0.01;
  if (!f.mesh.visible) return;
  const dx = f.goal[0] - f.x, dz = f.goal[1] - f.z, d = Math.hypot(dx, dz);
  const walking = d > 0.03;
  if (walking) {
    const step = Math.min(d, f.speed * dt);
    f.x += dx / d * step;
    f.z += dz / d * step;
  }
  f.size = damp(f.size, f.sizeGoal, 0.5, dt);
  f.bow = damp(f.bow, f.bowGoal, 1.5, dt);
  const bob = walking ? Math.abs(Math.sin(t * 7 + f.x)) * 0.04 : 0;
  f.mesh.position.set(f.x, (f.ground ? f.ground(f.x, f.z) : terrainY(f.x, f.z)) + bob, f.z);
  f.mesh.scale.setScalar(Math.max(0.001, f.size));
  // 走路时朝着走的方向；站着时面向 face 那一点，没有就面向玩家
  const look = f.face ?? [player.pos.x, player.pos.z];
  const want = walking ? Math.atan2(dx, dz) : Math.atan2(look[0] - f.x, look[1] - f.z);
  f.mesh.rotation.y += angleDiff(want, f.mesh.rotation.y) * (1 - Math.exp(-3 * dt));
  f.mesh.rotation.x = f.bow * 0.32;
  f.mesh.material.opacity = Math.min(1, f.shown * 1.2);
}

