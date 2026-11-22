// 图鉴里的画：每扇彩窗和每件信物的图标，都用 SVG 现画（原创，不用图片文件）。
// got 是已经得到的碎片编号；没得到的那一片是暗的，上面写着它是第几片。
// 彩窗的名字来自内容（已经是安全的文字），所以可以直接放进 SVG 里。

/** 彩窗的圆心在 (120, 120)。给半径 r 和角度 a，算出那一点的坐标 */
const polar = (r: number, a: number): [number, number] => [120 + r * Math.cos(a), 120 + r * Math.sin(a)];

/** 一块扇形玻璃：半径从 r0 到 r1，角度从 a0 到 a1 */
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r0, a0), [x1, y1] = polar(r1, a0), [x2, y2] = polar(r1, a1), [x3, y3] = polar(r0, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}L${x1} ${y1}A${r1} ${r1} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${large} 0 ${x0} ${y0}Z`;
}

const DARK_GLASS = '#272b36';
type Icon = (x: number, y: number) => string;

/** 还没得到的那一片：只写一个数字 */
const numberMark = (x: number, y: number, n: number): string =>
  `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" fill="#5d6272">${n}</text>`;

/** 集齐之后，整扇窗外面多一圈金边 */
const GOLD_RIM = '<circle cx="120" cy="120" r="112" fill="none" stroke="#ffcf7a" stroke-width="2" opacity=".8"/>';

