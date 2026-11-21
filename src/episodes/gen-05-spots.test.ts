// 第 5 章位置的测试：每个位置都要在陆地上。运行：npm test
import { describe, expect, it } from 'vitest';
import data from '../../content/episodes/gen-05-generations.json';
import { baseHeight, ENOCH_HILL } from '../world/heightmap';
import type { Spot } from './gen-03-spots';
import { GENERATIONS, HILLTOP, NOAH_SONS } from './gen-05-spots';

/** 这里是不是干的陆地（高出水面 0.45 米以上） */
const dry = ([x, z]: Spot): boolean => baseHeight(x, z) > 0.45;
/** 一座房子四个角都在陆地上 */
const dryHouse = ([x, z]: Spot): boolean => [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].every(([dx, dz]) => dry([x + dx, z + dz]));

describe('第 5 章的位置', () => {
  it('十代人的家、站的地方，挪亚的儿子都在陆地上', () => {
    for (const g of GENERATIONS) {
      expect(dry(g.stand), `${g.id} 站的地方`).toBe(true);
      if (g.house) expect(dryHouse(g.house), `${g.id} 的家`).toBe(true);
    }
    for (const s of NOAH_SONS) expect(dry(s), s.join(', ')).toBe(true);
  });

  it('以诺走上去的山顶比路高出 2 米以上', () => {
    expect(baseHeight(...HILLTOP) - baseHeight(...GENERATIONS[6].stand)).toBeGreaterThan(2);
    expect(Math.hypot(HILLTOP[0] - ENOCH_HILL.x, HILLTOP[1] - ENOCH_HILL.z)).toBeLessThan(1);
  });

  it('剧情节点和陶片都在陆地上；相邻两个节点至少隔 2.5 米', () => {
    const beats = data.beats as unknown as Array<{ id: string; at: Spot }>;
    for (const b of beats) expect(dry(b.at), b.id).toBe(true);
    for (const c of data.cards as unknown as Array<{ id: string; at: Spot }>) {
      expect(dry(c.at), c.id).toBe(true);
      // 陶片不要放在剧情节点上：走过去会同时捡到陶片、开始剧情
      for (const b of beats) expect(Math.hypot(c.at[0] - b.at[0], c.at[1] - b.at[1]), `${c.id} 离 ${b.id}`).toBeGreaterThan(2.5);
    }
    for (let i = 1; i < beats.length; i++) {
      const [a, b] = [beats[i - 1].at, beats[i].at];
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${beats[i - 1].id} → ${beats[i].id}`).toBeGreaterThan(2.5);
    }
  });
});
