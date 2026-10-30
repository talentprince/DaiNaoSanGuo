# 呆脑三国 · DaiNaoSanGuo

Q 版三国题材、五武将自动战斗与刷宝成长，目标平台为微信小游戏。

## 当前状态

Cocos Creator 3.8.8 工程已实际打开，`assets/Battle.scene` 已保存并通过浏览器运行验证。设计分辨率为 720 × 1280。预览显示游戏标题及关羽、张飞、赵云、诸葛亮、刘备五名占位武将；尚未实现自动战斗。

本地预览地址：http://localhost:7456/ 。需要保持 Creator 工程打开；预览页顶部可切换设备尺寸。

## 本机工具位置

- Dashboard：`/Applications/CocosDashboard.app`
- Creator：`/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- 项目：`~/Workspace/DaiNaoSanGuo`

## 打开与预览

1. 在 Dashboard 的 Projects 中双击 DaiNaoSanGuo，使用已关联的 Creator 3.8.8 打开。
2. 在 Assets 中打开 Battle 场景，点击编辑器顶部三角形预览按钮。
3. 浏览器中应显示《呆脑三国》标题、五个武将卡片及“开发环境已就绪”。
4. 首屏节点由 Canvas 上的 BattlePreview 组件运行时生成，因此编辑模式主要显示 Canvas 和 Camera。

## 下一项任务

按 docs/TASKS.md 的 02 项实现独立于 Cocos 的自动战斗规则，再接入血条、伤害数字和胜负显示。

## 已执行检查

- 使用安装包内的 TypeScript 编译器执行 `--noEmit --skipLibCheck`：通过。跳过 Cocos 自带声明文件的检查，仍检查项目脚本。
- Creator 3.8.8 打开、导入脚本、保存并重新打开场景：通过。
- 浏览器真实加载场景：通过；当前检查中没有浏览器 error/warn 日志。
- 未进行打包、微信开发者工具或真机验证。

## 协作

一个 Codex Agent 负责代码、检查与修复，你在 Cocos 中试玩验收。战斗规则使用纯 TypeScript，Cocos 负责画面。每次完成一个可以验证的小任务。

## 文档

- docs/GAME_DESIGN.md：首版范围
- docs/ARCHITECTURE.md：技术边界
- docs/TASKS.md：任务与验收
- docs/SETUP.md：安装与检查记录
