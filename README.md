# 《光之踪迹》Footprints of Light

一个由教会青少年一起制作的圣经探索游戏：像《光遇》一样安静、可以同行，从“起初”一直走到新天新地。

游戏有两种语言模式：**English**（经文用 ESV）和 **English + 中文**（英文在上，中文在下，中文经文用和合本）。默认是双语；在标题页选，游戏里点右上角的地球按钮或按 `L` 键随时切换，会记住上次的选择。

**在线试玩：** https://yiyangd.github.io/footprints-of-light/ （电脑和手机浏览器都能直接玩，不用安装）
打开先看到封面，点“开始旅程”进入“光之地图”：一张古代世界地图加一条时间之河，66 卷书是 66 盏灯，这就是游戏的目录。点创世记那盏灯进入序章《起初》。
设计文档（可评论、可编辑）：https://claude.ai/artifact/TGNk2b8UR2LjTbkTbHRMxc

## 里面有什么

| 位置 | 是什么 |
| --- | --- |
| `AGENTS.md` | 给 Codex（或其他 AI 编程助手）的项目规则。放在仓库根目录，Codex 每次开始工作前都会读 |
| `docs/设计方案.md` | 完整的设计与开发方案（在线版有示意图） |
| `docs/PROMPTS.md` | 一步步交给 Codex 的提示词（M0–M10），以及“章节策划提示词” |
| `docs/CHANGELOG.md` | 更新记录 |
| `docs/STATUS.md` | **现状与下一步**：现在做到哪了、能用哪些命令、还有什么没定。新开一个 AI 会话先读它 |
| `docs/时间线与地图调研.md` | 66 卷书按年代的排法、每一季怎么分幕、41 张地图的依据 |
| `CLAUDE.md` | 给 Claude Code 的说明（它会引入 `AGENTS.md` 和 `docs/STATUS.md`） |
| `content/timeline.json` | 全书时间线：12 季、66 卷书、41 张场景地图。主页直接读它，改了它主页就跟着变 |
| `content/home-ui.json` | 主页界面上的文字（中英双语） |
| `content/episodes/*.json` | 第 1、2 章的剧情、经文、陶片、信物、彩窗数据（中英双语） |
| `content/README.md` | 这些 JSON 每个字段的意思 |
| `home/` | 主页“光之地图”的源代码：`src/main.js`、`src/index.html`，底图 `src/basemap.json` |
| `index.html`、`src/`、`package.json` | **正式工程**（Vite + TypeScript + Three.js）。`src/` 里按功能分了文件夹，`src/main.ts` 是入口，开头有一段说明每个文件夹管什么 |
| `.github/workflows/deploy.yml` | 自动发布：每次推送到 `main`，GitHub 自动打包主页、序章小样和正式工程并更新上面的网站 |
| `.github/workflows/check.yml` | 自动检查：每次开 PR，GitHub 先测试、打包一遍，合并前就知道会不会出错 |
| `content/ui.json` | 界面上的文字（封面、按钮、图鉴……）和书卷的名字（中英双语） |
| `scripts/` | 两个检查用的小程序：`npm run validate:content`（内容有没有写错）、`npm run count:esv`（ESV 用了多少节） |
| `prototype/src/` | 最早的序章小样的源代码，只作参考，不再修改 |
| `CREDITS.md` | 授权说明，特别是 ESV 经文的使用条件 |

## 第一次怎么开始

1. 先玩：打开上面的在线试玩链接。
2. 改一行试试：按下面“网站怎么更新”的做法，改一句提示文字，看网站跟着变。
3. 接着做：先读 `docs/STATUS.md`，里面写着做到哪了、下一步是什么。把小样变成正式工程的 **M0** 已经做完，主页上点创世记进的就是正式工程。
4. 每做完一步，在电脑和手机上各玩一遍；有问题就用“修 bug 模板”告诉 Codex。

## 网站怎么更新

网站用 GitHub Pages 发布，不用自己上传：

