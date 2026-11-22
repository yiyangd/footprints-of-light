// 第 6 章《方舟》的尺寸和几个固定的位置 [x, z]（x 向东，z 向南，单位是米）。
// 地点在原来那张图南边的一块新地上（heightmap.ts 的 FLOOD_MAP）：北边是挪亚的地（NOAH_LAND），南边是亚拉腊山（ARARAT）。
// 单独放一个文件，是为了能写测试（见 gen-06-spots.test.ts）。
import { ARARAT, ARK_YARD } from '../world/heightmap';
import type { Spot } from './gen-03-spots';

/** 一肘有多少米：从手肘到中指尖，大约 45.7 厘米（常用的算法，18 英寸） */
export const CUBIT = 0.4572;

/**
 * 方舟的大小（米），照创 6:15：长 300 肘、宽 50 肘、高 30 肘，也就是大约 137 × 23 × 14 米。
 * 游戏里 1 个单位就是 1 米，人也是真人的大小（大人大约 1.8 米高），所以方舟和人的比例和真的一样
 */
export const ARK = { length: 300 * CUBIT, width: 50 * CUBIT, height: 30 * CUBIT };

/** 透光处（创 6:16“方舟上边要留透光处，高一肘”）：顶下面一圈，高一肘 */
export const ARK_WINDOW = CUBIT;

/** 方舟浮着的时候吃水多深（船底比水面低多少米） */
export const ARK_DRAFT = 4.5;

/**
 * 方舟的门（创 6:16“方舟的门要开在旁边”）：开在北边的正中、最下面一层。宽、高（米），门槛比船底高多少。
 * 门的下边是转轴：打开时往外放下来，门的另一头正好搭在地上，就成了一块跳板，人和走兽从上面走进去
 */
export const ARK_DOOR = { width: 4.4, height: 3.8, sill: 0.6 };

/** 洪水最高的时候水面有多高：比亚拉腊山顶还高 15 肘（创 7:20“水势比山高过十五肘，山岭都淹没了”） */
export const FLOOD_PEAK = ARARAT.y + 15 * CUBIT;

/** 方舟造在哪里（中心，在压平的场地上），最后停在哪里（亚拉腊山顶的中心）。方舟的长边朝东西方向 */
export const ARK_BUILD: Spot = [ARK_YARD.x, ARK_YARD.z];
export const ARK_REST: Spot = [ARARAT.x, ARARAT.z];

/** 方舟北边的墙在哪里（z），中心在 c 的时候 */
export const northWall = (c: Spot): number => c[1] - ARK.width / 2;

/** 门放下来以后，门的那一头离墙有多远（米） */
export const DOOR_REACH = ARK_DOOR.height * Math.cos(Math.asin(ARK_DOOR.sill / ARK_DOOR.height));

/** 门放下来以后，门那一头（地上）的位置；中心在 c 的时候 */
export const doorTip = (c: Spot): Spot => [c[0], northWall(c) - DOOR_REACH];

/**
 * 上方舟顶的长坡（造方舟时搭的）：贴着方舟北边的墙，从东边的地上（base）一直斜着通到顶上（top）。
 * width 是坡有多宽。玩家沿着它走上方舟的顶
 */
export const RAMP_UP = {
  base: [192, northWall(ARK_BUILD) - 1.3] as Spot,
  top: [150, northWall(ARK_BUILD) - 1.3] as Spot,
  width: 2.6,
};

/** 玩家“很多年以后”来到的地方（挪亚的地的西北边） */
export const ARRIVAL: Spot = [70, 122];

/** 挪亚的家，和一家人站的地方 */
export const NOAH_HOUSE: Spot = [80, 114];
export const FAMILY: Spot[] = [
  [84.5, 118.5], [86, 119.5], // 挪亚、他的妻子
  [83, 121], [84.6, 121.6], [86.2, 121.8], // 闪、含、雅弗
  [81.6, 119.6], [87.8, 120.6], [88, 118.6], // 三个儿媳
];
/** 方舟造好以后，一家人在门西边的场地上等着进方舟（和 FAMILY 一一对应） */
export const FAMILY_YARD: Spot[] = FAMILY.map((_, i) => [118 + (i % 4) * 2.2, 128.5 + Math.floor(i / 4) * 2] as Spot);

/** 一对一对的走兽在哪里聚集（门的东北边），出方舟以后往哪里散开（亚拉腊山的平顶上） */
export const GATHER: Spot = [156, 124];
export const SPREAD: Spot[] = [[100, 262], [118, 258], [170, 259], [190, 264], [80, 268], [205, 270]];

/** 堆粮食的地方（创 6:21）：方舟北边、门的西边，从 x0 到 x1 */
export const FOOD = { x0: 102, x1: 128, z: northWall(ARK_BUILD) - 4 };

/** 洪水以前，地上的罪恶和强暴（创 6:5、6:11）：几团暗影 */
export const SHADOWS: Spot[] = [[100, 108], [168, 112], [212, 140], [58, 160], [120, 182], [190, 180]];

/** 大渊的泉源（创 7:11）：海里几处往上喷的水 */
export const FOUNTAINS: Spot[] = [[40, 200], [236, 200], [52, 100], [222, 100], [135, 214], [240, 330]];

/** 挪亚在山顶上筑的坛（创 8:20）：亚拉腊山的平顶上，方舟的北边 */
export const ALTAR: Spot = [152, 262];

/** 不种树的地方：圆心和半径。plants.ts 种挪亚的地和亚拉腊山上的树时用 */
export const CLEAR_SPOTS_6: Array<{ at: Spot; r: number }> = [
  // 造方舟的场地、上顶的长坡，和方舟停的山顶：方舟长 137 米，用一串圆盖住
  ...[-70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70].flatMap((dx) => [
    { at: [ARK_BUILD[0] + dx, ARK_BUILD[1]] as Spot, r: 18 },
    { at: [ARK_REST[0] + dx, ARK_REST[1] - 4] as Spot, r: 20 },
  ]),
  { at: NOAH_HOUSE, r: 6 }, { at: ALTAR, r: 6 }, { at: GATHER, r: 6 }, { at: ARRIVAL, r: 5 },
];
