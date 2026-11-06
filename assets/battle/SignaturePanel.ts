import { Node } from 'cc';
import { getHero } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import { chapterSignatureSource } from '../data/ChapterConfig';
import { signatureFor,signatureEffect } from '../data/EquipmentConfig';
import { UnitActor } from './UnitActor';
import { previewUnit } from './UnitPreview';
import { equipmentIcon } from './EquipmentIcon';
import { panel,text,button } from './BattleUI';
import type { ProgressStore } from './ProgressStore';
export function showSignature(parent:Node,store:ProgressStore,id:HeroId,onChanged:()=>void):void{
    const overlay=panel(parent,'DirectSignatureShop',0,0,720,1280,'#152033',0);
    overlay.on(Node.EventType.TOUCH_END,()=>{});
    const hero=getHero(id)!,p=store.progress,item=signatureFor(id),owned=p.inventory.some(i=>i.id===item.id),hasHero=p.owned.indexOf(id)>=0;
    text(overlay,'SignatureHeading',`${hero.name} · 专 武`,0,552,36,'#F5D286');
    text(overlay,'SignatureWeaponName',item.name,0,483,28,'#FFE3A0');
    const showcase=panel(overlay,'SignaturePreview',0,259,636,354,'#3C3043',22);
    const actor=new UnitActor(showcase,previewUnit({...hero,signature:id}),-145,-48,-145,-48,1.55,1);
    actor.hp.node.active=false;actor.hpText.node.active=false;actor.node.getChildByName('Name')!.active=false;
    equipmentIcon(showcase,item,161).setPosition(168,20);
    text(showcase,'PreviewTag','专武造型预览 · 仅本人可用',0,-145,20,'#DEC9A7',610);
    text(overlay,'SignatureStats',`攻击+${item.attack} · 防御+${item.defense} · 生命+${item.maxHp}`,0,23,23,'#CDE1DC',640);
    text(overlay,'SignatureRule',signatureEffect(id),0,-41,21,'#D7D4B3',640);
    text(overlay,'SignatureSource',owned?'已收入行装':chapterSignatureSource(id),0,-165,28,'#FFD37C',640);
    text(overlay,'SignatureTiming','专武限本人穿戴 · 下一场生效',0,-246,20,'#ACBDCF',650);
    if (owned && hasHero) button(overlay,'WearSignature','穿戴这件专武',0,-372,590,78,'#89703F',()=>{
        if(store.equip(id,item.id))onChanged();
    });
    button(overlay,'CloseSignatureDetails','返回武将',0,-550,590,64,'#3A5268',()=>overlay.destroy());
}
