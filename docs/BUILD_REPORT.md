# Demo 0.11「蓄势破阵」构建与验收

2026-10-31（Asia/Shanghai），Creator3.8.8 / Node26.8.2。实际工程DaiNaoSanGuo，上传开发版本0.11.0；未公开发布。

| 检查 | 最终结果 |
| --- | --- |
| 规则回归 | 137通过/0失败；原115＋能量/外观8＋Boss6＋音频4＋本地服务边界4 |
| 严格类型 | npm run typecheck通过 |
| Web Mobile | Creator退出码36；55文件/4,465,512字节，14个生成JS语法通过 |
| 微信 | Creator退出码36；59文件/3,981,736字节，18个生成JS语法通过 |
| 本地只读预检 | readyForUpload=true；自有AppID、入口、portrait、保守4,000,000字节预算通过；不代核验主体资质 |
| 音频 | 14MP3/177,532字节均可解码；Web两首BGM HTTP200、audio/mpeg；用户确认手机音乐和大招音效都有 |
| 本机后端 | /health和/v1/bootstrap HTTP200；当前配置版本0.11.1；账号/云档/经济/榜单能力全false，客户端未应用远程配置 |

文件统计排除.DS_Store与project.private.config.json；不同于平台压缩/上传统计。微信工具预览代码包显示3871KB，最终以平台接受结果为准。当前包体余量较少，后续立绘/音乐扩展应先评估分包。

## 真实操作记录

- Web实际观察：背景延伸到导航下，半透明悬浮菜单；小乔暴雪、赵云粗雷、周瑜火柱、贾诩毒雾、华佗随身治疗光环，4.5秒持续且暂停冻结；满能技能圈与施法后暗圈区分。
- 主线/三将余能、失败清除、技能/持续伤害击杀、阵亡与封顶去重、普装不改外观由引擎/Store回归覆盖。
- 浏览器三Boss模型分别预览；董卓实际等到30秒后蓄势/终结/倒地/结算；另两位终结的精确人工计时尚未完成。
- 关羽专武详情卡重新排版，1.55倍专武与刃沿光效；普装/卡牌真实穿戴由回归验证。
- 最终Web声音开/关实点切换，error/warn日志为空。没有据此声称所有浏览器/设备声音策略均通过。
- 自有AppID wx6ac3f5090a6b99c5，用户扫码登录开发工具；新目录build/wechatgame-owned导入（canonical build/wechatgame复制，排除私有配置以摆脱旧游客身份缓存）。
- 最终微信模拟器载入场景，错误0/警告1（HarmonyOS基础库提示）。早期首次缓存缺失/工具worker提示已保留为历史，不列为最终零错误记录；GitLens系统Git缺失属于工具扩展通知。
- Preview二维码生成，10/31 23:42过期，开发预览上传耗时7299ms。**用户明确确认真实手机扫码进入游戏、音乐和大招音效都有。** 机型/系统未记录，不扩写成双端全部触摸验收。
- 0.11.0开发版本上传，更新说明明确单机内测、云档/真实攻城/全服榜单未开放；工具显示Upload completed（5151ms）。没有点击提审或公开发布。
- 基本信息仍审核中并未阻止这次预览/代码上传；后台是否允许设体验版尚未确认。朋友无权限，待添加微信号a designated tester；后台访问此前被浏览器安全检查阻止，未绕过，也未声称添加成功。

## 截图证据

- 暴雪与悬浮菜单 (local QA image omitted) · 赵云雷霆 (local QA image omitted) · 周瑜火柱 (local QA image omitted) · 毒雾/治疗 (local QA image omitted)
- 董卓 (local QA image omitted) · 张角 (local QA image omitted) · 孟获 (local QA image omitted)
- 30秒终结蓄势 (local QA image omitted) · 终结后倒地与结算 (local QA image omitted)
- 专武刃部与卡牌 (local QA image omitted)
- 手机预览二维码（历史临时码） (local QA image omitted) · 开发版本上传完成 (local QA image omitted)

## 下一步与限制

后台将0.11.0设体验版、添加a designated tester、确认朋友扫码；Android/iOS完整触摸/安全区/性能和后台恢复，先闭合手机反馈。前端战斗、美术、界面与经济继续迭代。后端并行从登录/云存档推进，当前只读配置原型不等于可用云端账号和结算。详见WECHAT_TESTING.md、BACKEND_PLAN.md。

交付源码/Web/微信ZIP与delivery-manifest.json记录提交、字节与SHA256，不含私有配置、登录状态或浏览器存档。二维码只作为内测过程证据，过期需重新预览；上传完成不等于已设体验版、已审核或公开上线。
