// 第 6 章《方舟》（创 6:1–8:22）专属的场景和效果。
// 内容在 content/episodes/gen-06-ark.json；地点在原来那张图南边的一块新地上：北边是挪亚的地，南边是亚拉腊山，
// 位置和尺寸写在 gen-06-spots.ts。方舟照真实的大小造（300 × 50 × 30 肘，大约 137 × 23 × 14 米），人也是真人的大小。
//
// 洪水淹过整个世界（W.flood 是水面的高度）：水涨起来，方舟跟着水一起浮起来，带着站在顶上的玩家漂到亚拉腊山顶，
// 水退了停在那里。方舟只有浮在水上的时候才会漂；前面的地比船底高，它就停下来等水再涨（不会从山顶上“滑”过去）。
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
import { ARARAT, baseHeight, terrainY } from '../world/heightmap';
import { addPlatform } from '../world/platforms';
import { startEvening } from '../world/sky';
import type { ARK_EFFECTS } from './effect-names';
import { retireDove, retirePerson } from './gen-02-eden';
import type { Spot } from './gen-03-spots';
import { noahMovesAway } from './gen-05-generations';
import {
  ALTAR, ARK, ARK_BUILD, ARK_DOOR, CUBIT, ARK_DRAFT, ARK_REST, ARK_WINDOW, ARRIVAL, DOOR_REACH, doorTip, FAMILY, FAMILY_YARD,
  FLOOD_PEAK, FOOD, FOUNTAINS, GATHER, NOAH_HOUSE, northWall, RAMP_UP, SHADOWS, SPREAD,
} from './gen-06-spots';

const groundOf = (at: Spot): number => baseHeight(at[0], at[1]);

/** 这一章自己的数值，大多在 0 到 1 之间，由效果慢慢推动 */
const S = {
  shadows: 0,  // 地上罪恶的暗影（创 6:5、6:11）
  plan: 0,     // 方舟的轮廓：发光的线（创 6:14）
  decks: 0,    // 三层甲板和门的线（创 6:16）
  food: 0,     // 堆在方舟旁边的粮食（创 6:21）
  built: 0,    // 方舟造好了多少（创 6:22）
  scaffold: 0, // 上方舟顶的长坡（造方舟时搭的）
  door: 1,     // 门放下来多少：1 放下来当跳板，0 关上（创 7:16）
  lamps: 0,    // 方舟里的灯（门关上以后，透光处透出一点暖光）
  rain: 0,
  fountains: 0,
  drift: 0,    // 方舟想漂到哪里：0 是造的地方，1 是亚拉腊山顶（真正漂到哪里见 ark.k）
  hatch: 0,    // 透光处的盖子打开了多少（创 8:6）
  raven: 0,    // 乌鸦飞了多远（0 到 1）
  dove: 0,     // 鸽子：0–1 第一次（飞出去又回来），1–2 第二次（叼回橄榄叶），2–3 第三次（不再回来）
  altar: 0,    // 坛
  fire: 0,     // 坛上的火
  aroma: 0,    // 落在坛上的光（创 8:21）
};
const set = (key: keyof typeof S, to: number, sec: number, instant: boolean): void => tween(S, key, to, sec, instant);
const flood = (to: number, sec: number, instant: boolean): void => tween(W, 'flood', to, sec, instant);

/**
 * 洪水每一步涨到多高（米）。方舟造在 1.2 米高的平地上，吃水 4.5 米，所以水涨过 5.7 米它才浮起来；
 * 亚拉腊山顶是 18 米，水最高的时候比山顶还高 15 肘（创 7:20）
 */
const LEVEL = {
  rain: 1.5,                           // 创 7:11 泉源裂开、天上的窗户敞开
  heavy: 3.5,                          // 创 7:12 四十昼夜降大雨
  lifted: 9,                           // 创 7:17 水往上长，把方舟从地上漂起
  great: 16,                           // 创 7:18 水势浩大
  peak: FLOOD_PEAK,                    // 创 7:19–20 高山都淹没了
  receding: FLOOD_PEAK - 1,            // 创 8:3 水渐退（方舟还浮着）
  rest: ARARAT.y + ARK_DRAFT - 1.5,    // 创 8:4 船底碰到山顶，方舟停在山上
  peaks: 10,                           // 创 8:5 山顶都现出来了
  seven: 7,                            // 创 8:10 又等了七天
  last: 3.5,                           // 创 8:12 鸽子不再回来
};

// —— 方舟 ——

