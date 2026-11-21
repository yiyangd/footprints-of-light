// 全局状态：整个游戏共用的几个“公告板”。
// 哪个模块想知道“天亮了没有”“现在是不是在看剧情”，都来这里看。
import * as THREE from 'three';

/**
 * 世界状态。大多数数值在 0 到 1 之间，由剧情效果慢慢推动：
 * 例如“要有光”把 light 从 0 推到 1，天空、雾、灯光每一帧都照着这些数值来画。
 */
export const W = {
  light: 0,   // 第一日：光
  sky: 0,     // 第二日：天
  land: 0,    // 第三日：旱地露出来
  green: 0,   // 第三日：青草长出来
  lights: 0,  // 第四日：日、月、星
  night: 0,   // “有晚上，有早晨”那一下的夜色
  rest: 0,    // 第七日：安息的暖光
  shadow: 0,  // 序章结尾蛇出现时的一点阴影
  fade: 0,    // 第 3 章：园子的颜色褪去了多少
  gust: 0,    // 第 3 章：“天起了凉风”时风有多大
  dim: 0,     // 第 4 章：田间那一刻天色暗下来多少
  wind: 0.6,  // 风里的光点有多亮
  edenOpen: false, // 通往伊甸的路开了没有
  lampLit: false,  // 手里的灯点亮了没有
  focusAmt: 0,                 // 镜头有多“看向”focus 那个点（0 = 完全跟着玩家）
  focus: new THREE.Vector3(),  // 剧情想让玩家看的地方
  lookUp: 0,                   // 镜头抬头看天的程度
};

/** 所有着色器共用的时间（秒）。写成 { value } 是 three.js 的 uniform 要求的格式 */
export const U = { time: { value: 0 } };

/** 游戏现在在做什么：title 开始页 / play 自由走动 / story 看剧情 / modal 弹窗开着 */
export type GameState = 'title' | 'play' | 'story' | 'modal';

export const game: { state: GameState } = { state: 'title' };
