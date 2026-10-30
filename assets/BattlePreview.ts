import {
    _decorator, Color, Component, Graphics, Label, Node, ResolutionPolicy,
    sys, tween, UIOpacity, UITransform, Vec3, view,
} from 'cc';
import { BattleEngine } from './battle/BattleEngine';
import type { BattleEvent, Unit } from './battle/BattleEngine';
import { ProgressStore } from './battle/ProgressStore';
import { RARITY_NAMES } from './battle/ProgressStore';
import { InventoryPanel } from './battle/InventoryPanel';
import { bar, button, makeNode, panel, text } from './battle/BattleUI';
import type { UIButton } from './battle/BattleUI';
import { createBattleOptions, STAGE_NAMES } from './data/BattleConfig';

const { ccclass } = _decorator;

interface UnitView {
    node: Node;
    body: Node;
    hp: Graphics;
    hpText: Label;
    opacity: UIOpacity;
}

interface Effect { node: Node; remaining: number; total: number; rise: number; opacity: UIOpacity; }

/** Cocos 展示与交互层；战斗规则与奖励存储分开实现。 */
@ccclass('BattlePreview')
export class BattlePreview extends Component {
    private root!: Node;
    private field!: Node;
    private units!: Node;
    private effectsRoot!: Node;
    private engine!: BattleEngine;
    private store!: ProgressStore;
    private views = new Map<string, UnitView>();
    private effects: Effect[] = [];
    private stage = 1;
    private speed = 1;
    private autoSkill = true;
    private battleId = '';
    private battleSequence = 0;
    private resultShown = false;
    private modal: Node | null = null;
    private title!: Label;
    private wallet!: Label;
    private wave!: Label;
    private statusLine!: Label;
    private energyBar!: Graphics;
    private skill!: UIButton;
    private pause!: UIButton;
    private speedButton!: UIButton;
    private autoButton!: UIButton;
    private trainButton!: UIButton;
    private activeLevel = 1;
    private inventory: InventoryPanel | null = null;
    private inventoryButton!: UIButton;

    start(): void {
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
        this.store = new ProgressStore(sys.localStorage);
        this.stage = Math.min(99, this.store.progress.highestCleared + 1);
        this.root = makeNode('BattleDemo', this.node);
        this.root.addComponent(UITransform).setContentSize(720, 1280);
        panel(this.root, 'Background', 0, 0, 720, 1280, '#111E30', 0);
        panel(this.root, 'Accent', 0, 632, 720, 16, '#DCB977', 0);
        text(this.root, 'Title', '呆脑三国', -130, 558, 48, '#F2E1BC', 390);
        text(this.root, 'Version', 'DEMO 0.4 · 刷宝养成', 195, 562, 20, '#C0A773', 270);
        this.title = text(this.root, 'Stage', '', 0, 492, 30);
        this.wallet = text(this.root, 'Wallet', '', -120, 447, 20, '#B9C5D4', 400);
        this.trainButton = button(this.root, 'TrainButton', '升级全队', 216, 447, 220, 46, '#5E5540', () => {
            const result = this.store.upgradeTeam();
            this.statusLine.string = result.upgraded
                ? `全队升至 Lv.${result.level}，下局生效${result.saved ? '' : '（当前未能保存）'}`
                : result.level >= 99 ? '全队已达最高等级' : `铜钱不足，需要 ${result.cost} 铜钱升级全队`;
            this.refresh();
        });
        this.field = panel(this.root, 'Battlefield', 0, 70, 660, 650, '#1D2D42', 24);
        const terrain = makeNode('Terrain', this.field).addComponent(Graphics);
        terrain.strokeColor = new Color('#293C50');
        terrain.lineWidth = 2;
        for (let y = -260; y <= 260; y += 104) {
            terrain.moveTo(-300, y); terrain.lineTo(300, y); terrain.stroke();
        }
        text(this.field, 'TeamLabel', '五 虎 萌 将', -174, 292, 20, '#8EC8B2', 280);
        text(this.field, 'EnemyLabel', '黄 巾 军', 174, 292, 20, '#D5B77E', 280);
        this.wave = text(this.field, 'Wave', '', 0, -294, 20, '#9FB2C8', 620);
        this.units = makeNode('Units', this.field);
        this.effectsRoot = makeNode('Effects', this.field);
        this.statusLine = text(this.root, 'BattleLog', '', 0, -294, 23, '#CDD6DE');
        this.skill = button(this.root, 'SkillButton', '青龙斩', -83, -374, 464, 76, '#426C59', () => {
            if (this.engine.status !== 'fighting') { this.statusLine.string = '本局已结束，请选择下一关或重新开始'; return; }
            if (this.engine.castSkill()) this.processEvents();
            else if (this.engine.paused) this.statusLine.string = '战斗已暂停，继续后可释放技能';
            else if (!this.engine.heroes.some(u => u.id === 'guanyu' && u.hp > 0)) this.statusLine.string = '关羽已退场，本局无法释放青龙斩';
            else this.statusLine.string = '怒气达到 100% 时可以释放青龙斩';
            this.refresh();
        });
        this.autoButton = button(this.root, 'AutoSkillButton', '自动技能', 246, -374, 156, 76, '#3D4E64', () => {
            this.autoSkill = !this.autoSkill;
            this.engine.autoSkill = this.autoSkill;
            this.refresh();
        });
        const energy = makeNode('EnergyBar', this.root, 0, -432);
        this.energyBar = energy.addComponent(Graphics);
        button(this.root, 'RestartButton', '重新开始', -220, -502, 200, 64, '#3A4D66', () => this.begin(this.stage));
        this.pause = button(this.root, 'PauseButton', '暂停', 0, -502, 200, 64, '#3A4D66', () => {
            if (this.engine.status !== 'fighting') return;
            this.engine.paused = !this.engine.paused;
            this.statusLine.string = this.engine.paused ? '已暂停 · 时间与攻击停止推进' : '自动战斗中';
            this.refresh();
        });
        this.speedButton = button(this.root, 'SpeedButton', '速度 ×1', 220, -502, 200, 64, '#3A4D66', () => {
            this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
            this.refresh();
        });
        this.inventoryButton = button(this.root, 'InventoryButton', '装备背包', -222, -565, 200, 48, '#544B64', () => this.openInventory());
        text(this.root, 'Help', '青龙斩群攻 · 刘备在场可回复生命', 104, -564, 17, '#92A4BA', 430);
        text(this.root, 'DemoNotice', '升级和穿戴下局生效 · 进度仅保存于本机', 0, -610, 17, '#667D99');
        this.begin(this.stage);
    }

