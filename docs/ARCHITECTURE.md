# Demo 0.13 技术结构

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

## 0.11.1体验档

ExperienceMode用独立键/带grantVersion的信封保存体验进度，首次从常规档取副本后加五种资源；写入始终只写体验键。LocalSession由构建localProfile选择，不接受URL/玩家存档指定。开发档仍走原隔离方式。开局补给弹层暂停战斗，手机顶部标注内测；公开版本须切回standard，服务器不信任/导入这些本地资源。

## 0.12展示/节奏与音频

- ViewportLayout纯计算竖屏定宽/动态高度和上下安全区；BattlePreview读取微信胶囊下缘补充安全区，TopHUD/BottomHUD最后绘制，全画布主题底色。全屏面板背景随可视高度扩展，固定内容保持居中。
- MainlineThemes负责10个百关主题；MainlineScenery按连续世界坐标生成山/云/地物/道路，没有整幅贴图拼接。会话镜头距离由BattlePreview跨关保存。
- EncounterPresentation把行军/敌军进入与城池透视做为纯展示状态；BattleEngine独立持有接近/清场/预警时钟，接近时不能攻击。BossWarningState使用UI时钟，面板/结算关闭提示，避免战斗暂停锁住红屏。
- 城池与城上守将同属固定Fortress层，地面敌军独立；破城守将保留世界坐标转父层。UnitActor.impactPoint遍历到Units，嵌套节点不导致技能/打击飘字坐标错误。
- BossPresentation纯计算Boss/我方比例与长屏布局；巨型Boss计分靶不画恒满血条，顶部显示本次/今日伤害。旧挑战缺Boss快照时，展示与引擎同按入场日推导轮值。
- SignaturePanel与武将来源面板只负责预览/导航，兑换、穿戴、碎片扣费仍走ProgressStore；souls字段兼容，显示脑力。
- AudioDirector增加8场景选曲、兵器音效变体/限频/优先级、分包ready门禁与场景播放位置缓存；GameAudio接HTML或wx平台、seek/onCanplay和生命周期。audio-package.mjs打包音频及game.js入口，预检分别计算主包/分包。

短打击顿挫仅冻结视觉，不冻结引擎计分。原创程序绘制与音频不意味着最终角色骨骼/全部独立机制已经完成；当前仍无云端权威状态。

## 0.13

EnemyCatalog生成5波×8名真实敌军，6种身份及精英标记；UnitConfig.riftValue允许每个敌人不同秘境值，缺省10兼容旧配置。主线普通2/精英10，满100沿用引擎唯一Boss生成。普通/精英仍是小兵战斗类别，无武将主动技；精英增加体型/护甲/血攻/标记。

SiegeLayout定义横版城池锚点、镜头平移、上下城楼与门前位置；FormationConfig从同一位置推导编辑器坐标，旧阵位ID保留。墙和守军共享镜头偏移、演员初始/目标均保持原世界位置，不叠加奔跑。

MusicRouting统一由模式/Boss阶段/菜单状态选曲；GameAudio只在变曲时记录与调用，Boss提示由入场事件独立触发。AudioDirector负责菜单静音战斗残音、260/600ms限频与0.95秒警报保护。主线入口保留未完ActivityRun，由原Store继续/放弃流程处理，不新增奖励或退次数。
