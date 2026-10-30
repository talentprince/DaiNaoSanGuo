import type { BattleOptions, UnitConfig } from '../battle/BattleEngine';

export const HEROES: UnitConfig[] = [
    { id: 'guanyu', name: '关羽', role: '青龙斩 · 输出', maxHp: 1150, attack: 90, defense: 22, interval: 1.1, priority: 2, color: '#58A686' },
    { id: 'zhangfei', name: '张飞', role: '先锋 · 坦克', maxHp: 2600, attack: 65, defense: 42, interval: 1.4, priority: 0, color: '#BF8467' },
    { id: 'zhaoyun', name: '赵云', role: '龙胆 · 输出', maxHp: 1100, attack: 75, defense: 20, interval: 0.8, priority: 1, color: '#78ABD1' },
    { id: 'zhugeliang', name: '诸葛亮', role: '军师 · 输出', maxHp: 850, attack: 100, defense: 12, interval: 1.5, priority: 4, color: '#AB93D1' },
    { id: 'liubei', name: '刘备', role: '仁德 · 治疗', maxHp: 1000, attack: 45, defense: 18, interval: 1.5, priority: 3, color: '#CBB069' },
];

export const STAGE_NAMES = ['黄巾初阵', '山道伏兵', '营寨突围', '荒野追击', '黄巾大营'];

export function createBattleOptions(stage: number, seed = 20261030, heroLevel = 1): BattleOptions {
    if (!Number.isInteger(stage) || stage < 1 || stage > 99) throw new Error('Demo 关卡范围为 1–99');
    if (!Number.isInteger(heroLevel) || heroLevel < 1 || heroLevel > 99) throw new Error('全队等级范围为 1–99');
    const factor = Math.pow(1.17, stage - 1);
    const heroFactor = Math.pow(1.18, heroLevel - 1);
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
    return { heroes: HEROES.map(hero => ({ ...hero,
        maxHp: Math.round(hero.maxHp * heroFactor), attack: Math.round(hero.attack * heroFactor),
        defense: Math.round(hero.defense * heroFactor),
    })), waves, seed, timeLimit: 120 };
}
