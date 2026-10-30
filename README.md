# 呆脑三国 · DaiNaoSanGuo

Q 版三国题材、五武将自动战斗与刷宝成长，目标平台为微信小游戏。

## 当前状态

Demo 0.4 已实现五武将自动战斗、三波黄巾军、血条与伤害、青龙斩、仁德回复、胜负结算、铜钱、全队升级、下一关、装备掉落、背包、穿戴和本地存档。画面为720×1280，角色使用原创临时图形。

**当前支持的功能、完成任务、验收与后续进度以根目录 SPEC.md 为准。**

预览：http://localhost:7456/ ，需保持Creator打开。请只在一个预览页游玩同一存档。

## 本机工具位置

- Dashboard：`/Applications/CocosDashboard.app`
- Creator：`/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- 项目：`~/Workspace/DaiNaoSanGuo`

## 打开与预览

1. Dashboard中双击DaiNaoSanGuo，使用Creator 3.8.8。
2. 打开Battle场景，顶部预览场景选Battle，点击三角形预览。
3. 自动进入最高通关后的下一关；胜利后可继续挑战。
4. 可暂停、切换倍速、关闭自动技能后手动释放青龙斩或重新开始。
5. 顶部“升级全队”消耗铜钱，在下一场战斗生效。
6. 胜利掉落武器，底部“装备背包”可选择武将穿戴、卸下或穿戴最强，下一局生效。
7. UI由BattlePreview在运行时生成，编辑模式主要显示Canvas和Camera。

## 检查

```sh
npm test
npm run typecheck
```

需要Node >=22.18；无需npm install。类型检查依赖编辑器首次打开生成的temp声明，使用已安装Creator的TypeScript。其他安装位置通过COCOS_CREATOR_PATH指定。

30项自动化测试与严格类型检查已通过；实际验证战斗、按钮、升级与读档。Web Mobile和微信离线包已构建；未进行微信开发者工具或真机验证。

## 下一项任务

微信开发者工具/真机验证、羁绊与正式美术，见SPEC.md。

## 协作

一个 Codex Agent 负责代码、检查与修复，你在 Cocos 中试玩验收。战斗规则使用纯 TypeScript，Cocos 负责画面。每次完成一个可以验证的小任务。

## 文档

- docs/GAME_DESIGN.md：首版范围
- docs/ARCHITECTURE.md：技术边界
- docs/TASKS.md：任务与验收
- docs/SETUP.md：安装与检查记录

## 构建

先保存并关闭同一工程的Creator编辑器，再执行：

```sh
npm run build:web
npm run build:wechat
```

输出在build/web-mobile和build/wechatgame，日志在temp/build-平台.log。微信配置使用官方测试AppID，仅用于离线测试；正式使用需配置自己的小游戏AppID。详细验证与限制见docs/BUILD_REPORT.md。
