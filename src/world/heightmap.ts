// 地形的“高度函数”：给一个位置 (x, z)，算出那里的地面有多高。
// 这里只有计算，不画任何东西，所以可以写测试（见 heightmap.test.ts）。
//
// 坐标：x 越大越往东，z 越大越往南，y 是高度。海平面在 y = 0。
// 第 1 季前几章的地图：西边是主岛（创造七日），中间是伊甸，中间一条陆桥连着；伊甸再往东是园子外面的地（第 4 章）。
import { clamp, easeInOut, fbm, lerp, smooth } from '../core/math';
import { W } from '../core/state';

/** 伊甸中央泉源的位置 */
export const EDEN = { x: 62, z: -18 };

/** 走完七日之前，再往东（x 大于这个数）就走不过去了 */
export const EDEN_GATE_X = 33.5;

/** 地形网格的中心和大小（种草种树时也在这个范围里撒点） */
export const T_CX = 22, T_CZ = 2, T_W = 190, T_D = 160;

/** 陆地由几个椭圆拼成：中心 (x, z)，东西半径 rx，南北半径 rz */
const BLOBS = [
  { x: 0, z: 6, rx: 40, rz: 50 },     // 主岛
  { x: 62, z: -18, rx: 30, rz: 28 },  // 东方的伊甸
  { x: 30, z: -16, rx: 17, rz: 10 },  // 连接两地的陆桥
];

/**
 * 后来加上的地（第 4 章起）。单独列出来，是为了让岸边的石头还照没有它们时的海岸线撒点，
 * 这样每加一块地，前几章的景物都不会挪动（见 plants.ts）。
 */
/** 伊甸的东边：园子外面的地（第 4 章，亚当一家住的地方和挪得之地） */
export const EAST_LAND = { x: 100, z: -6, rx: 14, rz: 27 };
/** 再往北：沿着比逊河的一条长路（第 5 章，亚当的家谱） */
export const NORTH_LAND = { x: 104, z: -50, rx: 11, rz: 20 };
/**
 * 第 6 章的地图：在原来那张图的南边另加的一块地形（中心 cx, cz，东西宽 w、南北长 d）。
 * 方舟要照真实的大小造（137 米长，见 episodes/gen-06-spots.ts），原来那张图装不下，所以挪亚的地和亚拉腊山都在这里。
 * 它的北边正好接着原来那张图的南边（z = 82），两块不重叠。
 */
export const FLOOD_MAP = { cx: 135, cz: 214, w: 240, d: 264 };
/** 挪亚造方舟的地（第 6 章）：一大块岛 */
export const NOAH_LAND = { x: 135, z: 150, rx: 105, rz: 58 };
const LATER_LANDS = [EAST_LAND, NORTH_LAND, NOAH_LAND];
/**
 * 造方舟的场地：一块压平的长方形。中心 (x, z)，东西半长 hx、南北半宽 hz，地面高 y。
 * 方舟长 137 米、宽 23 米，场地四边都比它大出几米
 */
export const ARK_YARD = { x: 135, z: 150, hx: 76, hz: 17, y: 1.2 };
/**
 * 亚拉腊山（创 8:4）：挪亚的地南边海里的一座大山，顶上是一块东西长的平地，方舟最后停在上面。
 * 平顶的形状像操场的跑道：中间一个东西半长 hx、南北半宽 hz 的长方形，再往外 top 米以内都是平顶；
 * 从平顶的边再往外 base 米是山坡，一直下到海底。y 是平顶的高度（米）
 */
export const ARARAT = { x: 135, z: 285, hx: 54, hz: 4, top: 26, base: 52, y: 18 };
/** 亚拉腊山旁边两座矮一些的山（创 8:5“山顶都现出来了”）：中心 (x, z)、半径 r、山顶的高度 y。都比亚拉腊山矮 */
export const LOW_PEAKS = [{ x: 44, z: 236, r: 26, y: 13 }, { x: 228, z: 238, r: 26, y: 15 }];
/** 以诺走上去的那座小山（第 5 章） */
export const ENOCH_HILL = { x: 111, z: -50, r: 4.6, h: 3 };

/** 一道河：从伊甸的泉源出发，朝 (ux, uz) 这个方向流 */
export interface River { ux: number; uz: number }

/** 四道河：从伊甸中央的泉源流向四方（创 2:10）。顺序和 JSON 里 riverNames 的顺序一致 */
const RIVER_DIRECTIONS: Array<[number, number]> = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
export const RIVERS: River[] = RIVER_DIRECTIONS.map(([dx, dz]) => {
  const l = Math.hypot(dx, dz);
  return { ux: dx / l, uz: dz / l };
});

/** 河不是笔直的：离泉源 t 米的地方，往旁边摆多少 */
export const riverMeander = (t: number): number => Math.sin(t * 0.25) * 1.2;

/** 河上离泉源 t 米的那一点；side 是再往岸边偏多少米 */
export function riverPoint(r: River, t: number, side = 0): [number, number] {
  const px = -r.uz, pz = r.ux, m = riverMeander(t) + side;
  return [EDEN.x + r.ux * t + px * m, EDEN.z + r.uz * t + pz * m];
}

