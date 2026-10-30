import { _decorator, Color, Component, Graphics, Label, Mask, Node, ResolutionPolicy, sys, UITransform, view } from 'cc';
import { BattleEngine } from './battle/BattleEngine';
import type { BattleEvent, Unit } from './battle/BattleEngine';
import { ProgressStore, RARITY_NAMES } from './battle/ProgressStore';
import { InventoryPanel } from './battle/InventoryPanel';
import { MetaPanel } from './battle/MetaPanel';
import { UnitActor } from './battle/UnitActor';
import { CombatEffects } from './battle/CombatEffects';
import { BattleStage } from './battle/BattleStage';
import type { StageStyle } from './battle/BattleStage';
import { bar, button, makeNode, panel, text } from './battle/BattleUI';
import type { UIButton } from './battle/BattleUI';
import { createMainlineOptions, STAGE_NAMES } from './data/BattleConfig';
import { getHero, TACTIC_NAMES } from './data/HeroCatalog';
import { ACTIVITY_NAMES, createActivityOptions, trialTrait } from './data/ActivityConfig';
import type { ActivityRun } from './data/ActivityConfig';
const { ccclass } = _decorator;

/** Scene orchestration only: rules, actors, scenery and effects are separate modules. */
@ccclass('BattlePreview')
export class BattlePreview extends Component {
    private root!: Node;
    private field!: Node;
    private units!: Node;
    private effectsRoot!: Node;
    private engine!: BattleEngine;
    private store!: ProgressStore;
    private actors = new Map<string, UnitActor>();
    private scenery: BattleStage | null = null;
    private fx!: CombatEffects;
    private stage = 1;
    private speed = 1;
    private autoSkill = true;
    private battleId = '';
    private sequence = 0;
    private resultShown = false;
    private modal: Node | null = null;
    private title!: Label;
    private wallet!: Label;
    private overview!: Label;
    private overviewBar!: Graphics;
    private wave!: Label;
    private teamLabel!: Label;
    private enemyLabel!: Label;
    private statusLine!: Label;
    private energyBar!: Graphics;
    private skill!: UIButton;
    private pause!: UIButton;
    private speedButton!: UIButton;
    private autoButton!: UIButton;
    private trainButton!: UIButton;
    private inventoryButton!: UIButton;
    private activeLevel = 1;
    private inventory: InventoryPanel | null = null;
    private hall: MetaPanel | null = null;
    private activeRun: ActivityRun | null = null;
    private autoNext = 0;
    private nextLabel: Label | null = null;

