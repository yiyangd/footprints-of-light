// 走兽（第六日）：绵羊、鹿、狮子。它们在自己的“家”附近慢慢走动、低头吃草。
import * as THREE from 'three';
import { angleDiff, clamp, rng } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { terrainY } from './heightmap';
import { groundAt } from './path';
import { leg, mergeParts, placeAt } from './shapes';

export type Species = 'sheep' | 'deer' | 'lion';

/** 三种动物的样子：每种都是几个球和圆柱拼成的 */
const SHAPES: Record<Species, THREE.BufferGeometry> = {
  sheep: mergeParts([
    { geo: new THREE.IcosahedronGeometry(0.5, 1), m: placeAt(0, 0.62, 0, 1.0, 0.82, 1.25), color: '#f4efe4' },
    { geo: new THREE.SphereGeometry(0.2, 8, 6), m: placeAt(0, 0.78, 0.62, 1, 1.1, 1.2), color: '#3d3430' },
    { geo: new THREE.SphereGeometry(0.08, 6, 4), m: placeAt(0.17, 0.85, 0.58, 1.6, 0.6, 1), color: '#3d3430' },
    { geo: new THREE.SphereGeometry(0.08, 6, 4), m: placeAt(-0.17, 0.85, 0.58, 1.6, 0.6, 1), color: '#3d3430' },
    leg(0.22, 0.32, 0.42, 0.06, '#3d3430'), leg(-0.22, 0.32, 0.42, 0.06, '#3d3430'), leg(0.22, -0.32, 0.42, 0.06, '#3d3430'), leg(-0.22, -0.32, 0.42, 0.06, '#3d3430'),
  ]),
  deer: mergeParts([
    { geo: new THREE.SphereGeometry(0.42, 10, 8), m: placeAt(0, 1.0, 0, 0.75, 0.75, 1.45), color: '#a8724a' },
    { geo: new THREE.CylinderGeometry(0.11, 0.15, 0.7, 6), m: placeAt(0, 1.38, 0.5, 1, 1, 1, -0.5), color: '#a8724a' },
    { geo: new THREE.SphereGeometry(0.17, 8, 6), m: placeAt(0, 1.7, 0.72, 0.9, 0.9, 1.4), color: '#9a6842' },
    { geo: new THREE.CylinderGeometry(0.025, 0.03, 0.5, 4), m: placeAt(0.12, 2.0, 0.62, 1, 1, 1, 0, 0, -0.4), color: '#e9dcc3' },
    { geo: new THREE.CylinderGeometry(0.025, 0.03, 0.5, 4), m: placeAt(-0.12, 2.0, 0.62, 1, 1, 1, 0, 0, 0.4), color: '#e9dcc3' },
    { geo: new THREE.SphereGeometry(0.1, 6, 4), m: placeAt(0, 1.05, -0.62), color: '#f2ead8' },
    leg(0.17, 0.42, 0.8, 0.05, '#7e5233'), leg(-0.17, 0.42, 0.8, 0.05, '#7e5233'), leg(0.17, -0.42, 0.8, 0.05, '#7e5233'), leg(-0.17, -0.42, 0.8, 0.05, '#7e5233'),
  ]),
  lion: mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 10, 8), m: placeAt(0, 0.85, -0.1, 0.8, 0.72, 1.4), color: '#d9a85a' },
    { geo: new THREE.IcosahedronGeometry(0.42, 1), m: placeAt(0, 1.1, 0.62, 1.05, 1.05, 0.8), color: '#9a5a26' },
    { geo: new THREE.SphereGeometry(0.24, 8, 6), m: placeAt(0, 1.08, 0.82, 1, 0.95, 1.1), color: '#e2b56a' },
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), m: placeAt(0, 0.9, -0.95, 1, 1, 1, 1.0), color: '#d9a85a' },
    leg(0.22, 0.4, 0.55, 0.09, '#c99748'), leg(-0.22, 0.4, 0.55, 0.09, '#c99748'), leg(0.22, -0.5, 0.55, 0.09, '#c99748'), leg(-0.22, -0.5, 0.55, 0.09, '#c99748'),
  ]),
};

/** 被剧情“叫来”的动物：走到 (x, z) 站好，然后转身面向 (faceX, faceZ) */
export interface Summon { x: number; z: number; faceX: number; faceZ: number }

/** 一只动物 */
export interface Animal {
  sp: Species;
  /** 它是这一种里的第几只 */
  i: number;
  mesh: THREE.InstancedMesh;
  x: number;
  z: number;
  yaw: number;
  /** 家：[x, z, 活动半径] */
  home: [number, number, number];
  /** 现在想走去的地方 */
  tx: number;
  tz: number;
  /** 还要站着等多少秒 */
  wait: number;
  speed: number;
  /** 出现的进度：小于 0 是还没轮到，1 是完全出现 */
  appear: number;
  phase: number;
  summon: Summon | null;
}

