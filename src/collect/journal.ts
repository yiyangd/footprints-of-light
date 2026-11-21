// 图鉴和几个弹窗：陶片卡、图鉴（五个标签页）、序章结尾的画面。
import { CARDS, EPISODES, GESTURES, KIND_LABEL, refText, RELICS, UI, verseText, WINDOWS } from '../content';
import type { Card, Kind } from '../content/types';
import { $, IS_TOUCH } from '../core/env';
import { bi, esc, fill, join } from '../core/i18n';
import { game } from '../core/state';
import { story } from '../story/beats';
import { TOTAL_PIECES, TOTAL_RELICS } from './rewards';
import { pieceCount, save } from './save';
import { relicIcon, WINDOW_ART } from './window-art';

/** 四种文字各自的颜色（定义在 style.css 最上面） */
const KIND_COLOR: Record<Kind, string> = {
  scripture: 'var(--k-scripture)', history: 'var(--k-history)', imagination: 'var(--k-imagination)', reflection: 'var(--k-reflection)',
};

const TABS = ['windows', 'relics', 'cards', 'verses', 'gestures'] as const;
type Tab = typeof TABS[number];
let bookTab: Tab = 'windows';

/** 还没得到的东西先显示成问号 */
const LOCK = '<span class="q">???</span>';

/**
 * 经文的来源说明：英文是 BSB（公有领域），中文是和合本（AGENTS.md 第 2 条），不能删。
 * 网址只写成文字，不做成链接（AGENTS.md 第 7 条）。
 */
const notices = (): string =>
  `<div class="notice"><p>${esc(UI.bibleNotice)} <span class="site">${esc(UI.bibleSite)}</span></p><p class="zh" lang="zh-CN">${esc(UI.cuvNotice)}</p></div>`;

/** 打开一块知识陶片 */
export function openCard(c: Card): void {
  game.state = 'modal';
  $('card-modal').hidden = false;
  const tag = $('card-tag');
  tag.className = 'o-tag k-' + c.kind;
  tag.innerHTML = bi(join(UI.potsherd, ' · ', KIND_LABEL[c.kind]));
  $('card-title').innerHTML = bi(c.title, 'blk');
  $('card-text').innerHTML = bi(c.text, 'blk');
  $('card-ok').focus();
  $('card-scroll').scrollTop = 0;
}

/** 关掉所有弹窗，回到游戏（或者回到还没放完的剧情） */
export function closeModals(): void {
  $('card-modal').hidden = true;
  $('book').hidden = true;
  $('end-screen').hidden = true;
  if (game.state === 'modal') game.state = story.beat ? 'story' : 'play';
}

// —— 图鉴的五个标签页 ——

/** 彩窗页：每扇窗一张卡片，画出已经得到的碎片 */
function windowsPage(body: HTMLElement): void {
  const wrap = document.createElement('div');
  wrap.className = 'windows';
  for (const [key, w] of Object.entries(WINDOWS)) {
    const got = save.pieces[key] ?? [];
    const card = document.createElement('div');
    card.className = 'window-card';
    const meta = join(refText(w.ref), ' · ', fill(UI.collected, { n: `${got.length}/${w.pieces.length}` }));
    const art = WINDOW_ART[key]?.(got, w.name.en) ?? '';
    const pieces = w.pieces.map((p, i) => `<li class="${got.includes(i) ? 'got' : ''}">${got.includes(i) ? bi(p) : LOCK}</li>`).join('');
    card.innerHTML = `<h3>${bi(w.name)}</h3><div class="meta">${bi(meta, 'blk')}</div>${art}<ol>${pieces}</ol>`;
    wrap.appendChild(card);
  }
  body.appendChild(wrap);
}

/** 信物页 */
function relicsPage(body: HTMLElement): void {
  const list = document.createElement('div');
  list.className = 'list';
  for (const [id, r] of Object.entries(RELICS)) {
    const on = save.relics.includes(id);
    const it = document.createElement('div');
    it.className = 'item' + (on ? '' : ' locked');
    const title = on ? `${bi(r.name)}<span class="ref">${bi(refText(r.ref))}</span>` : bi(UI.notFound);
    const text = on ? bi(r.desc, 'blk') : bi(UI.relicHint[id], 'blk');
    it.innerHTML = `<div class="ico">${on ? relicIcon(id) : '?'}</div><div><h4>${title}</h4><p>${text}</p></div>`;
    list.appendChild(it);
  }
  body.appendChild(list);
}

