import { Color, Graphics, Node, UIOpacity, UITransform } from 'cc';
import type { Label } from 'cc';
import type { Unit } from './BattleEngine';
import { makeNode, text } from './BattleUI';

/** Procedural jointed actor. The body, hands, feet and weapon animate independently. */
export class UnitActor {
    readonly node: Node;
    readonly body: Node;
    readonly hp: Graphics;
    readonly hpText: Label;
    readonly opacity: UIOpacity;
    readonly unit: Unit;
    private leftArm!: Node;
    private rightArm!: Node;
    private leftLeg!: Node;
    private rightLeg!: Node;
    private head!: Node;
    private torso!: Node;
    private weaponNode!: Node;
    private shadow: Node;
    private clock = 0;
    private action = 0;
    private hit = 0;
    private dying = false;
    private goalX: number;
    private goalY: number;
    private scale: number;
    private face: number;
    private rubble = false;
    private fallSpeed = 0;

    constructor(parent: Node, unit: Unit, x: number, y: number, fromX: number, fromY: number, scale = 1, face = 1) {
        this.unit = unit; this.goalX = x; this.goalY = y; this.scale = scale; this.face = face;
        this.node = makeNode(unit.id, parent, fromX, fromY);
        this.node.addComponent(UITransform).setContentSize(100, 116);
        this.opacity = this.node.addComponent(UIOpacity);
        this.shadow = makeNode('Shadow', this.node, 0, -42 * scale);
        const shadow = this.shadow.addComponent(Graphics);
        shadow.fillColor = new Color(0, 0, 0, 65); shadow.ellipse(0, 0, 31 * scale, 8 * scale); shadow.fill();
        this.body = makeNode('JointedBody', this.node);
        this.body.setScale(face * scale, scale, 1);
        if (unit.kind === 'wall') this.wallModel(); else this.personModel();
        const health = makeNode('Health', this.node, 0, unit.kind === 'boss' ? -113 : -69);
        this.hp = health.addComponent(Graphics);
        this.hpText = text(this.node, 'HpText', '', 0, unit.kind === 'boss' ? -129 : -84, 13, '#B1C4D6', unit.kind === 'boss' ? 220 : 110);
        text(this.node, 'Name', unit.name, 0, unit.kind === 'boss' ? 145 : -53, unit.kind === 'boss' ? 26 : 18,
            unit.kind === 'soldier' ? '#B4C3CE' : '#F3DFC0', unit.kind === 'boss' ? 250 : 118);
        if (unit.kind === 'wall') { health.active = false; this.hpText.node.active = false; }
    }

    setGoal(x: number, y: number): void { this.goalX = x; this.goalY = y; }
    fallTo(x: number, y: number): void { this.goalX = x; this.goalY = y; this.fallSpeed = 20; }
    get moving(): boolean { return Math.abs(this.node.position.x - this.goalX) + Math.abs(this.node.position.y - this.goalY) > 2; }
    get weapon(): 'sword' | 'spear' | 'bow' | 'fan' { return this.unit.weapon || 'sword'; }
    attack(): void { this.action = 0.42; }
    hurt(): void { this.hit = 0.15; }
    die(): void { this.dying = true; }
    breakWall(): void { this.rubble = true; }

