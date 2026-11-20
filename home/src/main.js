// 《光之踪迹》主页“光之地图”（游戏目录）
// 上面是一张古代世界地图（41 个地点），下面是一条时间之河（12 季、66 盏灯）。
// 所有内容都来自 content/timeline.json，界面文字来自 content/home-ui.json，这里不写死任何给玩家看的字。
import T from '../../content/timeline.json';
import UI from '../../content/home-ui.json';
import BASE from './basemap.json';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ============================================================================
   1. 双语：和序章同一套做法。每段文字是 { en, zh }，bi() 把它变成两个 <span>。
   ========================================================================== */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function bi(t, cls) {
  if (t == null) return '';
  if (typeof t !== 'object') return esc(t);
  return `<span class="en">${esc(t.en)}</span><span class="zh${cls ? ' ' + cls : ''}" lang="zh-CN">${esc(t.zh)}</span>`;
}
// 把 {n} 这样的占位换成数字
const fill = (t, vars) => ({ en: t.en.replace(/\{(\w+)\}/g, (_, k) => vars[k]), zh: t.zh.replace(/\{(\w+)\}/g, (_, k) => vars[k]) });
const plain = t => (LANG === 'en' ? t.en : t.en + ' ' + t.zh); // 给读屏软件用的纯文字

const LANG_KEY = 'guangzhiyue-lang'; // 和序章共用，选一次两边都记得
let LANG = 'bi';
try { const v = localStorage.getItem(LANG_KEY); if (v === 'en' || v === 'bi') LANG = v; } catch (e) { /* 读不到就用默认 */ }
function setLang(v) {
  LANG = v === 'en' ? 'en' : 'bi';
  document.documentElement.className = 'lang-' + LANG;
  document.title = LANG === 'en' ? UI.docTitle.en : UI.docTitle.zh;
  $('lang-text').textContent = LANG === 'en' ? UI.langShort.en : UI.langShort.zh;
  $('btn-lang').setAttribute('aria-label', `${UI.langLabel.en} ${UI.langLabel.zh}: ${LANG === 'en' ? UI.langName.en : UI.langName.zh}`);
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* 存不了也没关系 */ }
  layoutLabels(); // 地名的宽度变了，重新排一下避免重叠
}

/* ============================================================================
   2. 数据：书卷、地图，和玩家的进度
   ========================================================================== */
const bookById = new Map(T.books.map(b => [b.id, b]));
const mapById = new Map(T.maps.map(m => [m.id, m]));
const seasonOf = n => T.seasons[n - 1];
const booksAt = mapId => T.books.filter(b => b.maps.includes(mapId));

// 进度只存在玩家自己的浏览器里；这里只读序章的存档，看走到了第几段。
function progress(book) {
  if (!book.play) return null;
  let done = 0;
  try { const s = JSON.parse(localStorage.getItem(book.play.saveKey) || 'null'); if (s && Array.isArray(s.done)) done = s.done.length; } catch (e) { /* 没有存档 */ }
  return { done: Math.min(done, book.play.beats), total: book.play.beats };
}
// 一盏灯的四种状态：building 建造中 / ready 可以玩 / started 走了一半 / kindled 点着了
function stateOf(book) {
  const p = progress(book);
  if (!p) return 'building';
  return p.done >= p.total ? 'kindled' : p.done > 0 ? 'started' : 'ready';
}
const walkedMaps = () => new Set(T.books.filter(b => stateOf(b) === 'kindled').flatMap(b => b.play.maps || []));

// 年代：有 when 就直接用，否则用 start/end 拼出来
function whenText(b) {
  if (b.when) return b.when;
  const s = b.start, e = b.end == null ? s : b.end, yEn = y => (y < 0 ? `${-y} BC` : `AD ${y}`), yZh = y => (y < 0 ? `前 ${-y}` : `主后 ${y}`);
  let en, zh;
  if (s === e) { en = yEn(s); zh = yZh(s) + ' 年'; }
  else if (s < 0 && e < 0) { en = `${-s}–${-e} BC`; zh = `前 ${-s}–前 ${-e} 年`; }
  else if (s > 0) { en = `AD ${s}–${e}`; zh = `主后 ${s}–${e} 年`; }
  else { en = `${-s} BC – AD ${e}`; zh = `前 ${-s} 年—主后 ${e} 年`; }
  return { en: (b.circa ? 'c. ' : '') + en, zh: (b.circa ? '约' : '') + zh };
}

/* ============================================================================
   3. 地图：底图 + 地点。坐标先用 basemap.json 里的投影换算。
   ========================================================================== */
