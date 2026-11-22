// 第 5 章《与神同行》（创 5:1–32，亚当的家谱）专属的场景和效果。
// 内容在 content/episodes/gen-05-generations.json；十代人的家沿着一条路排开，位置写在 gen-05-spots.ts。
//
// 很多人读经时会跳过家谱，这一章把它做成一条“时间长廊”（docs/设计方案.md 第 4 节）：
//   - 每走到一家是一代人：门口站着这一代的先祖，头上显示名字和岁数
//   - “生了……”：下一家的房子从地里长出来，天色一明一暗，时间过去了
//   - “就死了”：先祖的身影慢慢淡去（不画死亡，AGENTS.md 第 6 条）
//   - 以诺不一样：他和那道光一起走上小山，留下一串光的脚印，然后化作光升上去（创 5:24）
import * as THREE from 'three';
import { ELDERS } from '../content';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { esc } from '../core/i18n';
import { smooth } from '../core/math';
import { scene } from '../core/renderer';
import { glowSprite, TEX } from '../core/textures';
import { tween } from '../core/tween';
import { setFocus } from '../player/camera';
import type { Effect } from '../story/effects';
import { appear, type Figure, makeFigure, merge, paint, updateFigure, vanish, walk } from '../world/figures';
import { baseHeight, terrainY } from '../world/heightmap';
import { addLabel } from '../world/labels';
import { TREE_SPOTS } from '../world/plants';
import { startEvening } from '../world/sky';
import type { GENERATIONS_EFFECTS } from './effect-names';
import { personHead, retirePerson, sendPerson } from './gen-02-eden';
import { presenceTo } from './gen-03-fall';
import type { Spot } from './gen-03-spots';
import { endWorship } from './gen-04-brothers';
import { EVE_INSIDE, GENERATIONS, HILLTOP, NOAH_SONS } from './gen-05-spots';

const groundOf = (at: Spot): number => baseHeight(at[0], at[1]);

/** 这一章自己的数值 */
const S = {
  /** 每一家的房子长出来了多少（0 到 1），按家谱的顺序 */
  houses: GENERATIONS.map(() => 0),
  /** 以诺留下的光的脚印，显出来多少（0 到 1） */
  prints: 0,
  /** 以诺化作光升上去的进度（0 到 1） */
  rise: 0,
};

/** 每一代人现在还在不在世（决定头上的名字显不显示） */
const alive = GENERATIONS.map(() => false);

// —— 房子：每一家一间小屋，门朝着路（朝着先祖站的地方），各自从地里长出来 ——

function houseGeometry(at: Spot, door: Spot): THREE.BufferGeometry {
  const y = groundOf(at), face = Math.atan2(door[0] - at[0], door[1] - at[1]);
  const place = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.rotateY(face).translate(at[0], y, at[1]);
  const g = merge([
    paint(place(new THREE.BoxGeometry(1.7, 1.1, 1.5).translate(0, 0.55, 0)), '#ab9070'),
    paint(place(new THREE.ConeGeometry(1.35, 0.9, 4).rotateY(Math.PI / 4).translate(0, 1.55, 0)), '#806b4a'),
    paint(place(new THREE.BoxGeometry(0.45, 0.8, 0.06).translate(0, 0.4, 0.77)), '#3a2e24'),
  ]);
  g.computeBoundingBox();
  return g;
}

const houseMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const houses = GENERATIONS.map((gen) => {
  if (!gen.house) return null;
  const geo = houseGeometry(gen.house, gen.stand);
  // 原点放在房子最低处，往上长的时候是从地面长出来的
  const base = geo.boundingBox?.min.y ?? 0;
  geo.translate(0, -base, 0);
  const mesh = new THREE.Mesh(geo, houseMat);
  mesh.position.y = base;
  mesh.visible = false;
  scene.add(mesh);
  // 镜头会躲开树（TREE_SPOTS），也让它躲开房子
  TREE_SPOTS.push([gen.house[0], gen.house[1], 'east']);
  return mesh;
});

// 已经长好的房子合成一个网格来画：十座房子只算一次绘制（AGENTS.md 第 10 条）。
// 还在长的房子照样一座一座画（它们要一点点变高）。
const grownHouses = new THREE.Mesh(new THREE.BufferGeometry(), houseMat);
grownHouses.visible = false;
scene.add(grownHouses);
/** 现在合在一起的是哪几座（例如 "0,1,2"）；变了才重新合 */
let grownKey = '';

