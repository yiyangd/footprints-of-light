// 第 4 章《兄弟》（创 4:1–26）专属的场景和效果。
// 内容在 content/episodes/gen-04-brothers.json；地点在伊甸东边那块地上，各个位置写在 gen-04-spots.ts。
//
// 呈现上守的几条（AGENTS.md 第 6 条）：
//   - 创 4:8 不呈现暴力：两兄弟走到远处的田间，天色变暗、风停了，亚伯的身影在远处的暗里淡去。没有特写，没有血
//   - 神不以人的样子出现：对该隐说话时，还是第 3 章那道光
//   - 献祭只看见坛上的火和烟，不画祭牲
//   - 人都是简单的身形，不画脸
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { angleDiff, damp, rng, smooth } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { tween } from '../core/tween';
import { cam, setFocus } from '../player/camera';
import { player } from '../player/player';
import type { Effect } from '../story/effects';
import { baseHeight, terrainY } from '../world/heightmap';
import { TREE_SPOTS } from '../world/plants';
import { startEvening } from '../world/sky';
import type { BROTHERS_EFFECTS } from './effect-names';
import { sendPerson } from './gen-02-eden';
import { presenceTo } from './gen-03-fall';
import type { Spot } from './gen-03-spots';
import { ALTARS, CAIN_HUT, CITY, DOOR, FIELD, HOME, LAMECH, OPEN_FIELD, PASTURE, STAND, WORSHIP } from './gen-04-spots';

/** 这一章自己的数值，都在 0 到 1 之间，由效果慢慢推动 */
const S = {
  home: 0,      // 亚当、夏娃的小屋盖起来了多少
  cainHut: 0,   // 该隐的小屋
  grain: 0,     // 该隐田里的庄稼长了多少
  wilt: 0,      // 庄稼枯了多少（创 4:12）
  flock: 0,     // 亚伯的羊群
  altars: 0,    // 两座坛
  abelFire: 0,  // 亚伯坛上的火
  cainFire: 0,  // 该隐坛上的火
  cainDrift: 0, // 该隐坛上的烟压得多低（创 4:5）
  regard: 0,    // 落在亚伯坛上的光（创 4:4）
  shadow: 0,    // 伏在门前的那团影子（创 4:7）
  ground: 0,    // 田间地上的微光（创 4:10）
  mark: 0,      // 该隐身上的记号（创 4:15）
  city: 0,      // 以诺城（创 4:17）
  tents: 0,     // 帐棚和牲畜（创 4:20）
  notes: 0,     // 琴和箫的声音（创 4:21）
  forge: 0,     // 打铜铁的炉火（创 4:22）
  flare: 0,     // 拉麦夸口时炉火变红（创 4:23）
  lamps: 0,     // 求告耶和华的人手里的灯（创 4:26）
};

// —— 小工具：把几个形状合成一个网格，画的时候只算一次（AGENTS.md 第 10 条：绘制次数要少） ——

/** 给一个形状涂上一种颜色 */
function paint(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** 把涂好颜色的几个形状合成一个 */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts);
  if (!g) throw new Error('第 4 章：形状合并失败');
  return g;
}

const solid = (): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** 地面最后的高度（陆地升起以后）。房子、坛这些不动的东西按它摆 */
const groundOf = (at: Spot): number => baseHeight(at[0], at[1]);

// —— 人：简单的身形（长衣、上身、头），每个人一个网格 ——

interface Figure {
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
}

const SKIN = '#ead8bc';

function makeFigure(robe: string, female = false): Figure {
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
  return { mesh, x: 0, z: 0, goal: [0, 0], size: 1, sizeGoal: 1, shown: 0, showGoal: 0, bow: 0, bowGoal: 0, face: null };
}

const P = {
  cain: makeFigure('#8a5a3a'),
  abel: makeFigure('#d9cdb4'),
  cainWife: makeFigure('#7a6a8a', true),
  enoch: makeFigure('#9a7a5a'),
  lamech: makeFigure('#6e2f2a'),
  adah: makeFigure('#8a6a4a', true),
  zillah: makeFigure('#5e6e7a', true),
  jabal: makeFigure('#6b5a3e'),
  jubal: makeFigure('#3f6a6a'),
  tubal: makeFigure('#4a4a4a'),
  naamah: makeFigure('#9a5a6a', true),
  seth: makeFigure('#c9b48f'),
  enosh: makeFigure('#b8a07a'),
};
/** 和塞特一家一起求告耶和华的人 */
const PEOPLE = ['#a08a6a', '#7a8a6a', '#8a7a9a'].map((c, i) => makeFigure(c, i === 1));

