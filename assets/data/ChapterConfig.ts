import { levelFactor } from './GrowthConfig';
import { createMainlineOptions } from './BattleConfig';
import type { CombatBonus, UnitConfig } from '../battle/BattleEngine';
import type { FormationEntry } from './FormationConfig';

export const DIFFICULTIES = ['探路', '硬仗', '翻天'] as const;
export type Difficulty = 0 | 1 | 2;
export const CHAPTER_MAPS = [
    { id: 'road', name: '长坂路', prize: '首通授长坂行军枪、张飞将帖', boss: '拦路校尉', goal: 30 },
    { id: 'ridge', name: '铁枪坡', prize: '定向掉落长枪', boss: '铁枪坡督军', goal: 44 },
    { id: 'bridge', name: '小桥口', prize: '廖化将帖与专属碎片', boss: '追骑统领', goal: 48 },
    { id: 'siege', name: '长坂围阵', prize: '三种整装材料，翻天首通开奇阵', boss: '长坂铁骑都尉', goal: 60 },
    { id: 'rift', name: '奇阵夺宝', prize: '定向追赵云将帖或龙胆亮银枪', boss: '守阵将·断桥铁胆', goal: 100 },
] as const;
export type ChapterMap = typeof CHAPTER_MAPS[number]['id'];
export const TARGETS = {
    officer: { name: '赵云将帖', rate: .03, guarantee: 30 },
    spear: { name: '龙胆亮银枪', rate: .05, guarantee: 20 },
} as const;
export type LootTarget = keyof typeof TARGETS;
export const MAP_DROP_RATES = {
    equipment: [.35, .6, .85],
    officer: [.12, .24, .4],
} as const;
export const WORKSHOPS = [
    { name: '炉前抢砂', material: '炉砂', action: '打磨', cost: 6, hint: '铁甲兵防御更高 · 带破阵武将' },
    { name: '灯下夺墨', material: '阵纹墨', action: '刻阵', cost: 6, hint: '弓兵密集且出手更快 · 用护阵稳住队伍' },
    { name: '将台夺印', material: '压阵印', action: '压阵', cost: 8, hint: '击破精卫后，督军额外受到25%伤害' },
] as const;
export type WorkshopIndex = 0 | 1 | 2;
const WORKSHOP_START_DAY = Date.UTC(2026, 10, 5) / 86400000; // Shanghai calendar day.
export function workshopIndex(window: number): WorkshopIndex {
    return ((window % 3 + 3) % 3) as WorkshopIndex;
}
export function workshopRotation(day: number) {
    const window = Math.floor((day - WORKSHOP_START_DAY) / 2);
    return { window, index: workshopIndex(window), switchAt: (WORKSHOP_START_DAY + (window + 1) * 2) * 86400000 - 8 * 3600000 };
}
export interface ChapterRun {
    id: string;
    map: ChapterMap | 'workshop';
    difficulty: Difficulty;
    target?: LootTarget;
    window?: number;
    level: number;
    layout: FormationEntry[];
    protagonistSpot: string;
    equipment: Record<string, CombatBonus>;
    seed: number;
    roll: number;
}
export type ChapterClears = Partial<Record<ChapterMap, number>>;
export function chapterLock(clears: ChapterClears, map: ChapterRun['map'], difficulty: Difficulty): string | null {
    if (map === 'workshop') return clears.road ? null : '长坂路首通后开放';
    if (map === 'rift') return (clears.siege || 0) & 4 ? null : '长坂围阵翻天首通后开放';
    if (map !== 'road' && !((clears.road || 0) & 1)) return '先通关长坂路探路';
    if (map === 'siege' && !((clears.ridge || 0) & (clears.bridge || 0) & 1)) return '先通关铁枪坡和小桥口探路';
    if (difficulty === 1 && !((clears[map] || 0) & 1)) return '先通关本图探路';
    if (difficulty === 2 && !((clears.siege || 0) & 2)) return '先通关长坂围阵硬仗';
    if (difficulty === 2 && !((clears[map] || 0) & 2)) return '先通关本图硬仗';
    return null;
}
export function chapterName(run: Pick<ChapterRun, 'map' | 'window'>): string {
    return run.map === 'workshop' ? WORKSHOPS[workshopIndex(run.window!)].name : CHAPTER_MAPS.find(m => m.id === run.map)!.name;
}

