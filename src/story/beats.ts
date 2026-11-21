// 剧情系统（BeatRunner）：玩家走到一个剧情节点附近，就一行一行地放字幕；
// 每一行可以带一个世界效果（例如“要有光”那一行让天亮起来）。全部放完后发奖励。
import { grant, refreshCounts } from '../collect/rewards';
import { nextBeat, persist, save } from '../collect/save';
import { KIND_LABEL, refText, UI } from '../content';
import type { Beat } from '../content/types';
import { $ } from '../core/env';
import { bi, join } from '../core/i18n';
import { game } from '../core/state';
import { moveGuide } from '../player/guide';
import { player } from '../player/player';
import { runEffect } from './effects';
import { afterBeatHint } from './hint';
import { setDays, setHud } from './hud';

/** 一行字幕至少显示这么久（毫秒）才能翻到下一行，免得连按时一下子跳过好几行 */
const MIN_LINE_MS = 380;

export const story = {
  /** 正在播放的节点；没有在播放就是 null */
  beat: null as Beat | null,
  /** 现在放到第几行（从 0 数） */
  idx: -1,
  /** 这一行是什么时候显示出来的 */
  shownAt: 0,

  /** 开始播放一个节点：上下两条黑边滑进来，显示第一行 */
  start(b: Beat): void {
    this.beat = b;
    this.idx = -1;
    game.state = 'story';
    document.body.classList.add('in-story');
    $('story').hidden = false;
    requestAnimationFrame(() => $('story').classList.add('on'));
    setHud(b);
    this.next();
  },

  /** 显示下一行；没有下一行了就结束 */
  next(): void {
    if (!this.beat) return;
    this.idx++;
    const line = this.beat.lines[this.idx];
    if (!line) { this.finish(); return; }
    // 标签：Scripture · Genesis 1:3 · BSB ｜ 经文 · 创 1:3 · 和合本（AGENTS.md 第 2 条：每段经文旁标出译本）
    const tag = $('story-tag'), txt = $('story-text');
    tag.dataset.k = line.kind;
    tag.innerHTML = bi(line.ref ? join(KIND_LABEL[line.kind], ' · ', refText(line.ref), ' · ', UI.version) : KIND_LABEL[line.kind]);
    txt.className = 'k-' + line.kind;
    void txt.offsetWidth; // 读一下宽度，让浏览器重新开始播放“淡入”的动画
    txt.classList.add('fade');
    txt.innerHTML = bi(line.text, 'blk');
    $('story-box').scrollTop = 0;
    this.shownAt = performance.now();
    runEffect(line.fx, false);
  },

  /** 玩家按了“继续” */
  advance(): void {
    if (performance.now() - this.shownAt < MIN_LINE_MS) return;
    this.next();
  },

  /** 跳过这一段：字幕不看了，但后面每一行的世界效果照样触发 */
  skip(): void {
    while (this.beat && this.idx < this.beat.lines.length - 1) {
      this.idx++;
      runEffect(this.beat.lines[this.idx].fx, false);
    }
    this.finish();
  },

  /** 这个节点放完了：收起字幕、记进存档、发奖励、让引路之光飞向下一个节点 */
  finish(): void {
    const b = this.beat;
    if (!b) return;
    this.beat = null;
    $('story').classList.remove('on');
    document.body.classList.remove('in-story');
    setTimeout(() => { $('story').hidden = true; }, 500);
    if (game.state === 'story') game.state = 'play';
    save.done.push(b.id);
    b.rewards.forEach((r, i) => setTimeout(() => grant(r), 300 + i * 650)); // 奖励一个一个地弹出来
    runEffect(b.after, false);
    afterBeatHint(b);
    persist();
    refreshCounts();
    moveGuide();
    setDays();
  },
};

/** 点字幕框 = 继续；点“跳过这一段” = 跳过 */
export function bindStoryUi(): void {
  $('story').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'story-skip') return;
    story.advance();
  });
  $('story-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    story.skip();
  });
}

/** 每一帧：玩家走到下一个节点的范围里（并且站在地上），就开始播放 */
export function tryStartBeat(): void {
  if (game.state !== 'play') return;
  const b = nextBeat();
  if (!b || !player.onGround) return;
  if (Math.hypot(player.pos.x - b.at[0], player.pos.z - b.at[1]) < b.r) {
    player.gesture = null;
    story.start(b);
  }
}
