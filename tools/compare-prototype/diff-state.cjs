// 逐项比较新旧两版的记录，只打印不一样的地方。
const fs = require('fs');
const [device, lang] = process.argv.slice(2);
const load = w => JSON.parse(fs.readFileSync(`${__dirname}/out/${w}-${device}-${lang}/report.json`, 'utf8'));
const a = load('old'), b = load('new');
let diffs = 0, same = 0;
const cmp = (path, x, y) => {
  if (typeof x === 'object' && x && typeof y === 'object' && y) {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) cmp(path + '.' + k, x[k], y[k]);
    return;
  }
  if (typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) < 1e-4) { same++; return; }
  if (x === y) { same++; return; }
  diffs++;
  const s = v => { const t = JSON.stringify(v); return t && t.length > 230 ? t.slice(0, 230) + '…' : t; };
  if (typeof x === 'string' && typeof y === 'string') { let i = 0; while (i < x.length && x[i] === y[i]) i++; console.log(`≠ ${path} (第 ${i} 个字起不同)\n   旧: …${x.slice(Math.max(0, i - 60), i + 120)}\n   新: …${y.slice(Math.max(0, i - 60), i + 120)}`); }
  else console.log(`≠ ${path}\n   旧: ${s(x)}\n   新: ${s(y)}`);
};
cmp('', a.steps, b.steps);
console.log(`${device} ${lang}: 相同 ${same} 项，不同 ${diffs} 项`);
