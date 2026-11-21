// 第 3 章位置的测试：每个位置都要在陆地上。运行：npm test
import { describe, expect, it } from 'vitest';
import { baseHeight } from '../world/heightmap';
import { EAST_GATE, PRESENCE, STAND, THORN_PATCHES, THREAD_FROM, type Spot } from './gen-03-spots';

/** 这里是不是干的陆地（高出水面 0.4 米以上；河床和海都低于 0） */
const dry = ([x, z]: Spot): boolean => baseHeight(x, z) > 0.4;

describe('第 3 章的位置', () => {
  it('亚当、夏娃站的每个地方都在陆地上，两个人不会站在同一点', () => {
    for (const [name, { adam, eve }] of Object.entries(STAND)) {
      expect(dry(adam), `${name} 亚当`).toBe(true);
      expect(dry(eve), `${name} 夏娃`).toBe(true);
      expect(Math.hypot(adam[0] - eve[0], adam[1] - eve[1]), name).toBeGreaterThan(1);
    }
  });

  it('从穿上皮衣的地方走到园子外面，一路都是陆地（他们是走出去的）', () => {
    for (const who of ['adam', 'eve'] as const) {
      const [x0, z0] = STAND.clothed[who], [x1, z1] = STAND.outside[who];
      for (let k = 0; k <= 1; k += 0.05) expect(dry([x0 + (x1 - x0) * k, z0 + (z1 - z0) * k]), `${who} 走到 ${Math.round(k * 100)}%`).toBe(true);
    }
  });

  it('光、金线、荆棘、基路伯和剑的位置也都在陆地上', () => {
    for (const spot of [...Object.values(PRESENCE), THREAD_FROM, ...THORN_PATCHES.map((p) => p.at), ...EAST_GATE.cherubim, EAST_GATE.sword]) {
      expect(dry(spot), spot.join(', ')).toBe(true);
    }
  });

  it('基路伯守在园子和外面之间：在走出去的人的西边', () => {
    for (const [x] of EAST_GATE.cherubim) {
      expect(x).toBeGreaterThan(STAND.clothed.eve[0]);
      expect(x).toBeLessThan(STAND.outside.adam[0]);
    }
  });
});