    start(): void {
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
        this.store = new ProgressStore(sys.localStorage);
        this.stage = Math.min(99, this.store.progress.highestCleared + 1);
        this.root = makeNode('BattleDemo', this.node);
        this.root.addComponent(UITransform).setContentSize(720, 1280);
        panel(this.root, 'Background', 0, 0, 720, 1280, '#111E30', 0);
        panel(this.root, 'Accent', 0, 632, 720, 16, '#DCB977', 0);
        text(this.root, 'Title', '呆脑三国', -130, 558, 48, '#F2E1BC', 390);
        text(this.root, 'Version', 'DEMO 0.6 · 跑动开打', 195, 562, 20, '#C0A773', 270);
        this.title = text(this.root, 'Stage', '', 0, 492, 30);
        this.wallet = text(this.root, 'Wallet', '', -120, 447, 20, '#B9C5D4', 400);
        this.trainButton = button(this.root, 'TrainButton', '升级全队', 216, 447, 220, 46, '#5E5540', () => {
            const result = this.store.upgradeTeam();
            this.statusLine.string = result.upgraded ? `全队升至Lv.${result.level}，下局生效${result.saved ? '' : '（未保存）'}`
                : result.level >= 99 ? '全队已达最高等级' : `升级需要${result.cost}铜钱`;
            this.refresh();
        });
        this.overview = text(this.root, 'EncounterOverview', '', 0, 405, 18, '#DCC893', 630);
        this.overviewBar = makeNode('EncounterProgress', this.root, 0, 383).addComponent(Graphics);
        this.field = panel(this.root, 'Battlefield', 0, 55, 660, 630, '#1D2D42', 24);
        this.field.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        this.teamLabel = text(this.field, 'TeamLabel', '呆 萌 战 队', -176, 285, 18, '#A8CBB2', 270);
        this.enemyLabel = text(this.field, 'EnemyLabel', '敌 方 阵 地', 176, 285, 18, '#D5B77E', 270);
        this.wave = text(this.field, 'Wave', '', 0, -292, 18, '#C5D0D1', 620);
        this.units = makeNode('Units', this.field);
        this.effectsRoot = makeNode('CombatEffects', this.field);
        this.fx = new CombatEffects(this.effectsRoot);
        this.statusLine = text(this.root, 'BattleLog', '', 0, -294, 21, '#CDD6DE');
        this.skill = button(this.root, 'SkillButton', '怒气技能', -83, -374, 464, 76, '#426C59', () => {
            if (this.engine.status !== 'fighting') { this.statusLine.string = '本局已结束'; return; }
            if (this.engine.castSkill()) this.processEvents();
            else this.statusLine.string = this.engine.paused ? '战斗暂停中' : this.engine.approachRemaining > 0 ? '正在接敌，接战后可释放技能' : '怒气满100%后可释放存活武将技能';
            this.refresh();
        });
        this.autoButton = button(this.root, 'AutoSkillButton', '自动技能', 246, -374, 156, 76, '#3D4E64', () => {
            this.autoSkill = !this.autoSkill; this.engine.autoSkill = this.autoSkill; this.refresh();
        });
        this.energyBar = makeNode('SkillEnergy', this.root, 0, -432).addComponent(Graphics);
        button(this.root, 'RestartButton', '重新开始', -220, -502, 200, 64, '#3A4D66', () => this.restart());
        this.pause = button(this.root, 'PauseButton', '暂停', 0, -502, 200, 64, '#3A4D66', () => {
            this.engine.paused = !this.engine.paused;
            this.statusLine.string = this.engine.paused ? '已暂停 · 行军与战斗停止' : '继续行军作战'; this.refresh();
        });
        this.speedButton = button(this.root, 'SpeedButton', '速度×1', 220, -502, 200, 64, '#3A4D66', () => {
            if (this.activeRun?.mode === 'boss') { this.statusLine.string = '世界Boss固定30秒计分，不支持倍速'; return; }
            this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1; this.refresh();
        });
        this.inventoryButton = button(this.root, 'InventoryButton', '装备背包', -222, -565, 200, 48, '#544B64', () => this.openInventory());
        button(this.root, 'HallButton', '武将 · 招募 · 副本', 112, -565, 400, 48, '#655D45', () => this.openHall());
        text(this.root, 'Help', '空位补刀枪弓 · 秘境进度与技能怒气分别累计', 0, -610, 17, '#8094AA');
        this.begin(this.stage);
    }

    update(dt: number): void {
        if (!this.engine) return;
        const frame = Math.min(0.25, Math.max(0, dt));
        const pace = this.activeRun?.mode === 'boss' ? 1 : this.speed;
        this.engine.advance(frame * pace);
        this.processEvents();
        if (!this.engine.paused) {
            const march = !this.activeRun && ((!this.engine.bossActive && this.engine.status === 'fighting') || this.autoNext > 0);
            this.scenery?.update(frame * pace, march);
            this.actors.forEach(actor => actor.update(frame * pace, march && actor.unit.team === 'hero' && actor.unit.hp > 0));
            this.fx.update(frame * Math.min(pace, 2));
            if (this.autoNext > 0 && !this.hall && !this.inventory) {
                this.autoNext -= frame;
                if (this.nextLabel) this.nextLabel.string = `继续向右 · ${Math.max(1, Math.ceil(this.autoNext))}秒后进入下一关`;
                if (this.autoNext <= 0) { this.begin(Math.min(99, this.stage + 1)); return; }
            }
        }
        this.refresh();
    }

