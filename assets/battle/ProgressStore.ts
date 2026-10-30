import { DRAW_COST, DIVINE_PITY, EXCHANGE_COST, getHero, HERO_CATALOG, HERO_IDS, LEGACY_PARTY, STARTER_PARTY, validateParty } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import type { SoldierType } from '../data/BattleConfig';
import type { ActivityMode, ActivityRun, BoatChoice } from '../data/ActivityConfig';
export { HERO_IDS } from '../data/HeroCatalog';
export type { HeroId } from '../data/HeroCatalog';

export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface DailyState { day: number; cityUsed: number; boatUsed: number; bossBest: number; bossDaibi: number; bossPoints: number; }
export interface Progress {
    version: 1; coins: number; highestCleared: number; heroLevel: number; settled: string[];
    inventory: Equipment[]; equipped: Partial<Record<HeroId, string>>;
    troopType: SoldierType; wallHeroes: HeroId[];
    metaVersion: 2; daibi: number; points: number; owned: HeroId[]; formation: HeroId[];
    trialParty: HeroId[]; defense: HeroId[]; firstCleared: number[]; trialHighest: number;
    pity: number; drawCount: number; idleAt: number; idleRemainder: number;
    daily: DailyState; runSerial: number; pending: ActivityRun | null;
}
export interface RecruitResult { hero: HeroId; duplicate: boolean; coins: number; guaranteed: boolean; }
export interface Settlement { granted: boolean; coins: number; saved: boolean; equipment?: Equipment; convertedCoins?: number; daibi?: number; heroes?: HeroId[]; }
const KEY = 'dainaosanguo.demo.progress.v1';
export const DAY_MS = 86400000;
export const IDLE_DAILY_DAIBI = 1000;
export function chinaDay(now: number): number { return Math.floor((now + 8 * 3600000) / DAY_MS); }
const dailyState = (day: number): DailyState => ({ day, cityUsed: 0, boatUsed: 0, bossBest: 0, bossDaibi: 0, bossPoints: 0 });
const nonnegative = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const emptyProgress = (now: number): Progress => ({ version: 1, coins: 0, highestCleared: 0, heroLevel: 1,
    settled: [], inventory: [], equipped: {}, troopType: 'mixed', wallHeroes: STARTER_PARTY.slice(0, 2), metaVersion: 2, daibi: 0, points: 0, owned: [...STARTER_PARTY], formation: [...STARTER_PARTY],
    trialParty: STARTER_PARTY.slice(0, 3), defense: [...STARTER_PARTY], firstCleared: [], trialHighest: 0,
    pity: 0, drawCount: 0, idleAt: now, idleRemainder: 0, daily: dailyState(chinaDay(now)), runSerial: 0, pending: null });

export interface Equipment {
    id: string;
    name: string;
    rarity: 1 | 2 | 3;
    stage: number;
    attack: number;
    defense: number;
    maxHp: number;
}

export const RARITY_NAMES = ['普通', '精良', '史诗'];
export const RARITY_COLORS = ['#B9C9D8', '#78B5E8', '#C39CEE'];

export function equipmentScore(item: Equipment): number {
    return item.attack * 5 + item.defense * 4 + item.maxHp;
}

export function createEquipment(stage: number, battleId: string): Equipment {
    if (!Number.isInteger(stage) || stage < 1 || stage > 99 || !battleId) throw new Error('装备掉落参数无效');
    let hash = 2166136261;
    for (let i = 0; i < battleId.length; i += 1) hash = Math.imul(hash ^ battleId.charCodeAt(i), 16777619) >>> 0;
    const roll = hash % 100;
    const rarity: 1 | 2 | 3 = roll < 60 ? 1 : roll < 92 ? 2 : 3;
    const factor = rarity === 1 ? 1 : rarity === 2 ? 1.6 : 2.5;
    return { id: `loot-${battleId}`, name: ['青锋剑', '百炼刀', '龙纹战刃'][rarity - 1], rarity, stage,
        attack: Math.round((6 + stage * 2) * factor), defense: Math.round((2 + stage) * factor),
        maxHp: Math.round((25 + stage * 8) * factor) };
}

function validEquipment(item: Equipment): boolean {
    return !!item && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string'
        && [1, 2, 3].indexOf(item.rarity) >= 0 && Number.isInteger(item.stage) && item.stage >= 1 && item.stage <= 99
        && [item.attack, item.defense, item.maxHp].every(value => Number.isSafeInteger(value) && value >= 0);
}


/** Local prototype only; real balances, clocks, RNG and multiplayer settlements need the server. */
export class ProgressStore {
    private state: Progress;
    private storage: StorageAdapter;
    private clock: () => number;
    private random: () => number;
    storageAvailable = true;

