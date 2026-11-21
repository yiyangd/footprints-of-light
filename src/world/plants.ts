// 植物：草、花、树，还有岸边的石头。
// 用 InstancedMesh：同一种形状只交给显卡一次，就能画出几千棵（AGENTS.md 第 10 条）。
// 生长动画写在着色器里：到了 growth.start 的时刻，每一株按自己的 aDelay 依次长出来。
import * as THREE from 'three';
import { BEATS } from '../content';
import { CLEAR_SPOTS } from '../episodes/gen-04-spots';
import { CLEAR_SPOTS_5 } from '../episodes/gen-05-spots';
import { IS_TOUCH } from '../core/env';
import { rng } from '../core/math';
import { U } from '../core/state';
import { baseHeight, EDEN, riverMeander, RIVERS, T_CX, T_CZ, T_D, T_W } from './heightmap';
import { pathDist } from './path';
import { terrainGroup } from './terrain';

/** 三片植被：主岛（第三日长出来）、伊甸（走进园子时长出来）、伊甸的东边（和主岛一起，第三日长出来） */
export type Region = 'main' | 'eden' | 'east';

/** 主岛和伊甸东边一起长 */
const mainGrowth = { start: { value: 1e6 }, dur: { value: 2.2 } };

/** 每一片从什么时刻开始长（start）、每一株长多久（dur）。start 很大 = 还没开始长 */
export const growth: Record<Region, { start: { value: number }; dur: { value: number } }> = {
  main: mainGrowth,
  east: mainGrowth,
  eden: { start: { value: 1e6 }, dur: { value: 2.4 } },
};

/** 每棵树的位置 [x, z, 哪一片]。镜头用它来避开树干 */
export const TREE_SPOTS: Array<[number, number, Region]> = [];

/** 撒下的一个点：位置、那里的地面高度，再加一个 0 到 1 的随机数（决定大小、颜色、朝向） */
interface Spot { x: number; z: number; h: number; R: number }

