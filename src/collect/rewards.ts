// 得到收集品：信物、彩窗碎片、经文之光、姿态。屏幕上方会弹出一条小通知。
import { GESTURES, CARDS, refText, RELICS, UI, WINDOWS } from '../content';
import type { Bi, Reward } from '../content/types';
import { sfx } from '../core/audio';
import { $ } from '../core/env';
import { bi, fill } from '../core/i18n';
import { updateGestureButtons } from '../player/gestures';
import { persist, pieceCount, save } from './save';

/** 所有彩窗一共有多少片 */
export const TOTAL_PIECES = Object.values(WINDOWS).reduce((sum, w) => sum + w.pieces.length, 0);
/** 一共有多少件信物 */
export const TOTAL_RELICS = Object.keys(RELICS).length;

/** 屏幕上方弹出一条通知：kind 是哪一类（信物、彩窗碎片……），text 是得到了什么 */
export function toast(kind: Bi, text: Bi): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="t-kind">${bi(kind, 'blk')}</span><span class="t-text">${bi(text, 'blk')}</span>`;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3400);
  setTimeout(() => el.remove(), 3950);
}

/** 得到一片彩窗；集齐一整扇时再多弹一条“完成” */
function grantPiece(win: string, i: number): void {
  const got = save.pieces[win] ??= [];
  if (got.includes(i)) return;
  got.push(i);
  const w = WINDOWS[win];
  if (!w) return;
  const n = `${got.length}/${w.pieces.length}`;
  toast(UI.toast.piece, fill(UI.pieceToast, { w: w.name, p: w.pieces[i], n }));
  sfx.chime(2);
  if (got.length === w.pieces.length) setTimeout(() => toast(UI.toast.done, fill(UI.windowDone, { w: w.name })), 1200);
}

/** 把一样东西交给玩家。已经有了的不会重复给 */
export function grant(r: Reward): void {
  if (r.type === 'relic' && !save.relics.includes(r.id)) {
    save.relics.push(r.id);
    toast(UI.toast.relic, RELICS[r.id].name);
    sfx.chime(4);
  }
  if (r.type === 'piece') grantPiece(r.win, r.i);
  if (r.type === 'verse' && !save.verses.includes(r.ref)) {
    save.verses.push(r.ref);
    toast(UI.toast.verse, refText(r.ref));
  }
  if (r.type === 'gesture' && !save.gestures.includes(r.id)) {
    save.gestures.push(r.id);
    toast(UI.toast.gesture, GESTURES[r.id].name);
    updateGestureButtons();
  }
  persist();
  refreshCounts();
}

/** 重画右上角的计数：彩窗、陶片、信物各收集了多少 */
export function refreshCounts(): void {
  const C = UI.counts;
  $('counts').innerHTML = `${bi(C.windows)} <b>${pieceCount()}</b>/${TOTAL_PIECES} · ${bi(C.cards)} <b>${save.cards.length}</b>/${CARDS.length} · ${bi(C.relics)} <b>${save.relics.length}</b>/${TOTAL_RELICS}`;
}
