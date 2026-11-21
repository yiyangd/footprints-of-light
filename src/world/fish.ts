// 鱼（第五日）：隔一会儿从水里跳起来，落水的地方荡开一圈涟漪。
import * as THREE from 'three';
import { lerp, rng } from '../core/math';
import { scene } from '../core/renderer';
import { TEX } from '../core/textures';
import { pickJump, SPOTS } from './fish-spots';
import { mergeParts, placeAt } from './shapes';

/** 一条鱼：水域的中心 (cx, cz) 和半径 rr；t 小于 0 是在水下等着，0 到 dur 是正在跳，从 (ax, az) 跳到 (bx, bz) */
interface Jumper { cx: number; cz: number; rr: number; t: number; dur: number; ax: number; az: number; bx: number; bz: number }

function buildFish(): THREE.InstancedMesh {
  const geo = mergeParts([
    { geo: new THREE.OctahedronGeometry(0.22, 0), m: placeAt(0, 0, 0, 0.5, 0.7, 1.4), color: '#cfe4ef' },           // 身体
    { geo: new THREE.ConeGeometry(0.15, 0.25, 3), m: placeAt(0, 0, -0.35, 1, 1, 0.4, Math.PI / 2), color: '#9cc6dd' }, // 尾巴
  ]);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), SPOTS.length);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}
const mesh = buildFish();

// 每条鱼一开始就在自己的水域里挑好第一次跳跃的位置（怎么挑、怎么保证落在水里，见 fish-spots.ts）。
// 以前起跳点和落水点一开始都是 0，每条鱼的第一次跳跃都发生在地图正中央的陆地上。
const R = rng(13);
const jumpers: Jumper[] = SPOTS.map(([cx, cz, rr]) => ({ cx, cz, rr, t: -R() * 4, dur: 0.9 + R() * 0.4, ...pickJump(cx, cz, rr, Math.random) }));

/** 每条鱼一圈涟漪 */
const ripples: THREE.Sprite[] = SPOTS.map(() => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(s);
  return s;
});

/** 让鱼开始跳 */
export function showFish(): void {
  mesh.visible = true;
}

const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
const vPos = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);

/** 跳完一次：回到水下等几秒，并挑好下一次起跳和落水的地方 */
function planNextJump(f: Jumper): void {
  f.t = -1.5 - Math.random() * 4;
  Object.assign(f, pickJump(f.cx, f.cz, f.rr, Math.random));
}

/** 每一帧：推进每条鱼的跳跃和涟漪 */
export function updateFish(dt: number): void {
  if (!mesh.visible) return;
  jumpers.forEach((f, i) => {
    f.t += dt;
    const rip = ripples[i];
    if (f.t >= f.dur) planNextJump(f);
    if (f.t < 0) {
      // 在水下：鱼缩到看不见，涟漪慢慢散开、淡掉
      m4.makeScale(0, 0, 0);
      mesh.setMatrixAt(i, m4);
      rip.material.opacity = Math.max(0, rip.material.opacity - dt * 0.8);
      rip.scale.multiplyScalar(1 + dt * 0.8);
      return;
    }
    // 在空中：沿一条弧线从 a 飞到 b，头先朝上再朝下
    const k = f.t / f.dur, x = lerp(f.ax, f.bx, k), z = lerp(f.az, f.bz, k), y = Math.sin(k * Math.PI) * 1.3 - 0.1;
    quat.setFromEuler(euler.set(-Math.cos(k * Math.PI) * 0.9, Math.atan2(f.bx - f.ax, f.bz - f.az), 0));
    m4.compose(vPos.set(x, y, z), quat, ONE);
    mesh.setMatrixAt(i, m4);
    // 快落水时，在落点放出一圈新的涟漪
    if (k > 0.92 && rip.material.opacity < 0.1) {
      rip.position.set(f.bx, 0.08, f.bz);
      rip.scale.set(0.6, 0.6, 1);
      rip.material.opacity = 0.7;
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
}
