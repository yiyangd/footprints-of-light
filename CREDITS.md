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

### 英文：ESV
游戏里显示的英文经文引自 ESV。按 Crossway 的要求，游戏里（标题页和图鉴的“经文”页）显示这段声明：

> Scripture quotations marked (ESV) are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.

- ESV 有版权，不是公有领域。Crossway 的标准使用指引允许不经书面许可引用：整个作品不超过 500 节、不超过任何一卷书的一半、不超过作品全部文字的 25%，并且不是注释书或其他圣经参考书。
- 现在用了 42 节（创世记 41 节，加上封面上的诗 77:19；另有陶片、信物里的几处短句），远低于 500 节。运行 `npm run count:esv` 可以看到最新的数字。但游戏的英文文字里经文占了四成多；按中英文全部文字算约两成。这一条有解释空间，正式公开发布前，建议带领人填写 Crossway 的许可申请（www.crossway.org/permissions）确认。
- 完整游戏会超过 500 节，必须先取得 Crossway 的书面许可或正式授权。
- 含 ESV 经文的作品不能用 Creative Commons 授权发布。如果以后要开源代码，代码可以用 MIT 之类的授权，但要写明 `content/` 里的 ESV 经文不在开源授权范围内。
- “ESV”和“English Standard Version”是 Crossway 的注册商标，只用来标明经文出处，不要用在游戏名称或标志里。
- 如果拿不到许可：英文可以换成公有领域的 Berean Standard Bible（BSB，2023 年献给公有领域，https://berean.bible/terms.htm），只需替换 `content/` 里经文的 `en` 文字。

### 中文：和合本
- 中文经文：和合本（新标点和合本，神版）的文字。
- 和合本 1919 年原版已属公有领域；1988 年的《新标点和合本》由香港圣经公会出版，与原版只在标点和个别用字上不同。
- 正式公开发布前，请向圣经公会确认所用电子文本的使用许可，或改用标明公有领域的和合本数据。

## 字体（通过 Google Fonts 加载，SIL Open Font License）
- EB Garamond（英文经文与标题）、Nunito（英文界面）
- Noto Serif SC、Noto Sans SC（中文）

## 美术与音乐
- 小样里的所有模型、贴图、彩窗、音乐都是程序现场生成的原创内容。
- 以后加入的第三方素材，只用 CC0 或明确允许的授权，并在这里登记：名称、作者、授权、来源链接。
