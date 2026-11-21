// 第 2 章《伊甸园》（创 2:4–3:1）专属的场景和效果：
// 两棵树、亚当和夏娃、给活物起名、鸽子、河名和动物名的标签、红玛瑙，以及结尾的蛇。
// 内容在 content/episodes/gen-02-eden.json。
import * as THREE from 'three';
import { showEnd } from '../collect/journal';
import { grant } from '../collect/rewards';
import { isDone, save } from '../collect/save';
import { ANIMAL_NAMES, RIVER_NAMES } from '../content';
import { music, sfx } from '../core/audio';
import { flash } from '../core/flash';
import { esc } from '../core/i18n';
import { damp, rng, smooth } from '../core/math';
import { scene } from '../core/renderer';
import { game, U, W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { tween } from '../core/tween';
import { setFocus } from '../player/camera';
import { player } from '../player/player';
import type { Effect } from '../story/effects';
import { animals, showSpecies, type Species } from '../world/animals';
import { riverPoint, RIVERS, terrainY } from '../world/heightmap';
import { addLabel } from '../world/labels';
import { showBridges } from '../world/path';
import { growth } from '../world/plants';
import type { EDEN_EFFECTS } from './effect-names';
import { dimEastLights } from './gen-01-creation';

// 这一章几个固定的位置 [x, z]
const ADAM_POS: [number, number] = [52.5, -22.5];
const EVE_POS: [number, number] = [54.3, -20.6];
const TREE_LIFE_POS: [number, number] = [56.3, -18.2];
const TREE_KNOW_POS: [number, number] = [67.8, -17.6];

// —— 人：发光的身形（堕落前“披着光”，这是游戏的想象）——
interface Person {
  group: THREE.Group;
  mat: THREE.MeshLambertMaterial;
  halo: THREE.Sprite;
  armR: THREE.Mesh;
  /** 出现的进度，0 到 1 */
  appear: number;
  /** 是不是在沉睡 */
  asleep: boolean;
  /** 躺下的进度，0 到 1 */
  lying: number;
}

function makePerson(female: boolean): Person {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#fff6e2', emissive: '#ffd99a', emissiveIntensity: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, female ? 0.85 : 0.95, 4, 10), mat);
  body.position.y = female ? 0.78 : 0.82;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat);
  head.position.y = female ? 1.62 : 1.72;
  group.add(head);
  if (female) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), mat);
    hair.position.set(0, 1.6, -0.05);
    hair.scale.set(1, 1.35, 1);
    group.add(hair);
  }
  const arms: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.62, 3, 6), mat);
    arm.position.set(sx * 0.31, 1.0, 0);
    arm.rotation.z = sx * 0.12;
    group.add(arm);
    arms.push(arm);
  }
  const halo = glowSprite('#ffe3b0', 2.6, 0.55);
  halo.position.y = 1.1;
  group.add(halo);
  group.visible = false;
  scene.add(group);
  return { group, mat, halo, armR: arms[1], appear: 1, asleep: false, lying: 0 };
}
const adam = makePerson(false), eve = makePerson(true);

// —— 伊甸的两棵树：生命树（发着光）和分别善恶的树（结着金色的果子）——
interface GardenTree { group: THREE.Group; grow: number }

