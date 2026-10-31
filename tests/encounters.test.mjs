import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { createMainlineOptions, createHeroes, withSoldiers } from '../assets/data/BattleConfig.ts';
import { createActivityOptions } from '../assets/data/ActivityConfig.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { STARTER_PARTY } from '../assets/data/HeroCatalog.ts';

const unit = (id, changes = {}) => ({ id, name: id, role: '测试', maxHp: 1000, attack: 30,
    defense: 0, interval: 1, priority: 0, color: '#FFFFFF', ...changes });
const memory = () => { let value = null; return { getItem: () => value, setItem: (_, v) => { value = v; } }; };

test('秘境先清怪攒进度，满条后出Boss，只有Boss击败才通关', () => {
    const options = { heroes: [unit('guanyu', { attack: 10000 })], waves: [[unit('mob', { maxHp: 10, attack: 0 })]],
        bossWave: [unit('boss', { maxHp: 1000 })], riftGoal: 20, seed: 2, timeLimit: 100 };
    const e = new BattleEngine(options);
    assert.equal(e.bossActive, false); e.advance(0.4);
    assert.equal(e.riftEnergy, 10); assert.equal(e.status, 'fighting');
    let attempts = 0;
    while (!e.bossActive && attempts++ < 100) e.advance(0.05);
    assert.equal(e.riftEnergy, 20); assert.equal(e.bossActive, true); assert.equal(e.status, 'fighting');
    assert.equal(e.enemies.filter(u => u.hp > 0).length, 1); assert.equal(e.enemies.find(u => u.kind === 'boss').maxHp, 1000);
    assert.ok(e.drainEvents().some(event => event.type === 'boss'));
    e.advance(10); assert.equal(e.status, 'won');
    const fresh = new BattleEngine(options);
    assert.equal(fresh.riftEnergy, 0); assert.equal(fresh.bossActive, false);
});
test('新主线配置可以完成首关秘境；不足5武将自动补兵，怒气与秘境进度独立', () => {
    const e = new BattleEngine(createMainlineOptions(1, 42, 1, {}, STARTER_PARTY));
    e.advance(150); assert.equal(e.status, 'won'); assert.equal(e.riftEnergy, 100); assert.equal(e.bossActive, true);
    const small = createMainlineOptions(1, 42, 1, {}, ['guanhai']);
    assert.equal(small.heroes.length, 5); assert.equal(small.heroes.filter(h => h.kind === 'soldier').length, 4);
    const first = new BattleEngine(small); assert.equal(first.energy, 0); assert.equal(first.riftEnergy, 0);
});
test('接敌阶段不会隔空攻击或放技能，暂停也停止接敌计时', () => {
    const e = new BattleEngine({ heroes: [unit('guanyu')], waves: [[unit('enemy')]], seed: 1, approachTime: 1.1 });
    e.energy = 100; e.advance(0.5); assert.equal(e.castSkill(), false); assert.equal(e.enemies[0].hp, 1000);
    const remaining = e.approachRemaining; e.paused = true; e.advance(100); assert.equal(e.approachRemaining, remaining);
    e.paused = false; e.advance(1); assert.ok(e.enemies[0].hp < 1000);
});
test('城墙存活时城上守将减伤60%，破城后同一攻击恢复正常伤害', () => {
    const e = new BattleEngine({ heroes: [unit('guanyu', { heroTier: 4 })], waves: [[unit('wall', { kind: 'wall', maxHp: 10000 }),
        unit('upper', { onWall: true }), unit('ground')]], seed: 1 });
    e.energy = 100; e.castSkill();
    const [wall, upper, ground] = e.enemies;
    assert.equal(ground.hp, 922); assert.equal(upper.hp, 969);
    wall.hp = 1; e.energy = 100; e.castSkill();
    assert.equal(e.wallAlive, false); assert.equal(upper.hp, 891);
    assert.equal(e.drainEvents().filter(event => event.type === 'wall-break').length, 1);
});
test('城墙本身不发动攻击，只有城上和城下守军作战', () => {
    const e = new BattleEngine({ heroes: [unit('guanyu', { attack: 0 })], waves: [[unit('wall', { kind: 'wall', attack: 99999, maxHp: 10000 })]], seed: 1 });
    e.advance(5); assert.equal(e.heroes[0].hp, 1000);
    assert.equal(e.drainEvents().filter(event => event.type === 'attack' && event.source === 'wall').length, 0);
});
test('刀枪弓三种小兵有不同属性与武器，补位不产生重复ID或改写武将配置', () => {
    const heroes = createHeroes(['guanhai']); const before = structuredClone(heroes);
    const squad = withSoldiers(heroes, 5, 1);
    assert.deepEqual(squad.slice(1).map(u => u.weapon), ['sword', 'spear', 'bow', 'sword']);
    assert.equal(new Set(squad.map(u => u.id)).size, 5);
    assert.ok(squad[1].maxHp > squad[3].maxHp); assert.ok(squad[3].interval < squad[1].interval);
    assert.deepEqual(heroes, before);
    assert.ok(withSoldiers(heroes, 3, 1, 'bow').slice(1).every(u => u.weapon === 'bow'));
});
test('三将允许不足3武将时补小兵，但神将名将限制仍生效', () => {
    const disk = memory(); const s = new ProgressStore(disk);
    assert.equal(s.setParty(['guanhai'], 'trial'), null); s.setTroopType('bow');
    const run = s.startActivity('trial'); const options = createActivityOptions(run);
    assert.equal(options.heroes.length, 3); assert.equal(options.waves[0].length, 5);
    assert.ok(options.heroes.slice(1).every(u => u.weapon === 'bow'));
    assert.equal(new ProgressStore(disk).progress.troopType, 'bow');
});
test('城上最多2将且必须属于守城阵容，保存并快照到演练，撤下守军会移出城上', () => {
    const disk = memory(); const s = new ProgressStore(disk);
    assert.ok(s.setWallHeroes(STARTER_PARTY.slice(0, 3)));
    assert.ok(s.setWallHeroes(['lvbu']));
    assert.equal(s.setWallHeroes(['guanhai', 'caohong']), null);
    const r = s.startActivity('city'); const options = createActivityOptions(r);
    assert.equal(options.waves[0].filter(u => u.onWall).length, 2);
    assert.equal(options.waves[0].filter(u => u.kind === 'wall').length, 1);
    assert.equal(options.waves[0].length, 6);
    assert.deepEqual(new ProgressStore(disk).progress.wallHeroes, ['guanhai', 'caohong']);
    s.setParty(['songxian'], 'defense'); assert.ok(s.progress.wallHeroes.every(id => id !== 'guanhai' && id !== 'caohong'));
    assert.equal(s.progress.formations.defense.filter(e => e.spot.startsWith('tower-')).length, 2);
    assert.deepEqual(s.progress.pending.wallHeroes, ['guanhai', 'caohong']);
});

test('秘境Boss现身的同一步立即进入接敌阶段，其他队友不能继续隔空攻击', () => {
    const e = new BattleEngine({ heroes: [unit('guanyu', { attack: 999 }), unit('other', { attack: 999 })],
        waves: [[unit('m1', { maxHp: 1 }), unit('m2', { maxHp: 1 })]],
        bossWave: [unit('b', { maxHp: 10000 })], seed: 1, riftGoal: 10, approachTime: 0.5 });
    e.advance(0.6); e.drainEvents(); e.heroes.forEach(u => { u.cooldown = 0; }); e.advance(0.05);
    assert.equal(e.bossActive, true); assert.ok(e.approachRemaining > 0);
    assert.equal(e.drainEvents().filter(event => event.type === 'attack').length, 1);
});

test('技能事件携带真实命中目标供特效消费，破阵不会指向已死敌人', () => {
    const e = new BattleEngine({ heroes: [unit('caster', { tactic: 'pierce' })],
        waves: [[unit('dead'), unit('alive')]], seed: 1 });
    e.enemies[0].hp = 0; e.energy = 100; e.castSkill();
    const event = e.drainEvents().find(event => event.type === 'skill');
    assert.deepEqual(event.targets, ['alive']);
});
