// 玩家：持灯的旅人（原创造型：亚麻长袍、兜帽、陶灯）。
// 这个文件管两件事：角色长什么样（buildHero），以及每一帧怎么动（updatePlayer）。
import * as THREE from 'three';
import { UI } from '../content';
import { music } from '../core/audio';
import { flash } from '../core/flash';
import { moveInput, input } from '../core/input';
import { angleDiff, clamp, damp, smooth } from '../core/math';
import { scene } from '../core/renderer';
import { game, U, W } from '../core/state';
import { glowSprite, TEX } from '../core/textures';
import { hint } from '../story/hint';
import { EDEN_GATE_X } from '../world/heightmap';
import { groundAt } from '../world/path';

/** 玩家的状态 */
export const player = {
  pos: new THREE.Vector3(0, 0.22, 49),   // 位置（起点在光之路的最南端）
  vel: new THREE.Vector3(),              // 速度
  facing: Math.PI,                       // 脸朝哪个方向（弧度）
  onGround: true,
  coyote: 0,       // “土狼时间”：刚走出边缘的一小会儿里还可以起跳
  jumpBuf: 0,      // “跳跃缓冲”：落地前一小会儿按的跳，落地后马上跳
  gliding: false,
  energy: 1,       // 滑翔的力气，0 到 1，站在地上会恢复
  safe: new THREE.Vector3(0, 0.22, 49),  // 最后站过的安全位置（掉进水里就回到这里）
  safeT: 0,
  walkT: 0,        // 走路动画的进度
  gesture: null as string | null,        // 正在做的姿态（rest 安息 / name 命名）
  gestureT: 0,
};

// —— 角色的模型 ——
interface HeroParts {
  robe: THREE.Mesh;
  cape: THREE.Mesh;
  arm: THREE.Mesh;
  lamp: THREE.Group;
  flame: THREE.Sprite;
  core: THREE.Sprite;
  lampLight: THREE.PointLight;
  shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

/** 把一串 [半径, 高度] 变成 three.js 的点（用来“车”出袍子和灯碗这样的旋转体） */
const profile = (points: Array<[number, number]>): THREE.Vector2[] => points.map(([x, y]) => new THREE.Vector2(x, y));

const hero = new THREE.Group();
scene.add(hero);

function buildHero(): HeroParts {
  // 长袍
  const robeMat = new THREE.MeshLambertMaterial({ color: '#e9dcc0', emissive: '#3a3020', emissiveIntensity: 0.35, flatShading: true });
  const robe = new THREE.Mesh(new THREE.LatheGeometry(profile([[0, 0], [0.38, 0.02], [0.35, 0.22], [0.27, 0.6], [0.2, 0.88], [0.13, 1.0], [0, 1.03]]), 9), robeMat);
  hero.add(robe);
  // 腰带
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 5, 14), new THREE.MeshLambertMaterial({ color: '#b5652b', emissive: '#3a1a08', emissiveIntensity: 0.4 }));
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.62;
  hero.add(sash);
  // 头和眼睛
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshLambertMaterial({ color: '#c99a6e', emissive: '#2a1a0e', emissiveIntensity: 0.4 }));
  head.position.y = 1.16;
  hero.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a1d14' });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eyeMat);
    eye.position.set(sx * 0.06, 1.18, 0.155);
    hero.add(eye);
  }
  // 兜帽
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 14, 10, Math.PI * 0.18, Math.PI * 1.64, 0, Math.PI * 0.62),
    new THREE.MeshLambertMaterial({ color: '#cdb68d', emissive: '#30261a', emissiveIntensity: 0.35, side: THREE.DoubleSide, flatShading: true }),
  );
  hood.position.y = 1.17;
  hood.rotation.y = Math.PI;
  hero.add(hood);
  // 披肩：上窄下宽的一块布，滑翔时张开
  const capeGeo = new THREE.BufferGeometry();
  capeGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, -0.33, -0.78, -0.04, 0.33, -0.78, -0.04], 3));
  capeGeo.setIndex([0, 2, 1, 1, 2, 3]);
  capeGeo.computeVertexNormals();
  const cape = new THREE.Mesh(capeGeo, new THREE.MeshLambertMaterial({ color: '#3c7468', emissive: '#0c2220', emissiveIntensity: 0.45, side: THREE.DoubleSide }));
  cape.position.set(0, 1.02, -0.17);
  hero.add(cape);
  // 提灯的手臂
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 3, 6), robeMat);
  arm.position.set(0.17, 0.78, 0.22);
  arm.rotation.x = 1.25;
  hero.add(arm);
  // 陶灯：浅碗 + 捏出的灯嘴（随时代变样，见设计文档第 2 节）
  const lamp = new THREE.Group();
  lamp.position.set(0.17, 0.72, 0.42);
  hero.add(lamp);
  const clay = new THREE.MeshLambertMaterial({ color: '#b4683f', flatShading: true });
  lamp.add(new THREE.Mesh(new THREE.LatheGeometry(profile([[0, 0], [0.1, 0.01], [0.13, 0.05], [0.12, 0.08], [0.1, 0.075]]), 10), clay));
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 5), clay);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0.06, 0.15);
  lamp.add(spout);
  // 灯火：外面一团橙光，中间一点白芯，再加一盏真的会照亮周围的灯
  const flame = glowSprite('#ffb547', 0.55, 0);
  flame.position.set(0, 0.14, 0.2);
  lamp.add(flame);
  const core = glowSprite('#fff2c2', 0.2, 0);
  core.position.copy(flame.position);
  lamp.add(core);
  const lampLight = new THREE.PointLight('#ffb35c', 0, 10, 1.6);
  lampLight.position.copy(flame.position);
  lamp.add(lampLight);
  // 脚下的圆影子（不用实时阴影）
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  return { robe, cape, arm, lamp, flame, core, lampLight, shadow };
}
const parts = buildHero();

