// 检查 content/timeline.json 和 content/home-ui.json 有没有写错。
// 改完数据后运行 `npm run validate`；`npm run build` 也会先跑这一步，有错就不打包。
import fs from 'fs';

const read = name => JSON.parse(fs.readFileSync(new URL('../content/' + name, import.meta.url), 'utf8'));
const T = read('timeline.json'), UI = read('home-ui.json');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const isBi = t => t && typeof t.en === 'string' && t.en.trim() && typeof t.zh === 'string' && t.zh.trim();

/* ---------- 季 ---------- */
check(T.seasons.length === 12, `应该有 12 季，现在是 ${T.seasons.length}`);
T.seasons.forEach((s, i) => { check(s.n === i + 1, `第 ${i + 1} 个季的 n 写成了 ${s.n}`); check(isBi(s.name) && isBi(s.span), `第 ${s.n} 季缺少中英文名字或年代`); });

/* ---------- 地图 ---------- */
const mapIds = new Set(T.maps.map(m => m.id));
const regionIds = new Set(T.regions.map(r => r.id));
check(T.maps.length === 41, `应该有 41 张地图，现在是 ${T.maps.length}`);
check(mapIds.size === T.maps.length, '地图的 id 有重复');
const inBox = (lat, lon) => lat > 6 && lat < 60 && lon > 0 && lon < 62;
T.maps.forEach((m, i) => {
  check(m.n === i + 1, `地图 ${m.id} 的编号 n 应该是 ${i + 1}`);
  check(isBi(m.name) && isBi(m.modern), `地图 ${m.id} 缺少中英文名字或“今天在哪里”`);
  check(regionIds.has(m.region), `地图 ${m.id} 的 region“${m.region}”不存在`);
  check((m.lat === null && m.lon === null) || inBox(m.lat, m.lon), `地图 ${m.id} 的经纬度不在底图范围里`);
  if (m.label) check(isBi(m.label), `地图 ${m.id} 的 label 不完整`);
  (m.also || []).forEach(a => check(isBi(a.name) && inBox(a.lat, a.lon), `地图 ${m.id} 的附属地点“${a.name?.zh}”有问题`));
});

/* ---------- 书卷 ---------- */
const ids = new Set(T.books.map(b => b.id));
check(T.books.length === 66, `应该有 66 卷书，现在是 ${T.books.length}`);
check(ids.size === T.books.length, '书卷的 id 有重复');
const count = f => T.books.filter(f).length;
check(count(b => b.type === 'trunk') === 12, `主线应该是 12 卷，现在是 ${count(b => b.type === 'trunk')}`);
check(count(b => b.type === 'parallel') === 6, `并行应该是 6 卷，现在是 ${count(b => b.type === 'parallel')}`);
check(count(b => b.type === 'insert') === 48, `插入应该是 48 卷，现在是 ${count(b => b.type === 'insert')}`);
check(count(b => b.testament === 'OT') === 39 && count(b => b.testament === 'NT') === 27, '旧约应该 39 卷，新约 27 卷');
const used = new Set();
let lastSeason = 1;
for (const b of T.books) {
  check(isBi(b.name) && isBi(b.abbr), `${b.id} 缺少中英文书名或简称`);
  check(Number.isInteger(b.season) && b.season >= 1 && b.season <= 12, `${b.id} 的 season 不对`);
  check(b.season >= lastSeason, `${b.id} 排在了比它晚的季后面（books 要按时间之河的顺序排）`); lastSeason = Math.max(lastSeason, b.season);
  check(['L', 'M', 'S'].includes(b.size), `${b.id} 的 size 只能是 L、M、S`);
  check(b.when ? isBi(b.when) : Number.isInteger(b.start), `${b.id} 没有年代：写 start/end，或写 when`);
  check(b.start == null || b.end == null || b.start <= b.end, `${b.id} 的 start 比 end 晚`);
  if (b.type !== 'trunk') check(isBi(b.anchor), `${b.id} 不是主线，需要写 anchor（挂在主线的哪里）`);
  if (b.beside) check(ids.has(b.beside), `${b.id} 的 beside“${b.beside}”不存在`);
  if (b.note) check(isBi(b.note), `${b.id} 的 note 不完整`);
  (b.parts || []).forEach(p => check(p.season >= 1 && p.season <= 12 && p.ch, `${b.id} 的 parts 有问题`));
  for (const m of b.maps) { check(mapIds.has(m), `${b.id} 用到的地图“${m}”不存在`); used.add(m); }
  if (b.play) check(isBi(b.play.title) && b.play.url && b.play.beats > 0, `${b.id} 的 play 不完整`);
  if (b.play?.chapters) {
    // 各章的段数加起来要等于整卷的段数，每一段只属于一章
    const all = b.play.chapters.flatMap(c => c.beats || []);
    check(all.length === b.play.beats && new Set(all).size === all.length, `${b.id} 的 play.chapters 里的段数和 play.beats 对不上`);
    b.play.chapters.forEach((c, i) => check(c.n === i + 1 && isBi(c.title) && isBi(c.ref) && c.beats?.length > 0, `${b.id} 的第 ${i + 1} 章不完整`));
  }
}
for (const m of T.maps) check(used.has(m.id), `地图 ${m.id} 没有任何书卷用到`);

(T.seas || []).forEach(s => check(isBi(s.name) && inBox(s.lat, s.lon), 'seas 里有一条不完整'));

/* ---------- 耶路撒冷的十个时代 ---------- */
check(T.jerusalemEras.length === 10, '耶路撒冷应该有 10 个时代');
T.jerusalemEras.forEach(e => check(isBi(e.name) && isBi(e.when) && isBi(e.refs), `耶路撒冷第 ${e.n} 个时代不完整`));

/* ---------- 界面文字 ---------- */
const walk = (o, path) => { for (const [k, v] of Object.entries(o)) { if (k === 'about') continue; if (v && typeof v === 'object' && !('en' in v)) walk(v, path + k + '.'); else check(isBi(v), `home-ui.json 的 ${path + k} 缺少 en 或 zh`); } };
walk(UI, '');

if (errors.length) { console.error('数据有 ' + errors.length + ' 处问题：\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`数据检查通过：12 季，66 卷（主线 12、并行 6、插入 48），41 张地图，耶路撒冷 10 个时代。`);