1. 修改文件并推送到 `main` 分支。不会用 git 也可以：在 GitHub 网页上打开文件（例如 `content/episodes/gen-01-creation.json`），点铅笔图标修改，再点 Commit changes。
2. GitHub 会自动打包并发布（见 `.github/workflows/deploy.yml`），进度在仓库的 **Actions** 页面。
3. 一般 1–2 分钟后，刷新在线试玩的网址就能看到新版本。

如果 Actions 里出现红色的叉，点进去看是哪一步出错（最常见的是 `content/` 下某个 JSON 文件里少了逗号或引号，或者某段文字漏了中文；出错的那一步会写明是哪个文件、哪一项），改好再提交一次就行。

## 想改主页（光之地图）？

主页上的书卷、年代、地点都写在 `content/timeline.json` 里，不用碰代码：

- 改一卷书的年代、挂在主线的哪里、走过哪些地方：找到那卷书的那一行改。`books` 的先后顺序就是时间之河上从左到右的顺序。
- 一卷书做出了可以玩的部分：给它加上 `play`（照创世记那一条写），它的灯就会亮起来。
- 改完在 `home/` 里运行 `npm run validate`，会检查有没有写错（例如地图名字拼错、少了中文）。`npm run build` 会打包出 `home/dist/index.html`，双击就能看。

```bash
cd home
npm install
npm run validate   # 检查 timeline.json
npm run build      # 打包主页
```

年代用的是较传统的圣经纪年，都是约数。有几处需要牧者确认（出埃及的年代、十字架的年份、约伯记和约珥书放在哪里等），确认后只需要改 `timeline.json` 里对应的几行。

## 想在自己电脑上跑正式工程？

需要先安装 Node.js（https://nodejs.org ，选 LTS 版本，22 或更新）。然后在仓库最外层打开终端：

```bash
npm install
npm run dev
```

终端里会显示一个网址（一般是 `http://localhost:5173/`），用浏览器打开就是游戏。改了 `src/` 里的代码，页面会自己刷新。

- **在手机上试**：手机和电脑连同一个 Wi-Fi，运行 `npm run dev -- --host`，用手机浏览器打开终端里 `Network` 后面的那个网址。
- **改完检查**：`npm test`（自动测试）和 `npm run build`（检查内容和类型并打包）都要通过。
- **调试**：网址末尾加 `#debug` 会显示帧率，并可在浏览器控制台用 `__gzy.completeNext()` 跳过一段剧情。
- 正式工程打包以后发布在网站的 `/play/`，主页上创世记那盏灯进的就是它。

## 想改剧情、经文、陶片或者界面上的字？

都在 `content/` 里，不用碰代码，不会编程也可以改：

- 剧情、经文、陶片、信物、彩窗：`content/episodes/` 下每一章一个 JSON 文件。
- 界面上的字（封面、按钮、图鉴……）：`content/ui.json`。
- 每个字段是什么意思：`content/README.md`。

每段文字都有 `en` 和 `zh` 两份。经文一个字都不能改；缺经文时写 `TODO(经文)`，请人照着圣经补上。改完在仓库最外层运行：

```bash
npm run validate:content   # 写错的地方会列出来：哪个文件、哪一项、怎么了
npm run count:esv          # 加了经文就数一下 ESV 用了多少节（上限 500）
```

改完记得请属灵顾问核对。

`prototype/` 是最早的小样，现在只作参考：它自己的 `content.js` 是旧副本，改它不会影响正式工程，也**不要再运行它的 `npm run export`**（会把 `content/episodes/` 里新加的字段冲掉）。

## 三条规矩（详见 AGENTS.md）

1. 英文经文用 ESV，中文经文用和合本，标出处，不改一个字。ESV 有版权：整个游戏不超过 500 节，正式发布前向 Crossway 申请许可（见 `CREDITS.md`）。
2. 每一行文字都标颜色：经文（金）、考据（蓝）、游戏想象（灰）、思考（绿）。
3. 原创美术和音乐，不使用《光遇》的任何素材；不做自由聊天，保护孩子。