const P = BASE.proj, B = BASE.bounds;
const X = lon => (lon - P.lon0) * P.kx, Y = lat => (P.lat0 - lat) * P.ky;
const svg = $('map');
const mapLabel = m => m.label || m.name;
const tspans = t => `<tspan class="en-t">${esc(t.en)}</tspan><tspan class="zh-t" dx="5">${esc(t.zh)}</tspan>`;
const at = (lon, lat) => `style="transform:translate(${X(lon).toFixed(1)}px,${Y(lat).toFixed(1)}px) scale(var(--u))"`;

function renderMap() {
  let h = `<path class="land" fill-rule="evenodd" d="${BASE.land}"/><path class="rivers" d="${BASE.rivers}"/><path class="lakes" d="${BASE.lakes}"/>`;
  h += T.seas.map(s => `<text class="sea-name" x="${X(s.lon)}" y="${Y(s.lat)}" font-size="${s.size}">${tspans(s.name)}</text>`).join(''); // 海的名字，淡淡地写在水面上
  h += '<path class="route" id="route" d=""/>';
  // 附属的小地点（例如“族长之路”上的示剑、伯特利）
  h += '<g id="subs">' + T.maps.flatMap(m => (m.also || []).map((a, i) => `<g class="sub" data-parent="${m.id}" data-i="${i}" data-x="${X(a.lon)}" data-y="${Y(a.lat)}" ${at(a.lon, a.lat)}><circle r="2.4"/><text x="7" y="4">${tspans(a.name)}</text></g>`)).join('') + '</g>';
  // 41 张地图各一个点（伊甸位置不可考，不放在地图上，见左上角的按钮）
  // 耶路撒冷最后画，这样它总在最上面，点得到
  h += '<g id="places">' + T.maps.filter(m => m.lat != null).sort((a, b) => (a.id === 'jerusalem') - (b.id === 'jerusalem')).map(m => {
    const big = m.id === 'jerusalem';
    return `<g class="pl${m.approx ? ' approx' : ''}${big ? ' city' : ''}" data-id="${m.id}" data-x="${X(m.lon)}" data-y="${Y(m.lat)}" tabindex="0" role="button" aria-label="${esc(m.name.en + ' ' + m.name.zh)}" ${at(m.lon, m.lat)}><circle class="hit" r="12"/><circle class="ring" r="9"/><circle class="dot" r="${big ? 6 : 4.6}"/><text x="10" y="4">${tspans(mapLabel(m))}</text></g>`;
  }).join('') + '</g>';
  svg.innerHTML = h;
  svg.setAttribute('aria-label', UI.mapLabel.en + ' ' + UI.mapLabel.zh);
}

