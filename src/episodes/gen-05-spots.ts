// 第 5 章《与神同行》（亚当的家谱）里几个固定的位置 [x, z]（x 向东，z 向南）。
// 十代人的家沿着一条路排开：从亚当的小屋往北，过一道窄窄的沙洲，上到北边沿比逊河的那块地（heightmap.ts 的 NORTH_LAND）。
// 单独放一个文件，是为了能写测试：确认每个位置都在陆地上（见 gen-05-spots.test.ts）。
import { ENOCH_HILL } from '../world/heightmap';
import type { Spot } from './gen-03-spots';
import { HOME } from './gen-04-spots';

/** 一代人：家在哪里、他站在哪里（家门口） */
export interface Generation { id: string; house: Spot | null; stand: Spot }

/** 十代人，按家谱的顺序。亚当的家就是第 4 章那间小屋（house 写 null，不另外盖） */
export const GENERATIONS: Generation[] = [
  { id: 'adam', house: null, stand: [95.2, -20.4] },
  { id: 'seth', house: [95.6, -27.6], stand: [96.9, -27.4] },
  { id: 'enosh', house: [102.4, -34.2], stand: [101.2, -34] },
  { id: 'kenan', house: [97.6, -38.4], stand: [98.8, -38.2] },
  { id: 'mahalalel', house: [105, -41.6], stand: [103.8, -41.6] },
  { id: 'jared', house: [99.6, -46.4], stand: [100.8, -46.2] },
  { id: 'enoch', house: [105.2, -46.4], stand: [104.6, -48.4] },
  { id: 'methuselah', house: [104.8, -53.6], stand: [106.2, -53.2] },
  { id: 'lamech', house: [112, -54.2], stand: [111.2, -55.7] },
  { id: 'noah', house: [110.3, -60.7], stand: [111.7, -59.6] },
];

/** 以诺和神同行，走上小山的顶（创 5:24） */
export const HILLTOP: Spot = [ENOCH_HILL.x - 0.4, ENOCH_HILL.z - 0.2];

/** 挪亚的三个儿子：闪、含、雅弗（创 5:32），站在挪亚身边 */
export const NOAH_SONS: Spot[] = [[110.9, -58.7], [111.8, -58.4], [110.2, -58.9]];

/** 夏娃进屋的地方（亚当的小屋里） */
export const EVE_INSIDE: Spot = [HOME.hut[0], HOME.hut[1]];

/** 不种树的地方（每一家的房子和门口）：圆心和半径。plants.ts 种伊甸东边的树时用 */
export const CLEAR_SPOTS_5: Array<{ at: Spot; r: number }> = [
  ...GENERATIONS.flatMap((g) => (g.house ? [{ at: g.house, r: 3 }] : [])),
  { at: HILLTOP, r: 3.5 },
];
