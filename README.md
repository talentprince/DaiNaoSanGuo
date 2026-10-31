# 呆脑三国 · Demo 0.9「脑洞大开」

40武将、原创可动漫画模型、999主线数值关卡、四副本本地原型；三槽装备/专武、1–6星、脑勋兑换与日4h挂机经验。

**功能、当前规则、验收与待Review事项统一见根目录SPEC.md。**

## 试玩

- 独立Web：http://127.0.0.1:8765/；Creator预览：http://localhost:7456/（需编辑器）。不同origin存档不互通。
- 主线向右清怪攒进度，满100召首领，击败后3秒下一关；失败可看征途里的军师锦囊。
- 底部行装：上方选将，武器/战甲/兵符格；下方装备拖入或点选穿戴，拖回背包卸下；专武坊用700脑勋换本人专武。
- 武将：升星和拖拽布阵；刀枪弓可以混编。三将3人且最多1神将2名将；守城2城上+门前6选3。
- 征途：领经验/升级、领呆币、查看每日脑勋/将魂进度与下一步建议。经验每天最多4h份，通关没有固定即时经验。
- 武将页副本：城门演练、30秒个人Boss、三将闯关、3筹谋3波借宝。脑勋每天最多100：专武7个满额日、名将14个、神将21个，共用钱包。
- 每名非小兵武将独立蓄能，左侧圈满闪烁可点；也可开启自动或点齐放。

真实PvP/全服榜单、服务端账本、正式漫画骨骼资源/音效、自有AppID、真机与上传发布尚未完成。999是数值关卡范围，当前5名称循环，不是999份独立剧情。建议同一origin只开一个游戏页。

## 本机工程与开发

工程~/Workspace/DaiNaoSanGuo，Creator3.8.8；Dashboard /Applications/CocosDashboard.app，Creator /Applications/Cocos/Creator/3.8.8/CocosCreator.app，微信工具 /Applications/wechatwebdevtools.app。

Node >=22.18，无需npm install。Battle.scene保持既有UUID，Canvas关联BattlePreview，UI运行时生成。

```sh
npm test
npm run typecheck
npm run balance
```

保存并关闭同一工程Creator再构建：

```sh
npm run build:web
npm run build:wechat
```

输出build/web-mobile和build/wechatgame，日志temp/build-平台.log；Creator成功退出码36由脚本转换0。COCOS_CREATOR_PATH可指定其他安装位置。微信使用游客模式、官方测试AppID，包内不分发project.private.config.json和账号状态。

## 文档

- SPEC.md：现行规则、已完成、验收和Review。
- docs/ECONOMY_0.9.md：经验、兑换、升星、专武和副本参数。
- docs/BALANCE_0.9.md：自动战斗边界与30天投影。
- docs/ROSTER_0.9.md：40将、品级、技能和剧情节点。
- docs/BUILD_REPORT.md：当前构建与实际证据。
- docs/ARCHITECTURE.md、docs/TASKS.md：模块与阶段清单。
- docs/HISTORY_0.4/0.6/0.8.md：历史，不作为当前规则。