    private begin(stage: number, run: ActivityRun | null = null): void {
        this.activeRun = run; this.stage = stage; this.sequence += 1;
        this.battleId = `${Date.now()}-${this.sequence}`;
        const p = this.store.progress;
        this.activeLevel = run ? run.level : p.heroLevel;
        this.engine = new BattleEngine(run ? createActivityOptions(run)
            : createMainlineOptions(stage, 20261030, this.activeLevel, this.store.getEquipmentBonuses(), p.formation, p.troopType));
        this.engine.autoSkill = this.autoSkill;
        this.resultShown = false; this.autoNext = 0; this.nextLabel = null;
        if (this.modal) { this.modal.destroy(); this.modal = null; }
        this.units.destroyAllChildren(); this.fx.clear(); this.actors.clear();
        this.scenery?.destroy();
        const style: StageStyle = !run ? 'rift' : run.mode === 'boss' ? 'boss' : run.mode === 'city' ? 'city' : run.mode === 'boat' ? 'boat' : 'trial';
        this.scenery = new BattleStage(this.field, style); this.scenery.node.setSiblingIndex(0);
        this.teamLabel.node.active = style !== 'boss'; this.enemyLabel.node.active = style !== 'boss';
        this.engine.heroes.forEach((unit, i) => this.createActor(unit, i));
        this.statusLine.string = run ? `${ACTIVITY_NAMES[run.mode]} · 准备接战` : '一路向右 · 清怪攒秘境进度，满100召首领';
        this.processEvents(); this.refresh();
    }

    private createActor(unit: Unit, index: number): void {
        const hero = unit.team === 'hero'; const mode = this.activeRun?.mode;
        let x = hero ? (index % 2 === 0 ? -236 : -130) : (index % 2 === 0 ? 210 : 125);
        let y = 180 - index * 90;
        let fromX = hero ? x - 90 : x + 125; let fromY = y; let scale = unit.kind === 'soldier' ? 0.8 : 0.9;
        if (mode === 'boss') {
            x = hero ? (index - 2) * 120 : 0; y = hero ? -175 : 127;
            fromX = x; fromY = hero ? y - 18 : y; scale = hero ? unit.kind === 'soldier' ? 0.67 : 0.78 : 1.8;
        } else if (mode === 'city') {
            if (hero) { x = index % 2 === 0 ? -90 : -165; fromX = x - 110; }
            else if (unit.kind === 'wall') { x = 175; y = -75; fromX = x; fromY = y; scale = 1; }
            else if (unit.onWall) {
                const wallIndex = this.engine.enemies.filter(u => u.onWall).findIndex(u => u.id === unit.id);
                x = 125 + wallIndex * 108; y = 120; fromX = x; fromY = y;
            } else {
                const groundIndex = this.engine.enemies.filter(u => u.kind !== 'wall' && !u.onWall).findIndex(u => u.id === unit.id);
                x = 95 + groundIndex % 2 * 115; y = -35 - groundIndex * 82; fromX = x; fromY = y;
            }
        } else if (mode === 'trial') {
            x = hero ? index % 2 === 0 ? -135 : -70 : index % 2 === 0 ? 140 : 215;
            y = hero ? 155 - index * 155 : 180 - index * 90;
            fromX = hero ? -310 : 320; fromY = y;
        } else if (unit.kind === 'boss') { x = 185; y = 55; fromX = 325; fromY = y; scale = 1.4; }
        const actor = new UnitActor(this.units, unit, x, y, fromX, fromY, scale, hero ? 1 : -1);
        this.actors.set(unit.id, actor);
    }

