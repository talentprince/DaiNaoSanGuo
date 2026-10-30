export type Team = 'hero' | 'enemy';
export type BattleStatus = 'fighting' | 'won' | 'lost' | 'scored';

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
    kind?: 'hero' | 'soldier' | 'boss' | 'wall';
    weapon?: 'sword' | 'spear' | 'bow' | 'fan';
    onWall?: boolean;
    tactic?: 'cleave' | 'pierce' | 'volley' | 'guard' | 'heal';
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
    scoreMode?: boolean;
    enemyRegen?: number;
    heroDrain?: number;
    energyRate?: number;
    riftGoal?: number;
    bossWave?: UnitConfig[];
    approachTime?: number;
}

export interface BattleEvent {
    type: 'attack' | 'damage' | 'heal' | 'death' | 'wave' | 'skill' | 'finish' | 'boss' | 'wall-break';
    source?: string;
    target?: string;
    amount?: number;
    critical?: boolean;
    wave?: number;
    status?: BattleStatus;
    targets?: string[];
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
    damageDealt = 0;
    riftEnergy = 0;
    bossActive = false;
    approachRemaining = 0;
    private accumulator = 0;
    private waveDelay = 0;
    private randomState: number;
    private events: BattleEvent[] = [];
    private readonly waves: UnitConfig[][];
    private readonly timeLimit: number;
    private readonly scoreMode: boolean;
    private readonly enemyRegen: number;
    private readonly heroDrain: number;
    private readonly energyRate: number;
    readonly riftGoal: number;
    private readonly bossWave: UnitConfig[];
    private readonly approachTime: number;

    constructor(options: BattleOptions) {
        if (!options.heroes.length || !options.waves.length || options.waves.some(w => !w.length)) {
            throw new Error('战斗需要我方单位及非空敌人波次');
        }
        const configs = [...options.heroes, ...options.waves.reduce((all, wave) => all.concat(wave), [] as UnitConfig[]), ...(options.bossWave || [])];
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
        this.scoreMode = !!options.scoreMode;
        this.enemyRegen = options.enemyRegen || 0;
        this.heroDrain = options.heroDrain || 0;
        this.energyRate = options.energyRate === undefined ? 7 : options.energyRate;
        if (![this.enemyRegen, this.heroDrain, this.energyRate].every(n => Number.isFinite(n) && n >= 0)) throw new Error('战斗特性无效');
        this.riftGoal = options.riftGoal || 0;
        this.bossWave = (options.bossWave || []).map(u => ({ ...u }));
        this.approachTime = options.approachTime || 0;
        if (!Number.isFinite(this.riftGoal) || this.riftGoal < 0 || (this.riftGoal && !this.bossWave.length)
            || !Number.isFinite(this.approachTime) || this.approachTime < 0) throw new Error('秘境或进场配置无效');
        this.randomState = (options.seed >>> 0) || 1;
        this.waves = options.waves.map(wave => wave.map(unit => ({ ...unit })));
        this.heroes = options.heroes.map((unit, index) => this.createUnit(unit, 'hero', index));
        this.spawnWave();
    }

