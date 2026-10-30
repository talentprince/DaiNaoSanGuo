# 当前技术结构 · Demo 0.6

Cocos Creator 3.8.8 / TypeScript。Battle.scene沿用既有UUID，Canvas挂BattlePreview。UI在运行时生成。

- BattleEngine：固定步长、攻击/治疗/死亡、怒气、秘境进度/召Boss、世界Boss计分与城墙减伤；不依赖Cocos。
- HeroCatalog：24武将、四档品质、职业、获取来源与阵容校验。
- BattleConfig：等级与装备缩放、三类小兵、主线秘境配置。
- ActivityConfig：四副本配置、挑战快照、关卡特点。
- ProgressStore：本地账本、武将/阵容、招募保底、兑换、挂机、日次数与唯一副本结算。沿用v1键并以metaVersion2扩展，保留旧存档。
- UnitActor：可动身体部件和角色姿态，不承担伤害计算。
- BattleStage：不同场景的布局背景与主线滚动地景。
- CombatEffects：消费战斗事件中的真实目标，播放弹道、斩击、治疗、光环与破城碎石。
- BattlePreview：协调场景、引擎、角色、UI和通关自动推进。
- MetaPanel / InventoryPanel / BattleUI：大厅、背包和基础绘制。

Node测试通过test-support.mjs将Cocos使用的无扩展名导入解析为TypeScript，使用Node内置类型擦除与测试运行器。没有新增npm运行依赖。

所有战斗数值和结算当前由客户端本地执行，不能作为正式在线账本。真实攻城、Boss排名与奖励需要身份、服务端时间、数据库事务和战斗复算。详见EXPANSION_0.5.md末尾联机边界。
