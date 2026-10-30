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
}

export interface Settlement {
    granted: boolean;
    coins: number;
    saved: boolean;
}

const KEY = 'dainaosanguo.demo.progress.v1';
const emptyProgress = (): Progress => ({ version: 1, coins: 0, highestCleared: 0, heroLevel: 1, settled: [] });

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
                        this.state = { ...data, heroLevel: level, settled: data.settled.slice(-128) };
                    }
                }
            }
        } catch (_) { this.storageAvailable = false; }
    }

    get progress(): Progress { return { ...this.state, settled: [...this.state.settled] }; }
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

    settleVictory(battleId: string, stage: number): Settlement {
        if (!battleId || !Number.isInteger(stage) || stage < 1 || stage > 99) throw new Error('奖励结算参数无效');
        if (this.state.settled.indexOf(battleId) >= 0) return { granted: false, coins: 0, saved: this.storageAvailable };
        const coins = 80 + stage * 20;
        this.state = {
            version: 1,
            coins: this.state.coins + coins,
            highestCleared: Math.max(this.state.highestCleared, stage),
            heroLevel: this.state.heroLevel,
            settled: [...this.state.settled, battleId].slice(-128),
        };
        return { granted: true, coins, saved: this.save() };
    }

    private save(): boolean {
        try {
            this.storage.setItem(KEY, JSON.stringify(this.state));
            this.storageAvailable = true;
        } catch (_) { this.storageAvailable = false; }
        return this.storageAvailable;
    }
}
