// 第 6 章位置的测试：每个位置都在陆地（或海）上该在的地方。运行：npm test
import { describe, expect, it } from 'vitest';
import data from '../../content/episodes/gen-06-ark.json';
import { ARARAT, baseHeight } from '../world/heightmap';
import type { Spot } from './gen-03-spots';
import { ALTAR, ARK, ARK_BUILD, ARK_REST, ARRIVAL, FAMILY, FOUNTAINS, GATHER, NOAH_HOUSE, RAMP_IN, RAMP_OUT, SHADOWS, SPREAD } from './gen-06-spots';

const dry = ([x, z]: Spot): boolean => baseHeight(x, z) > 0.45;
/** 方舟占的那一块（中心、长边沿 x） */
const footprint = ([cx, cz]: Spot): Spot[] => [-1, -0.5, 0, 0.5, 1].flatMap((a) => [-1, 1].map((b) => [cx + a * ARK.length / 2, cz + b * ARK.width / 2] as Spot));

describe('第 6 章的位置', () => {
  it('人站的地方、挪亚的家、坛、走兽散开的地方都在陆地上', () => {
    for (const s of [ARRIVAL, NOAH_HOUSE, ALTAR, GATHER, ...FAMILY, ...SPREAD, ...SHADOWS]) expect(dry(s), s.join(', ')).toBe(true);
  });

  it('方舟造在平地上，整个都在陆地上；离亚拉腊山脚有一段距离', () => {
    for (const s of footprint(ARK_BUILD)) expect(dry(s), `造方舟的地方 ${s.join(', ')}`).toBe(true);
    expect(Math.hypot(ARK_BUILD[0] - ARARAT.x, ARK_BUILD[1] - ARARAT.z)).toBeGreaterThan(ARARAT.base);
  });

  it('方舟停在亚拉腊山的平顶上：山顶比造方舟的地方高出 5 米以上', () => {
    expect(Math.hypot(ARK_REST[0] - ARARAT.x, ARK_REST[1] - ARARAT.z)).toBeLessThan(1);
    expect(baseHeight(...ARK_REST) - baseHeight(...ARK_BUILD)).toBeGreaterThan(5);
  });

  it('两块跳板的下端都在地上，出方舟的跳板下端还在山顶上', () => {
    expect(dry(RAMP_IN.base) || baseHeight(...RAMP_IN.base) > -0.25).toBe(true);
    expect(Math.hypot(RAMP_OUT.base[0] - ARARAT.x, RAMP_OUT.base[1] - ARARAT.z)).toBeLessThan(ARARAT.top);
  });

  it('泉源都在海里', () => {
    for (const s of FOUNTAINS) expect(baseHeight(...s), s.join(', ')).toBeLessThan(-0.5);
  });

  it('陆地上的剧情节点和陶片都在陆地上，陶片离剧情节点至少 2.5 米', () => {
    const beats = (data.beats as unknown as Array<{ id: string; at: Spot }>).slice(1); // 第一段在第 5 章的路的尽头，从那里来到这里
    const onLand = beats.filter((b) => !['n7', 'n8', 'n9', 'n10'].includes(b.id)); // 这四段在方舟顶上
    for (const b of onLand) expect(dry(b.at), b.id).toBe(true);
    for (const c of data.cards as unknown as Array<{ id: string; at: Spot }>) {
      expect(dry(c.at), c.id).toBe(true);
      for (const b of beats) expect(Math.hypot(c.at[0] - b.at[0], c.at[1] - b.at[1]), `${c.id} 离 ${b.id}`).toBeGreaterThan(2.5);
    }
  });
});