/** 让一个人出现在某个地方（不走过去，直接在那里慢慢显出来） */
function appear(f: Figure, at: Spot, size: number, instant: boolean): void {
  f.x = at[0];
  f.z = at[1];
  f.goal = [at[0], at[1]];
  f.showGoal = 1;
  f.sizeGoal = size;
  if (instant) { f.shown = 1; f.size = size; }
  else if (f.shown < 0.01) f.size = size;
}

/** 让一个人走到某个地方；instant = true 时直接在那里 */
function walk(f: Figure, to: Spot, instant: boolean): void {
  f.goal = [to[0], to[1]];
  if (instant) { f.x = to[0]; f.z = to[1]; }
}

/** 让一个人淡去 */
function vanish(f: Figure, instant: boolean): void {
  f.showGoal = 0;
  if (instant) f.shown = 0;
}

/** 让一个数值慢慢变成 to；instant = true 时直接变 */
const set = (key: keyof typeof S, to: number, sec: number, instant: boolean): void => tween(S, key, to, sec, instant);

const WALK_SPEED = 1.6;

function updateFigure(f: Figure, dt: number, t: number): void {
  f.shown = damp(f.shown, f.showGoal, 1.4, dt);
  f.mesh.visible = f.shown > 0.01;
  if (!f.mesh.visible) return;
  const dx = f.goal[0] - f.x, dz = f.goal[1] - f.z, d = Math.hypot(dx, dz);
  const walking = d > 0.03;
  if (walking) {
    const step = Math.min(d, WALK_SPEED * dt);
    f.x += dx / d * step;
    f.z += dz / d * step;
  }
  f.size = damp(f.size, f.sizeGoal, 0.5, dt);
  f.bow = damp(f.bow, f.bowGoal, 1.5, dt);
  const bob = walking ? Math.abs(Math.sin(t * 7 + f.x)) * 0.04 : 0;
  f.mesh.position.set(f.x, terrainY(f.x, f.z) + bob, f.z);
  f.mesh.scale.setScalar(Math.max(0.001, f.size));
  // 走路时朝着走的方向；站着时面向 face 那一点，没有就面向玩家
  const look = f.face ?? [player.pos.x, player.pos.z];
  const want = walking ? Math.atan2(dx, dz) : Math.atan2(look[0] - f.x, look[1] - f.z);
  f.mesh.rotation.y += angleDiff(want, f.mesh.rotation.y) * (1 - Math.exp(-3 * dt));
  f.mesh.rotation.x = f.bow * 0.32;
  f.mesh.material.opacity = Math.min(1, f.shown * 1.2);
}

// —— 房子、坛、帐棚、炉子：不动的东西，各合成一个网格，“从地里长出来” ——

/** 一间小屋：墙、四面坡的屋顶、一扇门。door 是门朝哪边（弧度，0 = 朝南） */
function hutParts(at: Spot, w: number, h: number, d: number, door: number): THREE.BufferGeometry[] {
  const y = groundOf(at);
  const place = (g: THREE.BufferGeometry): THREE.BufferGeometry => g.rotateY(door).translate(at[0], y, at[1]);
  return [
    paint(place(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)), '#a68a64'),
    paint(place(new THREE.ConeGeometry(Math.max(w, d) * 0.82, h * 0.85, 4).rotateY(Math.PI / 4).translate(0, h + h * 0.42, 0)), '#7d6a48'),
    paint(place(new THREE.BoxGeometry(0.55, h * 0.72, 0.06).translate(0, h * 0.36, d / 2 + 0.02)), '#3a2e24'),
  ];
}

/** 一个会从地里长出来的网格：每一帧按 S 里的数值决定长了多少 */
interface Rising { mesh: THREE.Mesh; key: keyof typeof S; baseY: number }
const risings: Rising[] = [];

function rising(geo: THREE.BufferGeometry, key: keyof typeof S): THREE.Mesh {
  // 把网格的原点放在它的最低点，这样往上长的时候是从地面长出来的
  geo.computeBoundingBox();
  const baseY = geo.boundingBox?.min.y ?? 0;
  geo.translate(0, -baseY, 0);
  const mesh = new THREE.Mesh(geo, solid());
  mesh.position.y = baseY;
  mesh.visible = false;
  scene.add(mesh);
  risings.push({ mesh, key, baseY });
  return mesh;
}

rising(merge(hutParts(HOME.hut, 2.3, 1.35, 2, 0)), 'home');
rising(merge(hutParts(CAIN_HUT, 1.8, 1.1, 1.6, Math.PI / 2)), 'cainHut');