/** 把长好的那几座房子重新合成一个网格 */
function mergeGrownHouses(grown: number[]): void {
  grownHouses.geometry.dispose();
  grownHouses.geometry = grown.length
    ? merge(grown.map((i) => (houses[i] as THREE.Mesh).geometry.clone().translate(0, (houses[i] as THREE.Mesh).position.y, 0)))
    : new THREE.BufferGeometry();
  grownHouses.visible = grown.length > 0;
}

// —— 人：第 2 代到第 10 代（亚当是第 2 章那个发光的人），还有挪亚的三个儿子 ——

const ROBES = ['', '#8c7a5c', '#6f7d64', '#7a6a8a', '#8a6a4a', '#5e6e7a', '#d8cfb8', '#6b5a3e', '#7d5a52', '#4f6a7a'];
const elders: Array<Figure | null> = GENERATIONS.map((_, i) => (i === 0 ? null : makeFigure(ROBES[i])));
const sons = NOAH_SONS.map((_, i) => makeFigure(['#8a7a5c', '#6e5a4a', '#5e7a8a'][i]));
const enoch = elders[6] as Figure;

/** 第 i 代先祖头顶的位置（显示名字用）；看不见就是 null */
function headOf(i: number): THREE.Vector3 | null {
  if (i === 0) return personHead('adam');
  const f = elders[i];
  if (!f || !f.mesh.visible) return null;
  return new THREE.Vector3(f.x, terrainY(f.x, f.z) + 2.05 * f.size, f.z);
}

// 每一代先祖头上的名字和岁数（文字在 JSON 的 elders 里）
GENERATIONS.forEach((gen, i) => {
  const t = ELDERS[gen.id];
  if (!t) return;
  addLabel('elder', `<div class="nm">${esc(t.en)}</div><div class="zh" lang="zh-CN">${esc(t.zh)}</div>`,
    () => headOf(i), () => alive[i], { maxDist: 16 });
});

// —— 以诺留下的光的脚印：从他家门口一直到山顶 ——

