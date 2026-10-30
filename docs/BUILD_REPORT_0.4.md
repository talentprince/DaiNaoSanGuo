# Demo 0.4 构建验证记录

日期：2026-10-30（Asia/Shanghai）

## 工具与命令

- Creator 3.8.8，Node 26.8.2。
- `npm test`：30项规则测试通过。
- `npm run typecheck`：严格类型检查通过（skipLibCheck跳过Cocos自带声明）。
- `npm run build:web`：成功，Creator退出码36，脚本归一化为0。
- `npm run build:wechat`：成功，Creator退出码36，脚本归一化为0。
- 构建脚本在scripts/build.mjs；参数在build-configs/；输出和日志不提交Git。

## Web Mobile

- 输出：build/web-mobile；26个文件，总计3,478,783字节。
- 通过独立HTTP服务运行已构建产物，不依赖编辑器预览服务器。
- 实际观察到敌人、三波切换、自动技能、胜利、铜钱与装备掉落、背包界面。
- 修复后的干净验证页无error/warn日志。

## 微信小游戏离线包

- 输出：build/wechatgame；30个文件，总计2,995,007字节，无分包。
- game.js、game.json、project.config.json均存在。
- compileType为game；deviceOrientation为portrait。
- 使用Cocos官方提供的测试AppID wx6ac3f5090a6b99c5；不是用户正式小游戏账号。
- 所有生成JavaScript执行node --check通过，只代表语法检查，不代表微信环境运行通过。
- 已安装并启动微信开发者工具2.02.2609240 Stable ARM64，以游客模式导入本地包，使用基础库3.17.5。
- iPhone 12/13 (Pro)模拟器实测首关三波胜利：19.1秒、青龙斩1次、铜钱+100、精良百炼刀。
- 用户明确确认在微信开发者工具右侧手机模拟器手动点击“下一关”，成功进入第2关。
- 重新打开工程后观察到第3关、铜钱220、已过2关、背包2/40；第3关随后26.5秒胜利、青龙斩2次，铜钱360、已过3关、背包3/40。
- 微信内背包穿戴等全部交互尚未逐项验收；原生窗口自动化点击未观察到wx触摸回调，不将其等同于游戏按钮失效。浏览器内背包交互已验收。
- 首次启动cacheList.json不存在的警告未阻断运行，重载后未再观察到；另有GitLens找不到Git的编辑器通知，不属于游戏错误。
- 截图：docs/screenshots/wechat-0.4.jpg。控制台临时输入诊断仅作用于会话，重载后已清除，未写入发布包。
- 未使用自有正式AppID，未真机验证、上传或发布。

## 构建兼容修复

第一次Web发布运行发现Map.entries迭代器展开被loose转译误处理，敌方视图未创建。已改用Map.forEach，重新构建两平台，产物均包含修复；Web通过三波战斗与背包实际验收。

## 本地数据与测试范围

预览服务与独立发布包服务的origin不同，本地存档相互独立。测试过程中产生的铜钱、等级和装备仅为各自浏览器本地Demo存档，不会打包进发布包。多个标签页同时写同一存档尚未实现同步，建议一个预览页游玩。

## 复现说明

先打开项目完成首次导入，然后保存并关闭同一工程的编辑器。执行npm命令构建。其他Creator安装路径用COCOS_CREATOR_PATH指定。本机可用游客模式导入build/wechatgame复现模拟器运行。正式微信运行需按平台要求配置自有AppID并完成真机验证。导入工具生成的project.private.config.json等本机私有状态不纳入源码或分发包。

## 官方依据

- https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html
- https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html
