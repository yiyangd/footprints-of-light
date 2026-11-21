// 内容数据的“规矩”（schema）：content/ 下的每个 JSON 文件应该长什么样。
//
// 用的是 zod 这个库：先把“应该长什么样”写下来，它就能替我们检查 JSON 有没有写错
// （npm run validate:content），也能让 TypeScript 知道每一项数据的类型（见 types.ts）。
// 所以这里是唯一要维护的一份：给 JSON 加了新字段，就在这里加一行。
// 字段的中文说明见 content/README.md。
//
// 注意：这个文件只在检查和测试时运行，不会被打包进游戏。
import { z } from 'zod';

/** 四种文字：经文（金）/ 考据（蓝）/ 游戏想象（灰）/ 思考（绿）。AGENTS.md 第 4 条 */
export const KINDS = ['scripture', 'history', 'imagination', 'reflection'] as const;
export const KindSchema = z.enum(KINDS);

/** 一段不能是空的文字 */
const Text = z.string().min(1);

/** 一段给玩家看的文字，英文和中文各一份（AGENTS.md 第 3 条） */
export const BiSchema = z.strictObject({ en: Text, zh: Text });

/** 一行经文的出处：Gen 1:3、Gen 1:14–15、1Sam 3:10（书卷缩写 + 空格 + 章:节，同一章里连续几节用 – 连起来） */
export const REF_PATTERN = /^[1-3]?[A-Za-z]+ \d+:\d+(–\d+)?$/;
const Ref = z.string().regex(REF_PATTERN, '出处要写成 Gen 1:3 或 Gen 1:14–15（书卷缩写、空格、章:节；连续几节用 – 连起来，不是 -）');

/** 一段经文的范围（彩窗、信物、左上角的标题用）：可以只写到章，也可以跨章。Gen 2、Gen 2:12、Gen 2:8–23、Gen 1:1–2:3 */
const Passage = z.string().regex(/^[1-3]?[A-Za-z]+ \d+(:\d+(–(\d+:)?\d+)?)?$/, '范围要写成 Gen 2、Gen 2:12、Gen 2:8–23 或 Gen 1:1–2:3（用 – 连起来，不是 -）');

/** 地图上的位置 [x, z]：x 越大越往东，z 越大越往南 */
const Position = z.tuple([z.number(), z.number()], '位置要写成 [x, z] 两个数字，例如 [12, -3.5]');

/** 字幕里的一行。经文必须带出处（AGENTS.md 第 1 条） */
export const LineSchema = z.strictObject({
  kind: KindSchema,
  /** 经文出处，写成 Gen 1:3 */
  ref: Ref.optional(),
  text: BiSchema,
  /** 这一行出现时触发的世界效果，例如 light（要有光） */
  fx: Text.optional(),
}).refine((line) => line.kind !== 'scripture' || line.ref !== undefined, {
  path: ['ref'],
  error: '经文（scripture）必须带出处 ref，写成 Gen 1:3',
});

/** 完成一个剧情节点后得到的东西 */
export const RewardSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('relic'), id: Text }),
  z.strictObject({ type: z.literal('piece'), win: Text, i: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('verse'), ref: Ref }),
  z.strictObject({ type: z.literal('gesture'), id: Text }),
]);

/** 剧情节点：走到 at 附近就会触发，必须按顺序完成 */
export const BeatSchema = z.strictObject({
  id: Text,
  at: Position,
  /** 走到多近会触发（米） */
  r: z.number().positive(),
  /** 左上角显示的标题和小字；book 不写就用这一章的 hudBook */
  hud: z.strictObject({ label: BiSchema, sub: BiSchema, book: Passage.optional() }),
  lines: z.array(LineSchema).min(1),
  rewards: z.array(RewardSchema),
  /** 节点结束后的效果，例如 evening（有晚上，有早晨） */
  after: Text.optional(),
});

/** 知识陶片 */
export const CardSchema = z.strictObject({
  id: Text,
  kind: KindSchema,
  title: BiSchema,
  text: BiSchema,
  at: Position,
  /** 放在光之路上（陆地升起之前就能捡到） */
  onPath: z.boolean().optional(),
});

/** 信物 */
export const RelicSchema = z.strictObject({ id: Text, name: BiSchema, ref: Passage, kind: KindSchema, desc: BiSchema });

/** 彩窗：pieces 是每一片的名字 */
export const WindowSchema = z.strictObject({ id: Text, name: BiSchema, ref: Passage, pieces: z.array(BiSchema).min(1) });

/** 姿态：key 是电脑键盘上的按键（一个大写字母，例如 R） */
export const GestureSchema = z.strictObject({
  id: Text,
  name: BiSchema,
  key: z.string().regex(/^[A-Z]$/, '按键要写成一个大写字母，例如 R'),
  desc: BiSchema,
});

/** 活物的名字：英文、中文、圣经希伯来文、拼读 */
export const AnimalNameSchema = z.strictObject({ en: Text, zh: Text, he: Text, tr: Text });

