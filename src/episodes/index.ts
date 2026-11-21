// 所有章节的代码都登记在这里。做了新的一章，就在下面加一行。
import type { Effect } from '../story/effects';
import * as creation from './gen-01-creation';
import * as eden from './gen-02-eden';

/** 一章要提供的两样东西 */
export interface EpisodeModule {
  /** 这一章的世界效果：{ 效果名: 函数 }，效果名就是剧情 JSON 里写的 fx */
  effects: Record<string, Effect>;
  /** 每一帧调用一次，更新这一章专属的东西（人物、树……） */
  update(dt: number, t: number): void;
}

export const EPISODE_MODULES: EpisodeModule[] = [creation, eden];
