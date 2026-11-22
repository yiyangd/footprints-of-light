// 光之路：黑暗中浮在水面上的垫脚石；陆地升起后变成一条石路。
// 还有伊甸四道河上的石桥，以及“这里的地面有多高”的查询 groundAt()。
import * as THREE from 'three';
import { rng } from '../core/math';
import { scene } from '../core/renderer';
import { W } from '../core/state';
import { platformHeight } from './platforms';
import { riverPoint, RIVERS, terrainY } from './heightmap';

/** 离路的中心线多近算是踩在石头上（米） */
const PATH_W = 1.35;

/** 路的走向：从南边的起点一路往北，再向东通往伊甸。每一项是 [x, z] */
const PATH_POINTS: Array<[number, number]> = [
  [0, 49.5], [0, 46.5], [0, 41], [2.5, 35], [6, 28.5], [3, 22], [-4, 16.5], [-1.5, 10], [5, 4.5], [2, -1], [-7, -5],
  [-3, -11], [3, -16.5], [1.5, -23], [-3.5, -28.5], [4, -27], [14, -23.5], [24, -19.5], [34, -16.5], [42, -15],
];
const pathCurve = new THREE.CatmullRomCurve3(PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
const pathPts = pathCurve.getSpacedPoints(700);

/** (x, z) 离光之路有多远（米） */
export function pathDist(x: number, z: number): number {
  let best = 1e9;
  for (const p of pathPts) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** 垫脚石的顶面有多高：陆地升起之前浮在水面上，之后贴着地面 */
const stoneY = (x: number, z: number): number => Math.max(0.22, terrainY(x, z) + 0.07);

// —— 垫脚石：沿着路每隔 1.22 米放一块六边形的石头 ——
interface Stone { x: number; z: number; s: number; r: number }
function layStones(): Stone[] {
  const R = rng(5), len = pathCurve.getLength(), n = Math.floor(len / 1.22), list: Stone[] = [];
  for (let i = 0; i < n; i++) {
    const p = pathCurve.getPointAt(i / n), tan = pathCurve.getTangentAt(i / n);
    const off = (R() - 0.5) * 0.8; // 往路的两边随机偏一点，看起来自然
    list.push({ x: p.x - tan.z * off, z: p.z + tan.x * off, s: 0.52 + R() * 0.2, r: R() * Math.PI });
  }
  return list;
}
const stones = layStones();
const stoneGeo = new THREE.CylinderGeometry(1, 1, 0.24, 6);
stoneGeo.translate(0, -0.12, 0);
const stoneMesh = new THREE.InstancedMesh(
  stoneGeo,
  new THREE.MeshLambertMaterial({ color: '#e3d8c2', emissive: '#ffd79a', emissiveIntensity: 0.2, flatShading: true }),
  stones.length,
);
stoneMesh.frustumCulled = false;
scene.add(stoneMesh);

/** 把每块石头摆到现在该在的高度 */
export function updateStones(): void {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const pos = new THREE.Vector3(), scale = new THREE.Vector3();
  stones.forEach((s, i) => {
    q.setFromEuler(e.set(0, s.r, 0));
    m.compose(pos.set(s.x, stoneY(s.x, s.z), s.z), q, scale.set(s.s, 1, s.s));
    stoneMesh.setMatrixAt(i, m);
  });
  stoneMesh.instanceMatrix.needsUpdate = true;
}
updateStones();

// —— 伊甸四道河上的石桥（可以绕着泉源走一圈）——
interface Bridge { x: number; z: number; y: number; ux: number; uz: number; mesh: THREE.Mesh }
const bridges: Bridge[] = RIVERS.map((rv) => {
  const [x, z] = riverPoint(rv, 5.6), ang = Math.atan2(rv.ux, rv.uz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 1.7), new THREE.MeshLambertMaterial({ color: '#cbbd9f', flatShading: true }));
  mesh.position.set(x, 0.22, z);
  mesh.rotation.y = ang;
  mesh.visible = false;
  scene.add(mesh);
  return { x, z, y: 0.37, ux: rv.ux, uz: rv.uz, mesh };
});

/** 让石桥显出来（走进伊甸时） */
export function showBridges(): void {
  for (const b of bridges) b.mesh.visible = true;
}

/** (x, z) 是不是在这座桥的桥面上 */
function onBridge(b: Bridge, x: number, z: number): boolean {
  const dx = x - b.x, dz = z - b.z;
  const along = dx * b.ux + dz * b.uz, across = dx * -b.uz + dz * b.ux;
  return Math.abs(along) < 0.95 && Math.abs(across) < 2.3;
}

/**
 * 地面高度查询：玩家、镜头、动物都用它。
 * 返回 (x, z) 那里能站的最高的面；如果那里是水、没地方站，返回 null。
 */
export function groundAt(x: number, z: number): number | null {
  let best: number | null = null;
  // 比水面低 0.3 米以上的地方是水，不能站（第 6 章洪水的时候，水面会涨高）
  const wet = W.flood - 0.3;
  if (W.land > 0.02) {
    const h = terrainY(x, z);
    if (h > wet) best = h;
  }
  if (pathDist(x, z) < PATH_W) {
    const s = stoneY(x, z);
    if (s > wet && (best === null || s > best)) best = s;
  }
  if (W.land > 0.9) {
    for (const b of bridges) if (onBridge(b, x, z) && b.y > wet && (best === null || b.y > best)) best = b.y;
  }
  // 方舟这样能站上去的东西
  const p = platformHeight(x, z);
  if (p !== null && (best === null || p > best)) best = p;
  return best;
}

let stonesDrawnAt = -1; // 上一次摆石头时陆地升到了多少

/** 每一帧：陆地正在升起的时候，石头要跟着重新摆 */
export function updatePath(): void {
  if (W.land > 0 && W.land < 1.0001 && stonesDrawnAt !== W.land) {
    updateStones();
    stonesDrawnAt = W.land;
  }
}
