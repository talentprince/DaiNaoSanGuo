import { Color,Graphics,Node,UIOpacity } from 'cc';
import { getHero,TIER_COLORS,TIER_NAMES,EXCHANGE_COST } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import { createHeroes } from '../data/BattleConfig';
import { bondProgress,BONDS } from '../data/BondConfig';
import { ELEMENT_NAMES } from '../data/HeroIdentity';
import { formatAmount,STAR_COSTS } from '../data/GrowthConfig';
import { acquisition } from '../data/ActivityConfig';
import { signatureFor,signatureEffect } from '../data/EquipmentConfig';
import { UnitActor } from './UnitActor';
import { previewUnit } from './UnitPreview';
import { button,makeNode,panel,text } from './BattleUI';
import type { ProgressStore } from './ProgressStore';
export function heroArtwork(parent:Node,id:HeroId,x:number,y:number,scale:number,signature=false):Node{
    const h=getHero(id)!;const root=makeNode(`Artwork-${id}`,parent,x,y);const actor=new UnitActor(root,previewUnit({...h,signature:signature?id:undefined}),0,0,0,0,scale,1);
    actor.hp.node.active=false;actor.hpText.node.active=false;actor.node.getChildByName('Name')!.active=false;return root;
}
export function heroCard(parent:Node,store:ProgressStore,id:HeroId,x:number,y:number,width:number,height:number,footer:string,onClick:()=>void):Node{
    const p=store.progress,h=getHero(id)!,owned=p.owned.indexOf(id)>=0;const color=TIER_COLORS[h.tier-1];
    const node=panel(parent,`HeroCard-${id}`,x,y,width,height,h.tier===4?'#3D2D37':h.tier===3?'#2E2944':'#223950',13);
    const g=makeNode('CardInk',node).addComponent(Graphics);g.strokeColor=new Color(color);g.lineWidth=h.tier===4?4:2;g.roundRect(-width/2+3,-height/2+3,width-6,height-6,11);g.stroke();
    g.fillColor=new Color(color+'22');g.moveTo(-width/2+6,-height/2+45);g.lineTo(width/2-6,height/2-45);g.lineTo(width/2-6,-height/2+45);g.close();g.fill();
    const exclusive=owned&&p.loadouts[id]?.weapon===`signature-${id}`;const art=heroArtwork(node,id,-9,exclusive?3:17,width/190*(exclusive?.8:.92),exclusive);if(!owned)art.addComponent(UIOpacity).opacity=175;
    const header=panel(node,'TierBand',0,height/2-24,width-10,31,'#172236E8',6);text(header,'CardTier',TIER_NAMES[h.tier-1],0,0,17,color,width-15);
    text(node,'CardName',h.name,0,-height/2+85,25,'#F4E1B8',width-14);
    text(node,'CardStars',owned?'★'.repeat(p.stars[id]||1):h.role,0,-height/2+55,16,color,width-14);
    text(node,'CardFooter',footer,0,-height/2+24,15,'#BDD2DF',width-14);
    node.on(Node.EventType.TOUCH_END,onClick);return node;
}
export function heroDetails(parent:Node,store:ProgressStore,id:HeroId,mode:'roster'|'exchange'|'result',onChanged:()=>void,onFormation?:()=>void):void{
    const overlay=panel(parent,'HeroDetails',0,0,720,1280,'#101725FC',0);overlay.on(Node.EventType.TOUCH_END,()=>{});
    const p=store.progress,h=getHero(id)!,owned=p.owned.indexOf(id)>=0,stars=owned?p.stars[id]||1:1;
    const config=createHeroes([id],p.heroLevel,owned?store.getEquipmentBonuses():{})[0];
    text(overlay,'HeroDetailTitle',`${h.name} · ${TIER_NAMES[h.tier-1]}`,0,552,38,TIER_COLORS[h.tier-1]);
    button(overlay,'CloseDetail','×',306,553,60,54,'#35445A',()=>overlay.destroy());
    const art=panel(overlay,'DetailArt',0,315,626,365,'#233449',20);heroArtwork(art,id,-10,-86,1.5,!!config.signature);
    text(art,'ArtStars','★'.repeat(stars),0,-151,24,'#F0CC77');
    text(overlay,'PreviewLevel',`Lv.${p.heroLevel} · ${owned?'当前穿戴与星级':'1星属性预览'}`,0,92,21,'#AAC4D5');
    const attributes=[['攻击',config.attack],['防御',config.defense],['生命',config.maxHp]] as const;
    attributes.forEach(([label,n],i)=>{panel(overlay,`Stat-${label}`,(i-1)*214,23,200,82,'#263C50');const box=overlay.getChildByName(`Stat-${label}`)!;text(box,'StatLabel',label,0,20,18,'#9EB8CE',190);text(box,'StatValue',formatAmount(n),0,-16,25,'#F1D799',190);});
    text(overlay,'SkillName',`${h.skillName} · ${ELEMENT_NAMES[h.element||'slash']}`,0,-55,25,'#F0D18D');
    const attackLimit=h.tier===4?'全场':`最多${h.tier}个目标`;
    const rule=h.tactic==='heal'?h.tier===2?'单体治疗22%生命':h.tier===3?'全体治疗12%生命':h.id==='huatuo'?'全体治疗20%并附护盾':'全体治疗16%并附战意':`攻击技能${attackLimit}${h.element==='fire'?'，附4秒灼烧':h.element==='blizzard'?'，减速25%持续4秒':h.element==='poison'?'，4秒中毒并抑疗25%':''}`;
    text(overlay,'SkillRule',rule,0,-101,19,'#B4CADD',640);
    const signature=signatureFor(id);text(overlay,'Exclusive',`${signature.name}：${signatureEffect(id)}`,0,-147,18,'#CDBA93',640);
    text(overlay,'BondTitle','羁绊 · 按当前主线阵容',0,-202,24,'#E0C99D');
    const related=bondProgress(p.formation).filter(b=>b.bond.members.indexOf(id)>=0);
    related.slice(0,3).forEach((b,i)=>{text(overlay,`Bond-${b.bond.id}`,`${b.active?'已激活':'未激活'} · ${b.bond.name} ${b.count}/${b.bond.need}`,0,-236-i*54,20,b.active?'#9CDEB0':'#9BB2C8',650);text(overlay,`BondEffect-${b.bond.id}`,b.bond.desc,0,-260-i*54,18,'#AAC0CF',650);});
    if(!related.length)text(overlay,'NoBond','暂无特定羁绊，后续持续扩展',0,-249,19,'#92ACC2');
    const note=text(overlay,'DetailNote',owned?`专属碎片${p.fragments[id]||0} · 通用将魂${p.souls}`:acquisition(id),0,-399,18,'#AAC6BB',640);
    if(mode==='exchange')button(overlay,'ConfirmExchange',owned?'已拥有此将':`兑换 · ${EXCHANGE_COST[h.tier as 3|4]}脑勋`,0,-477,570,72,owned?'#3A4B5C':'#8A6B3D',()=>{
        const error=store.exchange(id);if(error){note.string=error;return;}onChanged();
    });
    else if(owned&&mode==='roster')button(overlay,'ConfirmStar',stars>=6?'已满6星':`升星 · ${STAR_COSTS[stars-1]}碎片`,0,-477,570,72,'#79643E',()=>{const error=store.starUp(id);if(error){note.string=error;return;}onChanged();});
    else button(overlay,'ViewFormation',owned?'前往布阵':'了解此将',0,-477,570,72,'#496C5B',()=>{if(owned&&onFormation){overlay.destroy();onFormation();}});
    button(overlay,'CloseHeroDetails','返回',0,-571,570,60,'#344B60',()=>overlay.destroy());
}
