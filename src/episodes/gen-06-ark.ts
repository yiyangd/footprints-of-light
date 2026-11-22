// 第 6 章《方舟》（创 6:1–8:22）专属的场景和效果。
// 内容在 content/episodes/gen-06-ark.json；地点在东南边挪亚的地上，南边是亚拉腊山，位置写在 gen-06-spots.ts。
//
// 洪水淹过整个世界（W.flood 是水面的高度）：方舟浮起来，带着站在顶上的玩家漂到亚拉腊山顶，水退了停在那里。
// 呈现上守的几条（AGENTS.md 第 6 条）：
//   - 神不以人的样子出现：只有风、光和声音
//   - 创 7:21–23 不画死亡：只有经文；走兽、飞鸟在洪水的时候藏起来，前几章的人以后不再出现
//   - 献祭只看见坛上的火和烟
import * as THREE from 'three';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { lerp, rng, smooth } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { tween } from '../core/tween';
import { cam, setFocus } from '../player/camera';
import { player } from '../player/player';
import type { Effect } from '../story/effects';
import { appear, type Figure, makeFigure, merge, paint, updateFigure, vanish } from '../world/figures';
import { baseHeight, terrainY } from '../world/heightmap';
import { addPlatform } from '../world/platforms';
import { startEvening } from '../world/sky';
import type { ARK_EFFECTS } from './effect-names';
import { retireDove, retirePerson } from './gen-02-eden';
import type { Spot } from './gen-03-spots';
import { noahMovesAway } from './gen-05-generations';
import {
  ALTAR, ARK, ARK_BUILD, ARK_REST, ARRIVAL, FAMILY, FOUNTAINS, GATHER, NOAH_HOUSE, RAMP_IN, RAMP_OUT, SHADOWS, SPREAD,
} from './gen-06-spots';

const groundOf = (at: Spot): number => baseHeight(at[0], at[1]);

/** 这一章自己的数值，大多在 0 到 1 之间，由效果慢慢推动 */
const S = {
  shadows: 0, // 地上罪恶的暗影（创 6:5、6:11）
  plan: 0,    // 方舟的轮廓：发光的线（创 6:14）
  decks: 0,   // 三层甲板和门的线（创 6:16）
  food: 0,    // 堆在方舟旁边的粮食（创 6:21）
  built: 0,   // 方舟造好了多少（创 6:22）
  rampIn: 0,  // 进方舟的跳板
  door: 1,    // 门开着多少：1 开着，0 关上（创 7:16）
  lamps: 0,   // 方舟里的灯（门关上以后，透光处透出一点暖光）
  rain: 0,
  fountains: 0,
  drift: 0,   // 方舟从造的地方漂到亚拉腊山顶，0 到 1
  hatch: 0,   // 透光处的盖子打开了多少（创 8:6）
  raven: 0,   // 乌鸦飞了多远（0 到 1）
  dove: 0,    // 鸽子：0–1 第一次（飞出去又回来），1–2 第二次（叼回橄榄叶），2–3 第三次（不再回来）
  rampOut: 0, // 出方舟的跳板
  altar: 0,   // 坛
  fire: 0,    // 坛上的火
  aroma: 0,   // 落在坛上的光（创 8:21）
};
const set = (key: keyof typeof S, to: number, sec: number, instant: boolean): void => tween(S, key, to, sec, instant);
const flood = (to: number, sec: number, instant: boolean): void => tween(W, 'flood', to, sec, instant);

// —— 方舟 ——

/** 方舟吃水多深（浮着的时候，船底比水面低多少） */
const DRAFT = 0.6;
const L = ARK.length, Wd = ARK.width, H = ARK.height;

/** 方舟现在的位置：(x, z) 是中心，y 是船底 */
const ark = { x: ARK_BUILD[0], z: ARK_BUILD[1], y: 0, prevX: ARK_BUILD[0], prevZ: ARK_BUILD[1] };

/** 方舟在 (cx, cz) 的时候，船底下最高的那块地有多高（方舟搁在上面） */
function groundUnderArk(cx: number, cz: number): number {
  let top = -Infinity;
  for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) top = Math.max(top, baseHeight(cx + i * L / 4.4, cz + j * Wd / 2.4));
  return top;
}

