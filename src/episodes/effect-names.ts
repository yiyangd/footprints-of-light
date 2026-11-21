// 每一章有哪些世界效果的“名单”。剧情 JSON 里的 fx 和 after 只能写这里有的名字。
// 这个文件只有名字，没有画面，所以 npm run validate:content 可以用它检查 JSON 里有没有写错效果名。
// 每一章的代码（gen-01-creation.ts 等）必须把自己名单上的效果一个不少地实现出来，少写或多写了 TypeScript 会报错。

/** 第 1 章《创造七日》的效果 */
export const CREATION_EFFECTS = [
  'wind', 'light', 'sky', 'land', 'plants', 'lights', 'creatures', 'animals', 'humans', 'rest', 'evening', 'openEden',
] as const;

/** 第 2 章《伊甸园》的效果 */
export const EDEN_EFFECTS = ['eden', 'rivers', 'naming', 'sleep', 'eve', 'serpent', 'end'] as const;

/** 第 3 章《你在哪里？》的效果。这一章还是草稿（content/drafts/），所以不算进下面的 EFFECT_NAMES */
export const FALL_EFFECTS = [
  'serpentSpeaks', 'eatFruit', 'lightFades', 'coolWind', 'silence', 'serpentCursed', 'goldenThread', 'thorns', 'clothe', 'leaveEden', 'cherubim',
] as const;

/** 已经进游戏的章节的效果名 */
export const EFFECT_NAMES: readonly string[] = [...CREATION_EFFECTS, ...EDEN_EFFECTS];

/** 草稿里可以用的效果名：已经进游戏的，加上草稿章节自己的 */
export const DRAFT_EFFECT_NAMES: readonly string[] = [...EFFECT_NAMES, ...FALL_EFFECTS];
