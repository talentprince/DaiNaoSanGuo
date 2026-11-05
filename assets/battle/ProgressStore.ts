import { bossRotation,WORLD_BOSSES } from '../data/WorldBossConfig';
import type { WorldBossId } from '../data/WorldBossConfig';
import { cleanEnergy } from '../data/EnergyConfig';
import { MAX_STAGE, MAX_LEVEL, MAX_STARS, XP_DAILY_MS, MEDAL_DAILY_CAP, SIGNATURE_COST, STAR_COSTS, xpRequired, xpPerMinute, expeditionBand, bossGrade, stageFactor } from '../data/GrowthConfig';
import { canWear, equipmentStats, signatureFor, slotOf, SLOT_ORDER } from '../data/EquipmentConfig';
import type { Equipment, EquipmentRune, EquipmentSlot } from '../data/EquipmentConfig';
import { BattleEngine } from './BattleEngine';
import type { CombatBonus } from './BattleEngine';
export type { Equipment } from '../data/EquipmentConfig';
import { arrangeParty, validateFormation, formationHeroes, autoFormation, repairFormation } from '../data/FormationConfig';
import type { FormationEntry, FormationMode } from '../data/FormationConfig';
import { DRAW_COST, DIVINE_PITY, EXCHANGE_COST, getHero, HERO_CATALOG, HERO_IDS, LEGACY_PARTY, STARTER_PARTY, validateParty } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import type { SoldierType } from '../data/BattleConfig';
import type { ActivityMode, ActivityRun, BoatChoice } from '../data/ActivityConfig';
import { CHAPTER_MAPS, chapterLock, chapterProtagonistSpot, createChapterOptions, DIFFICULTIES, MAP_DROP_RATES, TARGETS, WORKSHOPS, workshopIndex, workshopRotation } from '../data/ChapterConfig';
import type { ChapterClears, ChapterRun, Difficulty, LootTarget, WorkshopIndex } from '../data/ChapterConfig';
export { HERO_IDS } from '../data/HeroCatalog';
export type { HeroId } from '../data/HeroCatalog';

export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface DailyState { day: number; cityUsed: number; boatUsed: number; bossBest: number; bossDaibi: number; bossPoints: number; medalEarned: number; xpUsedMs: number; soulEarned: number; modes: string[]; bonusClaimed: boolean; bossBand: number; }
interface ChapterProgress {
    protagonistSpot: string | null;
    clears: ChapterClears;
    pity: Record<LootTarget, number>;
    materials: [number, number, number];
    lastWorkshopWin: number | null;
    pending: ChapterRun | null;
    reserve: Equipment | null;
    offline: { run: ChapterRun; since: number } | null;
}
const OFFLINE_CHAPTER_RUN_MS = 20 * 60 * 1000;
export interface ChapterSettlement {
    saved: boolean;
    lines: string[];
}
export interface Progress {
    chapter: ChapterProgress;
    trialEnergy: {stage:number;heroes:Record<string,number>}|null;
    mainlineEnergy: {stage:number;heroes:Record<string,number>}|null;
    growthVersion: 1; experience: number; xpAt: number; xpRemainder: number;
    stars: Partial<Record<HeroId, number>>; fragments: Partial<Record<HeroId, number>>; souls: number;
    loadouts: Partial<Record<HeroId, Partial<Record<EquipmentSlot, string>>>>;
    version: 1; coins: number; highestCleared: number; heroLevel: number; settled: string[];
    inventory: Equipment[]; equipped: Partial<Record<HeroId, string>>;
    formations: Record<FormationMode, FormationEntry[]>;
    troopType: SoldierType; wallHeroes: HeroId[];
    metaVersion: 2; daibi: number; points: number; owned: HeroId[]; formation: HeroId[];
    trialParty: HeroId[]; defense: HeroId[]; firstCleared: number[]; trialHighest: number;
    pity: number; drawCount: number; idleAt: number; idleRemainder: number;
    daily: DailyState; runSerial: number; pending: ActivityRun | null;
}
export interface RecruitResult { hero: HeroId; duplicate: boolean; coins: number; fragments: number; guaranteed: boolean; }
export interface Settlement { granted: boolean; coins: number; saved: boolean; equipment?: Equipment; convertedCoins?: number; daibi?: number; heroes?: HeroId[]; }
const KEY = 'dainaosanguo.demo.progress.v1';
export const DAY_MS = 86400000;
export const IDLE_DAILY_DAIBI = 1000;
export function chinaDay(now: number): number { return Math.floor((now + 8 * 3600000) / DAY_MS); }
const dailyState = (day: number): DailyState => ({ day, cityUsed: 0, boatUsed: 0, bossBest: 0, bossDaibi: 0, bossPoints: 0, medalEarned: 0, xpUsedMs: 0, soulEarned: 0, modes: [], bonusClaimed: false, bossBand: 1 });
const nonnegative = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const emptyChapter = (): ChapterProgress => ({
    protagonistSpot: null, clears: {}, pity: { officer: 0, spear: 0 }, materials: [0, 0, 0], lastWorkshopWin: null, pending: null, reserve: null, offline: null,
});
const emptyProgress = (now: number): Progress => ({ chapter: emptyChapter(), trialEnergy:null,mainlineEnergy:null,growthVersion: 1, experience: 0, xpAt: now, xpRemainder: 0, stars: {}, fragments: {}, souls: 0, loadouts: {}, version: 1, coins: 0, highestCleared: 0, heroLevel: 1,
    settled: [], inventory: [], equipped: {}, formations: { main: arrangeParty(STARTER_PARTY, 'main'), trial: arrangeParty(STARTER_PARTY.slice(0, 3), 'trial'), defense: arrangeParty(STARTER_PARTY, 'defense', 'mixed', STARTER_PARTY.slice(0, 2)) }, troopType: 'mixed', wallHeroes: STARTER_PARTY.slice(0, 2), metaVersion: 2, daibi: 0, points: 0, owned: [...STARTER_PARTY], formation: [...STARTER_PARTY],
    trialParty: STARTER_PARTY.slice(0, 3), defense: [...STARTER_PARTY], firstCleared: [], trialHighest: 0,
    pity: 0, drawCount: 0, idleAt: now, idleRemainder: 0, daily: dailyState(chinaDay(now)), runSerial: 0, pending: null });

export { RARITY_NAMES, RARITY_COLORS } from '../data/EquipmentConfig';

export function equipmentScore(item: Equipment): number {
    const stats = equipmentStats(item);
    return stats.attack * 5 + stats.defense * 4 + stats.maxHp;
}

