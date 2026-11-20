// 生成主页底图：把 Natural Earth（公有领域）的 1:5000 万陆地轮廓裁到“罗马—书珊”这一块，
// 化简后存成 src/basemap.json。底图很少需要重做，所以结果直接提交进仓库；
// 想改范围或精细程度时，改下面的常数，再运行 `npm run basemap`。
import fs from 'fs';
import { createRequire } from 'module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/land-50m.json');

/* ---------- 投影：等距圆柱，按北纬 34° 压缩经度（以色列一带形状最准） ---------- */
export const PROJ = { lon0: 9, lat0: 45.5, kx: +(Math.cos(34 * Math.PI / 180) * 30).toFixed(3), ky: 30 };
const px = lon => (lon - PROJ.lon0) * PROJ.kx;
const py = lat => (PROJ.lat0 - lat) * PROJ.ky;
const r1 = n => Math.round(n * 10) / 10;

/* ---------- 裁剪范围：比“全图”大很多，这样手机竖屏时上下也有陆地可看，裁剪产生的直边落在画面外 ---------- */
const CLIP = { w: -8, e: 80, s: 2, n: 62 }; // 东边多留一些：宽屏上右边有卡片，地图要能往左让
export const VIEW = { w: 9, e: 51, s: 22.5, n: 45.5 };

