# Demo 0.9 技术结构

Cocos Creator3.8.8 / TypeScript。Battle.scene与BattlePreview组件UUID保留，UI运行时生成。

| 层 | 模块 | 职责 |
| --- | --- | --- |
| 规则 | BattleEngine | 固定步长、独立能量、分档目标/治疗、盾/增攻、星级/专武战斗效果、秘境与首领、城防与胜负 |
| 参数 | GrowthConfig | 999/300边界、等级/地图/经验曲线、日上限、星级与兑换参数、大数格式 |
| 内容 | HeroCatalog / EquipmentConfig | 40将、品级/来源、专武/部位/归属和效果说明 |
| 关卡 | BattleConfig / ActivityConfig | 属性合成、独立兵种、主线与副本快照；副本地图档与特性 |
| 状态 | ProgressStore | 本地账本、经验、升星、三槽归属/兼容单武器、招募/兑换、日上限/去重、旧档迁移 |
| 阵型 | FormationConfig / FormationPanel | 站位、校验/自动排阵、品级变化修复、拖动交换与撤下 |
| 展示 | UnitActor / HeroPortrait / EquipmentIcon | 原创漫画分部件模型、头像、物品图形和专武外观 |
| 战场 | BattleStage / CombatEffects / SkillHud | 地景行军、消费真实目标事件、各将技能圈、专武标识/大数；不负责扣血 |
| 界面 | InventoryPanel / MetaPanel / BattleUI | 三槽穿脱、专武兑换、升星、成长/日目标/锦囊、图标导航 |
| 协调 | BattlePreview | 场景/单位/结算/自动推进；裁剪节点与绘制背景分开，避免影响根导航 |
| 验证 | tests / scripts/balance-report.mjs | 核心规则回归、数值边界和成长投影；不依赖Cocos运行 |

旧存档键不变；新增growthVersion1字段，points继续作为脑勋余额；equipped是loadouts.weapon兼容投影。挑战入场把等级、装备/星级/专武、阵型、日档复制成快照，途中养成不回写。UI只通过Store方法改变资源。

测试使用Node类型擦除和test-support.mjs解析Cocos无扩展名导入，未新增npm依赖。所有账本、时钟和随机当前本地执行，不能代替正式服务器；真实身份/攻守/榜单另见SPEC R06。