const L = ARK.length, Wd = ARK.width, H = ARK.height;
/** 顶的厚度：人站在顶上时，脚比墙顶高这么多 */
const ROOF = 0.3;
/** 方舟漂得最快的时候，每秒走全程的多少（全程 135 米，0.05 就是每秒 6.75 米） */
const MAX_DRIFT = 0.05;

/** 方舟在 (cx, cz) 的时候，船底下最高的那块地有多高（方舟搁在上面）。沿着长边量 13 处、横着量 3 处 */
function groundUnderArk(cx: number, cz: number): number {
  let top = -Infinity;
  for (let i = -6; i <= 6; i++) for (let j = -1; j <= 1; j++) top = Math.max(top, baseHeight(cx + i * L / 12, cz + j * Wd / 2));
  return top;
}
/** 造方舟那块平地有多高（方舟造好时船底就在这个高度） */
const YARD_Y = groundUnderArk(...ARK_BUILD);

/** 方舟漂到 k（0 是造的地方，1 是亚拉腊山顶）的时候，中心在哪里 */
const arkAt = (k: number): Spot => [lerp(ARK_BUILD[0], ARK_REST[0], k), lerp(ARK_BUILD[1], ARK_REST[1], k)];

/** 方舟现在的位置：k 是真正漂到了哪里；(x, z) 是中心，y 是船底；under 是船底下最高的地 */
const ark = { k: 0, x: ARK_BUILD[0], z: ARK_BUILD[1], y: YARD_Y, under: YARD_Y, prevX: ARK_BUILD[0], prevZ: ARK_BUILD[1] };

/** 把方舟直接放到 k 那里（读档时用） */
function placeArk(k: number): void {
  ark.k = k;
  [ark.x, ark.z] = arkAt(k);
  ark.under = groundUnderArk(ark.x, ark.z);
}

/** 船底下最高的地是 under 的时候，方舟浮不浮得起来（留 0.3 米的空，不擦着地） */
const afloat = (under: number): boolean => under < W.flood - ARK_DRAFT - 0.3;

/** 方舟搁在地上（没有浮起来） */
const grounded = (): boolean => ark.y <= ark.under + 0.02;

/** 让方舟往亚拉腊山漂（to 是 0 到 1）；读档时直接放到那里 */
function drift(to: number, sec: number, instant: boolean): void {
  set('drift', to, sec, instant);
  if (instant) placeArk(to);
}

/** 一个盒子，先挪到 (x, y, z)，再涂上颜色 */
const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string): THREE.BufferGeometry =>
  paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);

/** 顶上透光处的盖子在哪里（相对方舟的中心）：靠北边，西边一点 */
const HATCH = { x: -18, z: -6 };

/** 方舟的船身：墙、底下涂的松香（创 6:14）、木板的缝、三层甲板的线、肋条、透光处（创 6:16）、顶、门洞 */
function hullGeo(): THREE.BufferGeometry {
  const wall = H - ARK_WINDOW; // 墙有多高；再往上一肘是透光处
  const parts = [
    box(L, wall, Wd, 0, wall / 2, 0, '#7a5a3a'),
    box(L + 0.06, 1.6, Wd + 0.06, 0, 0.8, 0, '#3a2a1c'), // 松香
  ];
  // 木板的缝：每 1.5 米一道
  for (let y = 3.1; y < wall - 0.4; y += 1.5) parts.push(box(L + 0.04, 0.07, Wd + 0.04, 0, y, 0, '#674a2f'));
  // 上、中、下三层（创 6:16）：墙外面两道粗一点的线
  for (const y of [H / 3, H * 2 / 3]) parts.push(box(L + 0.1, 0.2, Wd + 0.1, 0, y, 0, '#9a7650'));
  // 肋条：长边上每 25 肘一根
  for (let x = -L / 2 + 25 * CUBIT; x < L / 2 - 1; x += 25 * CUBIT) {
    for (const s of [-1, 1]) parts.push(box(0.4, wall, 0.14, x, wall / 2, s * (Wd / 2 + 0.07), '#6a4c30'));
  }
  // 透光处：顶下面一圈暗的空隙，高一肘，中间每 10 肘立一根柱子撑着顶
  parts.push(box(L - 0.3, ARK_WINDOW, Wd - 0.3, 0, H - ARK_WINDOW / 2, 0, '#2a2018'));
  for (let x = -L / 2 + 0.2; x <= L / 2; x += 10 * CUBIT) {
    for (const s of [-1, 1]) parts.push(box(0.25, ARK_WINDOW, 0.25, x, H - ARK_WINDOW / 2, s * (Wd / 2 - 0.12), '#7a5a3a'));
  }
  // 顶：比船身宽一点，人可以站在上面
  parts.push(box(L + 0.6, ROOF, Wd + 0.6, 0, H + ROOF / 2, 0, '#6a5036'));
  // 顶上的木板缝：顺着长边每 5 肘一道，横着每 25 肘一道（站在顶上漂的时候，看得出方舟有多大）
  for (let z = -Wd / 2 + 5 * CUBIT; z < Wd / 2 - 0.5; z += 5 * CUBIT) parts.push(box(L + 0.4, 0.04, 0.12, 0, H + ROOF, z, '#4e3a26'));
  for (let x = -L / 2 + 25 * CUBIT; x < L / 2 - 1; x += 25 * CUBIT) parts.push(box(0.16, 0.04, Wd + 0.4, x, H + ROOF, 0, '#4e3a26'));
  // 顶上透光处的开口（盖子打开时看得见里面是暗的）
  parts.push(box(3.2, 0.05, 3.2, HATCH.x + 1.6, H + ROOF + 0.03, HATCH.z, '#1e1610'));
  // 门洞：门放下来时看得见里面是暗的
  parts.push(box(ARK_DOOR.width, ARK_DOOR.height, 0.06, 0, ARK_DOOR.sill + ARK_DOOR.height / 2, -Wd / 2 - 0.03, '#1e1610'));
  return merge(parts);
}

