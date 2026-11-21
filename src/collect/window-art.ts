// 图鉴里的画：两扇彩窗和两件信物的图标，都用 SVG 现画（原创，不用图片文件）。
// got 是已经得到的碎片编号；没得到的那一片是暗的，上面写着它是第几片。

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
function creationWindowSVG(got: number[]): string {
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
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="Window of Creation"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
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
function edenWindowSVG(got: number[]): string {
  const quads = [{ i: 0, a: Math.PI, col: '#5fb35a' }, { i: 3, a: -Math.PI / 2, col: '#d8b46a' }, { i: 2, a: 0, col: '#e2a03f' }, { i: 4, a: Math.PI / 2, col: '#e3929a' }];
  const icon: Record<number, Icon> = {
    0: (x, y) => `<circle cx="${x - 8}" cy="${y - 4}" r="7" fill="#2f6b2c"/><circle cx="${x + 6}" cy="${y - 8}" r="8" fill="#3f7d3a"/><circle cx="${x + 2}" cy="${y + 6}" r="7" fill="#2f6b2c"/>`,
    3: (x, y) => `<ellipse cx="${x - 7}" cy="${y + 2}" rx="8" ry="5.5" fill="#fff6ea"/><circle cx="${x + 2}" cy="${y}" r="3" fill="#3d3430"/><path d="M${x + 8} ${y - 6}l10 -8M${x + 12} ${y - 9}l2 -6" stroke="#7e5233" stroke-width="2.4" stroke-linecap="round"/>`,
    2: (x, y) => `<line x1="${x - 8}" y1="${y + 10}" x2="${x - 8}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 7}" r="7" fill="#ffe08a"/><line x1="${x + 9}" y1="${y + 10}" x2="${x + 9}" y2="${y - 2}" stroke="#5a3d22" stroke-width="3"/><circle cx="${x + 9}" cy="${y - 7}" r="7" fill="#2f6b2c"/><circle cx="${x + 7}" cy="${y - 6}" r="1.8" fill="#f0a83a"/><circle cx="${x + 12}" cy="${y - 9}" r="1.8" fill="#f0a83a"/>`,
    4: (x, y) => `<circle cx="${x - 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x - 9}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/><circle cx="${x + 6}" cy="${y - 8}" r="4" fill="#fff6e2"/><rect x="${x + 3}" y="${y - 3}" width="6" height="13" rx="3" fill="#fff6e2"/>`,
  };
  let s = `<svg viewBox="0 0 240 240" role="img" aria-label="Window of Eden"><circle cx="120" cy="120" r="114" fill="#15161c" stroke="#3a3326" stroke-width="4"/>`;
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

/** 每扇彩窗怎么画，按彩窗的 id 查 */
export const WINDOW_ART: Record<string, (got: number[]) => string> = {
  creation: creationWindowSVG,
  eden: edenWindowSVG,
};

/** 每件信物的图标，按信物的 id 查 */
const RELIC_ICONS: Record<string, string> = {
  'first-light': `<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="9" fill="#fff4cf"/><circle cx="24" cy="24" r="17" fill="none" stroke="#ffcf7a" stroke-width="2" stroke-dasharray="3 4"/></svg>`,
  onyx: `<svg viewBox="0 0 48 48" width="40" height="40"><path d="M24 8l13 8v16l-13 8l-13-8V16z" fill="#b3242c"/><path d="M18 18l8-4l-3 9z" fill="#ffffff" opacity=".55"/></svg>`,
};

/** 信物的图标；还没给它画图标的信物先用一个星号 */
export const relicIcon = (id: string): string => RELIC_ICONS[id] ?? '✦';
