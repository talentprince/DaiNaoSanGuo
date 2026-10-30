import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine, calculateDamage, selectTarget } from '../assets/battle/BattleEngine.ts';
import { createBattleOptions, HEROES } from '../assets/data/BattleConfig.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';

const unit = (id, changes = {}) => ({ id, name: id, role: '测试', maxHp: 100, attack: 30,
    defense: 5, interval: 1, priority: 0, color: '#FFFFFF', ...changes });
const runtime = (id, changes = {}) => ({ ...unit(id), team: 'enemy', hp: 100, cooldown: 0, ...changes });
const battle = (changes = {}) => new BattleEngine({ heroes: [unit('guanyu')],
    waves: [[unit('enemy')]], seed: 7, ...changes });

test('高防御仍至少造成 1 点伤害；暴击比同随机数普通攻击更高', () => {
    assert.equal(calculateDamage(2, 999, 0, false), 1);
    assert.ok(calculateDamage(60, 20, 0.4, true) > calculateDamage(60, 20, 0.4, false));
});

test('目标优先选择前排存活单位，死亡前排不再被选中', () => {
    const back = runtime('back', { priority: 2 });
    const dead = runtime('dead', { priority: 0, hp: 0 });
    const front = runtime('front', { priority: 1 });
    assert.equal(selectTarget([dead, back, front]), front);
    front.hp = 0;
    assert.equal(selectTarget([dead, back, front]), back);
    assert.equal(selectTarget([dead, front]), undefined);
});

test('相同种子在不同帧切分下得到相同状态和事件', () => {
    const a = new BattleEngine(createBattleOptions(1, 99));
    const b = new BattleEngine(createBattleOptions(1, 99));
    a.advance(12);
    for (let i = 0; i < 120; i++) b.advance(0.1);
    assert.deepEqual(a.heroes, b.heroes);
    assert.deepEqual(a.enemies, b.enemies);
    assert.equal(a.waveIndex, b.waveIndex);
    assert.deepEqual(a.drainEvents(), b.drainEvents());
});

test('暂停期间不累积时间、怒气、攻击或待补帧时间', () => {
    const engine = battle();
    engine.drainEvents();
    engine.paused = true;
    engine.advance(500);
    assert.equal(engine.elapsed, 0);
    assert.equal(engine.energy, 45);
    assert.equal(engine.enemies[0].hp, 100);
    assert.deepEqual(engine.drainEvents(), []);
    engine.paused = false;
    engine.advance(0.05);
    assert.equal(engine.elapsed, 0.05);
});

test('击杀后血量不为负，死亡单位不能在同一时间步反击', () => {
    const engine = battle({ heroes: [unit('guanyu', { attack: 999 })], waves: [[unit('enemy', { attack: 999 })]] });
    engine.advance(3);
    assert.equal(engine.status, 'won');
    assert.equal(engine.enemies[0].hp, 0);
    assert.equal(engine.heroes[0].hp, 100);
    assert.equal(engine.drainEvents().filter(e => e.type === 'attack' && e.source === 'enemy').length, 0);
});

test('敌方可击败我方；结束后不再推进，finish 事件只出现一次', () => {
    const engine = battle({ heroes: [unit('guanyu', { maxHp: 1, attack: 0 })], waves: [[unit('enemy', { attack: 999 })]] });
    engine.advance(5);
    assert.equal(engine.status, 'lost');
    const elapsed = engine.elapsed;
    engine.advance(500);
    assert.equal(engine.elapsed, elapsed);
    assert.equal(engine.drainEvents().filter(e => e.type === 'finish').length, 1);
    assert.deepEqual(engine.drainEvents(), []);
});

test('清空第一波后继续下一波，最后一波击败才算胜利', () => {
    const engine = battle({ heroes: [unit('guanyu', { attack: 999, maxHp: 10000 })],
        waves: [[unit('first')], [unit('second')], [unit('boss')]] });
    engine.advance(0.4);
    assert.equal(engine.status, 'fighting');
    assert.equal(engine.transitioning, true);
    engine.advance(10);
    assert.equal(engine.status, 'won');
    assert.equal(engine.waveIndex, 2);
    assert.deepEqual(engine.drainEvents().filter(e => e.type === 'wave').map(e => e.wave), [1, 2, 3]);
});

