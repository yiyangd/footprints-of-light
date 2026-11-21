@AGENTS.md
@docs/STATUS.md

## Claude Code

上面引入了两份文件：`AGENTS.md` 是这个项目的规则（Codex 也读它），`docs/STATUS.md` 是现在做到哪了。

- `AGENTS.md` 里“技术栈”“常用命令”“目录”描述的正式工程已经搭好（M0 做完了），主页进的就是它。做到哪了、下一步是什么，以 `docs/STATUS.md` 为准。
- 带领人不是程序员，一起做的孩子是初学者。回复用简体中文，先说结果，再说怎么在浏览器里看到。
- 只有 `main` 分支会发布到网站。在分支上改完，开一个 PR，说明里写清楚改了什么、怎么手动检查；合并之后网站才更新。
- 动经文之前先读 `AGENTS.md` 的第 1、2 条：英文 BSB 和中文和合本一字不改，不凭记忆补经文，一节都不跳过。英文用 `npm run fill:scripture` 填，加了经文运行 `npm run count:verses`。
- 年代、地点、每一季怎么分幕，依据在 `docs/时间线与地图调研.md`；玩法和美术方向在 `docs/设计方案.md`。这两份很长，用到哪一节读哪一节。
- 做完一件大事，更新 `docs/STATUS.md` 和 `docs/CHANGELOG.md`。
