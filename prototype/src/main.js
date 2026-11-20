// 《光之踪迹》Footprints of Light 序章《起初》—— 可玩小样 v0.2（双语 · Bilingual）
// 名字出自诗 77:19：“你的脚踪无人知道”——游戏把神在历史中看不见的脚踪变成光（工作名曾是《光之约》）
// ----------------------------------------------------------------------------
// 这是一个“单文件原型”：为了方便大家阅读，所有代码都放在这一个文件里。
// 正式工程会由 Codex 按 AGENTS.md 拆成模块（见 docs/PROMPTS.md 的 M0）。
// 语言：两种模式 —— 'en'（English，经文 ESV）和 'bi'（English + 中文，ESV + 和合本）。
//       所有文字都同时输出 <span class="en"> 和 <span class="zh">，English 模式用 CSS 把 .zh 藏起来，
//       所以切换语言不需要重画任何东西（见第 1 节的 bi() 和 setLang()）。
// 阅读顺序：0 内容数据 → 1 工具 → 2 场景 → 3~9 世界 → 10 玩家 → 11 输入
//           → 12 镜头 → 13 效果 → 14 剧情 → 15 收集与图鉴 → 16 声音 → 17 存档 → 18 主循环
// ----------------------------------------------------------------------------
import * as THREE from 'three';

/* ============================================================================
   0. 内容数据：放在 content.js 里（剧情、经文、陶片、信物、彩窗）
   ========================================================================== */
import { KIND_LABEL, EPISODES, BEATS, CARDS, RELICS, WINDOWS, GESTURES, ANIMAL_NAMES, RIVER_NAMES, HINTS, UI, refText } from './content.js';

/* ============================================================================
   1. 小工具
   ========================================================================== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const angleDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function hash2(ix, iy) { let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y) { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; } return s / 0.9375; }
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const DEBUG = location.hash === '#debug';
const $ = id => document.getElementById(id);

// —— 双语 Bilingual ——
// 每段文字是 { en, zh }。bi() 把它变成两个 span；English 模式下 CSS 会隐藏 .zh。
// cls = 'blk'：中文另起一行（段落用）；不写：中文跟在英文后面（标签、按钮用）。
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const smallCapsLord = s => s.replace(/\bLORD\b/g, '<span class="sc">Lord</span>'); // ESV 用小型大写字母印 LORD（耶和华）
function bi(t, cls) {
  if (t == null) return '';
  if (typeof t !== 'object') return esc(t);
  return `<span class="en">${smallCapsLord(esc(t.en))}</span><span class="zh${cls ? ' ' + cls : ''}" lang="zh-CN">${esc(t.zh)}</span>`;
}
// fill({en:'{n} collected', zh:'已收集 {n}'}, {n:'3/7'}) → 替换 {n}
const fill = (t, vars) => { const f = (s, lang) => s.replace(/\{(\w+)\}/g, (_, k) => { const v = vars[k]; return v && typeof v === 'object' ? v[lang] : String(v); }); return { en: f(t.en, 'en'), zh: f(t.zh, 'zh') }; };
const join = (...parts) => ({ en: parts.map(p => typeof p === 'object' ? p.en : p).join(''), zh: parts.map(p => typeof p === 'object' ? p.zh : p).join('') });
const LANG_KEY = 'guangzhiyue-lang'; // 存储键沿用旧工作名，这样已经存的选择和存档不会丢
let LANG = 'bi'; // 默认双语
try { const v = localStorage.getItem(LANG_KEY); if (v === 'en' || v === 'bi') LANG = v; } catch (e) { /* 读不到就用默认 */ }
function setLang(v) {
  LANG = v === 'en' ? 'en' : 'bi';
  document.documentElement.classList.toggle('lang-en', LANG === 'en'); // 放在 <html> 上：页面头部的小脚本也会先设好，避免闪一下中文
  document.documentElement.classList.toggle('lang-bi', LANG === 'bi');
  document.title = UI.title[LANG];
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-checked', String(b.dataset.lang === LANG));
  const note = $('lang-note'); if (note) note.textContent = UI.langNote[LANG];
  const chip = $('lang-text'); if (chip) chip.textContent = UI.langShort[LANG];
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* 存不了也没关系 */ }
  if (typeof setDays === 'function' && !$('hud').hidden) setDays();
}

/* ============================================================================
   2. 渲染器、场景、相机
   ========================================================================== */
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1500);
scene.fog = new THREE.Fog(0x05060b, 6, 55);
let lastNow = performance.now();
const U = { time: { value: 0 } }; // 所有着色器共用的时间

// 世界状态：每个数值 0→1，由剧情效果慢慢推动
const W = {
  light: 0, sky: 0, land: 0, green: 0, lights: 0, night: 0, rest: 0, shadow: 0, wind: 0.6,
  edenOpen: false, lampLit: false, focusAmt: 0, focus: new THREE.Vector3(), lookUp: 0,
};

/* ============================================================================
   3. 贴图（用画布现画，不需要图片文件）
   ========================================================================== */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {
  glow: canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }),
  shadow: canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }),
  ring: canvasTex(64, 64, (g) => { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke(); }),
  cloud: canvasTex(256, 128, (g) => { const R = rng(7); for (let i = 0; i < 14; i++) { const x = 40 + R() * 176, y = 50 + R() * 40, rr = 22 + R() * 34; const r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); } }),
  shard: canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,214,150,.75)'); r.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    g.beginPath(); g.moveTo(40, 38); g.lineTo(78, 32); g.lineTo(94, 50); g.lineTo(88, 86); g.lineTo(54, 96); g.lineTo(34, 72); g.closePath();
    g.fillStyle = '#b9764c'; g.fill(); g.strokeStyle = '#7a4529'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = '#3b1d0c'; g.lineWidth = 2.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(46, 50 + i * 10); g.lineTo(82 - i * 3, 47 + i * 10); g.stroke(); }
  }),
  gem: canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,120,110,.8)'); r.addColorStop(1, 'rgba(255,90,80,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26); } g.closePath();
    g.fillStyle = '#b3242c'; g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(52, 50); g.lineTo(66, 44); g.lineTo(60, 60); g.fill();
  }),
};
const glowSprite = (color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.scale.setScalar(scale); return s;
};

/* ============================================================================
   4. 地形：高度函数 + 网格
   地形先藏在水下 11 米，第三日“旱地露出来”时升上来。
   ========================================================================== */
const EDEN = { x: 62, z: -18 };
const BLOBS = [
  { x: 0, z: 6, rx: 40, rz: 50 },     // 主岛
  { x: 62, z: -18, rx: 30, rz: 28 },  // 东方的伊甸
  { x: 30, z: -16, rx: 17, rz: 10 },  // 连接两地的陆桥
];
const RIVERS = [ // 四道河：从伊甸中央的泉源流向四方
  { name: RIVER_NAMES[0], dir: [1, -1] }, { name: RIVER_NAMES[1], dir: [1, 1] }, { name: RIVER_NAMES[2], dir: [-1, 1] }, { name: RIVER_NAMES[3], dir: [-1, -1] },
].map(r => { const l = Math.hypot(r.dir[0], r.dir[1]); return { ...r, ux: r.dir[0] / l, uz: r.dir[1] / l }; });
const riverMeander = t => Math.sin(t * 0.25) * 1.2;
function riverPoint(r, t, side = 0) {
  const px = -r.uz, pz = r.ux, m = riverMeander(t) + side;
  return [EDEN.x + r.ux * t + px * m, EDEN.z + r.uz * t + pz * m];
}
const hill = (x, z, cx, cz, rad, h) => { const d = Math.hypot(x - cx, z - cz) / rad; return d >= 1 ? 0 : h * (1 - d * d) * (1 - d * d); };
function islandMask(x, z) {
  let m = -1;
  for (const b of BLOBS) { const dx = (x - b.x) / b.rx, dz = (z - b.z) / b.rz; m = Math.max(m, 1 - (dx * dx + dz * dz)); }
  return m + (fbm(x * 0.06 + 3.1, z * 0.06 - 1.7) - 0.5) * 0.32;
}
function baseHeight(x, z) {
  const m = islandMask(x, z);
  let h = m < 0 ? -0.3 + m * 18 : -0.3 + Math.min(m, 0.25) * 4 + Math.max(0, m - 0.25) * 1.6;
  h = Math.max(h, -7.5);
  h += smooth(0.12, 0.5, m) * (fbm(x * 0.035 + 10, z * 0.035 - 5) - 0.45) * 4.5;
  h += hill(x, z, -5, -30, 9.5, 5.5) + hill(x, z, -24, 13, 10, 3.2) + hill(x, z, 22, 26, 9, 2.6);
  h -= hill(x, z, -16, -5, 7, 3.4); // 第五日的小湖
  // 伊甸：平缓的园子 + 中央泉源 + 四道河
  const dx = x - EDEN.x, dz = z - EDEN.z, r = Math.hypot(dx, dz);
  const flat = 1 - smooth(16, 27, r);
  h = lerp(h, 1.25 + (fbm(x * 0.08, z * 0.08) - 0.5) * 0.9, flat);
  h = lerp(h, -0.9, 1 - smooth(2.3, 3.1, r));
  for (const rv of RIVERS) {
    const t = dx * rv.ux + dz * rv.uz;
    if (t < 1.5) continue;
    const d = Math.abs(dx * -rv.uz + dz * rv.ux - riverMeander(t));
    const w = 0.85 + t * 0.02;
    const k = (1 - smooth(w, w + 0.9, d)) * smooth(1.5, 3.2, t);
    h = lerp(h, Math.min(h, -0.85), k);
  }
  return h;
}
const landOffset = () => -11 * (1 - easeInOut(clamp(W.land, 0, 1)));
const terrainY = (x, z) => baseHeight(x, z) + landOffset();

// —— 地形网格（两套颜色：光秃的 / 长满青草的，第三日慢慢过渡）——
const terrainGroup = new THREE.Group(); scene.add(terrainGroup);
const T_CX = 22, T_CZ = 2, T_W = 190, T_D = 160;
const terrainUniforms = { uGreen: { value: 0 } };
{
  const geo = new THREE.PlaneGeometry(T_W, T_D, 210, 176); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  for (let i = 0; i < n; i++) { const x = pos.getX(i) + T_CX, z = pos.getZ(i) + T_CZ; pos.setY(i, baseHeight(x, z)); }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, c1 = new Float32Array(n * 3), c2 = new Float32Array(n * 3);
  const C = (h) => new THREE.Color(h);
  const sandB = C('#cdb88c'), dirtB = C('#9a8263'), rockB = C('#8d8478'), wetB = C('#a88f6a');
  const sand = C('#e2d1a2'), grassA = C('#86c062'), grassB = C('#6fae55'), grassHi = C('#a9c46c'), rock = C('#9b958c'), edenG = C('#5fb85a'), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + T_CX, z = pos.getZ(i) + T_CZ, h = pos.getY(i), ny = nor.getY(i);
    const v = fbm(x * 0.15, z * 0.15), steep = ny < 0.78;
    // 光秃
    if (h < -0.2) tmp.copy(wetB); else if (h < 0.55) tmp.copy(sandB); else tmp.copy(dirtB).lerp(rockB, v * 0.6);
    if (steep) tmp.copy(rockB);
    tmp.multiplyScalar(0.92 + v * 0.16); c1[i * 3] = tmp.r; c1[i * 3 + 1] = tmp.g; c1[i * 3 + 2] = tmp.b;
    // 青草
    const er = Math.hypot(x - EDEN.x, z - EDEN.z);
    if (h < -0.2) tmp.copy(wetB); else if (h < 0.45) tmp.copy(sand);
    else { tmp.copy(grassA).lerp(grassB, v); if (h > 3.8) tmp.lerp(grassHi, smooth(3.8, 6, h)); if (er < 24) tmp.lerp(edenG, 1 - smooth(16, 24, er)); }
    if (steep && h > 0.5) tmp.copy(rock);
    tmp.multiplyScalar(0.94 + v * 0.12); c2[i * 3] = tmp.r; c2[i * 3 + 1] = tmp.g; c2[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c1, 3));
  geo.setAttribute('color2', new THREE.BufferAttribute(c2, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uGreen = terrainUniforms.uGreen;
    s.vertexShader = 'attribute vec3 color2;\nuniform float uGreen;\n' + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb = mix(vColor.rgb, color2, uGreen);');
  };
  mat.customProgramCacheKey = () => 'terrain';
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(T_CX, 0, T_CZ);
  terrainGroup.add(mesh);
}

/* ============================================================================
   5. 水：低多边形的海面，浅滩是青绿色，深海是蓝色
   ========================================================================== */
const waterUniforms = { uLand: { value: 0 } };
{
  const geo = new THREE.PlaneGeometry(700, 700, 140, 140); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count, c1 = new Float32Array(n * 3), c2 = new Float32Array(n * 3);
  const deep = new THREE.Color('#1d5f8c'), mid = new THREE.Color('#2f8fb0'), shallow = new THREE.Color('#5ed0c4'), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i) + 22, z = pos.getZ(i) + 2, depth = -baseHeight(x, z);
    deep.toArray(c1, i * 3);
    tmp.copy(shallow).lerp(mid, smooth(0.3, 2.5, depth)).lerp(deep, smooth(2.5, 7, depth)); tmp.toArray(c2, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c1, 3));
  geo.setAttribute('color2', new THREE.BufferAttribute(c2, 3));
  const mat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.86, shininess: 70, specular: new THREE.Color('#8fb3c9') });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time; s.uniforms.uLand = waterUniforms.uLand;
    s.vertexShader = 'attribute vec3 color2;\nuniform float uLand;\nuniform float uTime;\n' + s.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(transformed.x*0.35+uTime*1.1)*0.07 + sin(transformed.z*0.42+uTime*0.8)*0.06 + sin((transformed.x+transformed.z)*0.9+uTime*1.7)*0.025;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb = mix(vColor.rgb, color2, uLand);');
  };
  mat.customProgramCacheKey = () => 'water';
  const water = new THREE.Mesh(geo, mat); water.position.set(22, 0, 2); water.renderOrder = 2;
  scene.add(water);
}

