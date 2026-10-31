# 呆脑三国 · DaiNaoSanGuo

呆萌武将，大闹三国！Cocos Creator 3.8.8 / TypeScript / 720×1280竖屏微信小游戏原型。

## 当前版本：Demo 0.8

40武将与普通/骁将/名将/神将四档品质、剧情送将、呆币招募、挂机、军功任选、阵容、装备、本地存档和四副本。角色拆分身体部件播放行走、攻击、受击和倒地动作，普攻与技能有独立效果。

**支持的功能、完成任务、验收和限制以根目录SPEC.md为准。**

## 试玩

- 已构建的独立Web版：http://127.0.0.1:8765/
- Creator编辑器预览：http://localhost:7456/（需编辑器运行）。
- 主线队伍向右行军，清怪积累秘境进度；满100召Boss，击败后3秒自动进入下一关，失败可重打。
- 底部“布阵·武将·副本”进入大厅，再点拖拽布阵：下方头像拖入上方固定站位，可交换、拖出或自动安排，三套阵型分别保存。
- 武将与刀盾/长枪/弓箭兵可自由混编；主线5单位，三将3单位且最多1神将2名将。
- 左侧每名武将独立蓄能，满能量头像闪烁，点击释放，或开启自动技能；攻击技能目标数按品级为1/2/3/全场。
- 普通无治疗，骁将单体、名将群体、神将群体并加护盾/攻击状态。技能详细规则见SPEC.md。
- 守城固定城上2位、门前6选3；开场冲锋后看见右端朝左城门，城上减伤60%，破城落地解除减伤。
- 世界Boss上方大模型、我方下方横排，固定1倍速30秒计分，不重复刷当日档位奖励。
- 三将为3v5，双方向中间走，最多1神将、2名将；空位由小兵补到3人。
- 底部背包可穿戴装备；顶部升级全队。阵容、升级、兵种与穿戴下一次入场生效。
- 同一origin建议只开一个游戏页；编辑器预览和独立Web版存档互不影响。

目前真实玩家攻守、全服榜单、微信身份和服务器账本未接入。攻城明确标为演练，世界Boss记录个人最高。角色是程序化2D关节图形，尚无正式骨骼资源、3D模型或音效。

## 本机工具

- 工程：`~/Workspace/DaiNaoSanGuo`
- Dashboard：`/Applications/CocosDashboard.app`
- Creator：`/Applications/Cocos/Creator/3.8.8/CocosCreator.app`
- 微信开发者工具：`/Applications/wechatwebdevtools.app`（2.02.2609240 Stable）

Dashboard双击工程，使用Creator 3.8.8。预览入口固定Battle；UI由BattlePreview运行时生成，编辑模式主要显示Canvas和Camera。

## 检查与构建

Node >=22.18，无需npm install。类型检查使用本机Creator自带TypeScript及首次导入生成的temp声明。

```sh
npm test
npm run typecheck
```

先保存并关闭同一工程的Creator，再构建：

```sh
npm run build:web
npm run build:wechat
```

输出build/web-mobile、build/wechatgame；日志temp/build-平台.log。Creator成功码36由脚本转换为0。其他Creator安装位置通过COCOS_CREATOR_PATH指定。

用微信开发者工具选择小游戏，导入build/wechatgame；本机使用游客模式和官方测试AppID。未使用正式AppID、真机、上传或发布。开发者工具生成的project.private.config.json等本机状态不分发。

## 文档

- SPEC.md：功能状态、规则、验收、限制和后续工作。
- docs/ROSTER_0.8.md：当前40武将、品级、技能与剧情关卡。
- docs/EXPANSION_0.5.md：历史经济设计，现行规则以SPEC.md为准。
- docs/BATTLE_STYLE_0.6.md：场景、模型、动作和小兵规则。
- docs/BUILD_REPORT.md：当前构建与实际运行证据。
- docs/TASKS.md：阶段清单；docs/ARCHITECTURE.md：模块说明。
- docs/HISTORY_0.4.md：0.4历史验收记录。
