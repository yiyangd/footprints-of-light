# 内容数据说明（content/）

游戏里给玩家看的文字都写在这个文件夹的 JSON 里，代码里不写：

- `episodes/*.json`：每一章一个文件，里面是剧情、经文、陶片、信物、彩窗、姿态。考据组和关卡组只改这里，就能改剧情；改完请属灵顾问核对经文。
- `ui.json`：界面上的文字（按钮、封面、图鉴……）和书卷的名字。
- `scripture/bsb.json`：英文经文的原文（BSB，公有领域）。程序生成的，不要手改。
- `drafts/*.json`：还没有进游戏的章节草稿，格式和 `episodes/` 里的一样。写好、看过、`TODO` 都补完以后，挪到 `episodes/` 并在 `src/content/index.ts` 里登记，才会出现在游戏里。
- `timeline.json`、`home-ui.json`：主页“光之地图”用的，见本页最后。

**改完一定要检查**（在仓库最外层运行）：

```bash
npm run validate:content   # 写错的地方会列出来：哪个文件、哪一项、怎么了
npm run fill:scripture     # 写好出处以后，让程序把英文（BSB）和中文（和合本）经文填进去
npm run count:verses       # 看每一章的经文齐了没有，还缺哪些节
```

`npm run build` 和网站的自动发布也会先检查一遍，内容有错就不会发布。

从 v0.4 起，这里的 JSON 就是内容的“正本”。`prototype/src/content.js` 是小样留下的旧副本，只作参考；**不要再运行小样的 `npm run export`**，它会把这里新加的字段冲掉（万一运行了，`npm run validate:content` 会报错，用 git 把文件恢复就行）。

## 双语

游戏有两种模式：**English**（只显示英文）和 **English + 中文**（英文在上，中文在下）。所以每一段给玩家看的文字都写成两份：

```json
{ "en": "And God said, “Let there be light,” and there was light.", "zh": "神说：“要有光”，就有了光。" }
```

- 经文（`scripture`）：`en` 必须是 BSB 原文，`zh` 必须是新标点和合本原文，一个字、一个标点都不改。
- 经文不用自己写：只要写好 `kind` 和 `ref`，`en` 和 `zh` 先都写 `"TODO(经文)"` 占位，运行 `npm run fill:scripture`，程序会从 `scripture/bsb.json`（英文）和 `scripture/cuv.json`（中文）把原文填进去。检查脚本会核对每一行英文、中文都和原文一样，改动一个词、一个标点都会报错。
- 经文一节都不跳过：一章的 `range` 里每一节都要出现在剧情里。`npm run count:verses` 会列出还缺哪些节。
- 考据、想象、思考：两种语言意思一致就行，不需要逐字对译。英文要写给 8 岁以上的孩子看得懂。
- 还没有做完的章节放在 `drafts/` 里：游戏不读它，网站上也没有它。开发时在网址后面加 `?draft=文件名`（例如以后的 `?draft=gen-04-brothers`）可以预览。现在没有草稿。
- 程序填不上的时候（那卷书还没有导入，或者来源的文本在那一节有问题），`TODO(经文)` 会留着并报出来：请人对照纸本圣经核对，不要凭记忆写。
- 陶片、信物的说明里引用经文时，引号里的字也要和原文一样。

## 章节文件的顶层字段

| 字段 | 意思 |
| --- | --- |
| `id` | 章节编号，例如 `gen-01-creation` |
| `chapter` | 第几章（数字） |
| `title` | 章节名 `{ en, zh }` |
| `range` | 经文范围，例如 `Gen 1:1–2:3` |
| `hudRef` | 左上角显示的经文范围，例如 `Gen 2` |
| `era` | 时间轴上显示的书卷、标签、创世纪年 |
| `scripture` | 这一章用的译本（BSB / 和合本） |
| `beats` | 剧情节点，按顺序触发 |
| `cards` | 藏在地图上的知识陶片。`after` 写一个剧情节点的 id，表示那个节点完成以后陶片才出现（例如第 3 章的“基路伯”陶片要等走到伊甸东边）；不写就是陆地升起以后出现 |
| `relics` | 信物 |
| `window` | 这一章的彩窗，`pieces` 是每一片的名字 |
| `gestures` | 这一章学会的姿态 |

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
| `hint` | 节点结束后出现的操作提示（可以不写）。一句话就写 `{ en, zh }`；手机和电脑不一样就写 `{ "touch": { en, zh }, "desk": { en, zh } }` |

## 每一行字幕（lines）

| 字段 | 意思 |
| --- | --- |
| `kind` | `scripture` 经文（金）/ `history` 考据（蓝）/ `imagination` 游戏想象（灰）/ `reflection` 思考（绿） |
| `ref` | 经文出处，统一写成英文书卷缩写，例如 `Gen 1:3`、`Gen 1:14–15`（连续几节用长横线 `–`，要在同一章里）。`scripture` 必须有。游戏会自动显示成 Genesis 1:3 / 创 1:3 |
| `text` | 显示的文字 `{ en, zh }` |
| `fx` | 这一行出现时触发的世界效果，例如 `light`（要有光）、`land`（旱地露出来） |

书卷缩写现在有 `Gen`（创世记）和 `Ps`（诗篇）；用到新书卷时，在 `ui.json` 的 `books` 里加一行（例如 `"Exod": { "en": "Exodus", "zh": "出", "zhFull": "出埃及记" }`）。

已经有的效果：`wind` `light` `sky` `land` `plants` `lights` `creatures` `animals` `humans` `rest` `evening` `openEden` `eden` `rivers` `naming` `sleep` `eve` `serpent` `end`。`fx` 和 `after` 只能写这些名字；新的效果要先在代码里实现（`src/episodes/` 下对应章节的文件），并登记到 `src/episodes/effect-names.ts`。

新做一章：在 `episodes/` 里加一个 JSON 文件，再到 `src/content/index.ts` 里登记它（`npm run validate:content` 会提醒没登记的文件）。

## 界面文字（content/ui.json）

| 部分 | 意思 |
| --- | --- |
| `books` | 书卷的名字，按出处里用的缩写查：英文全名 `en`、中文简称 `zh`、中文全名 `zhFull` |
| `kinds` | 四种文字的名字（经文 / 考据 / 游戏想象 / 思考） |
| `text` | 游戏里用到的零散文字。文字里的 `{n}` `{w}` `{t}` 会被换成实际的值，不要删。`bibleNotice` 是英文经文的来源说明（BSB 的署名），要一直留着 |
| `page` | 页面上固定的文字：封面、按钮、结尾画面。`index.html` 里用占位符按名字来取，例如 `<!--ui:page.cover.title-->` 取的是 `page` → `cover` → `title` |

`page` 里几处特别的写法：

- `[[W A S D]]`：两层方括号里的字会显示成键盘按键的样子。
- `page.cover.verse` 是封面上的那节经文，和剧情里的经文一样有 `kind`、`ref`、`text`，一字不改；旁边的 `verseFormat` 说明怎么给它加上引号、出处和译本。
- `page.aria` 是读屏软件念的文字，每项只有一句。
- `langShort`、`langNote`、`title`、`langNames` 里的 `en` 和 `bi` 不是“英文、中文”，而是“English 模式显示什么、双语模式显示什么”。

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

改了 `timeline.json` 或 `home-ui.json`，运行 `cd home && npm run validate`。
