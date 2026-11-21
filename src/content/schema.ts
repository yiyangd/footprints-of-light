// 内容的“规格”：content/ 下每个 JSON 文件里每一项该长什么样。
// 用 zod 写成可以检查的规则：npm run validate:content 会照着它检查 JSON，写错了会指出是哪个文件、哪一项。
// 每个字段的中文说明见 content/README.md；TypeScript 用的类型（src/content/types.ts）也是从这里推出来的。
import { z } from 'zod';

/** 一段不能为空的文字 */
const text = z.string().min(1);

/** 一段给玩家看的文字，英文和中文各一份 */
export const BiSchema = z.strictObject({ en: text, zh: text });

/** 每一行文字的种类：经文（金）/ 考据（蓝）/ 游戏想象（灰）/ 思考（绿） */
export const KINDS = ['scripture', 'history', 'imagination', 'reflection'] as const;
export const KindSchema = z.enum(KINDS);

/** 一节或同一章里连续几节经文的出处：Gen 1:3、Gen 1:14–15（中间是长横线 –） */
export const VerseRefSchema = z.string().regex(/^[1-3]?[A-Za-z]+ \d+:\d+(–\d+)?$/, '出处要写成 Gen 1:3 或 Gen 1:14–15 这样（书卷缩写、空格、章:节，连续几节用长横线 –）');

/** 一段经文的范围，可以跨章，也可以只写到章：Gen 2、Gen 1:1–2:3 */
export const PassageRefSchema = z.string().regex(/^[1-3]?[A-Za-z]+ \d+(:\d+)?(–\d+(:\d+)?)?$/, '经文范围要写成 Gen 2、Gen 2:8–23 或 Gen 1:1–2:3 这样');

/** 地图上的位置 [x, z]：x 越大越往东，z 越大越往南 */
const PositionSchema = z.tuple([z.number(), z.number()], '位置要写成 [x, z] 两个数');

/** 一行文字：经文必须带出处 */
export const LineSchema = z.strictObject({
  kind: KindSchema,
  ref: VerseRefSchema.optional(),
  text: BiSchema,
  /** 这一行出现时触发的世界效果，例如 light（要有光） */
  fx: text.optional(),
}).refine((line) => line.kind !== 'scripture' || line.ref !== undefined, { path: ['ref'], message: '经文（kind 是 scripture）必须写出处 ref' });

/** 完成一个剧情节点后得到的东西 */
export const RewardSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('relic'), id: text }),
  z.strictObject({ type: z.literal('piece'), win: text, i: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('verse'), ref: VerseRefSchema }),
  z.strictObject({ type: z.literal('gesture'), id: text }),
]);

/** 剧情结束后的操作提示：一句话，或者手机（touch）和电脑（desk）各一句 */
export const HintSchema = z.union([BiSchema, z.strictObject({ touch: BiSchema, desk: BiSchema })]);

/** 剧情节点 */
export const BeatSchema = z.strictObject({
  id: text,
  at: PositionSchema,
  /** 走到多近会触发（米） */
  r: z.number().positive(),
  hud: z.strictObject({ label: BiSchema, sub: BiSchema, book: PassageRefSchema.optional() }),
  lines: z.array(LineSchema).min(1),
  rewards: z.array(RewardSchema),
  /** 节点结束后的效果，例如 evening（有晚上，有早晨） */
  after: text.optional(),
  hint: HintSchema.optional(),
});

/** 知识陶片 */
export const CardSchema = z.strictObject({
  id: text,
  kind: KindSchema,
  title: BiSchema,
  text: BiSchema,
  at: PositionSchema,
  /** 放在光之路上（陆地升起之前就能捡到） */
  onPath: z.boolean().optional(),
});

/** 信物 */
export const RelicSchema = z.strictObject({ id: text, name: BiSchema, ref: PassageRefSchema, kind: KindSchema, desc: BiSchema });

/** 彩窗：pieces 是每一片的名字 */
export const WindowSchema = z.strictObject({ id: text, name: BiSchema, ref: PassageRefSchema, pieces: z.array(BiSchema).min(1) });