export function createEquipment(stage: number, battleId: string): Equipment {
    if (!Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE || !battleId) throw new Error('装备掉落参数无效');
    let hash = 2166136261;
    for (let i = 0; i < battleId.length; i += 1) hash = Math.imul(hash ^ battleId.charCodeAt(i), 16777619) >>> 0;
    const roll = hash % 100;
    const rarity: 1 | 2 | 3 = roll < 60 ? 1 : roll < 92 ? 2 : 3;
    const factor = rarity === 1 ? 1 : rarity === 2 ? 1.6 : 2.5;
    const slot = SLOT_ORDER[Math.floor(hash / 100) % 3];
    const names = slot === 'weapon' ? ['青锋剑', '百炼刀', '龙纹战刃'] : slot === 'armor' ? ['铁叶甲', '虎贲铠', '麒麟战甲'] : ['行军符', '破阵虎符', '龙纹兵符'];
    return { id: `loot-${battleId}`, name: names[rarity - 1], rarity, stage, slot, appearance: slot === 'weapon' ? (['sword', 'glaive', 'halberd'] as const)[rarity - 1] : slot,
        attack: Math.round((6 + Math.sqrt(stage) * 2) * factor * (slot === 'weapon' ? 1.5 : 0.4)), defense: Math.round((2 + Math.sqrt(stage)) * factor * (slot === 'armor' ? 2 : 0.5)),
        maxHp: Math.round((25 + Math.sqrt(stage) * 8) * factor * (slot === 'charm' ? 2 : 0.7)) };
}

function validEquipment(item: Equipment): boolean {
    return !!item && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string'
        && [1, 2, 3].indexOf(item.rarity) >= 0 && Number.isInteger(item.stage) && item.stage >= 1 && item.stage <= MAX_STAGE
        && (item.slot === undefined || SLOT_ORDER.indexOf(item.slot) >= 0)
        && (item.exclusive === undefined || (!!getHero(item.exclusive) && item.id === `signature-${item.exclusive}` && slotOf(item) === 'weapon'))
        && (item.appearance === undefined || ['sword','spear','bow','fan','glaive','serpent','halberd','dual','axe','staff','ribbon','qin','armor','charm'].indexOf(item.appearance) >= 0)
        && (item.chapter === undefined || item.chapter === true)
        && (item.polish === undefined || nonnegative(item.polish, 3))
        && (item.rune === undefined || item.rune === 'shield' || item.rune === 'attack')
        && (item.stamped === undefined || (item.stamped === true && !!item.rune && item.rarity === 3))
        && [item.attack, item.defense, item.maxHp].every(value => Number.isSafeInteger(value) && value >= 0);
}


function validBonuses(items: Record<string, CombatBonus>): boolean {
    return !!items && typeof items === 'object' && !Array.isArray(items) && Object.keys(items).every(id => {
        const bonus = items[id];
        return !!getHero(id) && !!bonus && [bonus.attack, bonus.defense, bonus.maxHp].every(n => nonnegative(n))
            && (bonus.signature === undefined || bonus.signature === id)
            && (bonus.stars === undefined || (nonnegative(bonus.stars, MAX_STARS) && bonus.stars > 0))
            && [bonus.openingShield, bonus.openingAttack].every(n => n === undefined || n === .12 || n === .22);
    });
}

/** Local prototype only; real balances, clocks, RNG and multiplayer settlements need the server. */
export class ProgressStore {
    private state: Progress;
    private storage: StorageAdapter;
    private clock: () => number;
    private random: () => number;
    storageAvailable = true;
    readonly developerMode:boolean;
    get inventoryCapacity():number{return this.developerMode?160:40;}

    constructor(storage: StorageAdapter, clock: () => number = Date.now, random: () => number = Math.random, options:{developer?:boolean}={}) {
        this.developerMode=!!options.developer;
        this.storage = storage; this.clock = clock; this.random = random;
        const now = this.now();
        this.state = emptyProgress(now);
        try {
            const raw = storage.getItem(KEY);
            if (raw) {
                const data = JSON.parse(raw) as Progress;
                const level = data.heroLevel === undefined ? 1 : data.heroLevel;
                if (data.version !== 1 || !nonnegative(data.coins) || !nonnegative(data.highestCleared, MAX_STAGE)
                    || !Array.isArray(data.settled) || !data.settled.every(id => typeof id === 'string')
                    || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL) return;
                const inventory: Equipment[] = [];
                if (Array.isArray(data.inventory)) data.inventory.forEach(item => {
                    if (inventory.length < this.inventoryCapacity && validEquipment(item) && !inventory.some(old => old.id === item.id)) inventory.push(item.exclusive ? { ...signatureFor(item.exclusive), chapter: item.chapter, polish: item.polish, rune: item.rune, stamped: item.stamped } : { ...item });
                });
                const legacy = data.metaVersion !== 2;
                const owned = legacy ? [...STARTER_PARTY, ...LEGACY_PARTY] : Array.isArray(data.owned)
                    ? HERO_IDS.filter(id => data.owned.indexOf(id) >= 0 || STARTER_PARTY.indexOf(id) >= 0) : [...STARTER_PARTY];
                HERO_CATALOG.forEach(hero => { if (hero.storyStage && hero.storyStage <= data.highestCleared && owned.indexOf(hero.id) < 0) owned.push(hero.id); });
                const equipped: Partial<Record<HeroId, string>> = {};
                HERO_IDS.forEach(hero => {
                    const id = data.equipped && data.equipped[hero];
                    if (id && owned.indexOf(hero) >= 0 && inventory.some(item => item.id === id && slotOf(item) === 'weapon' && canWear(hero, item))
                        && !HERO_IDS.some(other => equipped[other] === id)) equipped[hero] = id;
                });
                const party = (ids: HeroId[] | undefined, mode: 'main' | 'trial' | 'defense', fallback: HeroId[]) =>
                    Array.isArray(ids) && !validateParty(ids, owned, mode) ? [...ids] : [...fallback];
                const d = data.daily;
                const daily = d && nonnegative(d.day) && nonnegative(d.cityUsed, 3) && nonnegative(d.boatUsed, 2)
                    && nonnegative(d.bossBest) && nonnegative(d.bossDaibi, 1000) && nonnegative(d.bossPoints, 120) ? { ...dailyState(d.day), ...d, medalEarned: nonnegative(d.medalEarned, MEDAL_DAILY_CAP) ? d.medalEarned : 0, xpUsedMs: nonnegative(d.xpUsedMs, XP_DAILY_MS) ? d.xpUsedMs : 0, soulEarned: nonnegative(d.soulEarned, 20) ? d.soulEarned : 0, modes: Array.isArray(d.modes) ? d.modes.filter(m => ['city','boss','trial','boat'].indexOf(m) >= 0) : [], bonusClaimed: !!d.bonusClaimed, bossBand: nonnegative(d.bossBand,20) && d.bossBand > 0 ? d.bossBand : 1 } : dailyState(chinaDay(now));
                this.state = { ...emptyProgress(now), coins: data.coins, highestCleared: data.highestCleared, heroLevel: level,
                    settled: data.settled.slice(-128), inventory, equipped, owned,
                    formation: party(data.formation, 'main', legacy ? LEGACY_PARTY : STARTER_PARTY),
                    trialParty: party(data.trialParty, 'trial', STARTER_PARTY.slice(0, 3)),
                    defense: party(data.defense, 'defense', legacy ? LEGACY_PARTY : STARTER_PARTY),
                    daibi: nonnegative(data.daibi) ? data.daibi : 0, points: nonnegative(data.points) ? data.points : 0,
                    pity: nonnegative(data.pity, DIVINE_PITY - 1) ? data.pity : 0,
                    drawCount: nonnegative(data.drawCount) ? data.drawCount : 0,
                    firstCleared: legacy ? Array.from({ length: data.highestCleared }, (_, i) => i + 1)
                        : Array.isArray(data.firstCleared) ? [...new Set(data.firstCleared.filter(n => Number.isInteger(n) && n > 0 && n <= MAX_STAGE))] : [],
                    trialHighest: nonnegative(data.trialHighest, 99) ? data.trialHighest : 0,
                    idleAt: nonnegative(data.idleAt) ? data.idleAt : now, idleRemainder: nonnegative(data.idleRemainder, DAY_MS - 1) ? data.idleRemainder : 0,
                    daily, runSerial: nonnegative(data.runSerial) ? data.runSerial : 0, pending: null };
                const trial=data.trialEnergy;if(trial&&Number.isInteger(trial.stage)&&trial.stage===this.state.trialHighest+1&&trial.stage<=99)this.state.trialEnergy={stage:trial.stage,heroes:cleanEnergy(trial.heroes)};
                const carry=data.mainlineEnergy;if(carry&&Number.isInteger(carry.stage)&&carry.stage===this.state.highestCleared+1&&carry.stage<=MAX_STAGE)this.state.mainlineEnergy={stage:carry.stage,heroes:cleanEnergy(carry.heroes)};
                this.state.experience = nonnegative(data.experience) ? data.experience : 0;
                this.state.xpAt = nonnegative(data.xpAt) ? data.xpAt : now;
                this.state.xpRemainder = nonnegative(data.xpRemainder, 1199999) ? data.xpRemainder : 0;
                this.state.souls = nonnegative(data.souls) ? data.souls : 0;
                const used = new Set<string>();
                HERO_IDS.forEach(hero => {
                    if (owned.indexOf(hero) < 0) return;
                    this.state.stars[hero] = data.stars && nonnegative(data.stars[hero], MAX_STARS) && data.stars[hero]! >= 1 ? data.stars[hero] : 1;
                    this.state.fragments[hero] = data.fragments && nonnegative(data.fragments[hero]) ? data.fragments[hero] : 0;
                    const slots: Partial<Record<EquipmentSlot, string>> = {};
                    SLOT_ORDER.forEach(slot => {
                        const id = data.loadouts?.[hero]?.[slot] || (slot === 'weapon' ? equipped[hero] : undefined);
                        const item = inventory.find(i => i.id === id && slotOf(i) === slot && canWear(hero, i));
                        if (item && !used.has(item.id)) { slots[slot] = item.id; used.add(item.id); }
                    });
                    this.state.loadouts[hero] = slots;
                });
                this.syncWeapons();
                const w = data.wallHeroes;
                this.state.wallHeroes = Array.isArray(w) && w.length <= 2 && new Set(w).size === w.length && w.every(id => this.state.defense.indexOf(id) >= 0) ? [...w] : this.state.defense.slice(0, 2);
                this.state.troopType = ['mixed', 'sword', 'spear', 'bow'].indexOf(data.troopType) >= 0 ? data.troopType : 'mixed';
                const modes: FormationMode[] = ['main', 'trial', 'defense'];
                modes.forEach(mode => {
                    const saved = data.formations && data.formations[mode];
                    const legacyParty = mode === 'main' ? this.state.formation : mode === 'trial' ? this.state.trialParty : this.state.defense;
                    this.state.formations[mode] = Array.isArray(saved) ? repairFormation(saved, this.state.owned, mode) : arrangeParty(legacyParty, mode, this.state.troopType, mode === 'defense' ? this.state.wallHeroes : []);
                });
                this.syncParties();
                if (this.validRun(data.pending)) this.state.pending = copy(data.pending);
                this.restoreChapter(data.chapter);
                this.refreshDay();
                // Persist the start of the new XP clock once; reopening before any battle must not restart migration.
                if (data.growthVersion !== 1) this.save();
            }
        } catch (_) { this.storageAvailable = false; }
    }

