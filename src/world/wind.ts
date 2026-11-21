// 风（创 1:2“神的灵运行在水面上”——希伯来文 ruach 也是“风”的意思）：
// 一层贴着水面流动的光点。黑暗里最明显，天亮以后只剩淡淡的一点。
import * as THREE from 'three';
import { rng } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { TEX } from '../core/textures';
import { terrainY } from './heightmap';

function buildMotes(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const n = 520, p = new Float32Array(n * 3), R = rng(41);
  for (let i = 0; i < n; i++) {
    p[i * 3] = (R() - 0.5) * 70;
    p[i * 3 + 1] = 0.25 + R() * 2.2;
    p[i * 3 + 2] = (R() - 0.5) * 70;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ map: TEX.glow, size: 0.17, color: '#fff1cf', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}
const motes = buildMotes();

/**
 * 每一帧：让光点往东飘。
 * (cx, cz) 是玩家的位置：光点飘出玩家周围 35 米就从另一边绕回来，所以玩家身边永远有风。
 */
export function updateWind(dt: number, t: number, cx: number, cz: number): void {
  const wp = motes.geometry.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    let x = wp.getX(i) + dt * (2.2 + (i % 5) * 0.3);
    let z = wp.getZ(i) + Math.sin(t * 0.7 + i) * dt * 0.6;
    let y = wp.getY(i);
    if (x - cx > 35) x -= 70;
    if (x - cx < -35) x += 70;
    if (z - cz > 35) z -= 70;
    if (z - cz < -35) z += 70;
    // 陆地升起之后，光点不能钻到地底下
    const gy = W.land > 0.5 ? Math.max(terrainY(x, z), 0) : 0;
    if (y < gy + 0.2) y = gy + 0.2 + (i % 7) * 0.3;
    wp.setXYZ(i, x, y, z);
  }
  wp.needsUpdate = true;
  motes.material.opacity = (1 - W.light) * 0.75 * W.wind + W.light * 0.07;
}