function makeTree(kind: 'life' | 'know'): GardenTree {
  const isLife = kind === 'life';
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.75, 4.2, 7), new THREE.MeshLambertMaterial({ color: isLife ? '#8b6a45' : '#5e4630', flatShading: true }));
  trunk.position.y = 2.1;
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: isLife ? '#86cf6c' : '#4f8f4a', flatShading: true, emissive: isLife ? '#ffd36b' : '#000000', emissiveIntensity: isLife ? 0.22 : 0 });
  const R = rng(isLife ? 31 : 32);
  // 树冠：一圈六团叶子，顶上再加一团
  for (let i = 0; i < 6; i++) {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + R() * 0.8, 0), leafMat);
    const a = i / 6 * 6.28;
    leaves.position.set(Math.cos(a) * 1.6, 4.6 + R() * 1.4, Math.sin(a) * 1.6);
    group.add(leaves);
  }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 0), leafMat);
  top.position.y = 6.0;
  group.add(top);
  // 果子。圣经没有说分别善恶树的果子是什么（不是苹果），所以这里只是一种金色的果子
  // 生命树上是一点点光，分别善恶的树上是金色的果子
  const fruitMat = isLife ? null : new THREE.MeshLambertMaterial({ color: '#f0a83a', emissive: '#7a4a10', emissiveIntensity: 0.35 });
  for (let i = 0; i < (isLife ? 10 : 14); i++) {
    const a = R() * 6.28, rr = 1.6 + R() * 1.6, y = 3.8 + R() * 2.6;
    const fruit = fruitMat ? new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), fruitMat) : glowSprite('#ffd36b', 0.7, 0.9);
    fruit.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    group.add(fruit);
  }
  if (isLife) {
    const halo = glowSprite('#ffe7a8', 8.5, 0.35);
    halo.position.y = 5;
    group.add(halo);
  }
  group.scale.setScalar(0.001);
  group.visible = false;
  scene.add(group);
  return { group, grow: 1 };
}
const treeLife = makeTree('life'), treeKnow = makeTree('know');

// —— 蛇（下一章的预告）：盘在分别善恶树的树干上 ——
function makeSerpent(): THREE.Group {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const k = i / 60, a = k * Math.PI * 5, rr = 0.86 - k * 0.24;
    pts.push(new THREE.Vector3(Math.cos(a) * rr, 1.3 + k * 2.7, Math.sin(a) * rr));
  }
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#2f4a2a', flatShading: true });
  group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.12, 6), mat));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat);
  head.scale.set(1, 0.7, 1.5);
  const end = pts[pts.length - 1];
  head.position.set(end.x + 0.25, end.y + 0.1, end.z + 0.1);
  group.add(head);
  const eyes = glowSprite('#ffe68a', 0.35, 0.9);
  eyes.position.copy(head.position).add(new THREE.Vector3(0.12, 0.12, 0.2));
  group.add(eyes);
  group.visible = false;
  group.scale.setScalar(0.001);
  scene.add(group);
  return group;
}
const serpent = makeSerpent();
let serpentGrow = 0;

// —— 一只鸽子（给活物起名时飞来），停在一块石头上 ——
function makeDove(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#f8f8f8', flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat);
  body.scale.set(1, 0.9, 1.5);
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
  head.position.set(0, 0.12, 0.2);
  group.add(head);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), new THREE.MeshLambertMaterial({ color: '#b3a998', flatShading: true }));
  rock.position.y = -0.45;
  group.add(rock);
  group.visible = false;
  scene.add(group);
  return group;
}
const dove = makeDove();

// —— 红玛瑙（创 2:12）：藏在比逊河边，走进园子以后才出现 ——
const ONYX_POS = riverPoint(RIVERS[0], 15.5, 2.6);
const onyx = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.gem, transparent: true, depthWrite: false, fog: false }));
onyx.scale.setScalar(1.2);
scene.add(onyx);

// —— 这一章自己的状态 ——
let riverLabelsOn = false; // 河名显示了没有
let naming = false;        // “给活物起名”开始了没有
let namingStart = -1;      // 是什么时刻开始的

/** 给活物起名时，三只走兽站在亚当身边的位置（相对亚当的 [x, z]） */
const NAMING_SPOTS: Record<Species, [number, number]> = { sheep: [-2.4, 1.2], deer: [-1.4, -2.5], lion: [1.9, -2.0] };
const isSpecies = (id: string): id is Species => id in NAMING_SPOTS;