    private processEvents(): void { this.engine.drainEvents().forEach(event => this.showEvent(event)); }
    private showEvent(event: BattleEvent): void {
        if (event.type === 'wave') {
            this.actors.forEach((actor, id) => { if (actor.unit.team === 'enemy') { actor.node.destroy(); this.actors.delete(id); } });
            this.engine.enemies.forEach((unit, i) => this.createActor(unit, i));
            this.statusLine.string = this.engine.riftGoal ? this.engine.bossActive ? '首领现身！击败它继续向右' : `遭遇第${event.wave}队敌兵 · 秘境行军中`
                : this.activeRun?.mode === 'boss' ? '董卓在上，我军迎面讨伐！' : '双方正在接敌';
        } else if (event.type === 'boss') {
            this.engine.enemies.forEach((unit, i) => { if (unit.kind === 'boss' && !this.actors.has(unit.id)) this.createActor(unit, i); });
            this.fx.announce('秘境首领 · 现身！');
            this.statusLine.string = '秘境进度已满，首领现身！';
        }
        else if (event.type === 'attack' && event.source && event.target) {
            const source = this.actors.get(event.source); const target = this.actors.get(event.target);
            if (source && target) this.fx.attack(source, target);
        } else if ((event.type === 'damage' || event.type === 'heal') && event.target) {
            const actor = this.actors.get(event.target);
            if (actor) { this.fx.number(actor, event.amount || 0, event.type === 'heal', !!event.critical); if (event.type === 'damage') actor.hurt(); }
        } else if (event.type === 'death' && event.target) this.actors.get(event.target)?.die();
        else if (event.type === 'wall-break') {
            const wall = this.engine.enemies.find(u => u.kind === 'wall');
            if (wall) { const actor = this.actors.get(wall.id); actor?.breakWall(); if (actor) this.fx.wallBreak(actor.node.position.x, actor.node.position.y); }
            let i = 0;
            this.actors.forEach(actor => { if (actor.unit.onWall && actor.unit.hp > 0) { actor.fallTo(110 + i * 105, -65 - i * 105); i += 1; } });
            this.fx.announce('城墙崩塌 · 守将减伤解除！'); this.statusLine.string = '破城！城上守军落地，恢复正常承伤';
        } else if (event.type === 'skill' && event.source) {
            const source = this.actors.get(event.source);
            if (source) {
                const name = source.unit.id === 'guanyu' ? '青龙斩' : TACTIC_NAMES[source.unit.tactic || 'cleave'];
                const targets: UnitActor[] = []; const friends: UnitActor[] = [];
                this.actors.forEach(actor => { if (actor.unit.team === 'hero') friends.push(actor); else if (event.targets?.indexOf(actor.unit.id) !== -1) targets.push(actor); });
                targets.sort((a, b) => (event.targets || []).indexOf(a.unit.id) - (event.targets || []).indexOf(b.unit.id));
                this.fx.skill(source, targets, friends, name); this.statusLine.string = `${source.unit.name} · ${name}！`;
            }
        } else if (event.type === 'finish') this.showResult();
    }