/* ---------- 视图：view = 画面中心（投影坐标）和比例 s（每个坐标单位占几个像素） ---------- */
let view = { cx: 0, cy: 0, s: 1 };
const mapSize = () => { const r = svg.getBoundingClientRect(); return { cw: Math.max(50, r.width), ch: Math.max(50, r.height) }; };
function clampView(v) {
  const { cw, ch } = mapSize();
  v.s = clamp(v.s, Math.max(cw / B.w, ch / B.h), 24); // 不能缩到底图外面，也不用放得太大
  const hw = cw / v.s / 2, hh = ch / v.s / 2;
  v.cx = clamp(v.cx, B.x + hw, B.x + B.w - hw); v.cy = clamp(v.cy, B.y + hh, B.y + B.h - hh);
  return v;
}
function applyView() {
  const { cw, ch } = mapSize(), w = cw / view.s, h = ch / view.s;
  svg.setAttribute('viewBox', `${(view.cx - w / 2).toFixed(2)} ${(view.cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  svg.style.setProperty('--u', (1 / view.s).toFixed(4));
}
// 卡片盖住了地图的哪一边，飞过去的时候就让开那一边
function cardPad() {
  const pad = { r: 0, b: 0 }, card = $('card');
  if (card.hidden) return pad;
  const c = card.getBoundingClientRect(), m = svg.getBoundingClientRect();
  if (c.width < m.width * 0.7 && c.left > m.left + m.width * 0.3) pad.r = Math.max(0, m.right - c.left + 8);
  else if (c.top > m.top + m.height * 0.25) pad.b = Math.max(0, m.bottom - c.top + 8);
  return pad;
}
// 算出“正好看见这个方框”的视图
function fitBox(b, margin = 0.86) {
  const { cw, ch } = mapSize(), pad = cardPad(), aw = Math.max(90, cw - pad.r), ah = Math.max(90, ch - pad.b);
  const v = clampView({ cx: 0, cy: 0, s: Math.min(aw / b.w, ah / b.h) * margin });
  v.cx = b.x + b.w / 2 + pad.r / 2 / v.s; v.cy = b.y + b.h / 2 + pad.b / 2 / v.s;
  return clampView(v);
}
let flyRaf = 0;
function fly(to, ms = 800) {
  cancelAnimationFrame(flyRaf);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) ms = 0;
  const from = { ...view }, t0 = performance.now();
  const step = now => {
    const k = ms ? clamp((now - t0) / ms, 0, 1) : 1, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    view = { cx: from.cx + (to.cx - from.cx) * e, cy: from.cy + (to.cy - from.cy) * e, s: from.s * Math.pow(to.s / from.s, e) };
    applyView();
    if (k < 1) flyRaf = requestAnimationFrame(step); else layoutLabels();
  };
  flyRaf = requestAnimationFrame(step);
}
// 把一组点框起来；minSpan 是最小的宽和高（坐标单位），免得只有一个点时放得太大
function boxOf(points, minSpan) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const gx = Math.max(0, minSpan - (x1 - x0)) / 2, gy = Math.max(0, minSpan - (y1 - y0)) / 2;
  x0 -= gx; x1 += gx; y0 -= gy; y1 += gy;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
const pointsOf = (m, withAlso) => (m.lat == null ? [] : [[X(m.lon), Y(m.lat)], ...(withAlso ? (m.also || []).map(a => [X(a.lon), Y(a.lat)]) : [])]);
const inIsrael = m => m.region.startsWith('israel') || m.id === 'moab-nebo';

/* ---------- 地名：按重要程度一个个放，放不下（会重叠）的先不显示 ---------- */
function layoutLabels() {
  if (!svg.firstChild) return;
  const { cw, ch } = mapSize(), w = cw / view.s, h = ch / view.s, x0 = view.cx - w / 2, y0 = view.cy - h / 2;
  const ppd = P.ky * view.s; // 一个纬度占几个像素，用来判断放大到了什么程度
  const hl = highlightedMaps(), selId = sel && sel.kind === 'place' ? sel.id : null;
  const items = [];
  const textW = t => t.en.length * 6.7 + (LANG === 'bi' ? t.zh.length * 12.5 + 6 : 0) + 6;
  for (const g of svg.querySelectorAll('.pl')) {
    const m = mapById.get(g.dataset.id), sx = (g.dataset.x - x0) * view.s, sy = (g.dataset.y - y0) * view.s;
    g.classList.remove('show');
    if (sx < -20 || sy < -20 || sx > cw + 20 || sy > ch + 20) continue;
    const pri = m.id === selId ? 0 : hl.has(m.id) ? 1 : m.id === 'jerusalem' ? 2 : inIsrael(m) ? 4 : 3;
    items.push({ g, sx, sy, w: textW(mapLabel(m)), pri, r: 9 });
  }
  for (const g of svg.querySelectorAll('.sub')) {
    const parent = g.dataset.parent, on = ppd > 70 || parent === selId || (hl.has(parent) && ppd > 26);
    g.classList.toggle('on', on); g.classList.remove('show');
    if (!on) continue;
    const a = mapById.get(parent).also[g.dataset.i];
    const sx = (g.dataset.x - x0) * view.s, sy = (g.dataset.y - y0) * view.s;
    if (sx < -20 || sy < -20 || sx > cw + 20 || sy > ch + 20) continue;
    items.push({ g, sx, sy, w: textW(a.name) - 8, pri: parent === selId ? 1.5 : 5, r: 6 });
  }
  items.sort((a, b) => a.pri - b.pri);
  const over = (r, q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y;
  const dots = items.map(it => ({ x: it.sx - 5, y: it.sy - 5, w: 10, h: 10 })), placed = []; // 圆点也占位置，普通的地名不要盖住别的点
  const hit = (r, strict) => placed.some(q => over(r, q)) || (strict && dots.some(q => over(r, q)));
  for (const it of items) {
    // 四个位置依次试：右、左、下、上。选中的那个地点实在放不下也照样显示在右边
    const opts = [
      { x: it.sx + it.r, y: it.sy - 9, w: it.w, h: 17, a: 'start', tx: it.r + 1, ty: 4 },
      { x: it.sx - it.r - it.w, y: it.sy - 9, w: it.w, h: 17, a: 'end', tx: -(it.r + 1), ty: 4 },
      { x: it.sx - it.w / 2, y: it.sy + it.r - 1, w: it.w, h: 17, a: 'middle', tx: 0, ty: it.r + 12 },
      { x: it.sx - it.w / 2, y: it.sy - it.r - 16, w: it.w, h: 17, a: 'middle', tx: 0, ty: -(it.r + 3) },
    ];
    const use = opts.find(o => o.x > 0 && o.x + o.w < cw && !hit(o, true)) || (it.pri <= 2 && opts.find(o => o.x > 0 && o.x + o.w < cw && !hit(o, false))) || (it.pri < 1 ? opts[0] : null);
    if (!use) continue;
    placed.push(use); it.g.classList.add('show');
    const text = it.g.querySelector('text');
    text.setAttribute('text-anchor', use.a); text.setAttribute('x', use.tx); text.setAttribute('y', use.ty);
  }
}

/* ---------- 拖动、滚轮、两指缩放 ---------- */
function zoomAt(factor, px, py) {
  const { cw, ch } = mapSize(), ux = view.cx + (px - cw / 2) / view.s, uy = view.cy + (py - ch / 2) / view.s;
  const s = clampView({ ...view, s: view.s * factor }).s;
  view = clampView({ s, cx: ux - (px - cw / 2) / s, cy: uy - (py - ch / 2) / s });
  applyView(); scheduleLabels();
}
let labelTimer = 0;
const scheduleLabels = () => { clearTimeout(labelTimer); labelTimer = setTimeout(layoutLabels, 90); };
function initMapInput() {
  const pts = new Map(); let moved = 0, pinch = 0;
  svg.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) moved = 0; pinch = 0; cancelAnimationFrame(flyRaf); });
  svg.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) { if (!svg.classList.contains('drag')) { svg.classList.add('drag'); svg.setPointerCapture(e.pointerId); } view = clampView({ ...view, cx: view.cx - dx / view.s, cy: view.cy - dy / view.s }); applyView(); scheduleLabels(); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = svg.getBoundingClientRect();
      if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = d; moved = 99;
    }
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) svg.classList.remove('drag'); };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  // 点一个地点（拖动之后松手不算点击）
  svg.addEventListener('click', e => { if (moved > 6) return; const g = e.target.closest('.pl'); if (g) select('place', g.dataset.id); });
  svg.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const g = e.target.closest('.pl'); if (g) { e.preventDefault(); select('place', g.dataset.id); } });
  const center = f => { const { cw, ch } = mapSize(), pad = cardPad(); zoomAt(f, (cw - pad.r) / 2, (ch - pad.b) / 2); };
  $('v-in').addEventListener('click', () => center(1.6));
  $('v-out').addEventListener('click', () => center(1 / 1.6));
  $('v-world').addEventListener('click', () => fly(fitBox(BASE.world, 0.98)));
  $('v-israel').addEventListener('click', () => fly(fitBox(BASE.israel, 0.94)));
  $('eden').addEventListener('click', () => select('place', 'eden'));
}

/* ============================================================================
   4. 时间之河：12 季，66 盏灯。主线的灯在河心，并行的灯贴着主线，插入的灯挂在河的两边。
   ========================================================================== */
const LAMP = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="glow" cx="20" cy="15" r="20" fill="url(#lamp-glow)"/><path class="flame" d="M20 3.5c4.5 5.5 5 9 0 15c-5-6-4.5-9.5 0-15z" /><path class="body" d="M5 23c5 6 25 6 30 0c-1 8-7 13-15 13S6 31 5 23z"/></svg>';
let seasonBands = [], lampX = new Map();
function renderRiver() {
  const river = $('river'), inner = $('river-inner'), compact = matchMedia('(max-height: 500px)').matches;
  const H = river.clientHeight || 220;
  const M = compact ? { trunk: 96, gospel: 54, insert: 48, cont: 64, gap: 34, silence: 190, off: 30, par: 25, head: 20, amp: 3, band: 14, k: 0.9 }
    : { trunk: 112, gospel: 66, insert: 58, cont: 78, gap: 48, silence: 240, off: 60, par: 46, head: 22, amp: 6, band: 26, k: 1 };
  const cy = M.head + (H - M.head) / 2 - (compact ? 4 : 8), wave = x => Math.sin(x / 150) * M.amp;
  const headW = s => (20 + s.name.en.length * 6.9 + s.name.zh.length * 12.5 + 14 + s.span.en.length * 6.2 + 30) * M.k; // 季标题大概多宽，保证不压到下一季
  let x = 10, html = '', stems = '', bands = '', stars = '', side = -1;
  seasonBands = []; lampX = new Map();
  const lampHtml = (b, cx, y, cls, label) => {
    const st = stateOf(b);
    return `<button class="lamp ${cls} ${st}" data-book="${b.id}" style="left:${cx.toFixed(1)}px;top:${y.toFixed(1)}px" aria-label="${esc(plain(b.name) + ' — ' + plain(st === 'building' ? UI.building : st === 'kindled' ? UI.done : UI.ready))}">${cls.includes('cont') ? '' : LAMP}<span class="lb">${label}</span></button>`;
  };
  for (const s of T.seasons) {
    const x0 = x; x += M.gap / 2;
    const items = [];
    for (const b of T.books) for (const p of (b.parts || []).slice(1)) if (p.season === s.n) items.push({ b, part: p });
    for (const b of T.books) if (b.season === s.n && !b.beside) items.push({ b });
    if (!items.length) {
      x += M.silence;
      html += `<div class="s-empty" style="left:${(x0 + (x - x0) / 2 + M.gap / 4).toFixed(0)}px;top:${(cy - 30 * M.k).toFixed(0)}px">${bi(s.empty, 'blk')}</div>`;
      for (let i = 0; i < 22; i++) { const r = ((i * 7919) % 97) / 97, q = ((i * 104729) % 89) / 89; stars += `<circle class="star" cx="${(x0 + 12 + r * (x - x0 - 24)).toFixed(0)}" cy="${(M.head + 8 + q * (H - M.head - 16)).toFixed(0)}" r="${(0.5 + ((i * 31) % 10) / 12).toFixed(1)}" opacity="${(0.25 + q * 0.6).toFixed(2)}"/>`; }
    }
    const gospels = [];
    for (const it of items) {
      const b = it.b, center = b.type === 'trunk' || b.finale, gospel = b.group === 'gospels';
      const w = it.part ? M.cont : center ? M.trunk : gospel ? M.gospel : M.insert, cx = x + w / 2, ry = cy + wave(cx);
      x += w;
      if (it.part) { html += lampHtml(b, cx, ry, 'cont mid', bi({ en: `${b.abbr.en} ${it.part.ch}`, zh: `${b.abbr.zh} ${it.part.ch}` })); continue; }
      lampX.set(b.id, cx);
      if (center) html += lampHtml(b, cx, ry, 'trunk mid', bi(b.name));
      else if (gospel) { html += lampHtml(b, cx, ry, 'parallel mid', bi(b.abbr)); gospels.push(cx); }
      else { side = -side; const y = ry + side * M.off; stems += `<line class="stem" x1="${cx}" y1="${ry}" x2="${cx}" y2="${y}"/>`; html += lampHtml(b, cx, y, `insert ${side < 0 ? 'up' : 'down'}`, bi(b.abbr)); }
    }
    if (gospels.length) html += `<div class="g-brace" style="left:${((gospels[0] + gospels[gospels.length - 1]) / 2).toFixed(0)}px;top:${(cy - M.off - 8).toFixed(0)}px">${bi(UI.gospels)}</div>`;
    x += M.gap / 2;
    x = Math.max(x, x0 + headW(s));
    seasonBands.push({ n: s.n, x0, x1: x });
    bands += `<rect class="band${s.n === 9 ? ' dark' : ''}" x="${x0 + 3}" y="0" width="${x - x0 - 6}" height="${H}" rx="10" opacity="${s.n % 2 || s.n === 9 ? 1 : 0}"/>`;
    html += `<div class="s-head" style="left:${x0 + 12}px"><b>${s.n}</b>${bi(s.name)}<small>${esc(s.span.en)}</small></div>`;
  }
  // 贴着主线的并行卷（历代志）：放在它对照的那盏主线灯的正上方
  for (const b of T.books) if (b.beside && lampX.has(b.beside)) { const cx = lampX.get(b.beside); lampX.set(b.id, cx); html += lampHtml(b, cx, cy + wave(cx) - M.par, 'parallel up', bi(b.abbr)); }
  const W = x + 10;
  // 河水：一条轻轻起伏的线；已经点着的那一段铺上金色的脚踪
  const path = to => { let d = ''; for (let px = 0; px <= to; px += 16) d += (px ? 'L' : 'M') + px + ' ' + (cy + wave(px)).toFixed(1); return d; };
  const litX = Math.max(0, ...T.books.filter(b => stateOf(b) === 'kindled').map(b => lampX.get(b.id) || 0));
  inner.style.width = W + 'px';
  inner.innerHTML = `<svg id="river-bg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><radialGradient id="lamp-glow"><stop offset="0" stop-color="#fff2c8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient></defs>${bands}${stars}<path class="water" stroke-width="${M.band}" d="${path(W)}"/><path class="water core" d="${path(W)}"/>${litX ? `<path class="water gold" d="${path(litX)}"/>` : ''}${stems}</svg>` + html;
  $('seasonbar').innerHTML = T.seasons.map(s => `<button class="s-tab" data-season="${s.n}" aria-label="${esc(plain(fill(UI.season, { n: s.n })) + ' ' + plain(s.name))}">${s.n}<span class="nm">${bi(s.name)}</span></button>`).join('') + `<span class="s-hint">${bi(UI.intro)}</span>`;
  syncSeasonTab();
}
function syncSeasonTab() {
  // “现在在第几季”：看河面靠左的位置；滑到最右边就算最后一季
  const river = $('river'), atEnd = river.scrollLeft + river.clientWidth >= river.scrollWidth - 4, mid = river.scrollLeft + Math.min(river.clientWidth / 2, 180);
  const cur = atEnd ? seasonBands.length : (seasonBands.find(b => mid >= b.x0 && mid < b.x1) || seasonBands[0] || {}).n;
  for (const t of $('seasonbar').querySelectorAll('.s-tab')) { const on = +t.dataset.season === cur; if (on !== (t.getAttribute('aria-current') === 'true')) { t.setAttribute('aria-current', on); if (on) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
}
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
function scrollRiverTo(x) { const river = $('river'); river.scrollTo({ left: Math.max(0, x - river.clientWidth / 2), behavior: smooth() }); }
function initRiverInput() {
  const river = $('river'); let down = null, moved = 0, raf = 0;
  river.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncSeasonTab(); }); });
  // 鼠标可以按住拖动；触屏本来就能滑
  river.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { down = { x: e.clientX, left: river.scrollLeft }; moved = 0; } });
  addEventListener('pointermove', e => { if (!down) return; moved = Math.abs(e.clientX - down.x); if (moved > 5) { river.classList.add('drag'); river.scrollLeft = down.left - (e.clientX - down.x); } });
  addEventListener('pointerup', () => { down = null; river.classList.remove('drag'); });
  river.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); river.scrollLeft += e.deltaY; } }, { passive: false });
  river.addEventListener('click', e => { if (moved > 5) { moved = 0; return; } const l = e.target.closest('.lamp'); if (l) select('book', l.dataset.book, { scroll: false }); });
  $('seasonbar').addEventListener('click', e => { const t = e.target.closest('.s-tab'); if (!t) return; const b = seasonBands[t.dataset.season - 1]; river.scrollTo({ left: Math.max(0, b.x0 - 8), behavior: smooth() }); });
}

