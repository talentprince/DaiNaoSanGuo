# 技术边界

- 引擎：Cocos Creator 3.8.8，后续保持版本一致。
- 语言：TypeScript。
- 规则层：负责目标选择、攻击时机、伤害、生命、死亡与胜负，不导入 Cocos API。
- 视图层：负责节点、名字、血条、伤害数字与交互，展示规则层的结果。
- 配置层：保存武将、敌人和关卡参数，避免散布在场景脚本中。
- 时间与随机：规则层通过显式时间步推进；有随机机制时注入可固定种子的随机源。
- 核心测试：目标选择、伤害、死亡后不再行动、胜负以及重开状态清理。

## 后续代码目录规划

```text
assets/
  scenes/
  scripts/
    battle/       # 纯 TypeScript 规则
    config/       # 武将与敌人配置
    ui/           # Cocos 画面与交互
tests/
docs/
```

已使用官方 Empty (2D) 模板并建立空 assets 目录。资源 .meta 由编辑器导入时生成并保留。测试运行器和检查命令在首次打开工程后确定。

## Demo 0.3实际模块

- BattleEngine.ts：纯TypeScript战斗规则、固定步长与事件。
- BattleConfig.ts：单位、波次、关卡与等级缩放。
- ProgressStore.ts：本地奖励、去重、升级和迁移。
- BattleUI.ts：Cocos绘制辅助；BattlePreview.ts：展示与按钮交互。
- tests/battle.test.mjs：Node内置测试，无Cocos依赖。
- SPEC.md：实现与验收状态主文件。

## Demo 0.4装备模块

ProgressStore扩展纯TypeScript的掉落、容量、去重、穿戴唯一性、升级与迁移规则。InventoryPanel.ts单独处理背包UI，BattleConfig将穿戴属性注入新战斗。测试覆盖规则与存档，不依赖Cocos运行时。
