import { heroTierLabel, showHeroTierFilter } from './HeroCard';
import type { HeroTierFilter } from './HeroCard';
import { previewUnit } from './UnitPreview';
import { Color, EventTouch, Node, UITransform, Vec3 } from 'cc';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import { ARMOR_NAMES, canWear, CHARM_NAMES, EQUIPMENT_GRADES, equipmentFitLabel, equipmentStats, signatureEffect, SLOT_NAMES, SLOT_ORDER, slotOf, WEAPON_NAMES, wearerEquipmentTypes } from '../data/EquipmentConfig';
import type { Equipment, EquipmentRune, EquipmentSlot } from '../data/EquipmentConfig';
import { equipmentRecycleTotal, equipmentRecycleYield, equipmentScore, ProgressStore, RARITY_NAMES, RARITY_COLORS } from './ProgressStore';
import type { EquipmentWearer } from './ProgressStore';
import { UnitActor } from './UnitActor';
import { portrait } from './HeroPortrait';
import { equipmentIcon } from './EquipmentIcon';
import { button, makeNode, panel, text } from './BattleUI';
import { CHAPTER_PROTAGONIST_ID, chapterProtagonist, MAX_POLISH, polishEnergyNeeded, polishRate, polishTransfer, totalPolishEnergy, TRANSFER_SEAL, tuningCoinCost, tuningMaterialCost, WORKSHOPS } from '../data/ChapterConfig';
import type { WorkshopIndex } from '../data/ChapterConfig';
import { formatAmount } from '../data/GrowthConfig';

const SLOT_WIDTH = 258;
const SLOT_HEIGHT = 72;
const BAG_TOP = 9;
const BAG_COLUMNS = 4;
const BAG_CARD_HEIGHT = 116;
const BAG_ROW_GAP = 125;
const BAG_PAGE_SIZE = 12;
const RECYCLE_GRADES = [...EQUIPMENT_GRADES, 'exclusive'] as const;

