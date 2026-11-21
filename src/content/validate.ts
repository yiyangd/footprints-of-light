// 检查 content/ 下的 JSON 有没有写错。npm run validate:content 和 npm test 用的是同一套检查。
//
// 分两步：
//   1. 形状：每个文件照 schema.ts 里的规矩检查（kind 写错、缺出处、位置不是两个数字、缺 en 或 zh……）
//   2. 对得上：文件和文件之间互相提到的东西都存在（奖励里的信物、彩窗碎片、书卷名……）
// 每个问题都说清楚：哪个文件、哪一项、错在哪。
//
// 注意：这个文件只在检查和测试时运行，不会被打包进游戏。
import type { z } from 'zod';
import { EpisodeSchema, UiSchema } from './schema';
import type { EpisodeFile, UiFile } from './schema';

/** 一个问题：哪个文件、哪一项、错在哪 */
export interface Problem { file: string; where: string; message: string }

/** 一个读进来的 JSON 文件：file 是文件名（报错时用），data 是里面的内容 */
export interface Loaded<T = unknown> { file: string; data: T }

const TYPE_NAMES: Record<string, string> = {
  string: '一段文字（要加引号）', number: '一个数字', boolean: 'true 或 false', array: '一个列表 [ ]', object: '一组 { }',
};

/** 把一个值写成人能看懂的短短一句，报错时用 */
function show(value: unknown): string {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

/** 照着路径一层一层往里找，同时把路径写成 beats[2]（day2）.lines[0].kind 这样 */
function locate(data: unknown, path: PropertyKey[]): { where: string; value: unknown } {
  let where = '', value = data;
  for (const key of path) {
    where += typeof key === 'number' ? `[${key}]` : (where ? '.' : '') + String(key);
    value = value && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined;
    // 列表里的东西如果有 id，就把 id 也写出来，方便在文件里找
    const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : undefined;
    if (typeof key === 'number' && typeof id === 'string') where += `（${id}）`;
  }
  return { where, value };
}

/** 把 zod 报的一个问题翻译成给初学者看的中文 */
function explain(issue: z.core.$ZodIssue, value: unknown): string {
  // schema.ts 里已经写好中文说明的（出处的写法、位置、提示……），直接用
  if (/[\u4e00-\u9fff]/.test(issue.message)) {
    return value === undefined ? issue.message : `${issue.message}。现在写的是 ${show(value)}`;
  }
  switch (issue.code) {
    case 'invalid_type':
      if (value === undefined) return '缺少这一项';
      return `应该是${TYPE_NAMES[issue.expected] ?? issue.expected}，现在写的是 ${show(value)}`;
    case 'invalid_value':
      return `只能是 ${issue.values.map(String).join(' / ')}，现在写的是 ${show(value)}`;
    case 'unrecognized_keys':
      return `多了不认识的字段：${issue.keys.join('、')}（是不是拼错了？）`;
    case 'too_small':
      if (issue.origin === 'string') return '不能是空的';
      if (issue.origin === 'array') return `至少要有 ${issue.minimum} 项`;
      return `${issue.inclusive ? '不能小于' : '要大于'} ${issue.minimum}，现在写的是 ${show(value)}`;
    default:
      return issue.message;
  }
}

/** 第 1 步：照规矩检查一个文件的形状 */
export function checkShape(schema: z.ZodType, loaded: Loaded): Problem[] {
  const result = schema.safeParse(loaded.data);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const { where, value } = locate(loaded.data, issue.path);
    return { file: loaded.file, where: where || '（整个文件）', message: explain(issue, value) };
  });
}

/** 出处里的书卷缩写：'Gen 1:3' → 'Gen' */
const bookOf = (ref: string): string => ref.slice(0, ref.indexOf(' '));

/** 一章里所有写了出处的地方：[在哪, 出处] */
function refsIn(ep: EpisodeFile): Array<[string, string]> {
  const refs: Array<[string, string]> = [['hudBook', ep.hudBook], ['window.ref', ep.window.ref]];
  ep.relics.forEach((r, i) => refs.push([`relics[${i}]（${r.id}）.ref`, r.ref]));
  ep.beats.forEach((b, i) => {
    if (b.hud.book) refs.push([`beats[${i}]（${b.id}）.hud.book`, b.hud.book]);
    b.lines.forEach((line, j) => { if (line.ref) refs.push([`beats[${i}]（${b.id}）.lines[${j}].ref`, line.ref]); });
    b.rewards.forEach((r, j) => { if (r.type === 'verse') refs.push([`beats[${i}]（${b.id}）.rewards[${j}].ref`, r.ref]); });
  });
  return refs;
}

/** 找出重复的 id：同一个 id 出现两次，存档和奖励就会认错 */
function duplicates(episodes: Loaded<EpisodeFile>[], what: string, idsOf: (ep: EpisodeFile) => string[]): Problem[] {
  const seen = new Map<string, string>();
  const problems: Problem[] = [];
  for (const { file, data } of episodes) {
    for (const id of idsOf(data)) {
      const first = seen.get(id);
      if (first) problems.push({ file, where: `${what} ${id}`, message: `这个 id 重复了（${first} 里已经有一个）` });
      else seen.set(id, file);
    }
  }
  return problems;
}