/** 方舟的样子：船身、门、顶上透光处的盖子、里面的灯 */
function buildArk(): { group: THREE.Group; door: THREE.Mesh; hatch: THREE.Mesh; lamps: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> } {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(hullGeo(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  // 门：下边是转轴，打开时往外放下来，另一头搭在地上
  const door = new THREE.Mesh(new THREE.BoxGeometry(ARK_DOOR.width, ARK_DOOR.height, 0.25).translate(0, ARK_DOOR.height / 2, 0),
    new THREE.MeshLambertMaterial({ color: '#6b4e32', flatShading: true }));
  door.position.set(0, ARK_DOOR.sill, -Wd / 2 - 0.13);
  group.add(door);
  // 顶上透光处的盖子（创 8:6 挪亚开了窗户）：西边是转轴
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 3.4).translate(1.7, 0, 0), new THREE.MeshLambertMaterial({ color: '#5e4630', flatShading: true }));
  hatch.position.set(HATCH.x, H + ROOF + 0.1, HATCH.z);
  group.add(hatch);
  // 方舟里的灯：门关上以后，从两边的透光处透出一点暖光（一组点，只算一次绘制）
  const lampPos: number[] = [];
  for (let x = -60; x <= 60; x += 20) for (const s of [-1, 1]) lampPos.push(x, H - ARK_WINDOW / 2, s * (Wd / 2 + 0.2));
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
  const lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({
    map: TEX.glow, size: 5, color: '#ffcf7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  group.add(lamps);
  group.visible = false;
  scene.add(group);
  return { group, door, hatch, lamps };
}
const arkMesh = buildArk();

/** 门放下来的时候往外斜多少（弧度）：门的另一头正好碰到地 */
const DOOR_TILT = Math.asin(ARK_DOOR.sill / ARK_DOOR.height);

/** 方舟的轮廓（创 6:14–16）：一个发光的框，三层甲板的线和门 */
const lineMat = (): THREE.LineBasicMaterial => new THREE.LineBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, Wd)), lineMat());
const deckLines = new THREE.LineSegments(new THREE.EdgesGeometry(merge([
  ...[H / 3, H * 2 / 3].map((y) => paint(new THREE.BoxGeometry(L, 0.001, Wd).translate(0, y - H / 2, 0), '#fff')),
  paint(new THREE.BoxGeometry(ARK_DOOR.width, ARK_DOOR.height, 0.001).translate(0, ARK_DOOR.sill + ARK_DOOR.height / 2 - H / 2, -Wd / 2), '#fff'),
])), lineMat());
for (const l of [outline, deckLines]) {
  l.position.set(ARK_BUILD[0], YARD_Y + H / 2, ARK_BUILD[1]);
  l.visible = false;
  scene.add(l);
}

/** 方舟顶能站人；放下来的门和上顶的长坡也能站人（world/platforms.ts） */
const deck = {
  dx: 0, dz: 0,
  height(x: number, z: number): number | null {
    if (S.built < 0.95) return null;
    return Math.abs(x - ark.x) < L / 2 && Math.abs(z - ark.z) < Wd / 2 ? ark.y + H + ROOF : null;
  },
  // 洪水的时候掉进水里，回到方舟顶的正中
  refuge(): [number, number, number] | null {
    return W.flood > 0.5 && S.built > 0.95 ? [ark.x, ark.y + H + ROOF + 0.3, ark.z] : null;
  },
};
addPlatform(deck);

