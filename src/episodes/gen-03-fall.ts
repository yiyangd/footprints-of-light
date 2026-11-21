// 第 3 章《你在哪里？》（创 3:1–24）专属的场景和效果。
// 【还是草稿】内容在 content/drafts/gen-03-fall.json，还没有进游戏：
// 只有开发时在网址后面加 ?draft=gen-03-fall 才会用到这个文件（见 src/episodes/index.ts）。
//
// 呈现上守的几条（AGENTS.md 第 6 条）：
//   - 神不以人的样子出现：只用风、一道光和声音
//   - 亚当、夏娃一直是发光的人形，不画身体；“赤身露体”只表现为“身上的光不见了”
//   - 皮衣：一道光落下，光散去后衣服已经穿好，不出现动物
//   - 基路伯：抽象、威严的光之形体，不是长翅膀的小孩
import * as THREE from 'three';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { damp, rng, smooth } from '../core/math';
import { renderer, scene } from '../core/renderer';
import { W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { tween } from '../core/tween';
import { cam, setFocus } from '../player/camera';
import type { Effect } from '../story/effects';
import { terrainY } from '../world/heightmap';
import type { FALL_EFFECTS } from './effect-names';
import { cast, sendPerson, TREE_SPOTS_EDEN } from './gen-02-eden';
import { EAST_GATE, PRESENCE, STAND, THORN_PATCHES, THREAD_FROM, type Spot } from './gen-03-spots';

const TREE = TREE_SPOTS_EDEN.know;

/** 这一章自己的几个数值，都在 0 到 1 之间，由效果慢慢推动 */
const S = {
  presence: 0, // 那道光有多亮
  thread: 0,   // 金线画出来了多少
  thorns: 0,   // 荆棘长出来了多少
  cherubim: 0, // 基路伯和剑出现了多少
};

/** 让亚当、夏娃去某一段剧情的位置 */
function sendBoth(where: keyof typeof STAND, how: 'walk' | 'fade' | 'instant'): void {
  sendPerson('adam', STAND[where].adam, how);
  sendPerson('eve', STAND[where].eve, how);
}

// —— 果子：从树上到夏娃手里，再到亚当那里，然后不见。不做特写 ——
const fruit = glowSprite('#f0a83a', 0.55, 0);
fruit.visible = false;
scene.add(fruit);
let fruitTime = -1; // 果子的动画进行到第几秒；-1 = 没有在播放
const FRUIT_SECONDS = 5.5;
const fruitFrom = new THREE.Vector3(), fruitEve = new THREE.Vector3(), fruitAdam = new THREE.Vector3();

function updateFruit(dt: number): void {
  if (fruitTime < 0) return;
  fruitTime += dt;
  const at = (spot: Spot, y: number, out: THREE.Vector3): THREE.Vector3 => out.set(spot[0], terrainY(spot[0], spot[1]) + y, spot[1]);
  at([TREE[0] + 1.3, TREE[1] + 0.4], 3.9, fruitFrom);
  at(STAND.atTree.eve, 1.45, fruitEve);
  at(STAND.atTree.adam, 1.4, fruitAdam);
  // 0–1.6 秒：夏娃伸手，果子到她手里；2.6–4.2 秒：递给亚当；之后淡掉
  fruit.position.copy(fruitFrom).lerp(fruitEve, smooth(0.4, 1.6, fruitTime)).lerp(fruitAdam, smooth(2.6, 4.2, fruitTime));
  fruit.material.opacity = smooth(0, 0.5, fruitTime) * (1 - smooth(4.4, FRUIT_SECONDS, fruitTime));
  cast.reach = smooth(0, 1, fruitTime) * (1 - smooth(1.8, 2.8, fruitTime));
  fruit.visible = true;
  if (fruitTime >= FRUIT_SECONDS) { fruitTime = -1; fruit.visible = false; cast.reach = 0; }
}

// —— 那道光（创 3:8“耶和华神在园中行走”）：神不以人的样子出现，只是一道穿过树林的光 ——
const presence = new THREE.Group();
const presenceShaft = glowSprite('#fff3d6', 1, 0), presenceCore = glowSprite('#ffffff', 2.6, 0), presenceHalo = glowSprite('#ffe9b8', 9, 0);
presenceShaft.scale.set(2.8, 12, 1); // 又高又窄：一道从上面照下来的光
presenceShaft.position.y = 3;
presence.add(presenceShaft, presenceCore, presenceHalo);
presence.visible = false;
scene.add(presence);
const presenceGoal: Spot = [PRESENCE.from[0], PRESENCE.from[1]];
let presenceX = PRESENCE.from[0], presenceZ = PRESENCE.from[1];

/** 让那道光去一个地方；instant = true 时它直接就在那里 */
function movePresence(to: Spot, instant: boolean): void {
  presenceGoal[0] = to[0];
  presenceGoal[1] = to[1];
  if (instant) { presenceX = to[0]; presenceZ = to[1]; }
}

function updatePresence(dt: number, t: number): void {
  presence.visible = S.presence > 0.01;
  if (!presence.visible) return;
  presenceX = damp(presenceX, presenceGoal[0], 0.45, dt);
  presenceZ = damp(presenceZ, presenceGoal[1], 0.45, dt);
  presence.position.set(presenceX, terrainY(presenceX, presenceZ) + 2.6, presenceZ);
  const breathe = S.presence * (0.9 + Math.sin(t * 1.1) * 0.1); // 轻轻起伏，像在呼吸
  presenceShaft.material.opacity = breathe * 0.6;
  presenceCore.material.opacity = breathe;
  presenceHalo.material.opacity = breathe * 0.45;
}

// —— 金线（创 3:15 的应许）：一串金色的光点，从地上升起，向东伸进天空 ——
const THREAD_POINTS = 240;
function buildThread(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const p = new Float32Array(THREAD_POINTS * 3);
  for (let i = 0; i < THREAD_POINTS; i++) {
    const k = i / (THREAD_POINTS - 1);
    p[i * 3] = THREAD_FROM[0] + k * 52;                              // 一直向东
    p[i * 3 + 1] = 1.6 + Math.sin(k * Math.PI * 0.5) * 26;           // 先陡后缓地升上去
    p[i * 3 + 2] = THREAD_FROM[1] + Math.sin(k * Math.PI * 2) * 1.6; // 轻轻摆动，像一根线
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ map: TEX.glow, size: 0.42, color: '#ffd36b', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  return points;
}
const thread = buildThread();

function updateThread(t: number): void {
  thread.visible = S.thread > 0.001;
  if (!thread.visible) return;
  thread.geometry.setDrawRange(0, Math.ceil(THREAD_POINTS * S.thread));
  thread.material.opacity = 0.7 + Math.sin(t * 1.7) * 0.12;
}

// —— 荆棘和蒺藜（创 3:18）：一丛丛深色的小刺，从地里长出来 ——
interface Thorn { x: number; z: number; lean: number; turn: number; size: number }
function scatterThorns(): Thorn[] {
  const R = rng(73), out: Thorn[] = [];
  for (const patch of THORN_PATCHES) {
    for (let i = 0; i < 16; i++) {
      // 每一丛有三根刺，朝不同的方向歪
      const a = R() * 6.28, d = Math.sqrt(R()) * patch.r;
      const x = patch.at[0] + Math.cos(a) * d, z = patch.at[1] + Math.sin(a) * d, size = 0.4 + R() * 0.4;
      for (let j = 0; j < 3; j++) out.push({ x: x + (R() - 0.5) * 0.3, z: z + (R() - 0.5) * 0.3, lean: 0.25 + R() * 0.5, turn: R() * 6.28, size });
    }
  }
  return out;
}
const THORNS = scatterThorns();
const thornMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.6, 5), new THREE.MeshLambertMaterial({ color: '#7b6449', flatShading: true }), THORNS.length);
thornMesh.visible = false;
thornMesh.frustumCulled = false;
scene.add(thornMesh);
let thornsDrawn = -1; // 上一次画的时候长到多少了；数值没变就不用重画
const thornDummy = new THREE.Object3D();

