// 检查内容：content/ 下的 JSON 有没有写错。npm run validate:content 用的就是这里的函数。
// 分两步：先照 schema.ts 的规则检查每个文件自己（字段全不全、种类对不对）；
// 再检查文件之间对不对得上（奖励里提到的信物存在吗、效果名代码里有吗……）。
// 这里只有计算，不读文件、不碰画面，所以可以写测试（见 check.test.ts）。
import { z } from 'zod';
import { fillPageText } from './page-text';
import { bookOf } from './refs';
import { EpisodeFileSchema, KINDS, UiFileSchema } from './schema';
import { findScripture, sourceText, type Source } from './scripture';
import type { EpisodeFile, UiFile } from './types';

/** 一个问题：在哪个文件、哪一项、怎么了 */
export interface Problem { file: string; where: string; message: string }

/** 要检查的东西：文件名 → 读出来的 JSON */
export interface ContentInput {
  episodes: Record<string, unknown>;
  ui: { file: string; data: unknown };
  /** index.html 的内容（检查里面的占位符在 ui.json 里都找得到）；不给就不查 */
  pageHtml?: string;
  /** 代码里实现了的效果名 */
  effectNames: readonly string[];
  /** 经文的原文（英文 BSB、中文和合本，见 scripture.ts）；不给就不核对 */
  sources?: Source[];
}

// —— 把 zod 报的错变成初学者看得懂的话 ——

/**
 * 把“路径”写成人话：['beats', 2, 'lines', 0, 'kind'] → beats › day2 › lines › 第 1 行 › kind
 * 数组里的东西如果有 id，就用 id 来指它，这样好找；没有 id 的就数它是第几个。
 */
const COUNT_WORD: Record<string, string> = { lines: '行', pieces: '片' };

function describePath(data: unknown, path: ReadonlyArray<PropertyKey>): string {
  const parts: string[] = [];
  let node: unknown = data, listName = '';
  for (const key of path) {
    const next: unknown = node !== null && typeof node === 'object' ? (node as Record<PropertyKey, unknown>)[key] : undefined;
    if (typeof key === 'number') {
      const id = next !== null && typeof next === 'object' ? (next as { id?: unknown }).id : undefined;
      parts.push(typeof id === 'string' ? id : `第 ${key + 1} ${COUNT_WORD[listName] ?? '项'}`);
    } else {
      parts.push(String(key));
      listName = String(key);
    }
    node = next;
  }
  return parts.length ? parts.join(' › ') : '（整个文件）';
}

/** 一条 zod 的错误 → 一句中文 */
function describeIssue(issue: z.core.$ZodIssue, data: unknown): string {
  const last = issue.path[issue.path.length - 1];
  let value: unknown = data;
  for (const key of issue.path) value = value !== null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined;
  const shown = value === undefined ? '没有写' : `现在是 ${JSON.stringify(value)}`;
  if (issue.code === 'invalid_value' && last === 'kind') return `kind 只能是 ${KINDS.join(' / ')} 之一，${shown}`;
  if (issue.code === 'invalid_type' && value === undefined && (last === 'en' || last === 'zh')) {
    return `缺少${last === 'en' ? '英文（en）' : '中文（zh）'}：每段文字都要写成 { "en": "...", "zh": "..." }`;
  }
  if (issue.code === 'invalid_type' && value === undefined) return `缺少 ${String(last)} 这一项`;
  if (issue.code === 'too_small' && typeof value === 'string') return `${String(last)} 是空的，要写上文字`;
  if (issue.code === 'unrecognized_keys') return `有不认识的名字：${issue.keys.join('、')}（是不是拼错了？）`;
  return `${issue.message}（${shown}）`;
}

function schemaProblems(file: string, schema: z.ZodType, data: unknown): Problem[] {
  const result = schema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({ file, where: describePath(data, issue.path), message: describeIssue(issue, data) }));
}

// —— 文件之间对不对得上 ——

/** 找出重复的名字 */
function duplicates(names: string[]): string[] {
  return [...new Set(names.filter((name, i) => names.indexOf(name) !== i))];
}

