# 《光之踪迹》Footprints of Light

一个由教会青少年一起制作的圣经探索游戏：像《光遇》一样安静、可以同行，从“起初”一直走到新天新地。

游戏有两种语言模式：**English**（经文用 ESV）和 **English + 中文**（英文在上，中文在下，中文经文用和合本）。默认是双语；在标题页选，游戏里点右上角的地球按钮或按 `L` 键随时切换，会记住上次的选择。

**在线试玩：** https://yiyangd.github.io/footprints-of-light/ （电脑和手机浏览器都能直接玩，不用安装）
设计文档（可评论、可编辑）：https://claude.ai/artifact/TGNk2b8UR2LjTbkTbHRMxc

## 里面有什么

| 位置 | 是什么 |
| --- | --- |
| `AGENTS.md` | 给 Codex（或其他 AI 编程助手）的项目规则。放在仓库根目录，Codex 每次开始工作前都会读 |
| `docs/设计方案.md` | 完整的设计与开发方案（在线版有示意图） |
| `docs/PROMPTS.md` | 一步步交给 Codex 的提示词（M0–M10），以及“章节策划提示词” |
| `docs/CHANGELOG.md` | 更新记录 |
| `content/episodes/*.json` | 第 1、2 章的剧情、经文、陶片、信物、彩窗数据（中英双语） |
| `content/README.md` | 这些 JSON 每个字段的意思 |
| `.github/workflows/deploy.yml` | 自动发布：每次推送到 `main`，GitHub 自动打包小样并更新上面的网站 |
| `prototype/src/` | 小样的源代码：`main.js`（游戏）、`content.js`（内容，中英双语）、`index.html`（界面） |
| `CREDITS.md` | 授权说明，特别是 ESV 经文的使用条件 |

## 第一次怎么开始

1. 先玩：打开上面的在线试玩链接。
2. 改一行试试：按下面“网站怎么更新”的做法，改一句提示文字，看网站跟着变。
3. 交给 Codex：在 Codex 里打开这个仓库，复制 `docs/PROMPTS.md` 里的 **M0** 提示词。Codex 会把小样变成正式工程（Vite + TypeScript + Three.js）。
4. 每做完一步，在电脑和手机上各玩一遍；有问题就用“修 bug 模板”告诉 Codex。

## 网站怎么更新

网站用 GitHub Pages 发布，不用自己上传：

1. 修改文件并推送到 `main` 分支。不会用 git 也可以：在 GitHub 网页上打开文件（例如 `prototype/src/content.js`），点铅笔图标修改，再点 Commit changes。
2. GitHub 会自动打包并发布（见 `.github/workflows/deploy.yml`），进度在仓库的 **Actions** 页面。
3. 一般 1–2 分钟后，刷新在线试玩的网址就能看到新版本。

如果 Actions 里出现红色的叉，点进去看是哪一步出错（最常见的是 `content.js` 里少了逗号或引号），改好再提交一次就行。

## 想在自己电脑上改小样？（在 Codex 做完 M0 之前）

需要先安装 Node.js（https://nodejs.org ，选 LTS 版本）。

```bash
cd prototype
npm install
# 改 src/content.js（剧情和陶片）或 src/main.js（玩法）以后：
npm run build
npm run count:esv   # 加了经文就数一下 ESV 节数
npm run export      # 把内容同步到 content/episodes/*.json
# 然后双击新生成的 prototype/起初-双击打开.html 看效果
```

- 剧情文字、经文、陶片都在 `src/content.js`，每段都有 `en` 和 `zh` 两份，不会编程也可以改（改完记得请属灵顾问核对）。
- 地址后面加 `#debug` 会显示帧率，并可在浏览器控制台用 `__gzy.completeNext()` 跳过剧情（方便测试）。

## 三条规矩（详见 AGENTS.md）

1. 英文经文用 ESV，中文经文用和合本，标出处，不改一个字。ESV 有版权：整个游戏不超过 500 节，正式发布前向 Crossway 申请许可（见 `CREDITS.md`）。
2. 每一行文字都标颜色：经文（金）、考据（蓝）、游戏想象（灰）、思考（绿）。
3. 原创美术和音乐，不使用《光遇》的任何素材；不做自由聊天，保护孩子。
