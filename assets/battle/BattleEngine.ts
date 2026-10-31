import type { SkillElement } from '../data/HeroIdentity';
export type Team = 'hero' | 'enemy';
export type BattleStatus = 'fighting' | 'won' | 'lost' | 'scored';

export type WeaponKind = 'sword' | 'spear' | 'bow' | 'fan' | 'glaive' | 'serpent' | 'halberd' | 'dual' | 'axe' | 'staff' | 'ribbon' | 'qin';
export interface CombatBonus { attack: number; defense: number; maxHp: number; stars?: number; signature?: string; }
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
    weapon?: WeaponKind;
    skillName?: string;
    visualId?: string;
    heroTier?: number;
    element?: SkillElement;
    bondIds?: string[];
    bondEnergy?: number;
    bondHealing?: number;
    bondSkill?: number;
    stars?: number;
    signature?: string;
    formationSpot?: string;
    onWall?: boolean;
    tactic?: 'cleave' | 'pierce' | 'volley' | 'guard' | 'heal';
}

export interface Unit extends UnitConfig {
    team: Team;
    hp: number;
    cooldown: number;
    energy: number;
    shield: number;
    shieldRemaining: number;
    attackBuff: number;
    attackBuffRemaining: number;
    healGlowRemaining: number;
    slow: number; slowRemaining: number;
    burnRemaining: number; burnPower: number; burnTick: number; burnSource: string;
    poisonRemaining: number; poisonPower: number; poisonTick: number; poisonSource: string;
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
    type: 'attack' | 'damage' | 'heal' | 'death' | 'wave' | 'skill' | 'finish' | 'boss' | 'wall-break' | 'buff' | 'shield' | 'debuff';
    source?: string;
    target?: string;
    amount?: number;
    critical?: boolean;
    wave?: number;
    status?: BattleStatus;
    targets?: string[];
    buff?: 'shield' | 'attack' | 'slow' | 'burn' | 'poison';
}