export const CHAPTER_PROTAGONIST_ID = 'chapter-protagonist';
export const CHAPTER_PROTAGONIST_COLOR = '#357F9A';
export function chapterProtagonist(level: number, spot: string): UnitConfig {
    const factor = levelFactor(level);
    return {
        id: CHAPTER_PROTAGONIST_ID, name: '主公', role: '主角 · 铁甲先锋', kind: 'hero', heroTier: 1, tactic: 'pierce',
        color: CHAPTER_PROTAGONIST_COLOR, weapon: 'sword', element: 'slash', skillName: '点将一击',
        maxHp: Math.round(2850 * factor), attack: Math.round(128 * factor), defense: Math.round(68 * factor),
        interval: 1.15, priority: -1, formationSpot: spot,
    };
}

export function chapterProtagonistSpot(layout: readonly FormationEntry[], preferred?: string | null): string {
    const spot = layout.find(entry => entry.spot === preferred) || layout.find(entry => entry.spot === 'r1c2')
        || layout.find(entry => entry.spot.endsWith('c2')) || layout[0];
    return spot.spot;
}

export const CHAPTER_SCENERY_STAGE = 401;
export function createChapterOptions(run: ChapterRun) {
    const workshop = run.map === 'workshop';
    const mapIndex = CHAPTER_MAPS.findIndex(m => m.id === run.map);
    const workIndex = workshop ? workshopIndex(run.window!) : 0;
    const map = CHAPTER_MAPS[workshop ? workIndex : mapIndex];
    // Prototype numbers are independent of the 999-stage map and use the actual player loadout.
    const scale = workshop ? 1.1 + workIndex * .15 : (1 + mapIndex * .16) * [1, 1.48, 2.2][run.difficulty];
    const guarded = run.difficulty === 2 || (workshop && workIndex === 2) ? 'break'
        : run.difficulty === 1 ? 'guard' : undefined;
    const companions = run.layout.filter(entry => entry.spot !== run.protagonistSpot);
    const base = createMainlineOptions(1, run.seed, run.level, run.equipment, [], 'mixed', companions);
    const heroes = [chapterProtagonist(run.level, run.protagonistSpot), ...base.heroes];
    const boss: UnitConfig = { ...base.bossWave![0], name: workshop ? `${chapterName(run)}·督军` : map.boss,
        weapon: workIndex === 1 ? 'axe' : 'spear', color: '#AD7457', maxHp: Math.round(1750 * scale),
        attack: Math.round(103 * scale), defense: Math.round(20 * scale), guarded,
    };
    const guards = guarded ? base.waves[1].slice(0, 2).map((unit, i): UnitConfig => ({
        ...unit, id: `chapter-escort-${i}`, name: '护阵精卫', elite: true, bodyguard: true, priority: -2,
        maxHp: Math.round(430 * scale), attack: Math.round(30 * scale), defense: Math.round(18 * scale),
    })) : [];
    const archer = base.waves[0].find(unit => unit.weapon === 'bow')!;
    const waves = base.waves.map(wave => wave.map((unit, index) => {
        const bowLine = workshop && workIndex === 1 && (index === 1 || index === 4);
        const gear = bowLine ? archer : unit;
        return {
            ...gear, id: unit.id, interval: gear.interval * (bowLine ? .72 : 1),
            maxHp: Math.round(gear.maxHp * scale), attack: Math.round(gear.attack * scale),
            defense: Math.round(gear.defense * scale * (workshop && workIndex === 0 ? 2.4 : 1)),
        };
    }));
    return { ...base, heroes, waves, riftGoal: map.goal, bossWave: [...guards, boss] };
}
