// 第 6 章《方舟》里几个固定的位置 [x, z]（x 向东，z 向南）。都在东南边挪亚的地上（heightmap.ts 的 NOAH_LAND），
// 南边是亚拉腊山（ARARAT）。单独放一个文件，是为了能写测试（见 gen-06-spots.test.ts）。
import { ARARAT } from '../world/heightmap';
import type { Spot } from './gen-03-spots';

/** 方舟的大小（米）：照创 6:15 长、宽、高 30 : 5 : 3 的比例，比真的小得多 */
export const ARK = { length: 24, width: 4, height: 2.4 };

/** 方舟造在哪里（中心），最后停在哪里（亚拉腊山顶的中心）。方舟的长边朝东西方向，门开在北边 */
export const ARK_BUILD: Spot = [83.5, 40];
export const ARK_REST: Spot = [ARARAT.x, ARARAT.z];

/** 玩家“很多年以后”来到的地方 */
export const ARRIVAL: Spot = [69, 44];

/** 挪亚的家，和一家人站的地方 */
export const NOAH_HOUSE: Spot = [71.2, 47.4];
export const FAMILY: Spot[] = [
  [72.6, 45.6], [73.5, 46.2], // 挪亚、他的妻子
  [71.6, 44.4], [72.6, 44.2], [73.6, 44.6], // 闪、含、雅弗
  [70.8, 45.2], [74.4, 45.4], [74.6, 46.6], // 三个儿媳
];

/** 进方舟的跳板：从北边的沙滩到门口（门在方舟北边的正中） */
export const RAMP_IN = { base: [83.5, 32.8] as Spot, top: [83.5, 38] as Spot };
/** 出方舟的跳板：方舟停在山顶以后，从门口往北下到山顶上 */
export const RAMP_OUT = { base: [ARK_REST[0], ARK_REST[1] - 7.4] as Spot, top: [ARK_REST[0], ARK_REST[1] - 2] as Spot };

/** 一对一对的走兽在哪里聚集（东边的沙滩上），出方舟以后往哪里散开 */
export const GATHER: Spot = [89.5, 33.6];
export const SPREAD: Spot[] = [[80, 50.5], [84, 50], [92, 51], [95, 55], [79, 57], [96, 61]];

/** 洪水以前，地上的罪恶和强暴（创 6:5、6:11）：几团暗影 */
export const SHADOWS: Spot[] = [[75, 36.5], [92, 43.5], [66.5, 47.5], [95, 37], [79, 46.5]];

/** 大渊的泉源（创 7:11）：海里几处往上喷的水 */
export const FOUNTAINS: Spot[] = [[60, 40], [101, 31], [107, 58], [70, 76], [58, 62]];

/** 挪亚在山顶上筑的坛（创 8:20） */
export const ALTAR: Spot = [80.2, 52.6];

/** 不种树的地方：圆心和半径。plants.ts 种挪亚的地上的树时用 */
export const CLEAR_SPOTS_6: Array<{ at: Spot; r: number }> = [
  // 造方舟的地方和停方舟的山顶（方舟长 24 米，用三个圆盖住）
  ...[-8, 0, 8].flatMap((dx) => [{ at: [ARK_BUILD[0] + dx, ARK_BUILD[1]] as Spot, r: 6 }, { at: [ARK_REST[0] + dx, ARK_REST[1]] as Spot, r: 6 }]),
  { at: RAMP_IN.base, r: 3 }, { at: RAMP_OUT.base, r: 3 }, { at: NOAH_HOUSE, r: 4 }, { at: ALTAR, r: 4 }, { at: GATHER, r: 3 }, { at: ARRIVAL, r: 3 },
];