function crossProblems(episodes: Array<{ file: string; data: EpisodeFile }>, uiFile: string, ui: UiFile, effectNames: readonly string[]): Problem[] {
  const problems: Problem[] = [];
  const add = (file: string, where: string, message: string): void => { problems.push({ file, where, message }); };

  const all = <T>(pick: (e: EpisodeFile) => T[]): T[] => episodes.flatMap((e) => pick(e.data));
  const relicIds = all((e) => e.relics.map((r) => r.id));
  const gestureIds = all((e) => e.gestures.map((g) => g.id));
  const windows = new Map(episodes.map((e) => [e.data.window.id, e.data.window]));
  const verseRefs = new Set(all((e) => e.beats.flatMap((b) => b.lines.filter((l) => l.kind === 'scripture').map((l) => l.ref))));

  // 名字不能重复（存档里是靠名字记的）
  const unique = (what: string, names: string[]): void => {
    for (const name of duplicates(names)) add('content/episodes/', what, `"${name}" 出现了不止一次，名字不能重复`);
  };
  unique('剧情节点的 id', all((e) => e.beats.map((b) => b.id)));
  unique('陶片的 id', all((e) => e.cards.map((c) => c.id)));
  unique('信物的 id', relicIds);
  unique('姿态的 id', gestureIds);
  unique('姿态的按键 key', all((e) => e.gestures.map((g) => g.key)));
  unique('彩窗的 id', episodes.map((e) => e.data.window.id));
  unique('章节的编号 chapter', episodes.map((e) => String(e.data.chapter)));

  /** 出处里的书卷缩写要在 ui.json 的 books 里登记过 */
  const checkBook = (file: string, where: string, ref: string | undefined): void => {
    if (ref && !ui.books[bookOf(ref)]) add(file, where, `出处 "${ref}" 里的书卷缩写 "${bookOf(ref)}" 还没有登记：请在 ${uiFile} 的 books 里加上它`);
  };

  for (const { file, data } of episodes) {
    checkBook(file, 'range', data.range);
    checkBook(file, 'hudRef', data.hudRef);
    checkBook(file, 'window › ref', data.window.ref);
    for (const relic of data.relics) {
      checkBook(file, `relics › ${relic.id} › ref`, relic.ref);
      if (!ui.text.relicHint[relic.id]) add(uiFile, `text › relicHint › ${relic.id}`, `信物 "${relic.id}" 还没有写“没找到时的提示”`);
    }
    for (const beat of data.beats) {
      const here = `beats › ${beat.id}`;
      checkBook(file, `${here} › hud › book`, beat.hud.book);
      beat.lines.forEach((line, i) => {
        checkBook(file, `${here} › lines › 第 ${i + 1} 行 › ref`, line.ref);
        if (line.fx && !effectNames.includes(line.fx)) add(file, `${here} › lines › 第 ${i + 1} 行 › fx`, `效果 "${line.fx}" 代码里还没有（现有的效果：${effectNames.join('、')}）`);
      });
      if (beat.after && !effectNames.includes(beat.after)) add(file, `${here} › after`, `效果 "${beat.after}" 代码里还没有（现有的效果：${effectNames.join('、')}）`);
      beat.rewards.forEach((reward, i) => {
        const at = `${here} › rewards › 第 ${i + 1} 项`;
        if (reward.type === 'relic' && !relicIds.includes(reward.id)) add(file, at, `信物 "${reward.id}" 不存在（哪一章的 relics 里都没有它）`);
        if (reward.type === 'gesture' && !gestureIds.includes(reward.id)) add(file, at, `姿态 "${reward.id}" 不存在（哪一章的 gestures 里都没有它）`);
        if (reward.type === 'verse' && !verseRefs.has(reward.ref)) add(file, at, `经文 "${reward.ref}" 在剧情里找不到：奖励的经文要和某一行字幕的 ref 写得一模一样`);
        if (reward.type === 'piece') {
          const w = windows.get(reward.win);
          if (!w) add(file, at, `彩窗 "${reward.win}" 不存在`);
          else if (reward.i >= w.pieces.length) add(file, at, `彩窗 "${reward.win}" 只有 ${w.pieces.length} 片（从 0 数到 ${w.pieces.length - 1}），没有第 ${reward.i} 片`);
        }
      });
    }
    // 每一片彩窗都要有一个节点发出来，不然永远集不齐
    data.window.pieces.forEach((_, i) => {
      const given = episodes.some((e) => e.data.beats.some((b) => b.rewards.some((r) => r.type === 'piece' && r.win === data.window.id && r.i === i)));
      if (!given) add(file, `window › pieces › 第 ${i + 1} 片`, '没有哪个剧情节点把这一片发给玩家，这扇彩窗永远集不齐');
    });
  }
  return problems;
}

/** 每一行经文的英文、中文都要和原文一模一样（AGENTS.md 第 1 条：经文一字不改） */
function scriptureProblems(file: string, data: unknown, sources: Source[]): Problem[] {
  const problems: Problem[] = [];
  for (const { where, line } of findScripture(data)) {
    for (const source of sources) {
      const lang = source.lang === 'en' ? '英文' : '中文';
      try {
        if (line.text[source.lang] !== sourceText(source, line.ref)) {
          problems.push({ file, where, message: `${line.ref} 的${lang}和 ${source.label} 原文不一样。运行 npm run fill:scripture 会照原文填好` });
        }
      } catch (e) {
        problems.push({ file, where, message: (e as Error).message });
      }
    }
  }
  return problems;
}

/** 检查全部内容，返回发现的问题；一个问题都没有就是空的 */
export function checkContent(input: ContentInput): Problem[] {
  z.config(z.locales.zhCN()); // 兜底的错误信息也用中文
  const problems: Problem[] = [];
  for (const [file, data] of Object.entries(input.episodes)) problems.push(...schemaProblems(file, EpisodeFileSchema, data));
  problems.push(...schemaProblems(input.ui.file, UiFileSchema, input.ui.data));
  // 每个文件自己都对了，才检查文件之间对不对得上（不然会报出一堆连带的错）
  if (problems.length) return problems;

  const episodes = Object.entries(input.episodes).map(([file, data]) => ({ file, data: data as EpisodeFile }));
  const ui = input.ui.data as UiFile;
  problems.push(...crossProblems(episodes, input.ui.file, ui, input.effectNames));
  // 带着 TODO 的内容不能进游戏（AGENTS.md 第 1 条）
  for (const { file, data } of [...episodes, { file: input.ui.file, data: ui }]) {
    const count = (JSON.stringify(data).match(/TODO\(/g) ?? []).length;
    if (count) problems.push({ file, where: '（整个文件）', message: `还有 ${count} 处 TODO 没有补上，补完才能进游戏` });
  }
  if (input.sources) {
    for (const { file, data } of [...episodes, { file: input.ui.file, data: ui }]) problems.push(...scriptureProblems(file, data, input.sources));
  }
  if (input.pageHtml !== undefined) {
    try { fillPageText(input.pageHtml, ui); } catch (e) { problems.push({ file: 'index.html', where: '占位符', message: (e as Error).message }); }
  }
  return problems;
}

/** 把一个问题写成一行 */
export const formatProblem = (p: Problem): string => `✗ ${p.file} › ${p.where}\n    ${p.message}`;
