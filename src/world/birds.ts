// 鸟群（第五日）：34 只鸟在天上绕着圈飞。翅膀的扇动写在着色器里。
import * as THREE from 'three';
import { rng } from '../core/math';
import { scene } from '../core/renderer';
import { U, W } from '../core/state';

const COUNT = 34;

/** 一只鸟的飞行路线：绕着 (cx, cz) 转圈，半径 r，高度 h，速度 sp（正负表示方向） */
interface Flight { r: number; h: number; sp: number; a: number; ph: number; cx: number; cz: number }

function buildBirds(): THREE.InstancedMesh {
  // 一只鸟 = 身体 + 左右两片翅膀，三个三角形
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.32, -0.07, 0, -0.2, 0.07, 0, -0.2, 0, 0, 0.12, -0.62, 0.02, -0.05, 0, 0, -0.14, 0, 0, 0.12, 0, 0, -0.14, 0.62, 0.02, -0.05], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: '#f7f3ea', side: THREE.DoubleSide });
  // 离身体越远的点上下摆得越多，看起来就像在扇翅膀；每只鸟的节奏错开一点
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n float fl = sin(uTime*9.0 + float(gl_InstanceID)*1.7); transformed.y += abs(position.x) * fl * 0.55;');
  };
  mat.customProgramCacheKey = () => 'bird';
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}
const mesh = buildBirds();

const R = rng(9);
const flights: Flight[] = Array.from({ length: COUNT }, () => ({
  r: 14 + R() * 26, h: 14 + R() * 14, sp: (0.12 + R() * 0.1) * (R() < 0.5 ? 1 : -1),
  a: R() * 6.28, ph: R() * 6.28, cx: -2 + R() * 10, cz: R() * 10 - 5,
}));

let fade = 0; // 0 = 看不见，1 = 完全出现

/** 让鸟出现。instant = true（读档）时直接出现，否则慢慢变大飞出来 */
export function showBirds(instant: boolean): void {
  mesh.visible = true;
  fade = instant ? 1 : 0;
}

const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
const vPos = new THREE.Vector3(), vScale = new THREE.Vector3();

/** 每一帧：让每只鸟沿着自己的圈往前飞一点 */
export function updateBirds(dt: number, t: number): void {
  if (!mesh.visible) return;
  fade = Math.min(1, fade + dt * 0.3);
  flights.forEach((b, i) => {
    const a = b.a + t * b.sp;
    const x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, y = b.h + Math.sin(t * 0.8 + b.ph) * 1.5;
    const yaw = Math.atan2(-Math.sin(a) * b.sp, Math.cos(a) * b.sp); // 头朝着飞的方向
    quat.setFromEuler(euler.set(0, yaw, Math.sign(b.sp) * 0.25));     // 转弯时身体稍微倾斜
    m4.compose(vPos.set(x, y, z), quat, vScale.setScalar(Math.max(0.001, fade * 1.15 * (1 - W.flooded)))); // 洪水的时候飞鸟也藏起来
    mesh.setMatrixAt(i, m4);
  });
  mesh.instanceMatrix.needsUpdate = true;
}
