import { showSignature } from './SignaturePanel';
import { Color,Graphics,Node,UIOpacity } from 'cc';
import { getHero,TIER_COLORS,TIER_NAMES } from '../data/HeroCatalog';
import type { HeroId, HeroTier } from '../data/HeroCatalog';
import { createHeroes } from '../data/BattleConfig';
import { bondProgress } from '../data/BondConfig';
import { ELEMENT_NAMES } from '../data/HeroIdentity';
import { formatAmount,STAR_COSTS } from '../data/GrowthConfig';
import { chapterOfficerSource } from '../data/ChapterConfig';
import { signatureFor,signatureEffect } from '../data/EquipmentConfig';
import { UnitActor } from './UnitActor';
import { previewUnit } from './UnitPreview';
import { button,makeNode,panel,text } from './BattleUI';
import type { ProgressStore } from './ProgressStore';
export type HeroTierFilter = 'all' | HeroTier;
export function heroTierLabel(filter: HeroTierFilter): string {
    return filter === 'all' ? '全部品级' : TIER_NAMES[filter - 1];
}
export function showHeroTierFilter(parent: Node, selected: HeroTierFilter, choose: (filter: HeroTierFilter) => void): void {
    const overlay = panel(parent, 'HeroTierDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
    overlay.on(Node.EventType.TOUCH_END, () => {});
    const sheet = panel(overlay, 'HeroTierSheet', 0, 20, 552, 382, '#17283D', 20);
    text(sheet, 'HeroTierHeading', '按武将品级筛选', -22, 135, 29, '#F0D29D', 410);
    button(sheet, 'CloseHeroTier', '×', 226, 136, 57, 51, '#344B62', () => overlay.destroy());
    (['all', 1, 2, 3, 4, 5] as const).forEach((filter, i) => {
        const y = 61 - Math.floor(i / 2) * 79;
        const x = (i % 2 ? 1 : -1) * 124;
        const control = button(sheet, `HeroTier-${filter}`, heroTierLabel(filter), x, y, 231, 59,
            selected === filter ? '#77603D' : '#354D63', () => { overlay.destroy(); choose(filter); });
        if (filter !== 'all') control.label.color = new Color(TIER_COLORS[filter - 1]);
    });
}

export function heroArtwork(parent:Node,id:HeroId,x:number,y:number,scale:number,signature=false):Node{
    const h=getHero(id)!;const root=makeNode(`Artwork-${id}`,parent,x,y);const actor=new UnitActor(root,previewUnit({...h,signature:signature?id:undefined}),0,0,0,0,scale,1);
    actor.hp.node.active=false;actor.hpText.node.active=false;actor.node.getChildByName('Name')!.active=false;return root;
}
export function heroCard(parent:Node,store:ProgressStore,id:HeroId,x:number,y:number,width:number,height:number,footer:string,onClick:()=>void):Node{
    const p=store.progress,h=getHero(id)!,owned=p.owned.indexOf(id)>=0;const color=TIER_COLORS[h.tier-1];
    const node=panel(parent,`HeroCard-${id}`,x,y,width,height,h.tier===5?'#3D2D37':h.tier===3?'#2E2944':'#223950',13);
    const g=makeNode('CardInk',node).addComponent(Graphics);g.strokeColor=new Color(color);g.lineWidth=h.tier===5?4:2;g.roundRect(-width/2+3,-height/2+3,width-6,height-6,11);g.stroke();
    g.fillColor=new Color(color+'22');g.moveTo(-width/2+6,-height/2+45);g.lineTo(width/2-6,height/2-45);g.lineTo(width/2-6,-height/2+45);g.close();g.fill();
    const exclusive=owned&&p.loadouts[id]?.weapon===`signature-${id}`;const art=heroArtwork(node,id,-9,exclusive?3:17,width/190*(exclusive?.8:.92),exclusive);if(!owned)art.addComponent(UIOpacity).opacity=175;
    const header=panel(node,'TierBand',0,height/2-24,width-10,31,'#172236E8',6);text(header,'CardTier',TIER_NAMES[h.tier-1],0,0,17,color,width-15);
    text(node,'CardName',h.name,0,-height/2+85,25,'#F4E1B8',width-14);
    text(node,'CardStars',owned?'★'.repeat(p.stars[id]||1):h.role,0,-height/2+55,16,color,width-14);
    text(node,'CardFooter',footer,0,-height/2+24,15,'#BDD2DF',width-14);
    node.on(Node.EventType.TOUCH_END,onClick);return node;
}
export function heroDetails(parent:Node,store:ProgressStore,id:HeroId,onChanged:()=>void,loot?: { source: string; onClose?: () => void }):void{
    const overlay=panel(parent,'HeroDetails',0,0,720,1280,'#101725FC',0);overlay.on(Node.EventType.TOUCH_END,()=>{});
    const close = () => { overlay.destroy(); loot?.onClose?.(); };
    const p=store.progress,h=getHero(id)!,owned=!loot&&p.owned.indexOf(id)>=0,stars=owned?p.stars[id]||1:1;
    const config=createHeroes([id],p.heroLevel,owned?store.getEquipmentBonuses():{})[0];
    text(overlay,'HeroDetailTitle',`${h.name} · ${TIER_NAMES[h.tier-1]}`,0,552,38,TIER_COLORS[h.tier-1]);
    button(overlay,'CloseDetail','×',306,553,60,54,'#35445A',close);
    const art=panel(overlay,'DetailArt',0,315,626,365,'#233449',20);heroArtwork(art,id,-10,-86,1.5,!!config.signature);
    text(art,'ArtStars','★'.repeat(stars),0,-151,24,'#F0CC77');
    text(overlay,'PreviewLevel',`Lv.${p.heroLevel} · ${owned?'当前穿戴与星级':'1星属性预览'}`,0,92,21,'#AAC4D5');
    const attributes=[['攻击',config.attack],['防御',config.defense],['生命',config.maxHp]] as const;
    attributes.forEach(([label,n],i)=>{panel(overlay,`Stat-${label}`,(i-1)*214,23,200,82,'#263C50');const box=overlay.getChildByName(`Stat-${label}`)!;text(box,'StatLabel',label,0,20,18,'#9EB8CE',190);text(box,'StatValue',formatAmount(n),0,-16,25,'#F1D799',190);});
    text(overlay,'SkillName',`${h.skillName} · ${ELEMENT_NAMES[h.element||'slash']}`,0,-55,25,'#F0D18D');
    const attackLimit=h.tier===5?'全场':`最多${h.tier}个目标`;
    const rule=h.tactic==='heal'?h.tier===2?'单体治疗22%生命':h.tier===3?'全体治疗12%生命':h.id==='huatuo'?'全体治疗20%并附护盾':'全体治疗16%并附战意':`攻击技能${attackLimit}${h.element==='fire'?'，附4秒灼烧':h.element==='blizzard'?'，减速25%持续4秒':h.element==='poison'?'，4秒中毒并抑疗25%':''}`;
    text(overlay,'SkillRule',rule,0,-101,19,'#B4CADD',640);
    const signature=signatureFor(id);text(overlay,'Exclusive',`${signature.name}：${signatureEffect(id)}`,0,-147,18,'#CDBA93',640);
    if (loot) {
        text(overlay, 'LootOfficerSource', loot.source, 0, -239, 23, '#E2CF9B', 620);
        text(overlay, 'LootOfficerRule', '首次获得将帖即入队 · 重复获得转为专属碎片 ×20', 0, -299, 19, '#B8CCDA', 630);
        button(overlay, 'CloseHeroDetails', '返回战利品', 0, -500, 540, 65, '#3E5C70', close);
        return;
    }
    button(overlay,'GetHeroSignature','查看专武造型与来源',0,-193,600,47,'#6C553D',()=>showSignature(overlay,store,id,onChanged));
    text(overlay,'BondTitle','羁绊 · 按当前出战随将',0,-249,22,'#E0C99D');
    const companions = store.chapterFormation.companions.filter(entry => entry.hero).map(entry => entry.hero!);
    const related = bondProgress(companions).filter(b => b.bond.members.indexOf(id) >= 0);
    related.slice(0,3).forEach((b,i)=>text(overlay,`Bond-${b.bond.id}`,`${b.active?'已激活':'未激活'} · ${b.bond.name} ${b.count}/${b.bond.need} · ${b.bond.desc}`,0,-285-i*35,18,b.active?'#9CDEB0':'#9BB2C8',650));
    if(!related.length)text(overlay,'NoBond','暂无特定羁绊，后续持续扩展',0,-299,19,'#92ACC2');
    const note=text(overlay,'DetailNote',owned?`专属碎片 ${p.fragments[id]||0} · 脑力 ${p.souls}`:chapterOfficerSource(id),0,-399,18,'#AAC6BB',640);
    if (owned) button(overlay,'ConfirmStar',stars>=6?'已满6星':`升星 · 碎片 ${Math.min(p.fragments[id]||0,STAR_COSTS[stars-1])} + 脑力 ${Math.max(0,STAR_COSTS[stars-1]-(p.fragments[id]||0))}`,0,-477,570,72,'#79643E',()=>{
        const error=store.starUp(id);if(error){note.string=error;return;}onChanged();
    });
    button(overlay,'FragmentSources','升星材料来源',-149,-571,284,60,'#425C69',()=>{
        const info=panel(overlay,'FragmentSourcesOverlay',0,0,720,1280,'#152436',0);info.on(Node.EventType.TOUCH_END,()=>{});
        text(info,'SourcesTitle',`${h.name} · 升星材料`,0,465,36,'#F0D39A');
        text(info,'OwnedFragments',`本将碎片 ${p.fragments[id]||0} · 脑力 ${p.souls}`,0,350,24,'#BBD4C8',650);
        text(info,'SourceChapter',chapterOfficerSource(id),0,220,25,'#E7CFA5',650);
        text(info,'SourceDuplicate','重复获得同一将帖 → 本将碎片 ×20',0,165,21,'#A9C1D1',650);
        text(info,'SourceDungeon','战图胜利可获脑力，每日最多 20 点',0,50,24,'#D2D6AD',650);
        text(info,'SourceRule','升星优先使用本将碎片，不足可用脑力按 1:1 补足。',0,-20,21,'#B8CDDA',650);
        button(info,'CloseFragmentSources','返回武将',0,-478,590,64,'#3B556B',()=>info.destroy());
    });
    button(overlay,'CloseHeroDetails','返回',149,-571,284,60,'#344B60',()=>overlay.destroy());
}
