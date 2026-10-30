# Demo 0.6 构建与运行记录

日期：2026-10-30（Asia/Shanghai）。

- Creator 3.8.8，Node 26.8.2。
- npm test：58项通过；严格类型检查通过，skipLibCheck只跳过引擎声明。
- Web Mobile与微信构建均成功（Creator退出码36，脚本归一化0）。
- Web最终输出26文件、3,528,506字节；微信30文件、3,044,730字节（不含开发者工具私有配置）。
- 微信入口、portrait、官方测试AppID和所有生成JavaScript语法检查通过。

## 实际运行范围

Web：24武将/阵容与0.5招募、副本结算；0.6主线向右行军、秘境召Boss与自动下一关、巨大世界Boss上下站位、城墙/两将/破城、3v5向中间接敌、刀枪弓补位。最终日志无error/warn。

微信开发者工具2.02.2609240游客模式：自动载入0.6，主线第5关秘境满100、首领现身、49.9秒失败，当前错误0/警告0。微信内其余副本和全部交互尚未逐项验收；不将浏览器结果等同于真机验收。仍有GitLens找不到系统Git的工具通知，不是游戏错误。

真实玩家攻守、全服排名、服务端资源校验、自有AppID、真机、上传和发布未完成。未开通付费云服务。

## 构建方法

保存并关闭同一项目Creator后执行npm run build:web、npm run build:wechat。配置在build-configs，脚本scripts/build.mjs，日志temp/build-平台.log。通过COCOS_CREATOR_PATH指定其他安装位置。

输出包不含project.private.config.json、账号、浏览器存档或本机私有状态。Web与预览服务origin不同，存档不互通，建议同一origin只开一个游戏页。

0.4历史构建记录另存BUILD_REPORT_0.4.md；现行完整规则与限制以根目录SPEC.md为准。