export class InventoryPanel {
    readonly node:Node;
    private selected: EquipmentWearer = CHAPTER_PROTAGONIST_ID;
    private heroPage=0;private page=0;private filter:EquipmentSlot|'all'='all';private picked='';
    private rarity: Equipment['rarity'] | 'all' | 'exclusive' = 'all';
    private heroTier: HeroTierFilter = 'all';
    private note='点装备打开详情，或拖到对应装备格';private ghost:Node|null=null;
    private bagBottom = BAG_TOP - BAG_CARD_HEIGHT;
    private slots:Record<EquipmentSlot,{x:number;y:number}>={weapon:{x:163,y:335},armor:{x:163,y:252},charm:{x:163,y:169}};
    constructor(parent:Node,private store:ProgressStore,private onClose:()=>void){
        this.node=panel(parent,'InventoryOverlay',0,0,720,1280,'#101A2C',0);
        this.node.on(Node.EventType.TOUCH_END,()=>{});this.render();
    }
    private wearerName(id: EquipmentWearer): string {
        return id === CHAPTER_PROTAGONIST_ID ? '主公' : getHero(id)!.name;
    }
    private get selectedDeployed(): boolean {
        return this.selected === CHAPTER_PROTAGONIST_ID || this.store.chapterFormation.companions.some(entry => entry.hero === this.selected);
    }
    private render():void{
        this.node.destroyAllChildren();this.ghost=null;const p=this.store.progress;const hero=getHero(this.selected);
        text(this.node,'InventoryTitle','主 公 · 随 将 行 装',17,563,34,'#F0D29D',315);
        button(this.node, 'InventoryHeroTier', `随将 · ${heroTierLabel(this.heroTier)} ›`, -243, 563, 173, 45, '#334760', () =>
            showHeroTierFilter(this.node, this.heroTier, tier => {
                this.heroTier = tier;
                this.heroPage = 0;
                const first = p.owned.find(id => tier === 'all' || getHero(id)!.tier === tier);
                if (first && hero && tier !== 'all' && hero.tier !== tier) { this.selected = first; this.picked = ''; }
                this.render();
            })).label.fontSize = 18;
        button(this.node,'CloseInventory','×',300,566,64,58,'#334760',()=>{this.node.destroy();this.onClose();});
        const visibleHeroes = p.owned.filter(id => this.heroTier === 'all' || getHero(id)!.tier === this.heroTier);
        const pages = Math.max(1, Math.ceil(visibleHeroes.length / 4));
        this.heroPage = Math.min(this.heroPage, pages - 1);
        if (!visibleHeroes.length) text(this.node, 'EmptyFilteredHeroes', '暂无该品级的已结识随将', 60, 452, 22, '#B0C5D2', 450);
        if (pages > 1) {
            button(this.node,'PrevHero','‹',-317,452,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+pages-1)%pages;this.render();});
            button(this.node,'NextHero','›',317,452,42,62,'#293C54',()=>{this.heroPage=(this.heroPage+1)%pages;this.render();});
        }
        const wearers = [CHAPTER_PROTAGONIST_ID, ...visibleHeroes.slice(this.heroPage * 4, (this.heroPage + 1) * 4)] as const;
        wearers.forEach((id,i)=>{
            const cell=panel(this.node,`HeroTab-${id}`,(i-2)*117,452,104,104,id===this.selected?'#5B6550':'#22354C');
            const protagonist = id === CHAPTER_PROTAGONIST_ID;
            portrait(cell, protagonist ? { protagonist: true } : { hero: id },65).setPosition(0,10);
            text(cell,'HeroName',this.wearerName(id),0,-36,18,protagonist?'#FFD378':'#F0DEBF',100);
            cell.on(Node.EventType.TOUCH_END,()=>{this.selected=id;this.picked='';this.render();});
        });
        const pedestal=panel(this.node,'HeroShowcase',0,252,652,262,'#1C3044',24);const model=makeNode('Model',pedestal,-149,hero ? 12 : 4);
        const bonus = this.store.getEquipmentBonuses(true)[this.selected];
        const stars = hero ? p.stars[hero.id] || 1 : 1;
        const unit=previewUnit(hero ? {...hero,signature:bonus?.signature,stars}
            : chapterProtagonist(p.heroLevel, this.store.protagonistSpot, bonus));
        const actor=new UnitActor(model,unit,0,0,0,0,hero ? 1.48 : 1.31,1);actor.hp.node.active=false;actor.hpText.node.active=false;actor.node.getChildByName('Name')!.active=false;
        const caption = hero ? `${hero.name}  ${'★'.repeat(stars)}${'☆'.repeat(6 - stars)}` : `主公 Lv.${p.heroLevel}`;
        text(pedestal,'HeroStars',caption,-149,hero ? -103 : -79,23,hero ? TIER_COLORS[hero.tier-1] : '#FFD378',296);
        const types = wearerEquipmentTypes(this.selected);
        text(pedestal, 'WearerTypes', `${WEAPON_NAMES[types.weapon]}系 · ${ARMOR_NAMES[types.armor]} · ${CHARM_NAMES[types.charm]}`, -149, -117, 16, '#C5D5D9', 292);
        const equipped = SLOT_ORDER.map(slot => p.inventory.find(i => i.id === p.loadouts[this.selected]?.[slot]));
        SLOT_ORDER.forEach((slot, index)=>{
            const pos=this.slots[slot];const item=equipped[index];
            const cell=panel(this.node,`EquipmentSlot-${slot}`,pos.x,pos.y,SLOT_WIDTH,SLOT_HEIGHT,this.filter===slot?'#6C6750':'#30475D',13);
            text(cell,'SlotLabel',SLOT_NAMES[slot],27,16,17,'#B9C8CE',172);
            if(item){
                equipmentIcon(cell,item,57).setPosition(-88,0);
                text(cell,'EquippedName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,27,-12,20,RARITY_COLORS[item.rarity-1],172);
                this.bindDrag(cell,item,slot);
            } else {
                text(cell,'EmptySlot','＋',-88,0,34,'#8198A9',60);
                text(cell,'EquipPrompt','选择装备',27,-12,18,'#A6B9C8',172);
                cell.on(Node.EventType.TOUCH_END,()=>{this.filter=slot;this.page=0;this.picked='';this.note=`选择下方${SLOT_NAMES[slot]}，再点穿戴或拖入格子`;this.render();});
            }
        });
        const items = p.inventory.filter(item => (this.filter === 'all' || slotOf(item) === this.filter)
            && (this.rarity === 'all' || (this.rarity === 'exclusive' ? !!item.exclusive : item.rarity === this.rarity))).sort((a,b)=>Number(!!b.exclusive)-Number(!!a.exclusive)||equipmentScore(b)-equipmentScore(a)||a.id.localeCompare(b.id));
        button(this.node,'EquipBest','全队配装',237,76,172,54,'#53654A',()=>{
            const count = this.store.equipChapterTeam();
            this.note = count === null ? '配装未保存，请重试'
                : count ? `已为 ${count} 名上阵成员配装，下一场生效` : '背包里没有可补位或升级的装备';
            this.render();
        }).label.fontSize=20;
        button(this.node,'BagFilter',`${this.filter==='all'?'全部部位':SLOT_NAMES[this.filter]} / ${this.rarityLabel(this.rarity)} ›`,-184,76,282,54,'#334B60',()=>this.openFilter()).label.fontSize=19;
        button(this.node,'BulkRecycle','一键分解',53,76,174,54,'#6A543F',()=>this.openBulkRecycle()).label.fontSize=20;
        const bagPages=Math.max(1,Math.ceil(items.length/BAG_PAGE_SIZE));this.page=Math.min(this.page,bagPages-1);
        const visible = items.slice(this.page * BAG_PAGE_SIZE, (this.page + 1) * BAG_PAGE_SIZE);
        const rows = Math.max(1, Math.ceil(visible.length / BAG_COLUMNS));
        this.bagBottom = BAG_TOP - BAG_CARD_HEIGHT - (rows - 1) * BAG_ROW_GAP;
        const footerY = this.bagBottom - 55;
        const bagEdge = footerY - 46;
        panel(this.node,'EquipmentBag',0,(46 + bagEdge) / 2,652,46 - bagEdge,'#182A40',20);
        visible.forEach((item,i)=>{
            const owner=this.store.equipmentOwner(item);const cell=panel(this.node,`Equipment-${item.id}`,(i%BAG_COLUMNS-1.5)*159,BAG_TOP-BAG_CARD_HEIGHT/2-Math.floor(i/BAG_COLUMNS)*BAG_ROW_GAP,145,BAG_CARD_HEIGHT,this.picked===item.id?'#5D674E':'#253B53',12);
            equipmentIcon(cell,item,62).setPosition(0,7);text(cell,'ItemName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,-39,17,RARITY_COLORS[item.rarity-1],137);
            if(owner)text(cell,'Owner',`${this.wearerName(owner)} · 穿戴中`,0,45,13,'#F0D29C',139);this.bindDrag(cell,item);
        });
        if(!items.length)text(this.node,'EmptyBag','此栏暂无装备 · 从战图获得',0,BAG_TOP-BAG_CARD_HEIGHT/2,23,'#9FB3C8',600);
        if (bagPages > 1) {
            button(this.node,'PrevPage','‹',-252,footerY,88,50,'#2F455B',()=>{this.page=(this.page+bagPages-1)%bagPages;this.render();});
            button(this.node,'NextPage','›',252,footerY,88,50,'#2F455B',()=>{this.page=(this.page+1)%bagPages;this.render();});
        }
        text(this.node,'PageInfo',`${this.page+1}/${bagPages}  ·  背包${p.inventory.length}/${this.store.inventoryCapacity}`,0,footerY,20,'#9DB2C5',330);
        let noteY = bagEdge - 34;
        if (rows < 3) {
            const quick = panel(this.node, 'QuickTuning', 0, bagEdge - 99, 652, 166, '#1C3044', 18);
            text(quick, 'QuickTuningTitle', '整装 · 已穿装备', 0, 52, 24, '#F0D29D', 610);
            const resources = [`脑铢 ${formatAmount(p.coins)}`, ...WORKSHOPS.map((work, i) => `${work.material} ${formatAmount(p.chapter.materials[i])}`)];
            text(quick, 'QuickTuningMaterials', resources.join('    '), 0, 15, 18, '#B6CED9', 610);
            equipped.forEach((item, i) => {
                const slot = SLOT_ORDER[i];
                button(quick, `TuneSlot-${slot}`, item ? `整装${SLOT_NAMES[slot]} ›` : `${SLOT_NAMES[slot]}未穿戴`,
                    (i - 1) * 202, -38, 190, 48, item ? '#53654A' : '#344354', () => { if (item) this.openTuning(item); }).label.fontSize = 19;
            });
            noteY = bagEdge - 212;
        }
        text(this.node,'InventoryNote',this.note+(this.store.storageAvailable?'':'（未保存）'),0,noteY,20,'#C7D8B8',660);
    }
    private rarityLabel(value: typeof this.rarity): string {
        return value === 'all' ? '全部品级' : value === 'exclusive' ? '专武' : RARITY_NAMES[value - 1];
    }

    private openFilter(): void {
        const overlay = panel(this.node, 'BagFilterDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const box = panel(overlay, 'BagFilterSheet', 0, 18, 594, 482, '#17283D', 20);
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
        (['all', ...EQUIPMENT_GRADES, 'exclusive'] as const).forEach((rarity, i) => {
            const choice = button(box, `Rarity-${rarity}`, this.rarityLabel(rarity), (i % 4 - 1.5) * 134, -54 - Math.floor(i / 4) * 58, 121, 51,
                this.rarity === rarity ? '#786440' : '#354D63', () => { this.rarity = rarity; apply(); });
            choice.label.fontSize = 19;
            if (typeof rarity === 'number') choice.label.color = new Color(RARITY_COLORS[rarity - 1]);
        });
        button(box, 'ResetBagFilters', '清除筛选', 0, -181, 495, 56, '#40576A', () => {
            this.rarity = 'all'; this.filter = 'all'; apply();
        });
    }

    private openDetails(item: Equipment): void {
        const overlay = panel(this.node, 'EquipmentDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const box = panel(overlay, 'EquipmentDetail', 0, 40, 602, 612, '#1C2F43', 20);
        const owner = this.store.equipmentOwner(item);
        const current = owner === this.selected;
        const transferable = !current && this.selectedDeployed && canWear(this.selected, item);
        const stats = equipmentStats(item);
        button(box, 'CloseEquipmentDetails', '×', 252, 251, 60, 57, '#354C64', () => overlay.destroy());
        equipmentIcon(box, item, 118).setPosition(0, 166);
        text(box,'SelectedName',`${item.name}${item.polish ? ` +${item.polish}` : ''}`,0,74,30,RARITY_COLORS[item.rarity-1],535);
        text(box,'EquipmentTags',`${RARITY_NAMES[item.rarity-1]} · ${SLOT_NAMES[slotOf(item)]}${owner ? ` · ${this.wearerName(owner)}穿戴中` : ''}`,0,30,21,'#C3D5D9',534);
        text(box,'Stats',`攻击+${stats.attack}  防御+${stats.defense}  生命+${stats.maxHp}`,0,-14,21,'#B7CEDC',550);
        text(box,'Effect',item.exclusive?signatureEffect(item.exclusive):equipmentFitLabel(item) || (item.chapter?'来源 · 战图与副本':`来源 · 第${item.stage}关战利品`),0,-54,18,'#A5C4B1',550);
        const restriction = current || transferable ? '' : !canWear(this.selected, item) ? `当前角色无法穿戴 · ${equipmentFitLabel(item)}` : '请先把这名随将加入出战阵容';
        const note=text(box,'EquipmentFeedback',restriction,0,-251,18,'#F1C795',540);
        if (owner) button(box,'UnequipSelected','卸下',transferable ? -125 : 0,-126,transferable ? 235 : 490,66,'#775546',()=>{
            if (this.store.equipmentOwner(item) !== owner || !this.store.unequip(owner,slotOf(item))) {
                note.string = '装备状态已变化，请重新打开';
                return;
            }
            this.note = `${this.wearerName(owner)}已卸下${item.name}，装备回到背包`;
            this.render();
        });
        if (transferable) button(box,'EquipSelected',owner ? '转交穿戴' : '穿戴',owner ? 125 : 0,-126,owner ? 235 : 490,66,'#4C7057',()=>{
            if (!this.store.equip(this.selected,item.id)) { note.string = '装备状态已变化，请重新打开'; return; }
            this.note = `${this.wearerName(this.selected)}已穿戴${item.name}，下一场生效`;
            this.render();
        });
        const recyclable = !owner;
        button(box, 'TuneSelected', '整装 ›', recyclable ? -125 : 0, -201, recyclable ? 235 : 490, 55, '#6A573E', () => {
            overlay.destroy();
            this.openTuning(item);
        });
        if (recyclable) {
            const { coins, sand } = equipmentRecycleYield(item);
            const yieldLabel = `${coins} 脑铢${sand ? ` · ${sand} 炉砂` : ''}`;
            const recycle = button(box, 'RecycleSelected', `分解 · ${yieldLabel}`, 125, -201, 235, 55, '#394C62', () => {
                const error = this.store.recycleEquipment(item.id);
                if (error) { note.string = error; return; }
                this.note = `分解获得 ${yieldLabel}`;
                this.picked = '';
                this.render();
            });
            recycle.label.fontSize = 18;
        }
    }

    private openBulkRecycle(): void {
        const overlay = panel(this.node, 'BulkRecycleDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const box = panel(overlay, 'BulkRecycleSheet', 0, 20, 596, 496, '#1C2F43', 20);
        let selected: typeof RECYCLE_GRADES[number] | undefined;
        const render = () => {
            box.destroyAllChildren();
            const spare = this.store.progress.inventory.filter(item => !this.store.equipmentOwner(item));
            const groups = RECYCLE_GRADES.map(grade => spare.filter(item => (item.exclusive ? 'exclusive' : item.rarity) === grade));
            const items = selected === undefined ? [] : groups[RECYCLE_GRADES.indexOf(selected)];
            const { coins, sand } = equipmentRecycleTotal(items);
            const rewards = `${coins} 脑铢${sand ? ` · ${sand} 炉砂` : ''}`;
            text(box, 'BulkRecycleTitle', '一键分解', 0, 170, 33, '#F0D29D', 530);
            text(box, 'BulkRecycleRule', '请选择品级 · 统计整个背包的未穿戴装备', 0, 111, 21, '#C3D5D9', 535);
            RECYCLE_GRADES.forEach((grade, index) => {
                const choice = button(box, `RecycleGrade-${grade}`, `${this.rarityLabel(grade)} ${groups[index].length}`,
                    (index % 3 - 1) * 172, 59 - Math.floor(index / 3) * 58, 158, 49, selected === grade ? '#795F40' : '#354C64', () => {
                        selected = grade;
                        render();
                    });
                choice.label.fontSize = 20;
                if (typeof grade === 'number') choice.label.color = new Color(RARITY_COLORS[grade - 1]);
            });
            const message = items.length ? `${items.length} 件 · 可得 ${rewards}`
                : selected === undefined ? '选择品级后查看数量与收益' : '这个品级暂无未穿戴装备';
            text(box, 'BulkRecycleTotal', message, 0, -58, 22, '#E9CD9A', 530);
            const note = text(box, 'BulkRecycleFeedback', items.length ? '确认后将分解上述全部装备' : '', 0, -103, 19, '#F1C795', 530);
            button(box, 'CloseBulkRecycle', '取消', -126, -173, 232, 58, '#354C64', () => overlay.destroy());
            if (items.length) button(box, 'ConfirmBulkRecycle', '确认分解', 126, -173, 232, 58, '#775546', () => {
                const error = this.store.recycleSpareEquipment(items.map(item => item.id));
                if (error) { note.string = error; return; }
                this.note = `已分解 ${items.length} 件装备，获得 ${rewards}`;
                this.picked = '';
                this.render();
            });
        };
        render();
    }

    private openTuning(item: Equipment, feedback = ''): void {
        const view = panel(this.node, 'GearTuning', 0, 0, 720, 1280, '#101A2C', 0);
        view.on(Node.EventType.TOUCH_END, () => {});
        const { coins, chapter: { materials } } = this.store.progress;
        const tune = (action: WorkshopIndex, rune?: EquipmentRune) => {
            const error = this.store.tuneEquipment(item.id, action, rune);
            this.note = error || '整装完成 · 下一场生效';
            this.render();
            const updated = this.store.progress.inventory.find(gear => gear.id === item.id);
            if (updated) this.openTuning(updated, this.note);
        };
        text(view, 'TuningTitle', '军 器 · 整 装', 0, 553, 38, '#F0D29D', 650);
        const summary = panel(view, 'TuningSummary', 0, 405, 650, 200, '#1C3044', 20);
        equipmentIcon(summary, item, 132).setPosition(-221, 0);
        text(summary, 'TuningItem', `${item.name}${item.polish ? ` +${item.polish}` : ''}`, 72, 55, 29, RARITY_COLORS[item.rarity - 1], 464);
        const rune = item.rune === 'shield' ? '护身' : item.rune === 'attack' ? '抢攻' : '无';
        const polish = item.polish || 0;
        const stats = equipmentStats(item);
        text(summary, 'TuningItemTags', `${RARITY_NAMES[item.rarity - 1]} · ${SLOT_NAMES[slotOf(item)]}`, 72, 13, 21, '#C5D5D9', 458);
        text(summary, 'TuningStats', `攻 +${formatAmount(stats.attack)}   防 +${formatAmount(stats.defense)}   命 +${formatAmount(stats.maxHp)}`, 72, -24, 22, '#F0D29D', 458);
        text(summary, 'CurrentTuning', `打磨 ${polish}/${MAX_POLISH} · 阵纹 ${rune}${item.stamped ? ' · 已压阵' : ''}`, 72, -61, 20, '#B6CED9', 458);

        const wallet = panel(view, 'TuningMaterials', 0, 252, 650, 80, '#192A3D', 15);
        const balances = [['脑铢', coins] as const, ...WORKSHOPS.map((work, i) => [work.material, materials[i]] as const)];
        balances.forEach(([name, amount], i) => {
            const x = (i - 1.5) * 157;
            text(wallet, `TuningBalanceName-${i}`, name, x, 15, 17, '#B7CCD9', 148);
            text(wallet, `TuningBalance-${i}`, formatAmount(amount), x, -13, 23, '#F0D29D', 148);
        });

        const actionCard = (action: WorkshopIndex, id: string, hint: string, label: string, color: string,
            perform: () => void, locked = '') => {
            const work = WORKSHOPS[action];
            const card = panel(view, `TuningAction-${work.action}`, 0, 109 - action * 210, 650, 190, '#1C3044', 18);
            text(card, `${id}Title`, work.action, 0, 65, 27, '#F0D29D', 610);
            text(card, `${id}Effect`, hint, 0, 24, 20, '#BCD0DB', 610);
            const material = tuningMaterialCost(item, action);
            const price = tuningCoinCost(item, action);
            const shortage = materials[action] < material ? `${work.material}不足` : coins < price ? '脑铢不足' : '';
            text(card, `${id}Cost`, locked ? '—' : `${work.material} ×${material}    脑铢 ×${price}`, 0, -13, 19, '#E9CD9A', 610);
            const disabled = locked || shortage;
            button(card, id, disabled || label, 0, -57, 590, 50, disabled ? '#344354' : color, () => { if (!disabled) perform(); });
        };
        const nextStats = equipmentStats({ ...item, polish: polish + 1 });
        const energy = item.polishEnergy || 0;
        const needed = polishEnergyNeeded(item);
        const polishHint = polish >= MAX_POLISH ? '基础属性已达打磨上限' : `成功率 ${energy >= needed ? 100 : polishRate(item)}% · 保底能量 ${energy}/${needed}`;
        const gain = `+${polish + 1}收益 · 攻 +${nextStats.attack - stats.attack} / 防 +${nextStats.defense - stats.defense} / 命 +${nextStats.maxHp - stats.maxHp}`;
        actionCard(0, 'PolishEquipment', polishHint, `打磨至 +${polish + 1}`, '#53654A', () => tune(0), polish >= MAX_POLISH ? `已打磨至 +${MAX_POLISH}` : '');
        const runePower = item.stamped ? '22%' : '12%';
        const runeEffect = item.rune === 'shield' ? `护身 · 开战获得最大生命 ${runePower} 的护盾`
            : item.rune === 'attack' ? `抢攻 · 开战攻击 +${runePower}` : '可选开战护盾或增攻，初始强度 12%';
        actionCard(1, 'ChooseRune', `${runeEffect} · 持续10秒`, '选择阵纹 ›', '#405F70', () => {
            const modal = panel(view, 'RuneChoice', 0, 0, 720, 1280, '#080F1CCC', 0);
            modal.on(Node.EventType.TOUCH_END, () => {});
            const box = panel(modal, 'RuneChoiceSheet', 0, 20, 548, 332, '#17283D', 20);
            text(box, 'RuneChoiceTitle', '选择阵纹', 0, 112, 30, '#F0D29D', 400);
            button(box, 'CloseRuneChoice', '×', 220, 111, 60, 54, '#344B62', () => modal.destroy());
            button(box, 'RuneShield', item.rune === 'shield' ? '护身 · 已刻阵' : '护身 · 开战护盾', 0, 25, 474, 63, '#405F70', () => { if (item.rune !== 'shield') tune(1, 'shield'); });
            button(box, 'RuneAttack', item.rune === 'attack' ? '抢攻 · 已刻阵' : '抢攻 · 开战增攻', 0, -60, 474, 63, '#744C51', () => { if (item.rune !== 'attack') tune(1, 'attack'); });
        });
        const stampLocked = item.stamped ? '已压阵' : item.rarity < 3 ? '限巧作及以上' : !item.rune ? '请先刻阵' : '';
        actionCard(2, 'StampEquipment', item.stamped ? '当前阵纹强度 22%' : '将阵纹强度由 12% 提升至 22%', '压阵', '#6A573E', () => tune(2), stampLocked);
        text(view, 'TuningNote', feedback || '整装效果在下一场战斗生效', 0, -448, 20, '#F0D29D', 650);
        text(view, 'MaterialSource', polish < MAX_POLISH ? gain : '炉砂等材料可刷军器换班', -135, -492, 18, '#AEC5CE', 370);
        button(view, 'TransferPolish', `续火转移 · ${this.store.progress.chapter.transferSeals}张 ›`, 194, -492, 260, 44, '#6A573E', () => this.openTransfer(view, item)).label.fontSize = 19;
        button(view, 'CloseTuning', '返回行装', 0, -552, 650, 62, '#364D63', () => view.destroy());
    }
    private openTransfer(parent: Node, source: Equipment): void {
        const modal = panel(parent, 'PolishTransferDialog', 0, 0, 720, 1280, '#080F1CEB', 0);
        modal.on(Node.EventType.TOUCH_END, () => {});
        const sheet = panel(modal, 'PolishTransferSheet', 0, 0, 602, 685, '#17283D', 20);
        const p = this.store.progress;
        const candidates = p.inventory.filter(item => item.id !== source.id && slotOf(item) === slotOf(source)
            && (item.polish || 0) < MAX_POLISH);
        const count = Math.max(1, Math.ceil(candidates.length / 4));
        let page = 0;
        let target: Equipment | undefined;
        const render = () => {
            sheet.destroyAllChildren();
            text(sheet, 'TransferTitle', '续火转移 · 选择承接装备', -20, 289, 29, '#F0D29D', 475);
            button(sheet, 'CloseTransfer', '×', 250, 289, 58, 50, '#354C64', () => modal.destroy());
            const energy = totalPolishEnergy(source);
            text(sheet, 'TransferSource', `${source.name} · 可转 ${energy} 能量 · ${TRANSFER_SEAL} ${p.chapter.transferSeals} 张`, 0, 233, 19, '#C6D4DB', 554);
            text(sheet, 'TransferRule', '可跨品级转给同部位装备。转移后原装备归零。', 0, 193, 19, '#C6D4DB', 554);
            const message = !energy ? '原装备没有可转移的能量' : !p.chapter.transferSeals ? '城门别闹胜利有机会获得续火券' : '背包暂无可承接的同部位装备';
            if (!energy || !p.chapter.transferSeals || !candidates.length) {
                text(sheet, 'TransferUnavailable', message, 0, 67, 22, '#F1C795', 554);
                return;
            }
            candidates.slice(page * 4, (page + 1) * 4).forEach((item, i) => {
                const row = button(sheet, `TransferTarget-${i}`, `${item.name} · ${RARITY_NAMES[item.rarity - 1]} +${item.polish || 0}`,
                    0, 133 - i * 58, 530, 49, target?.id === item.id ? '#745C44' : '#354C64', () => { target = item; render(); });
                row.label.color = new Color(RARITY_COLORS[item.rarity - 1]);
                row.label.fontSize = 20;
            });
            if (count > 1) {
                button(sheet, 'PrevTransferPage', '‹', -198, -105, 58, 40, '#354C64', () => { page = (page + count - 1) % count; render(); });
                button(sheet, 'NextTransferPage', '›', 198, -105, 58, 40, '#354C64', () => { page = (page + 1) % count; render(); });
                text(sheet, 'TransferPage', `${page + 1}/${count}`, 0, -105, 20, '#C6D4DB', 130);
            }
            if (!target) return;
            const chosen = target;
            const result = polishTransfer(source, chosen);
            text(sheet, 'TransferResult', `${chosen.name} → +${result.level} · 剩余能量 ${result.energy}`, 0, -157, 21, '#F0D29D', 540);
            const warning = text(sheet, 'TransferWarning', result.overflow ? `将溢出并损失 ${result.overflow} 点能量` : '消耗 1 张续火券',
                0, -197, 21, result.overflow ? '#FFC08E' : '#C6D4DB', 540);
            button(sheet, 'ConfirmTransfer', result.overflow ? '确认溢出并转移' : '确认转移', 0, -267, 520, 60, '#755740', () => {
                const error = this.store.transferPolish(source.id, chosen.id, result.overflow);
                if (error) { warning.string = error; return; }
                this.note = `续火完成 · ${chosen.name}打磨至 +${result.level}`;
                this.render();
                const updated = this.store.progress.inventory.find(item => item.id === chosen.id)!;
                this.openTuning(updated, this.note);
            });
        };
        render();
    }

    private local(e:EventTouch):{x:number;y:number}{const p=e.getUILocation();const v=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));return{x:v.x,y:v.y};}
    private bindDrag(node:Node,item:Equipment,source?:EquipmentSlot):void{
        let start={x:0,y:0};let moved=false;
        node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;start=this.local(e);moved=false;this.ghost=equipmentIcon(this.node,item,91);this.ghost.setPosition(start.x,start.y);});
        node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{e.propagationStopped=true;const p=this.local(e);moved=moved||Math.hypot(p.x-start.x,p.y-start.y)>10;this.ghost?.setPosition(p.x,p.y);});
        const finish=(e:EventTouch)=>{
            e.propagationStopped=true;const p=this.local(e);this.ghost?.destroy();this.ghost=null;
            if(!moved){this.picked=item.id;this.openDetails(item);return;}
            const target=SLOT_ORDER.find(slot=>Math.abs(p.x-this.slots[slot].x)<SLOT_WIDTH/2&&Math.abs(p.y-this.slots[slot].y)<SLOT_HEIGHT/2);
            if(target){if(!this.selectedDeployed)this.note='请先把这名随将加入出战阵容';else if(target!==slotOf(item))this.note=`此装备需要放入${SLOT_NAMES[slotOf(item)]}格`;else this.note=this.store.equip(this.selected,item.id)?'已穿戴，下一场生效':`当前角色无法穿戴 · ${equipmentFitLabel(item)}`;}
            else if(source&&Math.abs(p.x)<326&&p.y<=BAG_TOP&&p.y>=this.bagBottom){this.store.unequip(this.selected,source);this.note='已拖回背包';}else this.note='未放入对应格子，装备保持原位';
            this.picked=item.id;this.render();
        };
        node.on(Node.EventType.TOUCH_END,finish);
        // Cocos reports a release outside the source card as TOUCH_CANCEL.
        node.on(Node.EventType.TOUCH_CANCEL,(e:EventTouch)=>{
            if(moved)finish(e);
            else{e.propagationStopped=true;this.ghost?.destroy();this.ghost=null;}
        });
    }
}