/** 给材质加上“慢慢长出来”的动画；sway = true 还会随风摇摆 */
function growMaterial<T extends THREE.Material>(base: T, key: string, region: Region, sway: boolean): T {
  const grow = growth[region];
  base.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.uniforms.uGrowStart = grow.start;
    s.uniforms.uGrowDur = grow.dur;
    s.vertexShader = 'attribute float aDelay;\nuniform float uTime;\nuniform float uGrowStart;\nuniform float uGrowDur;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float gk = clamp((uTime - uGrowStart - aDelay) / uGrowDur, 0.0, 1.0); gk = gk*gk*(3.0-2.0*gk);
       ${sway ? 'vec3 ip = instanceMatrix[3].xyz; float sw = sin(uTime*1.7 + ip.x*0.35 + ip.z*0.27); transformed.x += sw*0.13*position.y; transformed.z += cos(uTime*1.3 + ip.x*0.2)*0.06*position.y;' : ''}
       transformed *= gk;`);
  };
  base.customProgramCacheKey = () => key;
  return base;
}

/**
 * 在整张地图上随机撒点，只留下 accept 说“可以”的那些，直到凑够 count 个。
 * 用带种子的随机数，所以每次打开游戏撒出来的位置都一样。
 */
function scatter(count: number, seed: number, accept: (x: number, z: number, h: number) => boolean, height: (x: number, z: number) => number = baseHeight): Spot[] {
  const R = rng(seed), out: Spot[] = [];
  let tries = 0;
  while (out.length < count && tries < count * 60) {
    tries++;
    const x = T_CX - T_W / 2 + R() * T_W, z = T_CZ - T_D / 2 + R() * T_D;
    const h = height(x, z);
    if (accept(x, z, h)) out.push({ x, z, h, R: R() });
  }
  return out;
}

/** (x, z) 在不在伊甸园里（离泉源 rad 米以内） */
const inEden = (x: number, z: number, rad = 25): boolean => Math.hypot(x - EDEN.x, z - EDEN.z) < rad;

/** (x, z) 在不在伊甸东边那块地上（第 4 章） */
const inEastLand = (x: number, z: number): boolean => x > 86 && !inEden(x, z, 27);

/** (x, z) 是不是离泉源和四道河都够远（河里不长草） */
function notRiver(x: number, z: number): boolean {
  const dx = x - EDEN.x, dz = z - EDEN.z;
  if (Math.hypot(dx, dz) < 4) return false;
  for (const rv of RIVERS) {
    const t = dx * rv.ux + dz * rv.uz;
    if (t > 1 && Math.abs(dx * -rv.uz + dz * rv.ux - riverMeander(t)) < 2.4) return false;
  }
  return true;
}

// 摆放每一株时用的临时变量
const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), col = new THREE.Color();
const vPos = new THREE.Vector3(), vScale = new THREE.Vector3();

interface Counts { grass: number; flowers: number; trees: number }

/**
 * 种一片植被。
 * @param region 哪一片
 * @param origin 从哪里开始长：离这个点越远的植物长出来得越晚
 * @param filter 哪些位置可以种
 */
function buildVegetation(region: Region, origin: [number, number], filter: (x: number, z: number) => boolean, counts: Counts, seed: number, clear: Array<{ at: [number, number]; r: number }> = []): void {
  const group = new THREE.Group();
  terrainGroup.add(group);
  const delayFrom = (s: Spot): number => Math.hypot(s.x - origin[0], s.z - origin[1]) / 14 + s.R * 0.6;

  /** 把一种形状画很多份：place 负责把第 i 份摆到位置上 */
  const make = (geo: THREE.BufferGeometry, mat: THREE.Material, items: Spot[], place: (s: Spot, i: number, mesh: THREE.InstancedMesh) => void): void => {
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.frustumCulled = false;
    const delays = new Float32Array(items.length);
    items.forEach((s, i) => { place(s, i, mesh); delays[i] = delayFrom(s); });
    geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  // —— 草：每一株是两片交叉的三角形 ——
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, 0, 0.42, 0, 0, 0, -0.05, 0, 0, 0.05, 0, 0.38, 0], 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute([0.55, 0.62, 0.45, 0.55, 0.62, 0.45, 1, 1, 0.85, 0.55, 0.62, 0.45, 0.55, 0.62, 0.45, 1, 1, 0.85], 3));
  blade.computeVertexNormals();
  const grassItems = scatter(counts.grass, seed, (x, z, h) => h > 0.45 && filter(x, z) && pathDist(x, z) > 0.9);
  make(blade, growMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'grass-' + region, region, true), grassItems, (s, i, mesh) => {
    const size = 0.55 + s.R * 0.6;
    quat.setFromEuler(euler.set(0, s.R * 6.28, 0));
    m4.compose(vPos.set(s.x, s.h - 0.02, s.z), quat, vScale.set(size, size * (0.75 + s.R * 0.5), size));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, col.setHSL(0.24 + s.R * 0.07, 0.45, 0.42 + s.R * 0.12));
  });

  // —— 花：五种颜色的小球 ——
  const flowerItems = scatter(counts.flowers, seed + 1, (x, z, h) => h > 0.5 && filter(x, z));
  const flowerGeo = new THREE.IcosahedronGeometry(0.065, 0);
  flowerGeo.translate(0, 0.22, 0);
  const FLOWER_COLORS = ['#fff6e8', '#ffd56b', '#f49ac1', '#b9a4ff', '#ff8f6b'];
  make(flowerGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff' }), 'flower-' + region, region, true), flowerItems, (s, i, mesh) => {
    m4.compose(vPos.set(s.x, s.h, s.z), quat.identity(), vScale.set(1, 1, 1));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, col.set(FLOWER_COLORS[Math.floor(s.R * FLOWER_COLORS.length)]));
  });

  // —— 树：树干 + 圆树冠，或者像柏树一样的尖树冠 ——
  // 树不种在路边，也不种在剧情节点旁边，免得挡住视线
  const treeItems = scatter(counts.trees, seed + 2, (x, z, h) =>
    h > 0.9 && filter(x, z) && pathDist(x, z) > 5.5 && BEATS.every((b) => Math.hypot(b.at[0] - x, b.at[1] - z) > 6)
    && clear.every((c) => Math.hypot(c.at[0] - x, c.at[1] - z) > c.r));
  for (const t of treeItems) TREE_SPOTS.push([t.x, t.z, region]);
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.22, 1.7, 6);
  trunkGeo.translate(0, 0.85, 0);
  make(trunkGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#7a5a3c', flatShading: true }), 'trunk-' + region, region, false), treeItems, (s, i, mesh) => {
    const size = 0.7 + s.R * 0.55;
    quat.setFromEuler(euler.set(0, s.R * 6, 0));
    m4.compose(vPos.set(s.x, s.h - 0.05, s.z), quat, vScale.set(size, size, size));
    mesh.setMatrixAt(i, m4);
  });
  const roundItems = treeItems.filter((t) => t.R < 0.68), coneItems = treeItems.filter((t) => t.R >= 0.68);
  const roundGeo = new THREE.IcosahedronGeometry(1.15, 0);
  roundGeo.translate(0, 2.35, 0);
  make(roundGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), 'round-' + region, region, false), roundItems, (s, i, mesh) => {
    const size = 0.7 + s.R * 0.55;
    quat.setFromEuler(euler.set(0, s.R * 9, 0));
    m4.compose(vPos.set(s.x, s.h - 0.05, s.z), quat, vScale.set(size * 1.1, size, size * 1.1));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, col.setHSL(0.26 + s.R * 0.08, 0.5, 0.36 + s.R * 0.1));
  });
  const coneGeo = new THREE.ConeGeometry(0.75, 2.8, 7);
  coneGeo.translate(0, 2.6, 0);
  make(coneGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), 'cone-' + region, region, false), coneItems, (s, i, mesh) => {
    const size = 0.75 + s.R * 0.5;
    m4.compose(vPos.set(s.x, s.h - 0.05, s.z), quat.identity(), vScale.set(size, size * 1.15, size));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, col.setHSL(0.3 + s.R * 0.05, 0.45, 0.28 + s.R * 0.08));
  });
}

/**
 * 岸边的石头（随陆地一起升起）。
 * 照“伊甸东边那块地还没有”时的海岸线撒点，这样加了那块地以后，原来的石头一块都不挪；
 * 原来在伊甸东岸、现在成了内陆的那两块去掉。新的那块地另外撒一些。
 */
function buildRocks(): void {
  const coast = (x: number, z: number, h: number): boolean => h > -0.2 && h < 1.2 && !inEden(x, z, 25);
  const old = scatter(60, 303, coast, (x, z) => baseHeight(x, z, false))
    .filter((s) => Math.abs(baseHeight(s.x, s.z) - s.h) < 0.2);
  const east = scatter(16, 304, (x, z, h) => coast(x, z, h) && inEastLand(x, z));
  const items = [...old, ...east];
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ color: '#a79e92', flatShading: true }), items.length);
  items.forEach((s, i) => {
    const size = 0.4 + s.R * 1.1;
    quat.setFromEuler(euler.set(s.R * 3, s.R * 7, 0));
    m4.compose(vPos.set(s.x, s.h, s.z), quat, vScale.set(size, size * 0.7, size));
    mesh.setMatrixAt(i, m4);
  });
  terrainGroup.add(mesh);
}

// 手机上少种一些，保证流畅
const VEG: Counts = IS_TOUCH ? { grass: 2600, flowers: 300, trees: 55 } : { grass: 6000, flowers: 650, trees: 80 };
// 主岛：从第三日的节点那里开始往外长
buildVegetation('main', [-4, 16.5], (x, z) => !inEden(x, z, 27) && x < 40, VEG, 101);
// 伊甸：从园子的入口开始往里长
buildVegetation('eden', [42, -15], (x, z) => inEden(x, z, 25) && notRiver(x, z),
  { grass: Math.round(VEG.grass * 0.45), flowers: Math.round(VEG.flowers * 0.9), trees: 26 }, 202);
// 伊甸的东边和再往北的那块地（第 4、5 章）：草和花少一些，树更少；房子、田、坛、城那些地方不种树
buildVegetation('east', [90, -15], inEastLand,
  { grass: Math.round(VEG.grass * 0.22), flowers: Math.round(VEG.flowers * 0.15), trees: 14 }, 404, [...CLEAR_SPOTS, ...CLEAR_SPOTS_5]);
buildRocks();
