import type { WeaponKind } from '../battle/BattleEngine';
import { getHero, HERO_CATALOG } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';
export type EquipmentSlot = 'weapon' | 'armor' | 'charm';
export const SLOT_NAMES = { weapon: '武器', armor: '战甲', charm: '兵符' };
export const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'armor', 'charm'];
export const RARITY_NAMES = ['随军', '巧作', '镇军'] as const;
export const RARITY_COLORS = ['#E4EAF2', '#CB9AFF', '#FFD378'] as const;
export type EquipmentRune = 'shield' | 'attack';
export interface Equipment {
    id: string; name: string; rarity: 1 | 2 | 3; stage: number;
    attack: number; defense: number; maxHp: number;
    chapter?: true; polish?: number; rune?: EquipmentRune; stamped?: true;
    slot?: EquipmentSlot; appearance?: WeaponKind | 'armor' | 'charm'; exclusive?: HeroId;
}
const signatureNames: Partial<Record<HeroId, string>> = {
    guanyu: '青龙偃月刀', zhangfei: '丈八蛇矛', zhaoyun: '龙胆亮银枪', zhugeliang: '八阵白羽扇', liubei: '雌雄双股剑',
    lvbu: '方天画戟', caocao: '倚天镇世剑', zhouyu: '赤壁流焰剑', simayi: '幽冥玄羽扇', huatuo: '青囊回春杖',
    sunce: '霸王破阵枪', caiwenji: '胡笳凤鸣琴', diaochan: '闭月流云绫', huangzhong: '百步落日弓', dianwei: '恶来双铁戟',
};
export function equipmentStats(item: Equipment) {
    const polish = item.polish || 0;
    return {
        attack: item.attack + polish * (slotOf(item) === 'weapon' ? 8 : 2),
        defense: item.defense + polish * (slotOf(item) === 'armor' ? 6 : 2),
        maxHp: item.maxHp + polish * (slotOf(item) === 'charm' ? 90 : 25),
    };
}
export function slotOf(item: Equipment): EquipmentSlot { return item.slot || 'weapon'; }
export function signatureFor(hero: HeroId): Equipment {
    const h = getHero(hero)!;
    return { id: `signature-${hero}`, name: signatureNames[hero] || `${h.name}·${h.skillName}`, rarity: 3, stage: 1,
        slot: 'weapon', appearance: h.weapon, exclusive: hero, attack: 40 + h.tier * 12, defense: 10 + h.tier * 3, maxHp: 180 + h.tier * 40 };
}
export const SIGNATURE_CATALOG = HERO_CATALOG.map(h => signatureFor(h.id));
export function signatureEffect(hero: HeroId): string {
    const tactic = getHero(hero)!.tactic;
    return tactic === 'heal' ? '治疗量+25% · 专属光环' : tactic === 'guard' ? '护盾量+50% · 金甲护体'
        : tactic === 'volley' ? '普攻间隔-15% · 流光连射' : '技能伤害+25% · 专属刀光';
}
export function canWear(hero: HeroId, item: Equipment): boolean { return !item.exclusive || item.exclusive === hero; }