/** 奖励里提到的信物、姿态、彩窗碎片、经文都要存在；每一片彩窗都要有一个节点发出来 */
function checkRewards(episodes: Loaded<EpisodeFile>[]): Problem[] {
  const all = episodes.map((e) => e.data);
  const relics = new Set(all.flatMap((ep) => ep.relics.map((r) => r.id)));
  const gestures = new Set(all.flatMap((ep) => ep.gestures.map((g) => g.id)));
  const windows = new Map(all.map((ep) => [ep.window.id, ep.window]));
  const verses = new Set(all.flatMap((ep) => ep.beats.flatMap((b) => b.lines.map((line) => line.ref))));
  const given = new Set<string>();
  const problems: Problem[] = [];
  for (const { file, data } of episodes) {
    data.beats.forEach((b, i) => b.rewards.forEach((r, j) => {
      const where = `beats[${i}]（${b.id}）.rewards[${j}]`;
      const bad = (message: string): void => { problems.push({ file, where, message }); };
      if (r.type === 'relic' && !relics.has(r.id)) bad(`没有 ${r.id} 这件信物（relics 里找不到）`);
      if (r.type === 'gesture' && !gestures.has(r.id)) bad(`没有 ${r.id} 这个姿态（gestures 里找不到）`);
      if (r.type === 'verse' && !verses.has(r.ref)) bad(`剧情里没有出处是 ${r.ref} 的那一行经文`);
      if (r.type === 'piece') {
        const w = windows.get(r.win);
        if (!w) bad(`没有 ${r.win} 这扇彩窗`);
        else if (r.i >= w.pieces.length) bad(`彩窗 ${r.win} 只有 ${w.pieces.length} 片（i 从 0 数起），没有第 ${r.i} 片`);
        else given.add(`${r.win}#${r.i}`);
      }
    }));
  }
  for (const { file, data } of episodes) {
    data.window.pieces.forEach((_, i) => {
      if (!given.has(`${data.window.id}#${i}`)) {
        problems.push({ file, where: `window.pieces[${i}]`, message: '没有哪个节点的奖励发这一片，玩家永远集不齐' });
      }
    });
  }
  return problems;
}

/** 界面文字和章节内容之间：书卷名、信物的提示、操作提示 */
function checkUiLinks(episodes: Loaded<EpisodeFile>[], ui: Loaded<UiFile>): Problem[] {
  const problems: Problem[] = [];
  const books = ui.data.books;
  for (const { file, data } of episodes) {
    for (const [where, ref] of refsIn(data)) {
      if (!books[bookOf(ref)]) {
        problems.push({ file, where, message: `${ui.file} 的 books 里没有 ${bookOf(ref)} 这卷书（出处 ${ref}），要先加上书卷名` });
      }
    }
  }
  const verse = ui.data.titleVerse;
  if (verse.kind !== 'scripture') problems.push({ file: ui.file, where: 'titleVerse.kind', message: '开始页上的这一节是经文，kind 要写 scripture' });
  if (verse.ref && !books[bookOf(verse.ref)]) problems.push({ file: ui.file, where: 'titleVerse.ref', message: `books 里没有 ${bookOf(verse.ref)} 这卷书` });

  const relics = new Set(episodes.flatMap((e) => e.data.relics.map((r) => r.id)));
  for (const id of relics) {
    if (!ui.data.game.relicHint[id]) problems.push({ file: ui.file, where: `game.relicHint.${id}`, message: `信物 ${id} 还没有写“没找到时”的提示` });
  }
  for (const id of Object.keys(ui.data.game.relicHint)) {
    if (!relics.has(id)) problems.push({ file: ui.file, where: `game.relicHint.${id}`, message: `没有 ${id} 这件信物（是不是改过 id？）` });
  }
  const beats = new Set(episodes.flatMap((e) => e.data.beats.map((b) => b.id)));
  for (const id of Object.keys(ui.data.hints)) {
    if (!beats.has(id)) problems.push({ file: ui.file, where: `hints.${id}`, message: `没有 ${id} 这个剧情节点（是不是改过 id？）` });
  }
  return problems;
}

/** 第 2 步：文件之间对不对得上。要等形状都对了才能查 */
export function checkLinks(episodes: Loaded<EpisodeFile>[], ui: Loaded<UiFile>): Problem[] {
  return [
    ...duplicates(episodes, '章节', (ep) => [ep.id]),
    ...duplicates(episodes, '第几章 n =', (ep) => [String(ep.n)]),
    ...duplicates(episodes, '节点', (ep) => ep.beats.map((b) => b.id)),
    ...duplicates(episodes, '陶片', (ep) => ep.cards.map((c) => c.id)),
    ...duplicates(episodes, '信物', (ep) => ep.relics.map((r) => r.id)),
    ...duplicates(episodes, '姿态', (ep) => ep.gestures.map((g) => g.id)),
    ...duplicates(episodes, '彩窗', (ep) => [ep.window.id]),
    ...checkRewards(episodes),
    ...checkUiLinks(episodes, ui),
  ];
}

/** 把全部内容检查一遍。返回问题的清单；清单是空的就是全部通过 */
export function validateContent(episodes: Loaded[], ui: Loaded): Problem[] {
  const shape = [...episodes.flatMap((e) => checkShape(EpisodeSchema, e)), ...checkShape(UiSchema, ui)];
  if (shape.length) return shape;
  return checkLinks(episodes as Loaded<EpisodeFile>[], ui as Loaded<UiFile>);
}

/** 还没补上的经文：照 AGENTS.md 第 1 条，缺经文时写 TODO(经文)，这里把它们找出来提醒人工补 */
export function findTodos(files: Loaded[]): Problem[] {
  const found: Problem[] = [];
  const walk = (file: string, value: unknown, path: PropertyKey[], root: unknown): void => {
    if (typeof value === 'string' && value.includes('TODO')) found.push({ file, where: locate(root, path).where, message: value });
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(file, child, [...path, Array.isArray(value) ? Number(key) : key], root);
    }
  };
  for (const { file, data } of files) walk(file, data, [], data);
  return found;
}
