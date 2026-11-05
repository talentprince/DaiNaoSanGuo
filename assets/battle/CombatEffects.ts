import { WeatherEffects } from './WeatherEffects';
import { formatAmount } from '../data/GrowthConfig';
import { isValid,Color, Graphics, Node, UIOpacity, Label } from 'cc';
import { makeNode, panel, text } from './BattleUI';
import type { UnitActor } from './UnitActor';

interface Effect { node: Node; opacity: UIOpacity; left: number; total: number; frame?: (progress: number) => void; }
export class CombatEffects {
    private parent: Node;
    private clock=0;private lastStamp=-1;
    private effects: Effect[] = [];
    private globalNodes: Node[] = [];
    private weather:WeatherEffects;
    private width = 720;
    private height = 1104;
    constructor(parent: Node) { this.parent = parent; this.weather=new WeatherEffects(parent); }
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.weather.resize(width, height);
    }
    update(dt: number): void {
        this.clock+=dt;this.weather.update(dt);
        this.effects = this.effects.filter(effect => {
            effect.left -= dt;
            const progress = 1 - Math.max(0, effect.left) / effect.total;
            effect.frame?.(progress);
            effect.opacity.opacity = Math.round(255 * (1 - progress));
            if (effect.left <= 0) { this.removeNode(effect.node); return false; }
            return true;
        });
    }
    clear(): void { this.weather.clear(); this.effects.forEach(e => this.removeNode(e.node)); this.effects = []; this.globalNodes = []; }
    private removeNode(node:Node):void{if(isValid(node,true))node.destroy();this.globalNodes=this.globalNodes.filter(old=>old!==node);}
    private add(name: string, x: number, y: number, duration: number, frame?: (p: number) => void): { node: Node; graphics: Graphics } {
        const node = makeNode(name, this.parent, x, y); const opacity = node.addComponent(UIOpacity);
        const graphics = node.addComponent(Graphics);
        if (this.effects.length > 150) {const first=this.effects.shift();if(first)this.removeNode(first.node);}
        this.effects.push({ node, opacity, left: duration, total: duration, frame });
        return { node, graphics };
    }
    number(actor: UnitActor, amount: number, heal: boolean, critical: boolean): void {
        const x = actor.impactPoint.x; const y = actor.impactPoint.y + (actor.unit.kind === 'boss' ? 90 : 61);
        const node = text(this.parent, 'FloatingNumber', `${heal ? '+' : '−'}${formatAmount(Math.ceil(amount))}${critical ? '!' : ''}`, x, y,
            critical ? 38 : 25, heal ? '#9CE7B0' : critical ? '#FFE3A1' : '#F4C4B6', 180).node;
        const label=node.getComponent(Label)!;label.enableOutline=true;label.outlineWidth=3;label.outlineColor=new Color('#19202D');
        const opacity = node.addComponent(UIOpacity);
        this.effects.push({ node, opacity, total: .72, left: .72, frame: p => {node.setPosition(x,y+p*63,0);const k=1+Math.max(0,1-p*7)*(critical?.45:.2);node.setScale(k,k,1);} });
        if (heal) this.plus(x, y - 30);
    }
    attack(source: UnitActor, target: UnitActor): void {
        const a = source.impactPoint; const b = target.impactPoint;
        source.attack(b.x,b.y);
        if (['bow', 'fan', 'staff', 'ribbon', 'qin'].indexOf(source.weapon) >= 0) {
            this.projectile(a.x, a.y + 15, b.x, b.y + 15, source.weapon === 'bow' ? '#EDD9A0' : '#A5D9DD', source.weapon === 'bow');
        } else this.slash(b.x, b.y + 12, ['spear', 'serpent', 'halberd', 'glaive'].indexOf(source.weapon) >= 0 ? '#B8DEE5' : '#F0D39B', ['spear', 'serpent', 'halberd', 'glaive'].indexOf(source.weapon) >= 0);
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
        const { node, graphics: g } = this.add('WeaponImpact', x, y, .3);
        node.setScale(scale, scale, 1);node.angle=-13;
        for(const [ink,width] of [['#1B2230',16],[color,11],['#FFF6DB',4]] as [string,number][]){
            g.strokeColor=new Color(ink);g.lineWidth=width;
            if(thrust){g.moveTo(-48,-13);g.lineTo(44,14);g.stroke();}
            else{g.arc(0,0,43,-.8,1.9,false);g.stroke();}
        }
    }
    impact(actor:UnitActor,critical:boolean):void {
        const p=actor.impactPoint;
        const {node,graphics:g}=this.add('ComicImpactBurst',p.x,p.y+20,critical?.33:.21);
        const r=critical?45:28;g.fillColor=new Color(critical?'#FFE478':'#FFF0CC');g.strokeColor=new Color('#202236');g.lineWidth=3;
        for(let i=0;i<16;i++){const angle=i*Math.PI/8;const radius=i%2?r*.36:r;const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;i?g.lineTo(x,y):g.moveTo(x,y);}g.close();g.fill();g.stroke();node.angle=(this.clock*71)%35;
        if(critical&&this.clock-this.lastStamp>.45){
            this.lastStamp=this.clock;const label=text(this.parent,'ComicPunchWord','暴 击！',p.x-16,p.y+92,36,'#FFE789',220);label.enableOutline=true;label.outlineColor=new Color('#372033');label.outlineWidth=4;label.node.angle=-12;
            this.effects.push({node:label.node,opacity:label.node.addComponent(UIOpacity),total:.6,left:.6,frame:t=>label.node.setScale(1+t*.25,1+t*.25,1)});
        }
    }
    private plus(x: number, y: number): void {
        const { graphics: g } = this.add('HealingCross', x, y, 1.8);
        g.fillColor = new Color('#9BE3AA'); g.roundRect(-4, -14, 8, 28, 3); g.fill(); g.roundRect(-14, -4, 28, 8, 3); g.fill();
    }
    skill(source: UnitActor, targets: UnitActor[], friends: UnitActor[], name: string): void {
        const old=this.globalNodes;old.forEach(node=>this.removeNode(node));
        this.effects = this.effects.filter(effect => old.indexOf(effect.node) < 0);
        this.globalNodes = [];
        const tactic = source.unit.tactic || 'cleave';source.attack(targets[0]?.impactPoint.x,targets[0]?.impactPoint.y,true);
        const x = source.impactPoint.x; const y = source.impactPoint.y;
        const color = source.unit.team === 'enemy' ? '#DF9A8A' : tactic === 'heal' || tactic === 'guard' ? '#A5DAB6' : source.unit.heroTier === 4 ? '#F0CD81' : '#BADFD8';
        const fullField = source.unit.kind === 'boss' || source.unit.heroTier === 4 || (tactic === 'heal' && (source.unit.heroTier || 1) >= 3);
        if(fullField&&tactic!=='heal'&&tactic!=='guard')this.weather.cast(source.unit.element==='slash'||!source.unit.element?'wind':source.unit.element);
        const title = panel(this.parent, 'SkillBanner', 0, 380, 390, 56, '#14263EF2', 12);
        text(title, 'SkillTitle', `${source.unit.signature?'【专武】':''}${source.unit.name} · ${name}`, 0, 0, 23, '#FFE4A2', 360);
        this.globalNodes.push(title);
        const opacity = title.addComponent(UIOpacity); this.effects.push({ node: title, opacity, total: 1.5, left: 1.5 });
        this.ring(x, y, '#E9D18C', 0.55, 70);
        if(source.unit.signature){
            this.ring(x,y,'#FFD45B',0.7,90);
            targets.forEach(t=>this.slash(t.impactPoint.x,t.impactPoint.y,'#FFD55B',false,1.3));
        }
        if (tactic === 'pierce') {
            targets.forEach(target => {
                const b = target.impactPoint;
                const { graphics: g } = this.add('PiercingLance', 0, 0, 0.45);
                g.strokeColor = new Color('#CBF3F2'); g.lineWidth = 7; g.moveTo(x, y + 15); g.lineTo(b.x, b.y + 15); g.stroke();
                this.slash(b.x, b.y, '#F4F3CE', true, 1.6);
            });
        } else if (tactic === 'volley') {
            targets.forEach(target => { const b = target.impactPoint; for (let i = -1; i <= 1; i++) this.projectile(b.x - 100 + i * 12, b.y + 115, b.x + i * 10, b.y, '#E8D997', true); });
        } else if (tactic === 'guard') {
            const { graphics: g } = this.add('GuardShield', x, y + 10, 0.8);
            g.strokeColor = new Color('#9ED5C7'); g.lineWidth = 6; g.moveTo(-40, 37); g.lineTo(40, 37); g.lineTo(36, -18); g.lineTo(0, -44); g.lineTo(-36, -18); g.close(); g.stroke();
            targets.forEach(target => this.slash(target.impactPoint.x, target.impactPoint.y, '#B7E6D3'));
        } else if (tactic === 'heal') {
            friends.filter(a => a.unit.hp > 0).forEach(actor => { this.plus(actor.impactPoint.x, actor.impactPoint.y + 22); this.ring(actor.impactPoint.x, actor.impactPoint.y - 27, '#88E0A6', 3.6, 55); });
        } else {
            targets.forEach(target => { this.slash(target.impactPoint.x, target.impactPoint.y + 10, '#C3E4B1', false, 1.8); this.ring(target.impactPoint.x, target.impactPoint.y, '#9DCCAF', 0.6, 65); });
        }
    }
    private ring(x: number, y: number, color: string, duration: number, radius: number): Node {
        let node: Node;
        const effect = this.add('ExpandingRing', x, y, duration, p => node.setScale(0.3 + p * 1.3, (0.3 + p * 1.3) * 0.6, 1));
        node = effect.node; const g = effect.graphics; g.strokeColor = new Color(color); g.lineWidth = 4; g.circle(0, 0, radius); g.stroke();
        return node;
    }
    status(actor: UnitActor, value: string, color: string): void {
        const x = actor.impactPoint.x; const y = actor.impactPoint.y + 65;
        const node = text(this.parent, 'StatusPopup', value, x, y, 16, color, 135).node;
        this.effects.push({ node, opacity: node.addComponent(UIOpacity), left: 0.75, total: 0.75, frame: p => node.setPosition(x, y + p * 28, 0) });
    }
    announce(message: string): void {
        const node = text(this.parent, 'Announcement', message, 0, 218, 32, '#FFD792', 630).node;
        this.effects.push({ node, opacity: node.addComponent(UIOpacity), left: 1.3, total: 1.3 });
    }
    bossFinale(actor:UnitActor,name:string):void{
        this.weather.clear();this.weather.cast(actor.unit.element||'wind');actor.attack();
        const title=panel(this.parent,'BossFinaleTitle',0,230,650,130,'#29172CED',18);text(title,'BossFinaleName',name,0,22,49,'#FFE3A0',620);text(title,'BossFinaleWarning','魔王蓄势 · 伤害已锁定',0,-36,23,'#EDB9BB',610);
        this.effects.push({node:title,opacity:title.addComponent(UIOpacity),left:2.8,total:2.8});
        let sigil:Node;const effect=this.add('BossFinaleSigil',0,20,2.8,p=>{sigil.angle=p*100;sigil.setScale(.6+p*1.8,.6+p*1.8,1);});sigil=effect.node;
        const g=effect.graphics;g.strokeColor=new Color(actor.unit.element==='fire'?'#FFD26E':actor.unit.element==='lightning'?'#C4EDFF':'#DBC996');g.lineWidth=8;g.circle(0,0,100);g.circle(0,0,125);g.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;g.moveTo(Math.cos(a)*88,Math.sin(a)*88);g.lineTo(Math.cos(a)*140,Math.sin(a)*140);g.stroke();}
    }
    finaleImpact():void{
        const {graphics:g}=this.add('FinaleImpactFlash',0,0,.5);g.fillColor=new Color('#FFF3C8D0');g.rect(-this.width / 2, -this.height / 2, this.width, this.height);g.fill();
        let wave:Node;const effect=this.add('FinaleShockwave',0,-50,.95,p=>wave.setScale(1+p*9,1+p*9,1));wave=effect.node;effect.graphics.strokeColor=new Color('#FFF0B2');effect.graphics.lineWidth=10;effect.graphics.circle(0,0,65);effect.graphics.stroke();
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
