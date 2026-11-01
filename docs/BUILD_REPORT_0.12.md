# Demo 0.12.0「一路横推」构建与验收

2026-11-01（Asia/Shanghai）。Creator3.8.8 / Node26.8.2；本地单机内测补给版本，未公开发布。前版记录见[0.11.1报告](BUILD_REPORT_0.11.1.md)。

| 检查 | 最终结果 |
| --- | --- |
| 规则 | 155通过/0失败；主线阶段、百关主题与景物连续性、固定城池、红屏生命周期、Boss比例、8音频策略与2打包测试；既有成长/奖励/档案规则保留 |
| 严格类型 | npm run typecheck通过 |
| Web | Creator成功退出码36；71文件/5,555,609字节；14生成JS语法通过 |
| 微信 | Creator成功退出码36；76文件/5,071,953字节；19生成JS语法通过 |
| 微信分包 | 主包3,838,937字节；battle-audio分包1,233,016字节；入口、AppID、portrait与分别4,000,000预算通过 |
| 音频文件 | 30 MP3/1,232,963字节，全部解码通过；8背景+22音效 |
| Web实际 | 390×844铺满、入口/兑换预览/材料来源→招募；固定城池远/中/近；三魔王比例与朝向；暗红预警和打开菜单立即清除，见截图 |
| 微信最终运行 | 场景成功载入；Audio battle-audio ready；错误0/1条HarmonyOS基础库提示；钱包避开胶囊，导航与主题背景铺满模拟器 |
| 开发版本上传 | 0.12.0，工具显示Upload Successfully及Upload completed 8119ms；未提审或公开发布 |
| 体验更新提示 | 上传前工具明确提示上次上传已被选为体验版，本次将覆盖；已确认继续。用户之前也反馈体验流程“可以了”。未进入后台核验新版本标记或成员清单 |
| 新预览 | 4935KB，Upload completed 5569ms，有效至11/01 10:51；过期重新预览，不把临时码当长期体验码 |
| 真机边界 | 0.11.0启动/音乐技能声音、0.11.1补给由用户确认；2026-11-01用户确认0.12已进入，黑边/钱包遮挡、Boss与我方大小、开菜单后红警消退、多场景音乐均正常；设备/系统未提供，不外推Android/iOS全覆盖 |

统计排除.DS_Store、project.private.config.json；本地字节、微信工具KB与平台压缩统计不同。主包尚余161,063字节保守预算；后续扩内容仍应控制包体。build/wechatgame-owned是同一构建的独立导入副本，保留本机私有工具状态，交付ZIP不含该状态。

## 本轮实看与证据

- 最终世界Boss与我方比例 (local QA image omitted)、张角 (local QA image omitted)、孟获 (local QA image omitted)。后二图记录本轮同一比例/模型，早于最终入口隐藏和顶部微调。
- 城池远景 (local QA image omitted)、中景 (local QA image omitted)、近景 (local QA image omitted)：锚点固定、透视放大，非军队共同平移；截图早于最终主线专武快捷在副本隐藏的微调。
- 暗红低透明预警 (local QA image omitted)、预警时打开菜单后无红屏 (local QA image omitted)。通过开发档从主线开始实际走到预警，再开面板验证；最终顶部底板加高不影响该结果。
- 最终主线布局 (local QA image omitted)、最终专武兑换/余额/造型 (local QA image omitted)、武将材料入口 (local QA image omitted)。兑换/升星仍由Store校验，本轮未更改价格或补给数值。
- 最终微信场景与音频ready (local QA image omitted)、上传成功 (local QA image omitted)、新手机预览码（临时） (local QA image omitted)。

## 已修复与剩余

[逐项SPEC检查](SPEC_AUDIT_0.12.md)列出问题、修复和证据；规则、类型、构建、浏览器、微信模拟器与真机是独立验收，不能互相替代。

保留内测补给隔离、旧档与旧余额；旧“将魂”仅改显示“脑力”，不清资源。连续地景是原创程序化漫画原型，999关仍是数值关卡，人物仍为分部件动画；尚无真实PvP/全服榜单、账号云档或可信服务器结算。常规档7/14天经济、Android/iOS完整操作、安全区/低端机性能/后台恢复、独立人物动作和专武机制仍待完成。

上传时工具确认会覆盖既有体验版本；如朋友看不到更新，管理员在版本管理检查0.12.0体验标记。公众平台账号页此前被浏览器安全检查拒绝，未通过其他途径绕过；工具未代核验a designated tester成员记录。详见[内测步骤](WECHAT_TESTING.md)与[后端计划](BACKEND_PLAN.md)。