    private now(): number { const value = Math.floor(this.clock()); if (!nonnegative(value)) throw new Error('本机时间无效'); return value; }
    private refreshDay(): void {
        const day = chinaDay(this.now());
        if (day > this.state.daily.day) {
            this.state.daily = dailyState(day);
            if (this.state.pending && this.state.pending.mode !== 'trial') this.state.pending = null;
        }
    }
    private validRun(run: ActivityRun | null): run is ActivityRun {
        return !!run && typeof run.id === 'string' && run.id.length > 0 && ['city', 'boss', 'trial', 'boat'].indexOf(run.mode) >= 0
            && Number.isInteger(run.stage) && run.stage > 0 && run.stage <= 99 && nonnegative(run.day)
            && (run.worldBoss===undefined||WORLD_BOSSES.some(b=>b.id===run.worldBoss)) && (run.bossWeek===undefined||Number.isSafeInteger(run.bossWeek))
            && (run.band === undefined || (nonnegative(run.band,20) && run.band > 0))
            && Number.isInteger(run.level) && run.level > 0 && run.level <= MAX_LEVEL && Array.isArray(run.party)
            && (run.layout ? !validateFormation(run.layout, this.state.owned, run.mode === 'trial' ? 'trial' : 'main') : !validateParty(run.party, this.state.owned, run.mode === 'trial' ? 'trial' : 'main'))
            && validBonuses(run.equipment)
            && (run.troopType === undefined || ['mixed', 'sword', 'spear', 'bow'].indexOf(run.troopType) >= 0)
            && (run.defenseLayout ? !validateFormation(run.defenseLayout, this.state.owned, 'defense') : run.defenders === undefined || (Array.isArray(run.defenders) && !validateParty(run.defenders, this.state.owned)))
            && (run.wallHeroes === undefined || (Array.isArray(run.wallHeroes) && run.wallHeroes.length <= 2 && new Set(run.wallHeroes).size === run.wallHeroes.length && run.wallHeroes.every(id => (run.defenders || []).indexOf(id) >= 0)))
            && Array.isArray(run.choices) && run.choices.every(c => ['wind', 'guard', 'repair'].indexOf(c) >= 0)
            && (run.mode !== 'boat' || run.choices.length === 3);
    }
    get currentBoss(){return bossRotation(this.now());}
    get progress(): Progress { this.refreshDay(); return copy(this.state); }
    get experienceCost(): number { return xpRequired(this.state.heroLevel); }
    get upgradeCost(): number { return 80 + this.state.heroLevel * 40; }
    upgradeTeam(): { upgraded: boolean; cost: number; level: number; saved: boolean } {
        const cost = this.upgradeCost;
        if (this.state.heroLevel >= MAX_LEVEL || this.state.coins < cost || this.state.experience < this.experienceCost) return { upgraded: false, cost, level: this.state.heroLevel, saved: this.storageAvailable };
        this.state.coins -= cost; this.state.experience -= this.experienceCost; this.state.heroLevel += 1;
        return { upgraded: true, cost, level: this.state.heroLevel, saved: this.save() };
    }
    setParty(ids: HeroId[], mode: 'main' | 'trial' | 'defense'): string | null {
        const error = validateParty(ids, this.state.owned, mode);
        if (error) return error;
        if (mode === 'main') this.state.formation = [...ids];
        else if (mode === 'trial') this.state.trialParty = [...ids];
        else { this.state.defense = [...ids]; this.state.wallHeroes = this.state.wallHeroes.filter(id => ids.indexOf(id) >= 0); }
        this.state.formations[mode === 'defense' ? 'defense' : mode] = arrangeParty(ids, mode, this.state.troopType, mode === 'defense' ? this.state.wallHeroes : []);
        this.syncParties(); this.save(); return null;
    }
    private syncParties(): void {
        this.state.formation = formationHeroes(this.state.formations.main);
        this.state.trialParty = formationHeroes(this.state.formations.trial);
        this.state.defense = formationHeroes(this.state.formations.defense);
        this.state.wallHeroes = formationHeroes(this.state.formations.defense.filter(e => e.spot.startsWith('tower-')));
    }
    saveFormation(mode: FormationMode, entries: FormationEntry[]): string | null {
        const error = validateFormation(entries, this.state.owned, mode);
        if (error) return error;
        this.state.formations[mode] = copy(entries); this.syncParties(); this.save(); return null;
    }
    autoArrange(mode: FormationMode): void { this.saveFormation(mode, autoFormation(this.state.owned, mode)); }
    setWallHeroes(ids: HeroId[]): string | null {
        if (ids.length > 2 || new Set(ids).size !== ids.length || ids.some(id => this.state.defense.indexOf(id) < 0)) return '最多选2名守城阵容中的武将上城墙';
        this.state.wallHeroes = [...ids]; this.state.formations.defense = arrangeParty(this.state.defense, 'defense', this.state.troopType, ids); this.syncParties(); this.save(); return null;
    }
    setTroopType(type: SoldierType): void {
        if (['mixed', 'sword', 'spear', 'bow'].indexOf(type) < 0) throw new Error('兵种无效');
        this.state.troopType = type;
        (['main', 'trial', 'defense'] as const).forEach(mode => { this.state.formations[mode] = this.state.formations[mode].map((e, i) => e.troop ? { ...e, troop: type === 'mixed' ? (['sword', 'spear', 'bow'] as const)[i % 3] : type } : e); });
        this.save();
    }
    private syncWeapons(): void {
        this.state.equipped = {};
        HERO_IDS.forEach(h => { if (this.state.loadouts[h]?.weapon) this.state.equipped[h] = this.state.loadouts[h]!.weapon; });
    }
    equip(hero: HeroId, equipmentId: string): boolean {
        const item = this.state.inventory.find(i => i.id === equipmentId);
        if (!getHero(hero) || this.state.owned.indexOf(hero) < 0 || !item || !canWear(hero, item)) return false;
        const slot = slotOf(item);
        HERO_IDS.forEach(id => { if (this.state.loadouts[id]?.[slot] === equipmentId) delete this.state.loadouts[id]![slot]; });
        const loadout = this.state.loadouts[hero] || (this.state.loadouts[hero] = {});
        loadout[slot] = equipmentId; this.syncWeapons(); this.save(); return true;
    }
    unequip(hero: HeroId, slot: EquipmentSlot = 'weapon'): boolean {
        if (!getHero(hero) || !this.state.loadouts[hero]?.[slot]) return false;
        delete this.state.loadouts[hero]![slot]; this.syncWeapons(); this.save(); return true;
    }
    equipBest(hero: HeroId, slot: EquipmentSlot = 'weapon'): boolean {
        const available = this.state.inventory.filter(item => slotOf(item) === slot && canWear(hero, item)
            && !HERO_IDS.some(id => id !== hero && SLOT_ORDER.map(slot => this.state.loadouts[id]?.[slot]).indexOf(item.id) >= 0));
        available.sort((a, b) => equipmentScore(b) - equipmentScore(a) || a.id.localeCompare(b.id));
        return available.length > 0 ? this.equip(hero, available[0].id) : false;
    }
    recycleEquipment(id: string): string | null {
        const item = this.state.inventory.find(i => i.id === id);
        if (!item) return '装备不存在';
        if (item.exclusive) return '专属武器保留，不可分解';
        if (HERO_IDS.some(h => SLOT_ORDER.map(slot => this.state.loadouts[h]?.[slot]).indexOf(id) >= 0)) return '请先卸下装备';
        this.state.inventory = this.state.inventory.filter(i => i.id !== id); this.state.coins += Math.max(10, Math.floor(equipmentScore(item) / 10)); this.save(); return null;
    }
    getEquipmentBonuses(): Record<string, CombatBonus> {
        const result: Record<string, CombatBonus> = {};
        this.state.owned.forEach(hero => {
            const items = SLOT_ORDER.map(slot => this.state.loadouts[hero]?.[slot]).map(id => this.state.inventory.find(i => i.id === id)!).filter(Boolean);
            const stars = this.state.stars[hero] || 1;
            if (!items.length && stars === 1) return;
            const bonus: CombatBonus = { attack: 0, defense: 0, maxHp: 0 };
            items.forEach(item => {
                const stats = equipmentStats(item);
                bonus.attack += stats.attack; bonus.defense += stats.defense; bonus.maxHp += stats.maxHp;
                if (item.exclusive) bonus.signature = item.exclusive;
                if (item.rune === 'shield') bonus.openingShield = Math.max(bonus.openingShield || 0, item.stamped ? .22 : .12);
                if (item.rune === 'attack') bonus.openingAttack = Math.max(bonus.openingAttack || 0, item.stamped ? .22 : .12);
            });
            if (stars > 1) bonus.stars = stars;
            result[hero] = bonus;
        });
        return result;
    }
    redeemSignature(hero: HeroId): string | null {
        if (!getHero(hero) || this.state.owned.indexOf(hero) < 0) return '先获得对应武将';
        const item = signatureFor(hero);
        if (this.state.inventory.some(i => i.id === item.id) || this.state.chapter.reserve?.id === item.id) return '已拥有该专武，请检查背包或战图寄存';
        if (this.state.inventory.length >= this.inventoryCapacity) return '背包已满，请先分解闲置装备';
        if (this.state.points < SIGNATURE_COST) return `脑勋不足，需要${SIGNATURE_COST}`;
        this.state.points -= SIGNATURE_COST; this.state.inventory.push(item); this.save(); return null;
    }
    starUp(hero: HeroId): string | null {
        if (!getHero(hero) || this.state.owned.indexOf(hero) < 0) return '请先获得武将';
        const star = this.state.stars[hero] || 1;
        if (star >= MAX_STARS) return '已达6星';
        const cost = STAR_COSTS[star - 1]; const own = this.state.fragments[hero] || 0;
        if (own + this.state.souls < cost) return `需要${cost}碎片（专属碎片优先，不足用通用脑力）`;
        const paid = Math.min(own, cost); this.state.fragments[hero] = own - paid; this.state.souls -= cost - paid;
        this.state.stars[hero] = star + 1; this.save(); return null;
    }
    get experienceStage(): number {
        let highest = this.state.highestCleared;
        CHAPTER_MAPS.forEach((map, i) => {
            const flags = this.state.chapter.clears[map.id] || 0;
            if (flags) highest = Math.max(highest, 3 * i + (flags & 4 ? 3 : flags & 2 ? 2 : 1));
        });
        return highest;
    }

