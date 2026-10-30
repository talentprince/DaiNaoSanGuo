export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface Progress {
    version: 1;
    coins: number;
    highestCleared: number;
    heroLevel: number;
    settled: string[];
    inventory: Equipment[];
    equipped: Partial<Record<HeroId, string>>;
}

export const HERO_IDS = ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'liubei'] as const;
export type HeroId = typeof HERO_IDS[number];
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

export interface Settlement {
    granted: boolean;
    coins: number;
    saved: boolean;
    equipment?: Equipment;
    convertedCoins?: number;
}

const KEY = 'dainaosanguo.demo.progress.v1';
const emptyProgress = (): Progress => ({ version: 1, coins: 0, highestCleared: 0, heroLevel: 1,
    settled: [], inventory: [], equipped: {} });

/** Demo 本地存档；不承担服务端奖励验证。 */
export class ProgressStore {
    private state: Progress = emptyProgress();
    private storage: StorageAdapter;
    storageAvailable = true;

    constructor(storage: StorageAdapter) {
        this.storage = storage;
        try {
            const raw = storage.getItem(KEY);
            if (raw) {
                const data = JSON.parse(raw) as Progress;
                if (data.version === 1 && Number.isSafeInteger(data.coins) && data.coins >= 0
                    && Number.isInteger(data.highestCleared) && data.highestCleared >= 0 && data.highestCleared <= 99
                    && Array.isArray(data.settled) && data.settled.every(id => typeof id === 'string')) {
                    const level = data.heroLevel === undefined ? 1 : data.heroLevel;
                    if (Number.isInteger(level) && level >= 1 && level <= 99) {
                        const inventory: Equipment[] = [];
                        if (Array.isArray(data.inventory)) data.inventory.forEach(item => {
                            if (inventory.length < 40 && validEquipment(item) && !inventory.some(old => old.id === item.id)) {
                                inventory.push({ ...item });
                            }
                        });
                        const equipped: Partial<Record<HeroId, string>> = {};
                        HERO_IDS.forEach(hero => {
                            const id = data.equipped && data.equipped[hero];
                            if (id && inventory.some(item => item.id === id)
                                && !HERO_IDS.some(other => equipped[other] === id)) equipped[hero] = id;
                        });
                        this.state = { version: 1, coins: data.coins, highestCleared: data.highestCleared,
                            heroLevel: level, settled: data.settled.slice(-128), inventory, equipped };
                    }
                }
            }
        } catch (_) { this.storageAvailable = false; }
    }

    get progress(): Progress { return { ...this.state, settled: [...this.state.settled],
        inventory: this.state.inventory.map(item => ({ ...item })), equipped: { ...this.state.equipped } }; }
    get upgradeCost(): number { return 80 + this.state.heroLevel * 40; }

    upgradeTeam(): { upgraded: boolean; cost: number; level: number; saved: boolean } {
        const cost = this.upgradeCost;
        if (this.state.heroLevel >= 99 || this.state.coins < cost) {
            return { upgraded: false, cost, level: this.state.heroLevel, saved: this.storageAvailable };
        }
        this.state = { ...this.state, coins: this.state.coins - cost, heroLevel: this.state.heroLevel + 1 };
        const saved = this.save();
        return { upgraded: true, cost, level: this.state.heroLevel, saved };
    }

    equip(hero: HeroId, equipmentId: string): boolean {
        if ((HERO_IDS as readonly string[]).indexOf(hero) < 0 || !this.state.inventory.some(item => item.id === equipmentId)) return false;
        const equipped = { ...this.state.equipped };
        HERO_IDS.forEach(id => { if (equipped[id] === equipmentId) delete equipped[id]; });
        equipped[hero] = equipmentId;
        this.state = { ...this.state, equipped };
        this.save();
        return true;
    }

    unequip(hero: HeroId): boolean {
        if ((HERO_IDS as readonly string[]).indexOf(hero) < 0 || !this.state.equipped[hero]) return false;
        const equipped = { ...this.state.equipped };
        delete equipped[hero];
        this.state = { ...this.state, equipped };
        this.save();
        return true;
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
        const item = createEquipment(stage, battleId);
        const equipment = this.state.inventory.length < 40 ? item : undefined;
        const convertedCoins = equipment ? 0 : 15 + stage * 5;
        const coins = 80 + stage * 20 + convertedCoins;
        this.state = {
            version: 1,
            coins: this.state.coins + coins,
            highestCleared: Math.max(this.state.highestCleared, stage),
            heroLevel: this.state.heroLevel,
            settled: [...this.state.settled, battleId].slice(-128),
            inventory: equipment ? [...this.state.inventory, equipment] : [...this.state.inventory],
            equipped: { ...this.state.equipped },
        };
        return { granted: true, coins, saved: this.save(), equipment, convertedCoins };
    }

    private save(): boolean {
        try {
            this.storage.setItem(KEY, JSON.stringify(this.state));
            this.storageAvailable = true;
        } catch (_) { this.storageAvailable = false; }
        return this.storageAvailable;
    }
}
