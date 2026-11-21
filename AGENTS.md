# AGENTS.md —《光之踪迹》

## 项目
《光之踪迹》（Footprints of Light）是一个网页 3D 圣经探索游戏（Three.js），英文为主、可开中文辅助（English / English + 中文）。玩家是“持灯的见证者”，按书卷和年代走过圣经历史：跟随引路之光，见证剧情（经文原文），收集信物、彩窗碎片、知识陶片、经文和姿态。灵感来自《光遇》的安静与同行，但所有美术和代码都是原创。
开发者是教会青少年（13–18 岁）和带领人；玩家是 8 岁以上的孩子。
完整设计见 `docs/设计方案.md`。

## 现在做到哪了（先读这里）
现在上线的是主页 `home/`、序章小样 `prototype/`，以及刚搭起来的正式工程（`src/`，发布在 `/play/` 试看）。`docs/PROMPTS.md` 的 M0 分三步做，现在做完了前两步：下面“常用命令”和“目录”里写的都已经有了；还差第 3 步（主页的入口从小样改到 `/play/`）。
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
- `npm run count:esv`（统计用了多少节 ESV 经文，见第 2 条）

## 目录
- `src/core` 渲染、主循环、输入、音频
- `src/world` 地形、水、天空、植物、动物
- `src/player` 角色控制、镜头、灯
- `src/story` 剧情节点（BeatRunner）、字幕、效果注册表
- `src/collect` 收集、存档、图鉴界面
- `src/episodes/<id>.ts` 每章专属的场景和效果（新的一章要在 `src/episodes/index.ts` 里登记）
- `src/content` 读 `content/` 下的 JSON；`schema.ts` 写明每个 JSON 该长什么样（检查和类型都从它来）
- `content/episodes/<id>.json` 每章的经文、节点、收集品（中英双语；新的一章要在 `src/content/index.ts` 里登记）
- `content/ui.json` 界面上的文字（按钮、开始页、提示、书卷名）；`index.html` 里用 `{{bi:page.start.title}}` 这样的记号引用，不写死文字
- `scripts/` `npm run validate:content` 和 `npm run count:esv` 背后的两个小工具
- `docs/STATUS.md` 现状与下一步；`docs/时间线与地图调研.md` 66 卷书按年代的排法和 41 张地图的依据
- `content/timeline.json` 全书时间线：12 季、66 卷书、41 张场景地图（主页直接读它）
- `home/` 主页“光之地图”（游戏目录）：地图 + 时间之河 + 66 盏灯；单独打包，发布在网站最外层
- `prototype/` 最早的单文件小样，现在发布在 `/prologue/`（只作参考；除了“回到光之地图”的按钮，不再修改）

## 必须遵守
1. 经文：只能使用 `content/` 里 kind 为 `scripture` 的文字，必须带出处（`ref` 写成 `Gen 1:3`）。英文用 ESV，中文用和合本（新标点和合本，神版），两种都一字不改，标点照抄。绝不编造、改写、凭记忆补全或自己翻译经文；缺少时写 `TODO(经文)`，并在回复里提醒人工补充。
2. ESV 有版权（Crossway）。按 Crossway 的标准使用指引：整个游戏引用 ESV 不超过 500 节、不超过任何一卷书的一半、不超过游戏全部文字的 25%；游戏里必须保留版权声明（`UI.esvNotice`），并在每段经文旁标出 ESV；含 ESV 经文的内容不能用 Creative Commons 授权发布。每次加经文后运行 `npm run count:esv`，把结果写进回复；超过上限之前停下来，提醒带领人先向 Crossway 申请书面许可。
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

## 较真的程度
不是每件事都要一样仔细，分两档。

**要较真**（不能错，改完要认真核对）：
- 经文原文
- 圣经里写明的数字和尺寸（要带出处）
- 年代和地点
- 存档
- 手机上能不能玩

**意思到了就行**：动物、植物、天气、水、镜头这些装饰性的画面和小动作。
- 这一档改完只要 `npm run build`、`npm test` 通过，打开看一眼不报错就行。
- 不要逐帧记录，不要为它写新测试，不要跑 `tools/compare-prototype/`。

**做任务时发现任务之外的毛病**：只在回复最后列出来，一行一条，不要修。

## 完成任务前
- `npm run build`、`npm test`、`npm run validate:content` 全部通过；改了经文就附上 `npm run count:esv` 的结果
- 在回复里写清楚：改了什么、怎么在电脑和手机上手动测试、还有什么已知问题
- 改了玩法就更新 `docs/CHANGELOG.md`
