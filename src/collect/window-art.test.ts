// 图鉴里的画的测试：每扇彩窗、每件信物都有自己的画。运行：npm test
import { describe, expect, it } from 'vitest';
import { RELICS, WINDOWS } from '../content';
import { relicIcon, WINDOW_ART } from './window-art';

describe('图鉴里的画', () => {
  it('每扇彩窗都画了；一片都没有、得到几片、集齐，都画得出来', () => {
    for (const [id, w] of Object.entries(WINDOWS)) {
      const draw = WINDOW_ART[id];
      expect(draw, `彩窗 ${id} 还没有画（见 src/collect/window-art.ts）`).toBeDefined();
      const all = w.pieces.map((_, i) => i);
      for (const got of [[], [0], all]) expect(draw(got, w.name.en)).toMatch(/^<svg[\s\S]*<\/svg>$/);
      expect(draw(all, w.name.en)).toContain('#ffcf7a'); // 集齐了有金边
    }
  });

  it('每件信物都有自己的图标（不是还没画时的星号）', () => {
    for (const id of Object.keys(RELICS)) expect(relicIcon(id), `信物 ${id}`).toMatch(/^<svg/);
  });
});
