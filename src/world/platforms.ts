// 能站上去的东西（除了地面、光之路、石桥以外）：例如第 6 章的方舟和它的跳板。
// path.ts 的 groundAt() 会问这里“(x, z) 有没有能站的东西、有多高”；
// 方舟漂动的时候，站在上面的玩家要跟着一起走（player.ts 问这里“脚下的东西这一帧挪了多少”）。

/** 一个能站上去的东西 */
export interface Platform {
  /** (x, z) 这里有没有它、上表面有多高；没有就是 null */
  height(x: number, z: number): number | null;
  /** 这一帧它在水平方向挪了多少（玩家站在上面就跟着挪） */
  dx: number;
  dz: number;
  /** 掉进水里时回到哪里（例如方舟顶的正中）；不写就回到最后站过的安全位置 */
  refuge?: () => [number, number, number] | null;
}

const platforms: Platform[] = [];

/** 登记一个能站上去的东西 */
export function addPlatform(p: Platform): void {
  platforms.push(p);
}

/** (x, z) 这里最高的那个能站的东西有多高；都没有就是 null */
export function platformHeight(x: number, z: number): number | null {
  let best: number | null = null;
  for (const p of platforms) {
    const h = p.height(x, z);
    if (h !== null && (best === null || h > best)) best = h;
  }
  return best;
}

/** 站在 (x, y, z) 的人脚下是哪个东西（上表面和脚的高度差不到 0.35 米才算站在上面） */
export function platformUnder(x: number, y: number, z: number): Platform | null {
  for (const p of platforms) {
    const h = p.height(x, z);
    if (h !== null && Math.abs(h - y) < 0.35) return p;
  }
  return null;
}

/** 掉进水里时该回到哪里：有方舟这样的“避难处”就回到那里，没有就是 null */
export function refugeSpot(): [number, number, number] | null {
  for (const p of platforms) {
    const r = p.refuge?.();
    if (r) return r;
  }
  return null;
}
