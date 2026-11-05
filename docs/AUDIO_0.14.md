# 0.14 · Cocos/微信一致的音频路径与通道

2026-11-01。沿用9曲/22音效（31 MP3），无新增商业采样。源预览缺少audio同源文件是本轮确认的无声原因之一；构建模板只在打包时复制，不能自动服务Cocos源码。

`npm run preview:prepare`复用prepareAudioTemplate，把canonical audio复制到官方preview-template/audio，HTTP从404变200；build:两端也自动同步。index.ejs是Cocos菜单生成的官方模板；生成MP3副本忽略、不重复塞入assets主包。

1BGM+2技能+1独立命中+1独立警报，共5音频上下文。玩家命中音量0.42、180ms限频，敌方普通攻击不抢玩家命中槽；技能不再无限压制命中。Boss两声整体0.95秒，独立警报声道并保留保护，不被普通打击/技能截断。菜单清残音；展开折叠战斗控件保持当前战场音乐/音效，全屏大厅/行装/布阵才切菜单曲。

GameAudio记录每条文件首次真实playing，Boss正常ended记录cue completed；失败实际警告并显示重试，不把ready当播放成功。Cocos实测已出现boss-arrive、命中pierce/slash/magic及技能playing和Boss完整结束日志；用户手机听感仍待新包确认。

静音/后台/销毁/场景续播保留；微信loadSubpackage成功后设置路径。此次未增加音量滑杆、低效模式或独立设备适配承诺。
