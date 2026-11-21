# 内容数据说明（content/ 下的 JSON）

游戏里所有给玩家看的文字都在这个文件夹里，代码里不写死文字：

- `episodes/*.json`：每一章一个文件（剧情、经文、陶片、信物、彩窗、姿态）。考据组和关卡组只改这里，就能改剧情；改完请属灵顾问核对经文。
- `ui.json`：界面上的文字（按钮、开始页、结尾页、提示、书卷名）。说明在本页后面。
- `timeline.json`、`home-ui.json`：主页“光之地图”用的，说明在本页最后。

改完 `episodes/` 或 `ui.json`，在仓库最外层运行 **`npm run validate:content`**：写错了它会说是哪个文件、哪一项、错在哪。每个文件该长什么样，规矩写在 `src/content/schema.ts`。

小样（`prototype/`）有它自己的一份内容 `prototype/src/content.js`。小样还在线上的这段时间，两边要保持一致，见 `docs/STATUS.md` 的“改内容要注意”。

## 双语

游戏有两种模式：**English**（只显示英文）和 **English + 中文**（英文在上，中文在下）。所以每一段给玩家看的文字都写成两份：

```json
{ "en": "And God said, “Let there be light,” and there was light.", "zh": "神说：“要有光”，就有了光。" }
```

- 经文（`scripture`）：`en` 必须是 ESV 原文，`zh` 必须是和合本（新标点和合本，神版）原文，一个字、一个标点都不改。
- 考据、想象、思考：两种语言意思一致就行，不需要逐字对译。英文要写给 8 岁以上的孩子看得懂。
- ESV 有版权：整个游戏不超过 500 节，加经文前后都运行 `npm run count:esv` 看一下总数（详见 `CREDITS.md`）。

## 每一章（episodes/*.json）的顶层字段

| 字段 | 意思 |
| --- | --- |
| `id` | 章节编号，例如 `gen-01-creation`，和文件名一样 |
| `n` | 第几章（图鉴里显示“第 1 章”） |
| `title` | 章节名 `{ en, zh }` |
| `range` | 经文范围，例如 `Gen 1:1–2:3` |
| `hudBook` | 左上角显示的书卷和章节，例如 `Gen 1:1–2:3` 或 `Gen 2` |
| `era` | 时间轴上显示的书卷、标签、创世纪年 |
| `scripture` | 这一章用的译本（ESV / 和合本） |
| `beats` | 剧情节点，按顺序触发 |
| `cards` | 藏在地图上的知识陶片 |
| `relics` | 信物 |
| `window` | 这一章的彩窗，`pieces` 是每一片的名字 |
| `gestures` | 这一章学会的姿态 |
| `animalNames`、`riverNames` | 这一章要用的名字（伊甸园里给活物起名、四道河），没有就不写 |

新加一章：除了写这个 JSON，还要在 `src/content/index.ts` 里登记这个文件（场景和效果在 `src/episodes/` 里登记）。没登记的话 `npm run validate:content` 会提醒。

## 剧情节点（beats）

| 字段 | 意思 |
| --- | --- |
| `id` | 节点编号 |
| `at` | 地图上的位置 `[x, z]`：x 越大越往东，z 越大越往南 |
| `r` | 走到离 `at` 多近会触发（米） |
| `hud` | 左上角显示的标题 `label` 和小字 `sub`，都是 `{ en, zh }` |
| `lines` | 一行一行的字幕 |
| `rewards` | 完成后得到的东西：`relic` 信物、`piece` 彩窗碎片、`verse` 经文之光、`gesture` 姿态 |
| `after` | 节点结束后的效果，例如 `evening`（有晚上，有早晨） |

## 每一行字幕（lines）

| 字段 | 意思 |
| --- | --- |
| `kind` | `scripture` 经文（金）/ `history` 考据（蓝）/ `imagination` 游戏想象（灰）/ `reflection` 思考（绿） |
| `ref` | 经文出处，统一写成英文书卷缩写，例如 `Gen 1:3`、`Gen 1:14–15`。`scripture` 必须有。游戏会自动显示成 Genesis 1:3 / 创 1:3 |
| `text` | 显示的文字 `{ en, zh }` |
| `fx` | 这一行出现时触发的世界效果，例如 `light`（要有光）、`land`（旱地露出来） |

一行经文的 `ref` 只能写同一章里的一节或连续几节（`Gen 1:3`、`Gen 1:14–15`）；彩窗、信物的 `ref` 和 `range`、`hudBook` 是一段范围，可以只写到章或者跨章（`Gen 2`、`Gen 1:1–2:3`）。连接号是 `–`，不是减号 `-`。

书卷缩写现在有 `Gen`（创世记）和 `Ps`（诗篇）；用到新书卷时，在 `content/ui.json` 的 `books` 里加一行（例如 `"Exod": { "en": "Exodus", "zh": "出", "zhFull": "出埃及记" }`）。

