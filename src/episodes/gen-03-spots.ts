// 第 3 章《你在哪里？》里几个固定的位置 [x, z]（x 向东，z 向南）。
// 单独放一个文件，是为了能写测试：确认每个位置都在陆地上，没有人站进河里（见 gen-03-spots.test.ts）。

export type Spot = [number, number];

/** 亚当、夏娃在每一段剧情里站的地方 */
export const STAND: Record<'atTree' | 'hiding' | 'judged' | 'clothed' | 'outside', { adam: Spot; eve: Spot }> = {
  /** 节点 1、2：在分别善恶的树旁 */
  atTree: { adam: [70.8, -18.3], eve: [69.7, -17.0] },
  /** 节点 3、4：藏在园里的树木中 */
  hiding: { adam: [61.4, -25.4], eve: [62.6, -26.3] },
  /** 节点 5：听审判和应许 */
  judged: { adam: [73.4, -15.2], eve: [72.4, -16.2] },
  /** 节点 6：穿上皮衣 */
  clothed: { adam: [76.9, -18.5], eve: [77.6, -17.4] },
  /** 节点 7：走出园子，到伊甸的东边 */
  outside: { adam: [87.4, -18.6], eve: [88.2, -17.4] },
};

/** “天起了凉风”时，那道光从哪里穿过树林、走到哪里 */
export const PRESENCE = { from: [72, -25] as Spot, hiding: [65, -24.5] as Spot, judging: [70.6, -13.4] as Spot, clothing: [77.2, -18] as Spot };

/** 金线从哪里升起 */
export const THREAD_FROM: Spot = [72.9, -15.7];

/** 荆棘和蒺藜长在哪一片：圆心和半径 */
export const THORN_PATCHES: Array<{ at: Spot; r: number }> = [
  { at: [74.5, -13], r: 5 },
  { at: [80, -20.5], r: 4 },
  { at: [87, -18], r: 4.5 },
];

/** 伊甸东边：两位基路伯和那把四面转动、发火焰的剑 */
export const EAST_GATE = { cherubim: [[84.6, -21.2], [84.6, -14.8]] as Spot[], sword: [84.6, -18] as Spot };
