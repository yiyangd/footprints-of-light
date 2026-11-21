// 内容的入口：游戏里所有给玩家看的文字都从这里拿。
//
// 现在的来源有两处：
//   1. 剧情、经文、陶片、信物、彩窗、姿态 —— content/episodes/*.json
//   2. 界面文字、操作提示、书卷名 —— 暂时借用小样的 prototype/src/content.js
// 下一步（M0 第 2 步）会把第 2 项也搬进 content/ui.json，并用 zod 检查 JSON 有没有写错。
//
// 重要：经文一个字都不能改（AGENTS.md 第 1 条）。这个文件只是把数据“搬运”给游戏，不改任何文字。
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
// @ts-expect-error 小样的内容文件是 JS，没有类型说明；搬进 content/ui.json 之后就不需要这一行了
import * as proto from '../../prototype/src/content.js';
import type {
  AnimalName, Beat, Bi, Card, EpisodeFile, EpisodeInfo, Gesture, Hint, Kind, Relic, UiText, WindowDef,
} from './types';

// 章节文件，按游戏里的先后顺序排
const FILES = [creationJson, edenJson] as unknown as EpisodeFile[];

/** 小样里每一章的补充信息（第几章、左上角显示的经文范围），JSON 里暂时还没有 */
const protoEpisodes = proto.EPISODES as Record<string, { n: number; book: string }>;

// 章的代号就用这一章彩窗的 id（creation、eden）：奖励里的 win、存档里的 pieces 用的都是它
const keyOf = (file: EpisodeFile): string => file.window.id;

/** 每一章的基本信息，按代号查 */
export const EPISODES: Record<string, EpisodeInfo> = Object.fromEntries(FILES.map((file) => {
  const key = keyOf(file);
  const extra = protoEpisodes[key];
  if (!extra) throw new Error(`章节 ${file.id}：小样的 content.js 里没有 ${key} 这一章的信息`);
  return [key, { key, id: file.id, n: extra.n, book: extra.book, title: file.title }];
}));

/** 所有剧情节点，按顺序 */
export const BEATS: Beat[] = FILES.flatMap((file) => file.beats.map((b) => ({ ...b, ep: keyOf(file) })));

/** 所有知识陶片 */
export const CARDS: Card[] = FILES.flatMap((file) => file.cards.map((c) => ({ ...c, ep: keyOf(file) })));

/** 信物，按 id 查 */
export const RELICS: Record<string, Relic> =
  Object.fromEntries(FILES.flatMap((file) => file.relics.map((r) => [r.id, r])));

/** 彩窗，按章的代号查 */
export const WINDOWS: Record<string, WindowDef> = Object.fromEntries(FILES.map((file) => [keyOf(file), file.window]));

/** 姿态，按 id 查 */
export const GESTURES: Record<string, Gesture> =
  Object.fromEntries(FILES.flatMap((file) => file.gestures.map((g) => [g.id, g])));

/** 活物的名字（伊甸园里“给活物起名”用） */
export const ANIMAL_NAMES: Record<string, AnimalName> = Object.assign({}, ...FILES.map((file) => file.animalNames ?? {}));

/** 四道河的名字（创 2:11–14） */
export const RIVER_NAMES: Bi[] = FILES.flatMap((file) => file.riverNames ?? []);

/** 四种文字的名字：经文 / 考据 / 游戏想象 / 思考 */
export const KIND_LABEL: Record<Kind, Bi> = proto.KIND_LABEL;

/** 剧情结束后的操作提示，按节点 id 查 */
export const HINTS: Record<string, Hint> = proto.HINTS;

/** 界面上的其他文字 */
export const UI: UiText = proto.UI;

/**
 * 把经文出处变成给人看的样子：refText('Gen 1:3') → { en: 'Genesis 1:3', zh: '创 1:3' }
 * mode 'full'：中文用书卷全名（创世记 1:3）；mode 'name'：中文只显示书卷名（创世记）
 */
export const refText: (ref: string, mode?: 'full' | 'name') => Bi = proto.refText;

/** 按出处找到经文的文字（图鉴的“经文”页用） */
export function verseText(ref: string): Bi | null {
  for (const beat of BEATS) for (const line of beat.lines) if (line.ref === ref) return line.text;
  return null;
}
