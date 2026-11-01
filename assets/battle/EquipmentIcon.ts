import { Color, Graphics, Node } from 'cc';
import type { Equipment } from '../data/EquipmentConfig';
import { slotOf } from '../data/EquipmentConfig';
import { makeNode } from './BattleUI';
/** Original vector item art shared by slots and drag ghosts. */
export function equipmentIcon(parent: Node, item: Equipment, size=72): Node {
    const node=makeNode(`Icon-${item.id}`,parent);node.setScale(size/80,size/80,1);
    const g=node.addComponent(Graphics);const gold=item.exclusive?'#FFD059':['#A6B9C9','#65C5ED','#CC8FFF'][item.rarity-1];
    g.fillColor=new Color('#192C43');g.roundRect(-39,-39,78,78,12);g.fill();
    g.strokeColor=new Color(gold);g.lineWidth=item.exclusive?4:2;g.roundRect(-38,-38,76,76,12);g.stroke();
    g.lineWidth=3;g.strokeColor=new Color('#191D2C');g.fillColor=new Color(gold);
    const shape=(points:number[][])=>{g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
    if(slotOf(item)==='armor'){
        shape([[-14,29],[-29,20],[-33,-1],[-20,-8],[-18,-29],[18,-29],[20,-8],[33,-1],[29,20],[14,29],[0,20]]);
        g.strokeColor=new Color('#FFF2C9');g.lineWidth=2;[-12,0,12].forEach(y=>{g.moveTo(-14,y);g.lineTo(14,y);g.stroke();});
    }else if(slotOf(item)==='charm'){
        shape([[-22,24],[22,24],[28,0],[17,-25],[-17,-25],[-28,0]]);g.fillColor=new Color('#253951');g.circle(0,2,13);g.fill();
        g.strokeColor=new Color(gold);g.lineWidth=4;g.moveTo(-7,4);g.lineTo(7,4);g.moveTo(0,12);g.lineTo(0,-9);g.stroke();g.strokeColor=new Color('#ED7059');g.moveTo(0,-25);g.lineTo(0,-35);g.stroke();
    }else{
        const w=item.appearance||'sword';
        if(w==='bow'){g.strokeColor=new Color(gold);g.lineWidth=6;g.arc(-9,0,30,-1.25,1.25,false);g.stroke();g.lineWidth=2;g.moveTo(0,-28);g.lineTo(0,28);g.moveTo(-24,0);g.lineTo(31,0);g.stroke();}
        else if(w==='fan'||w==='ribbon'){for(let i=0;i<5;i++){const x=-27+i*13;shape([[0,-27],[x-7,22],[x,32],[x+8,22]]);}}
        else if(w==='qin'){g.roundRect(-15,-31,30,62,8);g.fill();g.strokeColor=new Color('#FFF1CC');g.lineWidth=1.5;[-9,-3,3,9].forEach(x=>{g.moveTo(x,-24);g.lineTo(x,24);g.stroke();});}
        else if(['spear','glaive','serpent','halberd','staff'].indexOf(w)>=0){
            g.strokeColor=new Color('#B9915A');g.lineWidth=6;g.moveTo(0,-33);g.lineTo(0,26);g.stroke();shape([[0,38],[-7,20],[7,20]]);
            if(w==='glaive'){
                g.fillColor=new Color(item.exclusive?'#B3ECD0':gold);g.strokeColor=new Color('#19212C');g.lineWidth=2.5;
                g.moveTo(0,16);g.lineTo(0,34);g.quadraticCurveTo(22,33,19,36);g.quadraticCurveTo(41,15,0,11);g.close();g.fill();g.stroke();
                g.strokeColor=new Color('#F3FFE8');g.lineWidth=2;g.moveTo(4,16);g.quadraticCurveTo(31,20,21,31);g.stroke();
                g.fillColor=new Color('#47886C');g.circle(0,8,4);g.fill();
            }
            if(w==='halberd'){shape([[0,27],[22,37],[27,16],[0,11]]);shape([[-2,26],[-15,35],[-19,16],[-1,12]]);}
            if(w==='serpent'){g.strokeColor=new Color(gold);g.lineWidth=5;g.moveTo(0,16);g.bezierCurveTo(-21,26,19,28,0,37);g.stroke();}
            if(w==='staff'){g.fillColor=new Color('#65E7B7');g.circle(0,25,11);g.fill();}
        }else{
            shape([[-5,-17],[-11,15],[0,36],[11,15],[5,-17]]);g.strokeColor=new Color('#F8D987');g.lineWidth=6;g.moveTo(-17,-15);g.lineTo(17,-15);g.moveTo(0,-16);g.lineTo(0,-33);g.stroke();
            if(w==='dual'){g.lineWidth=4;g.moveTo(-23,-25);g.lineTo(-23,17);g.stroke();}if(w==='axe')shape([[0,24],[28,30],[30,3],[0,8]]);
        }
    }
    if(item.exclusive){g.fillColor=new Color('#FFF1A9');shape([[27,34],[30,25],[38,22],[30,19],[27,11],[24,19],[16,22],[24,25]]);}
    return node;
}