function updateThorns(): void {
  thornMesh.visible = S.thorns > 0.001;
  if (!thornMesh.visible || thornsDrawn === S.thorns) return;
  thornsDrawn = S.thorns;
  THORNS.forEach((th, i) => {
    const grow = Math.max(0.001, S.thorns) * th.size;
    thornDummy.position.set(th.x, terrainY(th.x, th.z) + 0.3 * grow, th.z);
    thornDummy.rotation.set(th.lean, th.turn, 0, 'YXZ');
    thornDummy.scale.setScalar(grow);
    thornDummy.updateMatrix();
    thornMesh.setMatrixAt(i, thornDummy.matrix);
  });
  thornMesh.instanceMatrix.needsUpdate = true;
}

// —— 基路伯和发火焰的剑（创 3:24）：威严的光之形体，守在伊甸的东边 ——
/**
 * 发光的材质：不受灯光和雾的影响，自己就是亮的。
 * 特意做成不透明的：半透明的东西衬着天空和海面时，会被后画的天和水盖掉。
 */
const lightMaterial = (color: string): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false });

/** 一对翅膀：每边两片，一片向上高举，一片向下垂着 */
function makeWings(): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  const side = (s: number): number[] => [
    s * 0.25, 3.6, 0, s * 2.4, 6.6, -0.35, s * 1.5, 3.0, -0.2,   // 高举的一片
    s * 0.25, 3.4, 0, s * 1.7, 2.6, -0.2, s * 0.9, 0.5, -0.1,    // 垂下的一片
  ];
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...side(1), ...side(-1)]), 3));
  return new THREE.Mesh(g, lightMaterial('#e6b450'));
}