/** 姿态：key 是电脑键盘上的按键（一个大写字母） */
export const GestureSchema = z.strictObject({ id: text, name: BiSchema, key: z.string().regex(/^[A-Z]$/, '按键要写成一个大写字母，例如 R'), desc: BiSchema });

/** 活物的名字：英文、中文、圣经希伯来文、拼读 */
export const AnimalNameSchema = z.strictObject({ en: text, zh: text, he: text, tr: text });

/** content/episodes/*.json 一个文件的内容 */
export const EpisodeFileSchema = z.strictObject({
  id: text,
  /** 第几章 */
  chapter: z.number().int().positive(),
  title: BiSchema,
  range: PassageRefSchema,
  /** 左上角显示的经文范围 */
  hudRef: PassageRefSchema,
  era: z.strictObject({ book: BiSchema, label: BiSchema, yearAM: z.number() }),
  scripture: BiSchema,
  note: z.string(),
  beats: z.array(BeatSchema).min(1),
  cards: z.array(CardSchema),
  relics: z.array(RelicSchema),
  window: WindowSchema,
  gestures: z.array(GestureSchema),
  animalNames: z.record(z.string(), AnimalNameSchema).optional(),
  riverNames: z.array(BiSchema).optional(),
});

/** 书卷的名字：英文全名、中文简称、中文全名 */
export const BookNameSchema = z.strictObject({ en: text, zh: text, zhFull: text });

/** 两种语言模式各一句（不是英文、中文各一句）：en 模式显示什么，bi 模式显示什么 */
const PerModeSchema = z.strictObject({ en: text, bi: text });

/** 游戏里用到的零散文字。{n} {w} {t} 会被换成实际的值 */
export const UiTextSchema = z.strictObject({
  version: BiSchema,
  toast: z.strictObject({ relic: BiSchema, piece: BiSchema, done: BiSchema, verse: BiSchema, gesture: BiSchema }),
  windowDone: BiSchema,
  counts: z.strictObject({ windows: BiSchema, cards: BiSchema, relics: BiSchema }),
  potsherd: BiSchema,
  tabs: z.strictObject({ windows: BiSchema, relics: BiSchema, cards: BiSchema, verses: BiSchema, gestures: BiSchema }),
  collected: BiSchema,
  notFound: BiSchema,
  /** 每件信物在图鉴里“还没找到时”的提示，按信物的 id 写 */
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
  endStats: z.array(BiSchema).length(4),
  sound: BiSchema,
  muted: BiSchema,
  startOver: BiSchema,
  day: BiSchema,
  /** 中文的一到七，连着写：一二三四五六七 */
  dayNums: z.string().length(7),
  langShort: PerModeSchema,
  langNote: PerModeSchema,
  title: PerModeSchema,
  /** 英文经文的来源说明：BSB 的署名和公有领域声明（AGENTS.md 第 2 条），要一直留着 */
  bibleNotice: z.string().includes('Berean Standard Bible').includes('public domain'),
  /** 来源说明里的网址：只写成文字，不做成链接（AGENTS.md 第 7 条） */
  bibleSite: text,
  cuvNotice: text,
});

/** 页面上固定的文字（封面、按钮、结尾）。可以一层套一层；index.html 里的占位符按名字来取 */
export type PageNode = string | z.infer<typeof BiSchema> | z.infer<typeof LineSchema> | { [key: string]: PageNode };
export const PageNodeSchema: z.ZodType<PageNode> = z.lazy(() => z.union([text, BiSchema, LineSchema, z.record(z.string(), PageNodeSchema)]));

/** content/ui.json 的内容 */
export const UiFileSchema = z.strictObject({
  note: z.string(),
  /** 书卷的名字，按出处里用的缩写查（Gen、Ps……） */
  books: z.record(z.string(), BookNameSchema),
  /** 四种文字的名字 */
  kinds: z.strictObject({ scripture: BiSchema, history: BiSchema, imagination: BiSchema, reflection: BiSchema }),
  text: UiTextSchema,
  page: z.record(z.string(), PageNodeSchema),
});
