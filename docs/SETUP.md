# 安装与验证记录

日期：2026-10-30（Asia/Shanghai）

## 已完成

- Cocos Dashboard 2.2.2：安装到 /Applications/CocosDashboard.app。
- Cocos Creator 3.8.8：安装到 /Applications/Cocos/Creator/3.8.8/CocosCreator.app。
- 安装包来自 https://www.cocos.com/creator-download 提供的官方链接，通过该页的签名下载接口取得。
- Dashboard ZIP 的 MD5 为 14d94c70c65cd20bfd5d47a35ec616e0，与官网提供值一致。
- 已读取两款应用的 Info.plist，版本分别为 2.2.2 和 3.8.8。
- Dashboard 通过 macOS 正常启动，实际观察到登录界面。
- 工程来自已安装 Creator 的 Resources/templates/empty-2d，项目名与 UUID 参照 Dashboard 生成规则设置。
- 工程原有 Git 仓库保留在 main 分支。
- 用户已完成账号登录；Dashboard 已关联本地 Creator 3.8.8，并导入 DaiNaoSanGuo。
- 用户已明确确认软件许可与服务协议；检查时编辑器已打开，未重复接受协议。
- Battle.scene 已通过编辑器创建并保存，BattlePreview 组件已挂到 Canvas。
- 设计分辨率通过编辑器设为 720 × 1280，配置已保存。
- 实际浏览器预览显示标题与五名占位武将，当前浏览器 error/warn 日志为空。
- TypeScript --noEmit --skipLibCheck 通过；原始模板下不跳过库检查会报告 Cocos 自带声明错误，未修改引擎文件。

## 待完成

- 自动战斗、技能及奖励。
- 构建、微信开发者工具与真机验证。

## 本机情况

系统 /usr/bin/git 因 Xcode 许可未接受而不能运行。当前仓库使用 Codex 自带的独立 Git 完成初始化；未代用户接受 Xcode 许可。

本机 codesign 对新下载的 Dashboard 和已有的 Visual Studio Code 都报告签名错误，spctl 报告签名子系统内部错误，因此无法用该检查确认签名有效。未修改系统安全设置、移除隔离属性或重签名；Dashboard 已通过正常应用启动流程打开。文件校验和运行观察不等于代码签名验证通过。