/** 放下来的门在 (x, z) 这里有多高；门没放下来、方舟浮着，或者不在门上，就是 null */
function doorHeight(x: number, z: number): number | null {
  if (S.door < 0.97 || S.built < 0.95 || !grounded()) return null;
  if (Math.abs(x - ark.x) > ARK_DOOR.width / 2) return null;
  const wall = ark.z - Wd / 2, t = (z - (wall - DOOR_REACH)) / DOOR_REACH;
  if (t < 0 || t > 1) return null;
  return ark.y + ARK_DOOR.sill * t + 0.12; // 0.12 是门板的厚度
}
addPlatform({ dx: 0, dz: 0, height: doorHeight });

/** 上顶的长坡：下端在地上，上端比方舟顶低 0.35 米（再一步就能上到顶上） */
const RAMP_Y0 = groundOf(RAMP_UP.base) + 0.05, RAMP_Y1 = YARD_Y + H + ROOF - 0.35;
function rampHeight(x: number, z: number): number | null {
  if (S.scaffold < 0.97) return null;
  if (Math.abs(z - RAMP_UP.base[1]) > RAMP_UP.width / 2) return null;
  const t = (x - RAMP_UP.base[0]) / (RAMP_UP.top[0] - RAMP_UP.base[0]);
  if (t < 0 || t > 1) return null;
  return lerp(RAMP_Y0, RAMP_Y1, t);
}
addPlatform({ dx: 0, dz: 0, height: rampHeight });

/** 长坡的样子：一块斜着的长木板，外边一道栏杆，底下几根柱子撑着。网格的原点在坡的下端（地面），长出来时从地面往上长 */
const scaffold = (() => {
  const [bx, bz] = RAMP_UP.base, [tx] = RAMP_UP.top, run = bx - tx, rise = RAMP_Y1 - RAMP_Y0, len = Math.hypot(run, rise);
  const slope = -Math.atan2(rise, run); // 往西（x 变小）越走越高
  const midX = (bx + tx) / 2 - bx, midY = rise / 2;
  const parts = [
    paint(new THREE.BoxGeometry(len, 0.3, RAMP_UP.width).rotateZ(slope).translate(midX, midY - 0.15, 0), '#8a6a46'),
    paint(new THREE.BoxGeometry(len, 0.12, 0.12).rotateZ(slope).translate(midX, midY + 1, -RAMP_UP.width / 2 + 0.06), '#6b4e32'),
  ];
  // 柱子：每 6 米一对，从地面撑到木板下面
  for (let d = 6; d < run; d += 6) {
    const h = rise * d / run - 0.3;
    for (const s of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(0.3, h, 0.3).translate(-d, h / 2, s * (RAMP_UP.width / 2 - 0.2)), '#6b4e32'));
    parts.push(paint(new THREE.BoxGeometry(0.1, 1, 0.1).translate(-d, rise * d / run + 0.5, -RAMP_UP.width / 2 + 0.06), '#6b4e32'));
  }
  const m = new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.position.set(bx, RAMP_Y0, bz);
  m.visible = false;
  scene.add(m);
  return m;
})();

function updateArk(dt: number): void {
  ark.prevX = ark.x;
  ark.prevZ = ark.z;
  // 往亚拉腊山漂：只有浮着的时候才漂；前面的地比船底高（例如还没被水淹过的山），就停下来等水再涨
  if (ark.k > S.drift) placeArk(S.drift);
  else if (ark.k < S.drift && afloat(ark.under)) {
    const next = Math.min(S.drift, ark.k + MAX_DRIFT * dt), [nx, nz] = arkAt(next), under = groundUnderArk(nx, nz);
    if (afloat(under)) { ark.k = next; ark.x = nx; ark.z = nz; ark.under = under; }
  }
  // 搁在地上，或者浮在水上（船底比水面低一点）：水涨，方舟跟着往上浮；水退，方舟落到山顶上
  ark.y = Math.max(ark.under, W.flood - ARK_DRAFT);
  deck.dx = ark.x - ark.prevX;
  deck.dz = ark.z - ark.prevZ;
  const g = arkMesh.group;
  g.visible = S.built > 0.001;
  g.position.set(ark.x, ark.y, ark.z);
  g.scale.set(1, Math.max(0.001, smooth(0, 1, S.built)), 1); // 从船底往上一层层造起来
  arkMesh.door.rotation.x = -(Math.PI / 2 + DOOR_TILT) * S.door;
  arkMesh.hatch.rotation.z = S.hatch * 1.2;
  arkMesh.lamps.material.opacity = S.lamps * 0.7;
  // 轮廓：造好以后就不用了
  const lines = S.plan * (1 - S.built);
  outline.visible = lines > 0.01;
  outline.material.opacity = lines * 0.9;
  deckLines.visible = S.decks * (1 - S.built) > 0.01;
  deckLines.material.opacity = S.decks * (1 - S.built) * 0.9;
  // 长坡：从地面往上长出来，水涨上来时沉下去
  scaffold.visible = S.scaffold > 0.01;
  scaffold.scale.y = Math.max(0.001, S.scaffold);
}

