import { previewUnit } from './UnitPreview';
import { EventTouch, Node, UITransform, Vec3 } from 'cc';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import { SIGNATURE_COST } from '../data/GrowthConfig';
import { equipmentStats, signatureFor, signatureEffect, SLOT_NAMES, SLOT_ORDER, slotOf } from '../data/EquipmentConfig';
import type { Equipment, EquipmentRune, EquipmentSlot } from '../data/EquipmentConfig';
import { equipmentScore, ProgressStore, RARITY_NAMES, RARITY_COLORS } from './ProgressStore';
import type { HeroId } from './ProgressStore';
import type { Unit } from './BattleEngine';
import { UnitActor } from './UnitActor';
import { portrait } from './HeroPortrait';
import { equipmentIcon } from './EquipmentIcon';
import { button, makeNode, panel, text } from './BattleUI';
import { WORKSHOPS } from '../data/ChapterConfig';
import type { WorkshopIndex } from '../data/ChapterConfig';
export class InventoryPanel {
    readonly node:Node;
    private selected:HeroId;
    private heroPage=0;private page=0;private filter:EquipmentSlot|'all'='all';private picked='';private shop=false;
    private note='装备拖进人物旁的对应格子；拖回下方背包可卸下';private ghost:Node|null=null;
    private slots:Record<EquipmentSlot,{x:number;y:number}>={weapon:{x:-242,y:267},armor:{x:242,y:267},charm:{x:242,y:129}};
    constructor(parent:Node,private store:ProgressStore,private onClose:()=>void,signatureShop=false){
        this.shop=signatureShop;this.selected=store.progress.formation.find(h=>store.progress.owned.indexOf(h)>=0)||store.progress.owned[0];this.node=panel(parent,'InventoryOverlay',0,0,720,1280,'#101A2C',0);
        this.node.on(Node.EventType.TOUCH_END,()=>{});this.render();
    }
    private owner(item:Equipment):HeroId|undefined{const p=this.store.progress;return p.owned.find(h=>SLOT_ORDER.map(slot=>p.loadouts[h]?.[slot]).indexOf(item.id)>=0);}
    private render():void{
        this.node.destroyAllChildren();this.ghost=null;const p=this.store.progress;const hero=getHero(this.selected)!;
        text(this.node,'InventoryTitle','武 将 · 行 装',-40,563,38,'#F0D29D',540);
        button(this.node,'CloseInventory','×',300,566,64,58,'#334760',()=>{this.node.destroy();this.onClose();});
        const pages=Math.max(1,Math.ceil(p.owned.length/5));
        button(this.node,'PrevHero','‹',-317,463,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+pages-1)%pages;this.render();});
        button(this.node,'NextHero','›',317,463,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+1)%pages;this.render();});
        p.owned.slice(this.heroPage*5,this.heroPage*5+5).forEach((id,i)=>{
            const cell=panel(this.node,`HeroTab-${id}`,(i-2)*117,466,104,108,id===this.selected?'#5B6550':'#22354C');
            portrait(cell,{hero:id},65).setPosition(0,10);text(cell,'HeroName',getHero(id)!.name,0,-36,18,'#F0DEBF',100);
            cell.on(Node.EventType.TOUCH_END,()=>{this.selected=id;this.picked='';this.render();});
        });
        const pedestal=panel(this.node,'HeroShowcase',0,240,640,305,'#1C3044',24);const model=makeNode('Model',pedestal,-25,-10);
        const sig=p.inventory.find(i=>i.id===p.loadouts[this.selected]?.weapon)?.exclusive;
        const unit:Unit=previewUnit({...hero,signature:sig,stars:p.stars[this.selected]||1});
        const actor=new UnitActor(model,unit,0,0,0,0,1.7,1);actor.hp.node.active=false;actor.hpText.node.active=false;actor.node.getChildByName('Name')!.active=false;
        text(pedestal,'HeroStars',`${hero.name}  ${'★'.repeat(p.stars[this.selected]||1)}${'☆'.repeat(6-(p.stars[this.selected]||1))}`,0,-119,23,TIER_COLORS[hero.tier-1],330);
        SLOT_ORDER.forEach(slot=>{
            const pos=this.slots[slot];const item=p.inventory.find(i=>i.id===p.loadouts[this.selected]?.[slot]);
            const cell=panel(this.node,`EquipmentSlot-${slot}`,pos.x,pos.y,105,105,this.filter===slot?'#6C6750':'#30475D',13);
            if(item){equipmentIcon(cell,item,79);this.bindDrag(cell,item,slot);}
            else{text(cell,'EmptySlot','＋',0,7,36,'#8198A9',90);cell.on(Node.EventType.TOUCH_END,()=>{this.filter=slot;this.shop=false;this.page=0;this.picked='';this.note=`选择下方${SLOT_NAMES[slot]}，再点穿戴或拖入格子`;this.render();});}
            text(cell,'SlotLabel',SLOT_NAMES[slot],slot==='charm'?-91:0,slot==='charm'?0:-64,18,'#B9C8CE',slot==='charm'?74:110);
        });
        button(this.node,'OpenSignatureShop',this.shop?'返回背包':`专武兑换 · ${SIGNATURE_COST}脑勋`,-171,51,294,49,this.shop?'#665840':'#3C5266',()=>{this.shop=!this.shop;this.picked='';this.render();});
        if(!this.shop)button(this.node,'EquipBest','一键配装',171,51,294,49,'#53654A',()=>{SLOT_ORDER.forEach(slot=>this.store.equipBest(this.selected,slot));this.note='已按评分配装，下一场生效';this.render();});
        if(this.shop){this.signatureShop();return;}
        (['all',...SLOT_ORDER] as const).forEach((slot,i)=>button(this.node,`Filter-${slot}`,slot==='all'?'全部':SLOT_NAMES[slot],(i-1.5)*159,-9,145,40,this.filter===slot?'#776340':'#293F56',()=>{this.filter=slot;this.page=0;this.render();}));
        const items=p.inventory.filter(i=>this.filter==='all'||slotOf(i)===this.filter).sort((a,b)=>Number(!!b.exclusive)-Number(!!a.exclusive)||equipmentScore(b)-equipmentScore(a)||a.id.localeCompare(b.id));
        const bagPages=Math.max(1,Math.ceil(items.length/8));this.page=Math.min(this.page,bagPages-1);
        items.slice(this.page*8,this.page*8+8).forEach((item,i)=>{
            const owner=this.owner(item);const cell=panel(this.node,`Equipment-${item.id}`,(i%4-1.5)*159,-93-Math.floor(i/4)*134,145,130,this.picked===item.id?'#5D674E':'#21364E',12);
            equipmentIcon(cell,item,72).setPosition(0,12);text(cell,'ItemName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,-42,17,RARITY_COLORS[item.rarity-1],137);
            if(owner)text(cell,'Owner',`${getHero(owner)!.name}·使用中`,0,54,13,'#F0D29C',139);this.bindDrag(cell,item);
        });
        if(!items.length)text(this.node,'EmptyBag','此栏暂无装备 · 击败主线首领获得',0,-160,23,'#9FB3C8',600);
        this.detail(p.inventory.find(i=>i.id===this.picked));
        button(this.node,'PrevPage','‹',-252,-531,88,48,'#2F455B',()=>{this.page=(this.page+bagPages-1)%bagPages;this.render();});
        text(this.node,'PageInfo',`${this.page+1}/${bagPages}  ·  背包${p.inventory.length}/${this.store.inventoryCapacity}`,0,-531,20,'#9DB2C5',330);
        button(this.node,'NextPage','›',252,-531,88,48,'#2F455B',()=>{this.page=(this.page+1)%bagPages;this.render();});
        text(this.node,'InventoryNote',this.note+(this.store.storageAvailable?'':'（未保存）'),0,-595,18,'#C7D8B8',660);
    }
    private detail(item?:Equipment):void{
        const box=panel(this.node,'EquipmentDetail',0,-375,636,156,'#1C2F43',16);
        if(!item){text(box,'SelectHint','点击装备查看属性，或拖到人物的对应装备格',0,8,22,'#ABC0D3',605);return;}
        const owner=this.owner(item);const current=owner===this.selected;const stats=equipmentStats(item);
        text(box,'SelectedName',`${RARITY_NAMES[item.rarity-1]}${item.exclusive?' · 专属':''} · ${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,53,23,RARITY_COLORS[item.rarity-1],600);
        text(box,'Stats',`攻击+${stats.attack}  防御+${stats.defense}  生命+${stats.maxHp}`,0,17,19,'#B7CEDC',605);
        text(box,'Effect',item.exclusive?signatureEffect(item.exclusive):`${SLOT_NAMES[slotOf(item)]} · ${item.chapter?'长坂战图':`第${item.stage}关战利品`}`,0,-13,17,'#A5C4B1',600);
        button(this.node,'EquipSelected',current?'卸下':owner?'转交穿戴':'穿戴',-209,-465,196,56,current?'#775546':'#4C7057',()=>{
            const ok=current?this.store.unequip(this.selected,slotOf(item)):this.store.equip(this.selected,item.id);this.note=ok?`${current?'已卸下':'已穿戴'}${item.name}，下场生效`:'专属武器仅限对应武将';this.render();
        });
        button(this.node, 'TuneSelected', '整装', 0, -465, 196, 56, '#6A573E', () => this.openTuning(item));
        button(this.node,'RecycleSelected',item.exclusive?'专武保留':'分解',209,-465,196,56,'#394C62',()=>{this.note=this.store.recycleEquipment(item.id)||'已分解为脑铢';if(!this.store.progress.inventory.some(i=>i.id===item.id))this.picked='';this.render();});
    }
    private openTuning(item: Equipment): void {
        const view = panel(this.node, 'GearTuning', 0, 0, 720, 1280, '#101A2C', 0);
        view.on(Node.EventType.TOUCH_END, () => {});
        const materials = this.store.progress.chapter.materials;
        const tune = (action: WorkshopIndex, rune?: EquipmentRune) => {
            const error = this.store.tuneEquipment(item.id, action, rune);
            this.note = error || '整装完成 · 下一场生效';
            this.render();
            const updated = this.store.progress.inventory.find(gear => gear.id === item.id);
            if (updated) this.openTuning(updated);
        };
        text(view, 'TuningTitle', '军 器 · 整 装', 0, 490, 38, '#F0D29D', 650);
        equipmentIcon(view, item, 142).setPosition(0, 336);
        text(view, 'TuningItem', `${item.name}${item.polish ? ` +${item.polish}` : ''}`, 0, 218, 30, RARITY_COLORS[item.rarity - 1], 650);
        const rune = item.rune === 'shield' ? '护身' : item.rune === 'attack' ? '抢攻' : '无';
        text(view, 'CurrentTuning', `打磨 ${item.polish || 0}/3 · 阵纹 ${rune}${item.stamped?' · 已压阵':''}`, 0, 165, 21, '#C5D5D9', 650);
        text(view, 'TuningMaterials', WORKSHOPS.map((work, i) => `${work.material} ${materials[i]}`).join('    '), 0, 111, 22, '#F0D29D', 660);
        button(view, 'PolishEquipment', '打磨 · 炉砂×6', 0, 20, 595, 62, '#53654A', () => tune(0));
        text(view, 'PolishHint', '提高基础属性，最多打磨3次', 0, -32, 18, '#AEC5CE', 650);
        button(view, 'RuneShield', '刻护身 · 阵纹墨×6', -150, -100, 290, 62, '#405F70', () => tune(1, 'shield'));
        button(view, 'RuneAttack', '刻抢攻 · 阵纹墨×6', 150, -100, 290, 62, '#744C51', () => tune(1, 'attack'));
        text(view, 'RuneHint', '开战护盾或攻击 +12%，10秒，同类取最高', 0, -152, 18, '#AEC5CE', 650);
        button(view, 'StampEquipment', '压阵 · 压阵印×8', 0, -221, 595, 62, '#6A573E', () => tune(2));
        text(view, 'StampHint', '镇军装备刻阵后可压阵一次，阵纹提升到22%', 0, -273, 18, '#AEC5CE', 650);
        text(view, 'TuningNote', this.note, 0, -344, 19, '#F0D29D', 650);
        text(view, 'MaterialSource', '材料来自军器换班和长坂围阵', 0, -405, 19, '#AEC5CE', 650);
        button(view, 'CloseTuning', '返回行装', 0, -524, 595, 64, '#364D63', () => view.destroy());
    }
    private signatureShop():void{
        const p=this.store.progress;const item=signatureFor(this.selected);const owned=p.inventory.some(i=>i.id===item.id);
        const card=panel(this.node,'SignatureOffer',0,-160,636,330,'#3C3040',20);equipmentIcon(card,item,124).setPosition(-183,44);
        text(card,'SignatureName',item.name,65,104,30,'#FFD378',420);text(card,'SignatureOwner',`${getHero(this.selected)!.name}专属 · 武器发光外观`,65,52,20,'#DFCDB0',420);
        text(card,'SignatureEffect',signatureEffect(this.selected),65,-2,20,'#B9D7D0',420);text(card,'SignatureCost',`${SIGNATURE_COST}脑勋 · 约7天满额收益`,0,-79,23,'#E9C78B',580);
        text(card,'SignatureBalance',`脑勋余额 ${p.points}`,0,-121,19,'#BFD1CB',590);
        button(this.node,'RedeemSignature',owned?'已拥有 · 穿戴':`兑换专武 · ${SIGNATURE_COST}脑勋`,0,-381,590,68,'#83693F',()=>{
            const error=owned?null:this.store.redeemSignature(this.selected);if(!error){this.store.equip(this.selected,item.id);this.shop=false;this.filter='weapon';this.picked=item.id;}
            this.note=error||'专武已穿戴，下一场触发专属效果';this.render();
        });
        text(this.node,'SignatureNote','专属武器只限本人 · 不重复兑换、不开放分解',0,-491,20,'#AFC5D5',630);text(this.node,'InventoryNote',this.note,0,-582,18,'#C7D8B8',650);
    }
    private local(e:EventTouch):{x:number;y:number}{const p=e.getUILocation();const v=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));return{x:v.x,y:v.y};}
    private bindDrag(node:Node,item:Equipment,source?:EquipmentSlot):void{
        let start={x:0,y:0};let moved=false;
        node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;start=this.local(e);moved=false;this.ghost=equipmentIcon(this.node,item,91);this.ghost.setPosition(start.x,start.y);});
        node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{e.propagationStopped=true;const p=this.local(e);moved=moved||Math.hypot(p.x-start.x,p.y-start.y)>10;this.ghost?.setPosition(p.x,p.y);});
        const finish=(e:EventTouch)=>{
            e.propagationStopped=true;const p=this.local(e);this.ghost?.destroy();this.ghost=null;
            if(!moved){this.picked=item.id;if(source){this.filter=source;this.page=0;}this.render();return;}
            const target=SLOT_ORDER.find(slot=>Math.abs(p.x-this.slots[slot].x)<62&&Math.abs(p.y-this.slots[slot].y)<62);
            if(target){if(target!==slotOf(item))this.note=`此装备需要放入${SLOT_NAMES[slotOf(item)]}格`;else this.note=this.store.equip(this.selected,item.id)?'已穿戴，下一场生效':'这件专武仅限对应武将';}
            else if(source&&p.y<25&&p.y>-295){this.store.unequip(this.selected,source);this.note='已拖回背包';}else this.note='未放入对应格子，装备保持原位';
            this.picked=item.id;this.render();
        };
        node.on(Node.EventType.TOUCH_END,finish);node.on(Node.EventType.TOUCH_CANCEL,finish);
    }
}
