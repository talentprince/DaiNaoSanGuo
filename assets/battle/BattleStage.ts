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
    private delveInk?: Graphics;
    private delvePortal?: Graphics;
    private portalAge = 0;
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
        if (this.delvePortal?.node.active) this.drawDelvePortal();
    }
    setDelveRoom(room: number): void {
        this.delveRoom = room;
        this.delveInk ??= makeNode('DelveArchitecture', this.node).addComponent(Graphics);
        if (this.delvePortal) this.delvePortal.node.active = false;
        this.drawDelve();
    }

    get delvePortalPosition(): { x: number; y: number } {
        return this.delveRoom === 1 ? { x: 0, y: 271 } : { x: this.width / 2 - 88, y: 16 };
    }

    openDelvePortal(): void {
        if (this.delvePortal?.node.active) return;
        this.delvePortal ??= makeNode('DelvePortal', this.node).addComponent(Graphics);
        this.delvePortal.node.active = true;
        this.portalAge = 0;
        this.drawDelvePortal();
    }

    private drawDelvePortal(): void {
        const g = this.delvePortal!;
        const { x, y } = this.delvePortalPosition;
        const red = this.delveRoom === 2;
        const bloom = Math.min(1, .25 + this.portalAge * 6);
        const pulse = Math.sin(this.portalAge * 7);
        const radius = (77 + pulse * 3) * bloom;
        g.node.setPosition(x, y);
        g.clear();
        g.fillColor = new Color(red ? '#EA654638' : '#65DBC938');
        g.ellipse(0, 0, radius + 8, radius * .41); g.fill();
        g.fillColor = new Color(red ? '#F6A05265' : '#96F9DD62');
        g.ellipse(0, 0, radius * .72, radius * .24); g.fill();
        g.strokeColor = new Color(red ? '#FFCA83' : '#BDFFEB');
        g.lineWidth = 4;
        g.ellipse(0, 0, radius, radius * .32); g.stroke();
        g.lineWidth = 2;
        g.ellipse(0, 0, radius * .79, radius * .25); g.stroke();
        g.fillColor = new Color(red ? '#FFE4AF' : '#D9FFF3');
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            g.circle(Math.cos(angle) * radius * .9, Math.sin(angle) * radius * .285, 2.5);
            g.fill();
        }
    }

    private drawDelve(): void {
        const g = this.delveInk;
        if (!g) return;
        g.clear();
        const w = this.width / 2, h = this.height / 2;
        const stairs = this.delveRoom === 1;
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
    }

    update(dt:number,marching:boolean):void{
        if (this.delvePortal?.node.active) { this.portalAge += dt; this.drawDelvePortal(); }
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