// —— 挪亚的家、粮食、坛 ——

/** 把一个网格放在 at 那里的地面上，先藏起来（网格的原点在它自己脚下，变大变小时是从地面往上长） */
function placeOnGround(m: THREE.Mesh, at: Spot): THREE.Mesh {
  m.position.set(at[0], groundOf(at), at[1]);
  m.visible = false;
  scene.add(m);
  return m;
}

/** 挪亚的家：一间土房子，门比人高一点 */
const house = placeOnGround(new THREE.Mesh(merge([
  box(3.4, 2.3, 3, 0, 1.15, 0, '#a98c68'),
  paint(new THREE.ConeGeometry(2.7, 1.5, 4).rotateY(Math.PI / 4).translate(0, 3.05, 0), '#7f6a48'),
  box(0.9, 1.9, 0.06, 0, 0.95, -1.52, '#3a2e24'),
]), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })), NOAH_HOUSE);
let houseShown = 0;

/** 粮食（创 6:21）：方舟北边、门的西边，一袋袋粮食、一筐筐果子 */
const food = (() => {
  const R = rng(66), parts: THREE.BufferGeometry[] = [], mid: Spot = [(FOOD.x0 + FOOD.x1) / 2, FOOD.z], y0 = groundOf(mid);
  for (let i = 0; i < 26; i++) {
    const x = FOOD.x0 + R() * (FOOD.x1 - FOOD.x0), z = FOOD.z - 1.4 + R() * 2.8, y = baseHeight(x, z) - y0;
    parts.push(i % 3 ? paint(new THREE.SphereGeometry(0.3, 7, 5).scale(1, 0.8, 1).translate(x - mid[0], y + 0.24, z - mid[1]), '#c8b07a')
      : paint(new THREE.CylinderGeometry(0.32, 0.26, 0.4, 8).translate(x - mid[0], y + 0.2, z - mid[1]), '#8a6a3e'));
  }
  return placeOnGround(new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })), mid);
})();

/** 坛（创 8:20）：三块石头，上面的火和笔直往上的烟；落在坛上的光（创 8:21） */
const altar = placeOnGround(new THREE.Mesh(merge([0.6, 0.48, 0.36].map((r, i) => paint(new THREE.DodecahedronGeometry(r, 0).rotateY(i).translate(0, 0.3 + i * 0.4, 0), '#9a9286'))),
  new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })), ALTAR);
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
const shadowPts = points(SHADOWS.length * SHADOW_N, 2.2, '#140e12', false);
const RAIN_N = 700;
const rain = points(RAIN_N, 0.14, '#d4dceb', false);
const RAIN_SEED = (() => { const R = rng(7); return Array.from({ length: RAIN_N }, () => [R() * 50 - 25, R() * 20, R() * 50 - 25]); })();
const SPOUT_N = 24;
const spouts = points(FOUNTAINS.length * SPOUT_N, 1.2, '#e6f4ff', true);
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
        const a = k / SHADOW_N * 6.28 + t * 0.4 + s, r = 1.1 + Math.sin(t * 1.5 + k * 2 + s) * 0.5;
        pos.setXYZ(s * SHADOW_N + k, x + Math.cos(a) * r, y + 0.5 + Math.abs(Math.sin(t * 1.2 + k)) * 0.6, z + Math.sin(a) * r * 0.8);
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
        pos.setXYZ(s * SPOUT_N + k, x + Math.cos(a) * life * 2.4, W.flood + life * (1 - life) * 24, z + Math.sin(a) * life * 2.4);
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
  f.speed = 2.4; // 这一章的地方大，走得快一点
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

