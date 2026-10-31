import { Color,Graphics,Node,UIOpacity } from 'cc';
import type { SkillElement } from '../data/HeroIdentity';
import { makeNode } from './BattleUI';
interface Weather {element:SkillElement;node:Node;g:Graphics;opacity:UIOpacity;left:number;time:number;}
/** Persistent spectacle is independent from the single skill-name banner. Same-element casts refresh it. */
export class WeatherEffects {
    private layers:Weather[]=[];
    constructor(private parent:Node){}
    cast(element:SkillElement):void{
        const existing=this.layers.find(w=>w.element===element);if(existing){existing.left=4;return;}
        const node=makeNode(`Weather-${element}`,this.parent);this.layers.push({element,node,g:node.addComponent(Graphics),opacity:node.addComponent(UIOpacity),left:4,time:0});
    }
    clear():void{this.layers.forEach(w=>w.node.destroy());this.layers=[];}
    update(dt:number):void{
        this.layers=this.layers.filter(w=>{w.left-=dt;w.time+=dt;if(w.left<=0){w.node.destroy();return false;}
            w.opacity.opacity=Math.floor(255*Math.min(1,w.left/.7));this.paint(w);return true;
        });
    }
    private paint(w:Weather):void{
        const g=w.g;g.clear();const t=w.time;
        if(w.element==='lightning'){
            const pulse=.5+.5*Math.sin(t*8);g.strokeColor=new Color(115,205,255,100+Math.floor(pulse*100));g.lineWidth=8;
            for(let bolt=0;bolt<3;bolt++){const bx=-240+bolt*240+Math.sin(t*3+bolt)*35;g.moveTo(bx,455);for(let j=1;j<10;j++)g.lineTo(bx+Math.sin(j*4.1+Math.floor(t*6)+bolt)*45,455-j*95);g.stroke();}
            g.strokeColor=new Color('#E2FBFF');g.lineWidth=2;for(let i=0;i<7;i++){const x=Math.sin(i*3.9+t)*310;const y=Math.cos(i*2.1+t*.8)*420;g.moveTo(x-13,y-4);g.lineTo(x,y+17);g.lineTo(x+7,y+2);g.stroke();}
        }else if(w.element==='blizzard'){
            g.fillColor=new Color(115,180,230,20);g.rect(-352,-470,704,940);g.fill();g.strokeColor=new Color('#D4F4FF');g.lineWidth=2;
            for(let i=0;i<42;i++){const x=((i*127+t*85)%790)-395;const y=470-((i*89+t*180)%940);const r=3+i%4;g.moveTo(x-r,y);g.lineTo(x+r,y);g.moveTo(x,y-r);g.lineTo(x,y+r);g.stroke();}
            g.strokeColor=new Color('#B5E5F388');g.lineWidth=4;for(let i=0;i<5;i++){const y=-350+i*175+Math.sin(t+i)*30;g.moveTo(-345,y);g.bezierCurveTo(-130,y+100,130,y-100,345,y+20);g.stroke();}
        }else if(w.element==='fire'){
            for(let i=0;i<22;i++){const x=-345+i*33;const h=48+35*Math.sin(t*5+i*.8);g.fillColor=new Color(245,83,30,115);g.moveTo(x,-468);g.quadraticCurveTo(x-28,-430-h,x+5,-410-h);g.quadraticCurveTo(x+29,-430-h/2,x+24,-468);g.close();g.fill();}
            g.strokeColor=new Color('#FFD474');g.lineWidth=3;for(let i=0;i<23;i++){const x=-330+(i*89+t*26)%660;const y=-460+(i*53+t*145)%870;g.moveTo(x,y);g.lineTo(x+5,y+18);g.stroke();}
        }else if(w.element==='poison'){
            g.strokeColor=new Color('#A9DC7399');g.lineWidth=3;for(let i=0;i<24;i++){const x=Math.sin(i*2.4+t*.6)*320;const y=-430+((i*71+t*75)%850);g.circle(x,y,5+i%5);g.stroke();}
            g.fillColor=new Color(83,58,123,20);g.rect(-352,-470,704,940);g.fill();
        }else{
            g.strokeColor=new Color('#B1E5A6AA');g.lineWidth=4;for(let i=0;i<10;i++){const y=-420+i*90;const r=90+75*(.5+.5*Math.sin(t*4+i));g.ellipse(Math.sin(t*3+i*.6)*50,y,r,27);g.stroke();}
            g.strokeColor=new Color('#FFE9A699');g.lineWidth=2;for(let i=0;i<12;i++){const x=-340+(i*93+t*380)%680;const y=-420+i*72;g.moveTo(x,y);g.lineTo(x+55,y+23);g.stroke();}
        }
    }
}