/* ============================================================================
   6. 天空：渐变天穹 + 太阳 + 月亮 + 星星 + 云
   ========================================================================== */
const PAL = { // 每种状态下的 [天顶, 中间, 地平线, 雾]
  dark: ['#020309', '#05070d', '#020205', '#04050a'],
  pearl: ['#cfc7b3', '#efe6d1', '#e8dfca', '#e3d9c2'],
  blue: ['#3d7fd0', '#94c3ec', '#d2e7f3', '#c2dbe8'],
  sun: ['#327ad0', '#8cc0ec', '#ecdfc0', '#c6dbe6'],
  night: ['#0a1330', '#1a2a50', '#2c3658', '#1b2541'],
  rest: ['#5a8bcc', '#f0c48f', '#f6d7a4', '#ecd0a6'],
};
for (const k in PAL) PAL[k] = PAL[k].map(c => new THREE.Color(c));
const skyUniforms = {
  uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0.5, 0.3, -0.62).normalize() }, uSunCol: { value: new THREE.Color('#fff1d0') }, uSun: { value: 0 }, uGlow: { value: 0 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSun; uniform float uGlow; varying vec3 vDir;
    void main(){ vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(uBot, uMid, smoothstep(-0.2, 0.06, h)); col = mix(col, uTop, smoothstep(0.06, 0.7, h));
      float s = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(s, 900.0) * 6.0 * uSun + pow(s, 14.0) * 0.32 * uGlow);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -10; scene.add(sky);
const moon = glowSprite('#dfe8ff', 26, 0); scene.add(moon);
const moonDir = new THREE.Vector3(-0.55, 0.3, 0.62).normalize();
const sunHalo = glowSprite('#ffe6b0', 70, 0); scene.add(sunHalo);
// 星星
const stars = (() => {
  const R = rng(11), n = 1400, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = R() * 2 - 1, a = R() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 800; p[i * 3 + 1] = y * 800; p[i * 3 + 2] = Math.sin(a) * r * 800; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const pts = new THREE.Points(g, m); pts.renderOrder = -9; scene.add(pts); return pts;
})();
// 云
const clouds = [];
{
  const R = rng(21);
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.cloud, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false }));
    const a = R() * Math.PI * 2, rad = 160 + R() * 240;
    s.position.set(22 + Math.cos(a) * rad, 60 + R() * 70, Math.sin(a) * rad); s.scale.set(90 + R() * 80, 34 + R() * 26, 1);
    s.userData.speed = 0.6 + R() * 0.8; scene.add(s); clouds.push(s);
  }
}

// 灯光
const hemi = new THREE.HemisphereLight('#ffffff', '#5a4a38', 0.05); scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#fff2dc', 0); sunLight.position.set(0, 100, 0); scene.add(sunLight);
const ambient = new THREE.AmbientLight('#ffffff', 0.04); scene.add(ambient);

/* ============================================================================
   7. 光之路：黑暗中浮在水面上的垫脚石；陆地升起后变成一条石路
   ========================================================================== */
const PATH_W = 1.35;
const pathCurve = new THREE.CatmullRomCurve3([
  [0, 49.5], [0, 46.5], [0, 41], [2.5, 35], [6, 28.5], [3, 22], [-4, 16.5], [-1.5, 10], [5, 4.5], [2, -1], [-7, -5],
  [-3, -11], [3, -16.5], [1.5, -23], [-3.5, -28.5], [4, -27], [14, -23.5], [24, -19.5], [34, -16.5], [42, -15],
].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
const pathPts = pathCurve.getSpacedPoints(700);
function pathDist(x, z) { let best = 1e9; for (let i = 0; i < pathPts.length; i++) { const p = pathPts[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) best = d; } return Math.sqrt(best); }
const stoneY = (x, z) => Math.max(0.22, terrainY(x, z) + 0.07);
const stones = (() => {
  const R = rng(5), len = pathCurve.getLength(), n = Math.floor(len / 1.22), list = [];
  for (let i = 0; i < n; i++) {
    const p = pathCurve.getPointAt(i / n), tan = pathCurve.getTangentAt(i / n);
    const off = (R() - 0.5) * 0.8; list.push({ x: p.x - tan.z * off, z: p.z + tan.x * off, s: 0.52 + R() * 0.2, r: R() * Math.PI });
  }
  const geo = new THREE.CylinderGeometry(1, 1, 0.24, 6); geo.translate(0, -0.12, 0);
  const mat = new THREE.MeshLambertMaterial({ color: '#e3d8c2', emissive: '#ffd79a', emissiveIntensity: 0.2, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length); mesh.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  mesh.update = () => { list.forEach((s, i) => { q.setFromEuler(e.set(0, s.r, 0)); m.compose(new THREE.Vector3(s.x, stoneY(s.x, s.z), s.z), q, new THREE.Vector3(s.s, 1, s.s)); mesh.setMatrixAt(i, m); }); mesh.instanceMatrix.needsUpdate = true; };
  mesh.update(); scene.add(mesh); return mesh;
})();

// 伊甸四道河上的石桥（绕着泉源走一圈）
const bridges = RIVERS.map(rv => {
  const t = 5.6, [x, z] = riverPoint(rv, t), ang = Math.atan2(rv.ux, rv.uz);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 1.7), new THREE.MeshLambertMaterial({ color: '#cbbd9f', flatShading: true }));
  mesh.position.set(x, 0.22, z); mesh.rotation.y = ang; mesh.visible = false; scene.add(mesh);
  return { x, z, ang, y: 0.37, mesh, ux: rv.ux, uz: rv.uz };
});
function inBridge(b, x, z) { const dx = x - b.x, dz = z - b.z; const along = dx * b.ux + dz * b.uz, across = dx * -b.uz + dz * b.ux; return Math.abs(along) < 0.95 && Math.abs(across) < 2.3; }

// 地面高度查询：玩家、镜头、动物都用它
function groundAt(x, z) {
  let best = null;
  if (W.land > 0.02) { const h = terrainY(x, z); if (h > -0.3) best = h; }
  if (pathDist(x, z) < PATH_W) { const s = stoneY(x, z); if (best === null || s > best) best = s; }
  if (W.land > 0.9) for (const b of bridges) if (inBridge(b, x, z) && (best === null || b.y > best)) best = b.y;
  return best;
}

/* ============================================================================
   8. 植物：草、树、花（用 InstancedMesh，一次画几千棵）
   生长动画写在着色器里：uGrowStart 之后，每株按 aDelay 依次长出来
   ========================================================================== */
