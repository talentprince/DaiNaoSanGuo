import { Color,Graphics,Node } from 'cc';
import { makeNode } from './BattleUI';
import { panoramaItems } from '../data/MainlineThemes';
import type { MainlineTheme } from '../data/MainlineThemes';
/** Analytic panorama: overlapping world-space shapes, no tiled-image rectangle edges. */
export class MainlineScenery {
    private ink:Graphics;private width=720;private height=1108;private speed=0;private clock=0;
    travelled:number;
    constructor(parent:Node,private theme:MainlineTheme,distance=0){this.travelled=distance;this.ink=makeNode('ContinuousComicLandscape',parent).addComponent(Graphics);this.paint();}
    resize(width:number,height:number):void{this.width=width;this.height=height;this.paint();}
    update(dt:number,marching:boolean):void{this.clock+=dt;const target=marching?108:0;this.speed+=(target-this.speed)*Math.min(1,dt*8);this.travelled+=this.speed*dt;this.paint();}
    private paint():void{
        const g=this.ink,t=this.theme,w=this.width,h=this.height,top=h/2,bottom=-h/2;
        const poly=(points:number[][],fill:string,stroke?:string,line=3)=>{g.fillColor=new Color(fill);g.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))g.lineTo(x,y);g.close();g.fill();if(stroke){g.strokeColor=new Color(stroke);g.lineWidth=line;g.stroke();}};
        const mix=(a:string,b:string,k:number)=>'#'+[1,3,5].map(i=>('0'+Math.round(parseInt(a.slice(i,i+2),16)*(1-k)+parseInt(b.slice(i,i+2),16)*k).toString(16)).slice(-2)).join('');
        g.clear();g.fillColor=new Color(t.sky);g.rect(-w/2,bottom,w,h);g.fill();
        for(let i=0;i<10;i++){g.fillColor=new Color(mix(t.haze,t.sky,i/9));g.rect(-w/2,180+i*(top-180)/10,w,(top-180)/10+1);g.fill();}
        const sunX=w*.24,sunY=top-110;g.fillColor=new Color(t.feature==='stars'?'#E9E3BB':'#FFF0B5');g.circle(sunX,sunY,46);g.fill();
        if(t.feature==='stars'){
            g.fillColor=new Color('#F5E8B7');for(const p of panoramaItems(this.travelled*.012,47,w)){const y=top-46-p.seed*Math.max(40,top-230);g.circle(p.x,y,1.5+p.seed*1.5);g.fill();}
        }else{
            g.fillColor=new Color('#FFF3D077');for(const p of panoramaItems(this.travelled*.04,215,w)){const y=top-80-p.seed*120;g.ellipse(p.x,y,48+p.seed*33,12);g.ellipse(p.x+32,y+5,30,15);g.fill();}
        }
        for(const p of panoramaItems(this.travelled*.1,190,w)){
            const peak=250+p.seed*135;poly([[p.x-165,175],[p.x-45,peak-38],[p.x+10,peak],[p.x+135,175]],t.far);
            poly([[p.x+10,peak],[p.x+135,175],[p.x+36,225]],t.haze);
        }
        for(const p of panoramaItems(this.travelled*.22,160,w)){
            const peak=220+p.seed*85;poly([[p.x-145,130],[p.x-62,peak-28],[p.x-8,peak],[p.x+112,130]],t.near,t.ink,2);
        }
        for(let i=0;i<12;i++){g.fillColor=new Color(mix(t.ground,t.ink,.13*(1-i/12)));g.rect(-w/2,bottom+i*(195-bottom)/12,w,(195-bottom)/12+1);g.fill();}
        const edge=(base:number,reverse=false)=>{const points:number[][]=[];for(let x=-w/2-80;x<=w/2+80;x+=80)points.push([x,base+Math.sin((x+this.travelled*.45)/220)*9]);return reverse?points.reverse():points;};
        poly([...edge(112),...edge(-273,true)],mix(t.road,t.ground,.2));
        g.strokeColor=new Color(t.ink+'66');g.lineWidth=3;for(const edgeY of [112,-273]){const points=edge(edgeY);g.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))g.lineTo(x,y);g.stroke();}
        for(const p of panoramaItems(this.travelled*.8,92,w)){
            for(const base of [117,-282]){const x=p.x,y=base+p.seed*12;poly([[x-12,y],[x-16,y+17],[x-4,y+6],[x+2,y+24],[x+5,y+7],[x+17,y+16],[x+12,y]],mix(t.ground,t.ink,.26),t.ink+'66',1.5);}
        }
        // Far landmarks move slowly; their roots are world coordinates shared across stage changes.
        for(const p of panoramaItems(this.travelled*.28,240,w)){
            const x=p.x,y=194,small=.7+p.seed*.45;
            if(t.feature==='forts'){
                poly([[x-55,y],[x-55,y+84],[x+48,y+84],[x+48,y]],'#706E78',t.ink);
                g.fillColor=new Color('#958A89');for(let i=0;i<4;i++){g.rect(x-59+i*30,y+78,18,21);g.fill();}
                poly([[x-30,y+92],[x-45,y+105],[x,y+131],[x+49,y+105],[x+31,y+92]],'#674C5B',t.ink);
            }else if(t.feature==='cliffs'||t.feature==='bridges'){
                poly([[x-55,y],[x-46,y+150*small],[x-5,y+177*small],[x+41,y+142*small],[x+58,y]],t.far,t.ink,3);
                g.strokeColor=new Color(t.haze);g.lineWidth=3;g.moveTo(x-22,y+20);g.lineTo(x-30,y+127*small);g.moveTo(x+18,y+12);g.lineTo(x+25,y+121*small);g.stroke();
                if(t.feature==='bridges'){g.strokeColor=new Color('#C9B38C');g.lineWidth=7;g.moveTo(x+42,y+72);g.lineTo(x+171,y+91);g.stroke();}
            }else if(t.feature==='orchard'||t.feature==='bamboo'){
                g.strokeColor=new Color(t.ink);g.lineWidth=t.feature==='bamboo'?7:9;g.moveTo(x,y);g.lineTo(x+5,y+114*small);g.stroke();
                if(t.feature==='bamboo'){
                    g.strokeColor=new Color('#ACC7A3');g.lineWidth=2;for(let i=1;i<5;i++){g.moveTo(x-4,y+i*20);g.lineTo(x+8,y+i*20);g.stroke();}
                    for(let i=0;i<5;i++)poly([[x+4,y+44+i*14],[x+43-i*9,y+73+i*12],[x+13,y+52+i*14]],t.near);
                }else{g.fillColor=new Color('#E8ABAA');g.strokeColor=new Color(t.ink);g.lineWidth=3;for(let i=0;i<4;i++){g.circle(x-21+i*17,y+82+Math.sin(i)*17,29);g.fill();g.stroke();}}
            }else if(t.feature==='camp'){
                poly([[x-65,y],[x,y+89],[x+67,y]],'#C3A18A',t.ink);poly([[x,y+89],[x+67,y],[x+9,y]],'#7B6972',t.ink);
                g.strokeColor=new Color('#F4BA6A');g.lineWidth=4;g.moveTo(x-37,y+7);g.lineTo(x-28,y+46);g.stroke();
            }else if(t.feature==='river'||t.feature==='fire'){
                g.fillColor=new Color(t.feature==='river'?'#6DABB7':'#614E78');g.rect(x-125,y-20,255,48);g.fill();
                poly([[x-52,y+5],[x+49,y+5],[x+33,y-9],[x-35,y-9]],'#715B60',t.ink,2);
                g.strokeColor=new Color(t.ink);g.lineWidth=4;g.moveTo(x,y+5);g.lineTo(x,y+80);g.stroke();poly([[x+4,y+73],[x+45,y+18],[x+4,y+18]],t.feature==='fire'?'#D57B57':'#E2D1AB');
                if(t.feature==='fire')for(let i=0;i<3;i++)poly([[x-27+i*20,y+3],[x-19+i*20,y+62],[x-2+i*20,y+18],[x+6+i*20,y+2]],i%2?'#FFD17E':'#EF9A60');
            }else{
                g.strokeColor=new Color(t.ink);g.lineWidth=5;g.moveTo(x,y);g.lineTo(x,y+85);g.stroke();
                poly([[x,y+83],[x+47,y+70],[x+38,y+59],[x+48,y+51],[x+31,y+43],[x,y+51]],t.feature==='stars'?'#A690B4':'#BA704D',t.ink,3);
                g.strokeColor=new Color('#EAD49D');g.lineWidth=2.5;g.circle(x+17,y+63,6);g.moveTo(x+11,y+62);g.lineTo(x+23,y+65);g.stroke();
                if(t.feature==='flags'){poly([[x-43,y],[x-36,y+15],[x-17,y+18],[x-7,y]],'#9C866F',t.ink,2);g.strokeColor=new Color(t.ink);g.lineWidth=4;g.moveTo(x-70,y+11);g.lineTo(x-53,y+49);g.moveTo(x-60,y+29);g.lineTo(x-23,y+27);g.stroke();}
            }
        }
        // Ground marks share the ground color and cannot expose an image seam when the index advances.
        for(const p of panoramaItems(this.travelled,86,w)){
            const x=p.x,y=bottom+32+p.seed*(145-bottom);const size=4+(190-y)/90;
            g.strokeColor=new Color(t.ink+'66');g.lineWidth=2;g.moveTo(x-13,y);g.lineTo(x+18,y+3);g.stroke();
            if(p.index%3===0)poly([[x,y+size],[x+size*2,y],[x+size*1.6,y-size],[x-3,y-2]],t.ground,t.ink+'66',1.5);
            if(this.speed>25){g.strokeColor=new Color('#FFF1CE88');g.lineWidth=3;g.moveTo(x-23,y-10);g.lineTo(x+8,y-7);g.stroke();}
        }
        for(const p of panoramaItems(this.travelled*1.12,176,w)){
            const x=p.x,y=bottom+45+p.seed*90,r=22+p.seed*20;
            g.fillColor=new Color(t.ink+'44');g.ellipse(x,y-5,r*1.3,r*.23);g.fill();
            poly([[x-r,y],[x-r*.72,y+r*.78],[x+r*.22,y+r],[x+r,y+r*.38],[x+r*.8,y-7]],mix(t.ground,t.ink,.2),t.ink,3.5);
            poly([[x-r*.72,y+r*.78],[x+r*.22,y+r],[x+r*.5,y+r*.46],[x-r*.3,y+r*.32]],mix(t.road,t.ground,.45));
            g.strokeColor=new Color(t.ink+'99');g.lineWidth=2;for(let i=0;i<3;i++){g.moveTo(x+r*.2+i*5,y+r*.3);g.lineTo(x+r*.05+i*5,y+2);g.stroke();}
        }
        g.fillColor=new Color(t.ink+'30');for(let row=0;row<4;row++)for(let col=0;col<7;col++){g.circle(w/2-15-col*16,top-22-row*16,1.6+row*.3);g.fill();}
    }
}
