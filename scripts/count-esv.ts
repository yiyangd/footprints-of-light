// 数一数游戏里用了多少节 ESV 经文。用法：npm run count:esv
//
// 为什么要数：ESV 有版权（Crossway）。按 Crossway 的标准使用指引，不经书面许可可以引用：
// 整个作品不超过 500 节、不超过任何一卷书的一半、不超过作品全部文字的 25%（AGENTS.md 第 2 条）。
// 每次加了经文都要运行一次，把结果写进回复；快到上限时停下来，提醒带领人先向 Crossway 申请书面许可。
//
// 数的是 content/ 里 kind 为 scripture 的文字：剧情里的每一行经文，加上开始页上的那一节。
import { BEATS, CARDS, EPISODE_FILES, RELICS, UI_FILE } from '../src/content/index';
import type { Bi } from '../src/content/types';

/** Crossway 标准使用指引里的上限 */
const MAX_VERSES = 500;
const MAX_SHARE = 25;

/** 把一个出处拆成一节一节：'Gen 1:14–15' → ['Gen 1:14', 'Gen 1:15'] */
function versesIn(ref: string): string[] {
  const [book, chapterAndVerses] = ref.split(' ');
  const [chapter, verses] = chapterAndVerses.split(':');
  const [first, last] = verses.split('–').map(Number);
  const list: string[] = [];
  for (let v = first; v <= (last || first); v++) list.push(`${book} ${chapter}:${v}`);
  return list;
}

// 1. 节数：同一节出现两次只算一次
const storyVerses = new Set<string>();
for (const beat of BEATS) {
  for (const line of beat.lines) {
    if (line.kind === 'scripture' && line.ref) for (const v of versesIn(line.ref)) storyVerses.add(v);
  }
}
const titleVerse = UI_FILE.titleVerse;
const titleVerses = titleVerse.ref ? versesIn(titleVerse.ref) : [];
const allVerses = new Set([...storyVerses, ...titleVerses]);

// 每卷书各用了多少节（“不超过任何一卷书的一半”：书卷很短时要特别留意）
const perBook = new Map<string, number>();
for (const v of allVerses) {
  const book = v.split(' ')[0];
  perBook.set(book, (perBook.get(book) ?? 0) + 1);
}

// 2. 陶片、信物的英文里提到的出处：如果直接引用了 ESV 原文，也要算进去（要人来判断）
const mentioned = new Set<string>();
// 英文里像 Genesis 1:2、Deuteronomy 32:11、1 Samuel 3:10 这样的写法
const refInText = /(?:[1-3] )?[A-Z][a-z]+ \d+:\d+(?:–\d+)?/g;
for (const card of CARDS) for (const m of card.text.en.matchAll(refInText)) mentioned.add(m[0]);
for (const relic of Object.values(RELICS)) for (const m of relic.desc.en.matchAll(refInText)) mentioned.add(m[0]);

// 3. 文字比例：经文的英文词数 ÷ 全部英文词数（中文按约 1.5 个字 = 1 个词估算）
const wordCount = (s: string): number => (s.match(/[A-Za-z’'-]+/g) ?? []).length;
const isBi = (v: unknown): v is Bi =>
  !!v && typeof v === 'object' && typeof (v as Bi).en === 'string' && typeof (v as Bi).zh === 'string';
let esvWords = 0, enWords = 0, zhChars = 0;

/** 把一份数据里所有的 { en, zh } 都数进去；经文另外再记一笔 */
function tally(value: unknown, isScripture = false): void {
  if (!value || typeof value !== 'object') return;
  if (isBi(value)) {
    enWords += wordCount(value.en);
    zhChars += value.zh.length;
    if (isScripture) esvWords += wordCount(value.en);
    return;
  }
  // 一行字幕（或开始页的经文）：kind 是 scripture 的才算经文
  const line = value as { kind?: unknown; text?: unknown };
  if (isBi(line.text)) { tally(line.text, line.kind === 'scripture'); return; }
  for (const child of Object.values(value)) tally(child);
}
for (const episode of EPISODE_FILES) {
  tally(episode.title);
  for (const beat of episode.beats) { tally(beat.hud); tally(beat.lines); }
  // 陶片和信物的 kind 说的是“这是哪一类知识”，不是经文原文，所以只数它们的文字
  for (const card of episode.cards) { tally(card.title); tally(card.text); }
  for (const relic of episode.relics) { tally(relic.name); tally(relic.desc); }
  tally(episode.window.name); tally(episode.window.pieces);
  for (const gesture of episode.gestures) { tally(gesture.name); tally(gesture.desc); }
  tally(episode.animalNames); tally(episode.riverNames);
}
tally(UI_FILE.kinds); tally(UI_FILE.hints); tally(UI_FILE.titleVerse); tally(UI_FILE.page); tally(UI_FILE.game);
const zhWords = Math.round(zhChars / 1.5);
const shareOfEnglish = esvWords / enWords * 100;
const shareOfAll = esvWords / (enWords + zhWords) * 100;

// 4. 结果
console.log(`剧情里的 ESV 经文：${storyVerses.size} 节`);
console.log(`开始页上的经文：${titleVerse.ref ?? '无'}（${titleVerses.length} 节）`);
console.log(`合计：${allVerses.size} 节（上限 ${MAX_VERSES}）。按书卷：${[...perBook].map(([book, n]) => `${book} ${n} 节`).join('、')}`);
console.log(`陶片和信物里提到的出处：${[...mentioned].join('、') || '无'}（直接引用了原文的也要算）`);
console.log(`经文占英文文字：${shareOfEnglish.toFixed(1)}%；占中英文全部文字：约 ${shareOfAll.toFixed(1)}%（指引上限 ${MAX_SHARE}%）`);

if (allVerses.size > MAX_VERSES) {
  console.log(`\n超过 ${MAX_VERSES} 节了：先停下来，请带领人向 Crossway 申请书面许可（见 CREDITS.md），拿到许可之前不要发布。`);
  process.exit(1);
}
if (shareOfAll > MAX_SHARE) {
  console.log(`\n提醒：经文占全部文字的比例超过了 ${MAX_SHARE}%，请带领人看一下 CREDITS.md 里关于 Crossway 许可的说明。`);
}
