// 数学小工具的测试。运行：npm test
import { describe, expect, it } from 'vitest';
import { angleDiff, clamp, damp, easeInOut, fbm, lerp, rng, smooth } from './math';

describe('clamp / lerp / smooth', () => {
  it('clamp 把数限制在范围里', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });

  it('lerp 在两个数之间取点', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('smooth 从 0 平滑地变到 1，超出范围就停在 0 或 1', () => {
    expect(smooth(2, 4, 1)).toBe(0);
    expect(smooth(2, 4, 3)).toBe(0.5);
    expect(smooth(2, 4, 9)).toBe(1);
  });

  it('easeInOut 的两头和中间', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
  });
});

describe('damp', () => {
  it('每一帧都更靠近目标，但不会越过去', () => {
    let v = 0;
    for (let i = 0; i < 100; i++) {
      const next = damp(v, 10, 5, 1 / 60);
      expect(next).toBeGreaterThan(v);
      expect(next).toBeLessThan(10);
      v = next;
    }
    expect(v).toBeGreaterThan(9.9);
  });
});

describe('angleDiff', () => {
  it('永远走最近的那一边', () => {
    expect(angleDiff(0.1, -0.1)).toBeCloseTo(0.2);
    // 从 350° 转到 10°，应该是往前 20°，而不是往回 340°
    const deg = Math.PI / 180;
    expect(angleDiff(10 * deg, 350 * deg)).toBeCloseTo(20 * deg);
    expect(angleDiff(350 * deg, 10 * deg)).toBeCloseTo(-20 * deg);
  });
});

describe('rng（带种子的随机数）', () => {
  it('同一个种子给出同一串数', () => {
    const a = rng(42), b = rng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('不同的种子给出不同的数，而且都在 0 到 1 之间', () => {
    const a = rng(1), b = rng(2);
    const listA = Array.from({ length: 50 }, a), listB = Array.from({ length: 50 }, b);
    expect(listA).not.toEqual(listB);
    for (const v of [...listA, ...listB]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('fbm（噪声）', () => {
  it('同一个位置永远得到同一个数，结果在 0 到 1 之间', () => {
    expect(fbm(3.7, -1.2)).toBe(fbm(3.7, -1.2));
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 0.37, i * -0.91);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