/** content/episodes/*.json：一章的全部内容 */
export const EpisodeSchema = z.strictObject({
  /** 文件名里的编号，例如 gen-01-creation */
  id: Text,
  /** 第几章（图鉴里显示“第 1 章”） */
  n: z.number().int().positive(),
  title: BiSchema,
  /** 这一章讲的经文范围，例如 Gen 1:1–2:3 */
  range: Passage,
  /** 左上角显示的书卷和章节，例如 Gen 1:1–2:3 或 Gen 2 */
  hudBook: Passage,
  /** 时间轴上显示的书卷、标签、创世纪年（现在还没用上） */
  era: z.strictObject({ book: BiSchema, label: BiSchema, yearAM: z.number() }).optional(),
  /** 这一章用的译本（给人看的说明） */
  scripture: BiSchema.optional(),
  /** 写给改内容的人看的说明 */
  note: z.string().optional(),
  beats: z.array(BeatSchema).min(1),
  cards: z.array(CardSchema),
  relics: z.array(RelicSchema),
  window: WindowSchema,
  gestures: z.array(GestureSchema),
  animalNames: z.record(z.string(), AnimalNameSchema).optional(),
  riverNames: z.array(BiSchema).optional(),
});

/** 剧情结束后的操作提示：有些分手机（touch）和电脑（desk）两种 */
export const HintSchema = z.union(
  [BiSchema, z.strictObject({ touch: BiSchema, desk: BiSchema })],
  '提示要么是 { en, zh }，要么是 { touch: { en, zh }, desk: { en, zh } }，而且文字不能是空的',
);

/** 只跟语言模式有关的一行字：en 模式显示一种，bi 模式显示另一种 */
const ByLang = z.strictObject({ en: Text, bi: Text });

/** 游戏进行中由代码显示的文字 */
export const GameTextSchema = z.strictObject({
  /** 译本的名字，标在每段经文旁边（AGENTS.md 第 2 条） */
  version: BiSchema,
  toast: z.strictObject({ relic: BiSchema, piece: BiSchema, done: BiSchema, verse: BiSchema, gesture: BiSchema }),
  windowDone: BiSchema,
  counts: z.strictObject({ windows: BiSchema, cards: BiSchema, relics: BiSchema }),
  potsherd: BiSchema,
  tabs: z.strictObject({ windows: BiSchema, relics: BiSchema, cards: BiSchema, verses: BiSchema, gestures: BiSchema }),
  collected: BiSchema,
  notFound: BiSchema,
  /** 每件信物“还没找到时”的提示，按信物的 id 写 */
  relicHint: z.record(z.string(), BiSchema),
  legend: z.strictObject({ scripture: BiSchema, history: BiSchema, imagination: BiSchema, reflection: BiSchema }),
  undiscovered: BiSchema,
  chapter: BiSchema,
  noVerses: BiSchema,
  tap: BiSchema,
  notLearned: BiSchema,
  learnHint: BiSchema,
  resting: BiSchema,
  barrier: BiSchema,
  /** 结尾画面的四个数字各自的名字：彩窗碎片、陶片、信物、经文 */
  endStats: z.array(BiSchema).length(4, '要正好四项：彩窗碎片、陶片、信物、经文'),
  sound: BiSchema,
  muted: BiSchema,
  startOver: BiSchema,
  day: BiSchema,
  /** 中文的“一二三四五六七”，第几日用 */
  dayNums: z.string().length(7, '要正好七个字：一二三四五六七'),
  /** 图鉴里每节经文下面的出处：{ref} 是出处，{v} 是译本 */
  verseCite: BiSchema,
  /** 得到彩窗碎片时的通知：{w} 彩窗名，{p} 碎片名，{n} 第几片 */
  pieceToast: BiSchema,
  langShort: ByLang,
  langNote: ByLang,
  /** 两种语言模式各自的名字（开始页上的两个选项） */
  langNames: ByLang,
  /** 浏览器标签页上的标题 */
  title: ByLang,
  /** Crossway 要求显示的 ESV 版权声明（AGENTS.md 第 2 条），不能删 */
  esvNotice: Text,
  /** 版权声明里的网址：只写成文字，不做成链接（AGENTS.md 第 7 条） */
  esvSite: Text,
  cuvNotice: Text,
});

/** content/ui.json：界面上的文字 */
export const UiSchema = z.strictObject({
  /** 写给改内容的人看的说明 */
  about: z.string().optional(),
  /** 书卷名，按出处里的缩写查：Gen → Genesis / 创 / 创世记 */
  books: z.record(z.string(), z.strictObject({ en: Text, zh: Text, zhFull: Text })),
  /** 四种文字的名字 */
  kinds: z.strictObject({ scripture: BiSchema, history: BiSchema, imagination: BiSchema, reflection: BiSchema }),
  /** 剧情结束后的操作提示，按节点的 id 写 */
  hints: z.record(z.string(), HintSchema),
  /** 开始页上的那节经文 */
  titleVerse: LineSchema,
  /** 写在 index.html 里的固定文字（按钮、开始页、结尾页），分成几组 */
  page: z.record(z.string(), z.record(z.string(), BiSchema)),
  /** 读屏软件念的说明、鼠标停在按钮上时的小提示：不分语言，一项一行字 */
  aria: z.record(z.string(), Text),
  game: GameTextSchema,
});

export type Kind = z.infer<typeof KindSchema>;
export type Bi = z.infer<typeof BiSchema>;
export type Line = z.infer<typeof LineSchema>;
export type Reward = z.infer<typeof RewardSchema>;
export type Relic = z.infer<typeof RelicSchema>;
export type WindowDef = z.infer<typeof WindowSchema>;
export type Gesture = z.infer<typeof GestureSchema>;
export type AnimalName = z.infer<typeof AnimalNameSchema>;
export type EpisodeFile = z.infer<typeof EpisodeSchema>;
export type Hint = z.infer<typeof HintSchema>;
export type UiFile = z.infer<typeof UiSchema>;
