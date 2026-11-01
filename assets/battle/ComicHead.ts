import { Color, Graphics, Node } from 'cc';
import { heroColor, isFemaleHero } from '../data/HeroIdentity';
import { makeNode } from './BattleUI';
/** Shared face, hair and headgear for battle, portraits and cards. */
export function comicHead(parent:Node,id:string,fallback:string,tier=1,rear=false,boss=false):Node {
    const node=makeNode('Head',parent,0,34);const g=node.addComponent(Graphics);
    const ink=new Color('#171B2A'),armor=new Color(heroColor(id,fallback)),female=isFemaleHero(id);
    const poly=(points:number[][],color:Color)=>{g.fillColor=color;g.strokeColor=ink;g.lineWidth=4;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
    const scholarly=['zhugeliang','simayi','jiaxu','pangtong','xunyu','mizhu','jianyong'].indexOf(id)>=0;
    const hair=new Color(female?'#252138':'#202A31');
    if(female){poly([[-22,20],[-32,4],[-29,-38],[-18,-48],[-15,-12],[16,-12],[23,-43],[31,-35],[29,7],[20,23]],hair);}
    else poly([[-24,16],[-29,-2],[-23,-22],[0,-28],[24,-20],[29,1],[22,20]],id==='zhaoyun'||id==='machao'?new Color('#D8EAF3'):id==='liubei'||id==='guanyu'||scholarly?hair:armor);
    if(rear){poly([[-23,14],[-23,-18],[0,-26],[23,-18],[23,14]],hair);}
    else {
        poly(female?[[-19,11],[-21,-5],[-11,-20],[3,-24],[18,-13],[21,9],[0,17]]:[[-22,11],[-23,-7],[-12,-22],[12,-23],[24,-7],[21,12],[0,18]],new Color(id==='guanyu'?'#D47451':id==='zhangfei'?'#D79A61':'#F4C58F'));
        if(id==='liubei'){g.fillColor=new Color('#E8AB73');g.ellipse(-24,-5,6,12);g.ellipse(24,-5,6,12);g.fill();}
        g.fillColor=new Color('#FFF9E7');g.moveTo(-18,4);g.lineTo(-5,2);g.lineTo(-6,-4);g.lineTo(-17,-3);g.close();g.fill();g.moveTo(5,2);g.lineTo(18,5);g.lineTo(16,-3);g.lineTo(6,-4);g.close();g.fill();
        g.fillColor=ink;g.rect(-11,-4,6,9);g.rect(9,-4,6,9);g.fill();g.fillColor=new Color('#FFFFFF');g.circle(-8,2,1.8);g.circle(12,2,1.8);g.fill();
        g.strokeColor=ink;g.lineWidth=female?2:3.6;
        if(id==='liubei'||id==='huatuo'){g.moveTo(-20,10);g.quadraticCurveTo(-10,15,-4,7);g.moveTo(4,7);g.quadraticCurveTo(13,15,21,10);}
        else {g.moveTo(-21,10);g.lineTo(-4,6);g.moveTo(4,6);g.lineTo(21,11);}g.stroke();
        g.lineWidth=1.5;g.moveTo(0,3);g.lineTo(-3,-8);g.lineTo(3,-8);g.stroke();
        if(female){g.strokeColor=new Color('#A94760');g.lineWidth=2;g.moveTo(-4,-15);g.quadraticCurveTo(2,-19,7,-14);g.stroke();g.fillColor=new Color('#EE9F8C80');g.ellipse(-16,-10,4,2);g.ellipse(16,-10,4,2);g.fill();}
        else if(boss){poly([[-16,-10],[18,-9],[15,-25],[-12,-26]],new Color('#542739'));g.fillColor=new Color('#FFF2CE');g.moveTo(-13,-11);g.lineTo(-8,-23);g.lineTo(-3,-11);g.moveTo(5,-11);g.lineTo(10,-23);g.lineTo(16,-10);g.fill();g.strokeColor=ink;g.lineWidth=6;g.moveTo(-23,14);g.lineTo(-4,5);g.moveTo(4,5);g.lineTo(24,15);g.stroke();g.fillColor=new Color('#C94A3B');g.rect(-11,-4,5,8);g.rect(9,-4,5,8);g.fill();}
        else {poly([[-14,-12],[15,-10],[12,-22],[-8,-23]],new Color('#FFF8DD'));g.strokeColor=ink;g.lineWidth=1.5;g.moveTo(-5,-13);g.lineTo(-3,-21);g.moveTo(5,-12);g.lineTo(6,-21);g.stroke();}
    }
    if(id.startsWith('mob-')){
        const kind=id.slice(4);
        if(kind==='shield'){poly([[-28,14],[-24,31],[0,39],[25,29],[29,14]],new Color('#7F8C93'));g.strokeColor=new Color('#D6DCE0');g.lineWidth=3;g.moveTo(0,37);g.lineTo(0,16);g.stroke();}
        else if(kind==='bow'){poly([[-31,14],[-9,36],[5,25],[29,14]],new Color('#AE8853'));}
        else if(kind==='shaman'){poly([[-22,13],[-14,46],[3,53],[20,13]],new Color('#6D4B91'));poly([[-7,29],[7,28],[5,-2],[-6,0]],new Color('#E6CD6E'));g.strokeColor=new Color('#9D4638');g.lineWidth=2;g.moveTo(0,25);g.lineTo(-3,17);g.lineTo(4,14);g.lineTo(-1,5);g.stroke();}
        else if(kind==='axe'){poly([[-27,12],[-24,28],[-8,36],[9,24],[26,11]],new Color('#5D5968'));g.strokeColor=new Color('#B94F44');g.lineWidth=3;g.moveTo(-17,0);g.lineTo(-5,-8);g.stroke();}
        else {poly([[-26,13],[-22,25],[19,23],[27,12]],new Color(kind==='blade'?'#B24A43':'#6D8694'));poly([[23,19],[43,26],[33,8],[24,10]],new Color('#BC6651'));}
    }else if(id==='guanyu'){
        // A fitted wrapped green kerchief, not a floating gold helmet strip.
        poly([[-26,12],[-23,24],[-11,29],[19,24],[26,13],[8,16],[-9,15]],new Color('#1D7759'));
        poly([[23,18],[36,10],[29,1],[22,10]],new Color('#237E5F'));
        if(!rear){poly([[-15,-11],[-9,-20],[-11,-39],[0,-49],[12,-36],[10,-20],[15,-11]],hair);g.strokeColor=new Color('#51695C');g.lineWidth=1.2;[-6,0,6].forEach(x=>{g.moveTo(x,-21);g.lineTo(x*.45,-39);g.stroke();});}
    }else if(id==='liubei'){
        poly([[-21,16],[-18,24],[-8,28],[9,28],[22,17],[12,14],[0,18],[-12,14]],hair);
        poly([[-7,24],[-9,36],[-2,41],[8,36],[7,24]],hair);g.fillColor=new Color('#E5BD60');g.roundRect(-10,24,20,5,2);g.fill();
        if(!rear){g.fillColor=hair;g.moveTo(-7,-14);g.lineTo(7,-14);g.lineTo(2,-26);g.close();g.fill();}
    }else if(female){
        poly([[-24,12],[-21,24],[-9,29],[7,27],[24,15],[12,9],[0,18],[-10,10]],hair);
        if(id==='sunshangxiang'||id==='zhurong'){poly([[12,25],[26,39],[37,34],[32,10],[24,18]],new Color(id==='zhurong'?'#A93829':'#45273D'));}
        else {g.fillColor=hair;g.circle(-19,24,9);g.circle(19,24,9);g.fill();}
        g.fillColor=new Color(id==='xiaoqiao'?'#B5ECFF':id==='zhenji'?'#B8C8FF':'#F2B7CB');g.circle(-21,24,5);g.circle(21,24,5);g.fill();
        g.strokeColor=new Color('#EBC981');g.lineWidth=2;g.moveTo(-30,25);g.lineTo(29,28);g.stroke();
        g.strokeColor=armor;g.lineWidth=3;g.moveTo(-23,18);g.quadraticCurveTo(-36,1,-28,-25);g.moveTo(23,18);g.quadraticCurveTo(36,1,28,-25);g.stroke();
        if(id==='huangyueying'){g.strokeColor=new Color('#E5BD55');g.lineWidth=3;g.circle(-9,21,7);g.circle(9,21,7);g.stroke();}
    }else if(id==='lvbu'){
        poly([[-25,14],[-18,28],[0,35],[18,28],[25,14]],new Color('#D2A04D'));
        g.strokeColor=new Color('#B43441');g.lineWidth=6;g.moveTo(-11,25);g.bezierCurveTo(-5,83,-73,91,-54,43);g.moveTo(11,25);g.bezierCurveTo(5,83,73,91,54,43);g.stroke();
    }else if(scholarly||id==='caocao'||id==='sunquan'){
        poly([[-24,16],[-20,30],[-11,34],[11,34],[21,29],[24,16]],new Color(id==='zhugeliang'?'#254D71':'#343047'));
        if(id==='zhugeliang'||id==='simayi'){poly([[-12,30],[-11,45],[11,45],[12,30]],new Color(id==='zhugeliang'?'#284D70':'#332C48'));}
        g.strokeColor=new Color('#DBBD70');g.lineWidth=2;g.moveTo(-22,18);g.lineTo(22,18);g.stroke();
    }else{
        poly([[-25,14],[-18,28],[0,33],[20,27],[25,14]],id==='zhaoyun'||id==='machao'?new Color('#DBEBF3'):armor);
        if(['zhaoyun','machao','zhangliao','sunce'].indexOf(id)>=0){poly([[-5,28],[-15,49],[-3,57],[12,52],[9,34]],new Color(id==='sunce'?'#E3733B':'#F5F2DC'));}
    }
    if(!rear&&['zhangfei','caocao','huangzhong','huatuo'].indexOf(id)>=0){poly([[-14,-11],[14,-11],[9,-27],[0,-34],[-10,-26]],new Color(id==='huangzhong'||id==='huatuo'?'#E5E4CE':'#273239'));}
    if(id==='world-dongzhuo'){poly([[-22,-8],[-16,-18],[-12,-28],[0,-35],[12,-26],[17,-15],[23,-8],[21,-35],[0,-45],[-20,-35]],new Color('#422B26'));poly([[-26,20],[-23,35],[-9,29],[0,41],[11,29],[24,35],[26,20]],new Color('#E1B147'));}
    if(id==='world-zhangjiao'){poly([[-19,23],[-12,51],[0,58],[13,49],[20,23]],new Color('#DDBF56'));g.strokeColor=new Color('#C6DFFF');g.lineWidth=3;g.moveTo(-8,29);g.lineTo(4,44);g.lineTo(-1,38);g.lineTo(9,48);g.stroke();poly([[-8,-17],[-6,-42],[0,-51],[7,-39],[8,-17]],new Color('#DAD6C3'));}
    if(id==='world-menghuo'){poly([[-28,17],[-40,38],[-19,31],[0,48],[19,31],[41,39],[27,16]],new Color('#8FC177'));g.fillColor=new Color('#E8DBB3');g.moveTo(-20,-13);g.lineTo(-28,0);g.lineTo(-12,-9);g.moveTo(20,-13);g.lineTo(28,0);g.lineTo(12,-9);g.fill();}
    if(boss){g.fillColor=new Color('#DDB34D');g.moveTo(-20,23);g.lineTo(-34,42);g.lineTo(-9,29);g.moveTo(20,23);g.lineTo(34,42);g.lineTo(9,29);g.fill();}
    return node;
}
