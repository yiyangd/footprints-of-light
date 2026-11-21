// 地形高度函数的测试：确认地图上几个关键的地方是该有的样子。运行：npm test
import { afterEach, describe, expect, it } from 'vitest';
import { W } from '../core/state';
import { baseHeight, EDEN, landOffset, riverPoint, RIVERS, terrainY } from './heightmap';

afterEach(() => { W.land = 0; });

describe('baseHeight（陆地升起之后的高度）', () => {
  it('同一个位置永远得到同一个高度', () => {
    expect(baseHeight(12.3, -4.5)).toBe(baseHeight(12.3, -4.5));
  });

  it('主岛中间是陆地', () => {
    expect(baseHeight(0, 6)).toBeGreaterThan(0);
  });

  it('起点在海里（所以一开始要靠垫脚石走）', () => {
    expect(baseHeight(0, 49)).toBeLessThan(0);
  });

  it('很远的地方是深海，但不会深过 7.5 米', () => {
    expect(baseHeight(300, 300)).toBe(-7.5);
  });

  it('伊甸的园子是高出水面的平地', () => {
    // 泉源正东 10 米：在两道河中间
    expect(baseHeight(EDEN.x + 10, EDEN.z)).toBeGreaterThan(0.5);
  });

  it('伊甸中央的泉源是一汪水', () => {
    expect(baseHeight(EDEN.x, EDEN.z)).toBeLessThan(0);
  });

  it('四道河的河床都在水面以下', () => {
    expect(RIVERS).toHaveLength(4);
    for (const river of RIVERS) {
      const [x, z] = riverPoint(river, 8);
      expect(baseHeight(x, z)).toBeLessThan(-0.3);
    }
  });
});

describe('landOffset / terrainY（第三日：旱地露出来）', () => {
  it('一开始整块陆地沉在水下 11 米', () => {
    W.land = 0;
    expect(landOffset()).toBe(-11);
    expect(terrainY(0, 6)).toBe(baseHeight(0, 6) - 11);
  });

  it('升到一半时沉着一半', () => {
    W.land = 0.5;
    expect(landOffset()).toBeCloseTo(-5.5);
  });

  it('完全升起之后就是 baseHeight', () => {
    W.land = 1;
    expect(landOffset()).toBeCloseTo(0);
    expect(terrainY(0, 6)).toBeCloseTo(baseHeight(0, 6));
  });
});