/* ============================================================================
   5. 选中一卷书或一个地点：河、地图、卡片三处一起变
   ========================================================================== */
let sel = null; // { kind: 'book' | 'place', id }
function highlightedMaps() { return new Set(sel && sel.kind === 'book' ? bookById.get(sel.id).maps : []); }
function paint() {
  const hl = highlightedMaps(), walked = walkedMaps();
  const hlBooks = new Set(sel && sel.kind === 'place' ? booksAt(sel.id).map(b => b.id) : []);
  for (const l of document.querySelectorAll('.lamp')) { l.classList.toggle('sel', !!sel && sel.kind === 'book' && sel.id === l.dataset.book); l.classList.toggle('hl', hlBooks.has(l.dataset.book)); }
  for (const g of svg.querySelectorAll('.pl')) { const id = g.dataset.id; g.classList.toggle('sel', !!sel && sel.kind === 'place' && sel.id === id); g.classList.toggle('hl', hl.has(id)); g.classList.toggle('walked', walked.has(id)); }
  const eden = $('eden'); eden.classList.toggle('sel', !!sel && sel.kind === 'place' && sel.id === 'eden'); eden.classList.toggle('hl', hl.has('eden')); eden.classList.toggle('walked', walked.has('eden'));
  // 选中一卷书时，把它走过的地方用一串脚踪连起来
  const route = $('route'); let d = '';
  if (sel && sel.kind === 'book') { const b = bookById.get(sel.id), pts = b.maps.map(id => mapById.get(id)).filter(m => m.lat != null); if (pts.length > 1) d = 'M' + pts.map(m => X(m.lon).toFixed(1) + ' ' + Y(m.lat).toFixed(1)).join('L'); route.classList.toggle('dim', stateOf(b) !== 'kindled'); }
  route.setAttribute('d', d);
  svg.classList.toggle('has-book', !!sel && sel.kind === 'book'); // 选中一卷书时，别的地点变淡
  const kindled = T.books.filter(b => stateOf(b) === 'kindled').length;
  $('counts').innerHTML = `<i class="ic-lamp"></i><b>${kindled}</b>/${T.books.length} <span class="lbl">${bi(UI.countBooks)}</span><span class="c2"><span class="sep">·</span><i class="ic-place"></i><b>${walked.size}</b>/${T.maps.length} <span class="lbl">${bi(UI.countPlaces)}</span></span>`;
  $('counts').title = `${UI.countBooks.en} · ${UI.countPlaces.en}`;
}
function select(kind, id, opt = {}) {
  sel = kind ? { kind, id } : null;
  renderCard(); paint();
  requestAnimationFrame(() => {
    if (sel && opt.fly !== false) {
      if (kind === 'book') { const pts = bookById.get(id).maps.flatMap(m => pointsOf(mapById.get(m), false)); if (pts.length) fly(fitBox(boxOf(pts, 150), 0.8)); else layoutLabels(); }
      else { const m = mapById.get(id), pts = pointsOf(m, true); if (pts.length) fly(fitBox(boxOf(pts, inIsrael(m) ? 34 : 190), 0.8)); else layoutLabels(); }
    } else layoutLabels();
    if (sel && kind === 'book' && opt.scroll !== false && lampX.has(id)) scrollRiverTo(lampX.get(id));
  });
}

