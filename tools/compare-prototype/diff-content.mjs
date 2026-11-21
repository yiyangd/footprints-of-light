// 逐字比较两版的文字：小样（prototype/src/content.js 和 prototype/src/index.html）
// 和正式工程（content/episodes/*.json、content/ui.json）。经文一个字、一个标点都不能不一样。
// 用法（在仓库最外层）：node tools/compare-prototype/diff-content.mjs
// 小样还在线上（/prologue/）的时候，两边的内容要保持一致：改了一边，另一边也要改，再用它检查。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const proto = await import(pathToFileURL(path.join(root, 'prototype/src/content.js')).href);
const ui = readJson(path.join(root, 'content/ui.json'));
let unexpected = 0;

/** 一项一项地比，把不一样的地方列出来。onlyNew 是“新版多出来也没关系”的字段 */
function diff(oldValue, newValue, where, onlyNew = []) {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
  const bothObjects = oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object';
  if (!bothObjects) return [`${where}\n     小样：${JSON.stringify(oldValue)}\n     新版：${JSON.stringify(newValue)}`];
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  return [...keys].flatMap((key) => {
    if (!(key in oldValue) && onlyNew.includes(key)) return [];
    return diff(oldValue[key], newValue[key], where ? `${where}.${key}` : key);
  });
}
function report(title, differences, note = '') {
  unexpected += differences.length;
  console.log(differences.length ? `✗ ${title}：${differences.length} 处不一样` : `✓ ${title}：逐字一致${note}`);
  for (const d of differences) console.log('   ' + d);
}

// 1. 每一章：让小样把 content.js 导出成 JSON，再和 content/episodes/ 里的比
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'export-'));
execFileSync('node', ['export-content.mjs', tmp], { cwd: path.join(root, 'prototype'), stdio: 'ignore' });
let lines = 0, scripture = 0;
for (const name of fs.readdirSync(tmp).sort()) {
  const fromProto = readJson(path.join(tmp, name));
  const current = readJson(path.join(root, 'content/episodes', name));
  const extra = { n: proto.EPISODES[current.window.id].n, hudBook: proto.EPISODES[current.window.id].book };
  const differences = [...diff(fromProto, current, '', ['n', 'hudBook']), ...diff(extra, { n: current.n, hudBook: current.hudBook }, '')];
  report(`content/episodes/${name}`, differences);
  for (const beat of current.beats) for (const line of beat.lines) { lines++; if (line.kind === 'scripture') scripture++; }
}
fs.rmSync(tmp, { recursive: true });
console.log(`  （一共 ${lines} 行字幕，其中经文 ${scripture} 行）`);

// 2. 界面文字：小样 content.js 里的 UI、HINTS、KIND_LABEL、BOOKS
const added = Object.keys(ui.game).filter((key) => !(key in proto.UI));
report('content/ui.json 的 game、hints、kinds、books', [
  ...diff(proto.UI, ui.game, 'game', added), ...diff(proto.HINTS, ui.hints, 'hints'),
  ...diff(proto.KIND_LABEL, ui.kinds, 'kinds'), ...diff(proto.BOOKS, ui.books, 'books'),
], `（新版多了 ${added.join('、')}）`);

// 3. 页面上的文字：小样把它们直接写在 index.html 里
const html = fs.readFileSync(path.join(root, 'prototype/src/index.html'), 'utf8');
const keycaps = (s) => s.replace(/\[([^\]]+)\]/g, '<kbd>$1</kbd>');
const inProto = (t) => html.includes(`<span class="en">${keycaps(t.en)}</span><span class="zh" lang="zh-CN">${keycaps(t.zh)}</span>`)
  || html.includes(`<span class="en">${keycaps(t.en)}</span><span class="zh blk" lang="zh-CN">${keycaps(t.zh)}</span>`);
const missing = [];
let total = 1;
if (!inProto(ui.titleVerse.text)) missing.push('titleVerse（开始页上的经文）');
for (const [group, texts] of Object.entries(ui.page)) {
  for (const [key, text] of Object.entries(texts)) { total++; if (!inProto(text)) missing.push(`page.${group}.${key}：${text.en} ｜ ${text.zh}`); }
}
for (const [key, text] of Object.entries({ ...ui.aria, esvNotice: ui.game.esvNotice, esvSite: ui.game.esvSite, cuvNotice: ui.game.cuvNotice })) {
  total++; if (!html.includes(text)) missing.push(`${key}：${text}`);
}
// 开始页最下面的版本小字是有意不一样的（小样写“可玩小样 v0.2”）
const expected = missing.filter((m) => m.startsWith('page.start.credit'));
report(`content/ui.json 里搬自 index.html 的 ${total} 条文字（含开始页的经文）`, missing.filter((m) => !expected.includes(m)),
  expected.length ? '（版本小字 page.start.credit 除外，那是有意改的）' : '');

process.exit(unexpected ? 1 : 0);
