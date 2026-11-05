# 固定调试入口与版本核对

1. 实际工程为~/Workspace/DaiNaoSanGuo，Creator3.8.8；先npm run preview:prepare，打开工程，源码预览用http://localhost:7456/。页面按9:16适配实际内容区，工具栏换行不拉宽场景。
2. 底部、浏览器标题和[Build]同时显示版本/修订/环境。当前源码 0.15.1 r15d，微信开发版本 0.15.1 r15d，Web 打包版 0.15.0 r15c。127.0.0.1:8765是build/web-mobile打包版，不会因只改源码自动更新；三个环境必须看标签，不能凭页面相似判断。
3. 如果源码文件已改但标签未更新，保存并重开Cocos等待编译，再刷新源码页；单纯刷新浏览器曾无法清除旧Cocos脚本缓存。不要为此清空玩家存档。
4. 左侧常驻“自动施法”控制当前引擎并持久保存；默认开启，明确手动关闭会保留。底部本场技能次数、[Skill] cast与能量下降可验证真正释放。进场/预警/暂停/结束分别标记，不靠满能外圈猜测。
5. 修复通过后再双端构建，核对build-info.json的version/revision/sourceHash，npm run check:wechat会拒绝旧包。微信工具导入build/wechatgame-owned，由canonical构建同步且保留本机private配置。
6. Web/Cocos/微信真机来源不同，存档不自动互通；本机/微信devtools是独立全将测试档，手机是一次内测补给档。只保留一个同origin游戏页，避免多标签互相覆盖。
7. 音频分包ready只证明已加载；playing证明实际开始，boss cue completed证明完整结束；这些不能替代用户手机扬声器听感。

完整验收、上传事实及剩余范围见BUILD_REPORT、WECHAT_TESTING与SPEC Review。未公开发布。

测试场景首次默认关闭背景音乐。用声音设置检查“背景音乐 关”和“游戏声音 开”，再分别触发普攻、技能和 Boss 警报。全面屏回归同时查看顶部胶囊、钱包、左右按钮与底部手势区域。