    get waveCount(): number { return this.riftGoal ? this.waveIndex + (this.bossActive ? 1 : 2) : this.waves.length; }
    get wallAlive(): boolean { return this.enemies.some(u => u.kind === 'wall' && u.hp > 0); }
    get transitioning(): boolean { return this.waveDelay > 0; }
    get canCastSkill(): boolean {
        return this.status === 'fighting' && !this.paused && !this.transitioning && this.approachRemaining <= 0
            && this.energy >= 100 && this.heroes.some(u => u.hp > 0 && (u.tactic || u.id === 'guanyu'))
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
        const caster = this.heroes.find(unit => unit.hp > 0 && (unit.tactic || unit.id === 'guanyu'))!;
        const tactic = caster.tactic || 'cleave';
        this.energy = 0;
        this.skillCount += 1;
        const targets = tactic === 'pierce' ? [selectTarget(this.enemies)!] : this.enemies.filter(unit => unit.hp > 0);
        this.events.push({ type: 'skill', source: caster.id, targets: targets.map(unit => unit.id) });
        const multiplier = tactic === 'pierce' ? 7.5 : tactic === 'volley' ? 2.1 : tactic === 'guard' ? 1.8 : tactic === 'heal' ? 1.2 : 2.6;
        targets.forEach(unit => this.damage(caster, unit, Math.floor(caster.attack * multiplier), false));
        if (tactic === 'guard') this.heal(caster, caster, 0.1);
        const liubei = this.heroes.find(unit => (unit.tactic === 'heal' || unit.id === 'liubei') && unit.hp > 0);
        if (liubei) {
            this.heroes.filter(unit => unit.hp > 0).forEach(unit => {
                this.heal(liubei, unit, 0.12);
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
        const wave = this.riftGoal ? this.bossActive ? this.bossWave : this.waves[this.waveIndex % this.waves.length] : this.waves[this.waveIndex];
        this.enemies = wave.map((unit, index) => this.createUnit(this.riftGoal ? { ...unit, id: `enemy-rift-${this.waveIndex}-${index}` } : unit, 'enemy', index));
        this.approachRemaining = this.approachTime;
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
        if (this.elapsed + 1e-9 >= this.timeLimit) { this.finish(this.scoreMode ? 'scored' : 'lost'); return; }
        if (this.approachRemaining > 0) { this.approachRemaining = Math.max(0, this.approachRemaining - dt); return; }
        this.energy = Math.min(100, this.energy + dt * this.energyRate);
        if (this.enemyRegen) this.enemies.filter(u => u.hp > 0).forEach(u => { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * this.enemyRegen * dt); });
        if (this.heroDrain) this.heroes.filter(u => u.hp > 0).forEach(u => {
            const amount = Math.min(u.hp, u.maxHp * this.heroDrain * dt);
            u.hp -= amount;
            if (!u.hp) this.events.push({ type: 'death', target: u.id });
        });
        this.checkProgress();
        if (this.status !== 'fighting') return;
        if (this.waveDelay > 0) {
            this.waveDelay = Math.max(0, this.waveDelay - dt);
            if (this.waveDelay < 1e-8) {
                this.waveDelay = 0;
                this.waveIndex += 1;
                if (this.riftGoal && this.riftEnergy >= this.riftGoal && !this.bossActive) {
                    this.bossActive = true; this.events.push({ type: 'boss' });
                }
                this.spawnWave();
            }
            return;
        }
        if (this.autoSkill && this.canCastSkill) this.castSkill();
        if (this.status !== 'fighting' || this.transitioning || this.approachRemaining > 0) return;
        for (const unit of [...this.heroes, ...this.enemies]) {
            if (unit.hp <= 0 || unit.kind === 'wall') continue;
            unit.cooldown -= dt;
            if (unit.cooldown > 1e-8) continue;
            const target = selectTarget(unit.team === 'hero' ? this.enemies : this.heroes);
            if (!target) { this.checkProgress(); break; }
            unit.cooldown += unit.interval;
            this.events.push({ type: 'attack', source: unit.id, target: target.id });
            const critical = this.random() < 0.15;
            this.damage(unit, target, calculateDamage(unit.attack, target.defense, this.random(), critical), critical);
            this.checkProgress();
            if (this.status !== 'fighting' || this.transitioning || this.approachRemaining > 0) break;
        }
    }

    private damage(source: Unit, target: Unit, requested: number, critical: boolean): void {
        if (source.hp <= 0 || target.hp <= 0) return;
        const protection = target.onWall && this.wallAlive ? 0.4 : 1;
        const amount = Math.min(target.hp, Math.max(1, Math.floor(requested * protection)));
        target.hp -= amount;
        if (source.team === 'hero') this.damageDealt += amount;
        // The world-boss target is a scoring dummy: high damage must not shorten the 30-second attempt.
        if (this.scoreMode && target.team === 'enemy') target.hp = target.maxHp;
        this.events.push({ type: 'damage', source: source.id, target: target.id, amount, critical });
        if (target.hp === 0) {
            if (target.team === 'enemy' && this.riftGoal && !this.bossActive) this.riftEnergy = Math.min(this.riftGoal, this.riftEnergy + 10);
            this.events.push({ type: 'death', target: target.id });
            if (target.kind === 'wall') this.events.push({ type: 'wall-break', target: target.id });
            if (this.riftGoal && !this.bossActive && this.riftEnergy >= this.riftGoal) this.spawnBoss();
        }
    }

    private spawnBoss(): void {
        this.bossActive = true; this.approachRemaining = this.approachTime;
        this.bossWave.forEach((config, i) => this.enemies.push(this.createUnit({ ...config, kind: 'boss', id: `enemy-rift-boss-${this.waveIndex}-${i}` }, 'enemy', i)));
        this.events.push({ type: 'boss' });
    }

    private checkProgress(): void {
        if (this.status !== 'fighting') return;
        if (!this.heroes.some(unit => unit.hp > 0)) { if (!this.scoreMode) this.finish('lost'); return; }
        if (this.riftGoal && this.bossActive && !this.enemies.some(u => u.kind === 'boss' && u.hp > 0)) { this.finish('won'); return; }
        if (!this.enemies.some(unit => unit.hp > 0)) {
            if (this.riftGoal ? this.bossActive : this.waveIndex === this.waves.length - 1) this.finish('won');
            else if (this.waveDelay === 0) this.waveDelay = 0.9;
        }
    }

    private heal(source: Unit, target: Unit, ratio: number): void {
        if (target.hp <= 0) return;
        const amount = Math.min(target.maxHp - target.hp, Math.floor(target.maxHp * ratio));
        if (amount > 0) { target.hp += amount; this.events.push({ type: 'heal', source: source.id, target: target.id, amount }); }
    }

    private finish(status: BattleStatus): void {
        if (this.status !== 'fighting') return;
        this.status = status;
        this.events.push({ type: 'finish', status });
    }
}
