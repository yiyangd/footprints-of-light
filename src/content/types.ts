// 内容数据的类型。它们是从 schema.ts 里的规则推出来的，所以“规则”和“类型”永远一致。
// 每个字段的中文说明见 content/README.md。
import type { z } from 'zod';
import type {
  AnimalNameSchema, BeatSchema, BiSchema, BookNameSchema, CardSchema, EpisodeFileSchema, GestureSchema, HintSchema,
  KindSchema, LineSchema, RelicSchema, RewardSchema, UiFileSchema, UiTextSchema, WindowSchema,
} from './schema';

/** 一段给玩家看的文字，英文和中文各一份 */
export type Bi = z.infer<typeof BiSchema>;

/** 语言模式：en = 只显示英文；bi = 英文在上、中文在下 */
export type Lang = 'en' | 'bi';

/** 每一行文字的种类：经文（金）/ 考据（蓝）/ 游戏想象（灰）/ 思考（绿） */
export type Kind = z.infer<typeof KindSchema>;

/** 字幕里的一行 */
export type Line = z.infer<typeof LineSchema>;

/** 完成一个剧情节点后得到的东西 */
export type Reward = z.infer<typeof RewardSchema>;

/** 剧情结束后的操作提示：有些分手机（touch）和电脑（desk）两种 */
export type Hint = z.infer<typeof HintSchema>;

/** 剧情节点：走到 at 附近就会触发，必须按顺序完成。ep 是它属于哪一章（章的代号，例如 creation） */
export type Beat = z.infer<typeof BeatSchema> & { ep: string };

/** 知识陶片 */
export type Card = z.infer<typeof CardSchema> & { ep: string };

/** 信物 */
export type Relic = z.infer<typeof RelicSchema>;

/** 彩窗 */
export type WindowDef = z.infer<typeof WindowSchema>;

/** 姿态 */
export type Gesture = z.infer<typeof GestureSchema>;

/** 活物的名字：英文、中文、圣经希伯来文、拼读 */
export type AnimalName = z.infer<typeof AnimalNameSchema>;

/** 书卷的名字 */
export type BookName = z.infer<typeof BookNameSchema>;

/** content/episodes/*.json 一个文件的内容 */
export type EpisodeFile = z.infer<typeof EpisodeFileSchema>;

/** content/ui.json 的内容 */
export type UiFile = z.infer<typeof UiFileSchema>;

/** 游戏里用到的零散文字 */
export type UiText = z.infer<typeof UiTextSchema>;

/** 一章的基本信息 */
export interface EpisodeInfo {
  /** 章的代号，也是这一章彩窗的 id */
  key: string;
  /** 文件名里的编号，例如 gen-01-creation */
  id: string;
  /** 第几章 */
  n: number;
  /** 左上角显示的经文范围，例如 Gen 1:1–2:3 */
  book: string;
  title: Bi;
}