    update(dt: number): void {
        if (!this.engine) return;
        const frame = Math.min(0.25, Math.max(0, dt));
        this.engine.advance(frame * this.speed);
        this.processEvents();
        this.effects = this.effects.filter(effect => {
            if (!this.engine.paused) {
                effect.remaining -= frame;
                effect.node.setPosition(effect.node.position.x, effect.node.position.y + effect.rise * frame, 0);
                effect.opacity.opacity = Math.round(255 * Math.max(0, effect.remaining / effect.total));
            }
            if (effect.remaining <= 0) { effect.node.destroy(); return false; }
            return true;
        });
        this.refresh();
    }

    private begin(stage: number): void {
        this.stage = stage;
        this.battleSequence += 1;
        this.battleId = `${Date.now()}-${this.battleSequence}`;
        this.activeLevel = this.store.progress.heroLevel;
        this.engine = new BattleEngine(createBattleOptions(stage, 20261030, this.activeLevel, this.store.getEquipmentBonuses()));
        this.engine.autoSkill = this.autoSkill;
        this.resultShown = false;
        if (this.modal) { this.modal.destroy(); this.modal = null; }
        this.units.destroyAllChildren();
        this.effectsRoot.destroyAllChildren();
        this.views.clear();
        this.effects = [];
        this.engine.heroes.forEach((unit, index) => this.createUnitView(unit, index));
        this.statusLine.string = '自动战斗中 · 张飞优先承受敌方攻击';
        this.processEvents();
        this.refresh();
    }

