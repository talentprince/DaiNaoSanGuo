import { heroTierLabel, showHeroTierFilter } from './HeroCard';
import type { HeroTierFilter } from './HeroCard';
import { previewUnit } from './UnitPreview';
import { EventTouch, Node, UITransform, Vec3 } from 'cc';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import { equipmentStats, signatureEffect, SLOT_NAMES, SLOT_ORDER, slotOf } from '../data/EquipmentConfig';
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
    private heroPage=0;private page=0;private filter:EquipmentSlot|'all'='all';private picked='';
    private rarity: Equipment['rarity'] | 'all' | 'exclusive' = 'all';
    private heroTier: HeroTierFilter = 'all';
    private note='点装备打开详情，或拖到对应装备格';private ghost:Node|null=null;
    private slots:Record<EquipmentSlot,{x:number;y:number}>={weapon:{x:-242,y:267},armor:{x:242,y:267},charm:{x:242,y:129}};
    constructor(parent:Node,private store:ProgressStore,private onClose:()=>void){
        this.selected=store.progress.formation.find(h=>store.progress.owned.indexOf(h)>=0)||store.progress.owned[0];this.node=panel(parent,'InventoryOverlay',0,0,720,1280,'#101A2C',0);
        this.node.on(Node.EventType.TOUCH_END,()=>{});this.render();
    }
    private owner(item:Equipment):HeroId|undefined{const p=this.store.progress;return p.owned.find(h=>SLOT_ORDER.map(slot=>p.loadouts[h]?.[slot]).indexOf(item.id)>=0);}
    private render():void{
        this.node.destroyAllChildren();this.ghost=null;const p=this.store.progress;const hero=getHero(this.selected)!;
        text(this.node,'InventoryTitle','武 将 · 行 装',17,563,38,'#F0D29D',315);
        button(this.node, 'InventoryHeroTier', `武将 · ${heroTierLabel(this.heroTier)} ›`, -243, 563, 173, 45, '#334760', () =>
            showHeroTierFilter(this.node, this.heroTier, tier => {
                this.heroTier = tier;
                this.heroPage = 0;
                const first = p.owned.find(id => tier === 'all' || getHero(id)!.tier === tier);
                if (first && tier !== 'all' && getHero(this.selected)!.tier !== tier) { this.selected = first; this.picked = ''; }
                this.render();
            })).label.fontSize = 18;
        button(this.node,'CloseInventory','×',300,566,64,58,'#334760',()=>{this.node.destroy();this.onClose();});
        const visibleHeroes = p.owned.filter(id => this.heroTier === 'all' || getHero(id)!.tier === this.heroTier);
        const pages = Math.max(1, Math.ceil(visibleHeroes.length / 5));
        this.heroPage = Math.min(this.heroPage, pages - 1);
        if (!visibleHeroes.length) text(this.node, 'EmptyFilteredHeroes', '暂无该品级的已结识武将', 0, 465, 22, '#B0C5D2', 550);
        button(this.node,'PrevHero','‹',-317,463,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+pages-1)%pages;this.render();});
        button(this.node,'NextHero','›',317,463,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+1)%pages;this.render();});
        visibleHeroes.slice(this.heroPage*5,this.heroPage*5+5).forEach((id,i)=>{
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
            else{text(cell,'EmptySlot','＋',0,7,36,'#8198A9',90);cell.on(Node.EventType.TOUCH_END,()=>{this.filter=slot;this.page=0;this.picked='';this.note=`选择下方${SLOT_NAMES[slot]}，再点穿戴或拖入格子`;this.render();});}
            text(cell,'SlotLabel',SLOT_NAMES[slot],slot==='charm'?-91:0,slot==='charm'?0:-64,18,'#B9C8CE',slot==='charm'?74:110);
        });
        button(this.node,'EquipBest','一键配装',0,51,570,49,'#53654A',()=>{SLOT_ORDER.forEach(slot=>this.store.equipBest(this.selected,slot));this.note='已按评分配装，下一场生效';this.render();});
        button(this.node,'BagFilter',`装备筛选 · ${this.filter==='all'?'全部部位':SLOT_NAMES[this.filter]} / ${this.rarityLabel(this.rarity)} ›`,0,-9,448,44,'#334B60',()=>this.openFilter());
        const items = p.inventory.filter(item => (this.filter === 'all' || slotOf(item) === this.filter)
            && (this.rarity === 'all' || (this.rarity === 'exclusive' ? !!item.exclusive : item.rarity === this.rarity))).sort((a,b)=>Number(!!b.exclusive)-Number(!!a.exclusive)||equipmentScore(b)-equipmentScore(a)||a.id.localeCompare(b.id));
        const bagPages=Math.max(1,Math.ceil(items.length/8));this.page=Math.min(this.page,bagPages-1);
        items.slice(this.page*8,this.page*8+8).forEach((item,i)=>{
            const owner=this.owner(item);const cell=panel(this.node,`Equipment-${item.id}`,(i%4-1.5)*159,-93-Math.floor(i/4)*134,145,130,this.picked===item.id?'#5D674E':'#21364E',12);
            equipmentIcon(cell,item,72).setPosition(0,12);text(cell,'ItemName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,-42,17,RARITY_COLORS[item.rarity-1],137);
            if(owner)text(cell,'Owner',`${getHero(owner)!.name}·使用中`,0,54,13,'#F0D29C',139);this.bindDrag(cell,item);
        });
        if(!items.length)text(this.node,'EmptyBag','此栏暂无装备 · 从战图获得',0,-160,23,'#9FB3C8',600);
        button(this.node,'PrevPage','‹',-252,-336,88,50,'#2F455B',()=>{this.page=(this.page+bagPages-1)%bagPages;this.render();});
        text(this.node,'PageInfo',`${this.page+1}/${bagPages}  ·  背包${p.inventory.length}/${this.store.inventoryCapacity}`,0,-336,20,'#9DB2C5',330);
        button(this.node,'NextPage','›',252,-336,88,50,'#2F455B',()=>{this.page=(this.page+1)%bagPages;this.render();});
        text(this.node,'InventoryNote',this.note+(this.store.storageAvailable?'':'（未保存）'),0,-414,20,'#C7D8B8',660);
    }
    private rarityLabel(value: typeof this.rarity): string {
        return value === 'all' ? '全部品级' : value === 'exclusive' ? '专武' : RARITY_NAMES[value - 1];
    }

    private openFilter(): void {
        const overlay = panel(this.node, 'BagFilterDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const box = panel(overlay, 'BagFilterSheet', 0, 18, 594, 438, '#17283D', 20);
        text(box, 'FilterHeading', '装备筛选', -20, 158, 31, '#F0D29D', 405);
        button(box, 'CloseBagFilter', '×', 242, 160, 60, 54, '#344B62', () => overlay.destroy());
        text(box, 'FilterSlotLabel', '部位', 0, 103, 21, '#BDD0DB', 520);
        const apply = () => { this.page = 0; this.picked = ''; this.render(); };
        (['all', ...SLOT_ORDER] as const).forEach((slot, i) => {
            button(box, `Filter-${slot}`, slot === 'all' ? '全部' : SLOT_NAMES[slot],
                (i - 1.5) * 134, 56, 121, 52, this.filter === slot ? '#786440' : '#354D63', () => {
                    this.filter = slot; apply();
                });
        });
        text(box, 'FilterRarityLabel', '品级', 0, -5, 21, '#BDD0DB', 520);
        (['all', 1, 2, 3, 'exclusive'] as const).forEach((rarity, i) => {
            button(box, `Rarity-${rarity}`, this.rarityLabel(rarity), (i - 2) * 108, -54, 101, 53,
                this.rarity === rarity ? '#786440' : '#354D63', () => { this.rarity = rarity; apply(); }).label.fontSize = 19;
        });
        button(box, 'ResetBagFilters', '清除筛选', 0, -143, 495, 56, '#40576A', () => {
            this.rarity = 'all'; this.filter = 'all'; apply();
        });
    }

    private openDetails(item: Equipment): void {
        const overlay = panel(this.node, 'EquipmentDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const box = panel(overlay, 'EquipmentDetail', 0, 40, 602, 612, '#1C2F43', 20);
        const owner = this.owner(item);
        const current = owner === this.selected;
        const stats = equipmentStats(item);
        button(box, 'CloseEquipmentDetails', '×', 252, 251, 60, 57, '#354C64', () => overlay.destroy());
        equipmentIcon(box, item, 118).setPosition(0, 166);
        text(box,'SelectedName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,74,30,RARITY_COLORS[item.rarity-1],535);
        text(box,'EquipmentTags',`${RARITY_NAMES[item.rarity-1]} · ${SLOT_NAMES[slotOf(item)]}${owner ? ` · ${getHero(owner)!.name}穿戴中` : ''}`,0,30,21,'#C3D5D9',534);
        text(box,'Stats',`攻击+${stats.attack}  防御+${stats.defense}  生命+${stats.maxHp}`,0,-14,21,'#B7CEDC',550);
        text(box,'Effect',item.exclusive?signatureEffect(item.exclusive):item.chapter?'来源 · 章节战图':`来源 · 第${item.stage}关战利品`,0,-54,18,'#A5C4B1',550);
        const note=text(box,'EquipmentFeedback','',0,-251,18,'#F1C795',540);
        button(box,'EquipSelected',current?'卸下':owner?'转交穿戴':'穿戴',0,-126,490,66,current?'#775546':'#4C7057',()=>{
            const ok=current?this.store.unequip(this.selected,slotOf(item)):this.store.equip(this.selected,item.id);
            if (!ok) { note.string = '专属武器仅限对应武将'; return; }
            this.note = `${current?'已卸下':'已穿戴'}${item.name}，下一场生效`;
            this.render();
        });
        const recyclable = !item.exclusive && !owner;
        button(box, 'TuneSelected', '整装 ›', recyclable ? -125 : 0, -201, recyclable ? 235 : 490, 55, '#6A573E', () => {
            overlay.destroy();
            this.openTuning(item);
        });
        if (recyclable) button(box,'RecycleSelected','分解',125,-201,235,55,'#394C62',()=>{
            const error = this.store.recycleEquipment(item.id);
            if (error) { note.string = error; return; }
            this.note = '已分解为脑铢';
            this.picked = '';
            this.render();
        });
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
        button(view, 'ChooseRune', '刻阵 · 阵纹墨×6 ›', 0, -100, 595, 62, '#405F70', () => {
            const modal = panel(view, 'RuneChoice', 0, 0, 720, 1280, '#080F1CCC', 0);
            modal.on(Node.EventType.TOUCH_END, () => {});
            const box = panel(modal, 'RuneChoiceSheet', 0, 20, 548, 332, '#17283D', 20);
            text(box, 'RuneChoiceTitle', '选择阵纹', 0, 112, 30, '#F0D29D', 400);
            button(box, 'CloseRuneChoice', '×', 220, 111, 60, 54, '#344B62', () => modal.destroy());
            button(box, 'RuneShield', '护身 · 开战护盾', 0, 25, 474, 63, '#405F70', () => tune(1, 'shield'));
            button(box, 'RuneAttack', '抢攻 · 开战增攻', 0, -60, 474, 63, '#744C51', () => tune(1, 'attack'));
        });
        text(view, 'RuneHint', '开战护盾或攻击 +12%，10秒，同类取最高', 0, -152, 18, '#AEC5CE', 650);
        button(view, 'StampEquipment', '压阵 · 压阵印×8', 0, -221, 595, 62, '#6A573E', () => tune(2));
        text(view, 'StampHint', '镇军装备刻阵后可压阵一次，阵纹提升到22%', 0, -273, 18, '#AEC5CE', 650);
        text(view, 'TuningNote', this.note, 0, -344, 19, '#F0D29D', 650);
        text(view, 'MaterialSource', '材料来自军器换班和长坂围阵', 0, -405, 19, '#AEC5CE', 650);
        button(view, 'CloseTuning', '返回行装', 0, -524, 595, 64, '#364D63', () => view.destroy());
    }
    private local(e:EventTouch):{x:number;y:number}{const p=e.getUILocation();const v=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));return{x:v.x,y:v.y};}
    private bindDrag(node:Node,item:Equipment,source?:EquipmentSlot):void{
        let start={x:0,y:0};let moved=false;
        node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;start=this.local(e);moved=false;this.ghost=equipmentIcon(this.node,item,91);this.ghost.setPosition(start.x,start.y);});
        node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{e.propagationStopped=true;const p=this.local(e);moved=moved||Math.hypot(p.x-start.x,p.y-start.y)>10;this.ghost?.setPosition(p.x,p.y);});
        const finish=(e:EventTouch)=>{
            e.propagationStopped=true;const p=this.local(e);this.ghost?.destroy();this.ghost=null;
            if(!moved){this.picked=item.id;this.openDetails(item);return;}
            const target=SLOT_ORDER.find(slot=>Math.abs(p.x-this.slots[slot].x)<62&&Math.abs(p.y-this.slots[slot].y)<62);
            if(target){if(target!==slotOf(item))this.note=`此装备需要放入${SLOT_NAMES[slotOf(item)]}格`;else this.note=this.store.equip(this.selected,item.id)?'已穿戴，下一场生效':'这件专武仅限对应武将';}
            else if(source&&p.y<25&&p.y>-295){this.store.unequip(this.selected,source);this.note='已拖回背包';}else this.note='未放入对应格子，装备保持原位';
            this.picked=item.id;this.render();
        };
        node.on(Node.EventType.TOUCH_END,finish);
        node.on(Node.EventType.TOUCH_CANCEL,(e:EventTouch)=>{
            e.propagationStopped=true;this.ghost?.destroy();this.ghost=null;
        });
    }
}
