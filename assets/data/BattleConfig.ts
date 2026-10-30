import type { BattleOptions, UnitConfig } from '../battle/BattleEngine';

import { getHero, LEGACY_PARTY } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';

export const HEROES: UnitConfig[] = LEGACY_PARTY.map(id => ({ ...getHero(id)! }));

export const STAGE_NAMES = ['黄巾初阵', '山道伏兵', '营寨突围', '荒野追击', '黄巾大营'];

export function createBattleOptions(stage: number, seed = 20261030, heroLevel = 1,
    equipment: Record<string, { attack: number; defense: number; maxHp: number }> = {},
    party: readonly HeroId[] = LEGACY_PARTY): BattleOptions {
    if (!Number.isInteger(stage) || stage < 1 || stage > 99) throw new Error('Demo 关卡范围为 1–99');
    if (!Number.isInteger(heroLevel) || heroLevel < 1 || heroLevel > 99) throw new Error('全队等级范围为 1–99');
    const factor = Math.pow(1.17, stage - 1);

    const waves: UnitConfig[][] = [];
    for (let wave = 0; wave < 3; wave += 1) {
        const count = wave === 2 ? 4 : 3;
        const units: UnitConfig[] = [];
        for (let index = 0; index < count; index += 1) {
            const boss = wave === 2 && index === 0;
            units.push({
                id: `enemy-${wave}-${index}`,
                name: boss ? '黄巾头目' : index === 0 ? '黄巾刀兵' : '黄巾军',
                role: boss ? '首领' : '士兵',
                maxHp: Math.round((boss ? 1000 : 430 + wave * 80) * factor),
                attack: Math.round((boss ? 115 : 57 + wave * 10) * factor),
                defense: Math.round((boss ? 20 : 10) * factor),
                interval: boss ? 1.3 : 1.55 + index * 0.15,
                priority: boss ? 1 : 0,
                color: boss ? '#DEAA52' : '#A59860',
            });
        }
        waves.push(units);
    }
    return { heroes: createHeroes(party, heroLevel, equipment), waves, seed, timeLimit: 120 };
}

export function createHeroes(party: readonly HeroId[], heroLevel = 1,
    equipment: Record<string, { attack: number; defense: number; maxHp: number }> = {}): UnitConfig[] {
    if (!party.length || party.length > 5 || new Set(party).size !== party.length || party.some(id => !getHero(id))) throw new Error('阵容无效');
    if (!Number.isInteger(heroLevel) || heroLevel < 1 || heroLevel > 99) throw new Error('全队等级范围为1–99');
    const factor = Math.pow(1.18, heroLevel - 1);
    return party.map(id => {
        const hero = getHero(id)!;
        const bonus = equipment[id] || { attack: 0, defense: 0, maxHp: 0 };
        if (![bonus.attack, bonus.defense, bonus.maxHp].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('装备加成无效');
        return { ...hero, maxHp: Math.round(hero.maxHp * factor) + bonus.maxHp,
            attack: Math.round(hero.attack * factor) + bonus.attack, defense: Math.round(hero.defense * factor) + bonus.defense };
    });
}

export type SoldierType = 'mixed' | 'sword' | 'spear' | 'bow';
export function withSoldiers(heroes: UnitConfig[], size: number, level = 1, type: SoldierType = 'mixed', prefix = 'ally'): UnitConfig[] {
    const result = heroes.map(h => ({ ...h }));
    const factor = Math.pow(1.18, level - 1);
    const types = ['sword', 'spear', 'bow'] as const;
    while (result.length < size) {
        const i = result.length;
        const weapon = type === 'mixed' ? types[(i - heroes.length) % 3] : type;
        const stats = weapon === 'sword' ? [850, 43, 26, 1.35] : weapon === 'spear' ? [620, 59, 15, 1.15] : [430, 54, 9, 0.95];
        result.push({ id: `${prefix}-soldier-${i}`, name: weapon === 'sword' ? '刀盾兵' : weapon === 'spear' ? '长枪兵' : '弓箭兵',
            role: '补位小兵', kind: 'soldier', weapon, maxHp: Math.round(stats[0] * factor), attack: Math.round(stats[1] * factor),
            defense: Math.round(stats[2] * factor), interval: stats[3], priority: weapon === 'sword' ? 0 : weapon === 'spear' ? 2 : 4,
            color: weapon === 'sword' ? '#7B9384' : weapon === 'spear' ? '#7F96A3' : '#B19771' });
    }
    return result;
}

export function createMainlineOptions(stage: number, seed = 20261030, level = 1,
    equipment: Record<string, { attack: number; defense: number; maxHp: number }> = {},
    party: readonly HeroId[] = LEGACY_PARTY, troopType: SoldierType = 'mixed'): BattleOptions {
    const base = createBattleOptions(stage, seed, level, equipment, party);
    const boss = { ...base.waves[2][0], kind: 'boss' as const, maxHp: base.waves[2][0].maxHp * 2, name: '黄巾魔将' };
    return { ...base, heroes: withSoldiers(base.heroes, 5, level, troopType), waves: base.waves.slice(0, 2),
        bossWave: [boss], riftGoal: 100, approachTime: 1.1, timeLimit: 150 };
}
