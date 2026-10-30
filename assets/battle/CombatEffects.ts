import { Color, Graphics, Node, UIOpacity } from 'cc';
import { makeNode, text } from './BattleUI';
import type { UnitActor } from './UnitActor';

interface Effect { node: Node; opacity: UIOpacity; left: number; total: number; frame?: (progress: number) => void; }
export class CombatEffects {
    private parent: Node;
    private effects: Effect[] = [];
    constructor(parent: Node) { this.parent = parent; }
    update(dt: number): void {
        this.effects = this.effects.filter(effect => {
            effect.left -= dt;
            const progress = 1 - Math.max(0, effect.left) / effect.total;
            effect.frame?.(progress);
            effect.opacity.opacity = Math.round(255 * (1 - progress));
            if (effect.left <= 0) { effect.node.destroy(); return false; }
            return true;
        });
    }
    clear(): void { this.effects.forEach(e => e.node.destroy()); this.effects = []; }
    private add(name: string, x: number, y: number, duration: number, frame?: (p: number) => void): { node: Node; graphics: Graphics } {
        const node = makeNode(name, this.parent, x, y); const opacity = node.addComponent(UIOpacity);
        const graphics = node.addComponent(Graphics);
        this.effects.push({ node, opacity, left: duration, total: duration, frame });
        return { node, graphics };
    }
    number(actor: UnitActor, amount: number, heal: boolean, critical: boolean): void {
        const x = actor.node.position.x; const y = actor.node.position.y + (actor.unit.kind === 'boss' ? 90 : 61);
        const node = text(this.parent, 'FloatingNumber', `${heal ? '+' : '−'}${Math.ceil(amount)}${critical ? '!' : ''}`, x, y,
            critical ? 29 : 22, heal ? '#9CE7B0' : critical ? '#FFE3A1' : '#F4C4B6', 180).node;
        const opacity = node.addComponent(UIOpacity);
        this.effects.push({ node, opacity, total: 0.65, left: 0.65, frame: p => node.setPosition(x, y + p * 48, 0) });
        if (heal) this.plus(x, y - 30);
    }
    attack(source: UnitActor, target: UnitActor): void {
        source.attack();
        const a = source.node.position; const b = target.node.position;
        if (source.weapon === 'bow' || source.weapon === 'fan') {
            this.projectile(a.x, a.y + 15, b.x, b.y + 15, source.weapon === 'bow' ? '#EDD9A0' : '#A5D9DD', source.weapon === 'bow');
        } else this.slash(b.x, b.y + 12, source.weapon === 'spear' ? '#B8DEE5' : '#F0D39B', source.weapon === 'spear');
    }
    private projectile(x: number, y: number, tx: number, ty: number, color: string, arrow: boolean): void {
        let node: Node;
        const effect = this.add('Projectile', x, y, 0.32, p => {
            node.setPosition(x + (tx - x) * p, y + (ty - y) * p + Math.sin(p * Math.PI) * (arrow ? 24 : 0), 0);
        });
        node = effect.node; node.angle = Math.atan2(ty - y, tx - x) * 180 / Math.PI;
        const g = effect.graphics; g.strokeColor = new Color(color); g.fillColor = new Color(color); g.lineWidth = arrow ? 2.5 : 5;
        g.moveTo(-24, 0); g.lineTo(13, 0); g.stroke();
        if (arrow) { g.moveTo(16, 0); g.lineTo(6, 5); g.lineTo(6, -5); g.close(); g.fill(); }
        else { g.circle(12, 0, 6); g.fill(); }
    }
    private slash(x: number, y: number, color: string, thrust = false, scale = 1): void {
        const { node, graphics: g } = this.add('WeaponImpact', x, y, 0.28);
        node.setScale(scale, scale, 1);
        g.strokeColor = new Color(color); g.lineWidth = thrust ? 4 : 7;
        if (thrust) { g.moveTo(-34, -9); g.lineTo(38, 10); g.stroke(); g.moveTo(25, 15); g.lineTo(38, 10); g.lineTo(28, -1); g.stroke(); }
        else { g.arc(0, 0, 33, -0.6, 1.8, false); g.stroke(); g.lineWidth = 2; g.arc(0, 0, 43, -0.6, 1.8, false); g.stroke(); }
        for (let i = 0; i < 4; i++) { const angle = i * 1.6; g.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12); g.lineTo(Math.cos(angle) * 24, Math.sin(angle) * 24); g.stroke(); }
    }
    private plus(x: number, y: number): void {
        const { graphics: g } = this.add('HealingCross', x, y, 0.7);
        g.fillColor = new Color('#9BE3AA'); g.roundRect(-4, -14, 8, 28, 3); g.fill(); g.roundRect(-14, -4, 28, 8, 3); g.fill();
    }
    skill(source: UnitActor, targets: UnitActor[], friends: UnitActor[], name: string): void {
        const tactic = source.unit.tactic || 'cleave';
        const x = source.node.position.x; const y = source.node.position.y;
        const title = text(this.parent, 'SkillBanner', `${source.unit.name} · ${name}`, 0, 249, 31, '#FFE4A2', 610).node;
        const opacity = title.addComponent(UIOpacity); this.effects.push({ node: title, opacity, total: 0.9, left: 0.9 });
        this.ring(x, y, '#E9D18C', 0.55, 70);
        if (tactic === 'pierce') {
            if (targets[0]) {
                const b = targets[0].node.position;
                const { graphics: g } = this.add('PiercingLance', 0, 0, 0.42);
                g.strokeColor = new Color('#CBF3F2'); g.lineWidth = 13; g.moveTo(x, y + 15); g.lineTo(b.x, b.y + 15); g.stroke();
                this.slash(b.x, b.y, '#F4F3CE', true, 2);
            }
        } else if (tactic === 'volley') {
            targets.forEach(target => { const b = target.node.position; for (let i = -1; i <= 1; i++) this.projectile(b.x - 100 + i * 12, b.y + 115, b.x + i * 10, b.y, '#E8D997', true); });
        } else if (tactic === 'guard') {
            const { graphics: g } = this.add('GuardShield', x, y + 10, 0.8);
            g.strokeColor = new Color('#9ED5C7'); g.lineWidth = 6; g.moveTo(-40, 37); g.lineTo(40, 37); g.lineTo(36, -18); g.lineTo(0, -44); g.lineTo(-36, -18); g.close(); g.stroke();
            targets.forEach(target => this.slash(target.node.position.x, target.node.position.y, '#B7E6D3'));
        } else if (tactic === 'heal') {
            friends.filter(a => a.unit.hp > 0).forEach(actor => { this.plus(actor.node.position.x, actor.node.position.y + 22); this.ring(actor.node.position.x, actor.node.position.y - 27, '#88E0A6', 0.8, 55); });
        } else {
            targets.forEach(target => { this.slash(target.node.position.x, target.node.position.y + 10, '#C3E4B1', false, 1.8); this.ring(target.node.position.x, target.node.position.y, '#9DCCAF', 0.6, 65); });
        }
    }
    private ring(x: number, y: number, color: string, duration: number, radius: number): void {
        let node: Node;
        const effect = this.add('ExpandingRing', x, y, duration, p => node.setScale(0.3 + p * 1.3, (0.3 + p * 1.3) * 0.6, 1));
        node = effect.node; const g = effect.graphics; g.strokeColor = new Color(color); g.lineWidth = 4; g.circle(0, 0, radius); g.stroke();
    }
    announce(message: string): void {
        const node = text(this.parent, 'Announcement', message, 0, 218, 32, '#FFD792', 630).node;
        this.effects.push({ node, opacity: node.addComponent(UIOpacity), left: 1.3, total: 1.3 });
    }
    wallBreak(x: number, y: number): void {
        for (let i = 0; i < 16; i++) {
            const dx = (i % 5 - 2) * 32; const startY = y + Math.floor(i / 5) * 40;
            let node: Node;
            const effect = this.add('FallingMasonry', x + dx, startY, 0.9, p => { node.setPosition(x + dx + (i % 2 ? 1 : -1) * p * 65, startY + p * 50 - p * p * 180, 0); node.angle = p * 200; });
            node = effect.node; const g = effect.graphics; g.fillColor = new Color('#9AA8AC'); g.rect(-9, -6, 18, 12); g.fill();
        }
    }
}