/* ---------- 卡片 ---------- */
const chipBook = b => `<button class="chip${stateOf(b) === 'building' ? '' : ' lit'}" data-book="${b.id}">${bi(b.name)}</button>`;
const chipMap = m => `<button class="chip" data-place="${m.id}">${bi(mapLabel(m))}</button>`;
function bookCard(b) {
  const st = stateOf(b), p = progress(b), kind = b.finale ? 'finale' : b.type;
  const seasons = b.parts ? b.parts.map(q => q.season) : [b.season];
  const seasonLine = seasons.map(n => bi(fill(UI.season, { n })) + ' · ' + bi(seasonOf(n).name)).join(' → ');
  // 最上面几行：类型、状态、书名、第几季；能玩的书紧接着就是“进入”按钮
  let top = `<div class="c-tags"><span class="c-tag t-${b.type}">${bi(UI.kind[kind])}</span><span class="c-tag state ${st}">${bi(st === 'building' ? UI.building : st === 'kindled' ? UI.done : UI.ready)}</span></div><h2>${bi(b.name)}</h2><div class="c-season">${seasonLine}</div>`;
  if (st !== 'building') {
    top += `<div class="c-status"><p>${bi(b.play.title, 'blk')}</p>`;
    if (st === 'started') top += `<p>${bi(fill(UI.progress, { a: p.done, b: p.total }), 'blk')}</p><div class="bar"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></div>`;
    top += `<button class="primary" data-play="${b.id}">${bi(st === 'kindled' ? UI.again : st === 'started' ? UI.resume : UI.enter)}</button></div>`;
  }
  // 下面是详情：手机竖屏时先收起来
  let more = `<p class="c-help">${bi(UI.kindHelp[kind], 'blk')}</p><dl>`;
  more += `<div><dt>${bi(UI.when)}</dt><dd class="hist">${bi(whenText(b), 'blk')}${b.note ? `<small>${bi(b.note, 'blk')}</small>` : ''}</dd></div>`;
  if (b.anchor) more += `<div><dt>${bi(UI.anchor)}</dt><dd>${bi(b.anchor, 'blk')}</dd></div>`;
  more += `<div><dt>${bi(UI.places)}</dt><dd>${b.maps.length ? `<div class="chips">${b.maps.map(id => chipMap(mapById.get(id))).join('')}</div>` : bi(UI.placeUnknown)}</dd></div>`;
  more += `<div><dt>${bi(UI.sizeLabel)}</dt><dd>${bi(UI.size[b.group === 'gospels' ? 'gospels' : b.size], 'blk')}</dd></div></dl>`;
  more += `<p class="c-note">${bi(st === 'building' ? UI.buildingHelp : UI.restBuilding, 'blk')}</p><p class="c-foot">${bi(UI.datesNote, 'blk')}</p>`;
  return top + TOGGLE() + `<div class="c-more">${more}</div>`;
}
const TOGGLE = () => `<button class="c-toggle">${bi(UI.details)}<i>▾</i></button>`;
function placeCard(m) {
  const region = T.regions.find(r => r.id === m.region);
  const top = `<div class="c-tags"><span class="c-tag t-place">${bi(UI.kind.place)} ${m.n}</span></div><h2>${bi(m.name)}</h2><div class="c-season">${bi(region.name)}</div>`;
  let more = `<dl><div><dt>${bi(UI.today)}</dt><dd class="hist">${bi(m.modern, 'blk')}${m.approx ? `<small>${bi(UI.approxSite, 'blk')}</small>` : ''}</dd></div>`;
  if (m.eras) more += `<div><dt>${bi(UI.eras)}</dt><dd><ol class="eras">${T.jerusalemEras.map(e => `<li>${bi(e.name)}<small>${bi(e.when)} · ${bi(e.refs)}</small></li>`).join('')}</ol></dd></div>`;
  more += `<div><dt>${bi(UI.booksHere)}</dt><dd><div class="chips">${booksAt(m.id).map(chipBook).join('')}</div></dd></div></dl>`;
  return top + TOGGLE() + `<div class="c-more">${more}</div>`;
}
function renderCard() {
  const card = $('card');
  if (!sel) { card.hidden = true; return; }
  card.hidden = false; card.scrollTop = 0; card.classList.add('peek');
  card.innerHTML = `<button class="x" aria-label="${esc(UI.close.en + ' ' + UI.close.zh)}">×</button>` + (sel.kind === 'book' ? bookCard(bookById.get(sel.id)) : placeCard(mapById.get(sel.id)));
}
function initCardInput() {
  $('card').addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.classList.contains('x')) select(null);
    else if (t.classList.contains('c-toggle')) $('card').classList.toggle('peek');
    else if (t.dataset.book) select('book', t.dataset.book);
    else if (t.dataset.place) select('place', t.dataset.place);
    // 进入这一卷已经做好的部分。带上 from=map，那一页就知道要显示“回到光之地图”的按钮
    else if (t.dataset.play) location.href = bookById.get(t.dataset.play).play.url + '?from=map';
  });
}