    private createUnitView(unit: Unit, index: number): void {
        const hero = unit.team === 'hero';
        const x = hero ? (index % 2 === 0 ? -236 : -124) : (index % 2 === 0 ? 232 : 120);
        const y = hero ? 210 - index * 104 : 170 - index * 112;
        const node = makeNode(unit.id, this.units, x, y);
        node.addComponent(UITransform).setContentSize(110, 100);
        const opacity = node.addComponent(UIOpacity);
        const body = makeNode('Body', node);
        const art = body.addComponent(Graphics);
        art.fillColor = new Color(unit.color);
        art.roundRect(-26, -24, 52, 48, 14); art.fill();
        art.circle(0, 28, 24); art.fill();
        art.fillColor = new Color(hero ? '#F2CE9E' : '#E1BB7F');
        art.roundRect(-19, 12, 38, 28, 10); art.fill();
        art.fillColor = new Color('#142335');
        art.circle(-7, 28, 2.8); art.circle(7, 28, 2.8); art.fill();
        if (!hero) {
            art.fillColor = new Color('#E0BC56');
            art.rect(-24, 38, 48, 10); art.fill();
        } else if (unit.id === 'guanyu' || unit.id === 'zhangfei') {
            art.fillColor = new Color('#203335');
            art.moveTo(-12, 17); art.lineTo(12, 17); art.lineTo(0, -4); art.close(); art.fill();
        }
        art.strokeColor = new Color(hero ? '#D5E4E1' : '#D9BC6E');
        art.lineWidth = 4;
        art.moveTo(33, -22); art.lineTo(33, 43); art.stroke();
        art.fillColor = new Color(hero ? '#D5E4E1' : '#D9BC6E');
        art.moveTo(33, 54); art.lineTo(26, 37); art.lineTo(40, 37); art.close(); art.fill();
        text(node, 'Name', unit.name, 0, -43, 20, '#EEE8DB', 112);
        const health = makeNode('Health', node, 0, -64).addComponent(Graphics);
        const hpText = text(node, 'HpText', '', 0, -82, 14, '#ABBCD1', 110);
        this.views.set(unit.id, { node, body, hp: health, hpText, opacity });
    }

    private processEvents(): void {
        this.engine.drainEvents().forEach(event => this.showEvent(event));
    }

    private showEvent(event: BattleEvent): void {
        if (event.type === 'wave') {
            // Cocos发布的loose转译不展开Map迭代器，使用原生forEach。
            this.views.forEach((visual, id) => {
                if (id.indexOf('enemy-') === 0) { visual.node.destroy(); this.views.delete(id); }
            });
            this.engine.enemies.forEach((unit, index) => this.createUnitView(unit, index));
            this.statusLine.string = event.wave === 3 ? '最后一波 · 黄巾头目出现！' : `第 ${event.wave} 波敌人来袭`;
        } else if (event.type === 'attack' && event.source) {
            const visual = this.views.get(event.source);
            if (visual) tween(visual.body).to(0.08, { scale: new Vec3(1.12, 0.92, 1) })
                .to(0.15, { scale: new Vec3(1, 1, 1) }).start();
        } else if ((event.type === 'damage' || event.type === 'heal') && event.target) {
            const target = this.views.get(event.target);
            if (target) {
                const label = text(this.effectsRoot, 'FloatingNumber', `${event.type === 'heal' ? '+' : '−'}${event.amount}${event.critical ? '!' : ''}`,
                    target.node.position.x, target.node.position.y + 62, event.critical ? 29 : 24,
                    event.type === 'heal' ? '#8BE0AC' : event.critical ? '#FFE19B' : '#F4B2A2', 150);
                this.effects.push({ node: label.node, remaining: 0.7, total: 0.7, rise: 54, opacity: label.node.addComponent(UIOpacity) });
            }
        } else if (event.type === 'death' && event.target) {
            const target = this.views.get(event.target);
            if (target) { target.opacity.opacity = 55; target.body.setScale(0.8, 0.8, 1); }
        } else if (event.type === 'skill') {
            this.statusLine.string = this.engine.heroes.some(u => u.id === 'liubei' && u.hp > 0)
                ? '关羽 · 青龙斩！刘备 · 仁德回复' : '关羽 · 青龙斩！';
            const flash = panel(this.effectsRoot, 'SkillFlash', 0, 0, 650, 640, '#6AB597', 24);
            const opacity = flash.addComponent(UIOpacity); opacity.opacity = 80;
            tween(opacity).to(0.32, { opacity: 0 }).call(() => flash.destroy()).start();
            text(flash, 'SkillName', '青 龙 斩', 0, 0, 60, '#FFF0C5');
        } else if (event.type === 'finish') this.showResult();
    }