/** 一座坛：三块石头叠起来 */
function altarParts(at: Spot): THREE.BufferGeometry[] {
  const y = groundOf(at), R = rng(Math.round(at[0] * 10 + at[1]));
  return [0.62, 0.5, 0.38].map((r, i) =>
    paint(new THREE.DodecahedronGeometry(r, 0).rotateY(R() * 3).translate(at[0], y + 0.3 + i * 0.42, at[1]), i === 2 ? '#a39b8f' : '#8f877b'));
}
rising(merge([...altarParts(ALTARS.abel), ...altarParts(ALTARS.cain)]), 'altars');

/** 以诺城：一圈方方的泥砖房子，屋顶是平的 */
function cityParts(): THREE.BufferGeometry[] {
  const R = rng(17), parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + 0.3, x = CITY.at[0] + Math.cos(a) * CITY.r, z = CITY.at[1] + Math.sin(a) * CITY.r;
    const w = 1.2 + R() * 0.5, h = 1.1 + R() * 0.6, y = groundOf([x, z]);
    parts.push(paint(new THREE.BoxGeometry(w, h, w).rotateY(-a).translate(x, y + h / 2 - 0.1, z), '#b39a74'));
    parts.push(paint(new THREE.BoxGeometry(w + 0.16, 0.12, w + 0.16).rotateY(-a).translate(x, y + h - 0.04, z), '#8c7553'));
  }
  return parts;
}
rising(merge(cityParts()), 'city');

/** 帐棚（雅八）：三顶深色的帐棚 */
const TENT_SPOTS: Spot[] = [[0, 0], [1.6, 0.9], [-1.3, 1.1]].map(([dx, dz]) => [LAMECH.tents[0] + dx, LAMECH.tents[1] + dz]);
rising(merge(TENT_SPOTS.map((at) => paint(new THREE.ConeGeometry(0.85, 1.3, 6).translate(at[0], groundOf(at) + 0.6, at[1]), '#4e3f33'))), 'tents');

/** 炉子（土八该隐）：一圈石头，旁边一块砧子 */
rising(merge([
  paint(new THREE.CylinderGeometry(0.55, 0.62, 0.45, 8).translate(LAMECH.forge[0], groundOf(LAMECH.forge) + 0.2, LAMECH.forge[1]), '#6f675e'),
  paint(new THREE.BoxGeometry(0.5, 0.35, 0.3).translate(LAMECH.forge[0] + 0.9, groundOf(LAMECH.forge) + 0.18, LAMECH.forge[1] - 0.3), '#4c4a48'),
]), 'forge');

// 镜头会躲开树（player/camera.ts 看的是 TREE_SPOTS）。房子、帐棚也让镜头躲开，免得镜头钻进墙里、被房子挡住
for (const at of [HOME.hut, CAIN_HUT, ...TENT_SPOTS]) TREE_SPOTS.push([at[0], at[1], 'east']);
for (let i = 0; i < 7; i++) {
  const a = i / 7 * Math.PI * 2 + 0.3;
  TREE_SPOTS.push([CITY.at[0] + Math.cos(a) * CITY.r, CITY.at[1] + Math.sin(a) * CITY.r, 'east']);
}

function updateRisings(): void {
  for (const r of risings) {
    const k = smooth(0, 1, S[r.key]);
    r.mesh.visible = k > 0.001;
    r.mesh.scale.y = Math.max(0.001, k);
  }
}

// —— 羊：亚伯的一群白羊，雅八的一小群深色的牲畜 ——

const sheepGeo = merge([
  paint(new THREE.IcosahedronGeometry(0.34, 0).scale(1, 0.8, 1.35).translate(0, 0.45, 0), '#f1ede4'),
  paint(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 0.56, 0.44), '#3b332e'),
]);

interface Flock { mesh: THREE.InstancedMesh; at: Spot; r: number; key: keyof typeof S; seeds: number[] }

function makeFlock(n: number, at: Spot, r: number, key: keyof typeof S, tint: string, seed: number): Flock {
  const mesh = new THREE.InstancedMesh(sheepGeo, solid(), n);
  const c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const R = rng(seed);
  return { mesh, at, r, key, seeds: Array.from({ length: n }, () => R()) };
}
const flocks = [
  makeFlock(7, PASTURE.at, PASTURE.r, 'flock', '#ffffff', 41),
  makeFlock(4, LAMECH.herd.at, LAMECH.herd.r, 'tents', '#8a6a4e', 42),
];

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3();