/** 方舟的样子：船身、底下涂的松香（创 6:14）、透光处（创 6:16）、顶、三层甲板的线、门 */
function buildArk(): { group: THREE.Group; door: THREE.Mesh; hatch: THREE.Mesh; lamps: THREE.Sprite[] } {
  const group = new THREE.Group();
  const body = merge([
    paint(new THREE.BoxGeometry(L, H * 0.85, Wd).translate(0, H * 0.425, 0), '#7a5a3a'),
    paint(new THREE.BoxGeometry(L + 0.04, 0.4, Wd + 0.04).translate(0, 0.2, 0), '#3a2a1c'),
    paint(new THREE.BoxGeometry(L - 0.4, H * 0.15, Wd - 0.4).translate(0, H * 0.925, 0), '#2a2018'),
    paint(new THREE.BoxGeometry(L + 0.3, 0.15, Wd + 0.3).translate(0, H + 0.075, 0), '#5e4630'),
    ...[H / 3, H * 2 / 3].flatMap((y) => [-1, 1].map((s) => paint(new THREE.BoxGeometry(L, 0.06, 0.04).translate(0, y, s * (Wd / 2 + 0.02)), '#9a7650'))),
    // 门洞：门打开时看得见里面是暗的
    paint(new THREE.BoxGeometry(1.3, H * 0.55, 0.05).translate(0, H * 0.62, -Wd / 2 - 0.01), '#1e1610'),
  ]);
  group.add(new THREE.Mesh(body, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  // 门：下边是转轴，打开时往外放下来
  const doorGeo = new THREE.BoxGeometry(1.3, H * 0.55, 0.08).translate(0, H * 0.275, 0);
  const door = new THREE.Mesh(doorGeo, new THREE.MeshLambertMaterial({ color: '#6b4e32', flatShading: true }));
  door.position.set(0, H * 0.345, -Wd / 2 - 0.06);
  group.add(door);
  // 顶上透光处的盖子（创 8:6 挪亚开了窗户）
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1).translate(0.6, 0, 0), new THREE.MeshLambertMaterial({ color: '#5e4630', flatShading: true }));
  hatch.position.set(-0.6, H + 0.2, 0);
  group.add(hatch);
  // 方舟里的灯：门关上以后，透光处透出一点暖光
  const lamps = [-L / 3, 0, L / 3].map((x) => {
    const s = glowSprite('#ffcf7a', 1.4, 0);
    s.position.set(x, H * 0.92, 0);
    group.add(s);
    return s;
  });
  group.visible = false;
  scene.add(group);
  return { group, door, hatch, lamps };
}
const arkMesh = buildArk();

/** 方舟的轮廓（创 6:14–16）：一个发光的框，三层甲板的线 */
const lineMat = (): THREE.LineBasicMaterial => new THREE.LineBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, Wd)), lineMat());
const deckLines = new THREE.LineSegments(new THREE.EdgesGeometry(merge([
  ...[H / 3, H * 2 / 3].map((y) => paint(new THREE.BoxGeometry(L, 0.001, Wd).translate(0, y - H / 2, 0), '#fff')),
  paint(new THREE.BoxGeometry(1.3, H * 0.55, 0.001).translate(0, H * 0.12, -Wd / 2), '#fff'),
])), lineMat());
for (const l of [outline, deckLines]) { l.visible = false; scene.add(l); }

/** 方舟顶能站人；跳板也能站人（world/platforms.ts） */
const deck = {
  dx: 0, dz: 0,
  height(x: number, z: number): number | null {
    if (S.built < 0.95) return null;
    return Math.abs(x - ark.x) < L / 2 && Math.abs(z - ark.z) < Wd / 2 ? ark.y + H + 0.15 : null;
  },
  // 洪水的时候掉进水里，回到方舟顶的正中
  refuge(): [number, number, number] | null {
    return W.flood > 0.5 && S.built > 0.95 ? [ark.x, ark.y + H + 0.4, ark.z] : null;
  },
};
addPlatform(deck);

/** 一块跳板：从 base（地上）到 top（门口，比方舟顶低 0.55 米，再一步就能上到顶上） */
function rampHeight(r: { base: Spot; top: Spot }, x: number, z: number): number | null {
  if (Math.abs(x - r.base[0]) > 0.8) return null;
  const t = (z - r.base[1]) / (r.top[1] - r.base[1]);
  if (t < 0 || t > 1) return null;
  return lerp(groundOf(r.base) + 0.05, ark.y + H - 0.55, t);
}
addPlatform({ dx: 0, dz: 0, height: (x, z) => (S.rampIn > 0.5 ? rampHeight(RAMP_IN, x, z) : null) });
addPlatform({ dx: 0, dz: 0, height: (x, z) => (S.rampOut > 0.5 ? rampHeight(RAMP_OUT, x, z) : null) });

/** 跳板的样子：一块斜着的长木板 */
function rampMesh(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1), new THREE.MeshLambertMaterial({ color: '#8a6a46', flatShading: true }));
  m.visible = false;
  scene.add(m);
  return m;
}
const ramps = [{ mesh: rampMesh(), r: RAMP_IN, key: 'rampIn' as const }, { mesh: rampMesh(), r: RAMP_OUT, key: 'rampOut' as const }];

