// 数一数游戏里用了多少节 ESV 经文（Crossway 标准使用指引：不超过 500 节、不超过任何一卷书的一半、
// 不超过作品全部文字的 25%；超过就要先向 Crossway 申请书面许可）。
// 用法：node count-esv.mjs
import * as C from './src/content.js';
const { BEATS, CARDS, RELICS } = C;

const verses = new Set();
for (const b of BEATS) for (const L of b.lines) {
  if (L.k !== 'scripture') continue;
  const [book, cv] = L.ref.split(' '); const [ch, vv] = cv.split(':'); const [a, z] = vv.split('–').map(Number);
  for (let v = a; v <= (z || a); v++) verses.add(`${book} ${ch}:${v}`);
}
// 陶片、信物里提到的出处：如果在英文里直接引用了 ESV 原文，也要算进去
const mentioned = new Set();
const refRe = /(Genesis|Exodus|Deuteronomy|Psalm|Revelation) \d+:\d+(–\d+)?/g;
for (const c of CARDS) for (const m of c.text.en.matchAll(refRe)) mentioned.add(m[0]);
for (const id in RELICS) for (const m of RELICS[id].desc.en.matchAll(refRe)) mentioned.add(m[0]);

// 文字比例：经文英文字数 ÷ 全部英文字数（中文按约 1.5 个字 = 1 个词估算）
const words = s => (s.match(/[A-Za-z’'-]+/g) || []).length;
let esv = 0, en = 0, zh = 0;
const walk = (o, isScripture) => {
  if (!o || typeof o !== 'object') return;
  if (typeof o.en === 'string' && typeof o.zh === 'string') { en += words(o.en); zh += o.zh.length; if (isScripture) esv += words(o.en); return; }
  for (const k in o) walk(o[k], false);
};
for (const b of BEATS) { walk(b.hud); for (const L of b.lines) walk(L.t, L.k === 'scripture'); }
for (const k of ['KIND_LABEL', 'EPISODES', 'CARDS', 'RELICS', 'WINDOWS', 'GESTURES', 'ANIMAL_NAMES', 'RIVER_NAMES', 'HINTS', 'UI']) walk(C[k]);
// （index.html 里写死的标题页、按钮文字没有算进来，所以实际比例会再低一点）
const zhWords = Math.round(zh / 1.5);

console.log(`剧情里的 ESV 经文：${verses.size} 节（上限 500）`);
console.log(`陶片和信物里提到的出处：${[...mentioned].join('、') || '无'}（直接引用了原文的也要算）`);
console.log(`经文占英文文字：${(esv / en * 100).toFixed(1)}%；占中英文全部文字：约 ${(esv / (en + zhWords) * 100).toFixed(1)}%（指引上限 25%）`);
