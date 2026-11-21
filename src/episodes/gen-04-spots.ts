// 第 4 章《兄弟》里几个固定的位置 [x, z]（x 向东，z 向南）。都在伊甸东边那块地上（heightmap.ts 的 EAST_LAND）。
// 单独放一个文件，是为了能写测试：确认每个位置都在陆地上（见 gen-04-spots.test.ts）。
import type { Spot } from './gen-03-spots';

/** 亚当、夏娃的家：一间小屋，他们站在门前 */
export const HOME = {
  hut: [95, -17.6] as Spot, adam: [94, -15] as Spot, eve: [96, -14.8] as Spot,
  /** 孩子长大以后，亚当、夏娃在屋后干活（不挡住镜头） */
  adamBack: [93.4, -19.8] as Spot, eveBack: [94.7, -20.2] as Spot,
};

/** 亚伯的羊群在哪里吃草：中心和半径 */
export const PASTURE = { at: [100.5, -25] as Spot, r: 2.8 };

/** 该隐的田：中心和半径；该隐的小屋，门朝东 */
export const FIELD = { at: [96.5, -2.5] as Spot, r: 2.6 };
export const CAIN_HUT: Spot = [92.8, -7.5];
/** 罪伏在门前：门口那团影子的位置 */
export const DOOR: Spot = [94.3, -7.3];

/** 两座坛：亚伯的在北，该隐的在南 */
export const ALTARS = { abel: [100.5, -18.5] as Spot, cain: [101.8, -13.5] as Spot };

/** 田间（创 4:8）：两兄弟走去的地方，在东边，离玩家远一点 */
export const OPEN_FIELD: Spot = [105.5, -4.5];

/** 挪得之地（在南边）：该隐建的城（以诺城）的中心，和一圈房子的半径 */
export const CITY = { at: [101.5, 10.2] as Spot, r: 2.3 };

/** 拉麦一家，住在城的周围：帐棚和牲畜（雅八）、弹琴吹箫的（犹八）、打铜铁的（土八该隐） */
export const LAMECH = {
  lamech: [104.9, 9.4] as Spot,
  tents: [104.6, 12.8] as Spot,
  herd: { at: [101.6, 13.4] as Spot, r: 1.1 },
  lyre: [106.9, 8.4] as Spot,
  forge: [105.8, 6.4] as Spot,
};

/** 每个人站在哪里 */
export const STAND = {
  // 两兄弟小时候在家门口；长大以后亚伯在羊群旁，该隐在田边
  cainYoung: [95.3, -14] as Spot, abelYoung: [96.6, -13.7] as Spot,
  abelPasture: [99, -23.4] as Spot, cainField: [94.6, -3.4] as Spot,
  // 献祭：各自站在自己的坛前（坛的西边）
  abelAltar: [99.2, -18.5] as Spot, cainAltar: [100.5, -13.5] as Spot,
  // 罪伏在门前：该隐站在自己门口
  cainDoor: [95.1, -8.2] as Spot,
  // 田间：两兄弟一起走去的地方
  abelField: [106.2, -3.8] as Spot, cainField2: [105, -5.2] as Spot,
  // 该隐被问话时站的地方，和他往挪得去的地方
  cainAfter: [104.6, -1.6] as Spot, cainNod: [101.3, 6.6] as Spot,
  // 该隐的妻子和儿子以诺
  cainWife: [100.2, 6.9] as Spot, enoch: [100.8, 7.6] as Spot,
  // 拉麦的两个妻子
  adah: [105.5, 10.5] as Spot, zillah: [104.1, 10.6] as Spot,
  // 拉麦的孩子：雅八在帐棚旁，犹八拿着琴，土八该隐在炉边，拿玛在他旁边
  jabal: [103.4, 13.1] as Spot, jubal: [106.3, 7.7] as Spot, tubal: [105.1, 5.6] as Spot, naamah: [104.2, 6.1] as Spot,
  // 塞特（和后来的以挪士）在亚当、夏娃身边
  seth: [95, -14] as Spot, enosh: [95.8, -13.6] as Spot,
};

/** 塞特那一代人求告耶和华的名：围着亚伯的坛站一圈 */
export const WORSHIP = { at: ALTARS.abel, r: 2.2, count: 7 };

/** 不种树的地方（房子、田、坛、城、羊群……）：圆心和半径。plants.ts 种伊甸东边的树时用 */
export const CLEAR_SPOTS: Array<{ at: Spot; r: number }> = [
  { at: HOME.hut, r: 4 }, { at: CAIN_HUT, r: 3.5 }, { at: FIELD.at, r: FIELD.r + 2 }, { at: PASTURE.at, r: PASTURE.r + 2 },
  { at: ALTARS.abel, r: 4.5 }, { at: ALTARS.cain, r: 3.5 }, { at: OPEN_FIELD, r: 4 }, { at: CITY.at, r: CITY.r + 3 },
  { at: LAMECH.tents, r: 3 }, { at: LAMECH.forge, r: 2.5 }, { at: LAMECH.herd.at, r: 2.5 }, { at: LAMECH.lyre, r: 2 },
];
