# 章节数据说明（content/episodes/*.json）

每一章一个 JSON 文件。考据组和关卡组只改这里，就能改剧情；改完请属灵顾问核对经文。

## 双语

游戏有两种模式：**English**（只显示英文）和 **English + 中文**（英文在上，中文在下）。所以每一段给玩家看的文字都写成两份：

```json
{ "en": "And God said, “Let there be light,” and there was light.", "zh": "神说：“要有光”，就有了光。" }
```

- 经文（`scripture`）：`en` 必须是 ESV 原文，`zh` 必须是和合本（新标点和合本，神版）原文，一个字、一个标点都不改。
- 考据、想象、思考：两种语言意思一致就行，不需要逐字对译。英文要写给 8 岁以上的孩子看得懂。
- ESV 有版权：整个游戏不超过 500 节，加经文前后都运行 `npm run count:esv` 看一下总数（详见 `CREDITS.md`）。

## 顶层字段

| 字段 | 意思 |
| --- | --- |
| `id` | 章节编号，例如 `gen-01-creation` |
| `title` | 章节名 `{ en, zh }` |
| `range` | 经文范围，例如 `Gen 1:1–2:3` |
| `era` | 时间轴上显示的书卷、标签、创世纪年 |
| `scripture` | 这一章用的译本（ESV / 和合本） |
| `beats` | 剧情节点，按顺序触发 |
| `cards` | 藏在地图上的知识陶片 |
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

## 每一行字幕（lines）

| 字段 | 意思 |
| --- | --- |
| `kind` | `scripture` 经文（金）/ `history` 考据（蓝）/ `imagination` 游戏想象（灰）/ `reflection` 思考（绿） |
| `ref` | 经文出处，统一写成英文书卷缩写，例如 `Gen 1:3`、`Gen 1:14–15`。`scripture` 必须有。游戏会自动显示成 Genesis 1:3 / 创 1:3 |
| `text` | 显示的文字 `{ en, zh }` |
| `fx` | 这一行出现时触发的世界效果，例如 `light`（要有光）、`land`（旱地露出来） |

书卷缩写现在有 `Gen`（创世记）和 `Ps`（诗篇）；用到新书卷时，在 `prototype/src/content.js` 的 `BOOKS` 里加一行（例如 `Exod: { en: 'Exodus', zh: '出', zhFull: '出埃及记' }`）。

小样里已经有的效果：`wind` `light` `sky` `land` `plants` `lights` `creatures` `animals` `humans` `rest` `evening` `openEden` `eden` `rivers` `naming` `sleep` `eve` `serpent` `end`。新的效果要请 Codex 在对应章节的代码里实现。
