# 致谢与授权

## 代码与工具
- three.js 0.186.1 — MIT License，Copyright © 2010–2025 three.js authors（https://threejs.org）
- esbuild — MIT License（只在打包时使用）
- Vite — MIT License；Vitest — MIT License；zod — MIT License；tsx — MIT License；TypeScript — Apache License 2.0（只在开发、测试和打包时使用）
- topojson-client — ISC License；world-atlas — ISC License（只在生成底图时使用）

## 地图
- 主页底图的海岸线来自 Natural Earth 1:5000 万陆地数据（公有领域，naturalearthdata.com），经 world-atlas 取得，裁剪并化简后存为 `home/src/basemap.json`。
- 尼罗河、约旦河、底格里斯河、幼发拉底河、加利利海和死海是手工描的简化线，只作示意。
- 地点的经纬度是按通行的圣经地图集整理的大概位置；标了 `approx` 的是传统位置或不确定的位置。

## 经文

### 英文：BSB
游戏里显示的英文经文是 Berean Standard Bible（BSB）。

- BSB 从 2023 年 4 月 30 日起属于公有领域，可以自由使用，不需要申请许可，也没有节数的限制（官方说明：berean.bible/terms.htm）。
- 官方希望（但不强制）使用时带上这段署名。游戏里（开始页、主页封面和图鉴的“经文”页）显示它：

> The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, unfoldingWord, Bible Aquifer, OpenBible.com, and the Berean Bible Translation Committee. This text of God's Word has been dedicated to the public domain.

- 原文存在 `content/scripture/bsb.json`，是用 `scripts/import-bsb.ts` 从官方文本（bereanbible.com/bsb.txt，2026-11-21 下载）生成的，现在有创世记全卷和诗篇 77:19。游戏里每一行英文经文都由程序从这里按出处取，并自动核对一字不差。
- 官方的请求：经文一字不改时可以用 Berean 的名字；改动过的文本不要再叫这个名字。我们只用原文。
- 2026-11-21 以前英文用的是 ESV（有版权，Crossway）。正式工程里已经全部换成 BSB。最早的小样（`prototype/`，发布在 `/prologue/`）里还留着 41 节 ESV 和 Crossway 要求的版权声明，在免申请的范围之内；小样不再加内容，以后删掉时这一条也跟着删。

### 中文：新标点和合本
- 中文经文：《新标点和合本》（简体，神版）。2026-11-21 带领人定的。
- 电子文本来自 eBible.org（译本代号 cmn-cu89s，文件 ebible.org/Scriptures/cmn-cu89s_usfm.zip），由 `scripts/import-cuv.ts` 存进 `content/scripture/cuv.json`。导入时只整理排版：去掉“神”字前的空格和诗歌分行的空格，引号 「」『』 换成 “”‘’，去掉表示“补充的字”和专有名词的记号；字和其余标点照原文。
- 授权还有疑问：eBible.org 把这份电子文本标为公有领域（Public Domain）；而 1988 年的《新标点和合本》由香港圣经公会出版并代理版权。两边说法不一致。
- 正式公开宣传之前，请向圣经公会确认使用许可。如果不能用，要换成 1919 年的老版和合本（公有领域），那时需要一份可靠的电子文本。

## 字体（通过 Google Fonts 加载，SIL Open Font License）
- EB Garamond（英文经文与标题）、Nunito（英文界面）
- Noto Serif SC、Noto Sans SC（中文）

## 美术与音乐
- 小样里的所有模型、贴图、彩窗、音乐都是程序现场生成的原创内容。
- 以后加入的第三方素材，只用 CC0 或明确允许的授权，并在这里登记：名称、作者、授权、来源链接。