/** 走在放下来的门上时脚下的高度；不在门上就是地面 */
function doorGround(x: number, z: number): number {
  return Math.max(doorHeight(x, z) ?? -Infinity, terrainY(x, z));
}
for (const f of family) f.ground = doorGround;

/** 进门的路：先到门的那一头（地上），再走上门，到门槛那里 */
const intoDoor = (c: Spot, side: number): Spot[] => [[doorTip(c)[0] + side, doorTip(c)[1] - 1.5], doorTip(c), [c[0], northWall(c) - 0.1]];
/** 出门的路：从门槛走下门，到门的那一头 */
const outOfDoor = (c: Spot): Spot[] => [[c[0], northWall(c) - 0.1], doorTip(c)];

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
      const step = Math.min(d, 2.6 * dt);
      b.x += dx / d * step;
      b.z += dz / d * step;
      b.mesh.rotation.y = Math.atan2(dx, dz);
    }
    b.mesh.visible = true;
    b.mesh.position.set(b.x, doorGround(b.x, b.z) + Math.abs(Math.sin(t * 8 + b.start)) * 0.04, b.z);
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
  group.scale.setScalar(1.4);
  group.visible = false;
  scene.add(group);
  return { group, wings, leaf };
}
const raven = makeBird('#1f1c22');
const dove = makeBird('#f6f4ee');
const birdAt = new THREE.Vector3();

/** 从顶上的透光处飞出去：k 从 0 到 1，back = true 时最后飞回来 */
function flightPos(k: number, back: boolean, side: number, out: THREE.Vector3): THREE.Vector3 {
  const reach = back ? Math.sin(k * Math.PI) : smooth(0, 1, k); // 飞回来的路线是一个来回
  const a = side + k * 2.6, hx = ark.x + HATCH.x + 1.7, hz = ark.z + HATCH.z;
  return out.set(hx + Math.cos(a) * reach * 40, ark.y + H + ROOF + 1 + reach * 12, hz + Math.sin(a) * reach * 40);
}

/** 镜头这几秒跟着哪只鸟看（放乌鸦、放鸽子的时候）；null 就是不跟 */
let watching: 'raven' | 'dove' | null = null;

/** 让镜头转过去看着这只鸟飞，看 sec 秒 */
function watchBird(which: 'raven' | 'dove', sec: number): void {
  watching = which;
  setFocus(ark.x + HATCH.x, ark.y + H + 2, ark.z + HATCH.z, 0.6, sec);
}

function updateBirds(t: number): void {
  const flap = (wings: THREE.Mesh[]): void => wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 14) * 0.6; });
  raven.group.visible = S.raven > 0.01 && S.raven < 0.99;
  if (raven.group.visible) {
    flightPos(S.raven, false, 0.4, birdAt);
    raven.group.position.copy(birdAt);
    if (watching === 'raven') W.focus.copy(birdAt); // 镜头跟着乌鸦
    raven.group.rotation.y = 0.4 + S.raven * 2.6 + Math.PI / 2;
    flap(raven.wings);
  }
  // 鸽子：每一次飞行是 0–1、1–2、2–3 里的一段；落在整数上就是停在方舟里
  const trip = Math.floor(S.dove), k = S.dove - trip;
  dove.group.visible = k > 0.01 && k < 0.99 && trip < 3;
  if (dove.group.visible) {
    flightPos(k, trip < 2, 2.2 + trip, birdAt);
    dove.group.position.copy(birdAt);
    if (watching === 'dove') W.focus.copy(birdAt); // 镜头跟着鸽子
    dove.group.rotation.y = 2.2 + trip + k * 2.6 + Math.PI / 2;
    dove.leaf.visible = trip === 1 && k > 0.5; // 第二次飞回来时，嘴里叼着橄榄叶（创 8:11）
    flap(dove.wings);
  }
}

// —— 效果 ——

/** 一家八口走进方舟：从场地上走到门的那一头，走上门，到了门槛就进去（看不见了） */
function familyIn(instant: boolean): void {
  family.forEach((f, i) => {
    if (instant) { vanish(f, true); return; }
    appear(f, f.shown > 0.01 ? [f.x, f.z] : FAMILY_YARD[i], 1, false);
    setTimeout(() => follow(f, intoDoor(ARK_BUILD, i % 2 ? 0.6 : -0.6), () => vanish(f, false)), i * 700);
  });
}

