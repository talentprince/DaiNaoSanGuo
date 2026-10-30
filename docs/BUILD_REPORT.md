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
- 未安装/启动微信开发者工具，未真机验证、上传或发布。

## 构建兼容修复

第一次Web发布运行发现Map.entries迭代器展开被loose转译误处理，敌方视图未创建。已改用Map.forEach，重新构建两平台，产物均包含修复；Web通过三波战斗与背包实际验收。

## 本地数据与测试范围

预览服务与独立发布包服务的origin不同，本地存档相互独立。测试过程中产生的铜钱、等级和装备仅为各自浏览器本地Demo存档，不会打包进发布包。多个标签页同时写同一存档尚未实现同步，建议一个预览页游玩。

## 复现说明

先打开项目完成首次导入，然后保存并关闭同一工程的编辑器。执行npm命令构建。其他Creator安装路径用COCOS_CREATOR_PATH指定。正式微信运行需按平台要求配置自有AppID并使用微信开发者工具和真机验证。

## 官方依据

- https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html
- https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html
