# 现状与下一步

更新：2026-11-21。新开一个会话（Claude Code、Codex 或者人）先读这一页，就知道做到哪了。
每做完一件大事，回来改这一页。

## 一句话

网站已经上线：封面 → 光之地图（游戏目录）→ 序章《起初》。只有序章能玩，其余 65 卷在地图上显示“建造中”。
正式的 Vite + TypeScript 工程搭好了（`docs/PROMPTS.md` 里的 M0 做完了，见下面“M0 做到哪了”）：小样的代码拆成模块搬进了 `src/`，内容全部从 `content/` 下的 JSON 读，并且能自动检查。
**主页上创世记那盏灯进的就是正式工程（`/play/`）。** 它的画面和玩法跟小样一样，只有鱼和走兽有意地不一样（正式工程修了它们刚出现时的位置，鱼只在水里跳）。小样还留在 `/prologue/`，只作参考，主页已经不通到那里。

在线地址：https://yiyangd.github.io/footprints-of-light/

## 仓库里现在有什么

| 位置 | 是什么 | 状态 |
| --- | --- | --- |
| `home/` | 主页：封面 + 光之地图（地图、时间之河、66 盏灯）。原生 JS + SVG，用 esbuild 打成一个 HTML | 能用，v0.3 |
| `index.html`、`src/`、`package.json` 等 | **正式工程**：Vite + TypeScript（strict）+ Three.js + Vitest。现在的内容就是序章，和小样一样（鱼和走兽除外，见 `docs/CHANGELOG.md`） | 能用，v0.4。以后的新功能都加在这里 |
| `prototype/` | 序章小样：创造七天 + 伊甸园，共 14 段。Three.js，打成一个 HTML | 能用，v0.2。只作参考，不再加功能。主页已经不通到它，但 `/prologue/` 这个网址还能打开 |
| `tools/compare-prototype/` | 把小样和正式工程逐帧对比的工具（确认画面和玩法没变）。不参与打包 | M0 做完、小样删掉以后可以一起删 |
| `content/timeline.json` | 12 季、66 卷书、41 张场景地图。主页直接读它 | 主页的数据来源 |
| `content/home-ui.json` | 主页界面上的文字 | — |
| `content/episodes/*.json` | 序章的剧情、经文、陶片、信物、彩窗、操作提示。**这是内容的正本，正式工程直接读它** | 改内容就改这里，改完运行 `npm run validate:content`。小样自己读的 `prototype/src/content.js` 是旧副本，只作参考；**不要再运行小样的 `npm run export`**，它会冲掉这里新加的字段 |
| `content/ui.json` | 界面上的文字（封面、按钮、图鉴……）和书卷的名字。`index.html` 里用占位符按名字取 | 各字段的意思见 `content/README.md` |
| `docs/设计方案.md` | 完整设计：玩法、十二季、分工、里程碑 | — |
| `docs/时间线与地图调研.md` | 66 卷书按年代的排法、每一季的分幕、41 张地图的依据、主页设计 | `timeline.json` 就是照它第 2、9 节转出来的 |
| `docs/PROMPTS.md` | 一步步做正式工程的任务说明（M0 起） | M0 做完了，下一个是 M1 |

### M0 做到哪了

M0（把小样变成正式工程）分三步，每一步一个 PR：

1. **搭架子，把小样搬进来** —— 做完了（v0.4）。`src/` 按 `AGENTS.md` 的目录拆成了 `core / world / player / story / collect / episodes / content`。
2. **内容全部从 JSON 读，并且能自动检查** —— 做完了。界面文字在 `content/ui.json`，正式工程不再读小样的任何文件；`index.html` 里的文字换成了占位符，打包时从 `ui.json` 填进去（`src/content/page-text.ts`）；内容的规则写在 `src/content/schema.ts`（zod），`npm run validate:content` 照着检查，`npm run count:esv` 数 ESV 节数。
3. **主页入口改到 `/play/`** —— 做完了。`content/timeline.json` 里创世记的 `play.url` 现在是 `./play/`。

三步都做完了，`AGENTS.md` 里“常用命令”和“目录”写的东西现在都有。

**万一 `/play/` 在某台设备上有问题**：把 `content/timeline.json` 里创世记的 `play.url` 改回 `./prologue/`，主页就退回小样，改一行就行。

还留着一件收尾的事，**先不要做，等带领人点头**：`/play/` 在真手机上用过一阵没问题以后，可以删掉 `prototype/`、`tools/compare-prototype/`，并把发布流程里的 `/prologue/` 去掉。

## 现在能用的命令

```bash
# 正式工程（在仓库最外层运行）
npm ci
npm run dev        # 开发：打开它显示的网址，改了代码页面会自己刷新
npm run dev -- --host   # 手机在同一 Wi-Fi 下测试：用手机打开它显示的 Network 网址
npm test           # 运行测试（Vitest）
npm run validate:content   # 检查 content/ 下的 JSON：写错了会指出哪个文件、哪一项
npm run count:esv  # 数 ESV 经文（上限 500 节）
npm run build      # 先检查内容和类型，再打包 → dist/
npm run preview    # 看打包好的版本

# 主页
cd home
npm ci
npm run validate   # 检查 content/timeline.json 和 home-ui.json
npm run build      # 先检查再打包 → home/dist/index.html
npm run basemap    # 重新生成底图（很少需要）

# 序章
cd prototype
npm ci
npm run count:esv  # 数 ESV 经文
npm run build      # → prototype/dist/index.html
```

