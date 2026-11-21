// 内容的入口：游戏里所有给玩家看的文字都从这里拿。
//
// 来源只有 content/ 下的 JSON：
//   - content/episodes/*.json  每一章的剧情、经文、陶片、信物、彩窗、姿态（现在有第 1—5 章）
//   - content/ui.json          界面上的文字、书卷的名字
// JSON 写得对不对，由 npm run validate:content 检查（规则在 schema.ts）；打包之前会自动检查一遍。
//
// 重要：经文一个字都不能改（AGENTS.md 第 1 条）。这个文件只是把数据“搬运”给游戏，不改任何文字。
import creationJson from '../../content/episodes/gen-01-creation.json';
import edenJson from '../../content/episodes/gen-02-eden.json';
import fallJson from '../../content/episodes/gen-03-fall.json';
import brothersJson from '../../content/episodes/gen-04-brothers.json';
import generationsJson from '../../content/episodes/gen-05-generations.json';
import uiJson from '../../content/ui.json';
import { refText as refTextWith } from './refs';
import type { AnimalName, Beat, Bi, BookName, Card, EpisodeFile, EpisodeInfo, Gesture, Kind, Relic, UiFile, UiText, WindowDef } from './types';

// —— 开发时预览草稿 ——
// content/drafts/ 下的草稿还没有进游戏。开发时（npm run dev）在网址后面加 ?draft=草稿的文件名，
// 例如 ?draft=gen-03-fall，就把那份草稿接在已有的章节后面，方便边做边看。
// 打包发布的版本里 import.meta.env.DEV 是 false：草稿不会被打包进去，网址里写了也没有用。
const DRAFTS: Record<string, unknown> = import.meta.env.DEV ? import.meta.glob('../../content/drafts/*.json', { eager: true, import: 'default' }) : {};
const wantedDraft = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('draft') : null;
const draftFile = wantedDraft ? DRAFTS[`../../content/drafts/${wantedDraft}.json`] as EpisodeFile | undefined : undefined;

/** 正在预览的草稿的文件名；没有在预览就是 null */
export const DRAFT_ID: string | null = draftFile ? wantedDraft : null;

// 章节文件，按游戏里的先后顺序排。做了新的一章，就在这里加一行
const FILES = [creationJson, edenJson, fallJson, brothersJson, generationsJson, ...(draftFile ? [draftFile] : [])] as unknown as EpisodeFile[];

/** 正在预览的草稿的第一个剧情节点的 id（预览时直接从这里开始）；没有在预览就是 null */
export const DRAFT_FIRST_BEAT: string | null = draftFile?.beats[0]?.id ?? null;
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

/** 先祖头上显示的名字和岁数（第 5 章），按先祖的 id 查 */
export const ELDERS: Record<string, Bi> = Object.assign({}, ...FILES.map((file) => file.elders ?? {}));

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
