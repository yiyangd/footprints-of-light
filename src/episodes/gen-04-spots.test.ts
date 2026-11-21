// 第 4 章位置的测试：每个位置都要在陆地上。运行：npm test
import { describe, expect, it } from 'vitest';
import { baseHeight } from '../world/heightmap';
import type { Spot } from './gen-03-spots';
import { ALTARS, CAIN_HUT, CITY, DOOR, FIELD, HOME, LAMECH, OPEN_FIELD, PASTURE, STAND, WORSHIP } from './gen-04-spots';

/** 这里是不是干的陆地（高出水面 0.45 米以上） */
const dry = ([x, z]: Spot): boolean => baseHeight(x, z) > 0.45;
/** 一个圆里面（圆心和圆周上的 8 个点）都是陆地 */
const dryCircle = (at: Spot, r: number): boolean => dry(at) && Array.from({ length: 8 }, (_, i) => i * Math.PI / 4).every((a) => dry([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r]));

describe('第 4 章的位置', () => {
  it('每个人站的地方都在陆地上', () => {
    for (const [name, spot] of Object.entries({ ...STAND, adam: HOME.adam, eve: HOME.eve, adamBack: HOME.adamBack, eveBack: HOME.eveBack, lamech: LAMECH.lamech })) expect(dry(spot), name).toBe(true);
  });

  it('房子、坛、帐棚、炉子都在陆地上；田、羊群、城、敬拜的那一圈整个都在陆地上', () => {
    for (const spot of [HOME.hut, CAIN_HUT, DOOR, ALTARS.abel, ALTARS.cain, OPEN_FIELD, LAMECH.tents, LAMECH.forge, LAMECH.lyre]) expect(dry(spot), spot.join(', ')).toBe(true);
    for (const c of [FIELD, PASTURE, CITY, LAMECH.herd, WORSHIP]) expect(dryCircle(c.at, c.r + 0.8), c.at.join(', ')).toBe(true);
  });

  it('田间（创 4:8）离该隐的门口够远：玩家在远处看，不近看', () => {
    expect(Math.hypot(OPEN_FIELD[0] - DOOR[0], OPEN_FIELD[1] - DOOR[1])).toBeGreaterThan(10);
  });
});
