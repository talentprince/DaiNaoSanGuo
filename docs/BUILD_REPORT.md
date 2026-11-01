# Demo 0.13.0「群怪压境」构建与验收

2026-11-01（Asia/Shanghai）。Creator3.8.8 / Node26.8.2；本地单机内测补给版本，未公开发布。前版归档见[0.12](BUILD_REPORT_0.12.md)。

| 检查 | 最终结果 |
| --- | --- |
| 规则 | 160通过/0失败；新增5项多波/精英秘境值、音乐状态路由、城楼阵位映射、提示音不被截断回归；原城池缩放断言改为横版等比例镜头 |
| 严格类型 | npm run typecheck通过；期间发现数组includes不在Cocos目标库，已改indexOf并重新通过 |
| Web | Creator成功36；72文件/5,790,868字节；14生成JS语法通过 |
| 微信 | Creator成功36；77文件/5,307,212字节；19生成JS语法通过 |
| 分包预检 | 主包3,845,555字节，battle-audio分包1,461,657字节；自有AppID、portrait、入口和分别4,000,000保守预算通过 |
| 音频 | 31 MP3/1,461,604字节逐个解码通过；两声提示的有效区间0–0.19秒及0.42–0.61秒 |
| 实际Web | 多波8怪/精英、横版城池入画/上下守将、布阵映射、副本左上及大厅回主线/未完保留；主线/首领/menu/city/trial/boat/boss选曲日志；error/warn为空 |
| 微信最终运行 | 场景载入，Audio scene main/mainboss与battle-audio ready；游戏错误0/1条HarmonyOS基础库提示；GitLens缺Git提示是工具扩展，不是游戏错误 |
| 开发版本上传 | 0.13.0 Upload Successfully；Upload completed 32347ms；上传前工具确认覆盖既有体验版，已继续；未提审或公开发布 |
| 新开发预览 | 5165KB，32317ms，有效至11/01 21:43；临时开发预览码，过期需重新生成 |
| 手机范围 | 0.12手机进入、黑边/钱包、Boss比例、红警消退和多场景音乐已由用户确认；0.13新波次/精英/横版城池/入口/两声警报与切曲听感仍待用户反馈 |

统计排除.DS_Store、project.private.config.json；本地字节和工具压缩KB不同。主包保守余量154,445字节；音频分包仍有余量，不能无控制扩主包。build/wechatgame-owned与canonical同步，保留本机私有工具配置；交付ZIP不含账号/私有配置。

## 实际证据

- 8怪与大精英 (local QA image omitted)：第2波普通怪与精英实际战斗。
- 最终横版城池与左右入口 (local QA image omitted)、守城布阵 (local QA image omitted)：上下两位与门前6选3；最终推图图标移至左上，不遮城楼。
- 大厅回主线 (local QA image omitted)、副本快捷回主线 (local QA image omitted)、未完副本保留 (local QA image omitted)。实际已返回并再打开副本页，仍可继续，不重复扣次数。
- 各场景切曲日志 (local QA image omitted)，通过实际UI进入主线/首领、菜单、四副本记录；日志确认路由，不能替代听感。
- 微信运行 (local QA image omitted)、上传成功 (local QA image omitted)、临时手机预览码 (local QA image omitted)。

期间首次构建后用户追加“多波与精英”，随后更新为5波/2与10秘境值并重新验证构建；最终入口移位后再次双端构建。截图mainline-mobs/menu/formation/pending来自同一玩法版本，早于最后入口从右侧移到左侧；最终city-gate-final/quick-return/微信包包含入口移位。

## 数值与剩余

[数值报告](BALANCE_0.13.md)：Lv1初始/神将/3星专武约8/63/108关，Lv20约68/138/177；比0.12有所改变，来自更多低血小怪与击杀蓄能，不能宣称难度完全不变。每日经验/资源上限、兑换价格、奖励去重和测试档隔离不改。

精英目前为更大体型、更强血攻防和更高秘境值，无独立主动技能/词缀系统。角色仍程序化漫画，999为数值关卡。低端机天气/密集敌军性能、完整Android/iOS操作/后台/存档、常规档两周经济和真实云端账号/结算/攻守/榜单仍未完成。详见[SPEC检查](SPEC_AUDIT_0.13.md)、[微信内测](WECHAT_TESTING.md)与[后端计划](BACKEND_PLAN.md)。