const PRINT_N = 14;
const printMat = new THREE.MeshBasicMaterial({ map: TEX.glow, color: '#ffe7a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const prints = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 10).rotateX(-Math.PI / 2).scale(0.65, 1, 1.4), printMat, PRINT_N);
prints.frustumCulled = false;
prints.visible = false;
scene.add(prints);
const PRINT_FROM = GENERATIONS[6].stand;
const PATH_LEN = Math.hypot(HILLTOP[0] - PRINT_FROM[0], HILLTOP[1] - PRINT_FROM[1]);
(() => {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const dx = (HILLTOP[0] - PRINT_FROM[0]) / PATH_LEN, dz = (HILLTOP[1] - PRINT_FROM[1]) / PATH_LEN;
  for (let i = 0; i < PRINT_N; i++) {
    const k = (i + 0.5) / PRINT_N, side = i % 2 ? 0.14 : -0.14; // 左脚、右脚交替
    const x = PRINT_FROM[0] + dx * k * PATH_LEN - dz * side, z = PRINT_FROM[1] + dz * k * PATH_LEN + dx * side;
    m.compose(p.set(x, groundOf([x, z]) + 0.07, z), q.setFromEuler(e.set(0, Math.atan2(dx, dz), 0)), one);
    prints.setMatrixAt(i, m);
  }
  prints.instanceMatrix.needsUpdate = true;
})();

/** 以诺化作光升上去（创 5:24） */
const risingLight = glowSprite('#fff4d6', 1.6, 0);
risingLight.visible = false;
scene.add(risingLight);

// —— 效果 ——

/** 第 i 代出生：他的家从地里长出来，他出现在门口，慢慢长大；天色一明一暗，时间过去了 */
function born(i: number, instant: boolean): void {
  const gen = GENERATIONS[i], f = elders[i];
  tween(S.houses as unknown as Record<string, number>, String(i), 1, 3, instant); // 数组也可以按“第几个”慢慢变
  if (f) {
    appear(f, gen.stand, 0.55, instant);
    f.sizeGoal = 1;
    if (instant) f.size = 1;
  }
  alive[i] = true;
  if (instant) return;
  startEvening();
  setFocus(gen.stand[0], 1.2, gen.stand[1], 0.6, 5);
}

/** 第 i 代“就死了”：身影慢慢淡去，头上的名字也不再显示 */
function died(i: number, instant: boolean): void {
  alive[i] = false;
  if (i === 0) retirePerson('adam', instant);
  else {
    const f = elders[i];
    if (f) vanish(f, instant);
  }
  if (!instant) sfx.toll();
}

export const effects: Record<(typeof GENERATIONS_EFFECTS)[number], Effect> = {
  /** 创 5:1：亚当的后代记在下面。亚当站到自家门口，夏娃进屋去了 */
  bookOfAdam(instant) {
    endWorship(instant);
    sendPerson('adam', GENERATIONS[0].stand, instant ? 'instant' : 'fade');
    sendPerson('eve', EVE_INSIDE, instant ? 'instant' : 'fade');
    alive[0] = true;
    if (instant) return;
    music.set('rest');
    setFocus(GENERATIONS[0].stand[0], 1.4, GENERATIONS[0].stand[1], 0.6, 5);
  },
  bornSeth: (instant) => born(1, instant),
  diedAdam: (instant) => died(0, instant),
  bornEnosh: (instant) => born(2, instant),
  diedSeth: (instant) => died(1, instant),
  bornKenan: (instant) => born(3, instant),
  diedEnosh: (instant) => died(2, instant),
  bornMahalalel: (instant) => born(4, instant),
  diedKenan: (instant) => died(3, instant),
  bornJared: (instant) => born(5, instant),
  diedMahalalel: (instant) => died(4, instant),
  bornEnoch: (instant) => born(6, instant),
  diedJared: (instant) => died(5, instant),
  bornMethuselah: (instant) => born(7, instant),
  /** 创 5:22：以诺与神同行：那道光来到他身边，他们一起慢慢走上小山 */
  walkWithGod(instant) {
    enoch.speed = 0.8;
    enoch.face = null;
    walk(enoch, HILLTOP, instant);
    presenceTo([HILLTOP[0] + 0.9, HILLTOP[1] - 0.6], instant);
    if (instant) { S.prints = 1; return; }
    music.set('eden');
    setFocus(HILLTOP[0], 2, HILLTOP[1], 0.75, 9);
  },
  /** 创 5:24：神将他取去：以诺化作光升上去，只留下一串光的脚印 */
  enochTaken(instant) {
    walk(enoch, HILLTOP, true);
    vanish(enoch, instant);
    alive[6] = false;
    presenceTo(null, instant);
    S.prints = 1;
    if (instant) return;
    risingLight.position.set(HILLTOP[0], groundOf(HILLTOP) + 1.2, HILLTOP[1]);
    S.rise = 0;
    tween(S, 'rise', 1, 5);
    flash('white', 0.35, 0.6);
    sfx.swell(0.7);
    setFocus(HILLTOP[0], 6, HILLTOP[1], 0.8, 7);
  },
  bornLamech: (instant) => born(8, instant),
  diedMethuselah: (instant) => died(7, instant),
  bornNoah: (instant) => born(9, instant),
  diedLamech: (instant) => died(8, instant),
  /** 创 5:32：挪亚生了闪、含、雅弗 */
  noahSons(instant) {
    sons.forEach((f, i) => { appear(f, NOAH_SONS[i], 0.55, instant); f.face = GENERATIONS[9].stand; });
    if (!instant) setFocus(NOAH_SONS[1][0], 1, NOAH_SONS[1][1], 0.6, 5);
  },
};

/** 第 6 章开始时：挪亚一家搬走了（第 6 章在挪亚的地上另有他们一家） */
export function noahMovesAway(instant: boolean): void {
  alive[9] = false;
  for (const f of [elders[9], ...sons]) if (f) vanish(f, instant);
}

/** 以诺走了多远（0 到 1）：脚印随着他走一个一个出现 */
function enochProgress(): number {
  if (S.prints >= 1) return 1;
  if (!enoch.mesh.visible || enoch.speed > 1) return 0;
  return Math.min(1, Math.hypot(enoch.x - PRINT_FROM[0], enoch.z - PRINT_FROM[1]) / PATH_LEN);
}

/** 每一帧：更新这一章的房子、人、脚印和升上去的光 */
export function update(dt: number, t: number): void {
  const grown: number[] = [];
  houses.forEach((mesh, i) => {
    if (!mesh) return;
    const k = smooth(0, 1, S.houses[i]);
    if (k >= 1) grown.push(i); // 长好了：画在合起来的那个网格里
    mesh.visible = k > 0.001 && k < 1;
    mesh.scale.y = Math.max(0.001, k);
  });
  if (grown.join() !== grownKey) {
    grownKey = grown.join();
    mergeGrownHouses(grown);
  }
  for (const f of [...elders, ...sons]) if (f) updateFigure(f, dt, t);
  const shown = Math.floor(enochProgress() * PRINT_N);
  prints.visible = shown > 0;
  prints.count = shown;
  printMat.opacity = 0.75 + Math.sin(t * 2) * 0.12;
  risingLight.visible = S.rise > 0.001 && S.rise < 0.999;
  if (risingLight.visible) {
    risingLight.position.y = groundOf(HILLTOP) + 1.2 + S.rise * 9;
    risingLight.material.opacity = Math.sin(S.rise * Math.PI) * 0.95;
  }
}
