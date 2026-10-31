# 0.10 原创背景资产记录

生成方式：imagegen技能，内置image_gen工具直接生成（非CLI/API、未使用外部游戏素材）。2026-10-31。原始PNG保持在工具生成目录；工程只做sips缩放与JPEG编码，不重新绘制。角色和UI仍由项目代码绘制。

部署路径：~/Workspace/DaiNaoSanGuo/assets/resources/battle-art/。最终4张均为600×900 JPEG，质量55，供包体控制；不是最终高分辨率美术定稿。

## 共用提示词

```text
Use case: illustration-story. Asset type: portrait background texture for an original Three Kingdoms comic mobile auto-battler. Exaggerated hand-inked Chinese action-comic environment, bold dark contour lines, cel shading, dramatic warm/cool lighting, saturated but controlled colors, humorous heroic adventure rather than cute flat geometric shapes. Vertical 2:3 composition. Environment only: absolutely no people, creatures, UI, text, letters, numbers, logos, frames or watermarks. Keep the center 60% uncluttered with a clearly readable combat floor; detail at top and edges. The image fills a portrait battlefield beneath game characters and effects.
```

## city

原始文件：<local generated image>

原始SHA256：598acf1a2cbac1628f27d767df52845f212c83f4ae4534ebb6a201c1f172b97a

工程文件：assets/resources/battle-art/city.jpg · 164,993字节 · SHA256 3ccd8c33a49eb94942315bdbc9d2eb0d3a14caa228ee422994fcf6f0c5d2b920

场景提示词（接在共用提示词之后）：

```text
A fortified Three Kingdoms city pass at orange sunset. Wide dusty stone approach road across center, broken siege wheels and comic dust at edges, distant battlements and red flags on the far-right horizon. Main real gate is added by game code at far right, so do not draw a large foreground gate or wall blocking the middle. Dynamic oblique horizontal battle setting.
```

## boss

原始文件：<local generated image>

原始SHA256：ae87140f63adf8c549e724e5b336ddf08681b12e2fae04a77db9c3bb15f5b8bb

工程文件：assets/resources/battle-art/boss.jpg · 166,482字节 · SHA256 c9c2bd23040312a3808d540634865408b00c0d5c9a4b529f769a2699e7ee51df

场景提示词（接在共用提示词之后）：

```text
A grand ruined imperial palace courtyard for a world boss encounter, deep violet storm sky, crooked towering palace roofs and bronze braziers at upper edges, broken throne dais at upper center, red torn banners, purple lightning in distant sky. Large empty paved arena stretching from the upper dais toward the viewer below; symmetrical top-versus-bottom facing composition.
```

## trial

原始文件：<local generated image>

原始SHA256：9688b0cb81003dbfd97495e3defe36722ec72ce0d9d298fc24f0e3b82464348b

工程文件：assets/resources/battle-art/trial.jpg · 156,660字节 · SHA256 8171c51973529834acf071907959ef6a34a05ee648d12af12c15598f9540d63c

场景提示词（接在共用提示词之后）：

```text
A dramatic moonlit mountain pass arena for three heroes against five opponents: jagged peaks, bamboo silhouettes, oversized crescent moon, hanging red lanterns at edges, Chinese ink clouds. Broad empty stone fighting platform across middle and lower area. Cyan and midnight blue with warm amber accents, comic challenge-stage atmosphere.
```

## boat

原始文件：<local generated image>

原始SHA256：80ee3888bfb2c1792d423fbf1f93f1588fb13c14e016401d62882560ca95b201

工程文件：assets/resources/battle-art/boat.jpg · 163,773字节 · SHA256 455fb862ccde0d3286e2877dc7d121ba2acb5f162ca1c70b5fcb3b996e09b706

场景提示词（接在共用提示词之后）：

```text
A straw-boat treasure expedition on the Yangtze river: broad empty wooden ship deck in the center/lower area for combat, railings only at edges, tied straw bundles and arrows at corners, distant enemy junk silhouettes and mist, exaggerated billowing sails at top edges, teal waves and golden dawn. No characters. Adventurous dynamic comic environment.
```