function growMaterial(base, key, grow, sway) {
  base.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time; s.uniforms.uGrowStart = grow.start; s.uniforms.uGrowDur = grow.dur;
    s.vertexShader = 'attribute float aDelay;\nuniform float uTime;\nuniform float uGrowStart;\nuniform float uGrowDur;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float gk = clamp((uTime - uGrowStart - aDelay) / uGrowDur, 0.0, 1.0); gk = gk*gk*(3.0-2.0*gk);
       ${sway ? 'vec3 ip = instanceMatrix[3].xyz; float sw = sin(uTime*1.7 + ip.x*0.35 + ip.z*0.27); transformed.x += sw*0.13*position.y; transformed.z += cos(uTime*1.3 + ip.x*0.2)*0.06*position.y;' : ''}
       transformed *= gk;`);
  };
  base.customProgramCacheKey = () => key; return base;
}
function scatter(count, seed, accept) { const R = rng(seed), out = []; let tries = 0; while (out.length < count && tries < count * 60) { tries++; const x = T_CX - T_W / 2 + R() * T_W, z = T_CZ - T_D / 2 + R() * T_D; const h = baseHeight(x, z); const a = accept(x, z, h, R); if (a) out.push({ x, z, h, R: R() }); } return out; }
const inEden = (x, z, rad = 25) => Math.hypot(x - EDEN.x, z - EDEN.z) < rad;
const notRiver = (x, z) => { const dx = x - EDEN.x, dz = z - EDEN.z; if (Math.hypot(dx, dz) < 4) return false; for (const rv of RIVERS) { const t = dx * rv.ux + dz * rv.uz; if (t > 1 && Math.abs(dx * -rv.uz + dz * rv.ux - riverMeander(t)) < 2.4) return false; } return true; };
const TREE_SPOTS = []; // 镜头避开树干用
const growth = { main: { start: { value: 1e6 }, dur: { value: 2.2 } }, eden: { start: { value: 1e6 }, dur: { value: 2.4 } } };

function buildVegetation(region, origin, filter, counts, seed) {
  const g = growth[region], group = new THREE.Group(); terrainGroup.add(group);
  const delayFrom = (x, z, R) => Math.hypot(x - origin[0], z - origin[1]) / 14 + R * 0.6;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const make = (geo, mat, items, place) => {
    const mesh = new THREE.InstancedMesh(geo, mat, items.length); mesh.frustumCulled = false;
    const delays = new Float32Array(items.length);
    items.forEach((it, i) => { place(it, i, mesh); delays[i] = delayFrom(it.x, it.z, it.R); });
    geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; group.add(mesh); return mesh;
  };
  // 草
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0.05, 0, 0, 0, 0.42, 0, 0, 0, -0.05, 0, 0, 0.05, 0, 0.38, 0], 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute([0.55, 0.62, 0.45, 0.55, 0.62, 0.45, 1, 1, 0.85, 0.55, 0.62, 0.45, 0.55, 0.62, 0.45, 1, 1, 0.85], 3));
  blade.computeVertexNormals();
  const grassItems = scatter(counts.grass, seed, (x, z, h, R) => h > 0.45 && filter(x, z, h) && pathDist(x, z) > 0.9);
  make(blade, growMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'grass-' + region, g, true), grassItems, (it, i, mesh) => {
    const s = 0.55 + it.R * 0.6; q.setFromEuler(e.set(0, it.R * 6.28, 0)); m4.compose(new THREE.Vector3(it.x, it.h - 0.02, it.z), q, new THREE.Vector3(s, s * (0.75 + it.R * 0.5), s)); mesh.setMatrixAt(i, m4);
    col.setHSL(0.24 + it.R * 0.07, 0.45, 0.42 + it.R * 0.12); mesh.setColorAt(i, col);
  });
  // 花
  const flowerItems = scatter(counts.flowers, seed + 1, (x, z, h) => h > 0.5 && filter(x, z, h));
  const fgeo = new THREE.IcosahedronGeometry(0.065, 0); fgeo.translate(0, 0.22, 0);
  const FCOL = ['#fff6e8', '#ffd56b', '#f49ac1', '#b9a4ff', '#ff8f6b'];
  make(fgeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff' }), 'flower-' + region, g, true), flowerItems, (it, i, mesh) => {
    m4.compose(new THREE.Vector3(it.x, it.h, it.z), q.identity(), new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, col.set(FCOL[Math.floor(it.R * FCOL.length)]));
  });
  // 树：树干 + 圆树冠 + 柏树一样的尖树冠
  const treeItems = scatter(counts.trees, seed + 2, (x, z, h, R) => h > 0.9 && filter(x, z, h) && pathDist(x, z) > 5.5 && BEATS.every(b => Math.hypot(b.at[0] - x, b.at[1] - z) > 6));
  treeItems.forEach(t => TREE_SPOTS.push([t.x, t.z, region]));
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.22, 1.7, 6); trunkGeo.translate(0, 0.85, 0);
  make(trunkGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#7a5a3c', flatShading: true }), 'trunk-' + region, g, false), treeItems, (it, i, mesh) => {
    const s = 0.7 + it.R * 0.55; q.setFromEuler(e.set(0, it.R * 6, 0)); m4.compose(new THREE.Vector3(it.x, it.h - 0.05, it.z), q, new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m4);
  });
  const roundItems = treeItems.filter(t => t.R < 0.68), coneItems = treeItems.filter(t => t.R >= 0.68);
  const roundGeo = new THREE.IcosahedronGeometry(1.15, 0); roundGeo.translate(0, 2.35, 0);
  make(roundGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), 'round-' + region, g, false), roundItems, (it, i, mesh) => {
    const s = 0.7 + it.R * 0.55; q.setFromEuler(e.set(0, it.R * 9, 0)); m4.compose(new THREE.Vector3(it.x, it.h - 0.05, it.z), q, new THREE.Vector3(s * 1.1, s, s * 1.1)); mesh.setMatrixAt(i, m4);
    col.setHSL(0.26 + it.R * 0.08, 0.5, 0.36 + it.R * 0.1); mesh.setColorAt(i, col);
  });
  const coneGeo = new THREE.ConeGeometry(0.75, 2.8, 7); coneGeo.translate(0, 2.6, 0);
  make(coneGeo, growMaterial(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), 'cone-' + region, g, false), coneItems, (it, i, mesh) => {
    const s = 0.75 + it.R * 0.5; m4.compose(new THREE.Vector3(it.x, it.h - 0.05, it.z), q.identity(), new THREE.Vector3(s, s * 1.15, s)); mesh.setMatrixAt(i, m4);
    col.setHSL(0.3 + it.R * 0.05, 0.45, 0.28 + it.R * 0.08); mesh.setColorAt(i, col);
  });
  return group;
}
const VEG = IS_TOUCH ? { grass: 2600, flowers: 300, trees: 55 } : { grass: 6000, flowers: 650, trees: 80 };
buildVegetation('main', [-4, 16.5], (x, z) => !inEden(x, z, 27) && x < 40, VEG, 101);
buildVegetation('eden', [42, -15], (x, z) => inEden(x, z, 25) && notRiver(x, z), { grass: Math.round(VEG.grass * 0.45), flowers: Math.round(VEG.flowers * 0.9), trees: 26 }, 202);
// 岸边的石头（随陆地一起升起）
{
  const items = scatter(60, 303, (x, z, h) => h > -0.2 && h < 1.2 && !inEden(x, z, 25));
  const geo = new THREE.DodecahedronGeometry(0.6, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#a79e92', flatShading: true }), items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((it, i) => { const s = 0.4 + it.R * 1.1; q.setFromEuler(e.set(it.R * 3, it.R * 7, 0)); m4.compose(new THREE.Vector3(it.x, it.h, it.z), q, new THREE.Vector3(s, s * 0.7, s)); mesh.setMatrixAt(i, m4); });
  terrainGroup.add(mesh);
}

/* ============================================================================
   9. 活物与人：鸟、鱼、走兽、亚当与夏娃、蛇、伊甸的两棵树
   ========================================================================== */
// 把几个简单形状合成一个几何体（带顶点颜色），这样每种动物只占一次绘制
function mergeParts(parts) {
  const P = [], N = [], Cc = [];
  for (const p of parts) {
    const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone()); g.applyMatrix4(p.m || new THREE.Matrix4());
    const pos = g.attributes.position, nor = g.attributes.normal, c = new THREE.Color(p.color);
    for (let i = 0; i < pos.count; i++) { P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); N.push(nor.getX(i), nor.getY(i), nor.getZ(i)); Cc.push(c.r, c.g, c.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  return out;
}
const M = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const leg = (x, z, h, r, color) => ({ geo: new THREE.CylinderGeometry(r, r * 0.8, h, 5), m: M(x, h / 2, z), color });
const SPECIES = {
  sheep: mergeParts([
    { geo: new THREE.IcosahedronGeometry(0.5, 1), m: M(0, 0.62, 0, 1.0, 0.82, 1.25), color: '#f4efe4' },
    { geo: new THREE.SphereGeometry(0.2, 8, 6), m: M(0, 0.78, 0.62, 1, 1.1, 1.2), color: '#3d3430' },
    { geo: new THREE.SphereGeometry(0.08, 6, 4), m: M(0.17, 0.85, 0.58, 1.6, 0.6, 1), color: '#3d3430' },
    { geo: new THREE.SphereGeometry(0.08, 6, 4), m: M(-0.17, 0.85, 0.58, 1.6, 0.6, 1), color: '#3d3430' },
    leg(0.22, 0.32, 0.42, 0.06, '#3d3430'), leg(-0.22, 0.32, 0.42, 0.06, '#3d3430'), leg(0.22, -0.32, 0.42, 0.06, '#3d3430'), leg(-0.22, -0.32, 0.42, 0.06, '#3d3430'),
  ]),
  deer: mergeParts([
    { geo: new THREE.SphereGeometry(0.42, 10, 8), m: M(0, 1.0, 0, 0.75, 0.75, 1.45), color: '#a8724a' },
    { geo: new THREE.CylinderGeometry(0.11, 0.15, 0.7, 6), m: M(0, 1.38, 0.5, 1, 1, 1, -0.5), color: '#a8724a' },
    { geo: new THREE.SphereGeometry(0.17, 8, 6), m: M(0, 1.7, 0.72, 0.9, 0.9, 1.4), color: '#9a6842' },
    { geo: new THREE.CylinderGeometry(0.025, 0.03, 0.5, 4), m: M(0.12, 2.0, 0.62, 1, 1, 1, 0, 0, -0.4), color: '#e9dcc3' },
    { geo: new THREE.CylinderGeometry(0.025, 0.03, 0.5, 4), m: M(-0.12, 2.0, 0.62, 1, 1, 1, 0, 0, 0.4), color: '#e9dcc3' },
    { geo: new THREE.SphereGeometry(0.1, 6, 4), m: M(0, 1.05, -0.62), color: '#f2ead8' },
    leg(0.17, 0.42, 0.8, 0.05, '#7e5233'), leg(-0.17, 0.42, 0.8, 0.05, '#7e5233'), leg(0.17, -0.42, 0.8, 0.05, '#7e5233'), leg(-0.17, -0.42, 0.8, 0.05, '#7e5233'),
  ]),
  lion: mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 10, 8), m: M(0, 0.85, -0.1, 0.8, 0.72, 1.4), color: '#d9a85a' },
    { geo: new THREE.IcosahedronGeometry(0.42, 1), m: M(0, 1.1, 0.62, 1.05, 1.05, 0.8), color: '#9a5a26' },
    { geo: new THREE.SphereGeometry(0.24, 8, 6), m: M(0, 1.08, 0.82, 1, 0.95, 1.1), color: '#e2b56a' },
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), m: M(0, 0.9, -0.95, 1, 1, 1, 1.0), color: '#d9a85a' },
    leg(0.22, 0.4, 0.55, 0.09, '#c99748'), leg(-0.22, 0.4, 0.55, 0.09, '#c99748'), leg(0.22, -0.5, 0.55, 0.09, '#c99748'), leg(-0.22, -0.5, 0.55, 0.09, '#c99748'),
  ]),
};
const animals = [];
const animalMeshes = {};
{
  const homes = { sheep: [[6, -9, 9], [-17, 23, 8], [14, 30, 7]], deer: [[-20, 8, 12], [20, 8, 10]], lion: [[14, -21, 6]] };
  const counts = { sheep: 10, deer: 5, lion: 2 };
  const R = rng(77);
  for (const sp in counts) {
    const mesh = new THREE.InstancedMesh(SPECIES[sp], new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), counts[sp]);
    mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh); animalMeshes[sp] = mesh;
    for (let i = 0; i < counts[sp]; i++) {
      const home = homes[sp][i % homes[sp].length]; const a = R() * 6.28, r = R() * home[2];
      animals.push({ sp, i, mesh, x: home[0] + Math.cos(a) * r, z: home[1] + Math.sin(a) * r, yaw: R() * 6.28, home, tx: 0, tz: 0, wait: R() * 3, speed: sp === 'deer' ? 1.3 : 0.75, appear: 0, phase: R() * 6, special: null });
    }
  }
}
// 鸟群（第五日）：翅膀扇动写在着色器里
const birds = (() => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.32, -0.07, 0, -0.2, 0.07, 0, -0.2, 0, 0, 0.12, -0.62, 0.02, -0.05, 0, 0, -0.14, 0, 0, 0.12, 0, 0, -0.14, 0.62, 0.02, -0.05], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ color: '#f7f3ea', side: THREE.DoubleSide });
  mat.onBeforeCompile = (s) => { s.uniforms.uTime = U.time; s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float fl = sin(uTime*9.0 + float(gl_InstanceID)*1.7); transformed.y += abs(position.x) * fl * 0.55;'); };
  mat.customProgramCacheKey = () => 'bird';
  const n = 34, mesh = new THREE.InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const R = rng(9); mesh.userData.b = Array.from({ length: n }, () => ({ r: 14 + R() * 26, h: 14 + R() * 14, sp: (0.12 + R() * 0.1) * (R() < 0.5 ? 1 : -1), a: R() * 6.28, ph: R() * 6.28, cx: -2 + R() * 10, cz: R() * 10 - 5 }));
  return mesh;
})();
// 鱼（第五日）：从湖里跳起来
const fish = (() => {
  const geo = mergeParts([{ geo: new THREE.OctahedronGeometry(0.22, 0), m: M(0, 0, 0, 0.5, 0.7, 1.4), color: '#cfe4ef' }, { geo: new THREE.ConeGeometry(0.15, 0.25, 3), m: M(0, 0, -0.35, 1, 1, 0.4, Math.PI / 2), color: '#9cc6dd' }]);
  const n = 7, mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), n); mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const spots = [[-16, -5, 3], [-16, -5, 3], [-16, -5, 3], [-31, 12, 6], [12, 44, 6], [-6, -41, 5], [38, 24, 6]];
  const R = rng(13); mesh.userData.f = spots.map(([cx, cz, rr]) => ({ cx, cz, rr, t: -R() * 4, dur: 0.9 + R() * 0.4, ax: 0, az: 0, bx: 0, bz: 0 }));
  mesh.userData.ripples = Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.ring, transparent: true, opacity: 0, depthWrite: false })); s.material.rotation = 0; scene.add(s); return s; });
  return mesh;
})();
// 人：发光的身形（堕落前“披着光”的想象）
function makePerson(female) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#fff6e2', emissive: '#ffd99a', emissiveIntensity: 0.85 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, female ? 0.85 : 0.95, 4, 10), mat); body.position.y = female ? 0.78 : 0.82; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat); head.position.y = female ? 1.62 : 1.72; g.add(head);
  if (female) { const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), mat); hair.position.set(0, 1.6, -0.05); hair.scale.set(1, 1.35, 1); g.add(hair); }
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.62, 3, 6), mat); arm.position.set(sx * 0.31, 1.0, 0); arm.rotation.z = sx * 0.12; g.add(arm); g.userData[sx < 0 ? 'armL' : 'armR'] = arm; }
  const halo = glowSprite('#ffe3b0', 2.6, 0.55); halo.position.y = 1.1; g.add(halo);
  g.userData.mat = mat; g.userData.halo = halo; g.visible = false; scene.add(g); return g;
}
const adam = makePerson(false), eve = makePerson(true);
const ADAM_POS = [52.5, -22.5], EVE_POS = [54.3, -20.6];
const eastLights = [glowSprite('#ffe9c2', 4, 0), glowSprite('#ffe9c2', 4, 0)];
eastLights.forEach((s, i) => { s.position.set(55 + i * 2.2, 7, -21 + i * 1.2); scene.add(s); });
// 伊甸的两棵树
function makeTree(kind) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.75, 4.2, 7), new THREE.MeshLambertMaterial({ color: kind === 'life' ? '#8b6a45' : '#5e4630', flatShading: true }));
  trunk.position.y = 2.1; g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: kind === 'life' ? '#86cf6c' : '#4f8f4a', flatShading: true, emissive: kind === 'life' ? '#ffd36b' : '#000000', emissiveIntensity: kind === 'life' ? 0.22 : 0 });
  const R = rng(kind === 'life' ? 31 : 32);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + R() * 0.8, 0), leafMat); const a = i / 6 * 6.28; b.position.set(Math.cos(a) * 1.6, 4.6 + R() * 1.4, Math.sin(a) * 1.6); g.add(b); }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.0, 0), leafMat); top.position.y = 6.0; g.add(top);
  const fruitMat = kind === 'life' ? null : new THREE.MeshLambertMaterial({ color: '#f0a83a', emissive: '#7a4a10', emissiveIntensity: 0.35 });
  for (let i = 0; i < (kind === 'life' ? 10 : 14); i++) {
    const a = R() * 6.28, rr = 1.6 + R() * 1.6, y = 3.8 + R() * 2.6;
    if (kind === 'life') { const s = glowSprite('#ffd36b', 0.7, 0.9); s.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); g.add(s); }
    else { const f = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), fruitMat); f.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); g.add(f); }
  }
  if (kind === 'life') { const halo = glowSprite('#ffe7a8', 8.5, 0.35); halo.position.y = 5; g.add(halo); }
  g.scale.setScalar(0.001); g.visible = false; scene.add(g); return g;
}
const treeLife = makeTree('life'), treeKnow = makeTree('know');
const TREE_LIFE_POS = [56.3, -18.2], TREE_KNOW_POS = [67.8, -17.6];
// 蛇（下一章预告）
const serpent = (() => {
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 5, rr = 0.86 - t * 0.24; pts.push(new THREE.Vector3(Math.cos(a) * rr, 1.3 + t * 2.7, Math.sin(a) * rr)); }
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#2f4a2a', flatShading: true });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.12, 6), mat));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat); head.scale.set(1, 0.7, 1.5); const end = pts[pts.length - 1]; head.position.set(end.x + 0.25, end.y + 0.1, end.z + 0.1); g.add(head);
  const eyes = glowSprite('#ffe68a', 0.35, 0.9); eyes.position.copy(head.position).add(new THREE.Vector3(0.12, 0.12, 0.2)); g.add(eyes);
  g.visible = false; g.scale.setScalar(0.001); scene.add(g); return g;
})();
// 一只鸽子（命名时飞来）
const dove = (() => { const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: '#f8f8f8', flatShading: true }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat); b.scale.set(1, 0.9, 1.5); g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat); h.position.set(0, 0.12, 0.2); g.add(h); const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), new THREE.MeshLambertMaterial({ color: '#b3a998', flatShading: true })); rock.position.y = -0.45; g.add(rock); g.visible = false; scene.add(g); return g; })();
// 风（创 1:2“神的灵运行在水面上”——ruach 也是“风”）：一层流动的光点
const windMotes = (() => {
  const n = 520, p = new Float32Array(n * 3), R = rng(41);
  for (let i = 0; i < n; i++) { p[i * 3] = (R() - 0.5) * 70; p[i * 3 + 1] = 0.25 + R() * 2.2; p[i * 3 + 2] = (R() - 0.5) * 70; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ map: TEX.glow, size: 0.17, color: '#fff1cf', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
})();

/* ============================================================================
   10. 玩家：持灯的旅人（原创造型：亚麻长袍、兜帽、陶灯）
   ========================================================================== */
const player = { pos: new THREE.Vector3(0, 0.22, 49), vel: new THREE.Vector3(), facing: Math.PI, onGround: true, coyote: 0, jumpBuf: 0, gliding: false, energy: 1, safe: new THREE.Vector3(0, 0.22, 49), safeT: 0, walkT: 0, gesture: null, gestureT: 0 };
const hero = new THREE.Group(); scene.add(hero);
{
  const robeMat = new THREE.MeshLambertMaterial({ color: '#e9dcc0', emissive: '#3a3020', emissiveIntensity: 0.35, flatShading: true });
  const robe = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.38, 0.02], [0.35, 0.22], [0.27, 0.6], [0.2, 0.88], [0.13, 1.0], [0, 1.03]].map(([x, y]) => new THREE.Vector2(x, y)), 9), robeMat);
  hero.add(robe); hero.userData.robe = robe;
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 5, 14), new THREE.MeshLambertMaterial({ color: '#b5652b', emissive: '#3a1a08', emissiveIntensity: 0.4 })); sash.rotation.x = Math.PI / 2; sash.position.y = 0.62; hero.add(sash);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshLambertMaterial({ color: '#c99a6e', emissive: '#2a1a0e', emissiveIntensity: 0.4 })); head.position.y = 1.16; hero.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a1d14' });
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), eyeMat); eye.position.set(sx * 0.06, 1.18, 0.155); hero.add(eye); }
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 10, Math.PI * 0.18, Math.PI * 1.64, 0, Math.PI * 0.62), new THREE.MeshLambertMaterial({ color: '#cdb68d', emissive: '#30261a', emissiveIntensity: 0.35, side: THREE.DoubleSide, flatShading: true }));
  hood.position.y = 1.17; hood.rotation.y = Math.PI; hero.add(hood);
  const capeGeo = new THREE.BufferGeometry(); // 上窄下宽的披肩
  capeGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, -0.33, -0.78, -0.04, 0.33, -0.78, -0.04], 3)); capeGeo.setIndex([0, 2, 1, 1, 2, 3]); capeGeo.computeVertexNormals();
  const cape = new THREE.Mesh(capeGeo, new THREE.MeshLambertMaterial({ color: '#3c7468', emissive: '#0c2220', emissiveIntensity: 0.45, side: THREE.DoubleSide }));
  cape.position.set(0, 1.02, -0.17); hero.add(cape); hero.userData.cape = cape;
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 3, 6), robeMat); arm.position.set(0.17, 0.78, 0.22); arm.rotation.x = 1.25; hero.add(arm); hero.userData.arm = arm;
  // 陶灯：浅碗 + 捏出的灯嘴（随时代变样，见设计文档第 2 节）
  const lamp = new THREE.Group(); lamp.position.set(0.17, 0.72, 0.42); hero.add(lamp); hero.userData.lamp = lamp;
  const clay = new THREE.MeshLambertMaterial({ color: '#b4683f', flatShading: true });
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.1, 0.01], [0.13, 0.05], [0.12, 0.08], [0.1, 0.075]].map(([x, y]) => new THREE.Vector2(x, y)), 10), clay); lamp.add(bowl);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 5), clay); spout.rotation.x = Math.PI / 2; spout.position.set(0, 0.06, 0.15); lamp.add(spout);
  const flame = glowSprite('#ffb547', 0.55, 0); flame.position.set(0, 0.14, 0.2); lamp.add(flame);
  const core = glowSprite('#fff2c2', 0.2, 0); core.position.copy(flame.position); lamp.add(core);
  const light = new THREE.PointLight('#ffb35c', 0, 10, 1.6); light.position.copy(flame.position); lamp.add(light);
  hero.userData.flame = flame; hero.userData.core = core; hero.userData.lampLight = light;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow); hero.userData.shadow = shadow;
}
// 引路之光：飞在下一个剧情节点上空
const guide = { orb: glowSprite('#fff0c8', 1.8, 1), core: glowSprite('#ffffff', 0.5, 1), pos: new THREE.Vector3(0, 1.6, 40), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, dur: 1 };
scene.add(guide.orb); scene.add(guide.core);
const trail = (() => {
  const n = 36, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ map: TEX.glow, size: 0.42, color: '#ffe2a6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return p;
})();

/* ============================================================================
   11. 输入：键盘、鼠标、触屏
   ========================================================================== */
const keys = new Set();
const input = { joyX: 0, joyY: 0, jumpHeld: false, jumpPressed: false, look: { dx: 0, dy: 0 }, zoom: 0, lastLook: 0 };
let gameState = 'title'; // title | play | story | modal
addEventListener('keydown', (e) => {
  if (e.repeat && (e.code === 'Space' || e.code === 'Enter')) return;
  keys.add(e.code);
  if (e.code === 'KeyL' && (gameState === 'play' || gameState === 'story')) { setLang(LANG === 'en' ? 'bi' : 'en'); return; }
  if (gameState === 'story' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); story.advance(); return; }
  if (gameState === 'modal') { if (e.code === 'Escape' || e.code === 'KeyB' || e.code === 'Enter') { e.preventDefault(); closeModals(); } return; }
  if (gameState !== 'play') return;
  if (e.code === 'Space') { e.preventDefault(); input.jumpHeld = true; input.jumpPressed = true; }
  if (e.code === 'KeyB') openBook();
  if (e.code === 'KeyR') doGesture('rest');
  if (e.code === 'KeyF') doGesture('name');
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space') input.jumpHeld = false; });
addEventListener('blur', () => { keys.clear(); input.jumpHeld = false; });
// 鼠标拖动看四周 + 滚轮缩放（触屏：右半边拖动）
const pointers = new Map();
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { const p = pointers.get(e.pointerId); if (!p) return; input.look.dx += e.clientX - p.x; input.look.dy += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; input.lastLook = performance.now(); });
const endPtr = (e) => pointers.delete(e.pointerId);
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); input.zoom += Math.sign(e.deltaY); }, { passive: false });
// 虚拟摇杆
{
  const joy = $('joy'), knob = $('joy-knob'); let id = null, cx = 0, cy = 0;
  joy.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(id); move(e); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = 52; if (d > max) { dx *= max / d; dy *= max / d; } knob.style.transform = `translate(${dx}px, ${dy}px)`; input.joyX = dx / max; input.joyY = -dy / max; };
  joy.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; input.joyX = input.joyY = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  const jb = $('t-jump');
  jb.addEventListener('pointerdown', (e) => { e.preventDefault(); if (gameState === 'story') { story.advance(); return; } input.jumpHeld = true; input.jumpPressed = true; });
  const jend = () => { input.jumpHeld = false; }; jb.addEventListener('pointerup', jend); jb.addEventListener('pointercancel', jend); jb.addEventListener('pointerleave', jend);
  $('t-rest').addEventListener('click', () => doGesture('rest'));
  $('t-name').addEventListener('click', () => doGesture('name'));
}
function moveInput() {
  let x = input.joyX, y = input.joyY;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  const mag = Math.hypot(x, y); if (mag > 1) { x /= mag; y /= mag; }
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(input.joyX, input.joyY) > 0.92;
  return { x, y, mag: Math.min(1, mag), run };
}

/* ============================================================================
   12. 镜头：第三人称，平滑跟随
   ========================================================================== */
const cam = { yaw: 0, pitch: 0.3, dist: IS_TOUCH ? 8 : 7, pos: new THREE.Vector3(0, 3, 56), look: new THREE.Vector3() };
function updateCamera(dt, moving) {
  const sens = IS_TOUCH ? 0.006 : 0.005;
  cam.yaw -= input.look.dx * sens; cam.pitch = clamp(cam.pitch + input.look.dy * sens * 0.8, -0.12, 1.15); input.look.dx = input.look.dy = 0;
  if (input.zoom) { cam.dist = clamp(cam.dist * (1 + input.zoom * 0.1), 3.5, 15); input.zoom = 0; }
  // 走路时镜头慢慢转到身后（像一位安静的同伴）
  if (moving && performance.now() - input.lastLook > 1600) cam.yaw += angleDiff(player.facing + Math.PI, cam.yaw) * (1 - Math.exp(-0.9 * dt));
  const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.25, player.pos.z);
  const off = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist);
  // 镜头不要钻进树里：如果镜头位置靠近树，就往玩家这边拉近一点
  let k = 1;
  if (W.green > 0.5) for (; k > 0.35; k -= 0.08) { const px = target.x + off.x * k, pz = target.z + off.z * k; let hit = false; for (const [tx, tz, rg] of TREE_SPOTS) { if (rg === 'eden' && !isDone('e1')) continue; if ((tx - px) ** 2 + (tz - pz) ** 2 < 3.2) { hit = true; break; } } if (!hit) break; }
  const desired = target.clone().addScaledVector(off, k);
  const gy = groundAt(desired.x, desired.z); const minY = (gy === null ? 0.3 : gy + 0.6); if (desired.y < minY) desired.y = minY;
  cam.pos.lerp(desired, 1 - Math.exp(-9 * dt));
  camera.position.copy(cam.pos);
  const look = target.clone().add(new THREE.Vector3(0, W.lookUp * 9, 0)).lerp(W.focus, W.focusAmt * 0.65);
  cam.look.lerp(look, 1 - Math.exp(-6 * dt));
  camera.lookAt(cam.look);
}

/* ============================================================================
   13. 世界效果（effects）：剧情里的 fx 名字对应这里的函数
   instant = true 时直接跳到结果（用于读档）
   ========================================================================== */
const tweens = [];
function tween(obj, key, to, dur, instant, ease = easeInOut) {
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj && tweens[i].key === key) tweens.splice(i, 1);
  if (instant || dur <= 0) { obj[key] = to; return; }
  tweens.push({ obj, key, from: obj[key], to, dur, t: 0, ease });
}
function updateTweens(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const k = clamp(tw.t / tw.dur, 0, 1); tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(k)); if (k >= 1) tweens.splice(i, 1); } }
const nightPulse = { t: 1 };
function setFocus(x, y, z, amt, holdSec) { W.focus.set(x, y, z); tween(W, 'focusAmt', amt, 1.6); if (holdSec) setTimeout(() => tween(W, 'focusAmt', 0, 2), holdSec * 1000); }
let namingStart = -1;
const FX = {
  wind(inst) { if (!inst) { tween(W, 'wind', 1, 2); sfx.whoosh(); } },
  light(inst) { tween(W, 'light', 1, 3.2, inst); W.lampLit = true; if (!inst) { flash('white', 0.85); sfx.swell(); music.set('day1'); } },
  sky(inst) { tween(W, 'sky', 1, 6, inst); if (!inst) { W.lookUp = 0; tween(W, 'lookUp', 0.6, 2); setTimeout(() => tween(W, 'lookUp', 0, 2.5), 5500); music.set('day2'); } },
  land(inst) { tween(W, 'land', 1, inst ? 0 : 7); if (!inst) { sfx.rumble(); music.set('day3'); } },
  plants(inst) { growth.main.start.value = inst ? -100 : U.time.value + 0.3; tween(W, 'green', 1, 5, inst); },
  lights(inst) { tween(W, 'lights', 1, 5, inst); if (!inst) { const d = skyUniforms.uSunDir.value; setFocus(player.pos.x + d.x * 40, player.pos.y + d.y * 40, player.pos.z + d.z * 40, 1, 7); music.set('day4'); } },
  creatures(inst) { birds.visible = true; fish.visible = true; birds.userData.fade = inst ? 1 : 0; if (!inst) { tween(W, 'lookUp', 0.5, 2); setTimeout(() => tween(W, 'lookUp', 0, 2.5), 6000); music.set('day5'); } },
  animals(inst) { for (const sp in animalMeshes) animalMeshes[sp].visible = true; animals.forEach(a => { a.appear = inst ? 1 : -Math.random() * 1.5; }); if (!inst) music.set('day6'); },
  humans(inst) { eastLights.forEach(s => { s.userData.on = true; s.material.opacity = inst ? 0.9 : 0; }); if (!inst) setFocus(56, 6, -20, 0.9, 6); },
  rest(inst) { tween(W, 'rest', 1, 6, inst); if (!inst) music.set('rest'); },
  evening(inst) { if (!inst) { nightPulse.t = 0; sfx.chime(0); } },
  openEden(inst) { W.edenOpen = true; },
  eden(inst) {
    growth.eden.start.value = inst ? -100 : U.time.value + 0.2;
    [treeLife, treeKnow].forEach((t, i) => { t.visible = true; t.userData.grow = inst ? 1 : -i * 0.6; });
    bridges.forEach(b => { b.mesh.visible = true; });
    adam.visible = true; adam.userData.appear = inst ? 1 : 0; eastLights.forEach(s => { s.userData.on = false; });
    if (!inst) { music.set('eden'); setFocus(TREE_LIFE_POS[0], 5, TREE_LIFE_POS[1], 0.7, 5); }
  },
  rivers(inst) { W.riverLabels = true; },
  naming(inst) {
    W.naming = true; dove.visible = true;
    const spots = { sheep: [-2.4, 1.2], deer: [-1.4, -2.5], lion: [1.9, -2.0] };
    for (const sp in spots) { const a = animals.find(x => x.sp === sp); a.special = { x: ADAM_POS[0] + spots[sp][0], z: ADAM_POS[1] + spots[sp][1] }; a.appear = 1; animalMeshes[sp].visible = true; if (!inst) { a.x = a.special.x - 9; a.z = a.special.z + 4; } else { a.x = a.special.x; a.z = a.special.z; } }
    dove.position.set(ADAM_POS[0] + 1.2, terrainY(ADAM_POS[0] + 1.2, ADAM_POS[1] + 1.6) + 0.9, ADAM_POS[1] + 1.6);
    namingStart = inst ? U.time.value - 100 : U.time.value;
    if (!inst) setFocus(ADAM_POS[0], 1.2, ADAM_POS[1], 0.8, 9);
  },
  sleep(inst) { if (!inst) { adam.userData.sleep = 1; flash('white', 0.7, 1.4); setFocus(ADAM_POS[0], 0.6, ADAM_POS[1], 0.8, 8); } },
  eve(inst) { adam.userData.sleep = 0; eve.visible = true; eve.userData.appear = inst ? 1 : 0; if (!inst) sfx.swell(0.6); },
  serpent(inst) { serpent.visible = true; serpent.userData.grow = inst ? 1 : 0; tween(W, 'shadow', 1, 4, inst); if (!inst) { setFocus(TREE_KNOW_POS[0], 4, TREE_KNOW_POS[1], 0.9, 7); music.set('shadow'); } },
  end(inst) { if (!inst) setTimeout(showEnd, 700); },
};
function flash(color, peak = 0.8, hold = 0.25) { const f = $('fade'); f.classList.toggle('black', color === 'black'); f.style.transition = 'opacity .35s ease'; f.style.opacity = peak; setTimeout(() => { f.style.transition = 'opacity 1.6s ease'; f.style.opacity = 0; }, hold * 1000); }

/* ============================================================================
   14. 剧情系统（BeatRunner）+ 字幕
   ========================================================================== */
const save = { done: [], cards: [], relics: [], pieces: { creation: [], eden: [] }, verses: [], gestures: [] };
const isDone = id => save.done.includes(id);
const nextBeat = () => BEATS.find(b => !isDone(b.id)) || null;
const story = {
  beat: null, idx: -1, shownAt: 0,
  start(b) { this.beat = b; this.idx = -1; gameState = 'story'; document.body.classList.add('in-story'); $('story').hidden = false; requestAnimationFrame(() => $('story').classList.add('on')); setHud(b); this.next(); },
  next() {
    this.idx++; const L = this.beat.lines[this.idx];
    if (!L) return this.finish();
    const tag = $('story-tag'), txt = $('story-text');
    // 标签：Scripture · Genesis 1:3 · ESV ｜ 经文 · 创 1:3 · 和合本
    tag.dataset.k = L.k; tag.innerHTML = bi(L.ref ? join(KIND_LABEL[L.k], ' · ', refText(L.ref), ' · ', UI.version) : KIND_LABEL[L.k]);
    txt.className = 'k-' + L.k; void txt.offsetWidth; txt.classList.add('fade'); txt.innerHTML = bi(L.t, 'blk');
    $('story-box').scrollTop = 0;
    this.shownAt = performance.now();
    if (L.fx && FX[L.fx]) FX[L.fx](false);
  },
  advance() { if (performance.now() - this.shownAt < 380) return; this.next(); },
  skip() { while (this.beat && this.idx < this.beat.lines.length - 1) { this.idx++; const L = this.beat.lines[this.idx]; if (L.fx && FX[L.fx]) FX[L.fx](false); } this.finish(); },
  finish() {
    const b = this.beat; if (!b) return; this.beat = null;
    $('story').classList.remove('on'); document.body.classList.remove('in-story'); setTimeout(() => { $('story').hidden = true; }, 500);
    if (gameState === 'story') gameState = 'play';
    save.done.push(b.id);
    (b.rewards || []).forEach((r, i) => setTimeout(() => grant(r), 300 + i * 650));
    if (b.after && FX[b.after]) FX[b.after](false);
    afterBeatHints(b.id); persist(); refreshCounts(); moveGuide(); setDays();
  },
};
$('story').addEventListener('click', (e) => { if (e.target.id === 'story-skip') return; story.advance(); });
$('story-skip').addEventListener('click', (e) => { e.stopPropagation(); story.skip(); });
function setHud(b) {
  const ep = EPISODES[b.ep] || {};
  const book = (b.hud && b.hud.book) || ep.book;
  if (book) { const r = refText(book, 'name'); $('tl-book').innerHTML = bi({ en: refText(book).en, zh: r.zh }); }
  if (b.hud) { $('tl-label').innerHTML = bi(b.hud.label); $('tl-sub').innerHTML = bi(b.hud.sub); }
  $('tl-days').style.display = b.ep === 'creation' ? '' : 'none';
}
function setDays() {
  const d = $('tl-days'); d.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    const el = document.createElement('i'); if (isDone('day' + i)) el.className = 'on';
    const t = fill(UI.day, { n: i }); el.title = LANG === 'en' ? t.en : `${t.en} · 第${UI.dayNums[i - 1]}日`; d.appendChild(el);
  }
}
function moveGuide() {
  const b = nextBeat(); if (!b) { guide.orb.visible = guide.core.visible = false; return; }
  const gy = Math.max(groundAt(b.at[0], b.at[1]) ?? 0.22, 0.22);
  guide.from.copy(guide.pos); guide.to.set(b.at[0], gy + 1.7, b.at[1]);
  guide.dur = clamp(guide.from.distanceTo(guide.to) / 7, 0.8, 8); guide.t = 0;
}
let hintTimer = 0;
function hint(text, sec = 6) { const h = $('hint'); h.innerHTML = bi(text, 'blk'); h.classList.add('show'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.remove('show'), sec * 1000); }
function afterBeatHints(id) {
  const H = HINTS[id]; if (!H) return;
  const text = H.en ? H : (IS_TOUCH ? H.touch : H.desk); // 有些提示分手机 / 电脑两种
  setTimeout(() => hint(text, 7), 1600);
}

/* ============================================================================
   15. 收集与图鉴
   ========================================================================== */
const verseText = ref => { for (const b of BEATS) for (const L of b.lines) if (L.ref === ref) return L.t; return null; };
function toast(kind, text) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="t-kind">${bi(kind, 'blk')}</span><span class="t-text">${bi(text, 'blk')}</span>`;
  $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3400); setTimeout(() => el.remove(), 3950);
}
function grant(r) {
  if (r.type === 'relic' && !save.relics.includes(r.id)) { save.relics.push(r.id); toast(UI.toast.relic, RELICS[r.id].name); sfx.chime(4); }
  if (r.type === 'piece') {
    const arr = save.pieces[r.win];
    if (!arr.includes(r.i)) {
      arr.push(r.i); const w = WINDOWS[r.win], n = `${arr.length}/${w.pieces.length}`;
      toast(UI.toast.piece, join(w.name, ' · ', w.pieces[r.i], { en: ` (${n})`, zh: `（${n}）` })); sfx.chime(2);
      if (arr.length === w.pieces.length) setTimeout(() => toast(UI.toast.done, fill(UI.windowDone, { w: w.name })), 1200);
    }
  }
  if (r.type === 'verse' && !save.verses.includes(r.ref)) { save.verses.push(r.ref); toast(UI.toast.verse, refText(r.ref)); }
  if (r.type === 'gesture' && !save.gestures.includes(r.id)) { save.gestures.push(r.id); toast(UI.toast.gesture, GESTURES[r.id].name); updateGestureButtons(); }
  persist(); refreshCounts();
}
function refreshCounts() {
  const pc = save.pieces.creation.length + save.pieces.eden.length, C = UI.counts;
  $('counts').innerHTML = `${bi(C.windows)} <b>${pc}</b>/12 · ${bi(C.cards)} <b>${save.cards.length}</b>/${CARDS.length} · ${bi(C.relics)} <b>${save.relics.length}</b>/2`;
}
function updateGestureButtons() { if (!IS_TOUCH) return; $('t-rest').hidden = !save.gestures.includes('rest'); $('t-name').hidden = !save.gestures.includes('name'); }
// 世界里的陶片和红玛瑙
const pickups = CARDS.map(c => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.shard, transparent: true, depthWrite: false, fog: false })); s.scale.setScalar(1.1); scene.add(s); return { card: c, sprite: s }; });
const ONYX_POS = riverPoint(RIVERS[0], 15.5, 2.6);
const onyxSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.gem, transparent: true, depthWrite: false, fog: false })); onyxSprite.scale.setScalar(1.2); scene.add(onyxSprite);
function cardAvailable(c) { if (c.ep === 'eden') return isDone('e1'); return c.onPath ? true : W.land > 0.97; }
function openCard(c) {
  gameState = 'modal'; $('card-modal').hidden = false;
  const tag = $('card-tag'); tag.className = 'o-tag k-' + c.k; tag.innerHTML = bi(join(UI.potsherd, ' · ', KIND_LABEL[c.k]));
  $('card-title').innerHTML = bi(c.title, 'blk'); $('card-text').innerHTML = bi(c.text, 'blk'); $('card-ok').focus();
  $('card-scroll').scrollTop = 0;
}
$('card-ok').addEventListener('click', closeModals);
function closeModals() { $('card-modal').hidden = true; $('book').hidden = true; $('end-screen').hidden = true; if (gameState === 'modal') gameState = story.beat ? 'story' : 'play'; }
$('btn-book').addEventListener('click', () => { if (gameState === 'play') openBook(); });
$('book-close').addEventListener('click', closeModals);
$('book').addEventListener('click', (e) => { if (e.target.id === 'book') closeModals(); });