test('怒气不足、暂停、关羽死亡时技能不生效、不消耗怒气', () => {
    const engine = battle();
    assert.equal(engine.castSkill(), false);
    assert.equal(engine.energy, 45);
    engine.energy = 100;
    engine.paused = true;
    assert.equal(engine.castSkill(), false);
    assert.equal(engine.energy, 100);
    engine.paused = false;
    engine.heroes[0].hp = 0;
    assert.equal(engine.castSkill(), false);
    assert.equal(engine.energy, 100);
});

test('青龙斩伤害覆盖全部敌人，仁德回复不超上限、不复活死亡单位', () => {
    const engine = battle({ heroes: [unit('guanyu'), unit('liubei'), unit('dead')],
        waves: [[unit('a', { maxHp: 1000 }), unit('b', { maxHp: 1000 })]] });
    engine.autoSkill = false;
    engine.heroes[0].hp = 95;
    engine.heroes[1].hp = 20;
    engine.heroes[2].hp = 0;
    engine.energy = 100;
    assert.equal(engine.castSkill(), true);
    assert.ok(engine.enemies.every(e => e.hp < e.maxHp));
    assert.equal(engine.heroes[0].hp, 100);
    assert.equal(engine.heroes[1].hp, 32);
    assert.equal(engine.heroes[2].hp, 0);
    assert.equal(engine.energy, 0);
    assert.equal(engine.skillCount, 1);
    assert.equal(engine.castSkill(), false);
});

test('默认第一关能够完成三波，自动技能实际释放', () => {
    const engine = new BattleEngine(createBattleOptions(1));
    engine.advance(120);
    assert.equal(engine.status, 'won');
    assert.equal(engine.waveIndex, 2);
    assert.ok(engine.skillCount >= 1);
    assert.ok(engine.heroes.some(u => u.hp > 0));
    assert.ok(engine.elapsed < 120);
});

test('重新构造战斗清除血量、计时、技能和终局状态，原始配置不被修改', () => {
    const options = createBattleOptions(1);
    const before = structuredClone(options);
    const old = new BattleEngine(options);
    old.advance(120);
    const fresh = new BattleEngine(options);
    assert.equal(fresh.status, 'fighting');
    assert.equal(fresh.elapsed, 0);
    assert.equal(fresh.skillCount, 0);
    assert.ok(fresh.heroes.every(h => h.hp === h.maxHp));
    assert.deepEqual(options, before);
    assert.ok(HEROES.every(h => !('hp' in h)));
});

test('关卡难度随级数递增；超出 Demo 范围和无效时间被拒绝', () => {
    assert.ok(createBattleOptions(2).waves[0][0].maxHp > createBattleOptions(1).waves[0][0].maxHp);
    assert.throws(() => createBattleOptions(0));
    assert.throws(() => createBattleOptions(100));
    assert.throws(() => battle().advance(-1));
    assert.throws(() => battle().advance(NaN));
    assert.throws(() => battle({ timeLimit: Infinity }));
    assert.throws(() => battle({ waves: [[]] }));
    assert.throws(() => battle({ heroes: [unit('same')], waves: [[unit('same')]] }));
});

test('超时判负并只结束一次', () => {
    const engine = battle({ timeLimit: 0.2 });
    engine.advance(10);
    assert.equal(engine.status, 'lost');
    assert.equal(engine.drainEvents().filter(e => e.type === 'finish').length, 1);
});

function memoryStorage(initial = null) {
    let value = initial;
    return { getItem: () => value, setItem: (_, v) => { value = v; } };
}