function updateRamps(): void {
  for (const { mesh, r, key } of ramps) {
    mesh.visible = S[key] > 0.01;
    if (!mesh.visible) continue;
    const y0 = groundOf(r.base) + 0.05, y1 = ark.y + H - 0.55;
    const dz = r.top[1] - r.base[1], len = Math.hypot(dz, y1 - y0);
    mesh.position.set(r.base[0], (y0 + y1) / 2 - 0.06, (r.base[1] + r.top[1]) / 2);
    mesh.scale.set(1, 1, len * S[key]);
    mesh.rotation.set(-Math.atan2(y1 - y0, dz), 0, 0);
  }
}

function updateArk(): void {
  const k = smooth(0, 1, S.drift);
  ark.prevX = ark.x;
  ark.prevZ = ark.z;
  ark.x = lerp(ARK_BUILD[0], ARK_REST[0], k);
  ark.z = lerp(ARK_BUILD[1], ARK_REST[1], k);
  // 搁在地上，或者浮在水上（船底比水面低一点）
  ark.y = Math.max(groundUnderArk(ark.x, ark.z), W.flood - DRAFT);
  deck.dx = ark.x - ark.prevX;
  deck.dz = ark.z - ark.prevZ;
  const g = arkMesh.group;
  g.visible = S.built > 0.001;
  g.position.set(ark.x, ark.y, ark.z);
  g.scale.set(1, Math.max(0.001, smooth(0, 1, S.built)), 1); // 从船底往上一层层造起来
  arkMesh.door.rotation.x = -1.35 * S.door;
  arkMesh.hatch.rotation.z = S.hatch * 1.2;
  for (const l of arkMesh.lamps) l.material.opacity = S.lamps * 0.6;
  // 轮廓：造好以后就不用了
  const lines = S.plan * (1 - S.built);
  outline.visible = lines > 0.01;
  outline.material.opacity = lines * 0.9;
  outline.position.set(ARK_BUILD[0], groundUnderArk(...ARK_BUILD) + H / 2, ARK_BUILD[1]);
  deckLines.visible = S.decks * (1 - S.built) > 0.01;
  deckLines.material.opacity = S.decks * (1 - S.built) * 0.9;
  deckLines.position.copy(outline.position);
  updateRamps();
}

// —— 挪亚的家、粮食、坛 ——

function hutGeo(at: Spot): THREE.BufferGeometry {
  const y = groundOf(at);
  return merge([
    paint(new THREE.BoxGeometry(2, 1.2, 1.8).translate(at[0], y + 0.6, at[1]), '#a98c68'),
    paint(new THREE.ConeGeometry(1.6, 1, 4).rotateY(Math.PI / 4).translate(at[0], y + 1.7, at[1]), '#7f6a48'),
    paint(new THREE.BoxGeometry(0.5, 0.85, 0.06).translate(at[0], y + 0.42, at[1] - 0.92), '#3a2e24'),
  ]);
}
const house = new THREE.Mesh(hutGeo(NOAH_HOUSE), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
house.visible = false;
scene.add(house);
let houseShown = 0;

/** 粮食（创 6:21）：方舟北边几袋粮食、几筐果子 */
const food = (() => {
  const R = rng(66), parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const x = ARK_BUILD[0] - 5 + R() * 9, z = ARK_BUILD[1] - Wd / 2 - 1.2 - R() * 1.6, y = baseHeight(x, z);
    parts.push(i % 3 ? paint(new THREE.SphereGeometry(0.28, 7, 5).scale(1, 0.8, 1).translate(x, y + 0.22, z), '#c8b07a')
      : paint(new THREE.CylinderGeometry(0.3, 0.24, 0.35, 8).translate(x, y + 0.17, z), '#8a6a3e'));
  }
  const m = new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.visible = false;
  scene.add(m);
  return m;
})();

/** 坛（创 8:20）：三块石头，上面的火和笔直往上的烟；落在坛上的光（创 8:21） */
const altar = (() => {
  const y = groundOf(ALTAR);
  const m = new THREE.Mesh(merge([0.6, 0.48, 0.36].map((r, i) => paint(new THREE.DodecahedronGeometry(r, 0).rotateY(i).translate(ALTAR[0], y + 0.3 + i * 0.4, ALTAR[1]), '#9a9286'))),
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.visible = false;
  scene.add(m);
  return m;
})();
const altarFire = glowSprite('#ffb15a', 1.3, 0);
altarFire.position.set(ALTAR[0], groundOf(ALTAR) + 1.65, ALTAR[1]);
scene.add(altarFire);
const aroma = glowSprite('#fff3d0', 1, 0);
aroma.scale.set(1.8, 10, 1);
aroma.position.set(ALTAR[0], groundOf(ALTAR) + 6, ALTAR[1]);
scene.add(aroma);

// —— 很多点组成的东西：暗影、雨、泉源、坛上的烟 ——

function points(n: number, size: number, color: string, additive: boolean): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({
    map: TEX.glow, size, color, transparent: true, opacity: 0, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive,
  }));
  p.frustumCulled = false;
  p.visible = false;
  scene.add(p);
  return p;
}

