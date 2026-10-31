# Demo 0.10「群英入画」构建与验收

日期：2026-10-31（Asia/Shanghai）。Creator3.8.8 / Node26.8.2。

| 检查 | 结果 |
| --- | --- |
| npm test | 115通过、0失败（新增15项，原100回归） |
| npm run typecheck | 严格类型检查通过 |
| npm run balance | 当前引擎自动战斗边界与30天成长投影，BALANCE_0.10.md |
| Web Mobile | 构建成功；41文件、4,264,264字节；14个生成JS语法通过 |
| 微信 | 构建成功；45文件、3,780,488字节；18个生成JS语法通过 |
| 微信配置 | portrait、game.js入口、官方测试AppID wx6ac3f5090a6b99c5通过；交付包不含私有配置 |

## 实际验收

- 武将卡牌：44/44全部6星；关羽详情Lv300、当前专武、桃园3/3与五虎2/2；卡牌/头像和战斗共享头部，修复头像上缘、专武扇型光效与文字遮挡。
- 招募：关羽/吕布/小乔组图；手动十连显示5×2人物卡，点击可查看详情；概率与80抽保底明示。测试招募只消耗开发档资源。
- 名将坊：卡牌分页；切常规旧档查看未拥有小乔，显示Lv1/1星属性、全场减速4秒、羁绊与2100脑勋确认按钮。点击卡片仅预览。
- 存档：开发脑铢/呆币/脑勋100万；切回常规后脑勋315/呆币1140、旧武将星级保留；恢复开发满级档。没有用开发资源覆盖正常账本。开发参数保存/重置与失败降级由规则测试覆盖。
- 持续技能：讨董测试手动小乔与大乔，约3秒时仍有全场雪花/风线与5人治疗环；暂停保持，恢复至约5秒后消退。冰缓、火毒伤害/盾/抑疗由引擎测试验证。
- 场景：实际载入4张漫画资源；Boss巨大在上方、我方面朝上；城门接近/破城、月下三将、草船3筹谋后船舱战斗均实际打开。city截图为已破城状态；完整城门站位沿用0.9验证。
- 微信开发者工具2.02.2609240：自动编译载入0.10，显示测试档、999关、4羁绊、新头像与漫画背景、紧凑导航；实际观察自动通关。Devtools错误0/警告0。GitLens找不到系统Git是工具通知，不是游戏错误。
- 浏览器游戏error/warn日志为空。

## 截图

截图为实际本地运行；资源与全满级状态属于独立开发档，exchange-preview-normal属于正常旧档。

- 独立测试台 (local QA image omitted)

- 群英卡牌 (local QA image omitted)

- 关羽属性与羁绊 (local QA image omitted)

- 神将招募组图 (local QA image omitted)

- 十连结果 (local QA image omitted)

- 名将坊 (local QA image omitted)

- 正常档小乔兑换预览 (local QA image omitted)

- Boss冰雪与治疗持续效果 (local QA image omitted)

- 城门环境与破城 (local QA image omitted)

- 月下三将 (local QA image omitted)

- 江上草船 (local QA image omitted)

- 微信模拟器载入 (local QA image omitted)

## 验收边界

微信新卡牌/拖拽/全部技能的触摸和Android/iOS真机仍需逐项验收；浏览器通过不代替真机。真实PvP、全服榜单、服务端账本、自有AppID、上传发布尚未完成。999数值关卡未逐关人工测试；新羁绊/火冰毒与7/14天成长需要实际玩家校准。当前角色是原创程序化漫画模型，未交付最终骨骼/音效。

## 复现与交付

保存并关闭同工程Creator再运行npm test、npm run typecheck、npm run balance、npm run build:web、npm run build:wechat。成功码36由构建脚本归一为0。构建后已恢复Creator编辑器。

交付含源码/Web/微信ZIP及delivery-manifest.json，列提交、字节、SHA256与验证范围；不打包账号、浏览器存档、临时QA种子、私有配置或本机环境。
