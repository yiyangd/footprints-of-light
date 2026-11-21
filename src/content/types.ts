// 内容数据的类型。大部分类型是从 schema.ts 里的“规矩”自动得出来的，这里只是转交一下，
// 再补上几个游戏运行时才有的类型。字段的中文说明见 schema.ts 和 content/README.md。
import type { EpisodeFile, UiFile } from './schema';

export type { AnimalName, Bi, EpisodeFile, Gesture, Hint, Kind, Line, Relic, Reward, UiFile, WindowDef } from './schema';

/** 语言模式：en = 只显示英文；bi = 英文在上、中文在下 */
export type Lang = 'en' | 'bi';

/** 剧情节点：JSON 里的内容，再加上它属于哪一章（ep 是章的代号，例如 creation、eden） */
export type Beat = EpisodeFile['beats'][number] & { ep: string };

/** 知识陶片：JSON 里的内容，再加上它属于哪一章 */
export type Card = EpisodeFile['cards'][number] & { ep: string };

/** 一章的基本信息 */
export interface EpisodeInfo {
  /** 章的代号，也是这一章彩窗的 id */
  key: string;
  /** 文件名里的编号，例如 gen-01-creation */
  id: string;
  /** 第几章 */
  n: number;
  /** 左上角显示的书卷和章节，例如 Gen 1:1–2:3 */
  book: string;
  title: EpisodeFile['title'];
}

/** 游戏进行中由代码显示的文字（content/ui.json 的 game 部分） */
export type UiText = UiFile['game'];