/** 一座圆圆的小山：中心 (cx, cz)，半径 rad，高 h */
function hill(x: number, z: number, cx: number, cz: number, rad: number, h: number): number {
  const d = Math.hypot(x - cx, z - cz) / rad;
  return d >= 1 ? 0 : h * (1 - d * d) * (1 - d * d);
}

/** 离一个长方形（中心 cx, cz，半长 hx、半宽 hz）有多远；在长方形里面是 0 */
function rectDist(x: number, z: number, cx: number, cz: number, hx: number, hz: number): number {
  return Math.hypot(Math.max(0, Math.abs(x - cx) - hx), Math.max(0, Math.abs(z - cz) - hz));
}

/** 造方舟的场地：场地里面压成平地，往外 8 米慢慢回到原来的地形 */
function arkYard(x: number, z: number, h: number): number {
  const Y = ARK_YARD, e = rectDist(x, z, Y.x, Y.z, Y.hx, Y.hz);
  return lerp(h, Y.y, 1 - smooth(0, 8, e));
}

/** 亚拉腊山：平顶上几乎是平的（只在靠边的地方有一点起伏），往外是山坡，一直下到原来的高度（海底） */
function ararat(x: number, z: number, h: number): number {
  const A = ARARAT, d = rectDist(x, z, A.x, A.z, A.hx, A.hz);
  if (d >= A.top + A.base) return h;
  const top = A.y + (fbm(x * 0.05 + 7, z * 0.05 + 2) - 0.5) * 1.6 * smooth(A.top - 10, A.top, d);
  return lerp(h, top, 1 - smooth(A.top, A.top + A.base, d));
}

/** 一座从海底（-7.5 米）升起的尖一些的山，山顶高 p.y */
function peak(x: number, z: number, p: { x: number; z: number; r: number; y: number }): number {
  const d = Math.hypot(x - p.x, z - p.z) / p.r;
  return d >= 1 ? -7.5 : -7.5 + (p.y + 7.5) * (1 - d * d) * (1 - d * d);
}

/** 这个位置离海岸有多远：大于 0 是陆地，小于 0 是海。加了一点噪声，海岸线才不会太圆 */
function islandMask(x: number, z: number, later: boolean): number {
  let m = -1;
  for (const b of later ? [...BLOBS, ...LATER_LANDS] : BLOBS) {
    const dx = (x - b.x) / b.rx, dz = (z - b.z) / b.rz;
    m = Math.max(m, 1 - (dx * dx + dz * dz));
  }
  return m + (fbm(x * 0.06 + 3.1, z * 0.06 - 1.7) - 0.5) * 0.32;
}

/**
 * 陆地完全升起之后，(x, z) 这里的地面高度。
 * later = false 时假装后来加的地（第 4 章起）还没有（只有撒岸边石头时用）
 */
export function baseHeight(x: number, z: number, later = true): number {
  const m = islandMask(x, z, later);
  // 海里往外越来越深；岸上先是沙滩的缓坡，再往里慢慢抬高
  let h = m < 0 ? -0.3 + m * 18 : -0.3 + Math.min(m, 0.25) * 4 + Math.max(0, m - 0.25) * 1.6;
  h = Math.max(h, -7.5);
  // 起伏的丘陵
  h += smooth(0.12, 0.5, m) * (fbm(x * 0.035 + 10, z * 0.035 - 5) - 0.45) * 4.5;
  h += hill(x, z, -5, -30, 9.5, 5.5) + hill(x, z, -24, 13, 10, 3.2) + hill(x, z, 22, 26, 9, 2.6);
  h -= hill(x, z, -16, -5, 7, 3.4); // 第五日的小湖
  if (later) {
    h += hill(x, z, ENOCH_HILL.x, ENOCH_HILL.z, ENOCH_HILL.r, ENOCH_HILL.h);
    h = arkYard(x, z, h);
    h = ararat(x, z, h);
    for (const p of LOW_PEAKS) h = Math.max(h, peak(x, z, p));
  }
  // 伊甸：平缓的园子 + 中央泉源 + 四道河
  const dx = x - EDEN.x, dz = z - EDEN.z, r = Math.hypot(dx, dz);
  const flat = 1 - smooth(16, 27, r);
  h = lerp(h, 1.25 + (fbm(x * 0.08, z * 0.08) - 0.5) * 0.9, flat);
  h = lerp(h, -0.9, 1 - smooth(2.3, 3.1, r));
  for (const rv of RIVERS) {
    const t = dx * rv.ux + dz * rv.uz;               // 沿着河走了多远
    if (t < 1.5) continue;
    const d = Math.abs(dx * -rv.uz + dz * rv.ux - riverMeander(t)); // 离河中心多远
    const w = 0.85 + t * 0.02;                         // 河越流越宽
    const k = (1 - smooth(w, w + 0.9, d)) * smooth(1.5, 3.2, t);
    h = lerp(h, Math.min(h, -0.85), k);
  }
  return h;
}

/** 地形先藏在水下 11 米，第三日“旱地露出来”时升上来。这是现在还沉着多少（负数） */
export const landOffset = (): number => -11 * (1 - easeInOut(clamp(W.land, 0, 1)));

/** 现在这一刻 (x, z) 这里的地面高度（陆地还没升起时会比 baseHeight 低） */
export const terrainY = (x: number, z: number): number => baseHeight(x, z) + landOffset();
