import { heroTierLabel, showHeroTierFilter } from './HeroCard';
import type { HeroTierFilter } from './HeroCard';
import { bondProgress } from '../data/BondConfig';
import { Color, EventTouch, Graphics, Node, UITransform, Vec3 } from 'cc';
import { ProgressStore } from './ProgressStore';
import { button, makeNode, panel, text } from './BattleUI';
import { portrait } from './HeroPortrait';
import { getHero, TIER_NAMES } from '../data/HeroCatalog';
import { autoFormation, COMPANION_CAPACITY, FORMATION_SPOTS, moveChapterMember, validateChapterFormation } from '../data/FormationConfig';
import type { ChapterFormation, ChapterMember } from '../data/FormationConfig';

export class FormationPanel {
    readonly node: Node;
    private formation: ChapterFormation;
    private page = 0;
    private tier: HeroTierFilter = 'all';
    private note = '拖动头像上阵或换位，拖到撤下区可移除随从';
    private store: ProgressStore;
    private close: () => void;
    private ghost: Node | null = null;

    constructor(parent: Node, store: ProgressStore, close: () => void) {
        this.store = store; this.close = close; this.formation = store.chapterFormation;
        this.node = panel(parent, 'FormationEditor', 0, 0, 720, 1280, '#0B1729', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        this.render();
    }
    private render(): void {
        this.node.destroyAllChildren(); this.ghost = null;
        text(this.node, 'FormationTitle', '拖 拽 布 阵', 0, 560, 40, '#E8CF9E');
        button(this.node, 'CloseFormation', '返回', 290, 560, 84, 46, '#33485B', () => { this.node.destroy(); this.close(); });
        const active=bondProgress(this.formation.companions.filter(e=>e.hero).map(e=>e.hero!)).filter(b=>b.active);
        text(this.node, 'FormationHelp', active.length?`已激活：${active.map(b=>b.bond.name).join(' / ')}`:'拖入同阵英雄激活羁绊 · 刀枪弓可混编', 0, 507, 18, '#A8C3D6');
        text(this.node, 'FormationScope', '主公必上 · 随从最多4名 · 可以留空', 0, 444, 20, '#A8C3D6', 650);
        const board = panel(this.node, 'FormationBoard', 0, 145, 640, 530, '#1E3547', 18);
        const lines = makeNode('GridLines', board).addComponent(Graphics);
        lines.strokeColor = new Color('#3B5A6D'); lines.lineWidth = 2;
        [-100, 100].forEach(x => { lines.moveTo(x, -220); lines.lineTo(x, 220); lines.stroke(); });
        [-60, 90].forEach(y => { lines.moveTo(-290, y); lines.lineTo(290, y); lines.stroke(); });
        FORMATION_SPOTS.forEach(spot => {
            const lead = spot.id === this.formation.protagonistSpot;
            const assigned: ChapterMember | undefined = lead ? { protagonist: true } : this.formation.companions.find(e => e.spot === spot.id);
            const cell = panel(this.node, `Spot-${spot.id}`, spot.x, spot.y, 138, 110, lead ? '#75613E' : '#29465B', 12);
            if (assigned) {
                portrait(cell, assigned, 78);
                text(cell, 'MemberName', this.name(assigned), 0, -44, 16, lead ? '#FFE1A0' : '#E1D8BF', 132);
                this.bindDrag(cell, assigned, spot.id);
            } else {
                text(cell, 'EmptySpot', '+', 0, 12, 28, '#91ACB9', 90);
                text(cell, 'EmptyHint', '拖入此处', 0, -31, 15, '#839CAD', 95);
            }
        });
        const owned = this.store.progress.owned;
        const visible = owned.filter(id => this.tier === 'all' || getHero(id)!.tier === this.tier);
        const pages = Math.max(1, Math.ceil(visible.length / 5)); this.page = Math.min(this.page, pages - 1);
        button(this.node, 'FormationTierFilter', `品级 · ${heroTierLabel(this.tier)} ›`, -105, -150, 210, 41, '#30485B', () =>
            showHeroTierFilter(this.node, this.tier, tier => { this.tier = tier; this.page = 0; this.render(); }));
        text(this.node, 'RosterTitle', `${this.page + 1}/${pages} · 随从 ${this.formation.companions.length}/${COMPANION_CAPACITY}`, 114, -150, 18, '#CFD7CC', 195);
        if (!visible.length) text(this.node, 'EmptyFilteredRoster', '暂无该品级的已结识武将', 0, -238, 22, '#B0C5D2', 580);
        button(this.node, 'HeroPrev', '‹', -285, -150, 48, 42, '#30485B', () => { this.page = (this.page + pages - 1) % pages; this.render(); });
        button(this.node, 'HeroNext', '›', 285, -150, 48, 42, '#30485B', () => { this.page = (this.page + 1) % pages; this.render(); });
        visible.slice(this.page * 5, this.page * 5 + 5).forEach((id, i) => {
            const cell = panel(this.node, `Roster-${id}`, (i - 2) * 124, -238, 112, 120, '#21394E', 12);
            portrait(cell, { hero: id }, 76);
            text(cell, 'RosterName', `${getHero(id)!.name}`, 0, -43, 19, '#E6D8C1', 106);
            if (!this.formation.companions.some(entry => entry.hero === id)) text(cell, 'Tier', TIER_NAMES[getHero(id)!.tier - 1], 0, 47, 14, '#9EB4C4', 100);
            this.bindDrag(cell, { hero: id });
            if (this.formation.companions.some(entry => entry.hero === id)) text(cell, 'Deployed', '已上阵', 0, 48, 14, '#F2CF84', 100);
        });
        text(this.node, 'TroopTitle', '小兵可混编、可重复，无需招募', 0, -327, 19, '#A2BCC9');
        (['sword', 'spear', 'bow'] as const).forEach((troop, i) => {
            const cell = panel(this.node, `Troop-${troop}`, (i - 1) * 196, -397, 160, 96, '#2B4150', 12);
            const face = portrait(cell, { troop }, 65); face.setPosition(-38, 3);
            text(cell, 'TroopName', this.name({ troop }), 37, -1, 20, '#C8D5CD', 83);
            this.bindDrag(cell, { troop });
        });
        const bench = panel(this.node, 'BenchDrop', 0, -478, 590, 48, '#3D4146', 8);
        text(bench, 'BenchHint', '↓ 拖随从到这里撤下', 0, 0, 20, '#F4CFA2', 560);
        text(this.node, 'FormationNote', this.note, 0, -520, 17, '#BFD2B5', 650);
        button(this.node, 'AutoArrange', '自动布阵', -215, -572, 196, 60, '#5E704F', () => {
            this.formation.companions = autoFormation(owned, 'main').filter(entry => entry.hero && entry.spot !== this.formation.protagonistSpot).slice(0, COMPANION_CAPACITY);
            this.note = '已自动排布随从，点击保存生效'; this.render();
        });
        button(this.node, 'ClearArrange', '清空随从', 0, -572, 196, 60, '#5C4A45', () => {
            this.formation.companions = []; this.note = '主公独自上阵，可以继续加入随从'; this.render();
        });
        button(this.node, 'SaveArrange', '保存阵型', 215, -572, 196, 60, '#6C6545', () => {
            this.note = this.store.saveChapterFormation(this.formation) || '阵型已保存 · 下一场生效';
            this.render();
        });
    }

    private name(member: ChapterMember): string {
        if ('protagonist' in member) return '主公 · 必上场';
        return member.hero ? getHero(member.hero)!.name : ({ sword: '刀盾兵', spear: '长枪兵', bow: '弓箭兵' })[member.troop || 'sword'];
    }
    private local(event: EventTouch): { x: number; y: number } {
        const point = event.getUILocation();
        const local = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0));
        return { x: local.x, y: local.y };
    }
    private bindDrag(node: Node, member: ChapterMember, source?: string): void {
        let start = { x: 0, y: 0 }; let moved = false;
        node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true; start = this.local(event); moved = false;
            this.ghost = portrait(this.node, member, 91); this.ghost.setPosition(start.x, start.y, 0);
        });
        node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            event.propagationStopped = true; const point = this.local(event);
            moved = moved || Math.hypot(point.x - start.x, point.y - start.y) > 9;
            this.ghost?.setPosition(point.x, point.y, 0);
        });
        const clearGhost = (event: EventTouch) => {
            event.propagationStopped = true; this.ghost?.destroy(); this.ghost = null;
        };
        // Cocos emits TOUCH_CANCEL for drags released outside the source node.
        const finish = (event: EventTouch) => {
            clearGhost(event);
            const point = this.local(event);
            const bench = !!source && Math.abs(point.x) <= 295 && Math.abs(point.y + 478) <= 24;
            let target = FORMATION_SPOTS.find(spot => Math.abs(point.x - spot.x) <= 69 && Math.abs(point.y - spot.y) <= 55)?.id;
            if (!moved && !source && !('protagonist' in member)) {
                if (member.hero && this.formation.companions.some(entry => entry.hero === member.hero)) return;
                target = FORMATION_SPOTS.find(spot => spot.id !== this.formation.protagonistSpot && !this.formation.companions.some(entry => entry.spot === spot.id))?.id;
            }
            if (!target && !bench) return;
            try {
                const next = moveChapterMember(this.formation, member, target ?? null, source);
                const error = validateChapterFormation(next, this.store.progress.owned);
                if (error) throw new Error(error);
                this.formation = next;
                this.note = bench ? '已撤下随从，保存后生效' : '已调整阵位，保存后生效';
            } catch (error) {
                this.note = error instanceof Error ? error.message : '请选一个有效阵位';
            }
            this.render();
        };
        node.on(Node.EventType.TOUCH_END, finish);
        node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
            if (moved) finish(event);
            else clearGhost(event);
        });
    }
}