/* ============================================================================
   6. 开始
   ========================================================================== */
function measure() { // 量一下顶栏和河有多高，写进 CSS 变量，卡片靠它们定位
  document.documentElement.style.setProperty('--top-h', $('top').offsetHeight + 'px');
  document.documentElement.style.setProperty('--river-total', $('riverwrap').offsetHeight + 'px');
}
function init() {
  $('t-title').innerHTML = bi(UI.title); $('t-sub').innerHTML = bi(UI.subtitle);
  $('v-world').innerHTML = bi(UI.world); $('v-israel').innerHTML = bi(UI.israel);
  $('v-in').setAttribute('aria-label', UI.zoomIn.en + ' ' + UI.zoomIn.zh); $('v-out').setAttribute('aria-label', UI.zoomOut.en + ' ' + UI.zoomOut.zh);
  const eden = mapById.get('eden'); $('eden').innerHTML = `<i>?</i><span>${bi(mapLabel(eden))}</span>`; $('eden').title = `${eden.name.en} ${eden.name.zh}: ${UI.unknownSite.en} ${UI.unknownSite.zh}`;
  $('riverwrap').setAttribute('aria-label', UI.riverLabel.en + ' ' + UI.riverLabel.zh);
  renderMap(); renderRiver(); measure();
  initMapInput(); initRiverInput(); initCardInput();
  $('btn-lang').addEventListener('click', () => setLang(LANG === 'en' ? 'bi' : 'en'));
  addEventListener('keydown', e => { if (e.key === 'Escape') select(null); else if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) setLang(LANG === 'en' ? 'bi' : 'en'); });
  let rt = 0, lastH = $('river').clientHeight;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); if ($('river').clientHeight !== lastH) { lastH = $('river').clientHeight; renderRiver(); paint(); } view = clampView(view); applyView(); layoutLabels(); }, 120); });
  // 从序章回来时（包括按浏览器的“后退”），进度可能变了，重新读一遍
  addEventListener('pageshow', e => { if (e.persisted) { renderRiver(); renderCard(); paint(); } });
  setLang(LANG);
  // 一打开先选中第一盏能玩的灯，孩子一眼就知道从哪里开始
  const first = T.books.find(b => b.play);
  select('book', first.id, { fly: false, quiet: true });
  view = fitBox(BASE.world, 0.98); applyView(); // 卡片出来以后再摆“全图”，地图会自动让开卡片
}
init();