    update(dt: number, march: boolean): void {
        this.clock += dt;
        this.action = Math.max(0, this.action - dt);
        this.hit = Math.max(0, this.hit - dt);
        const p = this.node.position;
        const dx = this.goalX - p.x; const dy = this.goalY - p.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.min(distance, dt * 145);
        if (this.fallSpeed > 0) {
            this.fallSpeed += dt * 700;
            const nextY = Math.max(this.goalY, p.y - this.fallSpeed * dt);
            this.node.setPosition(p.x + dx * Math.min(1, dt * 5), nextY, 0);
            if (nextY === this.goalY) this.fallSpeed = 0;
        } else if (distance > 0.1) this.node.setPosition(p.x + dx / distance * step, p.y + dy / distance * step, 0);
        if (this.unit.kind === 'wall') {
            this.body.setScale(1, this.rubble ? Math.max(0.18, this.body.scale.y - dt * 2.4) : 1, 1);
            this.opacity.opacity = this.rubble ? 100 : 255;
            return;
        }
        if (this.dying) {
            this.body.angle += (-78 - this.body.angle) * Math.min(1, dt * 8);
            this.opacity.opacity = Math.max(55, this.opacity.opacity - dt * 600);
            this.body.setPosition(0, -14);
            return;
        }
        const walking = march || this.moving;
        const stride = Math.sin(this.clock * (walking ? 11 : 2.2) + this.goalY * 0.02);
        const attack = this.action > 0 ? Math.sin((1 - this.action / 0.42) * Math.PI) : 0;
        this.leftLeg.angle = walking ? stride * 28 : 0;
        this.rightLeg.angle = walking ? -stride * 28 : 0;
        this.leftArm.angle = walking ? -stride * 18 : Math.sin(this.clock * 2) * 3;
        this.rightArm.angle = this.weapon === 'bow' ? attack * 28 : -attack * 105 + (walking ? stride * 12 : -8);
        this.weaponNode.angle = this.weapon === 'fan' ? attack * 35 : this.weapon === 'spear' ? -attack * 35 : 0;
        this.body.setPosition(this.hit ? -this.face * 5 : attack * this.face * 4, walking ? Math.abs(stride) * 3 : Math.sin(this.clock * 2) * 1.3);
        this.head.angle = walking ? stride * 2 : -attack * 4;
        this.torso.angle = -attack * 7;
        this.body.setScale(this.face * this.scale, this.scale * (1 + Math.sin(this.clock * 2) * 0.01), 1);
    }