    private refresh(): void {
        this.title.string = this.activeRun ? `${ACTIVITY_NAMES[this.activeRun.mode]}${this.activeRun.mode === 'trial' ? ` · 第${this.activeRun.stage}关` : this.activeRun.mode === 'city' ? ' · 演练' : ''}`
            : `第${this.stage}关 · ${STAGE_NAMES[(this.stage - 1) % STAGE_NAMES.length]}`;
        const p = this.store.progress;
        this.wallet.string = `铜钱${p.coins} · 已过${p.highestCleared}关${this.store.storageAvailable ? '' : ' · 未保存'}`;
        this.trainButton.label.string = p.heroLevel >= 99 ? '全队Lv.99 · 满级' : `全队Lv.${p.heroLevel} · 升级${this.store.upgradeCost}`;
        this.inventoryButton.label.string = `装备背包 ${p.inventory.length}/40`;
        this.actors.forEach(actor => {
            const unit = actor.unit;
            bar(actor.hp, unit.hp / unit.maxHp, unit.kind === 'boss' ? 175 : 85, 8, unit.team === 'hero' ? '#7CC69E' : '#E0B76A');
            actor.hpText.string = this.activeRun?.mode === 'boss' && unit.team === 'enemy' ? '30秒计分目标' : `${Math.ceil(unit.hp)}/${unit.maxHp}`;
        });
        const phase = this.engine.paused ? '已暂停' : this.engine.approachRemaining > 0 ? '正在接敌' : this.engine.status === 'fighting' ? '交战中' : '战斗结束';
        const mode = this.activeRun?.mode;
        if (!this.activeRun) {
            this.overview.string = this.engine.bossActive ? '秘境进度100% · 击败首领进入下一关' : `秘境进度 ${this.engine.riftEnergy}/100 · 击杀小怪召唤首领`;
            bar(this.overviewBar, this.engine.riftEnergy / 100, 620, 10, '#D8BC75');
            this.wave.string = `${phase} · ${Math.floor(this.engine.elapsed)}秒 · 主将+补位兵共${this.engine.heroes.length}人`;
        } else if (mode === 'boss') {
            this.overview.string = `世界Boss · 固定30秒 · 当前伤害${Math.floor(this.engine.damageDealt)}`;
            bar(this.overviewBar, this.engine.elapsed / 30, 620, 10, '#BE8FCB');
            this.wave.string = `${phase} · ${Math.min(30, Math.floor(this.engine.elapsed))}/30秒 · 今日最高${p.daily.bossBest}`;
        } else if (mode === 'city') {
            const wall = this.engine.enemies.find(u => u.kind === 'wall');
            this.overview.string = this.engine.wallAlive ? `城墙 ${Math.ceil(wall!.hp)}/${wall!.maxHp} · 城上守将减伤60%` : '城墙已破 · 城上减伤解除';
            bar(this.overviewBar, wall ? wall.hp / wall.maxHp : 0, 620, 10, '#C6A574');
            this.wave.string = `${phase} · ${Math.floor(this.engine.elapsed)}秒 · 本地守军演练`;
        } else {
            this.overview.string = mode === 'trial' ? `${trialTrait(this.activeRun.stage).join(' · ')}` : '护船借宝 · 筹谋加成持续三波';
            bar(this.overviewBar, (this.engine.waveIndex + 1) / this.engine.waveCount, 620, 10, '#8CBAB1');
            this.wave.string = `${phase} · ${this.engine.waveIndex + 1}/${this.engine.waveCount}波 · ${Math.floor(this.engine.elapsed)}秒`;
        }
        bar(this.energyBar, this.engine.energy / 100, 620, 14, '#D9B874');
        const caster = this.engine.heroes.find(u => u.hp > 0 && (u.tactic || u.id === 'guanyu'));
        const skillName = caster?.id === 'guanyu' ? '青龙斩' : caster ? TACTIC_NAMES[caster.tactic || 'cleave'] : '怒气技能';
        this.skill.label.string = this.engine.status !== 'fighting' ? `${skillName} · 本局结束` : this.engine.canCastSkill ? `${skillName} · 点击释放` : `${skillName} · 怒气${Math.floor(this.engine.energy)}%`;
        this.skill.label.color = new Color(this.engine.canCastSkill ? '#FFF0B3' : '#C7D8CC');
        this.autoButton.label.string = this.autoSkill ? '自动技能：开' : '自动技能：关';
        this.pause.label.string = this.engine.paused ? '继续战斗' : '暂停';
        this.speedButton.label.string = mode === 'boss' ? '固定×1' : `速度×${this.speed}`;
    }

    private showResult(): void {
        if (this.resultShown) return;
        this.resultShown = true;
        if (this.activeRun) { this.showActivityResult(); return; }
        const won = this.engine.status === 'won';
        const reward = won ? this.store.settleVictory(this.battleId, this.stage) : null;
        this.modal = panel(this.root, 'MainlineResult', 0, 60, 600, 380, '#15253A', 24);
        text(this.modal, 'ResultTitle', won ? '首 领 击 破' : '本 关 撤 退', 0, 119, 43, won ? '#E8C580' : '#E5A393', 550);
        text(this.modal, 'ResultReward', won ? `铜钱+${reward!.coins} · 呆币+${reward!.daibi || 0}` : '秘境进度清零，重新从本关出发', 0, 62, 26, '#C7DACE', 550);
        const detail = reward?.heroes?.length ? `剧情入队：${reward.heroes.map(id => getHero(id)!.name).join('、')}`
            : reward?.equipment ? `掉落${RARITY_NAMES[reward.equipment.rarity - 1]}·${reward.equipment.name}` : `用时${this.engine.elapsed.toFixed(1)}秒`;
        text(this.modal, 'ResultDetail', detail, 0, 16, 22, '#B1C4D4', 550);
        this.nextLabel = text(this.modal, 'AutoNext', won && this.stage < 99 ? '继续向右 · 3秒后进入下一关' : won ? '当前99关Demo已通关' : '调整阵容后再次挑战', 0, -28, 19, '#98AFBF', 550);
        if (reward && !reward.saved) this.nextLabel.string = '存储不可用：奖励仅保留于当前会话';
        button(this.modal, 'NextStageButton', won ? '立即向右 · 下一关' : '重新打本关', 0, -91, 470, 62, '#426D59', () => this.begin(won ? Math.min(99, this.stage + 1) : this.stage));
        button(this.modal, 'AdjustParty', '查看武将与阵容', 0, -157, 470, 48, '#30465E', () => this.openHall());
        this.autoNext = won && this.stage < 99 ? 3 : 0;
        this.statusLine.string = won ? '首领已击败 · 队伍继续向右行军' : '挑战失败 · 本关需重新攒秘境进度';
    }

