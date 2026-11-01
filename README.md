# 呆脑三国 · Demo 0.12.0「一路横推」

44武将（8女将）、7羁绊、999主线数值关卡/10个百关视觉主题、四副本本地原型；三槽装备/本人专武、1–6星、脑勋兑换、每天最多4h挂机经验。

当前规则、已完成与待Review事项统一见[SPEC](SPEC.md)；本轮逐项问题和修复见[检查记录](docs/SPEC_AUDIT_0.12.md)。0.12已上传开发版本，上传时工具确认会覆盖既有体验版；未公开发布。0.12真实手机适配和声音仍待反馈，0.11手机启动/音乐与0.11.1补给已由用户确认。

## 试玩与入口

- 独立Web：http://127.0.0.1:8765/；Creator预览：http://localhost:7456/（编辑器开启时）。不同origin存档不互通，同origin建议只开一个游戏页。
- 主线行军遇敌→停步交战→再走，100进度暗红提示后接近Boss；每100关固定一个连续漫画主题，跨关镜头延续。
- 右侧副本进入城门演练、三周轮换个人世界Boss、三将3v5、草船借宝；城池固定透视，Boss巨体/三种弱点，30秒锁分后终结演出。
- 主线右侧“专武”、行装“专武兑换”或武将详情“获取专武”，预览700脑勋本人专武并兑换穿戴；普装不改变持有兵器，专武改变造型且刃部发光。
- 武将详情“碎片/脑力来源”可直接去招募：重复同将20碎片，副本通用脑力每日合计20；旧将魂只改名脑力。
- 底部群英/招募/名将坊及折叠菜单悬浮于战场；成长领取经验/升级，行装点击或拖动穿脱，布阵可自动/拖动，刀枪弓自由混编。
- 非小兵左侧满能才闪，可点放或自动；击杀主要回能，主线/三将分别继承通关余能。
- 声音开关控制8首原创怀旧场景/Boss曲和22音效；微信音频分包失败可重试，场景往返续播。

本机/微信devtools独立全44将Lv300/6星测试档（132件配装）；右上测试台可调地图/等级/星级、充能、三Boss预览。手机/远程默认独立内测补给档：脑铢1000万、呆币/脑勋各100万、脑力10万、经验1亿，只赠一次；原常规档不覆盖。测试资源不进入未来云端，公开构建须切standard并禁用测试入口。

## 开发

工程~/Workspace/DaiNaoSanGuo，Creator3.8.8；Node>=22.18，无需npm install。Battle.scene与组件UUID保持，UI运行时生成。

```sh
npm test
npm run typecheck
npm run balance
```

关闭同工程Creator后再构建：

```sh
npm run build:web
npm run build:wechat
npm run check:wechat
```

输出build/web-mobile与build/wechatgame，Creator成功码36由脚本转0；可用COCOS_CREATOR_PATH指定安装路径。音频由scripts/compose-audio.py（numpy/ffmpeg）生成已提交MP3，常规构建无需重新合成。微信脚本自动准备audio模板并写独立分包入口。

自有AppID wx6ac3f5090a6b99c5；开发工具使用build/wechatgame-owned同构建副本，排除project.private.config.json和账号状态。155规则测试、严格类型、双端构建通过；微信最终运行0错误，音频分包ready；详见[报告](docs/BUILD_REPORT.md)。

## 后续

人物仍为分部件漫画原型，999关并非999份独立剧情；真机操作/低端性能、常规档7/14天节奏、独立武将与专武机制仍需完善。真实攻守/全服榜单、云档/可信结算未完成。RuntimeConfig默认local，cloud未接入时拒绝回落本地发可信奖励。

`npm run backend:dev`启动127.0.0.1:8787只读配置原型；客户端尚未请求应用，不影响离线游戏。见[后端计划](docs/BACKEND_PLAN.md)。

[微信内测](docs/WECHAT_TESTING.md) · [当前经济](docs/ECONOMY_0.12.md) · [数值](docs/BALANCE_0.12.md) · [44将](docs/ROSTER_0.10.md) · [音频](docs/AUDIO_0.12.md) · [架构](docs/ARCHITECTURE.md) · [任务](docs/TASKS.md)。
