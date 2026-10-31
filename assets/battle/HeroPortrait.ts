import { Color,Graphics,Mask,Node,UITransform } from 'cc';
import { getHero,TIER_COLORS } from '../data/HeroCatalog';
import { heroColor } from '../data/HeroIdentity';
import type { FormationMember } from '../data/FormationConfig';
import { comicHead } from './ComicHead';
import { makeNode } from './BattleUI';
export function portrait(parent:Node,member:FormationMember,size:number):Node{
    const node=makeNode('Portrait',parent);node.addComponent(UITransform).setContentSize(90,90);node.setScale(size/90,size/90,1);
    const hero=member.hero?getHero(member.hero):undefined;const color=heroColor(member.hero||'',hero?.color||'#7E93A2');
    const bg=node.addComponent(Graphics);bg.fillColor=new Color('#152439');bg.circle(0,0,43);bg.fill();
    const crop=makeNode('PortraitCrop',node);crop.addComponent(UITransform).setContentSize(78,78);crop.addComponent(Mask).type=Mask.Type.GRAPHICS_ELLIPSE;
    const shoulders=makeNode('Shoulders',crop,0,-29).addComponent(Graphics);shoulders.fillColor=new Color(color);shoulders.roundRect(-32,-20,64,30,8);shoulders.fill();
    const head=comicHead(crop,member.hero||`soldier-${member.troop}`,color,hero?.tier||1);head.setPosition(0,-4);head.setScale(1,1,1);
    const rim=makeNode('PortraitRim',node).addComponent(Graphics);rim.strokeColor=new Color(hero?TIER_COLORS[hero.tier-1]:'#9CAEB7');rim.lineWidth=3;rim.circle(0,0,42);rim.stroke();
    if(!hero){rim.strokeColor=new Color('#EEE0AB');rim.lineWidth=3;if(member.troop==='bow'){rim.arc(25,-10,15,-1.2,1.2,false);rim.stroke();}else{rim.moveTo(28,-30);rim.lineTo(28,15);rim.stroke();}}
    return node;
}
