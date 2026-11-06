import { MainlineScenery } from './MainlineScenery';
import { mainlineTheme } from '../data/MainlineThemes';
import { Color,Graphics,ImageAsset,isValid,Node,resources,Sprite,SpriteFrame,Texture2D,UITransform } from 'cc';
import { makeNode } from './BattleUI';
export type StageStyle='rift'|'boss'|'city'|'trial'|'boat';
const cache:Partial<Record<StageStyle,SpriteFrame>>={};
export class BattleStage {
    readonly node:Node;
    private images:Node[]=[];private time=0;private distance=0;private fallback:Graphics;private foreground:Graphics;
    private width=720;private height=1108;private tileWidth=760;private main:MainlineScenery|null=null;
    private delveRoom = -1;
    private delveGateOpen = false;
    private delveInk?: Graphics;
    constructor(parent:Node,private style:StageStyle,stage=1,distance=0){
        this.node=makeNode('BattleScenery',parent);this.fallback=makeNode('FallbackTerrain',this.node).addComponent(Graphics);
        this.foreground=makeNode('ComicGroundInk',this.node).addComponent(Graphics);this.resize(this.width,this.height);
        if(style==='rift'){this.fallback.node.active=false;this.main=new MainlineScenery(this.node,mainlineTheme(stage),distance);return;}
        const draw=(frame:SpriteFrame)=>{
            if(!isValid(this.node))return;this.fallback.node.active=false;
            for(let i=0;i<1;i++){
                const n=makeNode(`ComicBackground-${style}-${i}`,this.node);n.setSiblingIndex(i);const sprite=n.addComponent(Sprite);sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.images.push(n);
            }
            this.resize(this.width,this.height);
        };
        const saved=cache[style];if(saved)draw(saved);else resources.load(`battle-art/${style}`,ImageAsset,(error,image)=>{
            if(error||!image)return;const texture=new Texture2D();texture.image=image;const frame=new SpriteFrame();frame.texture=texture;cache[style]=frame;draw(frame);
        });
    }
    resize(width:number,height:number):void{
        this.width=width;this.height=height;const g=this.fallback;g.clear();g.fillColor=new Color(this.style==='boss'?'#332641':this.style==='boat'?'#23586B':'#74624D');g.rect(-width/2,-height/2,width,height);g.fill();
        const scale=Math.max((width+120)/600,(height+72)/900);this.tileWidth=600*scale;
        this.images.forEach(n=>n.getComponent(UITransform)!.setContentSize(this.tileWidth,900*scale));this.main?.resize(width,height); this.drawDelve();
    }
    setDelveRoom(room: number): void {
        this.delveRoom = room;
        this.delveGateOpen = false;
        this.delveInk ??= makeNode('DelveArchitecture', this.node).addComponent(Graphics);
        this.drawDelve();
    }

    openDelveGate(): void {
        if (this.delveGateOpen) return;
        this.delveGateOpen = true;
        this.drawDelve();
    }

    private drawDelve(): void {
        const g = this.delveInk;
        if (!g) return;
        g.clear();
        const w = this.width / 2, h = this.height / 2;
        const stairs = this.delveRoom === 1;
        const red = this.delveRoom >= 2;
        const box = (x: number,y: number,width: number,height: number,ink: string) => {
            g.fillColor = new Color(ink); g.rect(x,y,width,height); g.fill();
        };
        if (stairs) {
            box(-w,-h,w*2,h*2,'#302F42');
            g.fillColor = new Color('#5D5969');
            g.moveTo(-w+35,-h); g.lineTo(-161,h); g.lineTo(161,h); g.lineTo(w-35,-h); g.close(); g.fill();
            for (let y = -h + 33; y < h; y += 51) {
                const reach = w - 35 + (161 - w + 35) * (y + h) / (2*h);
                box(-reach,y,reach*2,6,'#2A2A3D'); box(-reach,y+6,reach*2,4,'#817684');
            }
        } else if (this.delveRoom >= 3) {
            box(-w,-h,w*2,h*2,this.delveRoom === 3 ? '#4A2E40' : '#38293F');
            box(-w,-303,w*2,558,'#6B4852');
            for (let i = -2; i <= 2; i++) box(i*138-26,-h,5,h*2,'#533842');
        }
        const x = stairs ? 0 : this.delveRoom >= 3 ? w - 82 : w - 76;
        const y = stairs ? 271 : 16;
        const left = x - 61;
        box(left-7,y-149,136,238,'#302435');
        box(left+9,y-134,104,186,this.delveGateOpen ? '#171725' : red ? '#913F48' : '#515770');
        if (this.delveGateOpen) {
            box(left+9,y-134,21,186,red ? '#913F48' : '#515770');
            box(left+92,y-134,21,186,red ? '#913F48' : '#515770');
        }
        g.strokeColor = new Color('#2A2031'); g.lineWidth = 6;
        g.fillColor = new Color(red ? '#BD5550' : '#6A737E');
        g.moveTo(left-24,y+65); g.lineTo(left-6,y+85); g.lineTo(x-25,y+101); g.lineTo(x+24,y+101);
        g.lineTo(left+132,y+85); g.lineTo(left+147,y+65); g.close(); g.fill(); g.stroke();
        box(left-17,y+57,156,12,red ? '#EAA269' : '#BAA284');
        box(left-6,y-149,16,207,red ? '#D88360' : '#918481');
        box(left+111,y-149,16,207,red ? '#D88360' : '#918481');
        box(left-16,y-149,154,10,red ? '#EAA269' : '#B8A18B');
        for (const dx of [-32,32]) {
            g.fillColor = new Color(red ? '#F6C885' : '#B0A393');
            for (let row = 0; row < 3; row++) { g.circle(x+dx,y-103+row*39,4); g.fill(); }
        }
        if (!this.delveGateOpen) {
            box(x-3,y-133,6,185,red ? '#D68161' : '#838499');
            if (this.delveRoom === 2) {
                g.fillColor = new Color('#FFD27C'); g.circle(x,y+20,15); g.fill(); g.stroke();
            }
        }
    }

    update(dt:number,marching:boolean):void{
        if(this.main){this.main.update(dt,marching);return;}
        this.time+=dt;if(marching)this.distance+=dt*112;
        this.images.forEach((n,i)=>{
            const x=this.style==='rift'?-Math.min(45,this.distance*.12):this.style==='city'?-Math.min(40,this.distance*.15):this.style==='boat'?Math.sin(this.time*.7)*7:0;
            n.setPosition(x,this.style==='boat'?Math.cos(this.time*.6)*4:0,0);
        });
        const g=this.foreground;g.clear();
        // Comic print dots frame the illustration rather than covering the combat silhouettes.
        g.fillColor=new Color('#1A263224');
        for(let row=0;row<5;row++)for(let col=0;col<7;col++){const x=this.width/2-20-col*17;const y=this.height/2-28-row*17;g.circle(x,y,1.5+row*.32);g.fill();}
        if(marching){
            g.strokeColor=new Color('#F7DFC4AA');g.lineWidth=4;
            for(let i=0;i<12;i++){const x=((i*83-this.distance*2)% (this.width+180)+this.width+180)%(this.width+180)-this.width/2-90;const y=-200-i%4*58;g.moveTo(x,y);g.lineTo(x+36+i%3*18,y+4);g.stroke();}
        }
    }
    get travelled():number{return this.main?.travelled||0;}
    destroy():void{this.node.destroy();}
}