export function skillTargetLimit(unit: Pick<UnitConfig, 'heroTier' | 'kind'>): number {
    if (unit.kind === 'boss' || unit.heroTier === 4) return Infinity;
    return unit.heroTier === 3 ? 3 : unit.heroTier === 2 ? 2 : 1;
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
    private get primaryHero(): Unit | undefined { return this.heroes.find(u => u.kind !== 'soldier' && u.hp > 0) || this.heroes.find(u => u.kind !== 'soldier'); }
    // Compatibility alias for legacy callers. Production UI reads each unit's own energy.
    get energy(): number { return this.primaryHero?.energy || 0; }
    set energy(value: number) { if (this.primaryHero) this.primaryHero.energy = value; }
    get canCastSkill(): boolean { return !!this.primaryHero && this.canCastUnit(this.primaryHero); }
    canCastHeroSkill(id: string): boolean { const unit = this.heroes.find(u => u.id === id); return !!unit && this.canCastUnit(unit); }
    private canCastUnit(unit: Unit): boolean {
        return this.status === 'fighting' && !this.paused && !this.transitioning && this.approachRemaining <= 0
            && unit.hp > 0 && (unit.tactic !== 'heal' || (unit.heroTier || 1) >= 2) && unit.kind !== 'soldier' && unit.kind !== 'wall' && unit.energy >= 100
            && (unit.team === 'hero' ? this.enemies : this.heroes).some(u => u.hp > 0);
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

    castSkill(id?: string): boolean {
        const caster = id ? [...this.heroes, ...this.enemies].find(u => u.id === id) : this.primaryHero;
        if (!caster || !this.canCastUnit(caster)) return false;
        const tactic = caster.tactic || 'cleave';
        const enemies = caster.team === 'hero' ? this.enemies : this.heroes;
        const friends = caster.team === 'hero' ? this.heroes : this.enemies;
        caster.energy = 0;
        if (caster.team === 'hero') this.skillCount += 1;
        const tier = caster.kind === 'boss' ? 4 : caster.heroTier || 1;
        const livingFriends = friends.filter(u => u.hp > 0 && u.kind !== 'wall');
        const candidates = enemies.filter(u => u.hp > 0).sort((a, b) => a.priority - b.priority || a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id));
        const targets = tactic === 'heal' ? tier === 2 ? livingFriends.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id)).slice(0, 1) : livingFriends
            : candidates.slice(0, skillTargetLimit(caster));
        this.events.push({ type: 'skill', source: caster.id, targets: targets.map(unit => unit.id) });
        if (tactic === 'heal') {
            const ratio = tier === 2 ? 0.22 : tier === 3 ? 0.12 : caster.visualId === 'huatuo' ? 0.20 : 0.16;
            targets.forEach(unit => this.heal(caster, unit, ratio * (caster.signature ? 1.25 : 1) * (1 + (caster.bondHealing || 0))));
            if (tier === 4) targets.forEach(unit => this.applyBuff(caster, unit, caster.visualId === 'simayi' ? 'attack' : 'shield'));
        } else {
            const multiplier = tactic === 'pierce' ? 2.8 : tactic === 'volley' ? 2.1 : tactic === 'guard' ? 1.5 : 2.6;
            targets.forEach(unit => this.damage(caster, unit, Math.floor(caster.attack * (1 + caster.attackBuff) * multiplier * (caster.signature && (tactic === 'cleave' || tactic === 'pierce') ? 1.25 : 1) * ((caster.stars || 1) >= 6 ? 1.2 : 1) * (1 + (caster.bondSkill || 0))), false));
            targets.filter(u => u.hp > 0).forEach(u => this.applyDebuff(caster,u));
            if (tactic === 'guard' && (tier >= 2 || caster.signature)) (tier === 4 ? livingFriends : [caster]).forEach(unit => this.applyBuff(caster, unit, 'shield'));
        }
        this.checkProgress(); return true;
    }

    drainEvents(): BattleEvent[] {
        const result = this.events;
        this.events = [];
        return result;
    }

    private createUnit(config: UnitConfig, team: Team, index: number): Unit {
        return { ...config, team, hp: config.maxHp, cooldown: 0.35 + index * 0.13,
            shield: 0, shieldRemaining: 0, attackBuff: 0, attackBuffRemaining: 0, healGlowRemaining: 0, slow: 0, slowRemaining: 0, burnRemaining: 0, burnPower: 0, burnTick: 0, burnSource: '', poisonRemaining: 0, poisonPower: 0, poisonTick: 0, poisonSource: '',
            energy: config.kind === 'soldier' || config.kind === 'wall' ? 0 : team === 'hero' ? Math.max(0, 45 - index * 11) : config.kind === 'boss' || config.kind === 'hero' ? Math.max(0, 25 - index * 4) : 0 };
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
        [...this.heroes, ...this.enemies].forEach(unit => {
            unit.healGlowRemaining = Math.max(0,unit.healGlowRemaining-dt);
            unit.slowRemaining = Math.max(0,unit.slowRemaining-dt);if(!unit.slowRemaining)unit.slow=0;
            for(const kind of ['burn','poison'] as const){
                if(unit[`${kind}Remaining`] > 0 && unit.hp > 0){
                    unit[`${kind}Remaining`] = Math.max(0,unit[`${kind}Remaining`]-dt);unit[`${kind}Tick`] += dt;
                    if(unit[`${kind}Tick`] + 1e-8 >= .5){unit[`${kind}Tick`] -= .5;const source=[...this.heroes,...this.enemies].find(u=>u.id===unit[`${kind}Source`]);if(source)this.damage(source,unit,Math.max(1,Math.floor(unit[`${kind}Power`]*.5)),false,true);}
                    if(!unit[`${kind}Remaining`]){unit[`${kind}Power`]=0;unit[`${kind}Tick`]=0;unit[`${kind}Source`]='';}
                }
            }
            unit.shieldRemaining = Math.max(0, unit.shieldRemaining - dt);
            unit.attackBuffRemaining = Math.max(0, unit.attackBuffRemaining - dt);
            if (!unit.shieldRemaining) unit.shield = 0;
            if (!unit.attackBuffRemaining) unit.attackBuff = 0;
        });
        this.elapsed += dt;
        if (this.elapsed + 1e-9 >= this.timeLimit) { this.finish(this.scoreMode ? 'scored' : 'lost'); return; }
        if (this.approachRemaining > 0) { this.approachRemaining = Math.max(0, this.approachRemaining - dt); return; }
        [...this.heroes, ...this.enemies].forEach(unit => {
            const eligible = unit.kind !== 'soldier' && unit.kind !== 'wall' && (unit.team === 'hero' || unit.kind === 'boss' || unit.kind === 'hero');
            if (eligible && unit.hp > 0) unit.energy = Math.min(100, unit.energy + dt * this.energyRate * ((unit.stars || 1) >= 3 ? 1.1 : 1) * (1 + (unit.bondEnergy || 0)));
        });
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
        for (const unit of [...this.heroes, ...this.enemies]) {
            if ((unit.team === 'hero' ? this.autoSkill : unit.kind === 'boss' || unit.kind === 'hero') && this.canCastUnit(unit)) this.castSkill(unit.id);
            if (this.status !== 'fighting' || this.approachRemaining > 0) break;
        }
        if (this.status !== 'fighting' || this.transitioning || this.approachRemaining > 0) return;
        for (const unit of [...this.heroes, ...this.enemies]) {
            if (unit.hp <= 0 || unit.kind === 'wall') continue;
            unit.cooldown -= dt * (1 - unit.slow);
            if (unit.cooldown > 1e-8) continue;
            const target = selectTarget(unit.team === 'hero' ? this.enemies : this.heroes);
            if (!target) { this.checkProgress(); break; }
            unit.cooldown += unit.interval;
            this.events.push({ type: 'attack', source: unit.id, target: target.id });
            const critical = this.random() < 0.15;
            this.damage(unit, target, calculateDamage(unit.attack * (1 + unit.attackBuff), target.defense, this.random(), critical), critical);
            this.checkProgress();
            if (this.status !== 'fighting' || this.transitioning || this.approachRemaining > 0) break;
        }
    }

    private damage(source: Unit, target: Unit, requested: number, critical: boolean, ongoing=false): void {
        if ((!ongoing && source.hp <= 0) || target.hp <= 0) return;
        const protection = target.onWall && this.wallAlive ? 0.4 : 1;
        const incoming = Math.max(1, Math.floor(requested * protection));
        const absorbed = Math.min(target.shield, incoming);
        target.shield -= absorbed;
        if (absorbed > 0) this.events.push({ type: 'shield', source: source.id, target: target.id, amount: absorbed });
        const amount = Math.min(target.hp, incoming - absorbed);
        target.hp -= amount;
        if (source.team === 'hero') this.damageDealt += amount;
        // The world-boss target is a scoring dummy: high damage must not shorten the 30-second attempt.
        if (this.scoreMode && target.team === 'enemy') target.hp = target.maxHp;
        if (amount > 0) this.events.push({ type: 'damage', source: source.id, target: target.id, amount, critical });
        if (target.hp === 0) {
            if (target.team === 'enemy' && this.riftGoal && !this.bossActive) this.riftEnergy = Math.min(this.riftGoal, this.riftEnergy + 10);
            this.events.push({ type: 'death', target: target.id });
            if (target.kind === 'wall') this.events.push({ type: 'wall-break', target: target.id });
            if (this.riftGoal && !this.bossActive && this.riftEnergy >= this.riftGoal) this.spawnBoss();
        }
    }

    private spawnBoss(): void {
        this.bossActive = true; this.approachRemaining = this.approachTime;
        // Transition to a clean boss encounter once the rift meter is full.
        this.enemies = this.bossWave.map((config, i) => this.createUnit({ ...config, kind: 'boss', id: `enemy-rift-boss-${this.waveIndex}-${i}` }, 'enemy', i));
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

    private applyBuff(source: Unit, target: Unit, buff: 'shield' | 'attack'): void {
        if (buff === 'shield') { target.shield = Math.max(target.shield, Math.floor(target.maxHp * 0.12 * (source.signature && source.tactic === 'guard' ? 1.5 : 1))); target.shieldRemaining = 6; }
        else { target.attackBuff = 0.2; target.attackBuffRemaining = 6; }
        this.events.push({ type: 'buff', source: source.id, target: target.id, buff, amount: buff === 'shield' ? target.shield : 20 });
    }

    private applyDebuff(source:Unit,target:Unit):void {
        const kind=source.element==='blizzard'?'slow':source.element==='fire'?'burn':source.element==='poison'?'poison':null;
        if(!kind)return;
        if(kind==='slow'){target.slow=.25;target.slowRemaining=4;}
        else {target[`${kind}Remaining`]=4;target[`${kind}Power`]=Math.max(target[`${kind}Power`],source.attack*(kind==='burn'?.12:.08));target[`${kind}Source`]=source.id;}
        this.events.push({type:'debuff',source:source.id,target:target.id,buff:kind});
    }

    private heal(source: Unit, target: Unit, ratio: number): void {
        if (target.hp <= 0) return;
        target.healGlowRemaining = 3.6;
        const amount = Math.min(target.maxHp - target.hp, Math.floor(target.maxHp * ratio * (target.poisonRemaining > 0 ? .75 : 1)));
        if (amount > 0) { target.hp += amount; this.events.push({ type: 'heal', source: source.id, target: target.id, amount }); }
    }

    private finish(status: BattleStatus): void {
        if (this.status !== 'fighting') return;
        this.status = status;
        this.events.push({ type: 'finish', status });
    }
}