// —— 彩窗：用 SVG 画成教堂的彩色玻璃窗 ——
const P2 = (r, a) => [120 + r * Math.cos(a), 120 + r * Math.sin(a)];
function sector(r0, r1, a0, a1) { const [x0, y0] = P2(r0, a0), [x1, y1] = P2(r1, a0), [x2, y2] = P2(r1, a1), [x3, y3] = P2(r0, a1); const lg = a1 - a0 > Math.PI ? 1 : 0; return `M${x0} ${y0}L${x1} ${y1}A${r1} ${r1} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${lg} 0 ${x0} ${y0}Z`; }
const DARK_GLASS = '#272b36';
function creationWindowSVG(got) {
  const cols = ['#f3d36b', '#6fb7e9', '#78c06a', '#f2a23a', '#45b5ae', '#d9775a'];
  const icons = [
    (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#fffbe6"/>` + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${x + Math.cos(a) * 10}" y1="${y + Math.sin(a) * 10}" x2="${x + Math.cos(a) * 16}" y2="${y + Math.sin(a) * 16}" stroke="#fffbe6" stroke-width="2.5" stroke-linecap="round"/>`; }).join(''),
    (x, y) => `<path d="M${x - 16} ${y - 7}q4 -5 8 0t8 0t8 0t8 0" fill="none" stroke="#ffffff" stroke-width="2.5"/><line x1="${x - 16}" y1="${y}" x2="${x + 16}" y2="${y}" stroke="#e8f6ff" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${x - 16} ${y + 8}q4 -5 8 0t8 0t8 0t8 0" fill="none" stroke="#ffffff" stroke-width="2.5"/>`,
    (x, y) => `<path d="M${x - 18} ${y + 10}Q${x - 4} ${y - 6} ${x + 18} ${y + 10}Z" fill="#3f7d3a"/><line x1="${x + 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 6}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x + 4}" cy="${y - 10}" r="7" fill="#2f6b2c"/>`,
    (x, y) => `<circle cx="${x - 6}" cy="${y}" r="8" fill="#fff3c4"/><path d="M${x + 10} ${y - 9}a9 9 0 1 0 0 18a7 7 0 1 1 0 -18z" fill="#f5f0e0"/><circle cx="${x + 2}" cy="${y - 14}" r="1.6" fill="#fff"/><circle cx="${x + 15}" cy="${y + 12}" r="1.6" fill="#fff"/>`,
    (x, y) => `<path d="M${x - 16} ${y + 6}q8 -8 16 0q-8 8 -16 0z" fill="#e8fbff"/><path d="M${x} ${y + 6}l6 -5v10z" fill="#e8fbff"/><path d="M${x + 2} ${y - 10}q5 -5 9 0q4 -5 9 0" fill="none" stroke="#ffffff" stroke-width="2.4"/>`,
    (x, y) => `<ellipse cx="${x - 6}" cy="${y + 4}" rx="9" ry="6" fill="#fff6ea"/><circle cx="${x + 4}" cy="${y + 2}" r="3.2" fill="#3d3430"/><circle cx="${x + 12}" cy="${y - 9}" r="3.6" fill="#fff6ea"/><path d="M${x + 12} ${y - 5}v12" stroke="#fff6ea" stroke-width="3"/>`,
  ];
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="Window of Creation"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (let i = 0; i < 6; i++) {
    const a0 = -Math.PI / 2 + i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = got.includes(i);
    s += `<path d="${sector(44, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? cols[i] : DARK_GLASS}" stroke="#141414" stroke-width="3.5" opacity="${on ? 0.95 : 1}"/>`;
    if (on) { const [x, y] = P2(76, (a0 + a1) / 2); s += icons[i](x, y); } else { const [x, y] = P2(76, (a0 + a1) / 2); s += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#5d6272">${i + 1}</text>`; }
  }
  const on7 = got.includes(6);
  s += `<circle cx="120" cy="120" r="40" fill="${on7 ? '#f6ead0' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  if (on7) { let star = ''; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + i * Math.PI / 7, r = i % 2 ? 11 : 26; const [x, y] = P2(r, a); star += `${i ? 'L' : 'M'}${x} ${y}`; } s += `<path d="${star}Z" fill="#e6b84f"/><text x="120" y="126" text-anchor="middle" font-size="15" font-weight="700" fill="#5a3d0a">7</text>`; }
  else s += `<text x="120" y="125" text-anchor="middle" font-size="14" fill="#5d6272">7</text>`;
  if (got.length === 7) s += `<circle cx="120" cy="120" r="112" fill="none" stroke="#ffcf7a" stroke-width="2" opacity=".8"/>`;
  return s + '</svg>';
}
function edenWindowSVG(got) {
  // 中央是泉源，四道河沿对角线流出，把窗分成四块：西=园子，北=命名，东=两棵树，南=夏娃
  const quads = [{ i: 0, a: Math.PI, col: '#5fb35a' }, { i: 3, a: -Math.PI / 2, col: '#d8b46a' }, { i: 2, a: 0, col: '#e2a03f' }, { i: 4, a: Math.PI / 2, col: '#e3929a' }];
  const icon = {
    0: (x, y) => `<circle cx="${x - 8}" cy="${y - 4}" r="7" fill="#2f6b2c"/><circle cx="${x + 6}" cy="${y - 8}" r="8" fill="#3f7d3a"/><circle cx="${x + 2}" cy="${y + 6}" r="7" fill="#2f6b2c"/>`,
    3: (x, y) => `<ellipse cx="${x - 7}" cy="${y + 2}" rx="8" ry="5.5" fill="#fff6ea"/><circle cx="${x + 2}" cy="${y}" r="3" fill="#3d3430"/><path d="M${x + 8} ${y - 6}l10 -8M${x + 12} ${y - 9}l2 -6" stroke="#7e5233" stroke-width="2.4" stroke-linecap="round"/>`,
    2: (x, y) => `<line x1="${x - 8}" y1="${y + 10}" x2="${x - 8}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 7}" r="7" fill="#ffe08a"/><line x1="${x + 9}" y1="${y + 10}" x2="${x + 9}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x + 9}" cy="${y - 7}" r="7" fill="#2f6b2c"/><circle cx="${x + 7}" cy="${y - 6}" r="1.8" fill="#f0a83a"/><circle cx="${x + 12}" cy="${y - 9}" r="1.8" fill="#f0a83a"/>`,
    4: (x, y) => `<circle cx="${x - 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x - 9}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/><circle cx="${x + 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x + 3}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/>`,
  };
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="Window of Eden"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (const q of quads) { const on = got.includes(q.i); s += `<path d="${sector(34, 108, q.a - Math.PI / 4 + 0.05, q.a + Math.PI / 4 - 0.05)}" fill="${on ? q.col : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`; const [x, y] = P2(74, q.a); s += on ? icon[q.i](x, y) : `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#5d6272">${q.i + 1}</text>`; }
  for (let k = 0; k < 4; k++) { const a = -Math.PI * 3 / 4 + k * Math.PI / 2, [x0, y0] = P2(34, a), [x1, y1] = P2(110, a); s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${got.includes(1) ? '#57a9e0' : '#2f3542'}" stroke-width="7" stroke-linecap="round"/>`; }
  const on2 = got.includes(1);
  s += `<circle cx="120" cy="120" r="30" fill="${on2 ? '#57a9e0' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>` + (on2 ? `<circle cx="120" cy="120" r="9" fill="none" stroke="#e8f6ff" stroke-width="2"/><circle cx="120" cy="120" r="17" fill="none" stroke="#e8f6ff" stroke-width="1.5" opacity=".7"/>` : `<text x="120" y="125" text-anchor="middle" font-size="14" fill="#5d6272">2</text>`);
  if (got.length === 5) s += `<circle cx="120" cy="120" r="112" fill="none" stroke="#ffcf7a" stroke-width="2" opacity=".8"/>`;
  return s + '</svg>';
}
const relicIcon = id => id === 'first-light' ? `<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="9" fill="#fff4cf"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ffcf7a" stroke-width="2" stroke-dasharray="3 4"/></svg>` : `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 8l13 8v16l-13 8l-13-8V16z" fill="#b3242c"/><path d="M18 18l8-4l-3 9z" fill="#ffffff" opacity=".55"/></svg>`;
const KCOL = { scripture: 'var(--k-scripture)', history: 'var(--k-history)', imagination: 'var(--k-imagination)', reflection: 'var(--k-reflection)' };
const TABS = ['windows', 'relics', 'cards', 'verses', 'gestures'];
let bookTab = 'windows';
// 版权声明：ESV 要求在引用的作品里写明（Crossway 标准使用指引）
const notices = () => `<div class="notice"><p>${esc(UI.esvNotice)} <span class="site">www.esv.org</span></p><p class="zh" lang="zh-CN">${esc(UI.cuvNotice)}</p></div>`;
function openBook(tab) {
  if (tab) bookTab = tab; gameState = 'modal'; $('book').hidden = false;
  const tabs = $('book-tabs'); tabs.innerHTML = '';
  for (const id of TABS) { const b = document.createElement('button'); b.className = 'tab'; b.role = 'tab'; b.innerHTML = bi(UI.tabs[id]); b.setAttribute('aria-selected', String(id === bookTab)); b.onclick = () => openBook(id); tabs.appendChild(b); }
  const body = $('book-body'); body.innerHTML = '';
  const lock = '<span class="q">???</span>';
  if (bookTab === 'windows') {
    const wrap = document.createElement('div'); wrap.className = 'windows';
    for (const key of ['creation', 'eden']) {
      const w = WINDOWS[key], got = save.pieces[key];
      const card = document.createElement('div'); card.className = 'window-card';
      const meta = join(refText(w.ref), ' · ', fill(UI.collected, { n: `${got.length}/${w.pieces.length}` }));
      card.innerHTML = `<h3>${bi(w.name)}</h3><div class="meta">${bi(meta, 'blk')}</div>${key === 'creation' ? creationWindowSVG(got) : edenWindowSVG(got)}<ol>${w.pieces.map((p, i) => `<li class="${got.includes(i) ? 'got' : ''}">${got.includes(i) ? bi(p) : lock}</li>`).join('')}</ol>`;
      wrap.appendChild(card);
    }
    body.appendChild(wrap);
  } else if (bookTab === 'relics') {
    const list = document.createElement('div'); list.className = 'list';
    for (const id in RELICS) {
      const r = RELICS[id], on = save.relics.includes(id); const it = document.createElement('div'); it.className = 'item' + (on ? '' : ' locked');
      it.innerHTML = `<div class="ico">${on ? relicIcon(id) : '?'}</div><div><h4>${on ? bi(r.name) : bi(UI.notFound)}${on ? `<span class="ref">${bi(refText(r.ref))}</span>` : ''}</h4><p>${on ? bi(r.desc, 'blk') : bi(UI.relicHint[id], 'blk')}</p></div>`;
      list.appendChild(it);
    }
    body.appendChild(list);
  } else if (bookTab === 'cards') {
    const L = UI.legend;
    body.insertAdjacentHTML('beforeend', `<div class="legend"><span class="l-s">${bi(L.scripture)}</span><span class="l-h">${bi(L.history)}</span><span class="l-i">${bi(L.imagination)}</span><span class="l-r">${bi(L.reflection)}</span></div>`);
    const grid = document.createElement('div'); grid.className = 'ost-grid';
    for (const c of CARDS) {
      const on = save.cards.includes(c.id), ep = EPISODES[c.ep]; const b = document.createElement('button'); b.className = 'ost-mini' + (on ? '' : ' locked'); b.style.setProperty('--kc', KCOL[c.k]);
      const sub = fill(UI.chapter, { n: ep.n, t: ep.title });
      b.innerHTML = `${on ? bi(c.title, 'blk') : bi(UI.undiscovered, 'blk')}<small>${bi(on ? join(sub, ' · ', KIND_LABEL[c.k]) : sub, 'blk')}</small>`;
      if (on) b.onclick = () => { $('book').hidden = true; openCard(c); }; grid.appendChild(b);
    }
    body.appendChild(grid);
  } else if (bookTab === 'verses') {
    const list = document.createElement('div'); list.className = 'list';
    if (!save.verses.length) list.innerHTML = `<div class="empty">${bi(UI.noVerses, 'blk')}</div>`;
    for (const ref of save.verses) {
      const t = verseText(ref); if (!t) continue;
      const r = refText(ref); const d = document.createElement('div'); d.className = 'verse';
      d.innerHTML = `<div class="vt">${bi(t, 'blk')}</div><div class="vr">${bi({ en: `${r.en} (ESV)`, zh: `${r.zh}（和合本）` })}</div>`; list.appendChild(d);
    }
    body.appendChild(list);
    body.insertAdjacentHTML('beforeend', notices());
  } else {
    const list = document.createElement('div'); list.className = 'list';
    for (const id in GESTURES) {
      const g = GESTURES[id], on = save.gestures.includes(id); const it = document.createElement('div'); it.className = 'item' + (on ? '' : ' locked');
      it.innerHTML = `<div class="ico">${on ? (IS_TOUCH ? bi(UI.tap, 'blk') : g.key) : '?'}</div><div><h4>${on ? bi(g.name) : bi(UI.notLearned)}</h4><p>${on ? bi(g.desc, 'blk') : bi(UI.learnHint, 'blk')}</p></div>`;
      list.appendChild(it);
    }
    body.appendChild(list);
  }
}
function doGesture(id) { if (gameState !== 'play' || !save.gestures.includes(id) || !player.onGround) return; player.gesture = player.gesture === id ? null : id; player.gestureT = 0; if (player.gesture === 'rest') { music.duck(true); hint(UI.resting, 4); } else music.duck(false); }
function showEnd() {
  gameState = 'modal'; $('end-screen').hidden = false;
  const pc = save.pieces.creation.length + save.pieces.eden.length, S = UI.endStats;
  $('end-stats').innerHTML = [[pc + '/12', S[0]], [save.cards.length + '/' + CARDS.length, S[1]], [save.relics.length + '/2', S[2]], [save.verses.length, S[3]]].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${bi(s, 'blk')}</span></div>`).join('');
}
$('end-book').addEventListener('click', () => { $('end-screen').hidden = true; openBook('windows'); });
$('end-continue').addEventListener('click', closeModals);

/* ============================================================================
   16. 声音：用 WebAudio 现场合成（不需要音频文件）
   ========================================================================== */
let actx = null, master = null, muted = false;
const music = { voices: [], gain: null, filter: null, cur: null,
  CHORDS: { dark: [73.4, 110, 146.8], day1: [146.8, 185, 220, 293.7], day2: [196, 246.9, 293.7, 392], day3: [220, 277.2, 329.6, 440], day4: [246.9, 293.7, 370, 493.9], day5: [196, 293.7, 392, 493.9], day6: [146.8, 220, 293.7, 370], rest: [146.8, 220, 277.2, 329.6], eden: [146.8, 185, 220, 329.6], shadow: [138.6, 164.8, 207.7, 277.2] },
  set(name) { if (!actx || this.cur === name) return; this.cur = name; const f = this.CHORDS[name], t = actx.currentTime; this.voices.forEach((v, i) => { const hz = f[i % f.length] * (i >= f.length ? 2 : 1); v.o1.frequency.setTargetAtTime(hz, t, 1.2); v.o2.frequency.setTargetAtTime(hz * 1.004, t, 1.2); }); this.gain.gain.setTargetAtTime(name === 'dark' ? 0.05 : 0.11, t, 2); this.filter.frequency.setTargetAtTime(name === 'dark' ? 380 : 1300, t, 2.5); },
  duck(on) { if (actx) this.gain.gain.setTargetAtTime(on ? 0.04 : 0.11, actx.currentTime, 1.2); },
};
let windGain = null, verb = null;
function initAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = actx.createGain(); master.gain.value = 0.8; master.connect(actx.destination);
  // 简单的混响
  verb = actx.createConvolver(); const len = actx.sampleRate * 2.6, ir = actx.createBuffer(2, len, actx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  verb.buffer = ir; const vg = actx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
  // 风声
  const nb = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = actx.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.5;
  const lfo = actx.createOscillator(); lfo.frequency.value = 0.07; const lg = actx.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
  windGain = actx.createGain(); windGain.gain.value = 0.05; ns.connect(bp); bp.connect(windGain); windGain.connect(master); windGain.connect(verb); ns.start();
  // 和弦铺底
  music.filter = actx.createBiquadFilter(); music.filter.type = 'lowpass'; music.filter.frequency.value = 380; music.gain = actx.createGain(); music.gain.gain.value = 0;
  music.filter.connect(music.gain); music.gain.connect(master); music.gain.connect(verb);
  for (let i = 0; i < 5; i++) { const o1 = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain(); o1.type = 'triangle'; o2.type = 'sine'; g.gain.value = 0.16; o1.connect(g); o2.connect(g); g.connect(music.filter); o1.frequency.value = 110; o2.frequency.value = 110; o1.start(); o2.start(); music.voices.push({ o1, o2 }); }
  music.set(W.light > 0.5 ? (W.rest > 0.5 ? 'rest' : 'day1') : 'dark');
}
const PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7];
const sfx = {
  tone(f, t0, dur, vol, type = 'sine') { if (!actx || muted) return; const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(master); g.connect(verb); o.start(t0); o.stop(t0 + dur + 0.05); },
  chime(i = 0) { if (!actx) return; const t = actx.currentTime; this.tone(PENTA[i % PENTA.length], t, 1.6, 0.09); this.tone(PENTA[(i + 2) % PENTA.length] * 2, t + 0.09, 1.2, 0.04); },
  swell(v = 1) { if (!actx) return; const t = actx.currentTime; [293.7, 370, 440, 587.3, 740].forEach((f, i) => this.tone(f, t + i * 0.08, 3.4, 0.05 * v, 'triangle')); },
  whoosh() { if (windGain) { windGain.gain.setTargetAtTime(0.16, actx.currentTime, 0.4); windGain.gain.setTargetAtTime(0.05, actx.currentTime + 3, 1.5); } },
  rumble() { if (!actx) return; const t = actx.currentTime; this.tone(55, t, 5, 0.12, 'triangle'); this.tone(82.4, t + 0.3, 4.5, 0.07, 'triangle'); },
};
$('btn-sound').addEventListener('click', () => { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, actx.currentTime, 0.2); $('snd-text').innerHTML = bi(muted ? UI.muted : UI.sound); $('snd-wave').style.display = muted ? 'none' : ''; });

/* ============================================================================
   17. 存档（浏览器本地，可能不可用，所以都包在 try/catch 里）
   ========================================================================== */
const SAVE_KEY = 'guangzhiyue-proto-v1';
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, pos: [player.pos.x, player.pos.y, player.pos.z] })); } catch (e) { /* 存不了也没关系 */ } }
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && Array.isArray(s.done) ? s : null; } catch (e) { return null; } }
function applySave(s) {
  // v0.1 的存档里经文出处写成 '创 1:3'，v0.2 改成 'Gen 1:3'
  const verses = (s.verses || []).map(r => r.replace(/^创 /, 'Gen '));
  Object.assign(save, { done: s.done || [], cards: s.cards || [], relics: s.relics || [], pieces: s.pieces || { creation: [], eden: [] }, verses, gestures: s.gestures || [] });
  for (const b of BEATS) if (isDone(b.id)) { for (const L of b.lines) if (L.fx && L.fx !== 'end' && FX[L.fx]) FX[L.fx](true); if (b.after && FX[b.after]) FX[b.after](true); }
  const last = [...BEATS].reverse().find(b => isDone(b.id)); if (last) setHud(last);
  if (Array.isArray(s.pos)) { player.pos.set(s.pos[0], s.pos[1], s.pos[2]); const g = groundAt(player.pos.x, player.pos.z); if (g === null) { const b = last || BEATS[0]; player.pos.set(b.at[0], 0.5, b.at[1]); } }
  player.safe.copy(player.pos); stones.update();
}

/* ============================================================================
   18. 主循环
   ========================================================================== */
function updatePlayer(dt) {
  const mi = gameState === 'play' ? moveInput() : { x: 0, y: 0, mag: 0, run: false };
  if (player.gesture && mi.mag > 0.1) { player.gesture = null; music.duck(false); }
  const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const wish = fwd.multiplyScalar(mi.y).add(right.multiplyScalar(mi.x));
  const speed = (mi.run ? 7.2 : 4.3) * (player.gliding ? 1.3 : 1);
  player.vel.x = damp(player.vel.x, wish.x * speed, player.onGround ? 11 : 2.5, dt);
  player.vel.z = damp(player.vel.z, wish.z * speed, player.onGround ? 11 : 2.5, dt);
  if (mi.mag > 0.05) player.facing += angleDiff(Math.atan2(wish.x, wish.z), player.facing) * (1 - Math.exp(-12 * dt));
  const barrier = (x) => !W.edenOpen && x > 33.5;
  const canGo = (x, z) => { if (barrier(x)) { if (!W.toldBarrier) { W.toldBarrier = true; hint(UI.barrier, 5); } return false; } if (!player.onGround) return true; const g = groundAt(x, z); return g !== null && g - player.pos.y < 0.8; };
  const nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.z * dt;
  if (canGo(nx, nz)) { player.pos.x = nx; player.pos.z = nz; } else if (canGo(nx, player.pos.z)) player.pos.x = nx; else if (canGo(player.pos.x, nz)) player.pos.z = nz; else { player.vel.x *= 0.2; player.vel.z *= 0.2; }
  const g = groundAt(player.pos.x, player.pos.z);
  if (input.jumpPressed) { player.jumpBuf = 0.15; input.jumpPressed = false; }
  player.jumpBuf -= dt; player.coyote -= dt;
  if (player.onGround) {
    if (g === null || g < player.pos.y - 0.7) { player.onGround = false; player.coyote = 0.12; }
    else { player.pos.y = damp(player.pos.y, g, 25, dt); player.vel.y = 0; }
  }
  if (player.jumpBuf > 0 && (player.onGround || player.coyote > 0) && gameState === 'play' && !player.gesture) { player.vel.y = 7.6; player.onGround = false; player.coyote = 0; player.jumpBuf = 0; }
  if (!player.onGround) {
    player.vel.y -= 20 * dt;
    player.gliding = input.jumpHeld && player.vel.y < 0 && player.energy > 0 && W.lampLit;
    if (player.gliding) { player.vel.y = Math.max(player.vel.y, -1.5); player.energy = Math.max(0, player.energy - dt * 0.2); }
    player.pos.y += player.vel.y * dt;
    if (g !== null && player.pos.y <= g && player.vel.y <= 0) { player.pos.y = g; player.onGround = true; player.vel.y = 0; player.gliding = false; }
  } else { player.gliding = false; player.energy = Math.min(1, player.energy + dt * 0.6); }
  if (player.pos.y < -1.4) { flash('black', 1, 0.5); player.pos.copy(player.safe); player.vel.set(0, 0, 0); player.onGround = true; }
  player.safeT -= dt; if (player.onGround && g !== null && g > 0.05 && player.safeT <= 0) { player.safe.copy(player.pos); player.safeT = 0.4; }
  // —— 角色动画 ——
  const hv = Math.hypot(player.vel.x, player.vel.z); player.walkT += dt * (2 + hv * 1.9);
  const bob = player.onGround ? Math.abs(Math.sin(player.walkT)) * 0.05 * clamp(hv / 4, 0, 1) : 0;
  player.gestureT += dt;
  const sit = player.gesture === 'rest' ? smooth(0, 0.6, player.gestureT) : 0;
  hero.position.set(player.pos.x, player.pos.y + bob - sit * 0.32, player.pos.z);
  hero.rotation.y = player.facing;
  const ud = hero.userData;
  ud.robe.scale.set(1 + sit * 0.25, 1 - sit * 0.3, 1 + sit * 0.25);
  ud.robe.rotation.z = Math.sin(player.walkT) * 0.04 * clamp(hv / 4, 0, 1);
  ud.cape.rotation.x = player.gliding ? -1.2 : damp(ud.cape.rotation.x, -0.12 - clamp(hv / 7, 0, 1) * 0.45, 6, dt);
  ud.cape.scale.x = player.gliding ? 1.9 : damp(ud.cape.scale.x, 1, 6, dt);
  const point = player.gesture === 'name' ? smooth(0, 0.4, player.gestureT) : 0;
  ud.arm.rotation.x = 1.25 + point * 0.25; ud.arm.position.y = 0.78 + point * 0.25;
  ud.lamp.position.y = 0.72 + point * 0.3 - sit * 0.05 + Math.sin(player.walkT * 0.5) * 0.015;
  const lit = W.lampLit ? 1 : 0, flick = 0.92 + Math.sin(U.time.value * 13) * 0.04 + Math.sin(U.time.value * 7.3) * 0.04;
  ud.flame.material.opacity = lit * flick; ud.flame.scale.setScalar(0.45 + player.energy * 0.25);
  ud.core.material.opacity = lit; ud.lampLight.intensity = lit * (3.2 + player.energy * 1.5) * flick;
  const sh = ud.shadow; const sg = g ?? player.pos.y; sh.position.set(player.pos.x, sg + 0.03, player.pos.z); sh.material.opacity = clamp(1 - (player.pos.y - sg) / 6, 0.2, 1) * (0.4 + W.light * 0.6);
  return hv > 0.5;
}
function updateWorld(dt, t) {
  updateTweens(dt);
  // 有晚上，有早晨
  if (nightPulse.t < 1) { nightPulse.t = Math.min(1, nightPulse.t + dt / 5.5); W.night = Math.pow(Math.sin(nightPulse.t * Math.PI), 1.4) * 0.88; } else W.night = 0;
  // —— 天空颜色 ——
  const mix4 = (out, a, b, k) => { for (let i = 0; i < 4; i++) out[i].copy(a[i]).lerp(b[i], k); };
  const C = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()], T2 = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
  mix4(C, PAL.dark, PAL.pearl, W.light);
  mix4(T2, C, PAL.blue, W.sky); for (let i = 0; i < 4; i++) C[i].copy(T2[i]);
  mix4(T2, C, PAL.sun, W.lights); for (let i = 0; i < 4; i++) C[i].copy(T2[i]);
  mix4(T2, C, PAL.rest, W.rest * 0.75); for (let i = 0; i < 4; i++) C[i].copy(T2[i]);
  mix4(T2, C, PAL.night, W.night * W.light); for (let i = 0; i < 4; i++) C[i].copy(T2[i]);
  const shade = 1 - W.shadow * 0.18; C.forEach(c => c.multiplyScalar(shade));
  skyUniforms.uTop.value.copy(C[0]); skyUniforms.uMid.value.copy(C[1]); skyUniforms.uBot.value.copy(C[2]);
  scene.fog.color.copy(C[3]);
  scene.fog.near = lerp(5, 55, W.light); scene.fog.far = lerp(48, 330, W.light);
  const day = W.light * (1 - W.night * 0.75);
  skyUniforms.uSun.value = W.lights * (1 - W.night); skyUniforms.uGlow.value = W.lights * (1 - W.night) + W.rest * 0.6;
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  stars.material.opacity = W.lights * (0.12 + 0.88 * W.night);
  moon.position.copy(camera.position).addScaledVector(moonDir, 600); moon.material.opacity = W.lights * (0.25 + 0.75 * W.night);
  const sd = skyUniforms.uSunDir.value; sunHalo.position.copy(camera.position).addScaledVector(sd, 600); sunHalo.material.opacity = W.lights * (1 - W.night) * 0.55;
  clouds.forEach(c => { c.material.opacity = W.sky * 0.75 * (1 - W.night * 0.6); c.material.color.copy(C[1]).lerp(new THREE.Color('#ffffff'), 0.6); c.position.x += dt * c.userData.speed; if (c.position.x > 420) c.position.x = -380; });
  // —— 灯光 ——
  hemi.color.copy(C[1]).lerp(new THREE.Color('#ffffff'), 0.45); hemi.groundColor.set('#5a4a38').lerp(new THREE.Color('#1a1712'), 1 - W.light);
  hemi.intensity = 0.06 + day * 1.15;
  sunLight.intensity = day * (0.45 + W.lights * 1.35) * (1 - W.shadow * 0.3);
  if (W.lights > 0.01) sunLight.position.copy(sd).multiplyScalar(100); else sunLight.position.set(10, 100, 20);
  sunLight.color.set('#fff2dc').lerp(new THREE.Color('#ffc98a'), W.rest * 0.6);
  // —— 地形与水 ——
  terrainGroup.position.y = landOffset(); terrainUniforms.uGreen.value = W.green; waterUniforms.uLand.value = W.land;
  if (W.land > 0 && W.land < 1.0001 && W._landDrawn !== W.land) { stones.update(); W._landDrawn = W.land; }
  // —— 风 ——
  const wp = windMotes.geometry.attributes.position, cx = player.pos.x, cz = player.pos.z;
  for (let i = 0; i < wp.count; i++) {
    let x = wp.getX(i) + dt * (2.2 + (i % 5) * 0.3), z = wp.getZ(i) + Math.sin(t * 0.7 + i) * dt * 0.6, y = wp.getY(i);
    if (x - cx > 35) x -= 70; if (x - cx < -35) x += 70; if (z - cz > 35) z -= 70; if (z - cz < -35) z += 70;
    const gy = W.land > 0.5 ? Math.max(terrainY(x, z), 0) : 0; if (y < gy + 0.2) y = gy + 0.2 + (i % 7) * 0.3;
    wp.setXYZ(i, x, y, z);
  }
  wp.needsUpdate = true; windMotes.material.opacity = (1 - W.light) * 0.75 * W.wind + W.light * 0.07;
  // —— 鸟 ——
  if (birds.visible) {
    birds.userData.fade = Math.min(1, (birds.userData.fade || 0) + dt * 0.3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    birds.userData.b.forEach((b, i) => { const a = b.a + t * b.sp; const x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, y = b.h + Math.sin(t * 0.8 + b.ph) * 1.5; const yaw = Math.atan2(-Math.sin(a) * b.sp, Math.cos(a) * b.sp); q.setFromEuler(e.set(0, yaw, Math.sign(b.sp) * 0.25)); s.setScalar(birds.userData.fade * 1.15); m4.compose(new THREE.Vector3(x, y, z), q, s); birds.setMatrixAt(i, m4); });
    birds.instanceMatrix.needsUpdate = true;
  }
  // —— 鱼 ——
  if (fish.visible) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), R = Math.random;
    fish.userData.f.forEach((f, i) => {
      f.t += dt; const rip = fish.userData.ripples[i];
      if (f.t >= f.dur) { f.t = -1.5 - R() * 4; const a = R() * 6.28, r = R() * f.rr; f.ax = f.cx + Math.cos(a) * r; f.az = f.cz + Math.sin(a) * r; const b = a + (R() - 0.5) * 2; f.bx = f.ax + Math.cos(b) * 1.6; f.bz = f.az + Math.sin(b) * 1.6; }
      if (f.t < 0) { m4.makeScale(0, 0, 0); fish.setMatrixAt(i, m4); rip.material.opacity = Math.max(0, rip.material.opacity - dt * 0.8); rip.scale.multiplyScalar(1 + dt * 0.8); return; }
      const k = f.t / f.dur, x = lerp(f.ax, f.bx, k), z = lerp(f.az, f.bz, k), y = Math.sin(k * Math.PI) * 1.3 - 0.1;
      q.setFromEuler(e.set(-Math.cos(k * Math.PI) * 0.9, Math.atan2(f.bx - f.ax, f.bz - f.az), 0)); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); fish.setMatrixAt(i, m4);
      if (k > 0.92 && rip.material.opacity < 0.1) { rip.position.set(f.bx, 0.08, f.bz); rip.scale.set(0.6, 0.6, 1); rip.material.opacity = 0.7; }
    });
    fish.instanceMatrix.needsUpdate = true;
  }
  // —— 走兽 ——
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3();
  for (const a of animals) {
    if (!a.mesh.visible) continue;
    a.appear = Math.min(1, a.appear + dt * 0.6);
    let tx = a.tx, tz = a.tz;
    if (a.special) { tx = a.special.x; tz = a.special.z; }
    else { a.wait -= dt; if (a.wait <= 0 && Math.hypot(a.tx - a.x, a.tz - a.z) < 0.3) { const ang = Math.random() * 6.28, r = Math.random() * a.home[2]; a.tx = a.home[0] + Math.cos(ang) * r; a.tz = a.home[1] + Math.sin(ang) * r; a.wait = 2 + Math.random() * 5; } }
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz); let moving = false;
    if (d > 0.25 && (a.wait <= 0 || a.special)) { const st = Math.min(d, a.speed * dt * (a.special ? 1.6 : 1)); const nx = a.x + dx / d * st, nz = a.z + dz / d * st; if (groundAt(nx, nz) !== null && terrainY(nx, nz) > 0.1) { a.x = nx; a.z = nz; moving = true; a.yaw += angleDiff(Math.atan2(dx, dz), a.yaw) * (1 - Math.exp(-5 * dt)); } else { a.tx = a.x; a.tz = a.z; } }
    if (a.special && d < 0.3) a.yaw += angleDiff(Math.atan2(ADAM_POS[0] - a.x, ADAM_POS[1] - a.z), a.yaw) * (1 - Math.exp(-3 * dt));
    const gy = terrainY(a.x, a.z), sc = clamp(a.appear, 0, 1); const hop = moving ? Math.abs(Math.sin(t * 7 + a.phase)) * 0.06 : 0;
    const graze = !moving && !a.special ? Math.max(0, Math.sin(t * 0.5 + a.phase)) * 0.12 : 0;
    q.setFromEuler(e.set(graze, a.yaw, 0)); sv.setScalar(sc * (a.sp === 'sheep' ? 0.68 : 0.85)); m4.compose(new THREE.Vector3(a.x, gy + hop, a.z), q, sv); a.mesh.setMatrixAt(a.i, m4);
  }
  for (const sp in animalMeshes) animalMeshes[sp].instanceMatrix.needsUpdate = true;
  // —— 东方的两道光（第六日造人）——
  eastLights.forEach((s, i) => { const target = s.userData.on ? 0.9 : 0; s.material.opacity = damp(s.material.opacity, target, 1.5, dt); s.position.y = 6 + Math.sin(t * 0.9 + i) * 0.5; s.visible = s.material.opacity > 0.01; });
  // —— 伊甸：树、人、蛇、鸽子 ——
  for (const [tree, p] of [[treeLife, TREE_LIFE_POS], [treeKnow, TREE_KNOW_POS]]) { if (!tree.visible) continue; tree.userData.grow = Math.min(1, (tree.userData.grow ?? 1) + dt * 0.35); const k = smooth(0, 1, tree.userData.grow); tree.scale.setScalar(Math.max(0.001, k)); tree.position.set(p[0], terrainY(p[0], p[1]) - 0.1, p[1]); }
  for (const [pp, P, f] of [[adam, ADAM_POS, false], [eve, EVE_POS, true]]) {
    if (!pp.visible) continue; pp.userData.appear = Math.min(1, (pp.userData.appear ?? 1) + dt * 0.5);
    const k = smooth(0, 1, pp.userData.appear), sleep = pp.userData.sleepK = damp(pp.userData.sleepK || 0, pp.userData.sleep ? 1 : 0, 2.5, dt);
    pp.position.set(P[0], terrainY(P[0], P[1]) + sleep * 0.25, P[1]); pp.scale.setScalar(Math.max(0.001, k)); pp.rotation.z = sleep * 1.45;
    const face = Math.atan2(player.pos.x - P[0], player.pos.z - P[1]); pp.rotation.y = damp(pp.rotation.y, W.naming && !f ? Math.atan2(-2, 1) : face, 2, dt);
    pp.userData.mat.emissiveIntensity = 0.85 + Math.sin(t * 1.3 + (f ? 1 : 0)) * 0.1; pp.userData.halo.material.opacity = 0.5 * k;
    if (!f && W.naming) { const k2 = smooth(0, 0.8, t - namingStart); pp.userData.armR.rotation.z = -0.12 - k2 * 1.0; }
  }
  if (serpent.visible) { serpent.userData.grow = Math.min(1, serpent.userData.grow + dt * 0.4); serpent.scale.setScalar(Math.max(0.001, smooth(0, 1, serpent.userData.grow))); serpent.position.set(TREE_KNOW_POS[0], terrainY(TREE_KNOW_POS[0], TREE_KNOW_POS[1]), TREE_KNOW_POS[1]); serpent.rotation.y = Math.sin(t * 0.4) * 0.08; }
  if (dove.visible) dove.rotation.y = Math.sin(t * 0.6) * 0.5;
  // —— 引路之光 ——
  if (guide.t < 1) { guide.t = Math.min(1, guide.t + dt / guide.dur); const k = easeInOut(guide.t); guide.pos.lerpVectors(guide.from, guide.to, k); guide.pos.y += Math.sin(k * Math.PI) * 3; }
  else { const b = nextBeat(); if (b) { const gy = Math.max(groundAt(b.at[0], b.at[1]) ?? 0.22, 0.22); guide.to.y = gy + 1.7; guide.pos.y = damp(guide.pos.y, guide.to.y + Math.sin(t * 1.6) * 0.25, 3, dt); } }
  guide.orb.position.copy(guide.pos); guide.core.position.copy(guide.pos);
  guide.orb.scale.setScalar(1.8 + Math.sin(t * 2.2) * 0.2);
  const gd = player.pos.distanceTo(guide.pos), showTrail = gameState === 'play' && gd > 6 && guide.orb.visible;
  trail.material.opacity = damp(trail.material.opacity, showTrail ? 0.8 : 0, 3, dt);
  if (trail.material.opacity > 0.01) {
    const tp = trail.geometry.attributes.position, n = tp.count, from = new THREE.Vector3(player.pos.x, player.pos.y + 1.0, player.pos.z), span = Math.min(gd, 26);
    const dir = guide.pos.clone().sub(from).normalize();
    for (let i = 0; i < n; i++) { const f = ((i / n) + t * 0.18) % 1, d = f * span; tp.setXYZ(i, from.x + dir.x * d, from.y + dir.y * d + Math.sin(f * Math.PI) * 0.6, from.z + dir.z * d); }
    tp.needsUpdate = true;
  }
  // —— 拾取物 ——
  for (const p of pickups) {
    const c = p.card, got = save.cards.includes(c.id), av = cardAvailable(c);
    p.sprite.visible = !got && av;
    if (!p.sprite.visible) continue;
    const gy = groundAt(c.at[0], c.at[1]) ?? 0.2; p.sprite.position.set(c.at[0], gy + 0.9 + Math.sin(t * 2 + c.at[0]) * 0.12, c.at[1]);
    if (gameState === 'play' && Math.hypot(player.pos.x - c.at[0], player.pos.z - c.at[1]) < 1.6 && Math.abs(player.pos.y - gy) < 3) { save.cards.push(c.id); persist(); refreshCounts(); sfx.chime(5); openCard(c); }
  }
  const onyxOn = isDone('e1') && !save.relics.includes('onyx');
  onyxSprite.visible = onyxOn;
  if (onyxOn) { const gy = terrainY(ONYX_POS[0], ONYX_POS[1]); onyxSprite.position.set(ONYX_POS[0], gy + 0.8 + Math.sin(t * 2.5) * 0.12, ONYX_POS[1]); if (gameState === 'play' && Math.hypot(player.pos.x - ONYX_POS[0], player.pos.z - ONYX_POS[1]) < 1.7) grant({ type: 'relic', id: 'onyx' }); }
  // —— 触发剧情 ——
  if (gameState === 'play') { const b = nextBeat(); if (b && Math.hypot(player.pos.x - b.at[0], player.pos.z - b.at[1]) < (b.r || 2.6) && player.onGround) { player.gesture = null; story.start(b); } }
}
// —— 世界标签（河名、动物名）——
const labels = [];
function addLabel(cls, html, getPos, visible) { const el = document.createElement('div'); el.className = 'wlabel ' + cls; el.innerHTML = html; $('labels').appendChild(el); labels.push({ el, getPos, visible }); }
RIVERS.forEach((rv, i) => { const [x, z] = riverPoint(rv, 11); addLabel('river', `<div class="nm">${esc(rv.name.en)}</div><div class="zh" lang="zh-CN">${esc(rv.name.zh)}</div>`, () => new THREE.Vector3(x, Math.max(terrainY(x, z), 0) + 1.2, z), () => W.riverLabels && W.land > 0.9); });
const NAME_ORDER = ['sheep', 'deer', 'lion', 'dove'];
NAME_ORDER.forEach((sp, i) => { const n = ANIMAL_NAMES[sp]; addLabel('animal', `<div class="nm">${esc(n.en)}</div><div class="zh" lang="zh-CN">${esc(n.zh)}</div><div class="he" lang="he">${n.he}</div><div class="tr">${n.tr}</div>`, () => { if (sp === 'dove') return dove.position.clone().add(new THREE.Vector3(0, 0.5, 0)); const a = animals.find(x => x.sp === sp && x.special); return a ? new THREE.Vector3(a.x, terrainY(a.x, a.z) + (sp === 'deer' ? 2.4 : 1.7), a.z) : null; }, () => W.naming && U.time.value - namingStart > 2.5 + i * 1.3); });
const _v = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight;
  for (const L of labels) {
    const vis = L.visible(); const p = vis ? L.getPos() : null;
    if (!p) { L.el.style.opacity = 0; continue; }
    const dist = p.distanceTo(camera.position); _v.copy(p).project(camera);
    const maxD = L.el.classList.contains('river') ? 20 : 16;
    if (_v.z > 1 || dist > maxD) { L.el.style.opacity = 0; continue; }
    L.el.style.opacity = clamp((maxD - dist) / 5, 0, 1); L.el.style.transform = `translate(-50%, -100%) translate(${(_v.x * 0.5 + 0.5) * w}px, ${(-_v.y * 0.5 + 0.5) * h}px)`;
    if (!L.chimed) { L.chimed = true; if (L.el.classList.contains('animal')) sfx.chime(3); }
  }
}
let fpsAcc = 0, fpsN = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.min((now - lastNow) / 1000, 0.05); lastNow = now; U.time.value += dt; const t = U.time.value;
  const moving = updatePlayer(dt);
  updateWorld(dt, t);
  updateCamera(dt, moving);
  updateLabels();
  renderer.render(scene, camera);
  if (DEBUG) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsAcc)} fps · ${renderer.info.render.calls} calls`; fpsAcc = 0; fpsN = 0; } }
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ---------- 开始 ---------- */
function startGame(fromSave) {
  initAudio();
  $('title-screen').hidden = true; $('hud').hidden = false; if (IS_TOUCH) { $('touch').hidden = false; document.body.classList.add('touch'); }
  if (fromSave) { const s = loadSave(); if (s) applySave(s); }
  updateGestureButtons(); refreshCounts(); setDays(); gameState = 'play';
  guide.pos.set(player.pos.x, player.pos.y + 1.6, player.pos.z - 3); moveGuide();
  cam.yaw = player.facing + Math.PI; cam.pos.set(player.pos.x + Math.sin(cam.yaw) * 7, player.pos.y + 3, player.pos.z + Math.cos(cam.yaw) * 7);
  if (music.gain && W.light > 0.5) music.set(W.rest > 0.5 ? 'rest' : (isDone('e1') ? 'eden' : 'day1'));
  if (!fromSave) flash('black', 1, 0.6);
}
$('btn-start').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} startGame(false); });
$('btn-continue').addEventListener('click', () => startGame(true));
if (loadSave()) { $('btn-continue').hidden = false; $('btn-start').innerHTML = bi(UI.startOver); }
// 语言：标题页的两个选项 + 游戏里右上角的按钮 + L 键
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
$('btn-lang').addEventListener('click', () => setLang(LANG === 'en' ? 'bi' : 'en'));
setLang(LANG);
if (DEBUG) {
  $('fps').hidden = false;
  window.__gzy = {
    W, save, player, cam, BEATS, scene, guide, trail, camera,
    // 立刻完成下一个剧情节点（测试用）
    completeNext() { const b = nextBeat(); if (!b) return null; player.pos.set(b.at[0], (groundAt(b.at[0], b.at[1]) ?? 0.3), b.at[1]); for (const L of b.lines) if (L.fx && L.fx !== 'end' && FX[L.fx]) FX[L.fx](true); save.done.push(b.id); (b.rewards || []).forEach(grant); if (b.after && FX[b.after]) FX[b.after](true); setHud(b); setDays(); moveGuide(); stones.update(); return b.id; },
    teleport(x, z, yaw) { player.pos.set(x, (groundAt(x, z) ?? 0.3), z); if (yaw !== undefined) { cam.yaw = yaw; player.facing = yaw + Math.PI; } cam.pos.set(x + Math.sin(cam.yaw) * cam.dist, player.pos.y + 3, z + Math.cos(cam.yaw) * cam.dist); },
    start: startGame, story, openBook, closeModals, showEnd, hint, setLang, HINTS, UI,
    openCard: id => openCard(CARDS.find(c => c.id === id)),
  };
}
frame();