/** 创造之窗：外圈六块是第一到第六日，中央是第七日 */
function creationWindowSVG(got: number[], label: string): string {
  const cols = ['#f3d36b', '#6fb7e9', '#78c06a', '#f2a23a', '#45b5ae', '#d9775a'];
  const icons: Icon[] = [
    // 第一日：光
    (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="#fffbe6"/>` + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${x + Math.cos(a) * 10}" y1="${y + Math.sin(a) * 10}" x2="${x + Math.cos(a) * 16}" y2="${y + Math.sin(a) * 16}" stroke="#fffbe6" stroke-width="2.5" stroke-linecap="round"/>`; }).join(''),
    // 第二日：上面的水和下面的水
    (x, y) => `<path d="M${x - 16} ${y - 7}q4 -5 8 0t8 0t8 0t8 0" fill="none" stroke="#ffffff" stroke-width="2.5"/><line x1="${x - 16}" y1="${y}" x2="${x + 16}" y2="${y}" stroke="#e8f6ff" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${x - 16} ${y + 8}q4 -5 8 0t8 0t8 0t8 0" fill="none" stroke="#ffffff" stroke-width="2.5"/>`,
    // 第三日：地和树
    (x, y) => `<path d="M${x - 18} ${y + 10}Q${x - 4} ${y - 6} ${x + 18} ${y + 10}Z" fill="#3f7d3a"/><line x1="${x + 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 6}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x + 4}" cy="${y - 10}" r="7" fill="#2f6b2c"/>`,
    // 第四日：日、月、星
    (x, y) => `<circle cx="${x - 6}" cy="${y}" r="8" fill="#fff3c4"/><path d="M${x + 10} ${y - 9}a9 9 0 1 0 0 18a7 7 0 1 1 0 -18z" fill="#f5f0e0"/><circle cx="${x + 2}" cy="${y - 14}" r="1.6" fill="#fff"/><circle cx="${x + 15}" cy="${y + 12}" r="1.6" fill="#fff"/>`,
    // 第五日：鱼和鸟
    (x, y) => `<path d="M${x - 16} ${y + 6}q8 -8 16 0q-8 8 -16 0z" fill="#e8fbff"/><path d="M${x} ${y + 6}l6 -5v10z" fill="#e8fbff"/><path d="M${x + 2} ${y - 10}q5 -5 9 0q4 -5 9 0" fill="none" stroke="#ffffff" stroke-width="2.4"/>`,
    // 第六日：走兽和人
    (x, y) => `<ellipse cx="${x - 6}" cy="${y + 4}" rx="9" ry="6" fill="#fff6ea"/><circle cx="${x + 4}" cy="${y + 2}" r="3.2" fill="#3d3430"/><circle cx="${x + 12}" cy="${y - 9}" r="3.6" fill="#fff6ea"/><path d="M${x + 12} ${y - 5}v12" stroke="#fff6ea" stroke-width="3"/>`,
  ];
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (let i = 0; i < 6; i++) {
    const a0 = -Math.PI / 2 + i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = got.includes(i);
    s += `<path d="${sector(44, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? cols[i] : DARK_GLASS}" stroke="#141414" stroke-width="3.5" opacity="${on ? 0.95 : 1}"/>`;
    const [x, y] = polar(76, (a0 + a1) / 2);
    s += on ? icons[i](x, y) : numberMark(x, y, i + 1);
  }
  // 中央：第七日，一颗七角的星
  const on7 = got.includes(6);
  s += `<circle cx="120" cy="120" r="40" fill="${on7 ? '#f6ead0' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  if (on7) {
    let star = '';
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 7, r = i % 2 ? 11 : 26;
      const [x, y] = polar(r, a);
      star += `${i ? 'L' : 'M'}${x} ${y}`;
    }
    s += `<path d="${star}Z" fill="#e6b84f"/><text x="120" y="126" text-anchor="middle" font-size="15" font-weight="700" fill="#5a3d0a">7</text>`;
  } else {
    s += `<text x="120" y="125" text-anchor="middle" font-size="14" fill="#5d6272">7</text>`;
  }
  if (got.length === 7) s += GOLD_RIM;
  return s + '</svg>';
}

/** 伊甸之窗：中央是泉源，四道河沿对角线流出，把窗分成四块：西 = 园子，北 = 命名，东 = 两棵树，南 = 夏娃 */
function edenWindowSVG(got: number[], label: string): string {
  const quads = [{ i: 0, a: Math.PI, col: '#5fb35a' }, { i: 3, a: -Math.PI / 2, col: '#d8b46a' }, { i: 2, a: 0, col: '#e2a03f' }, { i: 4, a: Math.PI / 2, col: '#e3929a' }];
  const icon: Record<number, Icon> = {
    0: (x, y) => `<circle cx="${x - 8}" cy="${y - 4}" r="7" fill="#2f6b2c"/><circle cx="${x + 6}" cy="${y - 8}" r="8" fill="#3f7d3a"/><circle cx="${x + 2}" cy="${y + 6}" r="7" fill="#2f6b2c"/>`,
    3: (x, y) => `<ellipse cx="${x - 7}" cy="${y + 2}" rx="8" ry="5.5" fill="#fff6ea"/><circle cx="${x + 2}" cy="${y}" r="3" fill="#3d3430"/><path d="M${x + 8} ${y - 6}l10 -8M${x + 12} ${y - 9}l2 -6" stroke="#7e5233" stroke-width="2.4" stroke-linecap="round"/>`,
    2: (x, y) => `<line x1="${x - 8}" y1="${y + 10}" x2="${x - 8}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 7}" r="7" fill="#ffe08a"/><line x1="${x + 9}" y1="${y + 10}" x2="${x + 9}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x + 9}" cy="${y - 7}" r="7" fill="#2f6b2c"/><circle cx="${x + 7}" cy="${y - 6}" r="1.8" fill="#f0a83a"/><circle cx="${x + 12}" cy="${y - 9}" r="1.8" fill="#f0a83a"/>`,
    4: (x, y) => `<circle cx="${x - 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x - 9}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/><circle cx="${x + 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x + 3}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/>`,
  };
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (const q of quads) {
    const on = got.includes(q.i);
    s += `<path d="${sector(34, 108, q.a - Math.PI / 4 + 0.05, q.a + Math.PI / 4 - 0.05)}" fill="${on ? q.col : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
    const [x, y] = polar(74, q.a);
    s += on ? icon[q.i](x, y) : numberMark(x, y, q.i + 1);
  }
  // 四道河（第 2 片）
  const riversOn = got.includes(1);
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI * 3 / 4 + k * Math.PI / 2, [x0, y0] = polar(34, a), [x1, y1] = polar(110, a);
    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${riversOn ? '#57a9e0' : '#2f3542'}" stroke-width="7" stroke-linecap="round"/>`;
  }
  // 中央的泉源
  s += `<circle cx="120" cy="120" r="30" fill="${riversOn ? '#57a9e0' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`
    + (riversOn
      ? `<circle cx="120" cy="120" r="9" fill="none" stroke="#e8f6ff" stroke-width="2"/><circle cx="120" cy="120" r="17" fill="none" stroke="#e8f6ff" stroke-width="1.5" opacity=".7"/>`
      : `<text x="120" y="125" text-anchor="middle" font-size="14" fill="#5d6272">2</text>`);
  if (got.length === 5) s += GOLD_RIM;
  return s + '</svg>';
}

