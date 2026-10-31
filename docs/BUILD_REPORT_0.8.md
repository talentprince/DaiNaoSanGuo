# Demo 0.8 构建与运行记录

日期：2026-10-31（Asia/Shanghai）。Creator 3.8.8 / Node 26.8.2。

- 78项规则测试通过，严格类型检查通过；skipLibCheck仅跳过引擎自带声明。
- Web Mobile与微信构建均完成，日志分别于本日08:07:29、08:09:07记录Finished；Creator成功码36由脚本归一为0。
- Web最终26文件、3,560,413字节，13个JS语法检查通过。
- 微信最终30文件、3,076,637字节，17个JS语法检查通过；不含project.private.config.json。
- 微信入口、portrait和官方测试AppID wx6ac3f5090a6b99c5检查通过。

## 实际运行证据

0.7浏览器：头像拖动到空位/交换、三兵种混编、保存重开保留、技能只显示非小兵；攻城冲锋后露出城墙；世界Boss巨大模型、我方背身朝上；手动释放仅该将能量归零，自动开启后其余释放。

0.8浏览器：40武将列表、放大人物和武器辨识、右端朝左城门、城上2人及门前守军。独立QA origin使用华佗/司马懿/关羽/刘备/糜竺阵容，关闭自动、蓄满后分别手动释放两位神级治疗：关羽1384→2248生命，护盾/攻击箭头显示，其他将的能量保留。正常用户存档未加测试资源。两个最终页面error/warn均为空。

0.8微信开发者工具2.02.2609240游客模拟器自动载入，显示Demo0.8、第9关秘境100%和48.3秒撤退，错误0/警告0。GitLens无法找到系统Git属于工具通知，不是游戏运行错误。

微信内拖动和全部副本触摸尚未逐项验收；浏览器结果不等同真机。真实PvP/排名、服务端账本、自有AppID、真机和上传发布未完成。

## 复现与交付

保存并关闭同一项目Creator后执行npm test、npm run typecheck、npm run build:web、npm run build:wechat。配置在build-configs、脚本scripts/build.mjs、日志temp/build-平台.log。

输出build/web-mobile、build/wechatgame。交付包含Git源码快照与Web/微信ZIP，delivery-manifest.json记录提交、字节和SHA256。包内不含账号、浏览器存档、测试种子页面、project.private.config.json或本机私有状态。

当前规则见SPEC.md，武将明细见ROSTER_0.8.md；历史0.4报告另存BUILD_REPORT_0.4.md。未开通任何付费云服务。
