# 呆脑三国 · Demo 0.11.1「内测补给」

44武将（8女将）、原创可动漫画模型、999主线数值关卡、四副本本地原型；三槽装备/专武、1–6星、脑勋兑换与日4h挂机经验。

**功能、当前规则、验收与待Review事项统一见根目录SPEC.md。**

## 本机测试

本机地址与微信devtools默认独立满级测试档：全部44将、Lv300/6星、132件配装。右上「测试」可调等级/星级/地图、充能、直接测Boss或切换常规旧档；开发资源不写入常规存档。本构建非本机地址默认独立体验档，首次发大量资源；原常规档不覆盖。

## 试玩

- 独立Web：http://127.0.0.1:8765/；Creator预览：http://localhost:7456/（需编辑器）。不同origin存档不互通。
- 主线向右清怪攒进度，满100召首领，击败后3秒下一关；失败可看征途里的军师锦囊。
- 底部菜单→行装：上方选将，武器/战甲/兵符格；下方装备拖入或点选穿戴，拖回背包卸下；专武坊用700脑勋换本人专武。
- 群英：人物卡、属性/羁绊、升星和拖拽布阵；刀枪弓可以混编。三将3人且最多1神将2名将；守城2城上+门前6选3。
- 菜单→成长：领经验/升级、领呆币、查看每日脑勋/将魂进度与下一步建议。经验每天最多4h份，通关没有固定即时经验。
- 战场右侧副本：城门演练、三周轮换个人Boss（计分30秒后终结演出）、三将闯关、3筹谋3波借宝。脑勋每天最多100：专武7个满额日、名将14个、神将21个，共用钱包。
- 每名非小兵武将独立蓄能，左侧圈满闪烁可点；也可开启自动或点齐放。

真实PvP/全服榜单、服务器账本和最终骨骼资源尚未完成；已用自有AppID上传0.11.1，0.11.0用户手机启动及音乐/大招音效通过，0.11.1用户手机补给已到账，后台体验版与好友权限待完成。999是数值关卡范围，当前5名称循环，不是999份独立剧情。建议同一origin只开一个游戏页。

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

输出build/web-mobile和build/wechatgame，日志temp/build-平台.log；Creator成功退出码36由脚本转换0。COCOS_CREATOR_PATH可指定其他安装位置。微信已使用用户AppID wx6ac3f5090a6b99c5、用户扫码登录；当前开发工具项目为build/wechatgame-owned（同一构建的独立导入目录），包内不分发project.private.config.json和账号状态。

## 文档

- SPEC.md：现行规则、已完成、验收和Review。
- docs/ECONOMY_0.11.md：经验、兑换、升星、专武和副本参数。
- docs/BALANCE_0.11.md：自动战斗边界与30天投影。
- docs/ROSTER_0.10.md：44将、品级、技能和剧情节点。
- docs/BUILD_REPORT.md：当前构建与实际证据。
- docs/ARCHITECTURE.md、docs/TASKS.md：模块与阶段清单。
- docs/HISTORY_0.4/0.6/0.8/0.9.md：历史，不作为当前规则。

0.10新增7组实际同阵羁绊，神将4秒全场天气与火冰毒持续状态，四副本原创漫画背景；详见SPEC与docs/ART_ASSETS_0.10.md。

0.11：菜单悬浮于扩展背景，4.5秒强化天气；普攻命中+1，击杀全队+18、击杀者另+7；主线/三将分别继承过关余能。仅本人专武改变持有兵器光效，普装仅加属性。测试台新增雷火毒满能演武队。

微信注册/手机内测步骤见docs/WECHAT_TESTING.md。npm run check:wechat只读预检，仍用官方测试AppID时退出码2为预期“未就绪”，不会上传。已有自有AppID，0.11.1上传完成；体验成员添加与后台设体验版步骤见该文档。

0.11补充：三位每周轮换魔王与30秒后终结演出；专武1.55倍与刃部光效；14个原创怀旧音乐/技能音频，右侧声音开关；140项规则测试。

本地优先：RuntimeConfig默认local，LocalSession隔离测试档，cloud未接入时禁止回落本地发奖。运行`npm run backend:dev`可启动127.0.0.1:8787只读配置原型；不影响离线游戏，客户端尚未应用远程配置。见docs/BACKEND_PLAN.md。

0.11.1内测补给：当前RuntimeConfig.localProfile=experience，手机/远程首次赠脑铢1000万、呆币/脑勋各100万、将魂10万、升级经验1亿。独立experience存档，原常规进度单向复制；只赠一次，消费不自动补满。公开发布前须切回standard并禁用测试入口；未来云端不导入这些资源。
