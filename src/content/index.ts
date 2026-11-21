// 内容的入口：游戏里所有给玩家看的文字都从这里拿。
//
// 来源只有 content/ 下的 JSON：
//   - content/episodes/*.json  每一章的剧情、经文、陶片、信物、彩窗、姿态
//   - content/ui.json          界面上的文字、书卷的名字
// JSON 写得对不对，由 npm run validate:content 检查（规则在 schema.ts）；打包之前会自动检查一遍。
//
// 重要：经文一个字都不能改（AGENTS.md 第 1 条）。这个文件只是把数据“搬运”给游戏，不改任何文字。
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import uiJson from '../../content/ui.json';
import { refText as refTextWith } from './refs';
import type { AnimalName, Beat, Bi, BookName, Card, EpisodeFile, EpisodeInfo, Gesture, Kind, Relic, UiFile, UiText, WindowDef } from './types';

// 章节文件，按游戏里的先后顺序排。做了新的一章，就在这里加一行
const FILES = [creationJson, edenJson] as unknown as EpisodeFile[];
const ui = uiJson as unknown as UiFile;

// 章的代号就用这一章彩窗的 id（creation、eden）：奖励里的 win、存档里的 pieces 用的都是它
const keyOf = (file: EpisodeFile): string => file.window.id;

/** 每一章的基本信息，按代号查 */
export const EPISODES: Record<string, EpisodeInfo> = Object.fromEntries(FILES.map((file) => {
  const key = keyOf(file);
  return [key, { key, id: file.id, n: file.chapter, book: file.hudRef, title: file.title }];
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

/** 书卷的名字，按出处里用的缩写查（Gen、Ps……） */
export const BOOKS: Record<string, BookName> = ui.books;

/** 四种文字的名字：经文 / 考据 / 游戏想象 / 思考 */
export const KIND_LABEL: Record<Kind, Bi> = ui.kinds;

/** 界面上的其他文字 */
export const UI: UiText = ui.text;

/**
 * 把经文出处变成给人看的样子：refText('Gen 1:3') → { en: 'Genesis 1:3', zh: '创 1:3' }
 * mode 'full'：中文用书卷全名（创世记 1:3）；mode 'name'：中文只显示书卷名（创世记）
 */
export const refText = (ref: string, mode?: 'full' | 'name'): Bi => refTextWith(BOOKS, ref, mode);

/** 按出处找到经文的文字（图鉴的“经文”页用） */
export function verseText(ref: string): Bi | null {
  for (const beat of BEATS) for (const line of beat.lines) if (line.ref === ref) return line.text;
  return null;
}
