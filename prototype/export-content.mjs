// 把 src/content.js 导出成 content/episodes/*.json（Codex 做 M0 时会改成直接读 JSON）
// 用法：node export-content.mjs ../content/episodes
import fs from 'fs';
import { EPISODES, BEATS, CARDS, RELICS, WINDOWS, GESTURES, ANIMAL_NAMES, RIVER_NAMES } from './src/content.js';
const out = process.argv[2] || 'content-export';
fs.mkdirSync(out, { recursive: true });
const eps = [
  { id: 'gen-01-creation', key: 'creation', relics: ['first-light'], gestures: ['rest'], range: 'Gen 1:1–2:3',
    era: { book: { en: 'Genesis', zh: '创世记' }, label: { en: 'Before the first day', zh: '创世之初' }, yearAM: 0 } },
  { id: 'gen-02-eden', key: 'eden', relics: ['onyx'], gestures: ['name'], range: 'Gen 2:4–3:1',
    era: { book: { en: 'Genesis', zh: '创世记' }, label: { en: 'A garden in the east', zh: '东方的园子' }, yearAM: 0 } },
];
for (const e of eps) {
  const data = {
    id: e.id, title: EPISODES[e.key].title, range: e.range, era: e.era,
    scripture: { en: 'ESV (English Standard Version, © Crossway)', zh: '和合本（新标点和合本，神版）' },
    note: '所有给玩家看的文字都是 { en, zh }。at 是地图上的 [x, z] 坐标（x 向东，z 向南）；r 是触发半径；fx 是剧情效果名；kind: scripture 经文 / history 考据 / imagination 游戏想象 / reflection 思考；ref 写成 Gen 1:3',
    beats: BEATS.filter(b => b.ep === e.key).map(b => ({ id: b.id, at: b.at, r: b.r || 2.6, hud: b.hud,
      lines: b.lines.map(l => ({ kind: l.k, ...(l.ref ? { ref: l.ref } : {}), text: l.t, ...(l.fx ? { fx: l.fx } : {}) })),
      rewards: b.rewards || [], ...(b.after ? { after: b.after } : {}) })),
    cards: CARDS.filter(c => c.ep === e.key).map(c => ({ id: c.id, kind: c.k, title: c.title, text: c.text, at: c.at, ...(c.onPath ? { onPath: true } : {}) })),
    relics: e.relics.map(id => { const r = RELICS[id]; return { id, name: r.name, ref: r.ref, kind: r.k, desc: r.desc }; }),
    window: { id: e.key, ...WINDOWS[e.key] },
    gestures: e.gestures.map(id => ({ id, ...GESTURES[id] })),
    ...(e.key === 'eden' ? { animalNames: ANIMAL_NAMES, riverNames: RIVER_NAMES } : {}),
  };
  fs.writeFileSync(`${out}/${e.id}.json`, JSON.stringify(data, null, 2) + '\n');
  console.log(e.id, data.beats.length, 'beats', data.cards.length, 'cards');
}