    experiencePreview(): { amount: number; minutes: number; remainingMinutes: number; rate: number } {
        this.refreshDay();
        const stage = this.experienceStage;
        const ms = stage ? Math.min(XP_DAILY_MS, Math.max(0, this.now() - this.state.xpAt), XP_DAILY_MS - this.state.daily.xpUsedMs) : 0;
        const amount = Math.floor((ms * (240 + stage * 7) + this.state.xpRemainder) / 1200000);
        return { amount: stage ? amount : 0, minutes: Math.floor(ms / 60000), remainingMinutes: Math.ceil((XP_DAILY_MS - this.state.daily.xpUsedMs) / 60000), rate: xpPerMinute(stage) };
    }

    claimExperience(): number {
        if (!this.experienceStage || this.now() < this.state.xpAt) return 0;
        const amount = this.accrueExperience();
        this.save();
        return amount;
    }

    private accrueExperience(): number {
        this.refreshDay();
        const now = this.now();
        const stage = this.experienceStage;
        if (!stage || now < this.state.xpAt) return 0;
        const ms = Math.min(XP_DAILY_MS, now - this.state.xpAt, XP_DAILY_MS - this.state.daily.xpUsedMs);
        const numerator = ms * (240 + stage * 7) + this.state.xpRemainder;
        const amount = Math.floor(numerator / 1200000);
        this.state.xpRemainder = numerator % 1200000;
        this.state.xpAt = now;
        this.state.daily.xpUsedMs += ms;
        this.state.experience += amount;
        return amount;
    }