    constructor(storage: StorageAdapter, clock: () => number = Date.now, random: () => number = Math.random) {
        this.storage = storage; this.clock = clock; this.random = random;
        const now = this.now();
        this.state = emptyProgress(now);
        try {
            const raw = storage.getItem(KEY);
            if (raw) {
                const data = JSON.parse(raw) as Progress;
                const level = data.heroLevel === undefined ? 1 : data.heroLevel;
                if (data.version !== 1 || !nonnegative(data.coins) || !nonnegative(data.highestCleared, 99)
                    || !Array.isArray(data.settled) || !data.settled.every(id => typeof id === 'string')
                    || !Number.isInteger(level) || level < 1 || level > 99) return;
                const inventory: Equipment[] = [];
                if (Array.isArray(data.inventory)) data.inventory.forEach(item => {
                    if (inventory.length < 40 && validEquipment(item) && !inventory.some(old => old.id === item.id)) inventory.push({ ...item });
                });
                const legacy = data.metaVersion !== 2;
                const owned = legacy ? [...STARTER_PARTY, ...LEGACY_PARTY] : Array.isArray(data.owned)
                    ? HERO_IDS.filter(id => data.owned.indexOf(id) >= 0 || STARTER_PARTY.indexOf(id) >= 0) : [...STARTER_PARTY];
                HERO_CATALOG.forEach(hero => { if (hero.storyStage && hero.storyStage <= data.highestCleared && owned.indexOf(hero.id) < 0) owned.push(hero.id); });
                const equipped: Partial<Record<HeroId, string>> = {};
                HERO_IDS.forEach(hero => {
                    const id = data.equipped && data.equipped[hero];
                    if (id && owned.indexOf(hero) >= 0 && inventory.some(item => item.id === id)
                        && !HERO_IDS.some(other => equipped[other] === id)) equipped[hero] = id;
                });
                const party = (ids: HeroId[] | undefined, mode: 'main' | 'trial' | 'defense', fallback: HeroId[]) =>
                    Array.isArray(ids) && !validateParty(ids, owned, mode) ? [...ids] : [...fallback];
                const d = data.daily;
                const daily = d && nonnegative(d.day) && nonnegative(d.cityUsed, 3) && nonnegative(d.boatUsed, 2)
                    && nonnegative(d.bossBest) && nonnegative(d.bossDaibi, 300) && nonnegative(d.bossPoints, 120) ? { ...d } : dailyState(chinaDay(now));
                this.state = { ...emptyProgress(now), coins: data.coins, highestCleared: data.highestCleared, heroLevel: level,
                    settled: data.settled.slice(-128), inventory, equipped, owned,
                    formation: party(data.formation, 'main', legacy ? LEGACY_PARTY : STARTER_PARTY),
                    trialParty: party(data.trialParty, 'trial', STARTER_PARTY.slice(0, 3)),
                    defense: party(data.defense, 'defense', legacy ? LEGACY_PARTY : STARTER_PARTY),
                    daibi: nonnegative(data.daibi) ? data.daibi : 0, points: nonnegative(data.points) ? data.points : 0,
                    pity: nonnegative(data.pity, DIVINE_PITY - 1) ? data.pity : 0,
                    drawCount: nonnegative(data.drawCount) ? data.drawCount : 0,
                    firstCleared: legacy ? Array.from({ length: data.highestCleared }, (_, i) => i + 1)
                        : Array.isArray(data.firstCleared) ? [...new Set(data.firstCleared.filter(n => Number.isInteger(n) && n > 0 && n <= 99))] : [],
                    trialHighest: nonnegative(data.trialHighest, 99) ? data.trialHighest : 0,
                    idleAt: nonnegative(data.idleAt) ? data.idleAt : now, idleRemainder: nonnegative(data.idleRemainder, DAY_MS - 1) ? data.idleRemainder : 0,
                    daily, runSerial: nonnegative(data.runSerial) ? data.runSerial : 0, pending: null };
                const w = data.wallHeroes;
                this.state.wallHeroes = Array.isArray(w) && w.length <= 2 && new Set(w).size === w.length && w.every(id => this.state.defense.indexOf(id) >= 0) ? [...w] : this.state.defense.slice(0, 2);
                this.state.troopType = ['mixed', 'sword', 'spear', 'bow'].indexOf(data.troopType) >= 0 ? data.troopType : 'mixed';
                if (this.validRun(data.pending)) this.state.pending = copy(data.pending);
                this.refreshDay();
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
            && Number.isInteger(run.level) && run.level > 0 && run.level <= 99 && Array.isArray(run.party)
            && !validateParty(run.party, this.state.owned, run.mode === 'trial' ? 'trial' : 'main')
            && !!run.equipment && typeof run.equipment === 'object' && Object.keys(run.equipment).every(id => !!getHero(id)
                && [run.equipment[id].attack, run.equipment[id].defense, run.equipment[id].maxHp].every(n => nonnegative(n)))
            && (run.troopType === undefined || ['mixed', 'sword', 'spear', 'bow'].indexOf(run.troopType) >= 0)
            && (run.defenders === undefined || (Array.isArray(run.defenders) && !validateParty(run.defenders, this.state.owned)))
            && (run.wallHeroes === undefined || (Array.isArray(run.wallHeroes) && run.wallHeroes.length <= 2 && new Set(run.wallHeroes).size === run.wallHeroes.length && run.wallHeroes.every(id => (run.defenders || []).indexOf(id) >= 0)))
            && Array.isArray(run.choices) && run.choices.every(c => ['wind', 'guard', 'repair'].indexOf(c) >= 0)
            && (run.mode !== 'boat' || run.choices.length === 3);
    }
    get progress(): Progress { this.refreshDay(); return copy(this.state); }
    get upgradeCost(): number { return 80 + this.state.heroLevel * 40; }
    upgradeTeam(): { upgraded: boolean; cost: number; level: number; saved: boolean } {
        const cost = this.upgradeCost;
        if (this.state.heroLevel >= 99 || this.state.coins < cost) return { upgraded: false, cost, level: this.state.heroLevel, saved: this.storageAvailable };
        this.state.coins -= cost; this.state.heroLevel += 1;
        return { upgraded: true, cost, level: this.state.heroLevel, saved: this.save() };
    }
    setParty(ids: HeroId[], mode: 'main' | 'trial' | 'defense'): string | null {
        const error = validateParty(ids, this.state.owned, mode);
        if (error) return error;
        if (mode === 'main') this.state.formation = [...ids];
        else if (mode === 'trial') this.state.trialParty = [...ids];
        else { this.state.defense = [...ids]; this.state.wallHeroes = this.state.wallHeroes.filter(id => ids.indexOf(id) >= 0); }
        this.save(); return null;
    }
    setWallHeroes(ids: HeroId[]): string | null {
        if (ids.length > 2 || new Set(ids).size !== ids.length || ids.some(id => this.state.defense.indexOf(id) < 0)) return '最多选2名守城阵容中的武将上城墙';
        this.state.wallHeroes = [...ids]; this.save(); return null;
    }
    setTroopType(type: SoldierType): void {
        if (['mixed', 'sword', 'spear', 'bow'].indexOf(type) < 0) throw new Error('兵种无效');
        this.state.troopType = type; this.save();
    }
    equip(hero: HeroId, equipmentId: string): boolean {
        if (!getHero(hero) || this.state.owned.indexOf(hero) < 0 || !this.state.inventory.some(item => item.id === equipmentId)) return false;
        HERO_IDS.forEach(id => { if (this.state.equipped[id] === equipmentId) delete this.state.equipped[id]; });
        this.state.equipped[hero] = equipmentId; this.save(); return true;
    }
    unequip(hero: HeroId): boolean {
        if (!getHero(hero) || !this.state.equipped[hero]) return false;
        delete this.state.equipped[hero]; this.save(); return true;
    }
    equipBest(hero: HeroId): boolean {
        const available = this.state.inventory.filter(item => !HERO_IDS.some(id => id !== hero && this.state.equipped[id] === item.id));
        available.sort((a, b) => equipmentScore(b) - equipmentScore(a) || a.id.localeCompare(b.id));
        return available.length > 0 ? this.equip(hero, available[0].id) : false;
    }
    getEquipmentBonuses(): Record<string, { attack: number; defense: number; maxHp: number }> {
        const result: Record<string, { attack: number; defense: number; maxHp: number }> = {};
        HERO_IDS.forEach(hero => {
            const item = this.state.inventory.find(equipment => equipment.id === this.state.equipped[hero]);
            if (item) result[hero] = { attack: item.attack, defense: item.defense, maxHp: item.maxHp };
        });
        return result;
    }
    settleVictory(battleId: string, stage: number): Settlement {
        if (!battleId || !Number.isInteger(stage) || stage < 1 || stage > 99) throw new Error('奖励结算参数无效');
        if (this.state.settled.indexOf(battleId) >= 0) return { granted: false, coins: 0, saved: this.storageAvailable };
        const first = this.state.firstCleared.indexOf(stage) < 0;
        const heroes = first ? HERO_CATALOG.filter(h => h.storyStage === stage && this.state.owned.indexOf(h.id) < 0).map(h => h.id) : [];
        const daibi = first ? 10 + (stage % 5 === 0 ? 50 : 0) : 0;
        const item = createEquipment(stage, battleId);
        const equipment = this.state.inventory.length < 40 ? item : undefined;
        const convertedCoins = equipment ? 0 : 15 + stage * 5;
        const coins = 80 + stage * 20 + convertedCoins;
        if (this.state.highestCleared === 0) this.state.idleAt = this.now();
        this.state.coins += coins; this.state.daibi += daibi;
        this.state.highestCleared = Math.max(this.state.highestCleared, stage);
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
            results.push({ hero, duplicate, coins: converted, guaranteed });
        }
        this.state.daibi -= DRAW_COST * count; this.state.coins += coins; this.state.owned = owned;
        this.state.pity = pity; this.state.drawCount += count; this.save(); return results;
    }
    exchange(hero: HeroId): string | null {
        const h = getHero(hero);
        if (!h || (h.tier !== 3 && h.tier !== 4)) return '仅可兑换名将或神将';
        if (this.state.owned.indexOf(hero) >= 0) return '已拥有这名武将，不重复扣积分';
        const cost = EXCHANGE_COST[h.tier];
        if (this.state.points < cost) return `军功不足，需要${cost}`;
        this.state.points -= cost; this.state.owned.push(hero); this.save(); return null;
    }
    startActivity(mode: ActivityMode, choices: BoatChoice[] = []): ActivityRun {
        this.refreshDay();
        if (this.state.pending) throw new Error('有未完成的副本，请先继续或放弃');
        if (['city', 'boss', 'trial', 'boat'].indexOf(mode) < 0) throw new Error('副本无效');
        if (mode === 'city' && this.state.daily.cityUsed >= 3) throw new Error('今天的3次攻城演练已用完');
        if (mode === 'boat' && this.state.daily.boatUsed >= 2) throw new Error('今天的2次借宝已用完');
        if (mode === 'trial' && this.state.trialHighest >= 99) throw new Error('三将闯关已全部通关');
        if (mode === 'boat' && (choices.length !== 3 || choices.some(c => ['wind', 'guard', 'repair'].indexOf(c) < 0))) throw new Error('请先完成3次航线筹谋');
        const party = mode === 'trial' ? this.state.trialParty : this.state.formation;
        const error = validateParty(party, this.state.owned, mode === 'trial' ? 'trial' : 'main');
        if (error) throw new Error(error);
        if (mode === 'city') this.state.daily.cityUsed += 1;
        if (mode === 'boat') this.state.daily.boatUsed += 1;
        this.state.runSerial += 1;
        const run: ActivityRun = { id: `run-${this.now()}-${this.state.runSerial}`, mode, day: this.state.daily.day,
            stage: mode === 'trial' ? this.state.trialHighest + 1 : 1, party: [...party], level: this.state.heroLevel,
            equipment: this.getEquipmentBonuses(), choices: [...choices], troopType: this.state.troopType,
            defenders: [...this.state.defense], wallHeroes: [...this.state.wallHeroes] };
        this.state.pending = run; this.save(); return copy(run);
    }
    abandonActivity(): void { this.state.pending = null; this.save(); }
    settleActivity(id: string, won: boolean, damage = 0): { granted: boolean; daibi: number; points: number; saved: boolean } {
        if (!nonnegative(damage)) throw new Error('伤害记录无效');
        this.refreshDay();
        const run = this.state.pending;
        if (!run || run.id !== id) return { granted: false, daibi: 0, points: 0, saved: this.storageAvailable };
        let daibi = 0; let points = 0;
        if (run.mode === 'city') { daibi = won ? 120 : 30; points = won ? 60 : 15; }
        if (run.mode === 'boat') { daibi = won ? 200 : 50; points = won ? 100 : 25; }
        if (run.mode === 'trial' && won && run.stage === this.state.trialHighest + 1) {
            daibi = 80; points = 40; this.state.trialHighest = run.stage;
        }
        if (run.mode === 'boss') {
            const d = this.state.daily;
            d.bossBest = Math.max(d.bossBest, damage);
            const grade = d.bossBest >= 50000 ? 4 : d.bossBest >= 25000 ? 3 : d.bossBest >= 10000 ? 2 : d.bossBest >= 3000 ? 1 : 0;
            const totalDaibi = 60 + grade * 60; const totalPoints = 40 + grade * 20;
            daibi = Math.max(0, totalDaibi - d.bossDaibi); points = Math.max(0, totalPoints - d.bossPoints);
            d.bossDaibi = totalDaibi; d.bossPoints = totalPoints;
        }
        this.state.pending = null; this.state.daibi += daibi; this.state.points += points;
        return { granted: true, daibi, points, saved: this.save() };
    }
    private save(): boolean {
        try { this.storage.setItem(KEY, JSON.stringify(this.state)); this.storageAvailable = true; }
        catch (_) { this.storageAvailable = false; }
        return this.storageAvailable;
    }
}