// —— 每一帧的移动 ——
const forward = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
let toldBarrier = false; // “园子还没开”这句提示只说一次

/** 伊甸的门还没开时，东边走不过去 */
const blockedByGate = (x: number): boolean => !W.edenOpen && x > EDEN_GATE_X;

/** 能不能走到 (x, z)：不能穿过没开的门，不能走进水里，也不能一步登上太高的台阶 */
function canGo(x: number, z: number): boolean {
  if (blockedByGate(x)) {
    if (!toldBarrier) { toldBarrier = true; hint(UI.barrier, 5); }
    return false;
  }
  if (!player.onGround) return true; // 在空中时不拦，落不落得住由下面的重力来管
  const g = groundAt(x, z);
  return g !== null && g - player.pos.y < 0.8;
}

/**
 * 每一帧更新玩家。
 * @param camYaw 镜头现在朝哪边：按“前”是朝镜头看的方向走
 * @returns 玩家是不是在走动（镜头用它决定要不要慢慢转到身后）
 */
export function updatePlayer(dt: number, camYaw: number): boolean {
  const mi = game.state === 'play' ? moveInput() : { x: 0, y: 0, mag: 0, run: false };
  // 一走动，姿态就结束
  if (player.gesture && mi.mag > 0.1) { player.gesture = null; music.duck(false); }

  // 1. 水平方向：想往哪走 → 速度慢慢跟上 → 脸转过去
  forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
  wish.copy(forward).multiplyScalar(mi.y).addScaledVector(right, mi.x);
  const speed = (mi.run ? 7.2 : 4.3) * (player.gliding ? 1.3 : 1);
  const grip = player.onGround ? 11 : 2.5; // 在空中转向比较慢
  player.vel.x = damp(player.vel.x, wish.x * speed, grip, dt);
  player.vel.z = damp(player.vel.z, wish.z * speed, grip, dt);
  if (mi.mag > 0.05) player.facing += angleDiff(Math.atan2(wish.x, wish.z), player.facing) * (1 - Math.exp(-12 * dt));

  // 2. 试着走过去；被挡住时试试只走 x 或只走 z（这样可以贴着边滑过去）
  const nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.z * dt;
  if (canGo(nx, nz)) { player.pos.x = nx; player.pos.z = nz; }
  else if (canGo(nx, player.pos.z)) player.pos.x = nx;
  else if (canGo(player.pos.x, nz)) player.pos.z = nz;
  else { player.vel.x *= 0.2; player.vel.z *= 0.2; }

  // 3. 竖直方向：贴地、起跳、下落、滑翔
  const g = groundAt(player.pos.x, player.pos.z);
  if (input.jumpPressed) { player.jumpBuf = 0.15; input.jumpPressed = false; }
  player.jumpBuf -= dt;
  player.coyote -= dt;
  if (player.onGround) {
    if (g === null || g < player.pos.y - 0.7) { player.onGround = false; player.coyote = 0.12; } // 走出了边缘
    else { player.pos.y = damp(player.pos.y, g, 25, dt); player.vel.y = 0; }
  }
  if (player.jumpBuf > 0 && (player.onGround || player.coyote > 0) && game.state === 'play' && !player.gesture) {
    player.vel.y = 7.6;
    player.onGround = false;
    player.coyote = 0;
    player.jumpBuf = 0;
  }
  if (!player.onGround) {
    player.vel.y -= 20 * dt; // 重力
    // 灯点亮以后，在下落时按住跳跃键就能滑翔：落得慢，但会消耗力气
    player.gliding = input.jumpHeld && player.vel.y < 0 && player.energy > 0 && W.lampLit;
    if (player.gliding) {
      player.vel.y = Math.max(player.vel.y, -1.5);
      player.energy = Math.max(0, player.energy - dt * 0.2);
    }
    player.pos.y += player.vel.y * dt;
    if (g !== null && player.pos.y <= g && player.vel.y <= 0) { // 落地
      player.pos.y = g;
      player.onGround = true;
      player.vel.y = 0;
      player.gliding = false;
    }
  } else {
    player.gliding = false;
    player.energy = Math.min(1, player.energy + dt * 0.6);
  }

  // 4. 掉进深水：回到最后站过的安全位置
  if (player.pos.y < -1.4) {
    flash('black', 1, 0.5);
    player.pos.copy(player.safe);
    player.vel.set(0, 0, 0);
    player.onGround = true;
  }
  player.safeT -= dt;
  if (player.onGround && g !== null && g > 0.05 && player.safeT <= 0) { player.safe.copy(player.pos); player.safeT = 0.4; }

  const speedNow = Math.hypot(player.vel.x, player.vel.z);
  animateHero(dt, speedNow, g);
  return speedNow > 0.5;
}

