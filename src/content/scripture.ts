// 经文的原文。英文用 BSB（Berean Standard Bible，公有领域），存在 content/scripture/bsb.json；
// 中文用新标点和合本（简体），存在 content/scripture/cuv.json。
// 游戏里每一行经文的英文、中文都必须和这里按出处取出来的文字一模一样：
//   npm run fill:scripture     照出处把英文和中文填进去（不手抄、不凭记忆写）
//   npm run validate:content   核对有没有哪一行和原文不一样
// 这里只有计算，可以写测试（见 scripture.test.ts）。
import { versesIn } from './refs';

/** 一份经文原文：出处（Gen 1:3）→ 那一节的文字 */
export type VerseTable = Record<string, string>;

/** 一个译本：它管哪种语言、文字存在哪、连续几节怎么连 */
export interface Source {
  /** 填进 text 的哪一边 */
  lang: 'en' | 'zh';
  /** 报错时怎么称呼它 */
  label: string;
  /** 原文存在哪个文件、由哪个脚本生成（报错时告诉人去哪里看） */
  file: string;
  importer: string;
  verses: VerseTable;
  /** 连续几节之间用什么连起来：英文用一个空格，中文直接连 */
  joiner: string;
  /** 来源的文本有问题、不能用的节：出处 → 原因 */
  gaps?: Record<string, string>;
}

/** 英文：BSB。参数是 content/scripture/bsb.json 读出来的东西 */
export const bsbSource = (json: { verses: VerseTable }): Source => ({
  lang: 'en', label: 'BSB', file: 'content/scripture/bsb.json', importer: 'scripts/import-bsb.ts', verses: json.verses, joiner: ' ',
});

/** 中文：新标点和合本。参数是 content/scripture/cuv.json 读出来的东西 */
export const cuvSource = (json: { verses: VerseTable; gaps?: Record<string, string> }): Source => ({
  lang: 'zh', label: '和合本', file: 'content/scripture/cuv.json', importer: 'scripts/import-cuv.ts', verses: json.verses, joiner: '', gaps: json.gaps,
});

/**
 * 按出处取出原文。连续几节（Gen 1:14–15）连在一起（英文中间加一个空格，中文不加）。
 * 原文里没有这一节就报错，并告诉人怎么补。
 */
export function sourceText(source: Source, ref: string): string {
  return versesIn(ref).map((verse) => {
    const text = source.verses[verse];
    if (text !== undefined) return text;
    const gap = source.gaps?.[verse];
    if (gap) throw new Error(`${source.file} 里的 ${verse} 不能用：${gap}。要请人对照纸本圣经核对`);
    throw new Error(`${source.file} 里没有 ${verse}：这卷书还没有导入，见 ${source.importer} 开头的说明`);
  }).join(source.joiner);
}

/** 一行经文：有出处，有中英文 */
export interface ScriptureLine { ref: string; text: { en: string; zh: string } }

/**
 * 在一份内容里找出所有经文（kind 是 scripture 的那些），不管它藏在哪一层。
 * where 是它在文件里的位置，报错时用。
 */
export function findScripture(node: unknown, where = ''): Array<{ where: string; line: ScriptureLine }> {
  if (node === null || typeof node !== 'object') return [];
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => {
      const id = item !== null && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;
      return findScripture(item, `${where} › ${typeof id === 'string' ? id : `第 ${i + 1} 项`}`);
    });
  }
  const o = node as Record<string, unknown>;
  const text = o.text as { en?: unknown; zh?: unknown } | undefined;
  if (o.kind === 'scripture' && typeof o.ref === 'string' && text && typeof text.en === 'string' && typeof text.zh === 'string') {
    return [{ where: where.replace(/^ › /, ''), line: o as unknown as ScriptureLine }];
  }
  return Object.entries(o).flatMap(([key, value]) => findScripture(value, `${where} › ${key}`));
}

/** 一段范围里的每一节：versesBetween(原文, 'Gen 1:1–2:3') → ['Gen 1:1', …, 'Gen 2:3']。范围可以跨章，也可以是一整章（Gen 2） */
export function versesBetween(verses: VerseTable, range: string): string[] {
  const m = /^(\S+) (\d+)(?::(\d+))?(?:–(\d+)(?::(\d+))?)?$/.exec(range);
  if (!m) throw new Error(`经文范围 "${range}" 的写法不对`);
  const [, book, c1, v1, a, b] = m;
  const from: [number, number] = [Number(c1), v1 ? Number(v1) : 1];
  // “Gen 1:1–2:3” 的后半是 章:节；“Gen 2:8–23” 的后半只是节；“Gen 2” 是一整章
  const to: [number, number] = b ? [Number(a), Number(b)] : a ? (v1 ? [Number(c1), Number(a)] : [Number(a), Infinity]) : v1 ? from : [Number(c1), Infinity];
  const inside = (c: number, v: number): boolean =>
    (c > from[0] || (c === from[0] && v >= from[1])) && (c < to[0] || (c === to[0] && v <= to[1]));
  return Object.keys(verses).filter((key) => {
    const k = /^(\S+) (\d+):(\d+)$/.exec(key);
    return !!k && k[1] === book && inside(Number(k[2]), Number(k[3]));
  });
}
