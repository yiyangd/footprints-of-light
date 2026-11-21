// 内容数据的“形状”（类型）。内容本身写在 content/ 下的 JSON 里，这里只说明每一项长什么样。
// 字段的中文说明见 content/README.md。

/** 一段给玩家看的文字，英文和中文各一份 */
export interface Bi { en: string; zh: string }

/** 语言模式：en = 只显示英文；bi = 英文在上、中文在下 */
export type Lang = 'en' | 'bi';

/** 每一行文字的种类：经文（金）/ 考据（蓝）/ 游戏想象（灰）/ 思考（绿） */
export type Kind = 'scripture' | 'history' | 'imagination' | 'reflection';

/** 字幕里的一行 */
export interface Line {
  kind: Kind;
  /** 经文出处，写成 Gen 1:3。经文必须有 */
  ref?: string;
  text: Bi;
  /** 这一行出现时触发的世界效果，例如 light（要有光） */
  fx?: string;
}

/** 完成一个剧情节点后得到的东西 */
export type Reward =
  | { type: 'relic'; id: string }
  | { type: 'piece'; win: string; i: number }
  | { type: 'verse'; ref: string }
  | { type: 'gesture'; id: string };

/** 剧情节点：走到 at 附近就会触发，必须按顺序完成 */
export interface Beat {
  id: string;
  /** 属于哪一章（章的代号，例如 creation、eden） */
  ep: string;
  /** 地图上的位置 [x, z]：x 越大越往东，z 越大越往南 */
  at: [number, number];
  /** 走到多近会触发（米） */
  r: number;
  hud: { label: Bi; sub: Bi; book?: string };
  lines: Line[];
  rewards: Reward[];
  /** 节点结束后的效果，例如 evening（有晚上，有早晨） */
  after?: string;
}

/** 知识陶片 */
export interface Card {
  id: string;
  ep: string;
  kind: Kind;
  title: Bi;
  text: Bi;
  at: [number, number];
  /** 放在光之路上（陆地升起之前就能捡到） */
  onPath?: boolean;
}

/** 信物 */
export interface Relic { id: string; name: Bi; ref: string; kind: Kind; desc: Bi }

/** 彩窗：pieces 是每一片的名字 */
export interface WindowDef { id: string; name: Bi; ref: string; pieces: Bi[] }

/** 姿态：key 是电脑键盘上的按键（例如 R） */
export interface Gesture { id: string; name: Bi; key: string; desc: Bi }

/** 活物的名字：英文、中文、圣经希伯来文、拼读 */
export interface AnimalName extends Bi { he: string; tr: string }

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

/** content/episodes/*.json 一个文件的内容 */
export interface EpisodeFile {
  id: string;
  title: Bi;
  range: string;
  beats: Omit<Beat, 'ep'>[];
  cards: Omit<Card, 'ep'>[];
  relics: Relic[];
  window: WindowDef;
  gestures: Gesture[];
  animalNames?: Record<string, AnimalName>;
  riverNames?: Bi[];
}

/** 剧情结束后的操作提示：有些分手机（touch）和电脑（desk）两种 */
export type Hint = Bi | { touch: Bi; desk: Bi };

/** 界面上的其他文字 */
export interface UiText {
  version: Bi;
  toast: { relic: Bi; piece: Bi; done: Bi; verse: Bi; gesture: Bi };
  windowDone: Bi;
  counts: { windows: Bi; cards: Bi; relics: Bi };
  potsherd: Bi;
  tabs: { windows: Bi; relics: Bi; cards: Bi; verses: Bi; gestures: Bi };
  collected: Bi;
  notFound: Bi;
  relicHint: Record<string, Bi>;
  legend: Record<Kind, Bi>;
  undiscovered: Bi;
  chapter: Bi;
  noVerses: Bi;
  tap: Bi;
  notLearned: Bi;
  learnHint: Bi;
  resting: Bi;
  barrier: Bi;
  endStats: Bi[];
  sound: Bi;
  muted: Bi;
  startOver: Bi;
  day: Bi;
  dayNums: string;
  langShort: Record<Lang, string>;
  langNote: Record<Lang, string>;
  title: Record<Lang, string>;
  /** Crossway 要求显示的 ESV 版权声明（AGENTS.md 第 2 条），不能删 */
  esvNotice: string;
  cuvNotice: string;
}