// 四道河的名字，标在每道河离泉源 11 米的地方
RIVERS.forEach((rv, i) => {
  const name = RIVER_NAMES[i];
  if (!name) return;
  const [x, z] = riverPoint(rv, 11);
  addLabel('river', `<div class="nm">${esc(name.en)}</div><div class="zh" lang="zh-CN">${esc(name.zh)}</div>`,
    () => new THREE.Vector3(x, Math.max(terrainY(x, z), 0) + 1.2, z),
    () => riverLabelsOn && W.land > 0.9,
    { maxDist: 20 });
});

// 活物的名字：英文、中文、希伯来文、拼读。一个接一个地出现，每出现一个“叮”一声
Object.entries(ANIMAL_NAMES).forEach(([id, n], i) => {
  addLabel('animal', `<div class="nm">${esc(n.en)}</div><div class="zh" lang="zh-CN">${esc(n.zh)}</div><div class="he" lang="he">${esc(n.he)}</div><div class="tr">${esc(n.tr)}</div>`,
    () => {
      if (id === 'dove') return dove.position.clone().add(new THREE.Vector3(0, 0.5, 0));
      const a = animals.find((x) => x.sp === id && x.summon);
      return a ? new THREE.Vector3(a.x, terrainY(a.x, a.z) + (id === 'deer' ? 2.4 : 1.7), a.z) : null;
    },
    () => naming && U.time.value - namingStart > 2.5 + i * 1.3,
    { maxDist: 16, chime: true });
});

export const effects: Record<(typeof EDEN_EFFECTS)[number], Effect> = {
  /** 走进伊甸：园子里的草木长出来，两棵树、石桥和亚当出现 */
  eden(instant) {
    growth.eden.start.value = instant ? -100 : U.time.value + 0.2;
    [treeLife, treeKnow].forEach((tree, i) => {
      tree.group.visible = true;
      tree.grow = instant ? 1 : -i * 0.6; // 第二棵晚一点开始长
    });
    showBridges();
    adam.group.visible = true;
    adam.appear = instant ? 1 : 0;
    dimEastLights();
    if (instant) return;
    music.set('eden');
    setFocus(TREE_LIFE_POS[0], 5, TREE_LIFE_POS[1], 0.7, 5);
  },
  /** 四道河：显示河的名字 */
  rivers() {
    riverLabelsOn = true;
  },
  /** 给活物起名：绵羊、鹿、狮子走到亚当身边，鸽子停在旁边 */
  naming(instant) {
    naming = true;
    dove.visible = true;
    for (const [sp, [dx, dz]] of Object.entries(NAMING_SPOTS)) {
      if (!isSpecies(sp)) continue;
      const a = animals.find((x) => x.sp === sp);
      if (!a) continue;
      a.summon = { x: ADAM_POS[0] + dx, z: ADAM_POS[1] + dz, faceX: ADAM_POS[0], faceZ: ADAM_POS[1] };
      a.appear = 1;
      showSpecies(sp);
      // 正在看这一幕：从 9 米外走过来；读档：直接站在位置上
      a.x = instant ? a.summon.x : a.summon.x - 9;
      a.z = instant ? a.summon.z : a.summon.z + 4;
    }
    const doveX = ADAM_POS[0] + 1.2, doveZ = ADAM_POS[1] + 1.6;
    dove.position.set(doveX, terrainY(doveX, doveZ) + 0.9, doveZ);
    namingStart = instant ? U.time.value - 100 : U.time.value;
    if (!instant) setFocus(ADAM_POS[0], 1.2, ADAM_POS[1], 0.8, 9);
  },
  /** 那人沉睡 */
  sleep(instant) {
    if (instant) return;
    adam.asleep = true;
    flash('white', 0.7, 1.4);
    setFocus(ADAM_POS[0], 0.6, ADAM_POS[1], 0.8, 8);
  },
  /** 夏娃出现，亚当醒来 */
  eve(instant) {
    adam.asleep = false;
    eve.group.visible = true;
    eve.appear = instant ? 1 : 0;
    if (!instant) sfx.swell(0.6);
  },
  /** 序章结尾：蛇出现在分别善恶的树上，天色暗了一点（下一章的预告） */
  serpent(instant) {
    serpent.visible = true;
    serpentGrow = instant ? 1 : 0;
    tween(W, 'shadow', 1, 4, instant);
    if (instant) return;
    setFocus(TREE_KNOW_POS[0], 4, TREE_KNOW_POS[1], 0.9, 7);
    music.set('shadow');
  },
  /** 序章结束：显示结尾画面 */
  end(instant) {
    if (!instant) setTimeout(showEnd, 700);
  },
};

