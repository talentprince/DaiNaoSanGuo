# 0.11 · 原创红白机风格音频

更新2026-10-31。全部由scripts/compose-audio.py以脉冲波、三角低音、噪声鼓合成，旋律/编排写在脚本内，没有使用商业游戏旋律或第三方采样。不是声称经过硬件音源模拟认证的原版NES音乐。

| 文件 | 用途 | 时长 |
| --- | --- | --- |
| main.mp3 | 主线/普通场景循环，D小调、160BPM、16小节 | 24秒 |
| boss.mp3 | 世界Boss循环，8小节 | 12秒 |
| lightning/fire/blizzard/wind/poison | 雷/火/雪/风/毒大招 | 0.48–0.70秒 |
| heal/guard/slash | 治疗/护阵/斩击 | 0.30–0.80秒 |
| finale/impact | Boss蓄势/终结命中 | 1.80/0.65秒 |
| victory/defeat | 胜利/失败结算 | 1.15/0.85秒 |

14个MP3合计177,532字节。背景32kbps、音效24kbps，单声道22050Hz；原始WAV中间产物不进包。构建脚本将根audio目录复制到各平台build-templates/audio，随后由Creator自定义模板放入构建根目录。[Cocos构建模板说明](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/custom-project-build-template.html)

GameAudio在微信使用createInnerAudioContext，浏览器使用HTML Audio，不引入Cocos额外音频模块。AudioDirector管理一个音乐声道和三个音效声道；同种160ms内去重；大招降低背景音量，Boss终结压低2.8秒。切后台暂停音乐并停音效、返回恢复；销毁释放声道；音频失败不影响战斗结算。

右侧“声音开/关”持久化到dainaosanguo.audio.v1。浏览器初次点击后启动音乐，微信直接尝试播放；系统静音/设备音量仍由用户控制。场景内天气持续4.5秒，音效是短促释放反馈，不与天气持续时间等长。

已验：4项音频策略测试、14文件解码通过、Web音乐资源HTTP200、浏览器开关能切换且无error/warn；微信模拟器加载成功。**用户确认真实手机背景音乐与大招音效都有**。未逐项确认所有音效、来电/后台/不同设备静音行为，混音品质仍可继续迭代。

独立8765构建预览/微信包包含音频；Creator7456编辑器预览没有单独配置根audio映射，音频验收请以构建预览为准。
