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

- 自有微信AppID、真机验证及发布流程。
- 自动战斗、技能、奖励、构建和微信模拟器已完成，见下方最新状态。

## 本机情况

系统 /usr/bin/git 因 Xcode 许可未接受而不能运行。当前仓库使用 Codex 自带的独立 Git 完成初始化；未代用户接受 Xcode 许可。

本机 codesign 对新下载的 Dashboard 和已有的 Visual Studio Code 都报告签名错误，spctl 报告签名子系统内部错误，因此无法用该检查确认签名有效。未修改系统安全设置、移除隔离属性或重签名；Dashboard 已通过正常应用启动流程打开。文件校验和运行观察不等于代码签名验证通过。

## 最新实现状态

当前Demo 0.6已完成24武将、招募/挂机/兑换、四副本本地原型、秘境行军、可动角色、城墙和三兵种。58项测试、严格类型检查及Web构建通过；微信构建与实际运行范围以根目录SPEC.md和docs/BUILD_REPORT.md为准。早期安装条目保留为历史记录。

微信开发者工具2.02.2609240 Stable ARM64已安装到/Applications/wechatwebdevtools.app，使用游客模式导入build/wechatgame，选择不使用云服务并信任运行自己的本地项目。基础库3.17.5下实际三波通关、技能、奖励和掉落正常；用户手动验收“下一关”，重新打开工程后观察到进度保留。未登录微信开发者账号，未上传。

安装包来自腾讯官方下载域名dldir1.qq.com；SHA256为16f1f876792bf5aa277fdd8dfc42edbc857277865741b18075c2e3a498027e6a，与Homebrew官方cask API记录一致。未绕过系统安全保护。
