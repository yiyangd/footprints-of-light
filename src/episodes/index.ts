// 所有章节的代码都登记在这里。做了新的一章，就在下面加一行。
import type { Effect } from '../story/effects';
import * as creation from './gen-01-creation';
import * as eden from './gen-02-eden';
import * as fall from './gen-03-fall';
import * as brothers from './gen-04-brothers';
import * as generations from './gen-05-generations';
import * as ark from './gen-06-ark';

/** 一章要提供的两样东西 */
export interface EpisodeModule {
  /** 这一章的世界效果：{ 效果名: 函数 }，效果名就是剧情 JSON 里写的 fx */
  effects: Record<string, Effect>;
  /** 每一帧调用一次，更新这一章专属的东西（人物、树……） */
  update(dt: number, t: number): void;
}

export const EPISODE_MODULES: EpisodeModule[] = [creation, eden, fall, brothers, generations, ark];

/** 草稿章节的代码：草稿的文件名（content/drafts/ 下）→ 怎么加载它 */
// 现在没有草稿章节。写第 4 章的草稿时，在这里加一行，例如：
//   'gen-04-brothers': () => import('./gen-04-brothers'),
const DRAFT_MODULES: Record<string, () => Promise<EpisodeModule>> = {};

/**
 * 开发时预览草稿（网址带 ?draft=gen-03-fall）：把那一章的代码也加载进来。
 * 打包发布的版本不会走到这里，草稿章节的代码也不会被打包进去（见 main.ts）。
 */
export async function loadDraftModule(draftId: string): Promise<void> {
  const load = DRAFT_MODULES[draftId];
  if (load) EPISODE_MODULES.push(await load());
  else console.warn(`草稿 "${draftId}" 还没有对应的代码（见 src/episodes/index.ts）`);
}