    private personModel(): void {
        const color = this.unit.color;
        const armor = new Color(color);
        const boss = this.unit.kind === 'boss';
        const soldier = this.unit.kind === 'soldier';
        const limb = (name: string, x: number, y: number, leg: boolean): Node => {
            const node = makeNode(name, this.body, x, y); const g = node.addComponent(Graphics);
            g.fillColor = leg ? new Color('#26374C') : armor;
            g.roundRect(-5, -24, 10, 25, 4); g.fill();
            g.fillColor = leg ? new Color('#162134') : new Color('#ECC695');
            g.roundRect(-6, -27, leg ? 16 : 12, 9, 3); g.fill();
            return node;
        };
        this.leftLeg = limb('LeftLeg', -10, -13, true);
        this.rightLeg = limb('RightLeg', 10, -13, true);
        this.torso = makeNode('ArmoredTorso', this.body);
        const g = this.torso.addComponent(Graphics);
        g.fillColor = armor; g.roundRect(-23, -20, 46, 49, 12); g.fill();
        g.fillColor = new Color('#35475B'); g.roundRect(-16, -12, 32, 32, 6); g.fill();
        g.strokeColor = new Color('#D0B77D'); g.lineWidth = 2;
        [-6, 3, 12].forEach(y => { g.moveTo(-13, y); g.lineTo(13, y); g.stroke(); });
        g.fillColor = new Color('#D6B76F'); g.rect(-23, -14, 46, 5); g.fill();
        g.circle(0, -11, 5); g.fill();
        if (!soldier) { g.fillColor = armor; g.moveTo(-21, -15); g.lineTo(-29, -35); g.lineTo(27, -35); g.lineTo(21, -15); g.close(); g.fill(); }
        this.leftArm = limb('LeftArm', -25, 19, false);
        this.rightArm = limb('RightArm', 25, 19, false);
        if (this.unit.tactic === 'guard' || (soldier && this.weapon === 'sword')) {
            const shield = makeNode('Shield', this.leftArm, -2, -17).addComponent(Graphics);
            shield.fillColor = new Color('#4D6774'); shield.roundRect(-12, -16, 24, 32, 9); shield.fill();
            shield.strokeColor = new Color('#D6BC83'); shield.lineWidth = 3; shield.roundRect(-12, -16, 24, 32, 9); shield.stroke();
            shield.fillColor = new Color('#C7B378'); shield.circle(0, 0, 4); shield.fill();
        }
        this.head = makeNode('Head', this.body, 0, 34);
        const head = this.head.addComponent(Graphics);
        head.fillColor = armor; head.circle(0, 0, 25); head.fill();
        head.fillColor = new Color('#F0CB9F'); head.roundRect(-19, -15, 38, 29, 10); head.fill();
        head.fillColor = new Color('#233548'); head.circle(-7, 0, 2.5); head.circle(7, 0, 2.5); head.fill();
        head.strokeColor = new Color('#A76F4D'); head.lineWidth = 1.5; head.moveTo(-4, -8); head.lineTo(4, -8); head.stroke();
        head.fillColor = boss ? new Color('#D5B46B') : new Color('#52677A');
        head.roundRect(-25, 13, 50, 7, 3); head.fill();
        if (boss) {
            head.moveTo(-18, 19); head.lineTo(-29, 35); head.lineTo(-5, 23); head.close(); head.fill();
            head.moveTo(18, 19); head.lineTo(29, 35); head.lineTo(5, 23); head.close(); head.fill();
            head.fillColor = new Color('#493238'); head.moveTo(-14, -9); head.lineTo(14, -9); head.lineTo(0, -28); head.close(); head.fill();
        } else if (this.unit.id === 'guanyu' || this.unit.id === 'zhangfei') {
            head.fillColor = new Color('#263637'); head.moveTo(-12, -9); head.lineTo(12, -9); head.lineTo(0, -32); head.close(); head.fill();
        }
        this.weaponNode = makeNode('Weapon', this.rightArm, 0, -23);
        const weapon = this.weaponNode.addComponent(Graphics);
        weapon.strokeColor = new Color('#D9E5E3'); weapon.fillColor = new Color('#DBE9E7'); weapon.lineWidth = 3;
        if (this.weapon === 'bow') {
            weapon.strokeColor = new Color('#DBB86E'); weapon.arc(7, 15, 28, -1.2, 1.2, false); weapon.stroke();
            weapon.strokeColor = new Color('#E8D9A7'); weapon.moveTo(17, -11); weapon.lineTo(17, 41); weapon.stroke();
            weapon.moveTo(7, 15); weapon.lineTo(45, 15); weapon.stroke();
        } else if (this.weapon === 'spear') {
            weapon.strokeColor = new Color('#BD9D70'); weapon.moveTo(4, -14); weapon.lineTo(4, 66); weapon.stroke();
            weapon.moveTo(4, 80); weapon.lineTo(-3, 61); weapon.lineTo(11, 61); weapon.close(); weapon.fill();
            weapon.fillColor = armor; weapon.moveTo(3, 58); weapon.lineTo(-17, 49); weapon.lineTo(2, 45); weapon.close(); weapon.fill();
        } else if (this.weapon === 'fan') {
            weapon.fillColor = new Color('#D5E2CE'); weapon.moveTo(0, 0); weapon.lineTo(-16, 32); weapon.lineTo(0, 43); weapon.lineTo(25, 29); weapon.close(); weapon.fill();
            weapon.strokeColor = new Color('#6A8B7C'); [-8, 3, 14].forEach(x => { weapon.moveTo(0, 0); weapon.lineTo(x, 32); weapon.stroke(); });
        } else {
            weapon.fillColor = new Color('#D9E5E3'); weapon.moveTo(-4, 3); weapon.lineTo(-6, 39); weapon.lineTo(3, 55); weapon.lineTo(11, 38); weapon.lineTo(7, 3); weapon.close(); weapon.fill();
            weapon.fillColor = new Color('#C1A468'); weapon.roundRect(-10, -2, 24, 6, 2); weapon.fill();
            weapon.fillColor = new Color('#634C43'); weapon.rect(-2, -14, 7, 13); weapon.fill();
        }
    }

    private wallModel(): void {
        const g = this.body.addComponent(Graphics);
        g.fillColor = new Color('#65727D'); g.roundRect(-108, -165, 216, 324, 7); g.fill();
        g.strokeColor = new Color('#82909B'); g.lineWidth = 2;
        for (let y = -150; y < 155; y += 32) {
            g.moveTo(-108, y); g.lineTo(108, y); g.stroke();
            for (let x = -100 + (Math.floor(y / 32) % 2) * 30; x < 108; x += 60) { g.moveTo(x, y); g.lineTo(x, y + 30); g.stroke(); }
        }
        g.fillColor = new Color('#87929B');
        for (let x = -108; x < 108; x += 43) { g.rect(x, 152, 28, 28); g.fill(); }
        g.fillColor = new Color('#222C3A'); g.roundRect(-39, -165, 78, 142, 34); g.fill();
        g.strokeColor = new Color('#B89A63'); g.lineWidth = 5; g.roundRect(-39, -165, 78, 142, 34); g.stroke();
        g.moveTo(85, 175); g.lineTo(85, 250); g.stroke();
        g.fillColor = new Color('#C79565'); g.moveTo(85, 249); g.lineTo(37, 230); g.lineTo(85, 212); g.close(); g.fill();
    }
}