function updateFlocks(t: number): void {
  for (const f of flocks) {
    const k = smooth(0, 1, S[f.key]);
    f.mesh.visible = k > 0.001;
    if (!f.mesh.visible) continue;
    f.seeds.forEach((s, i) => {
      // 每只羊绕着草场中心慢慢地走，走走停停
      const a = s * 6.28 + Math.sin(t * 0.11 + s * 9) * 0.9, rr = f.r * (0.35 + 0.6 * ((s * 7.3) % 1));
      const x = f.at[0] + Math.cos(a) * rr, z = f.at[1] + Math.sin(a) * rr;
      e.set(0, -a + (Math.cos(t * 0.11 + s * 9) > 0 ? 0 : Math.PI), 0);
      m4.compose(vp.set(x, terrainY(x, z), z), q.setFromEuler(e), vs.setScalar(k * (0.8 + s * 0.3)));
      f.mesh.setMatrixAt(i, m4);
    });
    f.mesh.instanceMatrix.needsUpdate = true;
  }
}

// —— 该隐田里的庄稼：一根根金色的穗子；创 4:12 以后枯黄、倒伏 ——

const GRAIN_N = 150;
const grainMat = new THREE.MeshLambertMaterial({ color: '#efd27a', emissive: '#3a2a08', flatShading: true });
const grain = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.75, 4).translate(0, 0.37, 0), grainMat, GRAIN_N);
grain.frustumCulled = false;
grain.visible = false;
scene.add(grain);
const GRAIN = (() => {
  const R = rng(55);
  return Array.from({ length: GRAIN_N }, () => {
    const a = R() * 6.28, d = Math.sqrt(R()) * FIELD.r;
    return { x: FIELD.at[0] + Math.cos(a) * d, z: FIELD.at[1] + Math.sin(a) * d, s: 0.8 + R() * 0.4, lean: R() * 6.28 };
  });
})();
const GOLD = new THREE.Color('#efd27a'), WITHERED = new THREE.Color('#8a8174');
let grainDrawn = '';

function updateGrain(): void {
  grain.visible = S.grain > 0.001;
  const key = `${S.grain.toFixed(3)}|${S.wilt.toFixed(3)}`;
  if (!grain.visible || key === grainDrawn) return; // 数值没变就不用重画
  grainDrawn = key;
  GRAIN.forEach((g, i) => {
    e.set(S.wilt * 0.7, g.lean, 0, 'YXZ');
    m4.compose(vp.set(g.x, groundOf([g.x, g.z]) - 0.05, g.z), q.setFromEuler(e), vs.set(1, Math.max(0.001, S.grain * g.s * (1 - S.wilt * 0.4)), 1));
    grain.setMatrixAt(i, m4);
  });
  grain.instanceMatrix.needsUpdate = true;
  grainMat.color.copy(GOLD).lerp(WITHERED, S.wilt);
}

// —— 坛上的火和烟；落在亚伯坛上的光 ——

const fires = [ALTARS.abel, ALTARS.cain].map((at) => {
  const glow = glowSprite('#ffb15a', 1.3, 0);
  glow.position.set(at[0], groundOf(at) + 1.75, at[1]);
  scene.add(glow);
  return glow;
});

const SMOKE_N = 14;
function makeSmoke(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SMOKE_N * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.glow, size: 0.9, color: '#d9d2c6', transparent: true, opacity: 0, depthWrite: false }));
  p.frustumCulled = false;
  scene.add(p);
  return p;
}
const smokes = [makeSmoke(), makeSmoke()];

const regard = glowSprite('#fff3d0', 1, 0);
regard.scale.set(1.8, 10, 1); // 一道从上面照下来的光
regard.position.set(ALTARS.abel[0], groundOf(ALTARS.abel) + 5.5, ALTARS.abel[1]);
scene.add(regard);

function updateAltarFires(t: number): void {
  const levels = [S.abelFire, S.cainFire];
  fires.forEach((glow, i) => {
    glow.visible = levels[i] > 0.01;
    glow.material.opacity = levels[i] * (0.75 + Math.sin(t * 11 + i) * 0.1);
  });
  smokes.forEach((smoke, i) => {
    smoke.visible = levels[i] > 0.01;
    if (!smoke.visible) return;
    const at = i === 0 ? ALTARS.abel : ALTARS.cain, y0 = groundOf(at) + 1.9;
    // 亚伯坛上的烟一直往上升；该隐的烟被压低，往旁边散（创 4:5）
    const drift = i === 1 ? S.cainDrift : 0, height = 5 - drift * 3.6;
    const pos = smoke.geometry.attributes.position;
    for (let k = 0; k < SMOKE_N; k++) {
      const life = (t * 0.25 + k / SMOKE_N) % 1;
      pos.setXYZ(k, at[0] + Math.sin(t + k) * 0.15 + life * drift * 3, y0 + life * height, at[1] + Math.cos(t * 0.7 + k) * 0.15);
    }
    pos.needsUpdate = true;
    smoke.material.opacity = levels[i] * 0.45;
  });
  regard.visible = S.regard > 0.01;
  regard.material.opacity = S.regard * (0.5 + Math.sin(t * 1.3) * 0.06);
}