const SHADOW_N = 12;
const shadowPts = points(SHADOWS.length * SHADOW_N, 1.2, '#140e12', false);
const RAIN_N = 700;
const rain = points(RAIN_N, 0.14, '#d4dceb', false);
const RAIN_SEED = (() => { const R = rng(7); return Array.from({ length: RAIN_N }, () => [R() * 50 - 25, R() * 20, R() * 50 - 25]); })();
const SPOUT_N = 24;
const spouts = points(FOUNTAINS.length * SPOUT_N, 0.7, '#e6f4ff', true);
const SMOKE_N = 14;
const smoke = points(SMOKE_N, 0.9, '#d9d2c6', false);

function updateParticles(t: number): void {
  // 暗影：贴着地面慢慢蠕动
  shadowPts.visible = S.shadows > 0.01;
  if (shadowPts.visible) {
    const pos = shadowPts.geometry.attributes.position;
    SHADOWS.forEach(([x, z], s) => {
      const y = groundOf([x, z]);
      for (let k = 0; k < SHADOW_N; k++) {
        const a = k / SHADOW_N * 6.28 + t * 0.4 + s, r = 0.5 + Math.sin(t * 1.5 + k * 2 + s) * 0.25;
        pos.setXYZ(s * SHADOW_N + k, x + Math.cos(a) * r, y + 0.3 + Math.abs(Math.sin(t * 1.2 + k)) * 0.4, z + Math.sin(a) * r * 0.8);
      }
    });
    pos.needsUpdate = true;
    shadowPts.material.opacity = S.shadows * 0.75;
  }
  // 雨：围着镜头下，下到水面就从上面重新落
  rain.visible = S.rain > 0.01;
  if (rain.visible) {
    const pos = rain.geometry.attributes.position, c = cam.pos, top = c.y + 14;
    RAIN_SEED.forEach(([x, y, z], i) => {
      const fall = (y - t * 16) % 20;
      pos.setXYZ(i, c.x + x, top + (fall < 0 ? fall + 20 : fall) - 20, c.z + z);
    });
    pos.needsUpdate = true;
    rain.material.opacity = S.rain * 0.55;
  }
  // 大渊的泉源：海里往上喷的水
  spouts.visible = S.fountains > 0.01;
  if (spouts.visible) {
    const pos = spouts.geometry.attributes.position;
    FOUNTAINS.forEach(([x, z], s) => {
      for (let k = 0; k < SPOUT_N; k++) {
        const life = (t * 0.6 + k / SPOUT_N + s * 0.37) % 1, a = k * 2.4;
        pos.setXYZ(s * SPOUT_N + k, x + Math.cos(a) * life * 1.2, W.flood + life * (1 - life) * 14, z + Math.sin(a) * life * 1.2);
      }
    });
    pos.needsUpdate = true;
    spouts.material.opacity = S.fountains * 0.8;
  }
  // 坛上的烟：笔直往上
  smoke.visible = S.fire > 0.01;
  if (smoke.visible) {
    const pos = smoke.geometry.attributes.position, y0 = groundOf(ALTAR) + 1.8;
    for (let k = 0; k < SMOKE_N; k++) {
      const life = (t * 0.25 + k / SMOKE_N) % 1;
      pos.setXYZ(k, ALTAR[0] + Math.sin(t + k) * 0.15, y0 + life * 5, ALTAR[1] + Math.cos(t * 0.7 + k) * 0.15);
    }
    pos.needsUpdate = true;
    smoke.material.opacity = S.fire * 0.45;
  }
  altarFire.visible = S.fire > 0.01;
  altarFire.material.opacity = S.fire * (0.75 + Math.sin(t * 11) * 0.1);
  aroma.visible = S.aroma > 0.01;
  aroma.material.opacity = S.aroma * (0.5 + Math.sin(t * 1.3) * 0.06);
}

// —— 人：挪亚一家八口（洪水以后还在） ——

const ROBES = ['#d8cfb8', '#8a6a4a', '#7a8a6a', '#6e5a4a', '#5e7a8a', '#9a7a8a', '#8a7a5c', '#7a6a8a'];
const family = FAMILY.map((_, i) => {
  const f = makeFigure(ROBES[i], i === 1 || i >= 5);
  f.survivor = true;
  return f;
});
const noah = family[0];
const favorGlow = glowSprite('#ffe7a0', 2.2, 0);
favorGlow.position.set(0, 1.1, 0);
noah.mesh.add(favorGlow);
let favor = 0;

/** 让人沿着几个点一个接一个地走；走到最后一点以后 done 会被调用一次 */
interface Route { f: Figure; points: Spot[]; step: number; done?: () => void }
const routes: Route[] = [];

function follow(f: Figure, pts: Spot[], done?: () => void): void {
  for (let i = routes.length - 1; i >= 0; i--) if (routes[i].f === f) routes.splice(i, 1);
  f.goal = [pts[0][0], pts[0][1]];
  routes.push({ f, points: pts, step: 0, done });
}