/** 程序动画：走路时身体起伏、披肩随速度摆动、滑翔时张开、灯火摇晃 */
function animateHero(dt: number, speedNow: number, ground: number | null): void {
  player.walkT += dt * (2 + speedNow * 1.9);
  const stride = clamp(speedNow / 4, 0, 1);
  const bob = player.onGround ? Math.abs(Math.sin(player.walkT)) * 0.05 * stride : 0;
  player.gestureT += dt;
  const sit = player.gesture === 'rest' ? smooth(0, 0.6, player.gestureT) : 0;     // 安息：坐下
  const point = player.gesture === 'name' ? smooth(0, 0.4, player.gestureT) : 0;   // 命名：抬手指向前方
  hero.position.set(player.pos.x, player.pos.y + bob - sit * 0.32, player.pos.z);
  hero.rotation.y = player.facing;

  parts.robe.scale.set(1 + sit * 0.25, 1 - sit * 0.3, 1 + sit * 0.25);
  parts.robe.rotation.z = Math.sin(player.walkT) * 0.04 * stride;
  parts.cape.rotation.x = player.gliding ? -1.2 : damp(parts.cape.rotation.x, -0.12 - clamp(speedNow / 7, 0, 1) * 0.45, 6, dt);
  parts.cape.scale.x = player.gliding ? 1.9 : damp(parts.cape.scale.x, 1, 6, dt);
  parts.arm.rotation.x = 1.25 + point * 0.25;
  parts.arm.position.y = 0.78 + point * 0.25;
  parts.lamp.position.y = 0.72 + point * 0.3 - sit * 0.05 + Math.sin(player.walkT * 0.5) * 0.015;

  // 灯火：点亮之后才有，会轻轻闪动；滑翔的力气越足，火越大
  const lit = W.lampLit ? 1 : 0;
  const flicker = 0.92 + Math.sin(U.time.value * 13) * 0.04 + Math.sin(U.time.value * 7.3) * 0.04;
  parts.flame.material.opacity = lit * flicker;
  parts.flame.scale.setScalar(0.45 + player.energy * 0.25);
  parts.core.material.opacity = lit;
  parts.lampLight.intensity = lit * (3.2 + player.energy * 1.5) * flicker;

  // 影子：贴在地上；跳得越高越淡，天越亮越明显
  const sg = ground ?? player.pos.y;
  parts.shadow.position.set(player.pos.x, sg + 0.03, player.pos.z);
  parts.shadow.material.opacity = clamp(1 - (player.pos.y - sg) / 6, 0.2, 1) * (0.4 + W.light * 0.6);
}
