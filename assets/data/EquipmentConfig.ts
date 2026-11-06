import type { WeaponKind } from '../battle/BattleEngine';
import { getHero, HERO_CATALOG, TIER_COLORS } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';
export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export const SLOT_NAMES = { weapon: '武器', armor: '战甲', charm: '兵符' };
export const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'armor', 'charm'];
export const EQUIPMENT_GRADES = [1, 2, 3, 4, 5] as const;
export const RARITY_NAMES = ['随军', '精制', '巧作', '镇军', '传世'] as const;
export const RARITY_COLORS = TIER_COLORS;
export const CHAPTER_PROTAGONIST_ID = 'chapter-protagonist';
export const ARMOR_NAMES = { cloth: '文袍', leather: '轻甲', heavy: '重甲' } as const;
export const CHARM_NAMES = { assault: '锋阵', guard: '护阵', support: '谋略' } as const;
export const WEAPON_NAMES: Record<WeaponKind, string> = {
    sword: '剑', spear: '枪', bow: '弓', fan: '扇', glaive: '大刀', serpent: '蛇矛',
    halberd: '戟', dual: '双刃', axe: '斧', staff: '杖', ribbon: '流绫', qin: '琴',
};
export type ArmorType = keyof typeof ARMOR_NAMES;
export type CharmType = keyof typeof CHARM_NAMES;
export type EquipmentRune = 'shield' | 'attack';
export interface Equipment {
    id: string; name: string; rarity: typeof EQUIPMENT_GRADES[number]; stage: number;
    attack: number; defense: number; maxHp: number;
    chapter?: true; polish?: number; rune?: EquipmentRune; stamped?: true;
    polishSpend?: { sand: number; coins: number };
    polishEnergy?: number;
    slot?: EquipmentSlot; appearance?: WeaponKind | 'armor' | 'charm'; exclusive?: HeroId;
    armorType?: ArmorType; charmType?: CharmType;
}
const signatureNames: Partial<Record<HeroId, string>> = {
    guanyu: '青龙偃月刀', zhangfei: '丈八蛇矛', zhaoyun: '龙胆亮银枪', zhugeliang: '八阵白羽扇', liubei: '雌雄双股剑',
    lvbu: '方天画戟', caocao: '倚天镇世剑', zhouyu: '赤壁流焰剑', simayi: '幽冥玄羽扇', huatuo: '青囊回春杖',
    sunce: '霸王破阵枪', caiwenji: '胡笳凤鸣琴', diaochan: '闭月流云绫', huangzhong: '百步落日弓', dianwei: '恶来双铁戟',
};
export function equipmentStats(item: Equipment) {
    const polish = item.polish || 0;
    const refinement = Math.max(0, polish - 3) * .025;
    return {
        attack: item.attack + Math.round(item.attack * refinement) + polish * (slotOf(item) === 'weapon' ? 8 : 2),
        defense: item.defense + Math.round(item.defense * refinement) + polish * (slotOf(item) === 'armor' ? 6 : 2),
        maxHp: item.maxHp + Math.round(item.maxHp * refinement) + polish * (slotOf(item) === 'charm' ? 90 : 25),
    };
}
export function slotOf(item: Equipment): EquipmentSlot { return item.slot || 'weapon'; }
export function signatureFor(hero: HeroId): Equipment {
    const h = getHero(hero)!;
    return { id: `signature-${hero}`, name: signatureNames[hero] || `${h.name}·${h.skillName}`, rarity: h.tier === 5 ? 5 : 4, stage: 1,
        slot: 'weapon', appearance: h.weapon, exclusive: hero, attack: 40 + h.tier * 12, defense: 10 + h.tier * 3, maxHp: 180 + h.tier * 40 };
}
export const SIGNATURE_CATALOG = HERO_CATALOG.map(h => signatureFor(h.id));
export function signatureEffect(hero: HeroId): string {
    const tactic = getHero(hero)!.tactic;
    return tactic === 'heal' ? '治疗量+25% · 专属光环' : tactic === 'guard' ? '护盾量+50% · 金甲护体'
        : tactic === 'volley' ? '普攻间隔-15% · 流光连射' : '技能伤害+25% · 专属刀光';
}
export function wearerEquipmentTypes(wearer: string): { weapon: WeaponKind; armor: ArmorType; charm: CharmType } {
    const hero = getHero(wearer);
    const guard = wearer === CHAPTER_PROTAGONIST_ID || hero?.tactic === 'guard';
    const support = hero?.tactic === 'heal' || hero?.weapon === 'fan' || hero?.weapon === 'qin' || hero?.weapon === 'staff';
    return { weapon: hero?.weapon ?? 'sword', armor: guard ? 'heavy' : support ? 'cloth' : 'leather',
        charm: guard ? 'guard' : support ? 'support' : 'assault' };
}

export function equipmentFitLabel(item: Equipment): string {
    if (item.exclusive) return `${getHero(item.exclusive)!.name}专用`;
    if (item.rarity < 4) return '';
    const slot = slotOf(item);
    if (slot === 'armor' && item.armorType) return `限${ARMOR_NAMES[item.armorType]}`;
    if (slot === 'charm' && item.charmType) return `限${CHARM_NAMES[item.charmType]}兵符`;
    const weapon = item.appearance;
    return weapon && weapon !== 'armor' && weapon !== 'charm' ? `限${WEAPON_NAMES[weapon]}系` : '';
}

export function canWear(wearer: string, item: Equipment): boolean {
    if (item.exclusive && item.exclusive !== wearer) return false;
    if (item.rarity < 4) return true;
    if (wearer !== CHAPTER_PROTAGONIST_ID && !getHero(wearer)) return false;
    const types = wearerEquipmentTypes(wearer);
    switch (slotOf(item)) {
        case 'weapon': return item.appearance === types.weapon;
        case 'armor': return item.armorType === types.armor;
        case 'charm': return item.charmType === types.charm;
    }
}
