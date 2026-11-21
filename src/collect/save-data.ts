// 存档里存些什么，以及怎样把浏览器里读出来的文字变回存档。
// 这里只有数据和计算，不碰画面，所以可以写测试（见 save-data.test.ts）。

/** 存档在浏览器里的名字。沿用旧工作名“光之约”：主页也读它，改了玩家的进度会丢，所以不要改 */
export const SAVE_KEY = 'guangzhiyue-proto-v1';

/** 玩家的进度 */
export interface SaveData {
  /** 已经完成的剧情节点的 id */
  done: string[];
  /** 已经捡到的知识陶片的 id */
  cards: string[];
  /** 已经得到的信物的 id */
  relics: string[];
  /** 每扇彩窗已经得到第几片，例如 { creation: [0, 1], eden: [] } */
  pieces: Record<string, number[]>;
  /** 已经点亮的经文，写成出处，例如 Gen 1:3 */
  verses: string[];
  /** 已经学会的姿态的 id */
  gestures: string[];
  /** 上次离开时站的位置 [x, y, z] */
  pos?: [number, number, number];
}

/** 一份全新的、什么都还没收集的存档。windowIds 是所有彩窗的 id */
export function emptySave(windowIds: string[]): SaveData {
  return {
    done: [], cards: [], relics: [],
    pieces: Object.fromEntries(windowIds.map((id) => [id, []])),
    verses: [], gestures: [],
  };
}

const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * 把浏览器里存的文字变回存档。
 * 读不懂（没有存档、文字坏了、不是这个游戏存的）就返回 null。
 */
export function parseSave(text: string | null, windowIds: string[]): SaveData | null {
  let raw: unknown;
  try { raw = JSON.parse(text ?? 'null'); } catch { return null; }
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.done)) return null;

  const save = emptySave(windowIds);
  save.done = stringList(s.done);
  save.cards = stringList(s.cards);
  save.relics = stringList(s.relics);
  save.gestures = stringList(s.gestures);
  // v0.1 的存档里经文出处写成 '创 1:3'，v0.2 起改成 'Gen 1:3'
  save.verses = stringList(s.verses).map((ref) => ref.replace(/^创 /, 'Gen '));
  if (s.pieces && typeof s.pieces === 'object') {
    for (const [id, list] of Object.entries(s.pieces as Record<string, unknown>)) {
      if (Array.isArray(list)) save.pieces[id] = list.filter((x): x is number => typeof x === 'number');
    }
  }
  if (Array.isArray(s.pos) && s.pos.length === 3 && s.pos.every((n) => typeof n === 'number')) {
    save.pos = s.pos as [number, number, number];
  }
  return save;
}