interface Cherub { group: THREE.Group; wings: THREE.Mesh }
function makeCherub(): Cherub {
  const group = new THREE.Group();
  // 身形：一根又高又窄的金色光柱，不画脸和手脚
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 4.6, 8), lightMaterial('#f4cc6e'));
  body.position.y = 2.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), lightMaterial('#ffe9a8'));
  head.position.y = 5.0;
  const halo = glowSprite('#ffd98a', 4.5, 0.22);
  halo.position.y = 3.6;
  const wings = makeWings();
  group.add(body, head, halo, wings);
  group.visible = false;
  scene.add(group);
  return { group, wings };
}
const cherubim = EAST_GATE.cherubim.map(makeCherub);

const sword = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.4), lightMaterial('#ff8a2a'));
const flame = glowSprite('#ff7a1a', 2.8, 0.5);
sword.add(blade, flame);
sword.visible = false;
scene.add(sword);

function updateCherubim(dt: number, t: number): void {
  const on = S.cherubim > 0.001, k = Math.max(0.001, smooth(0, 1, S.cherubim));
  cherubim.forEach((c, i) => {
    c.group.visible = on;
    if (!on) return;
    const [x, z] = EAST_GATE.cherubim[i];
    c.group.position.set(x, terrainY(x, z), z);
    c.group.rotation.y = -Math.PI / 2; // 面向东边，挡住回园子的路
    c.group.scale.setScalar(k);
    c.wings.rotation.x = Math.sin(t * 0.8 + i * 2) * 0.06; // 翅膀极慢地起伏
  });
  sword.visible = on;
  if (!on) return;
  const [x, z] = EAST_GATE.sword;
  sword.position.set(x, terrainY(x, z) + 2.6, z);
  sword.scale.setScalar(k);
  blade.rotation.y += dt * 4.5; // 四面转动
  flame.material.opacity = 0.42 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05; // 火焰闪动
}