function updateRoutes(): void {
  for (let i = routes.length - 1; i >= 0; i--) {
    const r = routes[i], [gx, gz] = r.points[r.step];
    if (Math.hypot(r.f.x - gx, r.f.z - gz) > 0.05) continue;
    r.step++;
    if (r.step < r.points.length) r.f.goal = [r.points[r.step][0], r.points[r.step][1]];
    else { routes.splice(i, 1); r.done?.(); }
  }
}

/** 走在跳板上时脚下的高度；不在跳板上就是地面 */
function rampGround(x: number, z: number): number {
  const a = S.rampIn > 0.5 ? rampHeight(RAMP_IN, x, z) : null;
  const b = S.rampOut > 0.5 ? rampHeight(RAMP_OUT, x, z) : null;
  return Math.max(a ?? -Infinity, b ?? -Infinity, terrainY(x, z));
}
for (const f of family) f.ground = rampGround;

// —— 走兽：一对一对（创 7:9），每一种两只 ——

interface Beast { mesh: THREE.Mesh; x: number; z: number; pts: Spot[]; step: number; start: number; on: boolean }

/** 一只四条腿的走兽：身子、头、四条腿，按种类给大小和颜色 */
function beastGeo(size: number, body: string, head: string, tall = 1): THREE.BufferGeometry {
  const s = size, legH = 0.35 * s * tall;
  const parts = [
    paint(new THREE.IcosahedronGeometry(0.34 * s, 0).scale(1, 0.75, 1.4).translate(0, legH + 0.22 * s, 0), body),
    paint(new THREE.SphereGeometry(0.15 * s, 8, 6).translate(0, legH + 0.4 * s, 0.48 * s), head),
  ];
  for (const [lx, lz] of [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]]) {
    parts.push(paint(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, legH, 5).translate(lx * s, legH / 2, lz * s), head));
  }
  return merge(parts);
}
const KINDS = [
  beastGeo(1, '#f1ede4', '#3b332e'),          // 绵羊
  beastGeo(1.4, '#b88a56', '#7a5a3a', 1.6),   // 鹿
  beastGeo(1.5, '#d9a84e', '#a8742e'),        // 狮子
  beastGeo(1.6, '#8a6a4e', '#f1ede4'),        // 牛
  beastGeo(0.9, '#5a4a40', '#2e2622'),        // 山羊
  beastGeo(2.2, '#8a8a8e', '#6e6e72', 1.2),   // 大象
];
const beastMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const beasts: Beast[] = KINDS.flatMap((geo) => [0, 1].map(() => {
  const mesh = new THREE.Mesh(geo, beastMat);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, x: 0, z: 0, pts: [], step: 0, start: 0, on: false } as Beast;
}));
let clock = 0;

/** 让走兽一对一对地沿着几个点走，走完就消失（进了方舟，或散到地上去了） */
function sendBeasts(pathFor: (i: number) => Spot[], instant: boolean): void {
  beasts.forEach((b, i) => {
    b.on = !instant;
    b.mesh.visible = false;
    if (instant) return;
    b.pts = pathFor(i);
    b.step = 0;
    [b.x, b.z] = b.pts[0];
    b.start = clock + Math.floor(i / 2) * 1.1 + (i % 2) * 0.25; // 一对一对，前后跟着
  });
}

function updateBeasts(dt: number, t: number): void {
  for (const b of beasts) {
    if (!b.on || clock < b.start) continue;
    const [gx, gz] = b.pts[b.step], dx = gx - b.x, dz = gz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.05) {
      b.step++;
      if (b.step >= b.pts.length) { b.on = false; b.mesh.visible = false; continue; }
    } else {
      const step = Math.min(d, 1.5 * dt);
      b.x += dx / d * step;
      b.z += dz / d * step;
      b.mesh.rotation.y = Math.atan2(dx, dz);
    }
    b.mesh.visible = true;
    b.mesh.position.set(b.x, rampGround(b.x, b.z) + Math.abs(Math.sin(t * 8 + b.start)) * 0.04, b.z);
  }
}

// —— 乌鸦和鸽子（创 8:7–12） ——

function makeBird(color: string): { group: THREE.Group; wings: THREE.Mesh[]; leaf: THREE.Mesh } {
  const group = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 0.8, 1.6), mat));
  const wings = [-1, 1].map((s) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.14, s * 0.55, 0, -0.05], 3));
    g.computeVertexNormals();
    const w = new THREE.Mesh(g, mat);
    group.add(w);
    return w;
  });
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4).scale(0.6, 0.2, 1.6), new THREE.MeshLambertMaterial({ color: '#6f9a3a' }));
  leaf.position.set(0, -0.02, 0.32);
  leaf.visible = false;
  group.add(leaf);
  group.visible = false;
  scene.add(group);
  return { group, wings, leaf };
}
const raven = makeBird('#1f1c22');
const dove = makeBird('#f6f4ee');
const birdAt = new THREE.Vector3();

