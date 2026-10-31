import { bossRotation,worldBoss } from './WorldBossConfig';
import type { WorldBossId } from './WorldBossConfig';
import { applyBonds } from './BondConfig';
import { levelFactor, stageFactor } from './GrowthConfig';
import type { CombatBonus } from '../battle/BattleEngine';
import type { BattleOptions, UnitConfig } from '../battle/BattleEngine';
import type { SoldierType } from './BattleConfig';
import type { HeroId } from './HeroCatalog';
import { getHero, validateParty } from './HeroCatalog';
import type { FormationEntry } from './FormationConfig';
import { createHeroes, createLineup, withSoldiers } from './BattleConfig';

export type ActivityMode = 'city' | 'boss' | 'trial' | 'boat';
export type BoatChoice = 'wind' | 'guard' | 'repair';
export interface ActivityRun {
    id: string; mode: ActivityMode; stage: number; day: number;
    party: HeroId[]; level: number;
    equipment: Record<string, CombatBonus>;
    choices: BoatChoice[];
    band?: number;
    worldBoss?:WorldBossId;bossWeek?:number;
    troopType?: SoldierType;
    defenders?: HeroId[];
    wallHeroes?: HeroId[];
    layout?: FormationEntry[];
    defenseLayout?: FormationEntry[];
}
export const ACTIVITY_NAMES = { city: '城门别闹', boss: '魔王轮番揍', trial: '三将闹五关', boat: '草船借宝' };
export const TRIAL_TRAITS = [
    ['铁甲关', '敌方高护甲，带破阵武将用怒气技能突破'],
    ['人海关', '五敌齐上，群攻与速攻更有用'],
    ['回春关', '敌方持续回血，集中爆发压过回复'],
    ['断粮关', '怒气恢复减半，靠普攻攻速与生存'],
    ['火烧关', '全队持续失血，需要治疗与迅速结束'],
];
export function trialTrait(stage: number): string[] { return TRIAL_TRAITS[(stage - 1) % 5]; }

export function createActivityOptions(run: ActivityRun): BattleOptions {
    if (!Number.isInteger(run.stage) || run.stage < 1 || run.stage > 99) throw new Error('副本关卡无效');
    const bandFactor = stageFactor(((run.band || 1) - 1) * 50 + 1);
    const heroes = run.layout ? createLineup(run.layout, run.level, run.equipment) : applyBonds(withSoldiers(createHeroes(run.party, run.level, run.equipment), run.mode === 'trial' ? 3 : 5, run.level, run.troopType));
    if (run.mode === 'trial' && !run.layout && validateParty(run.party, run.party, 'trial')) throw new Error('三将阵容无效');
    const foe = (index: number, name: string, hp: number, attack: number, defense: number, interval = 1.5): UnitConfig => ({
        id: `enemy-${index}`, name, role: '副本', maxHp: hp, attack, defense, interval, priority: index,
        color: '#B79B63',
    });
    if (run.mode === 'boss') {const b=run.worldBoss?worldBoss(run.worldBoss):bossRotation(run.day*86400000).boss;return { heroes,waves:[[{...foe(0,`${b.name}·${b.title}`,1e15,Math.round(b.attack*bandFactor),Math.round(b.defense*bandFactor),b.interval),kind:'boss',weapon:b.weapon,color:b.color,element:b.element,visualId:`world-${b.id}`,weakElement:b.weakElement,weakTactic:b.weakTactic,skillName:`${b.name}·魔王威压`}]],seed:35,timeLimit:30,scoreMode:true,bossFinale:{name:b.finale,element:b.element,duration:2.8}};}

    if (run.mode === 'city') {
        // Explicit local training snapshots. Real player matchmaking belongs to the server phase.
        const party = run.defenders || ['huanggai', 'xuhuang', 'sunshangxiang', 'liubei', 'liaohua'];
        const wallHeroes = run.wallHeroes || party.slice(0, 2);
        const defenders = (run.defenseLayout ? createLineup(run.defenseLayout, run.level, {}, 'guard') : withSoldiers(createHeroes(party, run.level, {}), 5, run.level, run.troopType, 'enemy'))
            .map((u, i) => ({ ...u, id: `enemy-${i}`, name: `守军·${u.name}`, onWall: u.formationSpot ? u.formationSpot.startsWith('tower-') : wallHeroes.indexOf(u.id as HeroId) >= 0, maxHp: Math.round(u.maxHp * 0.8) }));
        const wall = { ...foe(99, '呆城城墙', Math.round(2200 * levelFactor(run.level)), 0, 35, 99), kind: 'wall' as const, priority: -10 };
        return { heroes, waves: [[wall, ...defenders]], seed: 42, timeLimit: 120, approachTime: 3.3 };
    }
    if (run.mode === 'trial') {
        const factor = stageFactor(run.stage * 3);
        const trait = (run.stage - 1) % 5;
        const enemies = Array.from({ length: 5 }, (_, i) => foe(i, `${trialTrait(run.stage)[0]}守将`,
            Math.round((trait === 2 ? 800 : 650) * factor), Math.round((25 + i * 2) * factor),
            Math.round((trait === 0 ? 120 : 12) * factor), trait === 1 ? 1.2 : 1.7));
        return { heroes, waves: [enemies], seed: run.stage + 100, timeLimit: 90, approachTime: 1.1,
            enemyRegen: trait === 2 ? 0.025 : 0, energyRate: trait === 3 ? .35 : .8, heroDrain: trait === 4 ? 0.012 : 0 };
    }
    if (run.mode !== 'boat' || run.choices.length !== 3 || run.choices.some(c => ['wind', 'guard', 'repair'].indexOf(c) < 0)) throw new Error('航线筹谋无效');
    const count = (choice: BoatChoice) => run.choices.filter(c => c === choice).length;
    heroes.forEach(hero => {
        hero.attack = Math.round(hero.attack * (1 + count('wind') * 0.2));
        hero.defense = Math.round(hero.defense * (1 + count('guard') * 0.35));
        hero.maxHp = Math.round(hero.maxHp * (1 + count('repair') * 0.2));
    });
    const factor = bandFactor;
    return { heroes, waves: [0, 1, 2].map(wave => Array.from({ length: wave === 2 ? 5 : 3 }, (_, i) => foe(wave * 5 + i,
        wave === 2 && i === 0 ? '截江头目' : '截江水匪', Math.round((550 + wave * 120) * factor),
        Math.round((47 + wave * 10) * factor), Math.round(15 * factor)))), seed: 88, timeLimit: 120, approachTime: 1.1 };
}

export function acquisition(id: string): string {
    const hero = getHero(id)!;
    if (hero.tier === 1) return '初始伙伴 / 招募';
    if (hero.tier === 4) return '招募1% / 2100脑勋任选';
    return `${hero.storyStage ? `主线第${hero.storyStage}关首通 / ` : ''}招募${hero.tier === 3 ? ' / 1400脑勋任选' : ''}`;
}