`home/dist/index.html` 和 `prototype/dist/index.html` 可以直接双击打开看。正式工程打包出来的 `dist/` 不能双击打开，要用 `npm run preview`。

## 网站怎么发布

推送到 `main` 分支，GitHub Actions（`.github/workflows/deploy.yml`）自动打包并发布，大约一分钟：

- `home/dist/index.html` → 网站最外层 `/`
- 正式工程的 `dist/` → `/play/`（主页上创世记那盏灯进的就是这里）
- `prototype/dist/index.html` → `/prologue/`（旧的小样；主页已经不通到这里，网址还能打开）

**只有 `main` 会发布。** 在别的分支上改，要合并到 `main` 网站才会变。

开 PR 的时候，GitHub 会先自动把三部分都测试、打包一遍（`.github/workflows/check.yml`），不发布。PR 页面上是绿色的勾再合并。

两个页面之间的约定：

- 主页进序章：`./play/?from=map`（网址写在 `timeline.json` 里创世记的 `play.url`）。序章看到 `from=map` 才显示“回到光之地图”的按钮，并把开始页变成简版。小样 `/prologue/` 遵守同样的约定。
- 序章回主页：`../#map`。主页看到 `#map` 就直接显示地图，不再过封面。
- 存档在玩家浏览器的 localStorage 里：进度是 `guangzhiyue-proto-v1`（里面的 `done` 数组，满 14 段算走完），语言是 `guangzhiyue-lang`（`en` 或 `bi`）。这两个名字是旧名“光之约”留下的，**不要改**，改了玩家的存档和语言设置会丢。`/prologue/` 和 `/play/` 共用同一份存档和语言设置。
- 一卷书能不能进，看它在 `timeline.json` 里有没有 `play`。现在只有创世记有。

## 怎么检查改动

正式工程有自动测试（`npm test`），测的是不碰画面的部分：数学工具、双语、地形高度、鱼的水域（鱼只在水里跳）、存档读取、内容检查（故意改错能不能查出来）、ESV 计数、页面文字的占位符。画面和操作还是要用眼睛看。改了界面，请在这几种情况下各看一遍：

- 电脑（1280×720 左右）、手机竖屏（390×844）、手机横屏（844×390）
- English 和 English + 中文 两种模式（按 L 键或点右上角切换）

改动“只换写法、不该改变画面和玩法”的时候（M0 的后两步都是），用 `tools/compare-prototype/` 把小样和正式工程逐帧对比一遍，用法见那里的 README。注意：第五日（鱼）、第六日（走兽）之后的画面本来就会不一样，因为正式工程修了鱼和走兽、小样没有改；README 的“结果怎么看”里写了现在正常的样子。

序章有调试开关（小样和正式工程都有）：网址末尾加 `#debug`，左下角会显示帧率和绘制次数，浏览器控制台里可以用 `__gzy.completeNext()` 跳过一段剧情，`__gzy.teleport(x, z)` 传送。

## 已经定下来的事

- 名字：光之踪迹 · Footprints of Light（诗 77:19）。
- 语言只有两种模式：English（ESV）和 English + 中文（ESV + 新标点和合本，神版）。
- 66 卷书的排法：主线 12 卷、并行 6 卷、插入 48 卷，分成 12 季。
- 网站结构：封面 → 光之地图 → 各卷书。

## 还没定、要等人拍板的事

- **牧者要确认的 13 个问题**，在调研文档第 12 节。最要紧的是第 8 条：耶稣怎样出现在画面里。这条定下来之前，第 10 季（福音书）不要开工。
- **ESV 的许可**：免申请的上限是 500 节，现在用了 42 节（创世记 41 节，加上封面上的诗 77:19；`npm run count:esv` 的结果）。经文约占中英文全部文字的两成，指引的上限是 25%，已经不远，公开发布前要向 Crossway 确认。大规模制作之前要向 Crossway 申请书面许可，或者英文改用公有领域的 BSB。
- **和合本**：公开宣传之前，照 `CREDITS.md` 的说明向圣经公会确认新标点版能否使用。
- 年代和地点的经纬度是按通行资料整理的，没有逐条对照原书核对（调研文档第 13 节列了该对照的书）。
- 还没有在真手机上试过。
- **站在河里的三只绵羊**：家在 (14, 30) 的三只绵羊（`src/world/animals.ts`）出生的地方正好是河床——从伊甸流出来、朝西南穿过主岛的那道河。水里走不动，所以它们从第六日起一直站在水面下，几乎看不见。小样里就是这样。要修的话，把这个家挪到岸上，或者出生时避开水；两种修法都会改变这几只羊固定的出生位置，所以先等带领人点头。

## 建议的下一步

1. **在真手机上把序章完整玩一遍**（从主页点创世记进去）。这是现在最该做的检查：到目前为止只在电脑上模拟过手机的屏幕和触屏，声音也只有人能听。有问题先照上面说的把入口改回小样。
   然后接着做 `docs/PROMPTS.md` 的 **M1（手感：走、跑、跳、滑翔）**，或者直接做下面的第 2 条。
2. **每一季先做一幕**，把主线贯通。12 幕的清单在调研文档第 11 节；第 2 季是“亚伯兰蒙召，夜里数星星”（创 12；15）。
3. **三个模板各做一个样板**：先知书用哈该书，书信用腓利门书，诗篇用诗 51。
4. **主页的带领者模式**：老师一键全部解锁（设计在调研文档第 10 节）。

一卷书有了不止一幕以后，`timeline.json` 里的 `play` 要从“一个入口”改成“一组幕”，主页的卡片也要跟着改。现在还没做。