    growthAdvice(): string {
        if (!this.experienceStage) return '通关主线或战图后，开启挂机经验';
        if (this.experiencePreview().amount > 0) return '可领取挂机经验，再点成长提升全队等级';
        if (this.state.experience >= this.experienceCost && this.state.coins >= this.upgradeCost) return '经验已够，提升全队后重新挑战';
        const party = this.state.formation;
        if (party.some(h => SLOT_ORDER.some(slot => !this.state.loadouts[h]?.[slot]))) return '有武将装备槽空着，穿戴战甲与兵符能帮助破关';
        if (party.some(h => (this.state.fragments[h] || 0) + this.state.souls >= (STAR_COSTS[(this.state.stars[h] || 1) - 1] || Infinity))) return '有武将可以升星，前往武将页提升';
        return this.state.daily.xpUsedMs >= XP_DAILY_MS ? '今日经验已满4小时，挑战副本攒脑勋，明日再突破' : '暂遇瓶颈：换阵型/治疗将，或等待挂机经验';
    }
    trialEnergyFor(stage:number):Record<string,number>{return this.state.trialEnergy?.stage===stage?cleanEnergy(this.state.trialEnergy.heroes):{};}
    clearTrialEnergy():void{if(this.state.trialEnergy){this.state.trialEnergy=null;this.save();}}
    mainlineEnergyFor(stage:number):Record<string,number>{return this.state.mainlineEnergy?.stage===stage?cleanEnergy(this.state.mainlineEnergy.heroes):{};}
    clearMainlineEnergy():void{if(this.state.mainlineEnergy){this.state.mainlineEnergy=null;this.save();}}
    settleVictory(battleId: string, stage: number,energy?:Record<string,number>): Settlement {
        if (!battleId || !Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) throw new Error('奖励结算参数无效');
        if (this.state.settled.indexOf(battleId) >= 0) return { granted: false, coins: 0, saved: this.storageAvailable };
        this.claimExperience();
        const first = this.state.firstCleared.indexOf(stage) < 0;
        const heroes = first ? HERO_CATALOG.filter(h => h.storyStage === stage && this.state.owned.indexOf(h.id) < 0).map(h => h.id) : [];
        const daibi = first ? 10 + (stage % 5 === 0 ? 50 : 0) : 0;
        const item = createEquipment(stage, battleId);
        const equipment = this.state.inventory.length < this.inventoryCapacity ? item : undefined;
        const convertedCoins = equipment ? 0 : 15 + stage * 5;
        const coins = 80 + stage * 20 + convertedCoins;
        if (this.state.highestCleared === 0) this.state.idleAt = this.now();
        if (this.experienceStage === 0) this.state.xpAt = this.now();
        this.state.coins += coins; this.state.daibi += daibi;
        this.state.highestCleared = Math.max(this.state.highestCleared, stage);
        if(energy&&stage===this.state.highestCleared&&stage<MAX_STAGE)this.state.mainlineEnergy={stage:stage+1,heroes:cleanEnergy(energy)};
        this.state.settled = [...this.state.settled, battleId].slice(-128);
        if (equipment) this.state.inventory.push(equipment);
        if (first) this.state.firstCleared.push(stage);
        this.state.owned.push(...heroes);
        return { granted: true, coins, saved: this.save(), equipment, convertedCoins, daibi, heroes };
    }
    idlePreview(): number {
        if (!this.state.highestCleared) return 0;
        const elapsed = Math.min(DAY_MS, Math.max(0, this.now() - this.state.idleAt));
        return Math.floor((elapsed * IDLE_DAILY_DAIBI + this.state.idleRemainder) / DAY_MS);
    }
    claimIdle(): number {
        const now = this.now();
        if (!this.state.highestCleared || now < this.state.idleAt) return 0;
        const numerator = Math.min(DAY_MS, now - this.state.idleAt) * IDLE_DAILY_DAIBI + this.state.idleRemainder;
        const amount = Math.floor(numerator / DAY_MS);
        this.state.idleAt = now; this.state.idleRemainder = numerator % DAY_MS; this.state.daibi += amount;
        this.save(); return amount;
    }
    recruit(count: 1 | 10): RecruitResult[] {
        if (count !== 1 && count !== 10) throw new Error('只支持单抽或十连');
        if (this.state.daibi < DRAW_COST * count) throw new Error('呆币不足');
        const owned = [...this.state.owned];
        let pity = this.state.pity; let coins = 0;
        const results: RecruitResult[] = [];
        for (let i = 0; i < count; i += 1) {
            const roll = this.random(); const choice = this.random();
            if (![roll, choice].every(n => Number.isFinite(n) && n >= 0 && n < 1)) throw new Error('招募随机源无效');
            let tier = pity >= DIVINE_PITY - 1 ? 4 : roll < 0.6 ? 1 : roll < 0.9 ? 2 : roll < 0.99 ? 3 : 4;
            const tenGuarantee = tier === 1 && count === 10 && i === 9 && results.every(r => getHero(r.hero)!.tier === 1);
            const guaranteed = pity >= DIVINE_PITY - 1 || tenGuarantee;
            if (tenGuarantee) tier = 2;
            const pool = HERO_CATALOG.filter(h => h.tier === tier);
            const hero = pool[Math.floor(choice * pool.length)].id;
            pity = tier === 4 ? 0 : pity + 1;
            const duplicate = owned.indexOf(hero) >= 0;
            const converted = duplicate ? [200, 500, 2000, 6000][tier - 1] : 0;
            if (!duplicate) owned.push(hero);
            coins += converted;
            results.push({ hero, duplicate, coins: converted, fragments: duplicate ? 20 : 0, guaranteed });
        }
        this.state.daibi -= DRAW_COST * count; this.state.coins += coins; this.state.owned = owned;
        results.forEach(r => { if (r.duplicate) this.state.fragments[r.hero] = (this.state.fragments[r.hero] || 0) + r.fragments; });
        this.state.pity = pity; this.state.drawCount += count; this.save(); return results;
    }
    exchange(hero: HeroId): string | null {
        const h = getHero(hero);
        if (!h || (h.tier !== 3 && h.tier !== 4)) return '仅可兑换名将或神将';
        if (this.state.owned.indexOf(hero) >= 0) return '已拥有这名武将，不重复扣积分';
        const cost = EXCHANGE_COST[h.tier];
        if (this.state.points < cost) return `脑勋不足，需要${cost}`;
        this.state.points -= cost; this.state.owned.push(hero); this.save(); return null;
    }
    private restoreChapter(data?: ChapterProgress): void {
        if (!data) return;
        const chapter = this.state.chapter;
        if (this.state.formations.main.some(entry => entry.spot === data.protagonistSpot)) chapter.protagonistSpot = data.protagonistSpot;
        for (const { id } of CHAPTER_MAPS) {
            const flags = data.clears?.[id];
            if (nonnegative(flags, 7)) chapter.clears[id] = flags;
        }
        for (const id of ['officer', 'spear'] as const) {
            const value = data.pity?.[id];
            if (nonnegative(value, TARGETS[id].guarantee - 1)) chapter.pity[id] = value;
        }
        chapter.materials = [0, 1, 2].map(i => nonnegative(data.materials?.[i]) ? data.materials[i] : 0) as ChapterProgress['materials'];
        if (Number.isSafeInteger(data.lastWorkshopWin)) chapter.lastWorkshopWin = data.lastWorkshopWin;
        if (data.reserve && validEquipment(data.reserve)) chapter.reserve = { ...data.reserve };
        if (this.validChapterRun(data.pending)) chapter.pending = copy(data.pending);
        const offline = data.offline;
        if (offline && nonnegative(offline.since) && this.validChapterRun(offline.run) && this.canFarmOffline(offline.run)) {
            chapter.offline = copy(offline);
        }
    }