export const animals: Animal[] = [];
const meshes = {} as Record<Species, THREE.InstancedMesh>;

function buildAnimals(): void {
  const homes: Record<Species, Array<[number, number, number]>> = {
    sheep: [[6, -9, 9], [-17, 23, 8], [14, 30, 7]],
    deer: [[-20, 8, 12], [20, 8, 10]],
    lion: [[14, -21, 6]],
  };
  const counts: Record<Species, number> = { sheep: 10, deer: 5, lion: 2 };
  const R = rng(77);
  for (const sp of Object.keys(counts) as Species[]) {
    const mesh = new THREE.InstancedMesh(SHAPES[sp], new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), counts[sp]);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    meshes[sp] = mesh;
    for (let i = 0; i < counts[sp]; i++) {
      const home = homes[sp][i % homes[sp].length];
      const a = R() * 6.28, r = R() * home[2];
      const x = home[0] + Math.cos(a) * r, z = home[1] + Math.sin(a) * r;
      // 一开始“想去的地方”就是自己站的地方，等够了再在家附近另挑一处。
      // 以前这里是 (0, 0)，所有走兽一出现都先朝地图正中央走。
      animals.push({
        sp, i, mesh, x, z, yaw: R() * 6.28, home,
        tx: x, tz: z, wait: R() * 3, speed: sp === 'deer' ? 1.3 : 0.75, appear: 0, phase: R() * 6, summon: null,
      });
    }
  }
}
buildAnimals();

/** 让所有走兽出现。instant = true（读档）时直接全部出现，否则一只一只先后冒出来 */
export function showAnimals(instant: boolean): void {
  for (const mesh of Object.values(meshes)) mesh.visible = true;
  for (const a of animals) a.appear = instant ? 1 : -Math.random() * 1.5;
}

/** 让某一种动物显示出来（“给活物起名”时用） */
export function showSpecies(sp: Species): void {
  meshes[sp].visible = true;
}

const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
const vPos = new THREE.Vector3(), vScale = new THREE.Vector3();

/** 没被叫来的动物：等一会儿，然后在家附近另挑一个地方走过去 */
function pickNextSpot(a: Animal, dt: number): void {
  a.wait -= dt;
  if (a.wait <= 0 && Math.hypot(a.tx - a.x, a.tz - a.z) < 0.3) {
    const ang = Math.random() * 6.28, r = Math.random() * a.home[2];
    a.tx = a.home[0] + Math.cos(ang) * r;
    a.tz = a.home[1] + Math.sin(ang) * r;
    a.wait = 2 + Math.random() * 5;
  }
}

/** 每一帧：让每只动物走一小步，并把它画到新的位置 */
export function updateAnimals(dt: number, t: number): void {
  for (const a of animals) {
    if (!a.mesh.visible) continue;
    a.appear = Math.min(1, a.appear + dt * 0.6);
    let tx = a.tx, tz = a.tz;
    if (a.summon) { tx = a.summon.x; tz = a.summon.z; } else pickNextSpot(a, dt);
    // 朝目标走
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 0.25 && (a.wait <= 0 || a.summon)) {
      const step = Math.min(d, a.speed * dt * (a.summon ? 1.6 : 1));
      const nx = a.x + dx / d * step, nz = a.z + dz / d * step;
      if (groundAt(nx, nz) !== null && terrainY(nx, nz) > 0.1) {
        a.x = nx;
        a.z = nz;
        moving = true;
        a.yaw += angleDiff(Math.atan2(dx, dz), a.yaw) * (1 - Math.exp(-5 * dt));
      } else {
        // 前面是水，不走了，留在原地
        a.tx = a.x;
        a.tz = a.z;
      }
    }
    // 被叫来的动物到位以后，转身面向叫它的人
    if (a.summon && d < 0.3) {
      a.yaw += angleDiff(Math.atan2(a.summon.faceX - a.x, a.summon.faceZ - a.z), a.yaw) * (1 - Math.exp(-3 * dt));
    }
    // 第 6 章洪水的时候走兽藏起来（W.flooded = 1），出方舟以后又回来
    const gy = terrainY(a.x, a.z), size = Math.max(0.001, clamp(a.appear, 0, 1) * (1 - W.flooded));
    const hop = moving ? Math.abs(Math.sin(t * 7 + a.phase)) * 0.06 : 0;                               // 走路时一颠一颠
    const graze = !moving && !a.summon ? Math.max(0, Math.sin(t * 0.5 + a.phase)) * 0.12 : 0;        // 站着时低头吃草
    quat.setFromEuler(euler.set(graze, a.yaw, 0));
    vScale.setScalar(size * (a.sp === 'sheep' ? 0.68 : 0.85));
    m4.compose(vPos.set(a.x, gy + hop, a.z), quat, vScale);
    a.mesh.setMatrixAt(a.i, m4);
  }
  for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true;
}
