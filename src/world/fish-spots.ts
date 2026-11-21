// 鱼在哪里跳：每条鱼出没的水域，以及怎样挑一次跳跃的起跳点和落水点。
// 这里只有数据和计算，不画任何东西，所以可以写测试（见 fish-spots.test.ts）。
import { baseHeight } from './heightmap';

/** 一片水域：[中心 x, 中心 z, 半径]。鱼从这个圆里起跳 */
export type Spot = [number, number, number];

/**
 * 每条鱼各自的水域。前三条在第五日的小湖里，其余四条在主岛西、南、北、东四面的海里。
 * 水域可以压到一点岸边（挑到岸上会重挑），但中心必须在水里，而且大半个圆要是水。
 */
export const SPOTS: Spot[] = [[-16, -5, 3], [-16, -5, 3], [-16, -5, 3], [-45, 12, 6], [12, 58, 6], [-6, -48, 5], [38, 24, 6]];

/** 一次跳跃：从 (ax, az) 起跳，落在 (bx, bz) */
export interface Jump { ax: number; az: number; bx: number; bz: number }

/** 一次跳跃从起跳到落水，在水面上跨多远（米） */
const JUMP_LENGTH = 1.6;

/** 挑到岸上的话，最多重挑多少次 */
const MAX_TRIES = 30;

/**
 * (x, z) 这里是不是够深的水。水面在 y = 0，水底要比水面低 0.3 米以上才算：
 * 再浅的地方已经是沙滩边，鱼从那里跳出来就像是从沙子里钻出来的。
 */
export const isWater = (x: number, z: number): boolean => baseHeight(x, z) < -0.3;

/**
 * 在一片水域里挑一次跳跃：起跳点在圆里，落水点在 1.6 米外。
 * 起跳点、半路、落水点都必须是水，挑到岸上（或者要飞过一截沙滩）就重挑。
 * @param rand 给出 0 到 1 之间随机数的函数，游戏里用 Math.random
 */
export function pickJump(cx: number, cz: number, rr: number, rand: () => number): Jump {
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const a = rand() * 6.28, r = rand() * rr;
    const ax = cx + Math.cos(a) * r, az = cz + Math.sin(a) * r;
    const b = a + (rand() - 0.5) * 2; // 大致朝着离开中心的方向跳
    const bx = ax + Math.cos(b) * JUMP_LENGTH, bz = az + Math.sin(b) * JUMP_LENGTH;
    if (isWater(ax, az) && isWater((ax + bx) / 2, (az + bz) / 2) && isWater(bx, bz)) return { ax, az, bx, bz };
  }
  // 试了这么多次都落在岸上（水域选得对的话几乎不会发生）：就在水域正中间原地跳一下
  return { ax: cx, az: cz, bx: cx, bz: cz };
}
