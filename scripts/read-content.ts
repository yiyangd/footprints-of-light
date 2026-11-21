// 从硬盘上把 content/ 下的 JSON 读进来。检查脚本和计数脚本都用它。
import fs from 'node:fs';
import path from 'node:path';
import { bsbSource, cuvSource, type Source } from '../src/content/scripture';

/** 仓库最外层的文件夹 */
export const ROOT = path.resolve(import.meta.dirname, '..');

/** 读一个 JSON 文件。文件本身写坏了（少了逗号、引号）就报一个看得懂的错 */
export function readJson(relativePath: string): unknown {
  const text = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${relativePath} 不是合法的 JSON（最常见的原因是少了逗号或引号）：${(e as Error).message}`);
  }
}

/** content/episodes/ 下所有章节文件的路径，按名字排 */
export function episodeFiles(): string[] {
  const dir = 'content/episodes';
  return fs.readdirSync(path.join(ROOT, dir)).filter((name) => name.endsWith('.json')).sort().map((name) => `${dir}/${name}`);
}

/** content/drafts/ 下的草稿（还没有进游戏的章节），按名字排 */
export function draftFiles(): string[] {
  const dir = 'content/drafts';
  if (!fs.existsSync(path.join(ROOT, dir))) return [];
  return fs.readdirSync(path.join(ROOT, dir)).filter((name) => name.endsWith('.json')).sort().map((name) => `${dir}/${name}`);
}

/** 读一个普通的文本文件 */
export const readText = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

/** 经文的原文：英文 BSB 和中文和合本 */
export function scriptureSources(): Source[] {
  return [
    bsbSource(readJson('content/scripture/bsb.json') as Parameters<typeof bsbSource>[0]),
    cuvSource(readJson('content/scripture/cuv.json') as Parameters<typeof cuvSource>[0]),
  ];
}