/** 陶片页：先是四种颜色的图例，再是每一块陶片；点已经捡到的可以重读 */
function cardsPage(body: HTMLElement): void {
  const L = UI.legend;
  body.insertAdjacentHTML('beforeend', `<div class="legend"><span class="l-s">${bi(L.scripture)}</span><span class="l-h">${bi(L.history)}</span><span class="l-i">${bi(L.imagination)}</span><span class="l-r">${bi(L.reflection)}</span></div>`);
  const grid = document.createElement('div');
  grid.className = 'ost-grid';
  for (const c of CARDS) {
    const on = save.cards.includes(c.id), ep = EPISODES[c.ep];
    const b = document.createElement('button');
    b.className = 'ost-mini' + (on ? '' : ' locked');
    b.style.setProperty('--kc', KIND_COLOR[c.kind]);
    const chapter = fill(UI.chapter, { n: ep.n, t: ep.title });
    b.innerHTML = `${on ? bi(c.title, 'blk') : bi(UI.undiscovered, 'blk')}<small>${bi(on ? join(chapter, ' · ', KIND_LABEL[c.kind]) : chapter, 'blk')}</small>`;
    if (on) b.onclick = () => { $('book').hidden = true; openCard(c); };
    grid.appendChild(b);
  }
  body.appendChild(grid);
}

/** 经文页：已经点亮的经文，每一节都标出处和译本；最下面是版权声明 */
function versesPage(body: HTMLElement): void {
  const list = document.createElement('div');
  list.className = 'list';
  if (!save.verses.length) list.innerHTML = `<div class="empty">${bi(UI.noVerses, 'blk')}</div>`;
  for (const ref of save.verses) {
    const t = verseText(ref);
    if (!t) continue;
    const r = refText(ref);
    const d = document.createElement('div');
    d.className = 'verse';
    d.innerHTML = `<div class="vt">${bi(t, 'blk')}</div><div class="vr">${bi({ en: `${r.en} (${UI.version.en})`, zh: `${r.zh}（${UI.version.zh}）` })}</div>`;
    list.appendChild(d);
  }
  body.appendChild(list);
  body.insertAdjacentHTML('beforeend', notices());
}

/** 姿态页 */
function gesturesPage(body: HTMLElement): void {
  const list = document.createElement('div');
  list.className = 'list';
  for (const [id, g] of Object.entries(GESTURES)) {
    const on = save.gestures.includes(id);
    const it = document.createElement('div');
    it.className = 'item' + (on ? '' : ' locked');
    // 图标的位置写怎么做这个姿态：电脑上是按键，手机上是“按钮”
    const how = on ? (IS_TOUCH ? bi(UI.tap, 'blk') : esc(g.key)) : '?';
    it.innerHTML = `<div class="ico">${how}</div><div><h4>${on ? bi(g.name) : bi(UI.notLearned)}</h4><p>${on ? bi(g.desc, 'blk') : bi(UI.learnHint, 'blk')}</p></div>`;
    list.appendChild(it);
  }
  body.appendChild(list);
}

/** 每个标签页怎么画：把内容加到图鉴的正文（body）里 */
const PAGES: Record<Tab, (body: HTMLElement) => void> = {
  windows: windowsPage, relics: relicsPage, cards: cardsPage, verses: versesPage, gestures: gesturesPage,
};

/** 打开图鉴；tab 不写就停在上次看的那一页 */
export function openBook(tab?: Tab): void {
  if (tab) bookTab = tab;
  game.state = 'modal';
  $('book').hidden = false;
  const tabs = $('book-tabs');
  tabs.innerHTML = '';
  for (const id of TABS) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.role = 'tab';
    b.innerHTML = bi(UI.tabs[id]);
    b.setAttribute('aria-selected', String(id === bookTab));
    b.onclick = () => openBook(id);
    tabs.appendChild(b);
  }
  const body = $('book-body');
  body.innerHTML = '';
  PAGES[bookTab](body);
}

/** 序章结尾的画面：一共收集了多少 */
export function showEnd(): void {
  game.state = 'modal';
  $('end-screen').hidden = false;
  const S = UI.endStats;
  const stats: Array<[string | number, typeof S[number]]> = [
    [`${pieceCount()}/${TOTAL_PIECES}`, S[0]],
    [`${save.cards.length}/${CARDS.length}`, S[1]],
    [`${save.relics.length}/${TOTAL_RELICS}`, S[2]],
    [save.verses.length, S[3]],
  ];
  $('end-stats').innerHTML = stats.map(([n, label]) => `<div class="stat"><b>${n}</b><span>${bi(label, 'blk')}</span></div>`).join('');
}

/** 给图鉴和弹窗上的按钮接上动作。游戏打开时调用一次 */
export function bindJournalUi(): void {
  $('card-ok').addEventListener('click', closeModals);
  $('btn-book').addEventListener('click', () => { if (game.state === 'play') openBook(); });
  $('book-close').addEventListener('click', closeModals);
  // 点图鉴外面的暗处也可以关掉
  $('book').addEventListener('click', (e) => { if ((e.target as HTMLElement).id === 'book') closeModals(); });
  $('end-book').addEventListener('click', () => { $('end-screen').hidden = true; openBook('windows'); });
  $('end-continue').addEventListener('click', closeModals);
}