// —— 伏在门前的那团影子（创 4:7）：一团贴着地、慢慢蠕动的暗影 ——

const SHADOW_N = 16;
const shadowPts = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHADOW_N * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.glow, size: 1.1, color: '#140e12', transparent: true, opacity: 0, depthWrite: false }));
  p.frustumCulled = false;
  p.visible = false;
  scene.add(p);
  return p;
})();

function updateShadow(t: number): void {
  shadowPts.visible = S.shadow > 0.01;
  if (!shadowPts.visible) return;
  const pos = shadowPts.geometry.attributes.position, y = groundOf(DOOR);
  for (let k = 0; k < SHADOW_N; k++) {
    const a = k / SHADOW_N * 6.28 + t * 0.4;
    const r = 0.35 + Math.sin(t * 1.7 + k * 2.1) * 0.15;
    pos.setXYZ(k, DOOR[0] + Math.cos(a) * r, y + 0.25 + Math.abs(Math.sin(t * 1.3 + k)) * 0.35, DOOR[1] + Math.sin(a) * r * 0.8);
  }
  pos.needsUpdate = true;
  shadowPts.material.opacity = S.shadow * 0.8;
}

// —— 田间地上的微光（创 4:10）：不是血，是一片淡淡的光 ——

const groundGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
  map: TEX.glow, color: '#fff0c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
}));
groundGlow.position.set(OPEN_FIELD[0], groundOf(OPEN_FIELD) + 0.06, OPEN_FIELD[1]);
groundGlow.visible = false;
scene.add(groundGlow);

// —— 该隐身上的记号（创 4:15）：额前一点小小的光 ——

const mark = glowSprite('#ffe7a0', 0.34, 0);
mark.position.set(0, 1.62, 0.2);
P.cain.mesh.add(mark);

// —— 琴和箫（创 4:21）：几点金色的光从犹八身边升起来 ——

const NOTE_N = 10;
function makeRisingLights(n: number, size: number, color: string): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.glow, size, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  p.frustumCulled = false;
  p.visible = false;
  scene.add(p);
  return p;
}
const notes = makeRisingLights(NOTE_N, 0.3, '#ffd98a');

// —— 炉火和火星（创 4:22）；拉麦夸口时炉火变红（创 4:23） ——

const forgeGlow = glowSprite('#ff9a3a', 1.6, 0);
forgeGlow.position.set(LAMECH.forge[0], groundOf(LAMECH.forge) + 0.7, LAMECH.forge[1]);
scene.add(forgeGlow);
const SPARK_N = 18;
const sparks = makeRisingLights(SPARK_N, 0.16, '#ffb24a');
const ORANGE = new THREE.Color('#ff9a3a'), RED = new THREE.Color('#d8321e');

function updateMusicAndForge(t: number): void {
  notes.visible = S.notes > 0.01;
  if (notes.visible) {
    const pos = notes.geometry.attributes.position, [x, z] = STAND.jubal;
    for (let k = 0; k < NOTE_N; k++) {
      const life = (t * 0.3 + k / NOTE_N) % 1;
      pos.setXYZ(k, x + Math.sin(t * 2 + k * 1.7) * 0.5 * life, terrainY(x, z) + 1.4 + life * 2.2, z + Math.cos(t * 1.6 + k) * 0.4 * life);
    }
    pos.needsUpdate = true;
    notes.material.opacity = S.notes * 0.85;
  }
  forgeGlow.visible = S.forge > 0.01;
  forgeGlow.material.opacity = S.forge * (0.65 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05);
  forgeGlow.material.color.copy(ORANGE).lerp(RED, S.flare);
  forgeGlow.scale.setScalar(1.6 + S.flare * 1.4);
  sparks.visible = S.forge > 0.01;
  if (sparks.visible) {
    const pos = sparks.geometry.attributes.position, [x, z] = LAMECH.forge, y = groundOf(LAMECH.forge) + 0.5;
    for (let k = 0; k < SPARK_N; k++) {
      const life = (t * (0.7 + S.flare) + k / SPARK_N) % 1, a = k * 2.4;
      pos.setXYZ(k, x + Math.cos(a) * life * 0.8, y + life * (1.4 - life) * 2.4, z + Math.sin(a) * life * 0.8);
    }
    pos.needsUpdate = true;
    sparks.material.opacity = S.forge;
  }
}

