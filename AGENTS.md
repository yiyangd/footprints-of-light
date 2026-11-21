# AGENTS.md —《光之踪迹》

## 项目
《光之踪迹》（Footprints of Light）是一个网页 3D 圣经探索游戏（Three.js），英文为主、可开中文辅助（English / English + 中文）。玩家是“持灯的见证者”，按书卷和年代走过圣经历史：跟随引路之光，见证剧情（经文原文），收集信物、彩窗碎片、知识陶片、经文和姿态。灵感来自《光遇》的安静与同行，但所有美术和代码都是原创。
开发者是教会青少年（13–18 岁）和带领人；玩家是 8 岁以上的孩子。
完整设计见 `docs/设计方案.md`。

## 现在做到哪了（先读这里）
正式工程（`src/`）已经搭好并接上了主页：`docs/PROMPTS.md` 的 M0 做完了。主页 `home/` 上创世记那盏灯进的是正式工程（发布在 `/play/`），内容全部从 `content/` 下的 JSON 读，下面的命令和目录都可用。最早的序章小样 `prototype/` 还发布在 `/prologue/`，只作参考。以后的新功能都加在正式工程里。
**现在实际能用的命令、目录、发布方式和下一步，都写在 `docs/STATUS.md`。** 开始任何任务之前先读它。

## 技术栈
- Vite + TypeScript（strict）+ Three.js（WebGL2）
- 界面：原生 HTML/CSS 覆盖层，不用 React/Vue
- 内容：`content/` 下的 JSON，用 zod 校验（`src/content/schema.ts`）
- 测试：Vitest
- 部署：GitHub Pages（`.github/workflows/deploy.yml`）

## 常用命令
- `npm install`
- `npm run dev`（手机在同一 Wi-Fi 下测试：`npm run dev -- --host`）
- `npm run build`
- `npm test`
- `npm run validate:content`
- `npm run fill:scripture`（照出处把经文填进去：英文从 BSB，中文从和合本，见第 1 条）
- `npm run count:verses`（数用了多少节经文，列出每一章还缺哪些节，见第 1 条）

## 目录
- `src/core` 渲染、主循环、输入、音频
- `src/world` 地形、水、天空、植物、动物
- `src/player` 角色控制、镜头、灯
- `src/story` 剧情节点（BeatRunner）、字幕、效果注册表
- `src/collect` 收集、存档、图鉴界面
- `src/episodes/<id>.ts` 每章专属的场景和效果（新的一章要在 `src/episodes/index.ts` 里登记）
- `src/content` 读 `content/` 下的 JSON；`schema.ts` 是内容的规则（zod），`check.ts` 检查内容，`scripture.ts` 按出处取经文原文，`usfm.ts` 读和合本的原始文本，`verse-count.ts` 数经文，`page-text.ts` 把 `index.html` 里的占位符换成 `content/ui.json` 里的文字
- `scripts/` 命令行脚本：`validate-content.ts`、`fill-scripture.ts`、`count-verses.ts`、`import-bsb.ts`、`import-cuv.ts`
- `content/scripture/bsb.json` 英文经文的原文（BSB，公有领域）。由 `scripts/import-bsb.ts` 生成，不要手改
- `content/scripture/cuv.json` 中文经文的原文（新标点和合本，简体）。由 `scripts/import-cuv.ts` 生成，不要手改
- `content/ui.json` 界面上的文字和书卷的名字（中英双语）
- `content/episodes/<id>.json` 每章的经文、节点、收集品（中英双语）
- `content/drafts/<id>.json` 还没有进游戏的章节草稿（可以带着 `TODO(经文)`）
- `docs/STATUS.md` 现状与下一步；`docs/时间线与地图调研.md` 66 卷书按年代的排法和 41 张地图的依据
- `content/timeline.json` 全书时间线：12 季、66 卷书、41 张场景地图（主页直接读它）
- `home/` 主页“光之地图”（游戏目录）：地图 + 时间之河 + 66 盏灯；单独打包，发布在网站最外层
- `prototype/` 最早的单文件小样，现在发布在 `/prologue/`（只作参考；除了“回到光之地图”的按钮，不再修改）