export const effects: Record<(typeof FALL_EFFECTS)[number], Effect> = {
  /** 创 3:1：蛇说话。亚当、夏娃来到分别善恶的树旁，蛇的身体微微晃动 */
  serpentSpeaks(instant) {
    sendBoth('atTree', instant ? 'instant' : 'fade');
    if (instant) return;
    tween(cast, 'serpentTalk', 1, 1.5);
    setFocus(TREE[0], 4, TREE[1], 0.9, 8);
    music.set('shadow');
  },
  /** 创 3:6：夏娃摘下果子吃了，又给她丈夫。不做特写 */
  eatFruit(instant) {
    tween(cast, 'serpentTalk', 0, 1.5, instant);
    if (instant) return;
    fruitTime = 0;
    setFocus(STAND.atTree.eve[0], 2, STAND.atTree.eve[1], 0.8, 6);
  },
  /** 创 3:7：他们身上的光不见了，园子的颜色慢慢褪去；他们用无花果树的叶子遮身 */
  lightFades(instant) {
    tween(cast, 'glow', 0.1, 5, instant);
    tween(cast, 'leaves', 1, 6, instant);
    tween(W, 'fade', 1, 8, instant);
    if (instant) return;
    music.set('dark');
    sfx.sink();
  },
  /** 创 3:8：天起了凉风，一道光穿过树林走来；亚当、夏娃藏到树木中 */
  coolWind(instant) {
    sendBoth('hiding', instant ? 'instant' : 'fade');
    tween(S, 'presence', 1, 4, instant);
    tween(W, 'gust', instant ? 0.25 : 1, 2.5, instant);
    movePresence(PRESENCE.from, true);
    movePresence(PRESENCE.hiding, instant);
    if (instant) return;
    setTimeout(() => tween(W, 'gust', 0.25, 5), 6000); // 风过去以后，留下一点点
    sfx.whoosh();
    setFocus(PRESENCE.from[0], 3, PRESENCE.from[1], 0.85, 7);
  },
  /** 创 3:9：“你在哪里？”全场安静三秒，镜头缓缓转过来看着玩家：这句话也是问我们的 */
  silence(instant) {
    if (instant) return;
    music.hush(3.2);
    tween(cam as { yaw: number }, 'yaw', cam.yaw + Math.PI, 3.2);
  },
  /** 创 3:14：蛇从树上落到地上，用肚子行走，爬走了。亚当、夏娃站出来听 */
  serpentCursed(instant) {
    sendBoth('judged', instant ? 'instant' : 'fade');
    movePresence(PRESENCE.judging, instant);
    tween(cast, 'serpentDown', 1, 2.5, instant);
    if (instant) { cast.serpentAway = 1; return; }
    setTimeout(() => tween(cast, 'serpentAway', 1, 7), 3500);
    sfx.rumble();
    setFocus(TREE[0] + 2.4, 0.5, TREE[1] + 1.3, 0.9, 6);
  },
  /** 创 3:15：审判里的应许。一条金线从地上升起，向东伸进天空 */
  goldenThread(instant) {
    tween(S, 'thread', 1, 8, instant);
    if (instant) return;
    sfx.swell(0.7);
    setFocus(THREAD_FROM[0] + 16, 16, THREAD_FROM[1], 0.9, 8);
  },
  /** 创 3:17–18：地长出荆棘和蒺藜 */
  thorns(instant) {
    tween(S, 'thorns', 1, 4, instant);
    if (!instant) setFocus(THORN_PATCHES[0].at[0], 0.5, THORN_PATCHES[0].at[1], 0.7, 5);
  },
  /** 创 3:21：神亲自给他们穿上皮衣。一道光落在他们身上，光散去后衣服已经穿好；不出现动物 */
  clothe(instant) {
    sendBoth('clothed', instant ? 'instant' : 'fade');
    movePresence(PRESENCE.clothing, instant);
    if (instant) { cast.clothed = 1; cast.leaves = 0; return; }
    setFocus(PRESENCE.clothing[0], 1.5, PRESENCE.clothing[1], 0.85, 8);
    // 等他们在新的位置出现，光落下来；光最亮的那一刻换好衣服
    setTimeout(() => {
      flash('white', 0.75, 1.2);
      sfx.swell(0.5);
      setTimeout(() => { cast.clothed = 1; cast.leaves = 0; }, 400);
    }, 3200);
  },
  /** 创 3:23：亚当、夏娃向东走出园子。玩家可以陪他们一起走 */
  leaveEden(instant) {
    sendBoth('outside', instant ? 'instant' : 'walk');
    if (!instant) setFocus(STAND.outside.adam[0], 1.5, STAND.outside.adam[1], 0.6, 8);
  },
  /** 创 3:24：伊甸的东边安设了基路伯，和四面转动、发火焰的剑，把守生命树的道路 */
  cherubim(instant) {
    tween(S, 'cherubim', 1, 3.5, instant);
    if (instant) return;
    sfx.swell(0.5);
    setFocus(EAST_GATE.sword[0], 3.5, EAST_GATE.sword[1], 0.9, 9);
  },
};

// —— 颜色褪去（创 3:7 之后）：整个画面的颜色淡下去一些 ——
// 灯光变灰在 world/sky.ts 里做了；草和树自己的颜色很浓，所以这里再给整个画面降一点饱和度。
let fadeDrawn = 0;
function updateFade(): void {
  const fade = Math.round(W.fade * 50) / 50; // 每变化 2% 才改一次样式，不用每一帧都改
  if (fade === fadeDrawn) return;
  fadeDrawn = fade;
  renderer.domElement.style.filter = fade > 0 ? `saturate(${(1 - fade * 0.42).toFixed(2)})` : '';
}

/** 每一帧：更新这一章的果子、那道光、金线、荆棘、基路伯和剑 */
export function update(dt: number, t: number): void {
  updateFade();
  updateFruit(dt);
  updatePresence(dt, t);
  updateThread(t);
  updateThorns();
  updateCherubim(dt, t);
}