test('奖励只结算一次；重新载入后铜钱、最高通关及去重记录保留', () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage);
    assert.deepEqual(store.settleVictory('battle-1', 1), { granted: true, coins: 100, saved: true });
    assert.equal(store.settleVictory('battle-1', 1).granted, false);
    assert.equal(store.progress.coins, 100);
    const restored = new ProgressStore(storage);
    assert.equal(restored.progress.highestCleared, 1);
    assert.equal(restored.settleVictory('battle-1', 1).granted, false);
    restored.settleVictory('battle-2', 2);
    assert.equal(restored.progress.coins, 220);
    assert.equal(restored.progress.highestCleared, 2);
});

test('损坏存档恢复默认值；存储不可用时保留本次会话奖励但不声称保存成功', () => {
    const corrupt = new ProgressStore(memoryStorage('{invalid'));
    assert.equal(corrupt.progress.coins, 0);
    const store = new ProgressStore({ getItem: () => null, setItem: () => { throw new Error('disk full'); } });
    assert.deepEqual(store.settleVictory('battle-1', 1), { granted: true, coins: 100, saved: false });
    assert.equal(store.progress.coins, 100);
    assert.equal(store.storageAvailable, false);
    assert.equal(store.settleVictory('battle-1', 1).granted, false);
});

test('进度副本不能从外部篡改，非法结算被拒绝', () => {
    const store = new ProgressStore(memoryStorage());
    const copy = store.progress;
    copy.coins = 999;
    copy.settled.push('injected');
    assert.equal(store.progress.coins, 0);
    assert.deepEqual(store.progress.settled, []);
    assert.throws(() => store.settleVictory('', 1));
    assert.throws(() => store.settleVictory('id', -1));
});

test('升级需要足额铜钱，仅扣一次费用并持久化全队等级', () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage);
    assert.equal(store.upgradeCost, 120);
    assert.equal(store.upgradeTeam().upgraded, false);
    store.settleVictory('a', 1);
    store.settleVictory('b', 1);
    assert.deepEqual(store.upgradeTeam(), { upgraded: true, cost: 120, level: 2, saved: true });
    assert.equal(store.progress.coins, 80);
    assert.equal(store.upgradeCost, 160);
    assert.equal(store.upgradeTeam().upgraded, false);
    const restored = new ProgressStore(storage);
    assert.equal(restored.progress.heroLevel, 2);
    assert.equal(restored.progress.coins, 80);
});

test('旧版 v1 存档无等级字段时迁移为 Lv.1，非法等级不污染状态', () => {
    const old = { version: 1, coins: 220, highestCleared: 2, settled: ['old'] };
    const store = new ProgressStore(memoryStorage(JSON.stringify(old)));
    assert.equal(store.progress.heroLevel, 1);
    assert.equal(store.progress.coins, 220);
    assert.equal(store.settleVictory('old', 2).granted, false);
    const invalid = new ProgressStore(memoryStorage(JSON.stringify({ ...old, heroLevel: -1 })));
    assert.equal(invalid.progress.heroLevel, 1);
    assert.equal(invalid.progress.coins, 0);
});

test('升级只影响新创建的战斗；能够靠升级突破原先失败关卡', () => {
    const original = new BattleEngine(createBattleOptions(5));
    original.advance(120);
    assert.equal(original.status, 'lost');
    const upgraded = new BattleEngine(createBattleOptions(5, 20261030, 5));
    upgraded.advance(120);
    assert.equal(upgraded.status, 'won');
    assert.equal(original.heroes[0].maxHp, HEROES[0].maxHp);
    assert.throws(() => createBattleOptions(1, 1, 0));
    assert.throws(() => createBattleOptions(1, 1, 100));
});

test('满级时不扣费，升级保存失败时仍明确返回 saved=false', () => {
    const data = { version: 1, coins: 10000, highestCleared: 2, heroLevel: 99, settled: [] };
    const full = new ProgressStore(memoryStorage(JSON.stringify(data)));
    assert.equal(full.upgradeTeam().upgraded, false);
    assert.equal(full.progress.coins, 10000);
    const storage = { getItem: () => JSON.stringify({ ...data, heroLevel: 1 }), setItem: () => { throw new Error('denied'); } };
    const failed = new ProgressStore(storage);
    assert.equal(failed.upgradeTeam().saved, false);
    assert.equal(failed.progress.heroLevel, 2);
});