## 必须遵守
1. 经文：只能使用 `content/` 里 kind 为 `scripture` 的文字，必须带出处（`ref` 写成 `Gen 1:3`）。英文用 BSB（Berean Standard Bible），中文用新标点和合本（简体），两种都一字不改，标点照抄。绝不编造、改写、凭记忆补全或自己翻译经文。**英文和中文都不用手写**：写好出处，两边先写 `TODO(经文)` 占位，运行 `npm run fill:scripture`，程序会从 `content/scripture/bsb.json` 和 `content/scripture/cuv.json` 把原文填进去；`npm run validate:content` 会核对每一行英文、中文都和原文一样。程序填不上的（那卷书还没导入，或者来源的文本在那一节有问题）会留着 `TODO(经文)` 并报出来，这时在回复里提醒人工核对；带着 `TODO(经文)` 的内容不要合并到 `main`。**经文一节都不跳过**：一章的经文范围（`range`）里的每一节都要出现在剧情里，`npm run count:verses` 会列出还缺哪些节。陶片、信物这些非经文文字里引用经文时，引号里的字也要和原文一样。
2. 经文的来源：英文 BSB 从 2023 年 4 月 30 日起属于公有领域，可以自由使用，没有节数的限制。游戏里要保留来源说明（`UI.bibleNotice`），并在每段经文旁标出译本（BSB / 和合本）。要用到新的书卷时，照 `scripts/import-bsb.ts` 和 `scripts/import-cuv.ts` 开头的说明把它的原文导入。中文用的是 eBible.org 上的《新标点和合本》简体文本，导入时只整理排版（去掉“神”字前的空格和诗歌分行的空格、引号换成 “”、去掉表示“补充的字”的记号），规则写在 `src/content/usfm.ts`；这份文本有个别节缺字（创世记里有 18 节，都在第 13 章以后），程序会拒绝使用，列在 `cuv.json` 的 `gaps` 里。它的授权还有疑问，见 `docs/STATUS.md` 的“还没定”。2026-11-21 以前英文用的是 ESV（有版权，Crossway）、中文是老版和合本的文字：正式工程里已经全部换掉；小样 `prototype/` 里还留着 41 节 ESV 和它的版权声明，不要再往小样里加经文。
3. 双语：所有给玩家看的文字都写成 `{ "en": "...", "zh": "..." }`，放在 `content/`，代码里不写死任何一种语言的文字。游戏只有两种模式：`en`（只显示英文）和 `bi`（英文在上、中文在下），默认 `bi`，选择存在 localStorage，切换时不需要重新加载。非经文文字（考据、想象、思考）两种语言意思一致即可。新界面要在两种模式、手机竖屏和横屏下都检查一遍。
4. 每一行显示给玩家的文字都有 kind：`scripture`（金）、`history`（蓝）、`imagination`（灰）、`reflection`（绿）。新功能沿用这四种样式。
5. 内容与代码分离：剧情文字、收集品、坐标写在 JSON 里，不要硬编码在 TS 中。
6. 呈现：神不以人形出现（只用光、声音、云、火、风）；暴力“暗示而非展示”，不出现血和死亡特写；面向 8 岁以上。
7. 儿童安全：不做自由文字聊天；不收集姓名、位置等个人信息；不接第三方统计和广告；不放外部链接（版权声明里的网址只写成文字，不做成链接）。
8. 原创：不使用《光遇》(Sky) 的任何素材、角色造型、名称、音乐或界面。第三方素材只用 CC0 或明确允许的授权，并登记在 `CREDITS.md`。
9. 手机优先：所有操作都支持触屏（左摇杆、右侧拖动视角、按钮）；中端手机 ≥ 30 帧。
10. 性能：draw calls < 150；草和树用 InstancedMesh；纹理 ≤ 1024；每章资源 ≤ 5 MB；不用实时阴影（用圆形阴影贴图）。
11. 可读性：代码注释和回复都用简体中文，写给初学者看；函数短小，命名清楚（游戏里给玩家看的文字按第 3 条双语）。
12. 小步前进：一次只做一个任务；不要顺手大改无关的代码。

## 完成任务前
- `npm run build`、`npm test`、`npm run validate:content` 全部通过；改了经文就附上 `npm run count:verses` 的结果
- 在回复里写清楚：改了什么、怎么在电脑和手机上手动测试、还有什么已知问题
- 改了玩法就更新 `docs/CHANGELOG.md`