/**
 * 应许之窗（第 3 章）：外圈六块，颜色比前两扇暗（园子的颜色褪去了）；
 * 第 4 片“一条金线”（创 3:15）是一根从窗心穿出去的金线，伸到窗外，因为这个应许要一直接到以后的章节。
 * 外圈从正上方起，顺时针是第 1、2、3、5、6、7 片。
 */
function promiseWindowSVG(got: number[], label: string): string {
  const ring = [
    { i: 0, col: '#5f7d45' }, // 蛇的话
    { i: 1, col: '#b8763f' }, // 吃了
    { i: 2, col: '#6e8aa3' }, // 天起了凉风
    { i: 4, col: '#97714f' }, // 皮衣
    { i: 5, col: '#b46a4c' }, // 伊甸的东边
    { i: 6, col: '#8a3a2b' }, // 发火焰的剑
  ];
  const icon: Record<number, Icon> = {
    // 蛇：一条弯弯的身子
    0: (x, y) => `<path d="M${x - 14} ${y + 8}q7 -14 14 -4t14 -6" fill="none" stroke="#1f3319" stroke-width="5" stroke-linecap="round"/><circle cx="${x + 15}" cy="${y - 10}" r="3.5" fill="#1f3319"/>`,
    // 果子：一颗金色的果子（圣经没说是苹果）
    1: (x, y) => `<circle cx="${x}" cy="${y + 3}" r="9" fill="#f0a83a"/><path d="M${x} ${y - 6}q4 -7 10 -6q-3 6 -10 6z" fill="#3f6b2f"/>`,
    // 凉风：三道风
    2: (x, y) => [-8, 0, 8].map((d) => `<path d="M${x - 15} ${y + d}q6 -5 12 0t12 0" fill="none" stroke="#eef6ff" stroke-width="2.4" stroke-linecap="round"/>`).join(''),
    // 皮衣：一件简单的长衣
    4: (x, y) => `<path d="M${x - 6} ${y - 12}h12l8 8l-5 4v14h-18v-14l-5 -4z" fill="#5c3f27"/><path d="M${x - 4} ${y - 12}q4 5 8 0" fill="none" stroke="#2e1f13" stroke-width="1.8"/>`,
    // 伊甸的东边：两个人向东走，前面是升起的太阳
    5: (x, y) => `<path d="M${x + 4} ${y + 10}a10 10 0 0 1 20 0z" fill="#ffd9a0" opacity=".8"/><circle cx="${x - 12}" cy="${y - 6}" r="3.2" fill="#fff2dc"/><rect x="${x - 14.5}" y="${y - 2}" width="5" height="12" rx="2.5" fill="#fff2dc"/><circle cx="${x - 3}" cy="${y - 6}" r="3.2" fill="#fff2dc"/><rect x="${x - 5.5}" y="${y - 2}" width="5" height="12" rx="2.5" fill="#fff2dc"/>`,
    // 发火焰的剑：一把剑，四周是火
    6: (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="#ff8a2a" opacity=".45"/><line x1="${x - 12}" y1="${y + 12}" x2="${x + 12}" y2="${y - 12}" stroke="#ffe7b0" stroke-width="3.5" stroke-linecap="round"/><line x1="${x - 9}" y1="${y + 3}" x2="${x - 3}" y2="${y + 9}" stroke="#ffe7b0" stroke-width="3" stroke-linecap="round"/>`,
  };
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  ring.forEach((q, k) => {
    const a0 = -Math.PI / 2 + k * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = got.includes(q.i);
    s += `<path d="${sector(40, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? q.col : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
    const [x, y] = polar(76, (a0 + a1) / 2);
    s += on ? icon[q.i](x, y) : numberMark(x, y, q.i + 1);
  });
  // 窗心和金线（第 4 片）
  const threadOn = got.includes(3);
  s += `<circle cx="120" cy="120" r="36" fill="${threadOn ? '#2f2a1c' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  if (threadOn) {
    // 从窗心出发，弯弯地穿过外圈，一直伸到窗外：这条线以后还要接下去
    const thread = 'M120 132q-14 -8 0 -16t18 -12q24 -18 40 -52t36 -44';
    s += `<path d="${thread}" fill="none" stroke="#ffcf5a" stroke-width="9" stroke-linecap="round" opacity=".25"/>`
      + `<path d="${thread}" fill="none" stroke="#ffd36b" stroke-width="3.5" stroke-linecap="round"/>`
      + '<circle cx="120" cy="132" r="4" fill="#ffe7a0"/>';
  } else {
    s += numberMark(120, 120, 4);
  }
  if (got.length === 7) s += GOLD_RIM;
  return s + '</svg>';
}

/**
 * 献祭之窗（第 4 章）：外圈六块，从正上方起顺时针是第 1—6 片；
 * 中央是第 7 片“求告耶和华”：一座坛上的火，四周几盏灯（创 4:26）。这一章最沉重，所以最亮的放在中间。
 */
function offeringWindowSVG(got: number[], label: string): string {
  const cols = ['#8a6a4a', '#b7743e', '#4f4a5c', '#7d8a5e', '#9a7f63', '#4f7f86'];
  const icons: Icon[] = [
    // 两兄弟：一深一浅两个身形
    (x, y) => `<circle cx="${x - 7}" cy="${y - 8}" r="4" fill="#5a3a24"/><path d="M${x - 12} ${y + 10}l3 -14h4l3 14z" fill="#5a3a24"/><circle cx="${x + 7}" cy="${y - 8}" r="4" fill="#f3ead8"/><path d="M${x + 2} ${y + 10}l3 -14h4l3 14z" fill="#f3ead8"/>`,
    // 两份供物：两座坛，一座的烟笔直往上，一座的烟压得低低的
    (x, y) => `<rect x="${x - 15}" y="${y + 2}" width="10" height="8" rx="2" fill="#6e665c"/><rect x="${x + 5}" y="${y + 2}" width="10" height="8" rx="2" fill="#6e665c"/><path d="M${x - 10} ${y}q-3 -6 0 -10t0 -8" fill="none" stroke="#fff4d6" stroke-width="2.4" stroke-linecap="round"/><path d="M${x + 10} ${y}q5 -2 10 0" fill="none" stroke="#cfc6b8" stroke-width="2.4" stroke-linecap="round"/>`,
    // 罪伏在门前：一扇门，门口一团暗影
    (x, y) => `<rect x="${x - 6}" y="${y - 13}" width="12" height="22" rx="1.5" fill="#241b20"/><ellipse cx="${x + 9}" cy="${y + 7}" rx="8" ry="4.5" fill="#120c10"/>`,
    // 你兄弟在哪里：一片田，地上一团淡淡的光
    (x, y) => `<line x1="${x - 16}" y1="${y + 4}" x2="${x + 16}" y2="${y + 4}" stroke="#4a5236" stroke-width="2"/><ellipse cx="${x}" cy="${y + 4}" rx="11" ry="4" fill="#fff0c8" opacity=".85"/>`,
    // 记号：一个身形，额前一点光
    (x, y) => `<circle cx="${x}" cy="${y - 7}" r="5" fill="#5a3a24"/><path d="M${x - 6} ${y + 11}l3 -13h6l3 13z" fill="#5a3a24"/><circle cx="${x}" cy="${y - 8.5}" r="2.2" fill="#ffe7a0"/>`,
    // 琴和箫：一把琴，旁边一支箫
    (x, y) => `<path d="M${x - 11} ${y + 9}v-15q0 -5 4 -6M${x + 1} ${y + 9}v-15q0 -5 -4 -6M${x - 11} ${y + 9}h12" fill="none" stroke="#f2e3c4" stroke-width="2.2" stroke-linecap="round"/><path d="M${x - 8} ${y - 5}v13M${x - 5} ${y - 5}v13M${x - 2} ${y - 5}v13" stroke="#f2e3c4" stroke-width="1"/><line x1="${x + 7}" y1="${y + 10}" x2="${x + 15}" y2="${y - 10}" stroke="#f2e3c4" stroke-width="2.6" stroke-linecap="round"/>`,
  ];
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (let i = 0; i < 6; i++) {
    const a0 = -Math.PI / 2 + i * Math.PI / 3 - Math.PI / 6, a1 = a0 + Math.PI / 3, on = got.includes(i);
    s += `<path d="${sector(42, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? cols[i] : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
    const [x, y] = polar(76, (a0 + a1) / 2);
    s += on ? icons[i](x, y) : numberMark(x, y, i + 1);
  }
  // 中央：坛上的火，四周几盏灯
  const on7 = got.includes(6);
  s += `<circle cx="120" cy="120" r="38" fill="${on7 ? '#3a2f22' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  if (on7) {
    s += '<rect x="108" y="124" width="24" height="12" rx="3" fill="#8f877b"/>'
      + '<path d="M120 122c-7 -6 -6 -14 0 -22c6 8 7 16 0 22z" fill="#ffcf5a"/><path d="M120 120c-3 -3 -3 -7 0 -11c3 4 3 8 0 11z" fill="#fff4d6"/>'
      + [0, 1, 2, 3, 4].map((k) => { const [lx, ly] = polar(29, Math.PI * (0.15 + k * 0.175)); return `<circle cx="${lx}" cy="${ly}" r="2.6" fill="#ffd36b"/>`; }).join('');
  } else {
    s += numberMark(120, 120, 7);
  }
  if (got.length === 7) s += GOLD_RIM;
  return s + '</svg>';
}

/**
 * 家谱之窗（第 5 章）：外圈十块，一代一块，从正上方起顺时针是亚当到挪亚。
 * 每一块里是一座小房子；以诺那一块（第 7 片）是一团往上升的光，挪亚那一块（第 10 片）是一只船，下一章要用到。
 * 中间是一条路，集齐了路上亮起一串脚印。
 */
function generationsWindowSVG(got: number[], label: string): string {
  const house: Icon = (x, y) => `<path d="M${x - 7} ${y + 7}v-8l7 -6l7 6v8z" fill="#f3e6cc"/><rect x="${x - 2}" y="${y + 1}" width="4" height="6" fill="#5a4630"/>`;
  const light: Icon = (x, y) => `<circle cx="${x}" cy="${y - 2}" r="5" fill="#fff4d6"/><path d="M${x} ${y + 9}v-4M${x - 6} ${y + 7}l2 -3M${x + 6} ${y + 7}l-2 -3" stroke="#fff4d6" stroke-width="1.8" stroke-linecap="round"/>`;
  const boat: Icon = (x, y) => `<path d="M${x - 10} ${y + 1}h20l-4 6h-12z" fill="#8a6440"/><rect x="${x - 5}" y="${y - 5}" width="10" height="6" fill="#a98458"/>`;
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (let i = 0; i < 10; i++) {
    const a0 = -Math.PI / 2 + i * Math.PI / 5 - Math.PI / 10, a1 = a0 + Math.PI / 5, on = got.includes(i);
    // 颜色从暖到冷，一代一代往下传
    const col = `hsl(${32 + i * 16}, 38%, ${46 - i * 1.2}%)`;
    s += `<path d="${sector(46, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? (i === 6 ? '#d9b35a' : col) : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
    const [x, y] = polar(78, (a0 + a1) / 2);
    s += on ? (i === 6 ? light : i === 9 ? boat : house)(x, y) : numberMark(x, y, i + 1);
  }
  const all = got.length === 10;
  s += `<circle cx="120" cy="120" r="42" fill="${all ? '#2c2618' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  s += `<path d="M120 152q-10 -16 0 -32t0 -32" fill="none" stroke="${all ? '#c9a45a' : '#2f3542'}" stroke-width="5" stroke-linecap="round"/>`;
  if (all) s += [0, 1, 2, 3, 4].map((k) => `<ellipse cx="${120 + (k % 2 ? 4 : -4)}" cy="${146 - k * 13}" rx="2" ry="3.4" fill="#ffe7a0"/>`).join('') + GOLD_RIM;
  return s + '</svg>';
}

/**
 * 方舟之窗（第 6 章）：上半是天，下半是水。外圈六块从左上起顺时针是第 1、2、3、4、5、6 片，
 * 中间是第 7 片“坛”：一座坛和笔直往上的烟。集齐了，水面上方出现一道淡淡的弧（下一章的彩虹）。
 */
function arkWindowSVG(got: number[], label: string): string {
  const cols = ['#c8a46a', '#8a6a46', '#a89070', '#3f5f7a', '#6e7f58', '#7fa04a'];
  const icons: Icon[] = [
    // 一个义人：一个人，身上一点光
    (x, y) => `<circle cx="${x}" cy="${y - 8}" r="4" fill="#fff6e2"/><path d="M${x - 6} ${y + 10}l3 -14h6l3 14z" fill="#fff6e2"/><circle cx="${x}" cy="${y - 2}" r="12" fill="#ffe7a0" opacity=".25"/>`,
    // 方舟的造法：一个框，三层线
    (x, y) => `<rect x="${x - 16}" y="${y - 7}" width="32" height="14" fill="none" stroke="#ffe7a0" stroke-width="2"/><path d="M${x - 16} ${y - 2}h32M${x - 16} ${y + 3}h32" stroke="#ffe7a0" stroke-width="1.2"/>`,
    // 一对一对：两只走兽
    (x, y) => `<ellipse cx="${x - 7}" cy="${y + 3}" rx="7" ry="4.5" fill="#f3ead8"/><circle cx="${x - 1}" cy="${y - 1}" r="2.6" fill="#3d3430"/><ellipse cx="${x + 7}" cy="${y + 5}" rx="7" ry="4.5" fill="#f3ead8"/><circle cx="${x + 13}" cy="${y + 1}" r="2.6" fill="#3d3430"/>`,
    // 关门：方舟，门关上，下着雨
    (x, y) => `<rect x="${x - 15}" y="${y - 2}" width="30" height="10" fill="#6b4e32"/><rect x="${x - 3}" y="${y}" width="6" height="7" fill="#3a2a1c"/>` + [-12, -4, 4, 12].map((d) => `<line x1="${x + d}" y1="${y - 14}" x2="${x + d - 2}" y2="${y - 6}" stroke="#d4dceb" stroke-width="1.5"/>`).join(''),
    // 亚拉腊山：山顶上停着方舟
    (x, y) => `<path d="M${x - 17} ${y + 10}l12 -12h10l12 12z" fill="#5a6a48"/><rect x="${x - 9}" y="${y - 7}" width="18" height="5" fill="#6b4e32"/>`,
    // 橄榄叶：一只鸽子叼着叶子
    (x, y) => `<ellipse cx="${x - 2}" cy="${y}" rx="8" ry="5" fill="#fbfaf5"/><path d="M${x - 4} ${y - 2}l-8 -7l4 9z" fill="#fbfaf5"/><ellipse cx="${x + 9}" cy="${y + 2}" rx="5" ry="2" fill="#4f7a2e"/>`,
  ];
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="${label}"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + i * Math.PI / 3, a1 = a0 + Math.PI / 3, on = got.includes(i);
    s += `<path d="${sector(42, 108, a0 + 0.02, a1 - 0.02)}" fill="${on ? cols[i] : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
    const [x, y] = polar(76, (a0 + a1) / 2);
    s += on ? icons[i](x, y) : numberMark(x, y, i + 1);
  }
  const on7 = got.includes(6);
  s += `<circle cx="120" cy="120" r="40" fill="${on7 ? '#2f2a1e' : DARK_GLASS}" stroke="#141414" stroke-width="3.5"/>`;
  if (on7) {
    s += '<rect x="108" y="128" width="24" height="10" rx="3" fill="#8f877b"/><path d="M120 126c-6 -5 -5 -12 0 -18c5 6 6 13 0 18z" fill="#ffcf5a"/>'
      + '<path d="M120 106q-4 -8 0 -14t0 -12" fill="none" stroke="#cfc6b8" stroke-width="2.5" stroke-linecap="round"/>';
  } else {
    s += numberMark(120, 120, 7);
  }
  if (got.length === 7) s += '<path d="M40 120a80 80 0 0 1 160 0" fill="none" stroke="#ffe7a0" stroke-width="2" opacity=".5"/>' + GOLD_RIM;
  return s + '</svg>';
}

