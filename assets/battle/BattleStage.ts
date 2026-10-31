import { Color,Graphics,ImageAsset,isValid,Node,resources,Sprite,SpriteFrame,Texture2D,UITransform } from 'cc';
import { makeNode } from './BattleUI';
export type StageStyle='rift'|'boss'|'city'|'trial'|'boat';
const cache:Partial<Record<StageStyle,SpriteFrame>>={};
export class BattleStage {
    readonly node:Node;private image:Node|null=null;private time=0;private fallback:Node;
    constructor(parent:Node,private style:StageStyle){
        this.node=makeNode('BattleScenery',parent);this.fallback=makeNode('FallbackTerrain',this.node);
        const g=this.fallback.addComponent(Graphics);g.fillColor=new Color(style==='boss'?'#332641':style==='boat'?'#23586B':'#74624D');g.rect(-352,-470,704,940);g.fill();
        g.strokeColor=new Color('#B6A98255');g.lineWidth=2;for(let y=-450;y<470;y+=60){g.moveTo(-352,y);g.lineTo(352,y+35);g.stroke();}
        const draw=(frame:SpriteFrame)=>{if(!isValid(this.node))return;this.fallback.active=false;const n=makeNode(`ComicBackground-${style}`,this.node);const sprite=n.addComponent(Sprite);sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;n.getComponent(UITransform)!.setContentSize(740,988);this.image=n;};
        const saved=cache[style];if(saved)draw(saved);else resources.load(`battle-art/${style==='rift'?'city':style}`,ImageAsset,(error,image)=>{
            if(error||!image)return;const texture=new Texture2D();texture.image=image;const frame=new SpriteFrame();frame.texture=texture;cache[style]=frame;draw(frame);
        });
    }
    update(dt:number,marching:boolean):void{this.time+=dt;if(this.image){const motion=this.style==='boat'?Math.sin(this.time*.7)*7:((this.style==='rift'||this.style==='city')&&marching)?Math.sin(this.time*.35)*13:0;this.image.setPosition(motion,this.style==='boat'?Math.cos(this.time*.6)*4:0,0);}}
    destroy():void{this.node.destroy();}
}
