export type Team = 'hero' | 'enemy';
export type BattleStatus = 'fighting' | 'won' | 'lost';

export interface UnitConfig {
    id: string;
    name: string;
    role: string;
    maxHp: number;
    attack: number;
    defense: number;
    interval: number;
    priority: number;
    color: string;
}

export interface Unit extends UnitConfig {
    team: Team;
    hp: number;
    cooldown: number;
}

export interface BattleOptions {
    heroes: UnitConfig[];
    waves: UnitConfig[][];
    seed: number;
    timeLimit?: number;
}

export interface BattleEvent {
    type: 'attack' | 'damage' | 'heal' | 'death' | 'wave' | 'skill' | 'finish';
    source?: string;
    target?: string;
    amount?: number;
    critical?: boolean;
    wave?: number;
    status?: BattleStatus;
}

export function calculateDamage(attack: number, defense: number, roll: number, critical: boolean): number {
    const base = Math.max(1, attack - defense * 0.5);
    return Math.max(1, Math.floor(base * (0.9 + Math.max(0, Math.min(1, roll)) * 0.2) * (critical ? 1.5 : 1)));
}

export function selectTarget(units: Unit[]): Unit | undefined {
    return units.filter(unit => unit.hp > 0)
        .sort((a, b) => a.priority - b.priority || a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0];
}

/** 不依赖 Cocos：固定时间步和可复现随机数，画面只消费状态与事件。 */
export class BattleEngine {
    static readonly STEP = 0.05;
    readonly heroes: Unit[];
    enemies: Unit[] = [];
    status: BattleStatus = 'fighting';
    elapsed = 0;
    waveIndex = 0;
    energy = 45;
    paused = false;
    autoSkill = true;
    skillCount = 0;
    private accumulator = 0;
    private waveDelay = 0;
    private randomState: number;
    private events: BattleEvent[] = [];
    private readonly waves: UnitConfig[][];
    private readonly timeLimit: number;

    constructor(options: BattleOptions) {
        if (!options.heroes.length || !options.waves.length || options.waves.some(w => !w.length)) {
            throw new Error('战斗需要我方单位及非空敌人波次');
        }
        const configs = [...options.heroes, ...options.waves.reduce((all, wave) => all.concat(wave), [] as UnitConfig[])];
        const ids = new Set<string>();
        configs.forEach(unit => {
            if (ids.has(unit.id)) throw new Error('单位 ID 不能重复');
            ids.add(unit.id);
            if (![unit.maxHp, unit.attack, unit.defense, unit.interval, unit.priority].every(Number.isFinite)
                || unit.maxHp <= 0 || unit.attack < 0 || unit.defense < 0 || unit.interval < BattleEngine.STEP) {
                throw new Error('单位数值无效');
            }
        });
        this.timeLimit = options.timeLimit === undefined ? 120 : options.timeLimit;
        if (!Number.isFinite(this.timeLimit) || this.timeLimit <= 0) throw new Error('时间上限无效');
        this.randomState = (options.seed >>> 0) || 1;
        this.waves = options.waves.map(wave => wave.map(unit => ({ ...unit })));
        this.heroes = options.heroes.map((unit, index) => this.createUnit(unit, 'hero', index));
        this.spawnWave();
    }

    get waveCount(): number { return this.waves.length; }
    get transitioning(): boolean { return this.waveDelay > 0; }
    get canCastSkill(): boolean {
        return this.status === 'fighting' && !this.paused && !this.transitioning
            && this.energy >= 100 && this.heroes.some(u => u.id === 'guanyu' && u.hp > 0)
            && this.enemies.some(u => u.hp > 0);
    }

    advance(seconds: number): void {
        if (!Number.isFinite(seconds) || seconds < 0) throw new Error('时间步必须是非负有限数');
        if (this.paused || this.status !== 'fighting') return;
        this.accumulator += seconds;
        while (this.accumulator + 1e-9 >= BattleEngine.STEP && this.status === 'fighting') {
            this.accumulator = Math.max(0, this.accumulator - BattleEngine.STEP);
            this.tick(BattleEngine.STEP);
        }
    }

