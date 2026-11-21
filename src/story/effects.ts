// 效果注册表：剧情 JSON 里写的 fx 名字（例如 "light"），对应到代码里的一个函数。
// 每一章在自己的文件里（src/episodes/）写好效果，再用 registerEffects() 登记到这里。

/**
 * 一个世界效果。
 * instant = true 时直接跳到结果，不放动画、不出声音（读档时用）。
 */
export type Effect = (instant: boolean) => void;

const registry = new Map<string, Effect>();
const warned = new Set<string>();

/** 登记一批效果：{ 名字: 函数 } */
export function registerEffects(effects: Record<string, Effect>): void {
  for (const [name, fn] of Object.entries(effects)) registry.set(name, fn);
}

/** 按名字触发一个效果。没写名字就什么都不做 */
export function runEffect(name: string | undefined, instant: boolean): void {
  if (!name) return;
  const fn = registry.get(name);
  if (fn) { fn(instant); return; }
  // JSON 里写了一个代码里没有的效果名：游戏照常进行，只在控制台提醒一次
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`剧情里用到的效果 "${name}" 还没有在代码里实现（见 src/episodes/）`);
  }
}
