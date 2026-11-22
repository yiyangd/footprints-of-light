// 第 6 章位置和尺寸的测试：方舟和真的一样大，每个位置都在陆地（或海）上该在的地方，洪水能把方舟带到亚拉腊山顶。运行：npm test
import { describe, expect, it } from 'vitest';
import data from '../../content/episodes/gen-06-ark.json';
import { ARARAT, baseHeight, FLOOD_MAP, LOW_PEAKS, T_CX, T_CZ, T_D, T_W } from '../world/heightmap';
import type { Spot } from './gen-03-spots';
import {
  ALTAR, ARK, ARK_BUILD, ARK_DRAFT, ARK_REST, ARRIVAL, CUBIT, doorTip, FAMILY, FAMILY_YARD, FLOOD_PEAK, FOOD, FOUNTAINS, GATHER,
  NOAH_HOUSE, northWall, RAMP_UP, SHADOWS, SPREAD,
} from './gen-06-spots';

const dry = ([x, z]: Spot): boolean => baseHeight(x, z) > 0.45;
/** 方舟占的那一块（中心、长边沿 x）：沿着长边 25 处、横着 5 处 */
const footprint = ([cx, cz]: Spot): Spot[] => Array.from({ length: 25 }, (_, i) => (i - 12) / 12).flatMap((a) =>
  [-1, -0.5, 0, 0.5, 1].map((b) => [cx + a * ARK.length / 2, cz + b * ARK.width / 2] as Spot));
/** 方舟在 c 的时候，船底下的地最高、最低有多高 */
const groundRange = (c: Spot): [number, number] => {
  const hs = footprint(c).map(([x, z]) => baseHeight(x, z));
  return [Math.min(...hs), Math.max(...hs)];
};
/** 在不在方舟顶上（方舟中心在 c 的时候） */
const onRoof = ([x, z]: Spot, c: Spot): boolean => Math.abs(x - c[0]) < ARK.length / 2 && Math.abs(z - c[1]) < ARK.width / 2;
/** 在不在第 6 章那块地图里面 */
const inFloodMap = ([x, z]: Spot): boolean => Math.abs(x - FLOOD_MAP.cx) < FLOOD_MAP.w / 2 && Math.abs(z - FLOOD_MAP.cz) < FLOOD_MAP.d / 2;

describe('方舟的大小', () => {
  it('长 300 肘、宽 50 肘、高 30 肘（创 6:15），一肘大约 45.7 厘米：大约 137 × 23 × 14 米', () => {
    expect(CUBIT).toBeCloseTo(0.4572, 4);
    expect(ARK.length).toBeCloseTo(137.16, 1);
    expect(ARK.width).toBeCloseTo(22.86, 1);
    expect(ARK.height).toBeCloseTo(13.716, 1);
    expect(ARK.length / ARK.width).toBeCloseTo(6, 5);
  });
});

describe('第 6 章的地图', () => {
  it('在原来那张图的南边，两块不重叠；原来那张图的南边上都是海', () => {
    expect(FLOOD_MAP.cz - FLOOD_MAP.d / 2).toBeGreaterThanOrEqual(T_CZ + T_D / 2);
    for (let x = T_CX - T_W / 2; x <= T_CX + T_W / 2; x += 2) expect(baseHeight(x, T_CZ + T_D / 2), `x = ${x}`).toBeLessThan(-0.5);
  });

  it('洪水最高的时候比亚拉腊山顶高 15 肘（创 7:20），也比两张地图上所有的地方都高', () => {
    expect(FLOOD_PEAK - ARARAT.y).toBeCloseTo(15 * CUBIT, 5);
    let highest = -Infinity;
    for (const m of [{ cx: T_CX, cz: T_CZ, w: T_W, d: T_D }, FLOOD_MAP]) {
      for (let x = m.cx - m.w / 2; x <= m.cx + m.w / 2; x += 1.5) for (let z = m.cz - m.d / 2; z <= m.cz + m.d / 2; z += 1.5) highest = Math.max(highest, baseHeight(x, z));
    }
    expect(highest).toBeLessThan(FLOOD_PEAK - 3);
    for (const p of LOW_PEAKS) expect(p.y).toBeLessThan(ARARAT.y); // 方舟停住以后，旁边的山顶才露出来（创 8:4–5）
  });
});

