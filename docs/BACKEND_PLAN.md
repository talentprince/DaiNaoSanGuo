# 本地优先与后端接入计划

更新：2026-10-31。用户已确认：客户端和后端同步开发，当前先用本地版，后续再启用云端版。没有部署云服务、创建付费资源或申请云权限。

## 已实现的边界

| 内容 | 当前状态 |
| --- | --- |
| 运行模式 | RuntimeConfig默认serviceMode=local，模式由构建代码决定，不读取URL/玩家存档 |
| 本地会话 | LocalSession统一初始化、常规档、开发档、配置与重置入口，已有玩法继续调用本地ProgressStore |
| 测试隔离 | localhost及微信devtools允许测试档；真实手机/远程默认常规档；手动写test标记也不让远程进入测试档 |
| 云端关闭 | 选择cloud会在读写本地存档前拒绝启动，显示云端尚未接入；不会悄悄降回本地发奖 |
| 后端原型 | Node内置HTTP，只监听127.0.0.1:8787；GET /health、GET /v1/bootstrap |
| 配置协议 | apiVersion、独立configVersion、serverTime、三Boss列表/当前周次/下次轮换；BackendContract声明结构 |
| 能力声明 | authentication/cloudSave/economy/ranking全部false；接口拒绝写入，限定开发站点CORS来源 |
| 接入情况 | **游戏尚未请求或应用服务器配置**。接口供并行开发验证，关卡、时钟和结算仍在本地 |

启动：在工程运行 `npm run backend:dev`，访问 http://127.0.0.1:8787/v1/bootstrap。DAINAO_BACKEND_PORT可指定1024–65535端口。它不是可供朋友联机的公网服务器，也不是身份或安全系统；CORS不替代鉴权。

0.11.1当前localProfile=experience，为手机/远程独立内测补给档，首次赠脑铢1000万、呆币/脑勋各100万、将魂10万、经验1亿；experience信封只发一次，原常规进度单向复制且不覆盖。以后公开发布前切回standard，云端禁止导入该体验资产。

已有键保持兼容：常规dainaosanguo.demo.progress.v1，开发dainaosanguo.developer.progress.v1，偏好dainaosanguo.local.mode.v1。体验档键dainaosanguo.experience.progress.v1；没有把测试档/本地存档上传；云端账号、存档命名空间和迁移还没实现。

## 下一步实施顺序

| 阶段 | 需要开发 | 启用条件 |
| --- | --- | --- |
| B1（下一优先） | 微信临时code服务端交换身份、会话校验、账号档案、云存档版本/覆盖冲突 | 服务端保管密钥；不同微信身份隔离；清缓存/换设备恢复；不导入开发档 |
| B2 | 版本化配置下载、校验、缓存、回滚；战斗开始签发battleId/seed/configVersion/入场阵容快照 | 客户端与服务器固定同一局版本，轮换与日额度使用服务器时间；远程只下发数据JSON，不执行远程代码 |
| B3 | 抽卡/保底/兑换/升星/挂机/奖励迁入服务器事务；请求幂等键、余额与流水 | 连点、重试、超时和重放不重复扣费/发奖；失败不以客户端余额补账 |
| B4 | Boss输入时间线重演/成绩验证、排行榜、异步攻城守军快照 | 不信任客户端上报伤害/资源；服务端重演与预算验证通过 |
| B5 | 云端开关、测试服白名单、服务监控、版本回滚、手机网络恢复 | 独立测试/正式环境，先小范围体验；服务不可用时显示重试，不离线发可信奖励 |

开启云端前需实现新的异步服务提供层并逐项迁移ProgressStore业务；**不是把local改成cloud就已具备后端**。现在的开关是防误启用保护，不是完整云客户端。美术、战斗表现、音频和布阵可继续并行，不依赖B1。

本地版可长期独立保留；将来云端新建账号从可信初始档开始。本地旧档若要迁移，另设计可核验迁移规则；满级测试资产一律不导入。

## 部署选择（2026-10-31核对）

推荐先评估微信云开发/CloudBase，身份接入自然，仍须在实际账号核对环境资格与额度。其控制台兑换型开发免费环境有3000资源点/月、每次续期6个月等限制；公开发布后相关免费环境会在上线后15天到期，不能当永久免费生产服务器。微信入口体验环境与控制台免费环境政策不同。[腾讯云免费环境规则](https://cloud.tencent.com/document/product/876/127357)

Cloudflare Workers Free为10万请求/日、每次10msCPU；D1免费额度为500万行读/日、10万行写/日、5GB存储。可评估轻配置/CRUD，战斗重演CPU及国内微信网络/域名适配要实测。[Workers定价](https://developers.cloudflare.com/workers/platform/pricing/) · [D1定价](https://developers.cloudflare.com/d1/platform/pricing/)

Supabase Free目前500MB数据库、最多2个活跃免费项目，低活跃项目7天后可能暂停；微信登录需要自行集成。适合验证，不能承诺生产可用性。[定价](https://supabase.com/pricing) · [免费项目暂停](https://supabase.com/docs/guides/platform/free-project-pausing)

当前单机体验版不需要先购买服务器。未来部署的主体、账号区域、域名、免费资格和预算尚未确定，未执行部署。
