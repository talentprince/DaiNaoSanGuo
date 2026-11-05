import { Color,Graphics,Node,UIOpacity } from 'cc';
import type { SkillElement } from '../data/HeroIdentity';
import { ENERGY_RULES } from '../data/EnergyConfig';
import { makeNode } from './BattleUI';
interface Weather {element:SkillElement;node:Node;g:Graphics;opacity:UIOpacity;left:number;time:number;}
/** High-contrast layered comic effects stay independent from the skill title. */
export class WeatherEffects {
    private layers:Weather[]=[];
    private width = 720;
    private height = 1104;
    constructor(private parent:Node){}
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.layers.forEach(layer => this.paint(layer));
    }
    cast(element:SkillElement):void{
        const existing=this.layers.find(w=>w.element===element);if(existing){existing.left=ENERGY_RULES.weatherSeconds;existing.time=0;this.paint(existing);return;}
        const node=makeNode(`Weather-${element}`,this.parent);const effect={element,node,g:node.addComponent(Graphics),opacity:node.addComponent(UIOpacity),left:ENERGY_RULES.weatherSeconds,time:0};this.layers.push(effect);this.paint(effect);
    }
    clear():void{this.layers.forEach(w=>w.node.destroy());this.layers=[];}
    update(dt:number):void{
        this.layers=this.layers.filter(w=>{w.left-=dt;w.time+=dt;if(w.left<=0){w.node.destroy();return false;}w.opacity.opacity=Math.floor(255*Math.min(1,w.left/.65));this.paint(w);return true;});
    }
    private paint(w:Weather):void{
        const g=w.g;g.clear();const t=w.time;
        const wash=(r:number,green:number,b:number,a:number)=>{g.fillColor=new Color(r,green,b,a);g.rect(-this.width / 2, -this.height / 2, this.width, this.height);g.fill();};
        const line=(color:string,width:number,points:number[][])=>{g.strokeColor=new Color(color);g.lineWidth=width;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(p=>g.lineTo(p[0],p[1]));g.stroke();};
        if(w.element==='lightning'){
            wash(19,37,95,85);g.fillColor=new Color('#142344BB');for(let i=0;i<6;i++){g.ellipse(-325+i*130,531,100,65);g.fill();}
            for(let i=0;i<4;i++){const bx=-270+i*180+Math.sin(t*3+i)*24;const points=[[bx,520]];for(let j=1;j<10;j++)points.push([bx+Math.sin(j*4.1+Math.floor(t*5)+i)*54,520-j*112]);line('#4189DD80',30,points);line('#79DFFF',12,points);line('#F4FFFF',4,points);}
            for(let i=0;i<8;i++){const x=Math.sin(i*3.9+t)*310,y=Math.cos(i*2.1+t*.8)*475;line('#BDEFFF',4,[[x-20,y-10],[x+5,y+27],[x-3,y+4],[x+21,y+12]]);}
        }else if(w.element==='blizzard'){
            wash(55,126,196,73);g.fillColor=new Color('#79C7EF70');for(let i=0;i<10;i++){const x=-355+i*78,h=60+35*Math.sin(t*2+i);g.moveTo(x,-553);g.lineTo(x+18,-553+h);g.lineTo(x+52,-553);g.close();g.fill();}
            for(let i=0;i<84;i++){const x=((i*127+t*105)%790)-395,y=554-((i*89+t*210)%1108),r=5+i%5;line('#246B9BBB',7,[[x-r,y],[x+r,y]]);line('#F2FFFF',3,[[x-r,y],[x+r,y]]);line('#E5FDFF',3,[[x,y-r],[x,y+r]]);if(i%3===0){line('#D1F5FF',2,[[x-r*.7,y-r*.7],[x+r*.7,y+r*.7]]);}}
            g.strokeColor=new Color('#D9F9FFD0');g.lineWidth=7;for(let i=0;i<7;i++){const y=-475+i*153+Math.sin(t*2+i)*36;g.moveTo(-345,y);g.bezierCurveTo(-130,y+115,130,y-115,345,y+35);g.stroke();}
        }else if(w.element==='fire'){
            wash(115,27,17,66);
            for(let i=0;i<7;i++){const x=-330+i*105,h=190+Math.sin(t*5+i)*90,y=-100+Math.sin(t*2+i)*260;g.fillColor=new Color('#EF5425B0');g.moveTo(x-40,y-150);g.bezierCurveTo(x-80,y+h*.2,x+5,y+h*.55,x,y+h);g.bezierCurveTo(x+85,y+h*.1,x+45,y-90,x+40,y-150);g.close();g.fill();g.fillColor=new Color('#FFD763DD');g.moveTo(x-17,y-130);g.quadraticCurveTo(x-25,y+h*.3,x+8,y+h*.55);g.quadraticCurveTo(x+35,y-35,x+22,y-130);g.close();g.fill();}
            for(let i=0;i<38;i++){const x=-340+(i*89+t*34)%680,y=-540+(i*73+t*155)%1080;line('#FFE395',4,[[x,y],[x+7,y+23]]);}
        }else if(w.element==='poison'){
            wash(60,53,75,82);for(let i=0;i<16;i++){g.fillColor=new Color(i%2?'#6B447349':'#83BB5549');g.ellipse(Math.sin(i*2.4+t*.6)*300,-490+((i*113+t*70)%1000),65,45);g.fill();}
            g.strokeColor=new Color('#C8F58FD9');g.lineWidth=4;for(let i=0;i<25;i++){g.circle(Math.sin(i*2.4+t)*310,-510+((i*71+t*90)%1040),7+i%9);g.stroke();}
        }else{
            wash(29,90,71,48);for(let i=0;i<13;i++){const x=-350+(i*93+t*470)%700,y=-510+i*85;line('#227C6B80',24,[[x-50,y-18],[x+75,y+40]]);line('#D3FFDC',8,[[x-50,y-18],[x+75,y+40]]);}
            g.strokeColor=new Color('#F7EDBAD0');g.lineWidth=5;for(let i=0;i<7;i++){g.ellipse(Math.sin(t*3+i)*80,-400+i*140,150+Math.sin(t*4+i)*70,35);g.stroke();}
        }
        if(t<.24){g.fillColor=new Color(225,247,255,Math.floor((1-t/.24)*65));g.rect(-this.width / 2, -this.height / 2, this.width, this.height);g.fill();}
    }
}
