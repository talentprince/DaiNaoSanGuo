# Demo 0.11 技术结构

Cocos Creator3.8.8 / TypeScript。Battle.scene与BattlePreview组件UUID保留，UI运行时生成。

| 层 | 模块 | 职责 |
| --- | --- | --- |
| 规则 | BattleEngine | 固定步长、独立能量、分档目标/治疗、盾/增攻、星级/专武战斗效果、秘境与首领、城防与胜负 |
| 参数 | GrowthConfig | 999/300边界、等级/地图/经验曲线、日上限、星级与兑换参数、大数格式 |
| 内容 | HeroCatalog / EquipmentConfig | 44将、品级/来源、专武/部位/归属和效果说明 |
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

## 0.10模块

- HeroIdentity：统一性别/配色/元素；ComicHead：战斗、头像、卡牌共用头部，HeroPortrait提供圆形裁切。
- BondConfig：纯规则、实际同阵与成员受益、封顶、幂等；BattleConfig/ActivityConfig在最终阵型上应用。
- BattleEngine：灼烧/冰缓/中毒/抑疗与治疗光环计时，真实盾/伤害/治疗结算；UI不计算伤害。
- WeatherEffects：独立4秒天气层，与1.5秒横幅分离；UnitActor随身状态环。暂停时两者时钟冻结。
- HeroCard/UnitPreview：统一人物卡、招募结果、兑换前属性与羁绊；不持有独立账本。
- DeveloperMode：本机/微信devtools检测、独立存档/背包上限、全44将配装与预设；BattlePreview测试台调用。
- resources/battle-art：4幅600×900 JPG，BattleStage异步加载并缓存Texture/SpriteFrame，失败保留程序地景；背景和裁剪层分离。

常规存档键不变，开发档另键；不通过URL种子注入，不打包浏览器存档。

## 0.11模块

EnergyConfig统一命中/击杀/基础能量、清洗和身份快照；BattleEngine接受initialEnergy并负责击杀去重/全队回能。ProgressStore的mainlineEnergy/trialEnergy分别携带next-stage和武将能量，成功结算时保存，重复结算不变，失败/重战清空；UI不依据飘字算能量。

WeaponPresentation统一人物基础兵器与本人专武外观标记；普通装备appearance仅用于背包物品，不改变人物持有兵器；卡牌使用实际穿戴，招募海报注明展示专武。WeatherEffects加强对比和场中覆盖，生命周期4.5秒，背景与浮动导航扩展至704×1108战场。

preflight-wechat.mjs只读本地微信构建，检查AppID/入口/portrait/保守体积预算；不能校验平台账号或代替合规/真机验收。

## 0.11追加模块

- WorldBossConfig定义轮换、三魔王与弱点；ActivityRun保存id/周次快照；BattleEngine锁分后先finisher事件再impact全灭，演出结束才settle。
- AudioDirector是独立平台音频策略，GameAudio接微信/HTML音频与生命周期；构建模板复制根audio文件，不扩引擎音频包。
- LocalSession集中本地档入口并检查RuntimeConfig；cloud在创建Store前拒绝，不能fallback到本地资源。当前仍是同步本地业务，不声称完整异步云Provider。
- server/app.mjs与dev-server.mjs为loopback只读配置原型，BackendContract记录响应。与游戏可独立运行，当前客户端不请求/应用其配置。后续异步服务层、登录、云档、幂等账本和可信重演见BACKEND_PLAN。
