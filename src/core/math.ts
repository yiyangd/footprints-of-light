// 数学小工具。
// 这里的函数都是“纯函数”：只看传进来的数，不碰画面，所以可以放心地写测试（见 math.test.ts）。

/** 把 v 限制在 a 和 b 之间 */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** 在 a 和 b 之间取一个点：t = 0 得到 a，t = 1 得到 b */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** x 从 a 走到 b 时，结果从 0 平滑地变到 1（两头慢，中间快） */
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 让 a 慢慢靠近 b。lambda 越大靠得越快；dt 是这一帧过了多少秒 */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

/** 缓入缓出：t 从 0 到 1，开头和结尾慢 */
export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** 两个角度相差多少（结果在 -π 到 π 之间），转身时用它找最近的方向 */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 把两个整数“搅”成一个 0 到 1 之间的数。同样的输入永远得到同样的结果 */
export function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 平滑的噪声：相邻的位置得到相近的数，用来做起伏的地形 */
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** 把四层粗细不同的噪声叠在一起，看起来更自然。结果在 0 到 1 之间 */
export function fbm(x: number, y: number): number {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s / 0.9375;
}

/**
 * 带“种子”的随机数：同一个种子每次都给出同一串数。
 * 这样草和树每次打开游戏都长在同一个地方。
 */
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
