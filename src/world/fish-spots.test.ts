// 鱼的水域的测试：确认鱼只会在水里跳。运行：npm test
// 以后改了地形（heightmap.ts）或者挪了水域（fish-spots.ts），这里会提醒有没有哪条鱼跑到岸上去了。
import { describe, expect, it } from 'vitest';
import { rng } from '../core/math';
import { isWater, pickJump, SPOTS } from './fish-spots';
import { baseHeight } from './heightmap';

describe('鱼的水域（SPOTS）', () => {
  it('一共七条鱼：三条在小湖里，四条在海里', () => {
    expect(SPOTS).toHaveLength(7);
  });

  it('每片水域的中心都在水里', () => {
    for (const [cx, cz] of SPOTS) expect(isWater(cx, cz), `(${cx}, ${cz})`).toBe(true);
  });

  it('每片水域大半个圆是水（每隔半米量一次，至少六成）', () => {
    for (const [cx, cz, rr] of SPOTS) {
      let all = 0, wet = 0;
      for (let x = cx - rr; x <= cx + rr; x += 0.5) {
        for (let z = cz - rr; z <= cz + rr; z += 0.5) {
          if (Math.hypot(x - cx, z - cz) > rr) continue;
          all++;
          if (isWater(x, z)) wet++;
        }
      }
      expect(wet / all, `(${cx}, ${cz})`).toBeGreaterThan(0.6);
    }
  });
});

describe('pickJump（挑一次跳跃）', () => {
  it('同样的随机数挑出同样的跳跃', () => {
    expect(pickJump(-16, -5, 3, rng(1))).toEqual(pickJump(-16, -5, 3, rng(1)));
  });

  it('每片水域挑 5000 次：起跳点都在圆里，起跳和落水的地方水够深，一路上（每 0.2 米量一次）都没有露出水面的地', () => {
    for (const [cx, cz, rr] of SPOTS) {
      const rand = rng(1), bad: string[] = [];
      for (let i = 0; i < 5000; i++) {
        const j = pickJump(cx, cz, rr, rand);
        let ok = Math.hypot(j.ax - cx, j.az - cz) <= rr && isWater(j.ax, j.az) && isWater(j.bx, j.bz);
        for (let k = 0; k <= 8; k++) {
          const x = j.ax + (j.bx - j.ax) * k / 8, z = j.az + (j.bz - j.az) * k / 8;
          if (baseHeight(x, z) >= 0) ok = false;
        }
        if (!ok) bad.push(`(${j.ax.toFixed(1)}, ${j.az.toFixed(1)}) → (${j.bx.toFixed(1)}, ${j.bz.toFixed(1)})`);
      }
      expect(bad, `水域 (${cx}, ${cz})`).toEqual([]);
    }
  });

  it('大多数时候是真的跳出去 1.6 米，而不是退回到水域中间原地跳', () => {
    for (const [cx, cz, rr] of SPOTS) {
      const rand = rng(2);
      let inPlace = 0;
      for (let i = 0; i < 5000; i++) {
        const j = pickJump(cx, cz, rr, rand);
        if (j.ax === j.bx && j.az === j.bz) inPlace++;
      }
      expect(inPlace, `水域 (${cx}, ${cz})`).toBe(0);
    }
  });

  it('整片都在陆地上的“水域”挑不出地方，只能退回到中间（所以水域一定要选在水里）', () => {
    expect(pickJump(0, 6, 3, rng(1))).toEqual({ ax: 0, az: 6, bx: 0, bz: 6 });
  });
});