    private validChapterRun(run?: ChapterRun | null): run is ChapterRun {
        return !!run && typeof run.id === 'string' && run.id.length > 0
            && (run.map === 'workshop' || CHAPTER_MAPS.some(map => map.id === run.map))
            && Number.isInteger(run.difficulty) && DIFFICULTIES[run.difficulty] !== undefined
            && !chapterLock(this.state.chapter.clears, run.map, run.difficulty)
            && (run.map === 'workshop' ? run.difficulty === 0 && Number.isSafeInteger(run.window) : run.window === undefined)
            && (run.map === 'rift' ? run.difficulty === 2 && (run.target === 'officer' || run.target === 'spear') : run.target === undefined)
            && nonnegative(run.level, MAX_LEVEL) && run.level > 0 && nonnegative(run.seed, 0xffffffff)
            && Number.isFinite(run.roll) && run.roll >= 0 && run.roll < 1
            && Array.isArray(run.layout) && !validateFormation(run.layout, this.state.owned, 'main')
            && run.layout.some(entry => entry.spot === run.protagonistSpot)
            && validBonuses(run.equipment);
    }

    get protagonistSpot(): string {
        return chapterProtagonistSpot(this.state.formations.main, this.state.chapter.protagonistSpot);
    }

    setProtagonistSpot(spot: string): string | null {
        if (!this.state.formations.main.some(entry => entry.spot === spot)) return '请点选一个已排好的阵位';
        const before = this.state.chapter.protagonistSpot;
        this.state.chapter.protagonistSpot = spot;
        if (this.save()) return null;
        this.state.chapter.protagonistSpot = before;
        return '存档失败，请重试';
    }

    get currentWorkshop() { return workshopRotation(chinaDay(this.now())); }

    startChapter(map: ChapterRun['map'], difficulty: Difficulty, target?: LootTarget): ChapterRun {
        const chapter = this.state.chapter;
        if (chapter.pending) throw new Error('先继续或放弃未完战图');
        if (chapter.reserve) throw new Error('先从战图领取寄存装备');
        if (!DIFFICULTIES[difficulty] || (map !== 'workshop' && !CHAPTER_MAPS.some(m => m.id === map))) throw new Error('战图无效');
        if (map === 'rift' && (difficulty !== 2 || (target !== 'officer' && target !== 'spear'))) throw new Error('请选择奇阵追求目标');
        if (map === 'workshop' && difficulty !== 0) throw new Error('军器换班使用固定难度');
        const error = chapterLock(chapter.clears, map, difficulty) || validateFormation(this.state.formations.main, this.state.owned, 'main');
        if (error) throw new Error(error);
        const serial = this.state.runSerial + 1;
        const run = this.chapterRun(map, difficulty, serial, target);
        chapter.pending = run;
        this.state.runSerial = serial;
        if (!this.save()) {
            chapter.pending = null;
            this.state.runSerial -= 1;
            throw new Error('存档不可用，请重试');
        }
        return copy(run);
    }

    private chapterRun(map: ChapterRun['map'], difficulty: Difficulty, serial: number, target?: LootTarget): ChapterRun {
        const roll = this.random();
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('掉落随机源无效，请重试');
        return {
            id: `chapter-${this.now()}-${serial}`, map, difficulty, target: map === 'rift' ? target : undefined,
            window: map === 'workshop' ? this.currentWorkshop.window : undefined, level: this.state.heroLevel,
            layout: copy(this.state.formations.main), protagonistSpot: this.protagonistSpot, equipment: this.getEquipmentBonuses(), seed: (20261105 + serial) >>> 0, roll,
        };
    }

    private canFarmOffline(run: Pick<ChapterRun, 'map' | 'difficulty'>): boolean {
        const { map, difficulty } = run;
        return map !== 'rift' && map !== 'workshop' && difficulty < 2
            && !!((this.state.chapter.clears[map] || 0) & (1 << difficulty));
    }

    get chapterOffline() {
        const job = this.state.chapter.offline;
        if (!job) return null;
        const ms = Math.min(XP_DAILY_MS, Math.max(0, this.now() - job.since));
        return { ...copy(job), ready: Math.floor(ms / OFFLINE_CHAPTER_RUN_MS) };
    }

    assignChapterOffline(map: ChapterRun['map'], difficulty: Difficulty): string | null {
        if (!this.canFarmOffline({ map, difficulty })) return '先通关该图的探路或硬仗';
        const chapter = this.state.chapter;
        if (chapter.pending || chapter.reserve) return '请先结束挑战或领取寄存';
        const now = this.now();
        const previous = this.chapterOffline;
        if (previous && (previous.ready || now < previous.since)) return '请先结算原挂机任务';
        const run = this.chapterRun(map, difficulty, this.state.runSerial + 1);
        const battle = new BattleEngine(createChapterOptions(run));
        while (battle.status === 'fighting') battle.advance(.25);
        if (battle.status !== 'won') return '当前行装与阵容未通过自动试战';
        chapter.offline = { run, since: now };
        if (this.save()) return null;
        chapter.offline = previous && { run: previous.run, since: previous.since };
        return '存档失败，请重试';
    }

