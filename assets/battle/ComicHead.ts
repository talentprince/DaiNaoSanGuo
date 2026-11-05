import { Color, Graphics, Node } from 'cc';
import { faceDesign, heroColor, isFemaleHero } from '../data/HeroIdentity';
import type { FaceShape } from '../data/HeroIdentity';
import { makeNode } from './BattleUI';

const FACE_OUTLINES: Record<FaceShape, number[][]> = {
    square: [[-23, 13], [-25, -6], [-18, -21], [17, -23], [25, -8], [23, 13], [0, 20]],
    round: [[-23, 13], [-27, -1], [-21, -15], [-10, -24], [12, -24], [24, -12], [27, 1], [22, 14], [0, 19]],
    long: [[-19, 14], [-21, -4], [-14, -22], [1, -28], [17, -19], [21, 0], [18, 15], [0, 21]],
    pointed: [[-22, 12], [-23, -3], [-15, -16], [0, -26], [15, -17], [23, -4], [21, 13], [0, 19]],
    oval: [[-20, 12], [-23, -3], [-14, -18], [0, -24], [14, -18], [23, -3], [20, 12], [0, 19]],
};
/** Shared face, hair and headgear for battle, portraits and cards. */
export function comicHead(parent:Node,id:string,fallback:string,tier=1,rear=false,boss=false):Node {
    const node=makeNode('Head',parent,0,34);const g=node.addComponent(Graphics);
    const ink=new Color('#171B2A'),armor=new Color(heroColor(id,fallback)),female=isFemaleHero(id);
    const poly=(points:number[][],color:Color)=>{g.fillColor=color;g.strokeColor=ink;g.lineWidth=4;g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.close();g.fill();g.stroke();};
    const scholarly=['zhugeliang','simayi','jiaxu','pangtong','xunyu','mizhu','jianyong'].indexOf(id)>=0;
    const hair=new Color(female?'#252138':'#202A31');
    if(female){poly([[-22,20],[-32,4],[-29,-38],[-18,-48],[-15,-12],[16,-12],[23,-43],[31,-35],[29,7],[20,23]],hair);}
    else poly([[-24,16],[-29,-2],[-23,-22],[0,-28],[24,-20],[29,1],[22,20]],id==='zhaoyun'||id==='machao'?new Color('#D8EAF3'):id==='liubei'||id==='guanyu'||scholarly?hair:armor);
    if (rear) {
        poly([[-23, 14], [-23, -18], [0, -26], [23, -18], [23, 14]], hair);
    } else {
        const design = faceDesign(id, boss);
        const mood = design.mood;
        const eyeX = design.shape === 'long' ? 9 : 11;
        const sharp = mood === 'stern' || mood === 'roar';
        poly(FACE_OUTLINES[design.shape], new Color(design.skin));
        if (id === 'liubei') {
            g.fillColor = new Color('#E8AB73');
            g.ellipse(-24, -5, 6, 12);
            g.ellipse(24, -5, 6, 12);
            g.fill();
        }

        for (const side of [-1, 1]) {
            const x = side * eyeX;
            const height = mood === 'alert' || mood === 'roar' ? 5.4 : mood === 'calm' ? 2.5 : 3.7;
            const slant = sharp ? 3 : mood === 'sly' ? side * 1.8 : mood === 'kind' ? -1 : 0;
            const outer = x + side * 7;
            const inner = x - side * 6;
            g.strokeColor = ink;
            g.lineWidth = 1.7;
            if (mood === 'squint') {
                g.moveTo(outer, 2 + slant);
                g.quadraticCurveTo(x, 5, inner, 0);
                g.stroke();
                g.fillColor = ink;
                g.circle(x, 1, 1.8);
                g.fill();
            } else {
                g.fillColor = new Color('#FFF5DE');
                g.moveTo(outer, 2 + slant);
                g.quadraticCurveTo(x, 2 + height, inner, 0);
                g.quadraticCurveTo(x, -height - 3, outer, 2 + slant);
                g.close();
                g.fill();
                g.stroke();
                const pupil = x + (mood === 'sly' ? 1.8 : -side * 0.5);
                g.fillColor = boss ? new Color('#B94F40') : ink;
                g.ellipse(pupil, 0.5, 2.25, Math.min(3.5, height + 0.5));
                g.fill();
                if (height >= 3.7) {
                    g.fillColor = new Color('#FFFFFF');
                    g.circle(pupil - 0.6, 1.8, 0.9);
                    g.fill();
                }
            }
            g.strokeColor = hair;
            g.lineWidth = sharp ? 4.4 : female ? 2.1 : 2.9;
            g.moveTo(outer - side, 10 + slant + (mood === 'sly' && side === -1 ? 2 : 0));
            g.quadraticCurveTo(x, mood === 'kind' ? 15 : 11, inner, sharp ? 6 : 8);
            g.stroke();
        }
        g.strokeColor = new Color('#774936');
        g.lineWidth = design.shape === 'round' ? 2.2 : 1.5;
        g.moveTo(0, 3);
        g.quadraticCurveTo(-2, -4, -4, -7);
        g.quadraticCurveTo(0, -9, 4, -7);
        g.stroke();

        if (mood === 'roar') {
            poly([[-16, -11], [17, -10], [13, -22], [4, -25], [-10, -22]], new Color('#612D35'));
            g.fillColor = new Color('#FFF2CE');
            g.moveTo(-12, -12); g.lineTo(13, -11); g.lineTo(9, -16); g.lineTo(-9, -16); g.close(); g.fill();
            g.fillColor = new Color('#CF7561');
            g.ellipse(1, -21, 5, 2); g.fill();
        } else {
            g.strokeColor = new Color(female ? '#9B4551' : '#58372C');
            g.lineWidth = mood === 'stern' ? 2.7 : 2.3;
            if (mood === 'kind') {
                g.moveTo(-9, -13); g.quadraticCurveTo(0, -22, 10, -13);
            } else if (mood === 'sly') {
                g.moveTo(-8, -16); g.quadraticCurveTo(2, -20, 11, -12);
            } else {
                g.moveTo(-7, -15); g.quadraticCurveTo(0, mood === 'stern' ? -11 : -17, 7, -15);
            }
            g.stroke();
        }

        if (design.detail === 'scar' || design.detail === 'paint') {
            g.strokeColor = new Color(design.detail === 'scar' ? '#824837' : '#A33C36');
            g.lineWidth = design.detail === 'scar' ? 2.4 : 3.5;
            g.moveTo(19, -3); g.lineTo(13, -13); g.stroke();
            if (design.detail === 'paint') { g.moveTo(-19, -6); g.lineTo(-12, -12); g.stroke(); }
        } else if (design.detail === 'age') {
            g.strokeColor = new Color('#97684F');
            g.lineWidth = 1.4;
            for (const side of [-1, 1]) {
                g.moveTo(side * 15, -6); g.lineTo(side * 20, -8);
                g.moveTo(side * 13, -10); g.lineTo(side * 17, -13);
            }
            g.stroke();
        } else if (design.detail === 'freckles') {
            g.fillColor = new Color('#A86544');
            for (const side of [-1, 1]) {
                g.circle(side * 13, -8, 1.15);
                g.circle(side * 17, -7, 1.1);
                g.circle(side * 16, -11, 0.9);
            }
            g.fill();
        }
    }
    if(id.startsWith('mob-')){
        const kind=id.slice(4);
        if(kind==='shield'){poly([[-28,14],[-24,31],[0,39],[25,29],[29,14]],new Color('#7F8C93'));g.strokeColor=new Color('#D6DCE0');g.lineWidth=3;g.moveTo(0,37);g.lineTo(0,16);g.stroke();}
        else if(kind==='bow'){poly([[-31,14],[-9,36],[5,25],[29,14]],new Color('#AE8853'));}
        else if(kind==='shaman'){poly([[-22,13],[-14,46],[3,53],[20,13]],new Color('#6D4B91'));poly([[-7,29],[7,28],[5,-2],[-6,0]],new Color('#E6CD6E'));g.strokeColor=new Color('#9D4638');g.lineWidth=2;g.moveTo(0,25);g.lineTo(-3,17);g.lineTo(4,14);g.lineTo(-1,5);g.stroke();}
        else if(kind==='axe'){poly([[-27,12],[-24,28],[-8,36],[9,24],[26,11]],new Color('#5D5968'));g.strokeColor=new Color('#B94F44');g.lineWidth=3;g.moveTo(-17,0);g.lineTo(-5,-8);g.stroke();}
        else {poly([[-26,13],[-22,25],[19,23],[27,12]],new Color(kind === 'blade' ? '#BC4B46' : '#647F52'));poly([[23,19],[43,26],[33,8],[24,10]],new Color(kind === 'blade' ? '#D57559' : '#8DA46E'));}
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
    if (!rear && id === 'zhangfei') {
        poly([[-24, -6], [-16, -15], [-12, -24], [3, -28], [16, -22], [19, -13], [25, -6], [25, -23], [12, -35], [-12, -34], [-24, -23]], hair);
    }
    if (!rear && ['caocao', 'zhugeliang', 'huangzhong', 'huatuo', 'chengpu', 'huanggai'].indexOf(id) >= 0) {
        const gray = ['huangzhong', 'huatuo', 'chengpu', 'huanggai'].indexOf(id) >= 0;
        const beard = new Color(gray ? '#E1DCC8' : '#273239');
        g.strokeColor = beard;
        g.lineWidth = gray ? 3.1 : 2.4;
        g.moveTo(-2, -11); g.quadraticCurveTo(-11, -10, -15, -15);
        g.moveTo(2, -11); g.quadraticCurveTo(11, -10, 15, -15); g.stroke();
        poly([[-8, -20], [9, -20], [6, -29], [0, id === 'zhugeliang' ? -38 : -33], [-6, -28]], beard);
    }
    if(id==='world-dongzhuo'){poly([[-22,-8],[-16,-18],[-12,-28],[0,-35],[12,-26],[17,-15],[23,-8],[21,-35],[0,-45],[-20,-35]],new Color('#422B26'));poly([[-26,20],[-23,35],[-9,29],[0,41],[11,29],[24,35],[26,20]],new Color('#E1B147'));}
    if(id==='world-zhangjiao'){poly([[-19,23],[-12,51],[0,58],[13,49],[20,23]],new Color('#DDBF56'));g.strokeColor=new Color('#C6DFFF');g.lineWidth=3;g.moveTo(-8,29);g.lineTo(4,44);g.lineTo(-1,38);g.lineTo(9,48);g.stroke();poly([[-8,-17],[-6,-42],[0,-51],[7,-39],[8,-17]],new Color('#DAD6C3'));}
    if(id==='world-menghuo'){poly([[-28,17],[-40,38],[-19,31],[0,48],[19,31],[41,39],[27,16]],new Color('#8FC177'));g.fillColor=new Color('#E8DBB3');g.moveTo(-20,-13);g.lineTo(-28,0);g.lineTo(-12,-9);g.moveTo(20,-13);g.lineTo(28,0);g.lineTo(12,-9);g.fill();}
    if(boss){g.fillColor=new Color('#DDB34D');g.moveTo(-20,23);g.lineTo(-34,42);g.lineTo(-9,29);g.moveTo(20,23);g.lineTo(34,42);g.lineTo(9,29);g.fill();}
    return node;
}