// —— 求告耶和华的名（创 4:26）：围着坛站一圈，每人手里一盏灯 ——

/** 一圈里第 i 个人站的地方（离坛 WORSHIP.r 米） */
const ringSpot = (i: number): Spot => {
  const a = i / WORSHIP.count * Math.PI * 2 + Math.PI * 0.75;
  return [WORSHIP.at[0] + Math.cos(a) * WORSHIP.r, WORSHIP.at[1] + Math.sin(a) * WORSHIP.r];
};
const lamps = makeRisingLights(WORSHIP.count, 0.5, '#ffd36b');
(() => {
  const pos = lamps.geometry.attributes.position;
  for (let i = 0; i < WORSHIP.count; i++) {
    const [x, z] = ringSpot(i);
    // 灯在每个人的手上，稍微往坛那边伸一点
    pos.setXYZ(i, x + (WORSHIP.at[0] - x) * 0.18, groundOf([x, z]) + 1.15, z + (WORSHIP.at[1] - z) * 0.18);
  }
})();

function updateLamps(t: number): void {
  lamps.visible = S.lamps > 0.01;
  lamps.material.opacity = S.lamps * (0.85 + Math.sin(t * 5) * 0.08);
}

// —— 第 4 章的效果 ——

/** 镜头慢慢绕到玩家的另一边：yaw 是镜头在玩家哪个方向（0 = 南边，Math.PI = 北边） */
function turnCamera(yaw: number): void {
  tween(cam as { yaw: number }, 'yaw', cam.yaw + angleDiff(yaw, cam.yaw), 2.5);
}

/** 亚当、夏娃回到家门口（instant 时直接在那里） */
function parentsHome(instant: boolean): void {
  sendPerson('adam', HOME.adam, instant ? 'instant' : 'fade');
  sendPerson('eve', HOME.eve, instant ? 'instant' : 'fade');
}