// Sutherland–Hodgman：把一个环裁到矩形里
function clipRing(ring) {
  const edges = [
    [p => p[0] >= CLIP.w, (a, b) => [CLIP.w, a[1] + (b[1] - a[1]) * (CLIP.w - a[0]) / (b[0] - a[0])]],
    [p => p[0] <= CLIP.e, (a, b) => [CLIP.e, a[1] + (b[1] - a[1]) * (CLIP.e - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= CLIP.s, (a, b) => [a[0] + (b[0] - a[0]) * (CLIP.s - a[1]) / (b[1] - a[1]), CLIP.s]],
    [p => p[1] <= CLIP.n, (a, b) => [a[0] + (b[0] - a[0]) * (CLIP.n - a[1]) / (b[1] - a[1]), CLIP.n]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = src[(i + 1) % src.length], ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    if (!out.length) return [];
  }
  return out;
}

// Douglas–Peucker 化简；以色列一带留得细一些，因为主页可以放大到那里
const inView = p => p[0] > VIEW.w && p[0] < VIEW.e && p[1] > VIEW.s && p[1] < VIEW.n;
const tolAt = p => (p[0] > 33 && p[0] < 37.5 && p[1] > 28.5 && p[1] < 34.5) ? 0.008 : inView(p) ? 0.03 : 0.12;
function simplify(pts) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop(); if (j - i < 2) continue;
    const a = pts[i], b = pts[j], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    let worst = -1, wd = 0;
    for (let k = i + 1; k < j; k++) {
      // 点到线段 a–b 的距离；环的首尾是同一个点（len = 0），这时改用到 a 的距离
      const raw = len > 1e-9 ? Math.abs((pts[k][0] - a[0]) * dy - (pts[k][1] - a[1]) * dx) / len : Math.hypot(pts[k][0] - a[0], pts[k][1] - a[1]);
      const d = raw / (tolAt(pts[k]) / 0.03);
      if (d > wd) { wd = d; worst = k; }
    }
    if (wd > 0.03) { keep[worst] = 1; stack.push([i, worst], [worst, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const land = feature(topo, topo.objects.land);
let d = '', points = 0, rings = 0;
for (const f of land.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) for (const ring of poly) {
    // 环首尾是同一个点，先去掉最后一个再裁剪
    const c = clipRing(ring.slice(0, -1)); if (c.length < 3) continue;
    // 太小的岛（不到约 12 公里）在这个比例下只是噪点，去掉
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    const small = inView([(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2]) ? 0.12 : 0.9; // 画面外的小岛直接不要
    if (Math.max(...xs) - Math.min(...xs) < small && Math.max(...ys) - Math.min(...ys) < small) continue;
    const s = simplify([...c, c[0]]).slice(0, -1); if (s.length < 3) continue;
    d += 'M' + s.map(p => r1(px(p[0])) + ' ' + r1(py(p[1]))).join('L') + 'Z';
    points += s.length; rings++;
  }
}

/* ---------- 河与湖：手工描的简化线（经度, 纬度），够主页用 ---------- */
const line = pts => 'M' + pts.map(p => r1(px(p[0])) + ' ' + r1(py(p[1]))).join('L');
const RIVERS = {
  nile: [[32.9, 24.09], [32.65, 25.7], [32.72, 26.16], [31.9, 26.4], [31.7, 26.56], [31.18, 27.18], [30.75, 28.09], [31.1, 29.07], [31.23, 30.05], [31.13, 30.3]],
  nileWest: [[31.13, 30.3], [30.8, 30.75], [30.37, 31.46]],
  nileEast: [[31.13, 30.3], [31.3, 30.75], [31.82, 31.42]],
  euphrates: [[38.8, 38.4], [38.3, 37.6], [38.0, 37.0], [38.3, 36.2], [39.0, 35.9], [40.15, 35.33], [40.9, 34.45], [42.4, 34.1], [43.3, 33.4], [44.3, 32.6], [44.42, 32.3], [45.3, 31.3], [46.25, 31.05], [47.43, 31.0]],
  tigris: [[39.7, 38.3], [40.2, 37.9], [41.4, 37.55], [42.2, 37.3], [43.13, 36.34], [43.5, 35.3], [43.7, 34.6], [43.9, 34.2], [44.4, 33.3], [45.8, 32.5], [47.15, 31.85], [47.43, 31.0]],
  shatt: [[47.43, 31.0], [47.8, 30.5], [48.5, 30.0]],
  jordanUpper: [[35.65, 33.25], [35.62, 33.05], [35.62, 32.9]],
  jordan: [[35.575, 32.71], [35.56, 32.5], [35.57, 32.3], [35.54, 32.1], [35.55, 31.9], [35.55, 31.77]],
};
// 湖：用一圈点描出来（经度, 纬度）
const LAKES = {
  galilee: [[35.6, 32.9], [35.64, 32.85], [35.645, 32.79], [35.61, 32.72], [35.575, 32.71], [35.55, 32.75], [35.525, 32.8], [35.53, 32.86], [35.57, 32.9]],
  deadSea: [[35.55, 31.76], [35.57, 31.6], [35.56, 31.4], [35.5, 31.25], [35.42, 31.08], [35.38, 31.12], [35.4, 31.3], [35.39, 31.5], [35.44, 31.68], [35.5, 31.77]],
};

const box = (w, e, s, n) => ({ x: r1(px(w)), y: r1(py(n)), w: r1(px(e) - px(w)), h: r1(py(s) - py(n)) });
const out = {
  note: '由 tools/make-basemap.mjs 生成，不要手改。陆地轮廓来自 Natural Earth（公有领域）。',
  proj: PROJ,
  // 三个方框（单位都是投影后的坐标）：bounds 是底图的边界，world 是“全图”，israel 是“以色列地”
  bounds: box(CLIP.w + 0.5, CLIP.e - 0.5, CLIP.s + 0.5, CLIP.n - 0.5),
  world: box(10.5, 50, 26.5, 43.5),
  israel: box(34.0, 36.3, 29.9, 33.5),
  land: d,
  rivers: Object.values(RIVERS).map(line).join(''),
  lakes: Object.values(LAKES).map(p => line(p) + 'Z').join(''),
};
fs.writeFileSync(new URL('../src/basemap.json', import.meta.url), JSON.stringify(out));
console.log(`basemap.json：${rings} 个环，${points} 个点，${(JSON.stringify(out).length / 1024).toFixed(1)} KB`);
