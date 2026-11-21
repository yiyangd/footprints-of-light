// 补间（tween）：让一个数值在一段时间里慢慢变成另一个数值。
// 例如“要有光”：tween(W, 'light', 1, 3.2) —— 用 3.2 秒把 W.light 变成 1。
import { clamp, easeInOut, lerp } from './math';

interface Tween {
  obj: Record<string, number>;
  key: string;
  from: number;
  to: number;
  dur: number;
  t: number;
  ease: (k: number) => number;
}

const tweens: Tween[] = [];

/**
 * 开始一个补间。
 * instant = true 时直接跳到结果（读档时用：不用再等一遍动画）。
 */
export function tween<K extends string>(
  obj: Record<K, number>, key: K, to: number, dur: number, instant = false, ease: (k: number) => number = easeInOut,
): void {
  const target = obj as Record<string, number>;
  // 同一个数值如果已经有补间在跑，先取消旧的
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.obj === target && tw.key === key) tweens.splice(i, 1);
  }
  if (instant || dur <= 0) {
    target[key] = to;
    return;
  }
  tweens.push({ obj: target, key, from: target[key], to, dur, t: 0, ease });
}

/** 每一帧调用一次：把所有补间往前推 dt 秒 */
export function updateTweens(dt: number): void {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = clamp(tw.t / tw.dur, 0, 1);
    tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(k));
    if (k >= 1) tweens.splice(i, 1);
  }
}