/** 每扇彩窗怎么画，按彩窗的 id 查。label 是彩窗的名字，给读屏软件念 */
export const WINDOW_ART: Record<string, (got: number[], label: string) => string> = {
  creation: creationWindowSVG,
  eden: edenWindowSVG,
  promise: promiseWindowSVG,
  offering: offeringWindowSVG,
  generations: generationsWindowSVG,
  ark: arkWindowSVG,
};

/** 每件信物的图标，按信物的 id 查 */
const RELIC_ICONS: Record<string, string> = {
  'first-light': `<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="9" fill="#fff4cf"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ffcf7a" stroke-width="2" stroke-dasharray="3 4"/></svg>`,
  onyx: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 8l13 8v16l-13 8l-13-8V16z" fill="#b3242c"/><path d="M18 18l8-4l-3 9z" fill="#ffffff" opacity=".55"/></svg>`,
  'firstborn-lamb': `<svg viewBox="0 0 48 48" width="40" height="40"><ellipse cx="22" cy="27" rx="13" ry="9" fill="#f3efe6"/><circle cx="35" cy="21" r="6" fill="#f3efe6"/><circle cx="37" cy="20" r="1.4" fill="#3b332e"/><path d="M14 35v6M20 35v6M26 35v6M31 34v6" stroke="#cfc6b8" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  'enoch-footprints': `<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="20" fill="#ffe7a0" opacity=".15"/><ellipse cx="18" cy="31" rx="4" ry="7" fill="#ffe7a0"/><ellipse cx="29" cy="18" rx="4" ry="7" fill="#fff4d6"/></svg>`,
  'olive-leaf': `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M10 38q14 -6 28 -28" fill="none" stroke="#6b5434" stroke-width="2"/><ellipse cx="22" cy="24" rx="5" ry="12" transform="rotate(40 22 24)" fill="#6f9a3a"/><ellipse cx="32" cy="15" rx="4" ry="9" transform="rotate(50 32 15)" fill="#8ab64a"/></svg>`,
  garments: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M18 8h12l9 9l-6 4v20H15V21l-6-4z" fill="#8a6440"/><path d="M20 8q4 6 8 0" fill="none" stroke="#4a3220" stroke-width="2"/><path d="M15 30h18" stroke="#6d4d31" stroke-width="2"/></svg>`,
};

/** 信物的图标；还没给它画图标的信物先用一个星号 */
export const relicIcon = (id: string): string => RELIC_ICONS[id] ?? '✦';
