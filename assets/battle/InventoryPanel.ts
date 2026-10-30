import { Node } from 'cc';
import { getHero } from '../data/HeroCatalog';
import { equipmentScore, HERO_IDS, ProgressStore, RARITY_COLORS, RARITY_NAMES } from './ProgressStore';
import type { HeroId } from './ProgressStore';
import { button, panel, text } from './BattleUI';

/** 只处理背包展示，所有穿戴规则和存档由 ProgressStore 管理。 */
export class InventoryPanel {
    readonly node: Node;
    private selected: HeroId = 'guanhai';
    private heroPage = 0;
    private page = 0;
    private note = '每人可穿戴一件武器，属性在下一场战斗生效';
    private store: ProgressStore;

    constructor(parent: Node, store: ProgressStore, onClose: () => void) {
        this.store = store;
        this.selected = store.progress.owned[0];
        this.node = panel(parent, 'InventoryOverlay', 0, 0, 720, 1280, '#0B1626F4', 0);
        // 整屏拦截输入，避免点击到背包后方的战斗控制。
        this.node.on(Node.EventType.TOUCH_END, () => {});
        this.onClose = onClose;
        this.render();
    }

    private onClose: () => void;

    private heroName(id: HeroId): string { return getHero(id)!.name; }

    private render(): void {
        this.node.destroyAllChildren();
        const progress = this.store.progress;
        text(this.node, 'InventoryTitle', `装备背包  ${progress.inventory.length}/40`, 0, 558, 42, '#E8CE99');
        text(this.node, 'InventorySubtitle', '选择武将，穿戴战利品', 0, 503, 22, '#9EB2CB');
        const owned = progress.owned;
        const heroPages = Math.ceil(owned.length / 5);
        button(this.node, 'PrevHero', '‹', -285, 503, 56, 42, '#293C54', () => { this.heroPage = (this.heroPage + heroPages - 1) % heroPages; this.render(); });
        button(this.node, 'NextHero', '›', 285, 503, 56, 42, '#293C54', () => { this.heroPage = (this.heroPage + 1) % heroPages; this.render(); });
        owned.slice(this.heroPage * 5, this.heroPage * 5 + 5).forEach((id, index) => button(this.node, `HeroTab-${id}`, this.heroName(id), (index - 2) * 124, 440,
            112, 56, id === this.selected ? '#62745B' : '#293C54', () => { this.selected = id; this.page = 0; this.render(); }));
        const equipped = progress.inventory.find(item => item.id === progress.equipped[this.selected]);
        const summary = panel(this.node, 'EquippedSummary', 0, 350, 620, 100, '#21354A');
        text(summary, 'EquippedName', `${this.heroName(this.selected)} · ${equipped ? RARITY_NAMES[equipped.rarity - 1] + ' ' + equipped.name : '未穿戴武器'}`,
            0, 18, 24, equipped ? RARITY_COLORS[equipped.rarity - 1] : '#CAD3DF', 590);
        text(summary, 'EquippedStats', equipped ? `攻击 +${equipped.attack}   防御 +${equipped.defense}   生命 +${equipped.maxHp}` : '战利品在胜利结算时获得',
            0, -23, 19, '#99AFC5', 590);
        const items = progress.inventory.sort((a, b) => equipmentScore(b) - equipmentScore(a) || a.id.localeCompare(b.id));
        const pages = Math.max(1, Math.ceil(items.length / 5));
        this.page = Math.min(this.page, pages - 1);
        if (!items.length) {
            text(this.node, 'EmptyBag', '背包还是空的', 0, 80, 32, '#BFCAD8');
            text(this.node, 'EmptyBagHint', '再赢一场，即可获得一件装备', 0, 20, 23, '#8AA2BE');
        }
        items.slice(this.page * 5, this.page * 5 + 5).forEach((item, index) => {
            const row = panel(this.node, `Equipment-${item.id}`, 0, 205 - index * 120, 620, 108, '#23374D', 12);
            const owner = HERO_IDS.find(hero => progress.equipped[hero] === item.id);
            const isCurrent = owner === this.selected;
            text(row, 'EquipmentName', `${RARITY_NAMES[item.rarity - 1]} · ${item.name}`, -84, 26, 23, RARITY_COLORS[item.rarity - 1], 400);
            text(row, 'EquipmentStats', `攻击+${item.attack}  防御+${item.defense}  生命+${item.maxHp}`, -80, -8, 18, '#C0CDDC', 390);
            text(row, 'EquipmentSource', `第${item.stage}关掉落${owner ? ' · ' + this.heroName(owner) + '使用中' : ' · 未穿戴'}`, -80, -35, 16, '#829CB8', 390);
            button(row, 'EquipButton', isCurrent ? '卸下' : `给${this.heroName(this.selected)}`, 222, 0, 148, 64,
                isCurrent ? '#6D5649' : '#426A59', () => {
                    if (isCurrent) this.store.unequip(this.selected);
                    else this.store.equip(this.selected, item.id);
                    this.note = `${this.heroName(this.selected)}${isCurrent ? '已卸下武器' : '已穿戴' + item.name}，下局生效${this.store.storageAvailable ? '' : '（未保存）'}`;
                    this.render();
                });
        });
        text(this.node, 'PageInfo', `第 ${this.page + 1} / ${pages} 页 · 按装备评分排序`, 0, -355, 18, '#819AB6');
        button(this.node, 'PrevPage', '上一页', -238, -411, 142, 54, '#30465E', () => {
            this.page = Math.max(0, this.page - 1); this.render();
        });
        button(this.node, 'EquipBest', '穿戴最强', 0, -411, 290, 54, '#5D6045', () => {
            const success = this.store.equipBest(this.selected);
            this.note = success ? `${this.heroName(this.selected)}已穿戴最强可用武器，下局生效${this.store.storageAvailable ? '' : '（未保存）'}`
                : '暂无未被其他武将占用的装备';
            this.render();
        });
        button(this.node, 'NextPage', '下一页', 238, -411, 142, 54, '#30465E', () => {
            this.page = Math.min(pages - 1, this.page + 1); this.render();
        });
        text(this.node, 'InventoryNote', this.note, 0, -478, 20, '#C5D9CC', 660);
        button(this.node, 'CloseInventory', '返回战斗', 0, -554, 620, 64, '#3E5D71', () => {
            this.node.destroy(); this.onClose();
        });
    }
}