describe('第 6 章的位置', () => {
  it('人站的地方、挪亚的家、坛、粮食、走兽聚集和散开的地方都在陆地上', () => {
    const spots = [ARRIVAL, NOAH_HOUSE, ALTAR, GATHER, ...FAMILY, ...FAMILY_YARD, ...SPREAD, ...SHADOWS, [FOOD.x0, FOOD.z], [FOOD.x1, FOOD.z]] as Spot[];
    for (const s of spots) {
      expect(dry(s), s.join(', ')).toBe(true);
      expect(inFloodMap(s), s.join(', ')).toBe(true);
    }
  });

  it('方舟造在一块平地上，整个都在陆地上', () => {
    const [lo, hi] = groundRange(ARK_BUILD);
    expect(lo).toBeGreaterThan(0.45);
    expect(hi - lo).toBeLessThan(0.05);
  });

  it('方舟停在亚拉腊山的平顶上：整个船底下都是平的山顶', () => {
    expect(ARK_REST).toEqual([ARARAT.x, ARARAT.z]);
    const [lo, hi] = groundRange(ARK_REST);
    expect(lo).toBeGreaterThan(ARARAT.y - 0.3);
    expect(hi).toBeLessThan(ARARAT.y + 0.3);
  });

  it('水最高的时候，方舟从造的地方一路浮着漂到亚拉腊山顶，不会碰到地', () => {
    for (let k = 0; k <= 1.0001; k += 0.01) {
      const c: Spot = [ARK_BUILD[0] + (ARK_REST[0] - ARK_BUILD[0]) * k, ARK_BUILD[1] + (ARK_REST[1] - ARK_BUILD[1]) * k];
      expect(groundRange(c)[1], `漂到 ${k.toFixed(2)}`).toBeLessThan(FLOOD_PEAK - ARK_DRAFT - 0.5);
    }
  });

  it('门放下来以后，另一头搭在地上（造方舟的地方和山顶都是）', () => {
    for (const c of [ARK_BUILD, ARK_REST]) {
      const tip = doorTip(c);
      expect(Math.abs(baseHeight(...tip) - groundRange(c)[1]), tip.join(', ')).toBeLessThan(0.3);
    }
  });

  it('上顶的长坡贴着方舟北边的墙，下端在地上，上端在方舟旁边', () => {
    expect(dry(RAMP_UP.base)).toBe(true);
    expect(RAMP_UP.base[1] + RAMP_UP.width / 2).toBeCloseTo(northWall(ARK_BUILD), 5);
    for (const end of [RAMP_UP.base, RAMP_UP.top]) expect(Math.abs(end[0] - ARK_BUILD[0])).toBeLessThan(ARK.length / 2);
    // 坡不要太陡：每走 1 米最多升高 0.4 米
    expect(ARK.height / Math.abs(RAMP_UP.base[0] - RAMP_UP.top[0])).toBeLessThan(0.4);
  });

  it('泉源都在海里', () => {
    for (const s of FOUNTAINS) {
      expect(baseHeight(...s), s.join(', ')).toBeLessThan(-0.5);
      expect(inFloodMap(s), s.join(', ')).toBe(true);
    }
  });

  it('剧情节点和陶片：在方舟顶上的那几个真的在顶上，其余的都在陆地上；陶片离剧情节点至少 2.5 米', () => {
    const beats = (data.beats as unknown as Array<{ id: string; at: Spot; r: number }>).slice(1); // 第一段在第 5 章的路的尽头，从那里来到这里
    const at = (id: string): { at: Spot; r: number } => beats.find((b) => b.id === id)!;
    // 洪水以前、洪水的时候在方舟顶上
    for (const id of ['n7', 'n8']) expect(onRoof(at(id).at, ARK_BUILD), id).toBe(true);
    for (const id of ['n9', 'n10']) expect(onRoof(at(id).at, ARK_REST), id).toBe(true);
    // n10 靠近顶的北边：先跳下了方舟的人，贴着北边的墙站也能走到它
    expect(at('n10').at[1] - northWall(ARK_REST)).toBeLessThan(at('n10').r - 0.8);
    for (const b of beats.filter((x) => !['n7', 'n8', 'n9', 'n10'].includes(x.id))) {
      expect(dry(b.at), b.id).toBe(true);
      expect(onRoof(b.at, ARK_BUILD) || onRoof(b.at, ARK_REST), b.id).toBe(false);
    }
    for (const c of data.cards as unknown as Array<{ id: string; at: Spot }>) {
      if (c.id === 'remembered') expect(onRoof(c.at, ARK_REST), c.id).toBe(true); // 方舟停在山上以后，在方舟顶上捡
      else expect(dry(c.at) && !onRoof(c.at, ARK_BUILD) && !onRoof(c.at, ARK_REST), c.id).toBe(true);
      for (const b of beats) expect(Math.hypot(c.at[0] - b.at[0], c.at[1] - b.at[1]), `${c.id} 离 ${b.id}`).toBeGreaterThan(2.5);
    }
  });
});