    castSkill(): boolean {
        if (!this.canCastSkill) return false;
        const guanyu = this.heroes.find(unit => unit.id === 'guanyu')!;
        this.energy = 0;
        this.skillCount += 1;
        this.events.push({ type: 'skill', source: guanyu.id });
        this.enemies.filter(unit => unit.hp > 0).forEach(unit => {
            this.damage(guanyu, unit, Math.floor(guanyu.attack * 2.6), false);
        });
        const liubei = this.heroes.find(unit => unit.id === 'liubei' && unit.hp > 0);
        if (liubei) {
            this.heroes.filter(unit => unit.hp > 0).forEach(unit => {
                const amount = Math.min(unit.maxHp - unit.hp, Math.floor(unit.maxHp * 0.12));
                if (amount > 0) {
                    unit.hp += amount;
                    this.events.push({ type: 'heal', source: liubei.id, target: unit.id, amount });
                }
            });
        }
        this.checkProgress();
        return true;
    }

    drainEvents(): BattleEvent[] {
        const result = this.events;
        this.events = [];
        return result;
    }

    private createUnit(config: UnitConfig, team: Team, index: number): Unit {
        return { ...config, team, hp: config.maxHp, cooldown: 0.35 + index * 0.13 };
    }

    private spawnWave(): void {
        this.enemies = this.waves[this.waveIndex].map((unit, index) => this.createUnit(unit, 'enemy', index));
        this.events.push({ type: 'wave', wave: this.waveIndex + 1 });
    }

    private random(): number {
        let x = this.randomState;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.randomState = x >>> 0;
        return this.randomState / 4294967296;
    }

    private tick(dt: number): void {
        this.elapsed += dt;
        if (this.elapsed + 1e-9 >= this.timeLimit) { this.finish('lost'); return; }
        this.energy = Math.min(100, this.energy + dt * 7);
        if (this.waveDelay > 0) {
            this.waveDelay = Math.max(0, this.waveDelay - dt);
            if (this.waveDelay < 1e-8) {
                this.waveDelay = 0;
                this.waveIndex += 1;
                this.spawnWave();
            }
            return;
        }
        if (this.autoSkill && this.canCastSkill) this.castSkill();
        if (this.status !== 'fighting' || this.transitioning) return;
        for (const unit of [...this.heroes, ...this.enemies]) {
            if (unit.hp <= 0) continue;
            unit.cooldown -= dt;
            if (unit.cooldown > 1e-8) continue;
            const target = selectTarget(unit.team === 'hero' ? this.enemies : this.heroes);
            if (!target) { this.checkProgress(); break; }
            unit.cooldown += unit.interval;
            this.events.push({ type: 'attack', source: unit.id, target: target.id });
            const critical = this.random() < 0.15;
            this.damage(unit, target, calculateDamage(unit.attack, target.defense, this.random(), critical), critical);
            this.checkProgress();
            if (this.status !== 'fighting' || this.transitioning) break;
        }
    }

    private damage(source: Unit, target: Unit, requested: number, critical: boolean): void {
        if (source.hp <= 0 || target.hp <= 0) return;
        const amount = Math.min(target.hp, Math.max(1, requested));
        target.hp -= amount;
        this.events.push({ type: 'damage', source: source.id, target: target.id, amount, critical });
        if (target.hp === 0) this.events.push({ type: 'death', target: target.id });
    }

    private checkProgress(): void {
        if (this.status !== 'fighting') return;
        if (!this.heroes.some(unit => unit.hp > 0)) { this.finish('lost'); return; }
        if (!this.enemies.some(unit => unit.hp > 0)) {
            if (this.waveIndex === this.waves.length - 1) this.finish('won');
            else if (this.waveDelay === 0) this.waveDelay = 0.9;
        }
    }

    private finish(status: BattleStatus): void {
        if (this.status !== 'fighting') return;
        this.status = status;
        this.events.push({ type: 'finish', status });
    }
}