/** 一家八口从门里出来，走下门，站到坛的附近 */
function familyOutNow(instant: boolean): void {
  family.forEach((f, i) => {
    const stand: Spot = [ALTAR[0] + 2 + (i % 4) * 1.1, ALTAR[1] - 2.2 + Math.floor(i / 4) * 1.3];
    if (instant) { appear(f, stand, 1, true); return; }
    setTimeout(() => {
      const [from, ...rest] = outOfDoor(ARK_REST);
      appear(f, from, 1, false);
      follow(f, [...rest, stand]);
    }, i * 700);
  });
}

/** 镜头看着方舟（造方舟、进方舟的时候） */
const lookAtArk = (sec: number): void => setFocus(ARK_BUILD[0], YARD_Y + H * 0.6, ARK_BUILD[1], 0.8, sec);

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
    if (!instant) setFocus(FAMILY[0][0], groundOf(FAMILY[0]) + 1.4, FAMILY[0][1], 0.7, 6);
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
  /** 创 6:14：要用歌斐木造一只方舟：造方舟的地方出现发光的轮廓（和真的方舟一样大） */
  arkPlan(instant) {
    set('plan', 1, 3, instant);
    if (!instant) lookAtArk(7);
  },
  /** 创 6:16：分上、中、下三层，门开在旁边 */
  arkDecks(instant) {
    set('decks', 1, 3, instant);
  },
  /** 创 6:21：预备各样的食物 */
  gatherFood(instant) {
    set('food', 1, 2, instant);
  },
  /** 创 6:22：挪亚就这样行：方舟一层层造起来，旁边搭起上顶的长坡；一家人来到场地上 */
  arkBuilt(instant) {
    set('built', 1, 8, instant);
    set('scaffold', 1, 8, instant);
    for (let i = 0; i <= 4; i++) {
      if (instant) { if (family[i].shown > 0.01) appear(family[i], FAMILY_YARD[i], 1, true); }
      else if (family[i].shown > 0.01) follow(family[i], [FAMILY_YARD[i]]);
    }
    if (instant) return;
    sfx.clang(4);
    setTimeout(() => sfx.clang(4), 2500);
    lookAtArk(8);
  },
  /** 创 7:7：挪亚和妻子、儿子、儿妇都进入方舟：门放下来，一家人走进去 */
  familyEnters(instant) {
    set('door', 1, 1.5, instant);
    for (let i = 5; i < 8; i++) appear(family[i], FAMILY_YARD[i], 1, instant);
    familyIn(instant);
    if (!instant) setFocus(doorTip(ARK_BUILD)[0], YARD_Y + 2, doorTip(ARK_BUILD)[1], 0.7, 7);
  },
  /** 创 7:9：都是一对一对地到挪亚那里进入方舟 */
  animalsEnter(instant) {
    sendBeasts((i) => [[GATHER[0] + (i % 2) * 1.2, GATHER[1] + Math.floor(i / 2) * 0.8], ...intoDoor(ARK_BUILD, i % 2 ? 0.8 : -0.8)], instant);
    if (!instant) setFocus(doorTip(ARK_BUILD)[0] + 6, YARD_Y + 1.5, doorTip(ARK_BUILD)[1] - 3, 0.7, 9);
  },
  /** 创 7:11：大渊的泉源都裂开了，天上的窗户也敞开了 */
  floodgates(instant) {
    set('fountains', 1, 3, instant);
    set('rain', 0.6, 3, instant);
    set('shadows', 0, 4, instant);
    tween(W, 'dim', 0.7, 4, instant);
    flood(LEVEL.rain, 6, instant);
    if (instant) return;
    music.set('dark');
    sfx.rumble();
  },
  /** 创 7:12：四十昼夜降大雨 */
  heavyRain(instant) {
    set('rain', 1, 3, instant);
    tween(W, 'gust', 0.7, 3, instant);
    flood(LEVEL.heavy, 8, instant);
    if (!instant) sfx.rumble();
  },
  /** 创 7:16：耶和华就把他关在方舟里头：门关上了，粮食收进去，透光处亮起一点灯光 */
  doorShut(instant) {
    set('door', 0, 2.5, instant);
    set('food', 0, 1, instant);
    set('lamps', 1, 3, instant);
    if (!instant) sfx.tone(98, 0, 1.2, 0.08, 'triangle');
  },
  /** 创 7:17：水往上长，把方舟从地上漂起：方舟跟着水一起浮上来，长坡沉到水下 */
  waterRises(instant) {
    flood(LEVEL.lifted, 8, instant);
    set('scaffold', 0, 6, instant);
    tween(W, 'flooded', 1, 8, instant); // 走兽、飞鸟藏起来
  },
  /** 创 7:18：方舟在水面上漂来漂去：漂向亚拉腊山（前面的山还没淹过，就停下来等水涨） */
  arkFloats(instant) {
    flood(LEVEL.great, 10, instant);
    drift(1, 45, instant);
  },
  /** 创 7:19–20：天下的高山都淹没了：水比亚拉腊山顶还高十五肘 */
  mountainsCovered(instant) {
    flood(LEVEL.peak, 12, instant);
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
  /** 创 8:3：水从地上渐退（方舟还浮着） */
  waterRecedes(instant) {
    flood(LEVEL.receding, 8, instant);
    drift(1, 2, instant); // 万一还没漂到，就让它漂到
  },
  /** 创 8:4：方舟停在亚拉腊山上：水再退，船底落到山顶上 */
  arkRests(instant) {
    flood(LEVEL.rest, 6, instant);
    if (!instant) setTimeout(() => sfx.tone(73.4, 0, 1.5, 0.1, 'triangle'), 2500);
  },
  /** 创 8:5：山顶都现出来了：亚拉腊山的平顶和旁边两座山露出水面 */
  peaksAppear(instant) {
    flood(LEVEL.peaks, 10, instant);
    if (!instant) music.set('eden');
  },
  /** 创 8:6：挪亚开了方舟的窗户 */
  openWindow(instant) {
    set('hatch', 1, 2, instant);
  },
  /** 创 8:7：放出一只乌鸦，飞来飞去 */
  raven(instant) {
    set('raven', 1, 9, instant);
    if (!instant) watchBird('raven', 7);
  },
  /** 创 8:8：放出一只鸽子去 */
  doveOut(instant) {
    set('dove', 0.5, 3, instant);
    if (!instant) watchBird('dove', 4);
  },
  /** 创 8:9：鸽子找不着落脚之地，就回到方舟 */
  doveBack(instant) {
    set('dove', 1, 3, instant);
    if (!instant) watchBird('dove', 4);
  },
  /** 创 8:10：又等了七天，再把鸽子放出去 */
  doveAgain(instant) {
    flood(LEVEL.seven, 6, instant);
    set('dove', 1.5, 3, instant);
    if (!instant) watchBird('dove', 4);
  },
  /** 创 8:11：鸽子嘴里叼着一个新拧下来的橄榄叶子回来 */
  oliveLeaf(instant) {
    set('dove', 2, 3, instant);
    if (!instant) watchBird('dove', 4); // 看着它叼着橄榄叶飞回方舟
  },
  /** 创 8:12：再放出鸽子去，鸽子不再回来了 */
  doveGone(instant) {
    flood(LEVEL.last, 6, instant);
    set('dove', 3, 6, instant);
    if (!instant) watchBird('dove', 6);
  },
  /** 创 8:13：地上的水都干了 */
  dryGround(instant) {
    flood(0, 8, instant);
    tween(W, 'dim', 0.15, 6, instant);
    set('hatch', 0, 2, instant);
  },
  /** 创 8:18：挪亚就和他的妻子、儿子、儿妇都出来了：门放下来，一家人走出来 */
  familyOut(instant) {
    set('door', 1, 2, instant);
    set('lamps', 0, 3, instant);
    favor = 0;
    familyOutNow(instant);
    if (!instant) setFocus(doorTip(ARK_REST)[0], ARARAT.y + 1.5, doorTip(ARK_REST)[1], 0.7, 7);
  },
  /** 创 8:19：一切走兽、昆虫、飞鸟，各从其类，都出了方舟：散到地上去，世界上的走兽、飞鸟又回来了 */
  animalsOut(instant) {
    sendBeasts((i) => {
      const [sx, sz] = SPREAD[i % SPREAD.length];
      return [...outOfDoor(ARK_REST), [sx, sz], [sx + (i % 2 ? 8 : -8), sz - 6]];
    }, instant);
    tween(W, 'flooded', 0, 8, instant);
  },
  /** 创 8:20：挪亚为耶和华筑了一座坛，献燔祭 */
  noahAltar(instant) {
    set('altar', 1, 2, instant);
    set('fire', 1, 3, instant);
    if (instant) return;
    follow(noah, [[ALTAR[0] + 1.2, ALTAR[1] - 0.4]]);
    noah.face = ALTAR;
    setFocus(ALTAR[0], groundOf(ALTAR) + 1.5, ALTAR[1], 0.75, 7);
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

/** 每一帧：更新方舟、人、走兽、飞鸟、雨、泉源和坛 */
export function update(dt: number, t: number): void {
  clock += dt;
  updateArk(dt);
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
