import { weaponPresentation } from '../data/WeaponPresentation';
import { comicHead } from './ComicHead';
import { heroColor, isFemaleHero } from '../data/HeroIdentity';
import { enemyUniform } from '../data/EnemyCatalog';
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
    private statusAura:Graphics;
    private clock = 0;
    private weaponGlow:UIOpacity|null=null;
    private action = 0;
    private hit = 0;
    private dying = false;
    private goalX: number;
    private goalY: number;
    private scale: number;
    private face: number;
    private rubble = false;private rubbleArt:Node|null=null;
    private rear: boolean;
    private compact: boolean;
    private readonly female: boolean;
    private fallSpeed = 0;private walkBlend=0;
    private cape:Node|null=null;private motionInk!:Graphics;private attackX=1;private attackY=0;private strong=false;private headBase=1;

    constructor(parent: Node, unit: Unit, x: number, y: number, fromX: number, fromY: number, scale = 1, face = 1, rear = false, compact = false) {
        this.rear = rear; this.compact = compact;
        this.female = isFemaleHero(unit.visualId || unit.id);
        this.unit = unit; this.goalX = x; this.goalY = y; this.scale = scale; this.face = face;
        this.node = makeNode(unit.id, parent, fromX, fromY);
        this.node.addComponent(UITransform).setContentSize(100, 116);
        this.opacity = this.node.addComponent(UIOpacity);
        this.shadow = makeNode('Shadow', this.node, 0, -42 * scale);
        const shadow = this.shadow.addComponent(Graphics);
        shadow.fillColor = new Color(0, 0, 0, 65); shadow.ellipse(0, 0, 31 * scale, 8 * scale); shadow.fill();
        this.statusAura=makeNode('StatusAura',this.node,0,-35*scale).addComponent(Graphics);
        this.body = makeNode('JointedBody', this.node);
        this.body.setScale(unit.kind==='wall'?1:face * scale, scale, 1);
        if (unit.visualId === 'delve-jar') this.jarModel();
        else if (unit.kind === 'wall') this.wallModel();
        else this.personModel();
        this.motionInk=makeNode('ComicMotionInk',this.node).addComponent(Graphics);
        this.buffIcons = makeNode('BuffIcons', this.node, 37, 20).addComponent(Graphics);
        const health = makeNode('Health', this.node, 0, unit.kind === 'boss' ? -125 : compact ? scale >= 0.95 ? -68 : -55 : scale >= 1.05 ? -82 : -69);
        this.hp = health.addComponent(Graphics);
        this.hpText = text(this.node, 'HpText', '', 0, unit.kind === 'boss' ? -143 : compact ? scale >= 0.95 ? -82 : -70 : scale >= 1.05 ? -97 : -84, unit.formationSpot ? 11 : 13, '#B1C4D6', unit.kind === 'boss' ? 220 : unit.formationSpot ? 74 : 110);
        text(this.node, 'Name', unit.name, 0, unit.kind === 'boss' ? 196 : compact ? scale >= 0.95 ? -54 : -40 : scale >= 1.05 ? -66 : -53, unit.kind === 'boss' ? 26 : unit.formationSpot ? 16 : 18,
            unit.kind === 'soldier' ? '#B4C3CE' : unit.heroTier === 4 ? '#F4D27E' : unit.heroTier === 3 ? '#DDC3EF' : '#F3DFC0', unit.kind === 'boss' ? 250 : unit.formationSpot ? 80 : 118);
        if (unit.kind === 'wall' && unit.visualId !== 'delve-jar') { health.active = false; this.hpText.node.active = false; this.node.getChildByName('Name')!.active = false; }
    }

    get impactPoint(): {x:number;y:number} {
        let x=this.node.position.x+this.body.position.x-(this.unit.kind==='wall'&&this.unit.visualId!=='delve-jar'?65:0),y=this.node.position.y+this.body.position.y-(this.unit.kind==='wall'&&this.unit.visualId!=='delve-jar'?25:0);
        let parent=this.node.parent;
        while(parent&&parent.name!=='Units'){x=x*parent.scale.x+parent.position.x;y=y*parent.scale.y+parent.position.y;parent=parent.parent;}
        return{x,y};
    }
    placeOnLane(x: number, y = this.node.position.y): void {
        this.goalX = x; this.goalY = y;
        this.node.setPosition(x, y, 0);
    }
    setGoal(x: number, y: number): void { this.goalX = x; this.goalY = y; }
    fallTo(x: number, y: number): void { this.goalX = x; this.goalY = y; this.fallSpeed = 20; }
    get moving(): boolean { return Math.abs(this.node.position.x - this.goalX) + Math.abs(this.node.position.y - this.goalY) > 2; }
    get weapon(): WeaponKind { return weaponPresentation(this.unit).weapon; }
    attack(targetX?:number,targetY?:number,strong=false): void { this.action = .48;this.strong=strong;const dx=targetX===undefined?this.face:targetX-this.impactPoint.x,dy=targetY===undefined?0:targetY-this.impactPoint.y;const length=Math.max(1,Math.hypot(dx,dy));this.attackX=dx/length;this.attackY=dy/length; }
    hurt(critical=false): void { this.hit = critical?.3:.23; }
    die(): void { this.dying = true; }
    breakWall(): void {
        if(this.rubble)return;this.rubble=true;this.body.active=false;
        const debris=this.rubbleArt=makeNode('BrokenMasonry',this.node),g=debris.addComponent(Graphics);
        const stone=(points:number[][],fill:string)=>{g.fillColor=new Color(fill);g.strokeColor=new Color('#493C38');g.lineWidth=3;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
        if (this.unit.visualId === 'delve-jar') {
            const shards = [[-61,-30],[-27,-37],[9,-39],[53,-28],[-12,-22]];
            shards.forEach(([x,y],i) => stone([[x-11,y-7],[x-6,y+13+i*2],[x+12,y+2],[x+13,y-9]], i%2 ? '#E99460' : '#9D383A'));
            this.shadow.active = false;
            return;
        }
        // Irregular wall stumps and scattered material, never a compressed intact gate.
        stone([[-118,-275],[-118,-190],[-103,-190],[-103,-213],[-85,-213],[-85,-242],[-64,-242],[-64,-275]],'#B5A188');
        stone([[4,-275],[4,-214],[17,-214],[17,-176],[36,-176],[36,-198],[51,-198],[51,-275]],'#968570');
        g.fillColor=new Color('#41322B55');g.ellipse(-29,-275,103,15);g.fill();
        const blocks=[[-83,-259,30,21,-12],[-42,-258,36,22,15],[-4,-262,33,22,-19],[33,-267,25,20,9],[-62,-238,29,23,18],[-24,-237,32,24,-13],[-91,-278,31,16,-4],[-5,-281,34,17,7],[55,-281,24,15,-20],[-133,-284,21,13,12]];
        for(const [x,y,w,h,angle] of blocks){const a=angle*Math.PI/180,c=Math.cos(a),q=Math.sin(a);stone([[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>[x+dx*c-dy*q,y+dx*q+dy*c]),'#C9B99A');}
        stone([[-86,-249],[-80,-240],[21,-268],[18,-278]],'#94533C');
        stone([[-53,-277],[-48,-283],[-2,-231],[-10,-228]],'#7C4434');
        g.strokeColor=new Color('#493C38');g.lineWidth=4;g.moveTo(-102,-224);g.lineTo(-111,-240);g.lineTo(-104,-249);g.moveTo(28,-207);g.lineTo(18,-223);g.lineTo(28,-239);g.stroke();
        this.shadow.active=false;
    }

    update(dt: number, march: boolean): void {
        this.clock += dt;if(this.weaponGlow)this.weaponGlow.opacity=Math.round(155+100*(.5+.5*Math.sin(this.clock*4)));
        this.drawStatus();
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
            this.body.setScale(1,1,1);
            this.body.setPosition(this.unit.visualId === 'delve-jar' ? Math.sin(this.hit * 75) * this.hit * 33 : 0,0,0);
            this.opacity.opacity=255;
            return;
        }
        if (this.dying) {
            this.body.angle += (-84*this.face - this.body.angle) * Math.min(1, dt * 8);
            this.opacity.opacity = Math.max(55, this.opacity.opacity - dt * 600);
            this.body.setPosition(0, -14);
            return;
        }
        const walking = march || this.moving;
        this.walkBlend+=((walking?1:0)-this.walkBlend)*Math.min(1,dt*11);
        const stride = Math.sin(this.clock * 12 + this.goalY * .02),walk=this.walkBlend;
        const progress=this.action>0?1-this.action/.48:1;
        const strike=this.action>0?(progress<.18?progress/.18:Math.pow(Math.max(0,1-(progress-.18)/.82),2)):0;
        const recoil=this.hit>0?Math.sin(Math.min(1,this.hit/.23)*Math.PI/2):0;
        const power=this.strong?1.45:1;
        this.leftLeg.angle = stride*38*walk-strike*13;
        this.rightLeg.angle = -stride*38*walk+strike*18;
        if (this.female) {
            const step = stride * walk;
            this.leftLeg.setPosition(-13 + step * 9, -23 + Math.max(0, step) * 8);
            this.rightLeg.setPosition(13 - step * 9, -23 + Math.max(0, -step) * 8);
        }
        this.leftArm.angle = -stride*27*walk+strike*28+Math.sin(this.clock*2)*4*(1-walk);
        this.rightArm.angle = this.weapon === 'bow' ? strike*49 : -strike*142+(stride*22*walk-15*(1-walk));
        this.weaponNode.angle = (this.rear&&this.weapon==='bow'?90:0)+(this.weapon==='fan'?strike*72:['spear','glaive','serpent','halberd'].indexOf(this.weapon)>=0?-strike*57:0);
        const lunge=strike*power*(this.weapon==='bow'?8:22);
        this.body.setPosition(this.attackX*lunge-this.face*recoil*12,this.attackY*lunge+(Math.abs(stride)*7*walk+Math.sin(this.clock*2)*1.8*(1-walk)));
        this.body.angle=this.hit>0?this.face*recoil*10:-this.face*strike*5-this.face*walk*4;
        this.head.angle=stride*5*walk-strike*12+recoil*8;
        this.torso.angle=-strike*13;
        this.head.setScale(this.headBase*(1+recoil*.06),this.headBase*(1-recoil*.05),1);
        this.body.setScale(this.face*this.scale*(1+strike*.12+recoil*.16),this.scale*(1-strike*.065-recoil*.12+(Math.abs(stride)*.035*walk+Math.sin(this.clock*2)*.012*(1-walk))),1);
        if(this.cape){this.cape.angle=stride*-9*walk+strike*14;this.cape.setScale(1+strike*.22,1,1);}
        const ink=this.motionInk;ink.clear();
        if(walk>.12){
            ink.fillColor=new Color('#F3DBC5A0');ink.strokeColor=new Color('#4D3D3980');ink.lineWidth=2;
            for(let i=0;i<3;i++){const q=(this.clock*2+i*.33)%1;const x=-this.face*(18+q*38),y=-42+Math.sin(q*Math.PI)*7;ink.ellipse(x,y,4+q*8,2+q*3);ink.fill();ink.stroke();}
        }
        if(strike>.55&&this.weapon!=='bow'){
            ink.strokeColor=new Color('#FFF3CF99');ink.lineWidth=7;ink.arc(this.attackX*25,this.attackY*25+22,54,-1.2,1.1,false);ink.stroke();
        }
    }

    private drawStatus():void {
        const g=this.statusAura;g.clear();const u=this.unit;if(u.hp<=0)return;
        const t=this.clock;
        const ring=(color:string,r:number)=>{g.strokeColor=new Color(color);g.lineWidth=5;g.ellipse(0,0,r*this.scale,12*this.scale);g.stroke();};
        if(u.healGlowRemaining>0){g.fillColor=new Color('#55DC8B30');g.ellipse(0,45*this.scale,42*this.scale,70*this.scale);g.fill();g.strokeColor=new Color('#8DFFB9CC');g.lineWidth=5;g.ellipse(0,45*this.scale,42*this.scale,70*this.scale);g.stroke();ring('#79F0B1',35+Math.sin(t*5)*4);g.strokeColor=new Color('#BAFFD1');g.lineWidth=5;for(let i=0;i<6;i++){const x=Math.sin(t*2+i*1.57)*30;const y=12+(t*18+i*17)%65;g.moveTo(x-4,y);g.lineTo(x+4,y);g.moveTo(x,y-4);g.lineTo(x,y+4);g.stroke();}}
        if(u.shield>0){ring('#79D6F0',39);g.strokeColor=new Color('#B4EBFF99');g.lineWidth=2;g.ellipse(0,37*this.scale,37*this.scale,58*this.scale);g.stroke();}
        if(u.attackBuff>0)ring('#FFD06E',42);
        if(u.slowRemaining>0){g.fillColor=new Color('#75C5F04D');g.ellipse(0,35*this.scale,38*this.scale,55*this.scale);g.fill();ring('#9DE8FF',40);g.strokeColor=new Color('#D1F4FF');g.lineWidth=2;for(let i=0;i<4;i++){const x=-26+i*17;g.moveTo(x,-2);g.lineTo(x+3,13);g.lineTo(x+9,-2);g.stroke();}}
        if(u.burnRemaining>0){g.fillColor=new Color('#F59E4499');for(let i=0;i<5;i++){const x=-30+i*14;const h=20+Math.sin(t*7+i)*9;g.moveTo(x,0);g.quadraticCurveTo(x-6,h,x+3,h+10);g.quadraticCurveTo(x+16,h,x+9,0);g.close();g.fill();}}
        if(u.poisonRemaining>0){ring('#A5D66F',38);g.strokeColor=new Color('#C495DD');g.lineWidth=2;for(let i=0;i<4;i++)g.circle(Math.sin(t*2+i)*24,15+(t*15+i*19)%60,4);g.stroke();}
    }

    private personModel(): void {
        const id = this.unit.visualId || this.unit.id;
        const tier = this.unit.kind==='boss'?4:this.unit.heroTier || 1;
        const boss = this.unit.kind === 'boss'; const soldier = this.unit.kind === 'soldier'&&!this.unit.elite;
        const comic:Record<string,string>={guanyu:'#168D63',zhangfei:'#C95332',zhaoyun:'#58A7ED',zhugeliang:'#8054C9',lvbu:'#C73148',caocao:'#4D3E92',zhouyu:'#ED6736',simayi:'#5850A1',huatuo:'#4FB58D',sunce:'#EB972F',diaochan:'#D65C9A'};
        const uniform = this.unit.team === 'enemy' && this.unit.kind === 'soldier'
            ? enemyUniform(id, this.unit.weapon) : undefined;
        const armor = new Color(uniform?.color || heroColor(id, this.unit.color));
        const ink = new Color('#171B2A');
        const polygon=(g:Graphics,points:number[][],fill:Color)=>{g.fillColor=fill;g.strokeColor=ink;g.lineWidth=5;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
        if(boss){
            const pressure=makeNode('BossDreadSilhouette',this.body).addComponent(Graphics);pressure.fillColor=new Color('#321D3A55');pressure.strokeColor=new Color('#251D36');pressure.lineWidth=3;
            pressure.moveTo(-45,-28);pressure.lineTo(-71,3);pressure.lineTo(-52,10);pressure.lineTo(-75,45);pressure.lineTo(-45,34);pressure.lineTo(-52,77);pressure.lineTo(0,53);pressure.lineTo(52,77);pressure.lineTo(45,34);pressure.lineTo(75,45);pressure.lineTo(52,10);pressure.lineTo(71,3);pressure.lineTo(45,-28);pressure.close();pressure.fill();pressure.stroke();
        }
        if(this.unit.elite){const marker=makeNode('EliteMarker',this.body,0,-43).addComponent(Graphics);marker.strokeColor=new Color('#F4AD55');marker.lineWidth=4;marker.ellipse(0,0,39,12);marker.stroke();marker.fillColor=new Color('#EBA951');marker.moveTo(-8,102);marker.lineTo(0,111);marker.lineTo(8,102);marker.lineTo(0,93);marker.close();marker.fill();}
        if (tier >= 3) {
            const aura = makeNode('EliteAura', this.body, 0, -39).addComponent(Graphics);
            aura.strokeColor = new Color(tier === 4 ? '#DAC17577' : '#B5A3D966'); aura.lineWidth = tier === 4 ? 4 : 2;
            aura.ellipse(0, 0, tier === 4 ? 42 : 34, 12); aura.stroke();
        }
        if (!soldier) {
            this.cape=makeNode('SignatureCape',this.body);const cape=this.cape.addComponent(Graphics);
            cape.fillColor = new Color(id === 'lvbu' || id === 'zhouyu' ? '#8E3F43' : id === 'zhaoyun' || id === 'machao' ? '#D5E0DE' : this.unit.color);
            polygon(cape,[[-18,25],[-42,-34],[-22,-31],[-28,-48],[10,-37],[42,-44],[24,25]],new Color(id==='lvbu'||id==='zhouyu'?'#A82D45':comic[id]||this.unit.color));
            cape.strokeColor = new Color(tier === 4 ? '#E7C879' : '#BCCFC377'); cape.lineWidth = 2; cape.moveTo(-17, 24); cape.lineTo(-32, -42); cape.lineTo(32, -42); cape.stroke();
        }
        const limb = (name: string, x: number, y: number, leg: boolean): Node => {
            const node = makeNode(name, this.body, x, y); const g = node.addComponent(Graphics);
            if (leg && this.female) {
                polygon(g, [[-6,4],[7,4],[7,-25],[-7,-25]], new Color('#424A66'));
                polygon(g, [[-8,-20],[8,-20],[15,-33],[-9,-33]], new Color('#23263C'));
                g.strokeColor = new Color('#E9C989'); g.lineWidth = 3;
                g.moveTo(-5,-21); g.lineTo(6,-21); g.stroke();
                return node;
            }
            polygon(g,[[-7,3],[8,0],[9,-23],[-9,-25]],leg ? new Color(uniform?.lining || '#334058') : armor);
            polygon(g,[[-9,-19],[9,-20],[17,-31],[-11,-31]],leg ? new Color('#1B2034') : new Color(uniform?.trim || '#EDB77D'));return node;
        };
        this.leftLeg = limb('LeftLeg', -10, this.female ? -23 : -13, true); this.rightLeg = limb('RightLeg', 10, this.female ? -23 : -13, true);
        this.torso = makeNode('ArmoredTorso', this.body); const g = this.torso.addComponent(Graphics);
        polygon(g,[[-26,29],[-35,13],[-22,-10],[-20,-28],[21,-28],[23,-9],[35,13],[26,29]],armor);
        polygon(g, [[-19, 20], [0, 27], [20, 19], [14, -12], [0, -21], [-14, -12]],
            new Color(uniform?.lining || (this.rear ? '#34466B' : tier === 4 ? '#522D48' : '#314466')));
        const trim = new Color(uniform?.trim || '#F2CF78');
        if (!uniform || uniform.style === 'plates') {
            g.strokeColor = trim;
            g.lineWidth = 3;
            for (const y of [-4, 6, 16]) {
                g.moveTo(-13, y); g.lineTo(0, y - 5); g.lineTo(13, y); g.stroke();
            }
            if (uniform) {
                polygon(g, [[-32, 22], [-22, 25], [-17, 9], [-30, 5]], trim);
                polygon(g, [[32, 22], [22, 25], [17, 9], [30, 5]], trim);
            }
        } else if (uniform.style === 'coat') {
            polygon(g, [[-17, 21], [3, 28], [5, -26], [-20, -35], [-22, -8]], armor);
            g.strokeColor = trim;
            g.lineWidth = 3;
            g.moveTo(2, 24); g.lineTo(2, -14);
            g.moveTo(-21, -25); g.lineTo(21, -25); g.stroke();
        } else if (uniform.style === 'straps') {
            polygon(g, [[-24, 21], [-17, 27], [20, -8], [17, -16]], trim);
            polygon(g, [[20, 23], [26, 16], [-17, -14], [-22, -8]], new Color(uniform.belt));
        } else if (uniform.style === 'fur') {
            polygon(g, [[-37, 20], [-26, 31], [-13, 26], [-2, 17], [12, 24], [27, 31],
                [39, 17], [33, 7], [23, 13], [15, 7], [5, 12], [-4, 4], [-15, 11], [-25, 5]], trim);
        } else if (uniform.style === 'robe') {
            polygon(g, [[-17, 24], [-4, 19], [9, -28], [-19, -33], [-18, -4]], armor);
            g.strokeColor = trim;
            g.lineWidth = 3;
            g.moveTo(-5, 18); g.lineTo(10, -18);
            g.moveTo(13, 16); g.lineTo(2, -12); g.stroke();
        } else {
            polygon(g, [[-23, 25], [-12, 28], [23, -9], [16, -17]], trim);
            polygon(g, [[14, -18], [23, -15], [35, -34], [16, -28]], armor);
        }
        polygon(g, [[-25, -17], [25, -17], [22, -28], [-22, -28]],
            new Color(this.unit.elite ? '#E7B448' : uniform?.belt || '#E7B448'));
        g.fillColor = uniform && !this.unit.elite ? trim : new Color('#FFE6A7');
        g.circle(0, -22, uniform ? 4 : 5); g.fill();
        if(!soldier){
            const shoulder = uniform ? trim : new Color(tier >= 3 ? '#E9B94E' : '#899DB4');
            polygon(g,[[-18,25],[-32,35],[-45,23],[-41,7],[-23,12]],shoulder);
            polygon(g,[[18,25],[32,35],[45,23],[41,7],[23,12]],shoulder);
            if(tier>=3){polygon(g,[[-34,33],[-41,47],[-45,23]],shoulder);polygon(g,[[34,33],[41,47],[45,23]],shoulder);}
        }
        if (id === 'chapter-protagonist') {
            polygon(g, [[-44,18],[-34,37],[-17,36],[-20,8],[-39,3]],new Color('#D99058'));
            polygon(g, [[16,26],[31,38],[48,22],[43,9],[24,10]],new Color('#62A9B0'));
            polygon(g, [[-14,16],[1,24],[15,16],[14,-5],[1,-14],[-13,-6]],new Color('#F1C770'));
            polygon(g, [[-6,10],[1,15],[8,10],[1,0]],new Color('#34758E'));
        }
        this.leftArm = limb('LeftArm', -25, 19, false); this.rightArm = limb('RightArm', 25, 19, false);
        if (['chapter-protagonist', 'caohong', 'chengpu', 'huanggai', 'zhoucang'].indexOf(id) >= 0 || uniform?.style === 'plates' || (soldier && this.weapon === 'sword')) {
            const shield = makeNode('Shield', this.leftArm, -2, -17).addComponent(Graphics);
            shield.fillColor = new Color('#4D6774'); shield.roundRect(-12, -16, 24, 32, 9); shield.fill();
            shield.strokeColor = new Color('#D6BC83'); shield.lineWidth = 3; shield.roundRect(-12, -16, 24, 32, 9); shield.stroke();
        }
        if(id==='world-dongzhuo'){g.fillColor=new Color('#D9A26A');g.ellipse(0,-2,24,24);g.fill();g.strokeColor=new Color('#8B4936');g.lineWidth=3;g.arc(0,0,17,3.5,5.9,false);g.stroke();}
        if(id==='world-zhangjiao'){g.fillColor=new Color('#D6B74E');g.moveTo(0,24);g.lineTo(-18,-22);g.lineTo(18,-22);g.close();g.fill();g.strokeColor=new Color('#574579');g.lineWidth=3;g.moveTo(0,13);g.lineTo(-7,-2);g.lineTo(5,-5);g.lineTo(-2,-20);g.stroke();}
        if(id==='world-menghuo'){g.fillColor=new Color('#E7D6A9');for(let i=0;i<5;i++){g.moveTo(-22+i*11,17);g.lineTo(-18+i*11,5);g.lineTo(-14+i*11,17);g.close();g.fill();}}
        this.head = comicHead(this.body, id, uniform?.color || this.unit.color, tier, this.rear, boss);this.headBase=soldier?1.06:boss?1.2:tier>=3?1.22:1.16;this.head.setScale(this.headBase,this.headBase,1);
        if(this.female){this.torso.setScale(.86,1,1);}
        if(boss){this.torso.setScale(id==='world-zhangjiao'?1.08:1.4,id==='world-zhangjiao'?1.3:1.15,1);this.leftArm.setScale(1.25,1.15,1);this.rightArm.setScale(1.25,1.15,1);}
        this.weaponNode = makeNode('SignatureWeapon', this.rightArm, 0, -23);
        const presentation=weaponPresentation(this.unit);this.weaponNode.setScale(presentation.scale,presentation.scale,1);
        if(presentation.exclusive){
            const glowNode=makeNode('ExclusiveBladeHalo',this.weaponNode);this.weaponGlow=glowNode.addComponent(UIOpacity);const glow=glowNode.addComponent(Graphics);
            const glowColor=this.unit.element==='lightning'?'#83DBFFC0':this.unit.element==='blizzard'?'#B4EEFFC0':this.unit.element==='fire'?'#FFAA56C0':this.unit.element==='poison'?'#C5E98AC0':'#BDFFD2C0';
            const edge=(g:Graphics)=>{
                if(this.weapon==='glaive'){g.moveTo(5,50);g.quadraticCurveTo(40,53,25,91);g.quadraticCurveTo(18,66,5,72);}
                else if(this.weapon==='serpent'){g.moveTo(4,69);g.bezierCurveTo(-11,77,16,87,4,101);}
                else if(this.weapon==='spear'){g.moveTo(-3,75);g.lineTo(4,98);g.lineTo(11,75);}
                else if(this.weapon==='halberd'){g.moveTo(-3,75);g.lineTo(4,98);g.lineTo(11,75);g.arc(-7,68,14,-1.3,1.3,false);g.moveTo(15,54);g.arc(15,68,14,1.8,4.5,false);}
                else if(this.weapon==='axe'){g.moveTo(28,74);g.quadraticCurveTo(45,45,27,30);}
                else if(this.weapon==='fan'){for(let i=0;i<5;i++){const x=-19+i*10;g.moveTo(x-4,36);g.quadraticCurveTo(x,49,x+5,38);}}
                else if(this.weapon==='bow'){g.arc(7,15,id==='huangzhong'?35:29,-1.2,1.2,false);}
                else if(this.weapon==='staff'){g.circle(0,62,12);}
                else if(this.weapon==='ribbon'){g.moveTo(18,55);g.quadraticCurveTo(31,64,45,57);g.moveTo(-26,42);g.lineTo(-43,46);}
                else if(this.weapon==='qin'){[-5,1,7,13].forEach(x=>{g.moveTo(x,7);g.lineTo(x,46);});}
                else{const h=id==='caocao'?64:55;g.moveTo(-5,12);g.lineTo(-6,h-12);g.lineTo(2,h);g.lineTo(10,h-12);if(this.weapon==='dual'){g.moveTo(-24,11);g.lineTo(-25,32);g.lineTo(-17,44);g.lineTo(-9,32);}}
            };
            glow.strokeColor=new Color(glowColor);glow.lineWidth=10;edge(glow);glow.stroke();
            const edgeNode=makeNode('ExclusiveBladeCore',this.weaponNode);const core=edgeNode.addComponent(Graphics);core.strokeColor=new Color('#EDFFF3');core.lineWidth=2;edge(core);core.stroke();
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
        if(presentation.exclusive){
            const detail=makeNode('ExclusiveWeaponEngraving',this.weaponNode).addComponent(Graphics);detail.strokeColor=new Color('#708B9D');detail.lineWidth=1.4;
            if(['spear','glaive','serpent','halberd'].indexOf(this.weapon)>=0){[14,34,55].forEach(y=>{detail.moveTo(0,y);detail.lineTo(8,y);detail.stroke();});if(this.weapon==='glaive'){detail.moveTo(11,62);detail.quadraticCurveTo(27,61,25,80);detail.stroke();}}
            else if(this.weapon==='sword'||this.weapon==='dual'){detail.moveTo(2,10);detail.lineTo(2,43);detail.stroke();}
            detail.fillColor=new Color('#E5BA61');detail.circle(3,1,7);detail.fill();detail.fillColor=new Color('#5AA8B6');detail.circle(3,1,3.5);detail.fill();
            this.weaponNode.getChildByName('ExclusiveBladeCore')!.setSiblingIndex(this.weaponNode.children.length-1);
        }
    }

    private jarModel(): void {
        const g = this.body.addComponent(Graphics);
        g.strokeColor = new Color('#341F34'); g.lineWidth = 6; g.fillColor = new Color('#A34A4B');
        g.moveTo(-27,47); g.bezierCurveTo(-26,31,-64,23,-60,-9); g.bezierCurveTo(-55,-64,55,-64,60,-9);
        g.bezierCurveTo(64,23,26,31,27,47); g.close(); g.fill(); g.stroke();
        g.fillColor = new Color('#D98758'); g.ellipse(0,48,35,11); g.fill(); g.stroke();
        g.fillColor = new Color('#F4C86A'); g.moveTo(0,31); g.lineTo(24,3); g.lineTo(0,-27); g.lineTo(-24,3); g.close(); g.fill(); g.stroke();
        g.strokeColor = new Color('#9B333C'); g.lineWidth = 4; g.moveTo(-8,10); g.lineTo(8,10); g.lineTo(8,-7); g.lineTo(-8,-7); g.close(); g.stroke();
    }

    private wallModel(): void {
        const g=this.body.addComponent(Graphics),ink=new Color('#332B35');
        const shape=(points:number[][],fill:string,width=4)=>{g.fillColor=new Color(fill);g.strokeColor=ink;g.lineWidth=width;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
        const box=(x:number,y:number,w:number,h:number,fill:string,r=0)=>{g.fillColor=new Color(fill);g.strokeColor=ink;g.lineWidth=4;if(r)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fill();g.stroke();};
        // An orthographic facade with a shallow right return: masonry stays square,
        // the left-facing entrance and both parapet shelves share the saved plan.
        shape([[20,-280],[55,-260],[55,280],[20,280]],'#8B7869');
        box(-116,-280,136,560,'#C3B49A');
        g.strokeColor=new Color('#998B79');g.lineWidth=2;
        for(let row=0;row<14;row++){
            const y=-267+row*38;g.moveTo(-113,y);g.lineTo(17,y);g.stroke();
            for(let x=-112+(row%2?25:0);x<17;x+=52){g.moveTo(x,y);g.lineTo(x,y+36);g.stroke();}
            g.moveTo(23,y+6);g.lineTo(52,y+22);g.stroke();
        }
        // Thick stone arch, timber double leaves, heavy iron straps and rivets.
        const arch=(left:number,right:number,bottom:number,spring:number,top:number,fill:string)=>{
            g.fillColor=new Color(fill);g.strokeColor=ink;g.lineWidth=5;g.moveTo(left,bottom);g.lineTo(left,spring);g.bezierCurveTo(left,top,right,top,right,spring);g.lineTo(right,bottom);g.close();g.fill();g.stroke();
        };
        arch(-105,8,-258,9,108,'#E7D8B8');arch(-92,-5,-258,9,83,'#312C35');arch(-87,-10,-254,7,73,'#9B5037');
        g.strokeColor=new Color('#612F2B');g.lineWidth=3;
        for(let x=-77;x<-10;x+=13){g.moveTo(x,-250);g.lineTo(x,x<-65?29:49);g.stroke();}
        g.strokeColor=ink;g.lineWidth=4;g.moveTo(-48,-251);g.lineTo(-48,56);g.stroke();
        for(const y of [-210,-118,-27]){
            box(-88,y,79,12,'#514F56',2);g.fillColor=new Color('#DEBA63');
            for(const x of [-80,-61,-36,-17]){g.circle(x,y+6,2.3);g.fill();}
        }
        g.strokeColor=new Color('#F1C363');g.lineWidth=4;for(const x of [-60,-36]){g.circle(x,-71,7);g.stroke();}
        box(-121,-283,151,22,'#E0C69D',3);
        // Separate upper/lower firing galleries; their walking surfaces are level.
        for(const y of [111,-164]){
            box(-78,y-17,132,17,'#796C60');box(-88,y,148,14,'#E8D6B3',3);
            for(let i=0;i<4;i++)box(-82+i*37,y+14,25,23,'#C4B79E',2);
            g.strokeColor=new Color('#FFF0CE');g.lineWidth=3;g.moveTo(-82,y+9);g.lineTo(54,y+9);g.stroke();
        }
        box(-120,267,152,22,'#DDCBAB',3);
        for(let i=0;i<4;i++)box(-115+i*39,289,27,27,'#D2C3A7',2);
        // Broad vermilion pavilion, jade tiled eaves and chunky comic roof tips.
        box(-99,311,139,57,'#A83E36');box(-81,315,99,42,'#422E37');
        for(const x of [-91,-41,30])box(x,309,10,62,'#D8583F');
        box(-105,306,151,12,'#E7B45D',2);
        shape([[-129,365],[-111,384],[-65,382],[-29,412],[8,382],[54,384],[73,365],[32,356],[-91,356]],'#23686B',5);
        shape([[-105,375],[-61,375],[-29,399],[4,375],[49,375],[29,366],[-87,366]],'#419B92',2);
        g.strokeColor=new Color('#F2C875');g.lineWidth=4;g.moveTo(-129,365);g.quadraticCurveTo(-99,349,-72,357);g.lineTo(17,357);g.quadraticCurveTo(48,350,73,365);g.stroke();
        g.strokeColor=new Color('#225558');g.lineWidth=2;
        for(let i=0;i<5;i++){const x=-72+i*22;g.moveTo(-29,400);g.lineTo(x,369);g.stroke();}
        box(-64,327,62,27,'#403041',4);text(this.body,'GatePlaque','呆',-33,340,22,'#F3D087',48);
        g.strokeColor=ink;g.lineWidth=5;g.moveTo(24,384);g.lineTo(24,450);g.stroke();
        shape([[26,449],[76,433],[26,415]],'#D94D3C');
        g.strokeColor=new Color('#F7CA6D');g.lineWidth=2;g.moveTo(31,438);g.lineTo(56,431);g.stroke();
    }
}