    private restart(): void {
        if (!this.activeRun) { this.begin(this.stage); return; }
        try {
            const pending = this.store.progress.pending;
            const run = pending?.id === this.activeRun.id ? pending : this.store.startActivity(this.activeRun.mode, this.activeRun.choices);
            this.begin(this.stage, run);
        } catch (error) { this.statusLine.string = error instanceof Error ? error.message : '无法重开'; }
    }
    private showActivityResult(): void {
        const run = this.activeRun!; const won = this.engine.status === 'won'; const boss = run.mode === 'boss';
        const reward = this.store.settleActivity(run.id, won, Math.floor(this.engine.damageDealt));
        this.modal = panel(this.root, 'ActivityResult', 0, 60, 600, 420, '#15253A', 24);
        text(this.modal, 'ResultTitle', boss ? '讨 董 战 报' : won ? '大 获 全 胜' : '暂 时 撤 退', 0, 128, 43, '#E6C486', 550);
        text(this.modal, 'ResultReward', `呆币+${reward.daibi} · 军功+${reward.points}`, 0, 66, 29, '#C4D9CA', 550);
        text(this.modal, 'ResultDetail', boss ? `本次${Math.floor(this.engine.damageDealt)} · 今日最高${this.store.progress.daily.bossBest}` : `${ACTIVITY_NAMES[run.mode]} · ${this.engine.elapsed.toFixed(1)}秒`, 0, 12, 22, '#A9BBD0', 550);
        text(this.modal, 'ResultNote', !reward.granted ? '挑战已失效，不重复发奖励' : !reward.saved ? '本次未能保存' : boss ? '奖励只补当日最高档位差额' : run.mode === 'city' ? '当前为本地守军演练，真实玩家攻守待联机' : '结算已保存，不重复发奖', 0, -34, 18, '#8FA6BF', 550);
        button(this.modal, 'ActivityAgain', run.mode === 'trial' && won ? '挑战下一关' : '再次挑战', 0, -100, 470, 62, '#426D59', () => {
            try { this.begin(this.stage, this.store.startActivity(run.mode, run.choices)); }
            catch (error) { this.statusLine.string = error instanceof Error ? error.message : '无法进入副本'; }
        });
        button(this.modal, 'ReturnMain', '返回主线行军', 0, -171, 470, 52, '#30465E', () => this.begin(Math.min(99, this.store.progress.highestCleared + 1)));
        this.statusLine.string = boss ? '个人成绩已保存 · 全服榜单待联机' : won ? '副本通关，奖励已结算' : '调整阵容后再试';
    }
    private openHall(): void {
        if (this.hall || this.inventory) return;
        const wasPaused = this.engine.paused; this.engine.paused = true;
        this.hall = new MetaPanel(this.root, this.store, () => { this.hall = null; this.engine.paused = wasPaused; this.refresh(); }, run => { this.hall = null; this.begin(this.stage, run); });
        this.refresh();
    }
    private openInventory(): void {
        if (this.inventory || this.hall) return;
        const wasPaused = this.engine.paused; this.engine.paused = true;
        this.inventory = new InventoryPanel(this.root, this.store, () => { this.inventory = null; this.engine.paused = wasPaused; this.refresh(); });
        this.refresh();
    }
}