    claimChapterOffline(): ChapterSettlement {
        const job = this.chapterOffline;
        const chapter = this.state.chapter;
        if (chapter.pending || chapter.reserve) return { saved: true, lines: ['请先结束挑战或领取寄存'] };
        if (!job?.ready) return { saved: true, lines: ['未攒满一场，挂机每20分钟一场'] };
        // Prepare all rolls before touching inventory or time. Failed saves restore the full batch.
        const now = this.now();
        const runs = Array.from({ length: job.ready }, (_, i) => {
            const serial = this.state.runSerial + 1 + i;
            const roll = this.random();
            if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('掉落随机源无效，请重试');
            return { ...job.run, id: `chapter-idle-${now}-${serial}`, seed: (20261105 + serial) >>> 0, roll };
        });
        const before = copy(this.state);
        const totals = new Map<string, number>();
        let finished = 0;
        for (const run of runs) {
            this.applyChapterWin(run).forEach(line => totals.set(line, (totals.get(line) || 0) + 1));
            finished += 1;
            if (chapter.reserve) break;
        }
        this.state.runSerial += finished;
        chapter.offline!.since = Math.max(job.since, now - XP_DAILY_MS) + finished * OFFLINE_CHAPTER_RUN_MS;
        if (!this.save()) {
            this.state = before;
            return { saved: false, lines: ['挂机结算未保存，请重试'] };
        }
        return { saved: true, lines: [`已结算 ${finished} 场 · 剩余 ${job.ready - finished} 场`,
            ...Array.from(totals, ([line, count]) => count > 1 ? `${line}（${count}场）` : line)] };
    }

    abandonChapter(): boolean {
        const run = this.state.chapter.pending;
        this.state.chapter.pending = null;
        if (this.save()) return true;
        this.state.chapter.pending = run;
        return false;
    }

    settleChapter(id: string, won: boolean): ChapterSettlement {
        const chapter = this.state.chapter;
        const run = chapter.pending;
        if (!run || run.id !== id) return { saved: true, lines: ['本场已结算或已放弃'] };
        const before = copy(this.state);
        const lines = won ? this.applyChapterWin(run) : [];
        chapter.pending = null;
        if (this.save()) return { saved: true, lines };
        this.state = before;
        return { saved: false, lines: ['存档失败，战利品未结算'] };
    }

    private applyChapterWin(run: ChapterRun): string[] {
        const chapter = this.state.chapter;
        const id = run.id;
        const lines: string[] = [];
        let item: Equipment | undefined;
        const difficulty = run.difficulty;
        const grantHero = (hero: HeroId) => {
            if (this.state.owned.indexOf(hero) >= 0) {
                this.state.fragments[hero] = (this.state.fragments[hero] || 0) + 20;
                lines.push(`${getHero(hero)!.name}专属碎片 ×20`);
            } else {
                this.state.owned.push(hero);
                lines.push(`${getHero(hero)!.name}将帖 · 已入队`);
            }
        };
        const coins = [120, 180, 280][difficulty];
        this.state.coins += coins;
        lines.push(`脑铢 +${coins}`);
        if (run.map === 'workshop') {
            const window = run.window!;
            const index = workshopIndex(window);
            const first = chapter.lastWorkshopWin === null || window > chapter.lastWorkshopWin;
            const amount = first ? 9 : 3;
            chapter.materials[index] += amount;
            if (first) chapter.lastWorkshopWin = window;
            lines.push(`${WORKSHOPS[index].material} +${amount}${first ? ' · 换班首胜' : ''}`);
        } else {
            const flags = chapter.clears[run.map] || 0;
            if (!(flags & (1 << difficulty))) {
                if (this.experienceStage) this.accrueExperience();
                else this.state.xpAt = this.now();
                chapter.clears[run.map] = flags | (1 << difficulty);
            }
            if (run.map === 'road' && difficulty === 0 && !(flags & 1)) {
                grantHero('zhangfei');
                item = { id: `loot-${id}`, name: '长坂行军枪', rarity: 1, stage: 1, chapter: true,
                    slot: 'weapon', appearance: 'spear', attack: 32, defense: 4, maxHp: 100 };
            }
            if (run.map === 'ridge' && run.roll < MAP_DROP_RATES.equipment[difficulty]) {
                item = { id: `loot-${id}`, name: ['挑石枪', '翻坡长枪', '铁脊破阵枪'][difficulty],
                    rarity: ([1, 2, 3] as const)[difficulty], stage: 1, chapter: true, slot: 'weapon', appearance: 'spear',
                    attack: 34 + difficulty * 16, defense: 5 + difficulty * 5, maxHp: 120 + difficulty * 60 };
            }
            if (run.map === 'bridge' && run.roll < MAP_DROP_RATES.officer[difficulty]) grantHero('liaohua');
            if (run.map === 'siege') {
                const material = ((run.seed % 3) as WorkshopIndex);
                const amount = difficulty + 1;
                chapter.materials[material] += amount;
                lines.push(`${WORKSHOPS[material].material} +${amount}`);
            }
            if (run.map === 'rift') {
                const target = run.target!;
                const selected = TARGETS[target];
                const wonSinceDrop = chapter.pity[target] + 1;
                if (wonSinceDrop >= selected.guarantee || run.roll < selected.rate) {
                    chapter.pity[target] = 0;
                    if (target === 'officer') grantHero('zhaoyun');
                    else if (this.state.inventory.some(gear => gear.id === 'signature-zhaoyun')) {
                        chapter.materials[2] += 8;
                        lines.push('已有龙胆亮银枪 · 压阵印 +8');
                    } else item = { ...signatureFor('zhaoyun'), chapter: true };
                    lines.push(wonSinceDrop >= selected.guarantee ? '定向保底达成' : '定向战利品已掉落');
                } else {
                    chapter.pity[target] = wonSinceDrop;
                    lines.push(`${selected.name}保底 ${wonSinceDrop}/${selected.guarantee}`);
                }
            }
        }
        if (item) {
            if (this.state.inventory.length < this.inventoryCapacity) {
                this.state.inventory.push(item);
                lines.push(item.name);
            } else {
                chapter.reserve = item;
                lines.push(`${item.name}已寄存 · 背包满`);
            }
        }
        return lines;
    }

    claimChapterReserve(): string | null {
        const chapter = this.state.chapter;
        const item = chapter.reserve;
        if (!item) return '没有寄存装备';
        if (this.state.inventory.length >= this.inventoryCapacity) return '背包已满，请先腾出一格';
        const duplicate = this.state.inventory.some(gear => gear.id === item.id);
        if (duplicate) chapter.materials[2] += 8;
        else this.state.inventory.push(item);
        chapter.reserve = null;
        if (this.save()) return duplicate ? '已有这件专武，寄存奖励转为压阵印 ×8' : null;
        if (duplicate) chapter.materials[2] -= 8;
        else this.state.inventory.pop();
        chapter.reserve = item;
        return '存档失败，请重试';
    }

