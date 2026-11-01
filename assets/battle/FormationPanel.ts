import { defenseBoardPosition } from '../data/SiegeLayout';
import { bondProgress } from '../data/BondConfig';
import { Color, EventTouch, Graphics, Node, UITransform, Vec3 } from 'cc';
import { ProgressStore } from './ProgressStore';
import { button, makeNode, panel, text } from './BattleUI';
import { portrait } from './HeroPortrait';
import { getHero, TIER_NAMES } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import { autoFormation, capacity, completeFormation, spotsFor, validateFormation } from '../data/FormationConfig';
import type { FormationEntry, FormationMember, FormationMode } from '../data/FormationConfig';

export class FormationPanel {
    readonly node: Node;
    private mode: FormationMode = 'main';
    private entries: FormationEntry[];
    private page = 0;
    private note = '从下方拖头像到阵位；拖动阵中单位可换位，拖到阵外可撤下';
    private store: ProgressStore;
    private close: () => void;
    private ghost: Node | null = null;

    constructor(parent: Node, store: ProgressStore, close: () => void) {
        this.store = store; this.close = close; this.entries = store.progress.formations.main.map(e => ({ ...e }));
        this.node = panel(parent, 'FormationEditor', 0, 0, 720, 1280, '#0B1729', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        this.render();
    }
    private render(): void {
        this.node.destroyAllChildren(); this.ghost = null;
        text(this.node, 'FormationTitle', '拖 拽 布 阵', 0, 560, 40, '#E8CF9E');
        button(this.node, 'CloseFormation', '返回', 290, 560, 84, 46, '#33485B', () => { this.node.destroy(); this.close(); });
        const active=bondProgress(this.entries.filter(e=>e.hero).map(e=>e.hero!)).filter(b=>b.active);
        text(this.node, 'FormationHelp', active.length?`已激活：${active.map(b=>b.bond.name).join(' / ')}`:'拖入同阵英雄激活羁绊 · 刀枪弓可混编', 0, 507, 18, '#A8C3D6');
        const modes: [FormationMode, string][] = [['main', '主线 / Boss'], ['trial', '三将3v5'], ['defense', '守城阵型']];
        modes.forEach(([id, title], i) => button(this.node, `FormationMode-${id}`, title, (i - 1) * 210, 444, 198, 54,
            this.mode === id ? '#6B7252' : '#2A4058', () => {
                this.mode = id; this.entries = this.store.progress.formations[id].map(e => ({ ...e })); this.note = ''; this.render();
            }));
        const board = panel(this.node, 'FormationBoard', 0, 145, 640, 530, '#1E3547', 18);
        const lines = makeNode('GridLines', board).addComponent(Graphics);
        lines.strokeColor = new Color('#3B5A6D'); lines.lineWidth = 2;
        if (this.mode === 'defense') {
            lines.fillColor = new Color('#566477'); lines.roundRect(147, -150, 165, 410, 6); lines.fill();
            lines.strokeColor=new Color('#CDB27C');lines.moveTo(145,-148);lines.lineTo(145,260);lines.stroke();
            lines.fillColor=new Color('#263142');lines.roundRect(150,-110,55,230,10);lines.fill();
            lines.fillColor=new Color('#8D554D');lines.moveTo(148,245);lines.lineTo(230,279);lines.lineTo(315,245);lines.close();lines.fill();
            for(const id of ['tower-left','tower-right']){const pos=defenseBoardPosition(id);lines.strokeColor=new Color('#D9BF88');lines.lineWidth=5;lines.moveTo(192,pos.y-145-58);lines.lineTo(302,pos.y-145-58);lines.stroke();}
        } else {
            [-100, 100].forEach(x => { lines.moveTo(x, -220); lines.lineTo(x, 220); lines.stroke(); });
            [-60, 90].forEach(y => { lines.moveTo(-290, y); lines.lineTo(290, y); lines.stroke(); });
        }
        spotsFor(this.mode).forEach(spot => {
            const assigned = this.entries.find(e => e.spot === spot.id);
            const cell = panel(this.node, `Spot-${spot.id}`, spot.x, spot.y, 100, 110, spot.tower ? '#526879' : '#29465B', 12);
            if (assigned) {
                portrait(cell, assigned, 78);
                text(cell, 'MemberName', this.name(assigned), 0, -45, 17, '#E1D8BF', 100);
                this.bindDrag(cell, assigned, spot.id);
            } else {
                text(cell, 'EmptySpot', spot.tower ? '城上' : '+', 0, 12, 28, '#91ACB9', 90);
                text(cell, 'EmptyHint', '拖入此处', 0, -31, 15, '#839CAD', 95);
            }
        });
        const owned = this.store.progress.owned;
        const pages = Math.max(1, Math.ceil(owned.length / 5)); this.page = Math.min(this.page, pages - 1);
        text(this.node, 'RosterTitle', `武将头像 ${this.page + 1}/${pages} · 阵中${this.entries.length}/${capacity(this.mode)}人`, 0, -150, 22, '#CFD7CC');
        button(this.node, 'HeroPrev', '‹', -285, -150, 48, 42, '#30485B', () => { this.page = (this.page + pages - 1) % pages; this.render(); });
        button(this.node, 'HeroNext', '›', 285, -150, 48, 42, '#30485B', () => { this.page = (this.page + 1) % pages; this.render(); });
        owned.slice(this.page * 5, this.page * 5 + 5).forEach((id, i) => {
            const cell = panel(this.node, `Roster-${id}`, (i - 2) * 124, -238, 112, 120, '#21394E', 12);
            portrait(cell, { hero: id }, 76);
            text(cell, 'RosterName', `${getHero(id)!.name}`, 0, -43, 19, '#E6D8C1', 106);
            text(cell, 'Tier', TIER_NAMES[getHero(id)!.tier - 1], 0, 47, 14, '#9EB4C4', 100);
            this.bindDrag(cell, { hero: id });
        });
        text(this.node, 'TroopTitle', '小兵可混编、可重复，无需招募', 0, -327, 19, '#A2BCC9');
        (['sword', 'spear', 'bow'] as const).forEach((troop, i) => {
            const cell = panel(this.node, `Troop-${troop}`, (i - 1) * 196, -397, 160, 96, '#2B4150', 12);
            const face = portrait(cell, { troop }, 65); face.setPosition(-38, 3);
            text(cell, 'TroopName', this.name({ troop }), 37, -1, 20, '#C8D5CD', 83);
            this.bindDrag(cell, { troop });
        });
        text(this.node, 'FormationNote', this.note || (this.mode === 'defense' ? '右侧城墙上下各1位；左侧门前六选3，位置与实战对应' : this.mode === 'trial' ? '共3人，最多1神将2名将；不足可以补小兵' : '共5人，9个位置自由选；空位保存时补小兵'), 0, -484, 17, '#BFD2B5', 650);
        button(this.node, 'AutoArrange', '自动布阵', -215, -554, 196, 66, '#5E704F', () => {
            this.entries = autoFormation(owned, this.mode); this.note = '已按职业与品质自动排布，点击保存生效'; this.render();
        });
        button(this.node, 'ClearArrange', '清空 / 重排', 0, -554, 196, 66, '#5C4A45', () => { this.entries = []; this.note = '已清空，拖入武将和小兵；空位保存时自动补兵'; this.render(); });
        button(this.node, 'SaveArrange', '保存阵型', 215, -554, 196, 66, '#6C6545', () => {
            try {
                const ready = completeFormation(this.entries, this.mode);
                const error = this.store.saveFormation(this.mode, ready);
                this.note = error || '阵型已保存，下一场战斗使用；可继续排其他模式';
                if (!error) this.entries = ready;
            } catch (error) { this.note = error instanceof Error ? error.message : '布阵未完成'; }
            this.render();
        });
    }
    private name(member: FormationMember): string { return member.hero ? getHero(member.hero)!.name : ({ sword: '刀盾兵', spear: '长枪兵', bow: '弓箭兵' })[member.troop || 'sword']; }
    private local(event: EventTouch): { x: number; y: number } {
        const point = event.getUILocation();
        const local = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0));
        return { x: local.x, y: local.y };
    }
    private bindDrag(node: Node, member: FormationMember, source?: string): void {
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
        const finish = (event: EventTouch) => {
            event.propagationStopped = true; const point = this.local(event); this.ghost?.destroy(); this.ghost = null;
            const spots = spotsFor(this.mode);
            let target = spots.find(s => Math.hypot(point.x - s.x, point.y - s.y) < 77)?.id;
            if (!moved && !source) target = spots.find(s => !this.entries.some(e => e.spot === s.id))?.id || this.entries[0]?.spot;
            const original = this.entries.map(e => ({ ...e }));
            const existing = source || (member.hero ? this.entries.find(e => e.hero === member.hero)?.spot : undefined);
            if (target) {
                const displaced = this.entries.find(e => e.spot === target);
                this.entries = this.entries.filter(e => e.spot !== target && e.spot !== existing);
                if (displaced && existing && target !== existing) this.entries.push({ ...displaced, spot: existing });
                this.entries.push({ ...member, spot: target });
            } else if (source) this.entries = this.entries.filter(e => e.spot !== source);
            const error = validateFormation(this.entries, this.store.progress.owned, this.mode, false);
            if (error) { this.entries = original; this.note = error; }
            else this.note = target ? '已放入阵位；保存后下一场生效' : '已撤下，可从下方重新拖入';
            this.render();
        };
        node.on(Node.EventType.TOUCH_END, finish);
        node.on(Node.EventType.TOUCH_CANCEL, finish);
    }
}