经文还没有人核对过原文、暂时空着的时候，文字写 `TODO(经文)`，`npm run validate:content` 会一条一条提醒，等人照圣经补上。不要凭记忆写。

小样里已经有的效果：`wind` `light` `sky` `land` `plants` `lights` `creatures` `animals` `humans` `rest` `evening` `openEden` `eden` `rivers` `naming` `sleep` `eve` `serpent` `end`。新的效果要请 Codex 在对应章节的代码里实现。

## 界面文字（content/ui.json）

| 部分 | 意思 |
| --- | --- |
| `books` | 书卷名，按出处里的缩写查：英文名、中文简称、中文全名 |
| `kinds` | 四种文字的名字：经文 / 考据 / 游戏想象 / 思考 |
| `hints` | 剧情结束后的操作提示，按节点的 `id` 写。分手机和电脑的写成 `{ touch: {…}, desk: {…} }` |
| `titleVerse` | 开始页上的那节经文（诗 77:19）。和剧情里的经文一样：ESV 和和合本一字不改，带 `kind` 和 `ref` |
| `page` | 写在页面上的固定文字，分成几组：`hud` 右上角、`touch` 触屏按钮、`story` 字幕、`card` 陶片、`book` 图鉴、`end` 结尾页、`start` 开始页、`common` 好几处都用的 |
| `aria` | 读屏软件念的说明、鼠标停在按钮上时的小提示。不分语言，一项一行字 |
| `game` | 游戏进行中显示的文字：通知、图鉴、计数、版权声明（`esvNotice` 是 Crossway 要求的，不能删）…… |

- 除了 `aria` 和 `game` 里少数几项（例如 `title`、`langNote` 是按语言模式分的 `{ en, bi }`），每一条都是 `{ en, zh }`。
- 文字里的 `{n}`、`{w}`、`{ref}` 会被换成数字或名字，不要删。`page.start.helpDesk` 里 `[W A S D]` 这样的方括号会画成键帽。
- `page` 里的文字怎么到页面上：`index.html` 里不写字，只写记号，例如 `{{bi:page.hud.map}}`；打包时换成真正的文字。四种记号：`bi`（中文跟在英文后面）、`blk`（中文另起一行）、`keys`（另起一行，并把方括号画成键帽）、`text`（不分语言的一行字）。要在页面上加一句新的话：在 `page` 的某一组里加一条，再在 `index.html` 里写上对应的记号。记号和 `ui.json` 对不上时，`npm run validate:content` 和 `npm run build` 都会报错。

## 全书时间线（content/timeline.json）

主页“光之地图”读这个文件。里面有这几部分：

- `seasons`：12 季的名字和年代。
- `books`：66 卷书，一卷一条。**先后顺序就是时间之河上从左到右的顺序。**
- `maps`：41 张场景地图，一张一条。
- `jerusalemEras`：耶路撒冷的十个时代。
- `seas`：写在地图水面上的海名。

一卷书的字段：

| 字段 | 意思 |
| --- | --- |
| `id` | 三个字母的代号，例如 `gen`、`1sa`。别处用它来指这卷书 |
| `name`、`abbr` | 书名和简称，都是 `{ en, zh }` |
| `type` | `trunk` 主线（带着时间往前走的历史书）、`parallel` 并行（同一段历史的另一个镜头）、`insert` 插入（挂在主线某一刻的话或信） |
| `season` | 灯放在第几季。跨两季的主线书另外写 `parts` |
| `start`、`end` | 年代，公元年份，主前写成负数。加 `"circa": true` 会显示“约” |
| `when` | 年代说不清、需要一句话的时候写这个，写了就不用 `start`/`end` 拼 |
| `anchor` | 挂在主线的哪里（主线书不写） |
| `beside` | 并行卷贴着哪一卷主线书（例如历代志上贴着撒母耳记下） |
| `maps` | 这卷书走过的地图，按先后写，主页会用脚踪把它们连起来 |
| `size` | `L` 大卷（约 6–10 幕）、`M` 中卷（2–4 幕）、`S` 小卷（一幕） |
| `play` | 这卷书已经能玩的部分：网址、一共几段、存档的名字。有 `play` 的灯才能进 |

一张地图的字段：`name` 是地图的全名，`label` 是标在地图上的短名字，`modern` 是今天在哪里，`lat`/`lon` 是纬度和经度（伊甸位置不可考，写 `null`），`approx` 表示这是传统位置或大概位置，`also` 是同一张地图里的其他地点。`build` 是写给制作者看的备注（画面依据、别画错的地方），不显示给玩家。

改完 `timeline.json` 或 `home-ui.json`，运行 `cd home && npm run validate`。
