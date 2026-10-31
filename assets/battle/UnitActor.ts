import { Color, Graphics, Node, UIOpacity, UITransform } from 'cc';
import type { Label } from 'cc';
import type { Unit, WeaponKind } from './BattleEngine';
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
    private buffIcons: Graphics;
    private clock = 0;
    private action = 0;
    private hit = 0;
    private dying = false;
    private goalX: number;
    private goalY: number;
    private scale: number;
    private face: number;
    private rubble = false;
    private rear: boolean;
    private compact: boolean;
    private fallSpeed = 0;

    constructor(parent: Node, unit: Unit, x: number, y: number, fromX: number, fromY: number, scale = 1, face = 1, rear = false, compact = false) {
        this.rear = rear; this.compact = compact;
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
        this.buffIcons = makeNode('BuffIcons', this.node, 37, 20).addComponent(Graphics);
        const health = makeNode('Health', this.node, 0, unit.kind === 'boss' ? -125 : compact ? scale >= 0.95 ? -68 : -55 : scale >= 1.05 ? -82 : -69);
        this.hp = health.addComponent(Graphics);
        this.hpText = text(this.node, 'HpText', '', 0, unit.kind === 'boss' ? -143 : compact ? scale >= 0.95 ? -82 : -70 : scale >= 1.05 ? -97 : -84, unit.formationSpot ? 11 : 13, '#B1C4D6', unit.kind === 'boss' ? 220 : unit.formationSpot ? 74 : 110);
        text(this.node, 'Name', unit.name, 0, unit.kind === 'boss' ? 196 : compact ? scale >= 0.95 ? -54 : -40 : scale >= 1.05 ? -66 : -53, unit.kind === 'boss' ? 26 : unit.formationSpot ? 16 : 18,
            unit.kind === 'soldier' ? '#B4C3CE' : unit.heroTier === 4 ? '#F4D27E' : unit.heroTier === 3 ? '#DDC3EF' : '#F3DFC0', unit.kind === 'boss' ? 250 : unit.formationSpot ? 80 : 118);
        if (unit.kind === 'wall') { health.active = false; this.hpText.node.active = false; this.node.getChildByName('Name')!.active = false; }
    }

    get impactPoint(): { x: number; y: number } { return { x: this.node.position.x - (this.unit.kind === 'wall' ? 65 : 0), y: this.node.position.y - (this.unit.kind === 'wall' ? 25 : 0) }; }
    setGoal(x: number, y: number): void { this.goalX = x; this.goalY = y; }
    fallTo(x: number, y: number): void { this.goalX = x; this.goalY = y; this.fallSpeed = 20; }
    get moving(): boolean { return Math.abs(this.node.position.x - this.goalX) + Math.abs(this.node.position.y - this.goalY) > 2; }
    get weapon(): WeaponKind { return this.unit.weapon || 'sword'; }
    attack(): void { this.action = 0.42; }
    hurt(): void { this.hit = 0.15; }
    die(): void { this.dying = true; }
    breakWall(): void { this.rubble = true; }

    update(dt: number, march: boolean): void {
        this.clock += dt;
        const badge = this.buffIcons; badge.clear();
        if (this.unit.shield > 0) { badge.fillColor = new Color('#8BD4DF'); badge.moveTo(-7, 7); badge.lineTo(7, 7); badge.lineTo(6, -5); badge.lineTo(0, -11); badge.lineTo(-6, -5); badge.close(); badge.fill(); }
        if (this.unit.attackBuff > 0) { badge.fillColor = new Color('#F3CD79'); badge.moveTo(17, 10); badge.lineTo(25, -1); badge.lineTo(21, -1); badge.lineTo(21, -10); badge.lineTo(13, -10); badge.lineTo(13, -1); badge.lineTo(9, -1); badge.close(); badge.fill(); }
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
            this.body.setPosition(0, -145 * (1 - this.body.scale.y), 0);
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
        this.weaponNode.angle = (this.rear && this.weapon === 'bow' ? 90 : 0) + (this.weapon === 'fan' ? attack * 35 : ['spear', 'glaive', 'serpent', 'halberd'].indexOf(this.weapon) >= 0 ? -attack * 35 : 0);
        this.body.setPosition(this.hit ? -this.face * 5 : attack * this.face * 4, walking ? Math.abs(stride) * 3 : Math.sin(this.clock * 2) * 1.3);
        this.head.angle = walking ? stride * 2 : -attack * 4;
        this.torso.angle = -attack * 7;
        this.body.setScale(this.face * this.scale, this.scale * (1 + Math.sin(this.clock * 2) * 0.01), 1);
    }

    private personModel(): void {
        const id = this.unit.visualId || this.unit.id;
        const tier = this.unit.heroTier || 1;
        const boss = this.unit.kind === 'boss'; const soldier = this.unit.kind === 'soldier';
        const comic:Record<string,string>={guanyu:'#168D63',zhangfei:'#C95332',zhaoyun:'#58A7ED',zhugeliang:'#8054C9',lvbu:'#C73148',caocao:'#4D3E92',zhouyu:'#ED6736',simayi:'#5850A1',huatuo:'#4FB58D',sunce:'#EB972F',diaochan:'#D65C9A'};
        const armor = new Color(comic[id] || this.unit.color);
        const ink = new Color('#171B2A');
        const polygon=(g:Graphics,points:number[][],fill:Color)=>{g.fillColor=fill;g.strokeColor=ink;g.lineWidth=4;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
        if (tier >= 3) {
            const aura = makeNode('EliteAura', this.body, 0, -39).addComponent(Graphics);
            aura.strokeColor = new Color(tier === 4 ? '#DAC17577' : '#B5A3D966'); aura.lineWidth = tier === 4 ? 4 : 2;
            aura.ellipse(0, 0, tier === 4 ? 42 : 34, 12); aura.stroke();
        }
        if (!soldier) {
            const cape = makeNode('SignatureCape', this.body).addComponent(Graphics);
            cape.fillColor = new Color(id === 'lvbu' || id === 'zhouyu' ? '#8E3F43' : id === 'zhaoyun' || id === 'machao' ? '#D5E0DE' : this.unit.color);
            polygon(cape,[[-18,25],[-42,-34],[-22,-31],[-28,-48],[10,-37],[42,-44],[24,25]],new Color(id==='lvbu'||id==='zhouyu'?'#A82D45':comic[id]||this.unit.color));
            cape.strokeColor = new Color(tier === 4 ? '#E7C879' : '#BCCFC377'); cape.lineWidth = 2; cape.moveTo(-17, 24); cape.lineTo(-32, -42); cape.lineTo(32, -42); cape.stroke();
        }
        const limb = (name: string, x: number, y: number, leg: boolean): Node => {
            const node = makeNode(name, this.body, x, y); const g = node.addComponent(Graphics);
            polygon(g,[[-7,3],[8,0],[9,-23],[-9,-25]],leg?new Color('#334058'):armor);
            polygon(g,[[-9,-19],[9,-20],[17,-31],[-11,-31]],leg?new Color('#1B2034'):new Color('#EDB77D'));return node;
        };
        this.leftLeg = limb('LeftLeg', -10, -13, true); this.rightLeg = limb('RightLeg', 10, -13, true);
        this.torso = makeNode('ArmoredTorso', this.body); const g = this.torso.addComponent(Graphics);
        polygon(g,[[-26,29],[-35,13],[-22,-10],[-20,-28],[21,-28],[23,-9],[35,13],[26,29]],armor);
        polygon(g,[[-19,20],[0,27],[20,19],[14,-12],[0,-21],[-14,-12]],new Color(this.rear?'#34466B':tier===4?'#522D48':'#314466'));
        g.strokeColor=new Color('#F2CF78');g.lineWidth=3;
        [-4,6,16].forEach(y=>{g.moveTo(-13,y);g.lineTo(0,y-5);g.lineTo(13,y);g.stroke();});
        polygon(g,[[-25,-17],[25,-17],[22,-28],[-22,-28]],new Color('#E7B448'));
        g.fillColor=new Color('#FFE6A7');g.circle(0,-22,5);g.fill();
        if(!soldier){
            const shoulder=tier>=3?new Color('#E9B94E'):new Color('#899DB4');
            polygon(g,[[-18,25],[-32,35],[-45,23],[-41,7],[-23,12]],shoulder);
            polygon(g,[[18,25],[32,35],[45,23],[41,7],[23,12]],shoulder);
            if(tier>=3){polygon(g,[[-34,33],[-41,47],[-45,23]],shoulder);polygon(g,[[34,33],[41,47],[45,23]],shoulder);}
        }
        this.leftArm = limb('LeftArm', -25, 19, false); this.rightArm = limb('RightArm', 25, 19, false);
        if (['caohong', 'chengpu', 'huanggai', 'zhoucang'].indexOf(id) >= 0 || (soldier && this.weapon === 'sword')) {
            const shield = makeNode('Shield', this.leftArm, -2, -17).addComponent(Graphics);
            shield.fillColor = new Color('#4D6774'); shield.roundRect(-12, -16, 24, 32, 9); shield.fill();
            shield.strokeColor = new Color('#D6BC83'); shield.lineWidth = 3; shield.roundRect(-12, -16, 24, 32, 9); shield.stroke();
        }
        this.head = makeNode('Head', this.body, 0, 34); const h = this.head.addComponent(Graphics);
        polygon(h,[[-25,17],[-31,-1],[-23,-22],[0,-29],[25,-20],[30,1],[22,21]],id==='zhaoyun'||id==='machao'?new Color('#D6E7F2'):armor);
        if(!this.rear){
            polygon(h,[[-22,11],[-23,-7],[-12,-22],[12,-23],[24,-7],[21,12],[0,18]],new Color(id==='guanyu'?'#D87554':id==='zhangfei'?'#D89A5E':'#F5C389'));
            h.fillColor=new Color(id==='guanyu'?'#AC483F':'#DD9F65');h.moveTo(5,9);h.lineTo(17,-14);h.lineTo(5,-19);h.lineTo(-3,-4);h.close();h.fill();
            h.fillColor=new Color('#FFF9E7');h.moveTo(-19,5);h.lineTo(-4,2);h.lineTo(-5,-4);h.lineTo(-17,-3);h.close();h.fill();h.moveTo(4,2);h.lineTo(19,6);h.lineTo(17,-3);h.lineTo(5,-4);h.close();h.fill();
            h.fillColor=ink;h.rect(-10,-3,4,8);h.rect(9,-3,4,8);h.fill();
            h.strokeColor=ink;h.lineWidth=4;h.moveTo(-22,11);h.lineTo(-4,6);h.moveTo(4,6);h.lineTo(22,12);h.stroke();
            h.lineWidth=2;h.moveTo(0,3);h.lineTo(-3,-8);h.lineTo(3,-8);h.stroke();
            polygon(h,[[-12,-13],[13,-12],[8,-20],[-6,-21]],new Color('#FFF8DD'));
            h.strokeColor=new Color('#FFEAAD');h.lineWidth=2;h.moveTo(-22,-4);h.lineTo(-16,-10);h.moveTo(-23,-7);h.lineTo(-17,-13);h.stroke();
        }else{
            polygon(h,[[-24,5],[-23,-20],[0,-29],[23,-20],[25,5]],new Color('#25314B'));
            h.strokeColor=new Color('#D9C28D');h.lineWidth=4;h.moveTo(0,-18);h.lineTo(0,23);h.stroke();
        }
        h.fillColor = new Color(tier === 4 || boss ? '#D8B46B' : '#596C78'); h.roundRect(-25, 13, 50, 6, 3); h.fill();
        if (boss) {
            h.moveTo(-18, 19); h.lineTo(-29, 35); h.lineTo(-5, 23); h.close(); h.fill();
            h.moveTo(18, 19); h.lineTo(29, 35); h.lineTo(5, 23); h.close(); h.fill();
        }
        if (!this.rear && ['guanyu', 'zhangfei', 'caocao', 'huangzhong', 'huatuo'].indexOf(id) >= 0) {
            h.fillColor = new Color(id === 'huangzhong' || id === 'huatuo' ? '#D9DFD6' : '#253637');
            h.moveTo(-14, -9); h.lineTo(14, -9); h.lineTo(0, id === 'guanyu' ? -42 : -29); h.close(); h.fill();
            if (id === 'zhangfei') { h.strokeColor = new Color('#232C2D'); h.lineWidth = 4; h.moveTo(-14, 7); h.lineTo(-4, 3); h.moveTo(4, 3); h.lineTo(14, 7); h.stroke(); }
        }
        if (id === 'lvbu') {
            h.strokeColor = new Color('#D8A65B'); h.lineWidth = 4;
            h.moveTo(-11, 21); h.bezierCurveTo(-5, 91, -76, 99, -54, 42); h.stroke();
            h.moveTo(11, 21); h.bezierCurveTo(5, 91, 76, 99, 54, 42); h.stroke();
        } else if (id === 'zhugeliang' || id === 'simayi' || id === 'caocao' || id === 'jiaxu' || id === 'sunquan') {
            h.fillColor = new Color(id === 'zhugeliang' ? '#304B62' : '#2C2A3A'); h.roundRect(-18, 17, 36, 24, 5); h.fill();
            h.strokeColor = new Color('#C9B87F'); h.lineWidth = 2; h.moveTo(-18, 22); h.lineTo(18, 22); h.stroke();
        } else if (id === 'zhaoyun' || id === 'machao' || id === 'zhangliao' || id === 'sunce') {
            h.fillColor = new Color(id === 'machao' ? '#E9D28F' : '#E6ECE9');
            h.moveTo(-10, 22); h.quadraticCurveTo(-19, 56, 15, 43); h.lineTo(8, 22); h.close(); h.fill();
        } else if (id === 'diaochan' || id === 'sunshangxiang' || id === 'caiwenji') {
            h.fillColor = new Color('#C99BB1'); h.circle(-23, 16, 9); h.circle(23, 16, 9); h.fill();
            h.strokeColor = new Color('#E7BCD2'); h.lineWidth = 3; h.moveTo(-23, 9); h.quadraticCurveTo(-40, -3, -29, -26); h.stroke();
        }
        this.weaponNode = makeNode('SignatureWeapon', this.rightArm, 0, -23);
        this.weaponNode.setScale(this.unit.signature?1.32:soldier?1:1.12,this.unit.signature?1.32:soldier?1:1.12,1);
        if(this.unit.signature){
            const glow=makeNode('ExclusiveWeaponGlow',this.weaponNode).addComponent(Graphics);glow.strokeColor=new Color('#FFD65377');glow.lineWidth=12;glow.moveTo(3,-10);glow.lineTo(3,76);glow.stroke();
            const sig=makeNode('SignatureSeal',this.body,0,-45).addComponent(Graphics);sig.strokeColor=new Color('#FFD474');sig.lineWidth=3;sig.ellipse(0,0,46,15);sig.stroke();sig.moveTo(-44,0);sig.lineTo(-57,0);sig.moveTo(44,0);sig.lineTo(57,0);sig.stroke();
        }
        const w = this.weaponNode.addComponent(Graphics); w.fillColor = new Color('#DFEAE8'); w.strokeColor = new Color('#D9E5E3'); w.lineWidth = 3;
        if (this.weapon === 'bow') {
            w.strokeColor = new Color(id === 'huangzhong' ? '#D3AD55' : '#BA9270'); w.lineWidth = 4; w.arc(7, 15, id === 'huangzhong' ? 35 : 29, -1.2, 1.2, false); w.stroke();
            w.strokeColor = new Color('#E8D9A7'); w.lineWidth = 1.5; w.moveTo(18, -14); w.lineTo(18, 44); w.stroke(); w.moveTo(5, 15); w.lineTo(45, 15); w.stroke();
        } else if (['spear', 'glaive', 'serpent', 'halberd'].indexOf(this.weapon) >= 0) {
            w.strokeColor = new Color(this.weapon === 'serpent' ? '#33323B' : '#B99B6C'); w.lineWidth = 4; w.moveTo(4, -19); w.lineTo(4, 79); w.stroke();
            w.fillColor = new Color(this.weapon === 'halberd' ? '#E6D398' : '#D8E8E8');
            if (this.weapon === 'serpent') { w.strokeColor = new Color('#D4E5E0'); w.lineWidth = 5; w.moveTo(4, 69); w.bezierCurveTo(-11, 77, 16, 87, 4, 101); w.stroke(); }
            else { w.moveTo(4, 98); w.lineTo(-3, 75); w.lineTo(11, 75); w.close(); w.fill(); }
            if (this.weapon === 'glaive') { w.moveTo(4, 48); w.quadraticCurveTo(40, 52, 25, 91); w.quadraticCurveTo(18, 65, 4, 71); w.close(); w.fill(); }
            if (this.weapon === 'halberd') { w.lineWidth = 4; w.arc(-7, 68, 14, -1.3, 1.3, false); w.stroke(); w.arc(15, 68, 14, 1.8, 4.5, false); w.stroke(); }
            if (id === 'dianwei') { w.strokeColor = new Color('#D5D9C6'); w.lineWidth = 3; w.moveTo(-15, -8); w.lineTo(-15, 76); w.stroke(); w.moveTo(-15, 88); w.lineTo(-21, 69); w.lineTo(-9, 69); w.close(); w.fill(); w.arc(-24, 62, 12, -1.2, 1.2, false); w.stroke(); }
            if (id === 'zhaoyun' || id === 'machao') { w.fillColor = new Color('#CC6B65'); w.moveTo(4, 73); w.lineTo(-18, 61); w.lineTo(4, 57); w.close(); w.fill(); }
        } else if (this.weapon === 'fan') {
            w.fillColor = new Color(id === 'simayi' ? '#434456' : '#E5EBDC');
            for (let i = 0; i < 5; i++) { const x = -19 + i * 10; w.moveTo(0, 0); w.quadraticCurveTo(x - 8, 30, x, 47); w.quadraticCurveTo(x + 9, 33, 0, 0); w.fill(); }
            w.strokeColor = new Color('#8CA8A0'); w.lineWidth = 1.5; [-15, -5, 5, 15].forEach(x => { w.moveTo(0, 0); w.lineTo(x, 39); w.stroke(); });
        } else if (this.weapon === 'axe') {
            w.strokeColor = new Color('#B89C76'); w.lineWidth = 5; w.moveTo(0, -14); w.lineTo(0, 67); w.stroke();
            w.moveTo(0, 53); w.lineTo(28, 74); w.quadraticCurveTo(45, 45, 27, 30); w.lineTo(0, 42); w.close(); w.fill();
        } else if (this.weapon === 'ribbon') {
            w.strokeColor = new Color('#E3AAC7'); w.lineWidth = 7; w.moveTo(0, -5); w.bezierCurveTo(63, 12, -20, 76, 45, 57); w.stroke();
            w.strokeColor = new Color('#EDD3CA'); w.lineWidth = 3; w.moveTo(-25, -5); w.bezierCurveTo(-69, 29, -3, 71, -43, 46); w.stroke();
        } else if (this.weapon === 'qin') {
            w.fillColor = new Color('#765341'); w.roundRect(-12, -6, 32, 58, 9); w.fill(); w.strokeColor = new Color('#E0C98D'); w.lineWidth = 1.5;
            [-5, 1, 7, 13].forEach(x => { w.moveTo(x, 0); w.lineTo(x, 46); w.stroke(); });
        } else if (this.weapon === 'staff' && id === 'huanggai') {
            w.strokeColor = new Color('#AEB9B8'); w.lineWidth = 7; w.moveTo(0, -12); w.lineTo(0, 65); w.stroke();
            w.strokeColor = new Color('#4B5C67'); w.lineWidth = 2; for (let y = 8; y < 64; y += 8) { w.moveTo(-5, y); w.lineTo(5, y); w.stroke(); }
        } else if (this.weapon === 'staff') {
            w.strokeColor = new Color('#C7A76D'); w.lineWidth = 5; w.moveTo(0, -15); w.lineTo(0, 60); w.stroke();
            w.fillColor = new Color('#ADD2B6'); w.circle(0, 62, 10); w.fill(); w.strokeColor = new Color('#DCD39E'); w.circle(0, 62, 15); w.stroke();
        } else {
            const blade = (x: number, height: number) => { w.moveTo(x - 4, 3); w.lineTo(x - 6, height - 12); w.lineTo(x + 2, height); w.lineTo(x + 10, height - 12); w.lineTo(x + 7, 3); w.close(); w.fill(); };
            blade(0, id === 'caocao' ? 64 : 55); if (this.weapon === 'dual') blade(-19, 44);
            w.fillColor = new Color('#CDAA65'); w.roundRect(-10, -2, 24, 6, 2); w.fill();
            if (id === 'zhouyu' || id === 'luxun') { w.strokeColor = new Color('#EDAD6E'); w.lineWidth = 3; w.moveTo(3, 4); w.lineTo(3, 55); w.stroke(); }
        }
    }

    private wallModel(): void {
        const g = this.body.addComponent(Graphics);
        // The near plane is the left-facing gate; the narrow rear plane reaches the right edge.
        g.fillColor = new Color('#65727C'); g.moveTo(-110, -145); g.lineTo(-32, -115); g.lineTo(-32, 110); g.lineTo(-110, 145); g.close(); g.fill();
        g.fillColor = new Color('#404D59'); g.moveTo(-32, -115); g.lineTo(30, -130); g.lineTo(30, 128); g.lineTo(-32, 110); g.close(); g.fill();
        g.strokeColor = new Color('#9CA7AC'); g.lineWidth = 2;
        for (let y = -120; y < 135; y += 30) { g.moveTo(-108, y); g.lineTo(-34, y - 27); g.stroke(); }
        for (let y = -105; y < 110; y += 32) { g.moveTo(-30, y); g.lineTo(29, y + 12); g.stroke(); }
        g.fillColor = new Color('#17222E'); g.moveTo(-100, -126); g.lineTo(-43, -105); g.lineTo(-43, -9); g.quadraticCurveTo(-69, 40, -100, 11); g.close(); g.fill();
        g.fillColor = new Color('#775B44'); g.moveTo(-94, -124); g.lineTo(-47, -106); g.lineTo(-47, -7); g.quadraticCurveTo(-70, 29, -94, 8); g.close(); g.fill();
        g.strokeColor = new Color('#CBB77A'); g.lineWidth = 3;
        g.moveTo(-71, -115); g.lineTo(-71, 18); g.stroke(); g.moveTo(-94, -44); g.lineTo(-48, -59); g.stroke();
        g.circle(-82, -45, 5); g.stroke(); g.circle(-59, -53, 5); g.stroke();
        g.fillColor = new Color('#89959E'); g.moveTo(-115, 143); g.lineTo(-30, 165); g.lineTo(34, 128); g.lineTo(-32, 110); g.close(); g.fill();
        [-108, -79, -50].forEach(x => { g.rect(x, 140, 19, 24); g.fill(); });
        g.fillColor = new Color('#816A52'); g.rect(-70, 158, 92, 55); g.fill();
        g.strokeColor = new Color('#D8BC7C'); g.lineWidth = 4; [-59, -25, 10].forEach(x => { g.moveTo(x, 158); g.lineTo(x, 213); g.stroke(); });
        g.fillColor = new Color('#4D303B'); g.moveTo(-88, 210); g.lineTo(-24, 246); g.lineTo(42, 211); g.close(); g.fill();
        g.strokeColor = new Color('#CDA86F'); g.lineWidth = 3; g.moveTo(-91, 210); g.lineTo(-24, 246); g.lineTo(44, 211); g.stroke();
        g.moveTo(21, 128); g.lineTo(21, 218); g.stroke();
        g.fillColor = new Color('#B86150'); g.moveTo(21, 216); g.lineTo(-15, 199); g.lineTo(21, 183); g.close(); g.fill();
    }
}