function updateTree(tree: GardenTree, at: [number, number], dt: number): void {
  if (!tree.group.visible) return;
  tree.grow = Math.min(1, tree.grow + dt * 0.35);
  tree.group.scale.setScalar(Math.max(0.001, smooth(0, 1, tree.grow)));
  tree.group.position.set(at[0], terrainY(at[0], at[1]) - 0.1, at[1]);
}

function updatePerson(p: Person, at: [number, number], isAdam: boolean, dt: number, t: number): void {
  if (!p.group.visible) return;
  p.appear = Math.min(1, p.appear + dt * 0.5);
  const k = smooth(0, 1, p.appear);
  p.lying = damp(p.lying, p.asleep ? 1 : 0, 2.5, dt);
  p.group.position.set(at[0], terrainY(at[0], at[1]) + p.lying * 0.25, at[1]);
  p.group.scale.setScalar(Math.max(0.001, k));
  p.group.rotation.z = p.lying * 1.45;
  // 平时面向玩家；起名的时候，亚当转过去面向走兽
  const facePlayer = Math.atan2(player.pos.x - at[0], player.pos.z - at[1]);
  p.group.rotation.y = damp(p.group.rotation.y, naming && isAdam ? Math.atan2(-2, 1) : facePlayer, 2, dt);
  p.mat.emissiveIntensity = 0.85 + Math.sin(t * 1.3 + (isAdam ? 0 : 1)) * 0.1; // 身上的光轻轻起伏
  p.halo.material.opacity = 0.5 * k;
  // 起名时亚当抬起右手指着
  if (isAdam && naming) p.armR.rotation.z = -0.12 - smooth(0, 0.8, t - namingStart) * 1.0;
}

function updateOnyx(t: number): void {
  const here = isDone('e1') && !save.relics.includes('onyx');
  onyx.visible = here;
  if (!here) return;
  const [x, z] = ONYX_POS;
  onyx.position.set(x, terrainY(x, z) + 0.8 + Math.sin(t * 2.5) * 0.12, z);
  if (game.state === 'play' && Math.hypot(player.pos.x - x, player.pos.z - z) < 1.7) grant({ type: 'relic', id: 'onyx' });
}

/** 每一帧：更新伊甸园里的树、人、蛇、鸽子和红玛瑙 */
export function update(dt: number, t: number): void {
  updateTree(treeLife, TREE_LIFE_POS, dt);
  updateTree(treeKnow, TREE_KNOW_POS, dt);
  updatePerson(adam, ADAM_POS, true, dt, t);
  updatePerson(eve, EVE_POS, false, dt, t);
  if (serpent.visible) {
    serpentGrow = Math.min(1, serpentGrow + dt * 0.4);
    serpent.scale.setScalar(Math.max(0.001, smooth(0, 1, serpentGrow)));
    serpent.position.set(TREE_KNOW_POS[0], terrainY(TREE_KNOW_POS[0], TREE_KNOW_POS[1]), TREE_KNOW_POS[1]);
    serpent.rotation.y = Math.sin(t * 0.4) * 0.08;
  }
  if (dove.visible) dove.rotation.y = Math.sin(t * 0.6) * 0.5;
  updateOnyx(t);
}