    tuneEquipment(id: string, action: WorkshopIndex, rune?: EquipmentRune): string | null {
        const chapter = this.state.chapter;
        const item = this.state.inventory.find(gear => gear.id === id);
        const work = WORKSHOPS[action];
        if (!item || !work) return '请选择装备';
        if (action === 0 && (item.polish || 0) >= 3) return '已打磨至上限 +3';
        if (action === 1 && (rune !== 'shield' && rune !== 'attack')) return '请选择护身或抢攻';
        if (action === 1 && item.rune === rune) return '已刻上这个阵纹';
        if (action === 2 && (item.rarity !== 3 || !item.rune || item.stamped)) return '镇军装备或专武须先刻阵，每件只可压阵一次';
        if (chapter.materials[action] < work.cost) return `${work.material}不足，需要${work.cost}份`;
        const before = { ...item };
        chapter.materials[action] -= work.cost;
        if (action === 0) item.polish = (item.polish || 0) + 1;
        if (action === 1) item.rune = rune;
        if (action === 2) item.stamped = true;
        if (this.save()) return null;
        this.state.inventory[this.state.inventory.indexOf(item)] = before;
        chapter.materials[action] += work.cost;
        return '存档失败，请重试';
    }

    startActivity(mode: ActivityMode, choices: BoatChoice[] = [],bossOverride?:WorldBossId): ActivityRun {
        this.refreshDay();
        if(bossOverride&&(!this.developerMode||mode!=='boss'||!WORLD_BOSSES.some(b=>b.id===bossOverride)))throw new Error('轮值预览仅限本地开发档');
        if (this.state.pending) throw new Error('有未完成的副本，请先继续或放弃');
        if (['city', 'boss', 'trial', 'boat'].indexOf(mode) < 0) throw new Error('副本无效');
        if (mode === 'city' && this.state.daily.cityUsed >= 3) throw new Error('今天的3次攻城演练已用完');
        if (mode === 'boat' && this.state.daily.boatUsed >= 2) throw new Error('今天的2次借宝已用完');
        if (mode === 'trial' && this.state.trialHighest >= 99) throw new Error('三将闯关已全部通关');
        if (mode === 'boat' && (choices.length !== 3 || choices.some(c => ['wind', 'guard', 'repair'].indexOf(c) < 0))) throw new Error('请先完成3次航线筹谋');
        const party = mode === 'trial' ? this.state.trialParty : this.state.formation;
        const layout = this.state.formations[mode === 'trial' ? 'trial' : 'main'];
        const error = validateFormation(layout, this.state.owned, mode === 'trial' ? 'trial' : 'main');
        if (error) throw new Error(error);
        if (mode === 'city') this.state.daily.cityUsed += 1;
        if (mode === 'boat') this.state.daily.boatUsed += 1;
        if (mode === 'boss' && this.state.daily.bossDaibi === 0) this.state.daily.bossBand = expeditionBand(this.state.highestCleared);
        this.state.runSerial += 1;
        const run: ActivityRun = { id: `run-${this.now()}-${this.state.runSerial}`, mode, day: this.state.daily.day,
            worldBoss:mode==='boss'?bossOverride||this.currentBoss.boss.id:undefined,bossWeek:mode==='boss'?this.currentBoss.week:undefined,
            stage: mode === 'trial' ? this.state.trialHighest + 1 : 1, party: [...party], level: this.state.heroLevel,
            band: mode === 'boss' ? this.state.daily.bossBand : expeditionBand(this.state.highestCleared), equipment: this.getEquipmentBonuses(), choices: [...choices], troopType: this.state.troopType,
            defenders: [...this.state.defense], wallHeroes: [...this.state.wallHeroes], layout: copy(layout), defenseLayout: copy(this.state.formations.defense) };
        this.state.pending = run; this.save(); return copy(run);
    }
    switchActivity(mode:ActivityMode,choices:BoatChoice[]=[]):ActivityRun {
        // Caller confirms the abandoned attempt. Failed destination validation restores the entire snapshot.
        const before=copy(this.state);this.state.pending=null;
        try{return this.startActivity(mode,choices);}catch(error){this.state=before;throw error;}
    }
    abandonActivity(): void { this.state.pending = null; this.save(); }
    settleActivity(id: string, won: boolean, damage = 0,energy?:Record<string,number>): { granted: boolean; daibi: number; points: number; saved: boolean } {
        if (!nonnegative(damage)) throw new Error('伤害记录无效');
        this.refreshDay();
        const run = this.state.pending;
        if (!run || run.id !== id) return { granted: false, daibi: 0, points: 0, saved: this.storageAvailable };
        let daibi = 0; let points = 0;
        if(run.mode==='trial'&&!won)this.state.trialEnergy=null;
        if (run.mode === 'city') { daibi = won ? 180 : 90; points = won ? 12 : 8; }
        if (run.mode === 'boat') { daibi = won ? 260 : 130; points = won ? 12 : 8; }
        if (run.mode === 'trial' && won && run.stage === this.state.trialHighest + 1) {
            daibi = 100; points = 10; this.state.trialHighest = run.stage;
            this.state.trialEnergy=energy&&run.stage<99?{stage:run.stage+1,heroes:cleanEnergy(energy)}:null;
        }
        if (run.mode === 'boss') {
            const d = this.state.daily;
            d.bossBest = Math.max(d.bossBest, damage);
            const grade = bossGrade(d.bossBest / stageFactor((d.bossBand - 1) * 50 + 1));
            const totalDaibi = 160 + grade * 40; const totalPoints = 20 + Math.floor(grade * 2.5);
            daibi = Math.max(0, totalDaibi - d.bossDaibi); points = Math.max(0, totalPoints - d.bossPoints);
            d.bossDaibi = totalDaibi; d.bossPoints = totalPoints;
        }
        const d = this.state.daily;
        const newMode = d.modes.indexOf(run.mode) < 0;
        if (newMode) d.modes.push(run.mode);
        if (!d.bonusClaimed && ['city','boss','boat'].every(mode => d.modes.indexOf(mode) >= 0)) { points += 10; d.bonusClaimed = true; }
        points = Math.min(points, Math.max(0, MEDAL_DAILY_CAP - d.medalEarned)); d.medalEarned += points;
        const soulReward = run.mode === 'boss' ? newMode ? 6 : 0 : won ? run.mode === 'boat' ? 3 : 2 : 1;
        const souls = Math.min(soulReward, 20 - d.soulEarned); d.soulEarned += souls; this.state.souls += souls;
        this.state.pending = null; this.state.daibi += daibi; this.state.points += points;
        return { granted: true, daibi, points, saved: this.save() };
    }
    private save(): boolean {
        try { this.storage.setItem(KEY, JSON.stringify(this.state)); this.storageAvailable = true; }
        catch (_) { this.storageAvailable = false; }
        return this.storageAvailable;
    }
}