export const effects: Record<(typeof BROTHERS_EFFECTS)[number], Effect> = {
  /** 创 4:1：园子外面，亚当、夏娃有了家；该隐出生 */
  brothersBorn(instant) {
    parentsHome(instant);
    set('home', 1, 3, instant);
    appear(P.cain, STAND.cainYoung, 0.5, instant);
    if (instant) return;
    music.set('rest');
    setFocus(HOME.hut[0], 1.2, HOME.hut[1], 0.7, 6);
  },
  /** 创 4:2：亚伯出生。季节轮转，两个孩子长大：亚伯去放羊，该隐去种地 */
  brothersGrow(instant) {
    appear(P.abel, STAND.abelYoung, 0.5, instant);
    const grown = (): void => {
      P.cain.sizeGoal = P.abel.sizeGoal = 1;
      sendPerson('adam', HOME.adamBack, instant ? 'instant' : 'walk');
      sendPerson('eve', HOME.eveBack, instant ? 'instant' : 'walk');
      walk(P.abel, STAND.abelPasture, instant);
      walk(P.cain, STAND.cainField, instant);
      set('flock', 1, 3, instant);
      set('grain', 1, 4, instant);
      set('cainHut', 1, 3, instant);
    };
    if (instant) {
      grown();
      P.cain.size = P.abel.size = 1;
      return;
    }
    // 天色一明一暗过两次：时间过去了
    startEvening();
    setTimeout(startEvening, 5800);
    setTimeout(grown, 1500);
  },
  /** 创 4:3：两座坛，两份供物 */
  offerings(instant) {
    set('altars', 1, 2.5, instant);
    set('abelFire', 1, 3, instant);
    set('cainFire', 1, 3, instant);
    walk(P.abel, STAND.abelAltar, instant);
    walk(P.cain, STAND.cainAltar, instant);
    P.abel.face = ALTARS.abel;
    P.cain.face = ALTARS.cain;
    if (!instant) setFocus(ALTARS.abel[0], 1.5, (ALTARS.abel[1] + ALTARS.cain[1]) / 2, 0.75, 8);
  },
  /** 创 4:4：耶和华看中了亚伯和他的供物：一道光落在亚伯的坛上 */
  regard(instant) {
    set('regard', 1, 3, instant);
    if (!instant) sfx.swell(0.5);
  },
  /** 创 4:5：该隐的烟压得低低的；他低下头，转过身去 */
  cainFalls(instant) {
    set('cainDrift', 1, 3, instant);
    set('cainFire', 0.45, 3, instant);
    P.cain.bowGoal = 1;
    P.cain.face = [ALTARS.cain[0] - 6, ALTARS.cain[1] + 3];
    if (instant) P.cain.bow = 1;
    else setFocus(STAND.cainAltar[0], 1.3, STAND.cainAltar[1], 0.8, 5);
  },
  /** 创 4:6：耶和华对该隐说话。该隐回到自己门口，那道光来到他身边 */
  warnCain(instant) {
    walk(P.cain, STAND.cainDoor, instant);
    P.cain.face = null;
    presenceTo([STAND.cainDoor[0] + 2.4, STAND.cainDoor[1] - 1.2], instant);
    set('regard', 0, 3, instant);
    if (!instant) setFocus(STAND.cainDoor[0], 1.2, STAND.cainDoor[1], 0.7, 6);
  },
  /** 创 4:7：罪伏在门前：门口出现一团蠕动的暗影 */
  sinAtDoor(instant) {
    set('shadow', 1, 3, instant);
    if (instant) return;
    music.set('shadow');
    setFocus(DOOR[0], 0.6, DOOR[1], 0.85, 6);
  },
  /** 创 4:8：田间。不呈现暴力：两兄弟走到远处，天色变暗、风停了，亚伯的身影在暗里淡去 */
  intoField(instant) {
    set('shadow', 0, 4, instant);
    presenceTo(null, instant);
    walk(P.abel, STAND.abelField, instant);
    walk(P.cain, STAND.cainField2, instant);
    P.abel.face = P.cain.face = null;
    set('abelFire', 0, 4, instant);
    set('cainFire', 0, 4, instant);
    tween(W, 'dim', 1, 7, instant);
    tween(W, 'wind', 0, 3, instant);
    tween(W, 'gust', 0, 3, instant);
    if (instant) { vanish(P.abel, true); return; }
    music.set('dark');
    setFocus(OPEN_FIELD[0], 1, OPEN_FIELD[1], 0.9, 12);
    setTimeout(() => vanish(P.abel, false), 8000);
  },
  /** 创 4:9：“你兄弟亚伯在哪里？”那道光来到该隐面前 */
  whereIsAbel(instant) {
    walk(P.cain, STAND.cainAfter, instant);
    presenceTo([STAND.cainAfter[0] - 0.6, STAND.cainAfter[1] - 2.6], instant);
  },
  /** 创 4:10：地上泛出一片淡淡的微光 */
  groundCries(instant) {
    set('ground', 1, 4, instant);
    if (!instant) setFocus(OPEN_FIELD[0], 0.3, OPEN_FIELD[1], 0.85, 6);
  },
  /** 创 4:12：地不再效力：该隐田里的庄稼枯黄、倒伏 */
  fieldWilts(instant) {
    set('wilt', 1, 5, instant);
    if (!instant) setFocus(FIELD.at[0], 0.5, FIELD.at[1], 0.7, 5);
  },
  /** 创 4:15：耶和华给该隐立一个记号，免得人杀他：额前一点小小的光 */
  markOfCain(instant) {
    set('mark', 1, 2, instant);
    if (instant) return;
    flash('white', 0.35, 0.4);
    setFocus(P.cain.x, 1.6, P.cain.z, 0.8, 5);
  },
  /** 创 4:16：该隐离开耶和华的面，往南走到挪得之地。天色慢慢回来一点 */
  toNod(instant) {
    walk(P.cain, STAND.cainNod, instant);
    presenceTo(null, instant);
    set('ground', 0.45, 6, instant);
    tween(W, 'dim', 0.35, 6, instant);
    tween(W, 'wind', 0.3, 6, instant);
  },
  /** 创 4:17：该隐建造了一座城；他的妻子和儿子以诺 */
  cityRises(instant) {
    set('city', 1, 5, instant);
    appear(P.cainWife, STAND.cainWife, 1, instant);
    appear(P.enoch, STAND.enoch, 0.6, instant);
    if (!instant) setFocus(CITY.at[0], 1, CITY.at[1], 0.8, 6);
  },
  /** 创 4:19：拉麦和他的两个妻子 */
  lamech(instant) {
    appear(P.lamech, LAMECH.lamech, 1, instant);
    appear(P.adah, STAND.adah, 1, instant);
    appear(P.zillah, STAND.zillah, 1, instant);
    if (instant) return;
    turnCamera(Math.PI); // 镜头绕到北边，往南看：拉麦一家、帐棚和城都在前面
    setFocus(LAMECH.lamech[0], 1.5, LAMECH.lamech[1], 0.95, 5);
  },
  /** 创 4:20：雅八，住帐棚、牧养牲畜的人 */
  tents(instant) {
    set('tents', 1, 3, instant);
    appear(P.jabal, STAND.jabal, 1, instant);
    if (!instant) setFocus(LAMECH.tents[0], 0.8, LAMECH.tents[1], 0.95, 5);
  },
  /** 创 4:21：犹八，弹琴吹箫的人 */
  lyre(instant) {
    appear(P.jubal, STAND.jubal, 1, instant);
    set('notes', 1, 2, instant);
    if (instant) return;
    sfx.melody([587.3, 659.3, 740, 880, 740, 659.3, 587.3, 440]);
    setFocus(STAND.jubal[0], 1.5, STAND.jubal[1], 0.95, 5);
  },
  /** 创 4:22：土八该隐，打铜铁的；他的妹妹拿玛 */
  forge(instant) {
    set('forge', 1, 2, instant);
    appear(P.tubal, STAND.tubal, 1, instant);
    appear(P.naamah, STAND.naamah, 1, instant);
    if (instant) return;
    sfx.clang();
    setFocus(LAMECH.forge[0], 0.8, LAMECH.forge[1], 0.95, 5);
  },
  /** 创 4:23：拉麦夸口报仇：炉火变红，天又暗了一些 */
  lamechSong(instant) {
    set('flare', 1, 3, instant);
    tween(W, 'dim', 0.55, 4, instant);
    set('notes', 0, 3, instant);
    if (instant) return;
    music.set('shadow');
    setFocus(LAMECH.lamech[0], 1.5, LAMECH.lamech[1], 0.95, 6);
  },
  /** 创 4:25：塞特出生，“代替亚伯”。天色亮回来一些 */
  sethBorn(instant) {
    parentsHome(instant);
    appear(P.seth, STAND.seth, 0.5, instant);
    set('flare', 0, 6, instant);
    tween(W, 'dim', 0.2, 5, instant);
    if (instant) return;
    music.set('rest');
    setFocus(HOME.hut[0], 1, HOME.hut[1] + 2, 0.7, 6);
  },
  /** 创 4:26：以挪士出生。那时候，人才求告耶和华的名：众人围着坛，手里的灯亮起来 */
  callOnName(instant) {
    P.seth.sizeGoal = 1;
    if (instant) P.seth.size = 1;
    appear(P.enosh, STAND.enosh, 0.55, instant);
    // 亚当、夏娃、塞特、以挪士和另外三个人，围着亚伯的坛站一圈，都面向坛
    sendPerson('adam', ringSpot(0), instant ? 'instant' : 'walk');
    sendPerson('eve', ringSpot(1), instant ? 'instant' : 'walk');
    const walkers = [P.seth, P.enosh];
    walkers.forEach((f, i) => { walk(f, ringSpot(2 + i), instant); f.face = WORSHIP.at; });
    PEOPLE.forEach((f, i) => { appear(f, ringSpot(4 + i), 1, instant); f.face = WORSHIP.at; });
    set('abelFire', 1, 3, instant);
    tween(W, 'dim', 0, 5, instant);
    tween(W, 'wind', 0.6, 5, instant);
    tween(W, 'fade', 0.6, 8, instant);
    if (instant) { S.lamps = 1; return; }
    setTimeout(() => set('lamps', 1, 3, false), 3500); // 等大家走到坛前，灯才亮起来
    setTimeout(() => sfx.swell(0.6), 3500);
    music.set('eden');
    setFocus(WORSHIP.at[0], 1.4, WORSHIP.at[1], 0.75, 9);
  },
};

/** 每一帧：更新这一章的人、羊、庄稼、房子、火、影子和光 */
export function update(dt: number, t: number): void {
  for (const f of [...Object.values(P), ...PEOPLE]) updateFigure(f, dt, t);
  updateRisings();
  updateFlocks(t);
  updateGrain();
  updateAltarFires(t);
  updateShadow(t);
  groundGlow.visible = S.ground > 0.01;
  groundGlow.material.opacity = S.ground * (0.5 + Math.sin(t * 1.2) * 0.1);
  mark.visible = S.mark > 0.01;
  mark.material.opacity = S.mark * (0.85 + Math.sin(t * 3) * 0.1);
  updateMusicAndForge(t);
  updateLamps(t);
}
