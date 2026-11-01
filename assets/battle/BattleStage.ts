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
        this.images.forEach(n=>n.getComponent(UITransform)!.setContentSize(this.tileWidth,900*scale));this.main?.resize(width,height);
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