/** 从窗口飞出去：k 从 0 到 1，back = true 时最后飞回窗口 */
function flightPos(k: number, back: boolean, side: number, out: THREE.Vector3): THREE.Vector3 {
  const reach = back ? Math.sin(k * Math.PI) : smooth(0, 1, k); // 飞回来的路线是一个来回
  const a = side + k * 2.6;
  return out.set(ark.x + Math.cos(a) * reach * 16, ark.y + H + 1 + reach * 6, ark.z + Math.sin(a) * reach * 16);
}

function updateBirds(t: number): void {
  const flap = (wings: THREE.Mesh[]): void => wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 14) * 0.6; });
  raven.group.visible = S.raven > 0.01 && S.raven < 0.99;
  if (raven.group.visible) {
    flightPos(S.raven, false, 0.4, birdAt);
    raven.group.position.copy(birdAt);
    raven.group.rotation.y = 0.4 + S.raven * 2.6 + Math.PI / 2;
    flap(raven.wings);
  }
  // 鸽子：每一次飞行是 0–1、1–2、2–3 里的一段；落在整数上就是停在方舟里
  const trip = Math.floor(S.dove), k = S.dove - trip;
  dove.group.visible = k > 0.01 && k < 0.99 && trip < 3;
  if (dove.group.visible) {
    flightPos(k, trip < 2, 2.2 + trip, birdAt);
    dove.group.position.copy(birdAt);
    dove.group.rotation.y = 2.2 + trip + k * 2.6 + Math.PI / 2;
    dove.leaf.visible = trip === 1 && k > 0.5; // 第二次飞回来时，嘴里叼着橄榄叶（创 8:11）
    flap(dove.wings);
  }
}

// —— 效果 ——

/** 一家八口走进方舟：先到跳板下面，再走上去，到了门口就进去（看不见了） */
function familyIn(instant: boolean): void {
  family.forEach((f, i) => {
    if (instant) { vanish(f, true); return; }
    appear(f, f.shown > 0.01 ? [f.x, f.z] : FAMILY[i], 1, false);
    setTimeout(() => follow(f, [[RAMP_IN.base[0] + (i % 2 ? 0.3 : -0.3), RAMP_IN.base[1] - 0.6], RAMP_IN.base, RAMP_IN.top], () => vanish(f, false)), i * 700);
  });
}

/** 一家八口从门口出来，走下跳板，站到坛的附近 */
function familyOutNow(instant: boolean): void {
  family.forEach((f, i) => {
    const stand: Spot = [ALTAR[0] + 1.6 + (i % 4) * 0.9, ALTAR[1] - 1.8 + Math.floor(i / 4) * 1.1];
    if (instant) { appear(f, stand, 1, true); return; }
    setTimeout(() => {
      appear(f, RAMP_OUT.top, 1, false);
      follow(f, [RAMP_OUT.base, stand]);
    }, i * 700);
  });
}