    private refresh(): void {
        this.title.string = `第 ${this.stage} 关 · ${STAGE_NAMES[(this.stage - 1) % STAGE_NAMES.length]}`;
        const progress = this.store.progress;
        this.wallet.string = `铜钱 ${progress.coins} · 已过 ${progress.highestCleared} 关${this.store.storageAvailable ? '' : ' · 未保存'}`;
        this.trainButton.label.string = progress.heroLevel >= 99 ? '全队 Lv.99 · 已满级'
            : `全队 Lv.${progress.heroLevel} · 升级 ${this.store.upgradeCost}`;
        this.inventoryButton.label.string = `装备背包 ${progress.inventory.length}/40`;
        const phase = this.engine.status === 'won' ? '战斗胜利' : this.engine.status === 'lost' ? '战斗结束'
            : this.engine.paused ? '已暂停' : this.engine.transitioning ? '准备下一波' : '自动战斗';
        this.wave.string = `${phase} · ${this.engine.waveIndex + 1}/${this.engine.waveCount} 波 · ${Math.floor(this.engine.elapsed)} 秒 · 本局 Lv.${this.activeLevel}`;
        [...this.engine.heroes, ...this.engine.enemies].forEach(unit => {
            const visual = this.views.get(unit.id);
            if (!visual) return;
            bar(visual.hp, unit.hp / unit.maxHp, 92, 10, unit.team === 'hero' ? '#70C59B' : '#D9A85D');
            visual.hpText.string = `${Math.ceil(unit.hp)}/${unit.maxHp}`;
        });
        bar(this.energyBar, this.engine.energy / 100, 620, 14, '#D9B874');
        this.skill.label.string = this.engine.status !== 'fighting' ? '青龙斩 · 本局已结束'
            : this.engine.canCastSkill ? '青龙斩 · 点击释放' : `青龙斩 · 怒气 ${Math.floor(this.engine.energy)}%`;
        this.skill.label.color = new Color(this.engine.canCastSkill ? '#FFF0B3' : '#C7D8CC');
        this.autoButton.label.string = this.autoSkill ? '自动技能：开' : '自动技能：关';
        this.pause.label.string = this.engine.paused ? '继续战斗' : '暂停';
        this.speedButton.label.string = `速度 ×${this.speed}`;
    }

    private showResult(): void {
        if (this.resultShown) return;
        this.resultShown = true;
        const won = this.engine.status === 'won';
        const settlement = won ? this.store.settleVictory(this.battleId, this.stage) : null;
        this.modal = panel(this.root, 'Result', 0, 74, 600, 440, '#15253A', 24);
        text(this.modal, 'ResultTitle', won ? '大 获 全 胜' : '暂 时 撤 退', 0, 138, 48, won ? '#E8C580' : '#E5A393', 540);
        text(this.modal, 'ResultReward', won ? `铜钱 +${settlement!.coins}` : '本局未获得通关奖励', 0, 66, 31, '#C7DACE', 540);
        text(this.modal, 'ResultDetail', `用时 ${this.engine.elapsed.toFixed(1)} 秒 · 释放青龙斩 ${this.engine.skillCount} 次`, 0, 12, 22, '#A9BBD0', 540);
        const storageNote = settlement && !settlement.saved ? '存储不可用：奖励仅保留在当前会话'
            : settlement && settlement.equipment ? `掉落：${RARITY_NAMES[settlement.equipment.rarity - 1]} ${settlement.equipment.name}（背包穿戴）`
                : settlement && settlement.convertedCoins ? `背包已满，本次装备转为${settlement.convertedCoins}铜钱`
                    : won ? '奖励已结算 · 可继续挑战或重打本关' : '可重试本关，或回到第一关熟悉战斗';
        text(this.modal, 'ResultNote', storageNote, 0, -34, 19, '#829AB4', 550);
        button(this.modal, 'NextStageButton', won ? this.stage < 99 ? '下一关' : 'Demo 已全部通关 · 再战' : '重新挑战', 0, -103, 470, 64,
            won ? '#426D59' : '#795B50', () => this.begin(won ? Math.min(99, this.stage + 1) : this.stage));
        button(this.modal, 'ReplayButton', won ? '重打本关' : '回到第一关', 0, -176, 470, 52, '#30465E', () => this.begin(won ? this.stage : 1));
        this.statusLine.string = won ? '三波敌人已清除 · 本局奖励仅结算一次' : '队伍已撤退 · 调整节奏后再次挑战';
    }

    private openInventory(): void {
        if (this.inventory) return;
        const wasPaused = this.engine.paused;
        this.engine.paused = true;
        this.inventory = new InventoryPanel(this.root, this.store, () => {
            this.inventory = null;
            this.engine.paused = wasPaused;
            this.statusLine.string = this.engine.status === 'fighting'
                ? wasPaused ? '已暂停 · 穿戴属性在下一局生效' : '自动战斗中 · 新穿戴装备下局生效'
                : '战斗已结束 · 新穿戴装备下局生效';
            this.refresh();
        });
        this.refresh();
    }
}