export const effects: Record<(typeof ARK_EFFECTS)[number], Effect> = {
  /** 很多年以后：故事来到另一片地上（挪亚的地） */
  manyYearsLater(instant) {
    noahMovesAway(instant);
    if (instant) return;
    flash('black', 1, 1.2);
    setTimeout(() => {
      player.pos.set(ARRIVAL[0], groundOf(ARRIVAL) + 0.3, ARRIVAL[1]);
      player.facing = Math.PI / 2; // 面朝东边
      cam.yaw = player.facing + Math.PI;
      cam.pos.set(ARRIVAL[0] - 7, groundOf(ARRIVAL) + 3, ARRIVAL[1]);
    }, 450);
    music.set('rest');
  },
  /** 创 6:5：人的罪恶很大：地上几团暗影，天色暗下来 */
  darkness(instant) {
    set('shadows', 0.6, 3, instant);
    tween(W, 'dim', 0.35, 4, instant);
    if (!instant) music.set('shadow');
  },
  /** 创 6:8：惟有挪亚在耶和华眼前蒙恩：挪亚在家门口，身上一点暖光 */
  favor(instant) {
    houseShown = 1;
    appear(noah, FAMILY[0], 1, instant);
    favor = 1;
    if (!instant) setFocus(FAMILY[0][0], 1.4, FAMILY[0][1], 0.7, 6);
  },
  /** 创 6:9：挪亚的家：妻子和三个儿子 */
  noahFamily(instant) {
    for (let i = 1; i <= 4; i++) appear(family[i], FAMILY[i], 1, instant);
  },
  /** 创 6:11：地上满了强暴：暗影更多、更浓 */
  violence(instant) {
    set('shadows', 1, 3, instant);
    tween(W, 'dim', 0.5, 4, instant);
  },
  /** 创 6:14：要用歌斐木造一只方舟：造方舟的地方出现发光的轮廓 */
  arkPlan(instant) {
    set('plan', 1, 3, instant);
    if (!instant) setFocus(ARK_BUILD[0], 1.5, ARK_BUILD[1], 0.8, 7);
  },
  /** 创 6:16：分上、中、下三层，门开在旁边 */
  arkDecks(instant) {
    set('decks', 1, 3, instant);
  },
  /** 创 6:21：预备各样的食物 */
  gatherFood(instant) {
    set('food', 1, 2, instant);
  },
  /** 创 6:22：挪亚就这样行：方舟一层层造起来 */
  arkBuilt(instant) {
    set('built', 1, 8, instant);
    if (instant) return;
    sfx.clang(4);
    setTimeout(() => sfx.clang(4), 2500);
    setFocus(ARK_BUILD[0], 1.5, ARK_BUILD[1], 0.8, 8);
  },
  /** 创 7:7：挪亚和妻子、儿子、儿妇都进入方舟：跳板放下来，一家人走上去 */
  familyEnters(instant) {
    set('rampIn', 1, 1.5, instant);
    for (let i = 5; i < 8; i++) appear(family[i], FAMILY[i], 1, instant);
    familyIn(instant);
    if (!instant) setFocus(RAMP_IN.top[0], 1.5, RAMP_IN.top[1], 0.7, 7);
  },
  /** 创 7:9：都是一对一对地到挪亚那里进入方舟 */
  animalsEnter(instant) {
    sendBeasts((i) => [[GATHER[0] + (i % 2) * 0.8, GATHER[1] + Math.floor(i / 2) * 0.5], [RAMP_IN.base[0], RAMP_IN.base[1] - 0.5], RAMP_IN.base, RAMP_IN.top], instant);
    if (!instant) setFocus(RAMP_IN.base[0] + 3, 1, RAMP_IN.base[1], 0.7, 9);
  },
  /** 创 7:11：大渊的泉源都裂开了，天上的窗户也敞开了 */
  floodgates(instant) {
    set('fountains', 1, 3, instant);
    set('rain', 0.6, 3, instant);
    set('shadows', 0, 4, instant);
    tween(W, 'dim', 0.7, 4, instant);
    flood(0.8, 6, instant);
    if (instant) return;
    music.set('dark');
    sfx.rumble();
  },
  /** 创 7:12：四十昼夜降大雨 */
  heavyRain(instant) {
    set('rain', 1, 3, instant);
    tween(W, 'gust', 0.7, 3, instant);
    flood(1.6, 8, instant);
    if (!instant) sfx.rumble();
  },
  /** 创 7:16：耶和华就把他关在方舟里头：门关上了，跳板收起来，透光处亮起一点灯光 */
  doorShut(instant) {
    set('door', 0, 2.5, instant);
    set('rampIn', 0, 0.1, instant);
    set('food', 0, 1, instant);
    set('lamps', 1, 3, instant);
    if (!instant) sfx.tone(98, 0, 1.2, 0.08, 'triangle');
  },
  /** 创 7:17：水往上长，把方舟从地上漂起 */
  waterRises(instant) {
    flood(4, 8, instant);
    tween(W, 'flooded', 1, 8, instant); // 走兽、飞鸟藏起来
  },
  /** 创 7:18：方舟在水面上漂来漂去：漂向亚拉腊山 */
  arkFloats(instant) {
    flood(8, 10, instant);
    set('drift', 1, 26, instant);
  },
  /** 创 7:19：天下的高山都淹没了 */
  mountainsCovered(instant) {
    flood(10.8, 10, instant);
  },
  /** 创 7:21：凡在地上有血肉的动物都死了。不画死亡：只有经文，音乐停下来 */
  perishedAll(instant) {
    W.perished = 1; // 第 4、5 章的人和羊群都淡去（figures.ts、gen-04）
    retirePerson('eve', instant); // 夏娃（第 5 章起在小屋里）
    retireDove(); // 伊甸石头上的鸽子
    if (!instant) music.hush(6);
  },
  /** 创 7:23：只留下挪亚和那些与他同在方舟里的：镜头看着水面上孤零零的方舟 */
  onlyNoah(instant) {
    if (!instant) setFocus(ark.x, ark.y + H, ark.z, 0.6, 8);
  },
  /** 创 8:1：神记念挪亚，叫风吹地 */
  windOver(instant) {
    tween(W, 'gust', 1, 2, instant);
    if (instant) { W.gust = 0.3; return; }
    setTimeout(() => tween(W, 'gust', 0.3, 5), 5000);
    sfx.whoosh();
    music.set('rest');
  },
  /** 创 8:2：渊源和天上的窗户都闭塞了，大雨也止住了 */
  rainStops(instant) {
    set('rain', 0, 4, instant);
    set('fountains', 0, 4, instant);
    tween(W, 'dim', 0.3, 6, instant);
  },
  /** 创 8:3：水从地上渐退 */
  waterRecedes(instant) {
    flood(9.6, 8, instant);
    set('drift', 1, 2, instant); // 万一还没漂到，就让它漂到
  },
  /** 创 8:4：方舟停在亚拉腊山上 */
  arkRests(instant) {
    flood(8.4, 6, instant);
    if (!instant) setTimeout(() => sfx.tone(73.4, 0, 1.5, 0.1, 'triangle'), 2500);
  },
  /** 创 8:5：山顶都现出来了 */
  peaksAppear(instant) {
    flood(6, 8, instant);
    if (!instant) music.set('eden');
  },
  /** 创 8:6：挪亚开了方舟的窗户 */
  openWindow(instant) {
    set('hatch', 1, 2, instant);
  },
  /** 创 8:7：放出一只乌鸦，飞来飞去 */
  raven(instant) {
    set('raven', 1, 9, instant);
  },
  /** 创 8:8：放出一只鸽子去 */
  doveOut(instant) {
    set('dove', 0.5, 3, instant);
  },
  /** 创 8:9：鸽子找不着落脚之地，就回到方舟 */
  doveBack(instant) {
    set('dove', 1, 3, instant);
  },
  /** 创 8:10：又等了七天，再把鸽子放出去 */
  doveAgain(instant) {
    flood(4.5, 6, instant);
    set('dove', 1.5, 3, instant);
  },
  /** 创 8:11：鸽子嘴里叼着一个新拧下来的橄榄叶子回来 */
  oliveLeaf(instant) {
    set('dove', 2, 3, instant);
    if (!instant) setFocus(ark.x, ark.y + H + 1, ark.z, 0.6, 5);
  },
  /** 创 8:12：再放出鸽子去，鸽子不再回来了 */
  doveGone(instant) {
    flood(2.5, 6, instant);
    set('dove', 3, 6, instant);
  },
  /** 创 8:13：地上的水都干了 */
  dryGround(instant) {
    flood(0, 8, instant);
    tween(W, 'dim', 0.15, 6, instant);
    set('hatch', 0, 2, instant);
  },
  /** 创 8:18：挪亚就和他的妻子、儿子、儿妇都出来了 */
  familyOut(instant) {
    set('door', 1, 2, instant);
    set('rampOut', 1, 1.5, instant);
    set('lamps', 0, 3, instant);
    favor = 0;
    familyOutNow(instant);
    if (!instant) setFocus(RAMP_OUT.base[0], 1.2, RAMP_OUT.base[1], 0.7, 7);
  },
  /** 创 8:19：一切走兽、昆虫、飞鸟，各从其类，都出了方舟：散到地上去，世界上的走兽、飞鸟又回来了 */
  animalsOut(instant) {
    sendBeasts((i) => [RAMP_OUT.top, RAMP_OUT.base, SPREAD[i % SPREAD.length], [SPREAD[i % SPREAD.length][0] + (i % 2 ? 6 : -6), SPREAD[i % SPREAD.length][1] + 4]], instant);
    tween(W, 'flooded', 0, 8, instant);
  },
  /** 创 8:20：挪亚为耶和华筑了一座坛，献燔祭 */
  noahAltar(instant) {
    set('altar', 1, 2, instant);
    set('fire', 1, 3, instant);
    if (instant) return;
    follow(noah, [[ALTAR[0] + 1.2, ALTAR[1] - 0.4]]);
    noah.face = ALTAR;
    setFocus(ALTAR[0], 1.5, ALTAR[1], 0.75, 7);
  },
  /** 创 8:21：耶和华闻那馨香之气：一道光落在坛上 */
  pleasingAroma(instant) {
    set('aroma', 1, 3, instant);
    if (!instant) sfx.swell(0.6);
  },
  /** 创 8:22：稼穑、寒暑、冬夏、昼夜永不停息：天色一明一暗，颜色回来一些 */
  seasons(instant) {
    tween(W, 'dim', 0, 5, instant);
    tween(W, 'fade', 0.4, 8, instant);
    if (instant) return;
    startEvening();
    setTimeout(startEvening, 6000);
    music.set('rest');
  },
};

/** 每一帧：更新方舟、跳板、人、走兽、飞鸟、雨、泉源和坛 */
export function update(dt: number, t: number): void {
  clock += dt;
  updateArk();
  const hk = smooth(0, 1, houseShown ? Math.min(1, house.scale.y + dt * 0.5) : 0);
  house.visible = hk > 0.001;
  house.scale.y = Math.max(0.001, hk);
  food.visible = S.food > 0.01;
  food.scale.setScalar(Math.max(0.001, S.food));
  altar.visible = S.altar > 0.01;
  altar.scale.y = Math.max(0.001, S.altar);
  favorGlow.material.opacity = favor * (0.35 + Math.sin(t * 1.5) * 0.08);
  updateRoutes();
  for (const f of family) updateFigure(f, dt, t);
  updateBeasts(dt, t);
  updateBirds(t);
  updateParticles(t);
}
