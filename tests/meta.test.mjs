import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore, DAY_MS, chinaDay } from '../assets/battle/ProgressStore.ts';
import { HERO_CATALOG, getHero, STARTER_PARTY, LEGACY_PARTY, validateParty } from '../assets/data/HeroCatalog.ts';
import { createActivityOptions, trialTrait } from '../assets/data/ActivityConfig.ts';
import { createBattleOptions } from '../assets/data/BattleConfig.ts';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';

const NOW = Date.UTC(2026, 9, 30, 4);
function storage(initial) { let value = initial ? JSON.stringify(initial) : null; return { getItem: () => value, setItem: (_, v) => { value = v; } }; }
function rich(extra = {}, rng = () => 0.1) {
    const seed = new ProgressStore(storage(), () => NOW).progress;
    const disk = storage({ ...seed, daibi: 100000, points: 10000, owned: HERO_CATALOG.map(h => h.id), ...extra });
    return { disk, store: new ProgressStore(disk, () => NOW, rng) };
}

test('40名武将覆盖四档，初始5普通武将均可战斗，主线第一关可通关', () => {
    assert.equal(HERO_CATALOG.length, 40);
    assert.equal(new Set(HERO_CATALOG.map(h => h.id)).size, 40);
    assert.deepEqual([...new Set(HERO_CATALOG.map(h => h.tier))].sort(), [1, 2, 3, 4]);
    const store = new ProgressStore(storage(), () => NOW);
    assert.deepEqual(store.progress.formation, STARTER_PARTY);
    const battle = new BattleEngine(createBattleOptions(1, 42, 1, {}, store.progress.formation));
    battle.advance(120);
    assert.equal(battle.status, 'won');
    assert.ok(battle.skillCount > 0);
});
test('主线首通给少量呆币与剧情武将，重打和刷新不能再次给首通奖励', () => {
    const disk = storage(); const s = new ProgressStore(disk, () => NOW);
    const r = s.settleVictory('first', 1);
    assert.equal(r.daibi, 10); assert.deepEqual(r.heroes, ['chengpu']);
    assert.equal(s.settleVictory('replay', 1).daibi, 0);
    assert.equal(s.settleVictory('milestone', 5).daibi, 60);
    assert.ok(s.progress.owned.includes('liubei'));
    assert.equal(new ProgressStore(disk, () => NOW).settleVictory('reload', 5).daibi, 0);
});
test('0.4旧存档保留原五将、等级、装备和资源，不追发可反复刷的呆币', () => {
    const s = new ProgressStore(storage({ version: 1, coins: 500, highestCleared: 20, heroLevel: 3, settled: [] }), () => NOW);
    assert.deepEqual(s.progress.formation, LEGACY_PARTY);
    assert.ok(LEGACY_PARTY.every(id => s.progress.owned.includes(id)));
    assert.ok(s.progress.owned.includes('xuchu'));
    assert.equal(s.progress.coins, 500); assert.equal(s.progress.daibi, 0);
    assert.equal(s.settleVictory('old-stage', 5).daibi, 0);
});
test('挂机在首通后开启，24小时封顶1000，离线超时不累积多天，重复领取为0', () => {
    let now = NOW; const disk = storage(); const s = new ProgressStore(disk, () => now);
    now += DAY_MS; assert.equal(s.claimIdle(), 0);
    s.settleVictory('start', 1); now += DAY_MS * 7;
    assert.equal(s.idlePreview(), 1000); assert.equal(s.claimIdle(), 1000);
    assert.equal(s.claimIdle(), 0);
    assert.equal(new ProgressStore(disk, () => now).claimIdle(), 0);
});
test('分次领取保存余数，全天合计不超过十连；时间倒退不会复制收益', () => {
    let now = NOW; const s = new ProgressStore(storage(), () => now); s.settleVictory('first', 1);
    let total = 0;
    for (let i = 0; i < 1440; i++) { now += 60000; total += s.claimIdle(); }
    assert.equal(total, 1000);
    now -= DAY_MS; assert.equal(s.claimIdle(), 0);
    now += DAY_MS; assert.equal(s.claimIdle(), 0);
});
test('招募概率边界对应60/30/9/1四档，费用准确，重复将转铜钱和碎片', () => {
    for (const [roll, tier] of [[0, 1], [0.59999, 1], [0.6, 2], [0.89999, 2], [0.9, 3], [0.98999, 3], [0.99, 4]]) {
        let n = 0; const { store } = rich({}, () => n++ % 2 === 0 ? roll : 0);
        const result = store.recruit(1)[0];
        assert.equal(getHero(result.hero).tier, tier);
        assert.equal(store.progress.daibi, 99900); assert.equal(store.progress.points, 10000);
        assert.equal(result.duplicate, true); assert.ok(result.coins > 0);
    }
});
test('十连至少骁将，80抽神将保底跨会话累计且提前出神将会重置', () => {
    const { store, disk } = rich({ owned: [...STARTER_PARTY] });
    assert.equal(getHero(store.recruit(10)[9].hero).tier, 2);
    assert.equal(store.progress.pity, 10);
    const reload = new ProgressStore(disk, () => NOW, () => 0.1);
    for (let i = 0; i < 6; i++) reload.recruit(10);
    const last = reload.recruit(10);
    assert.equal(getHero(last[9].hero).tier, 4); assert.equal(last[9].guaranteed, true);
    assert.equal(reload.progress.pity, 0);
    const natural = rich({ pity: 25 }, () => 0.999).store;
    natural.recruit(1); assert.equal(natural.progress.pity, 0);
});
test('呆币不足或无效随机源不扣费、不改变阵容与招募状态', () => {
    const poor = new ProgressStore(storage(), () => NOW); const before = poor.progress;
    assert.throws(() => poor.recruit(1)); assert.deepEqual(poor.progress, before);
    const bad = rich({}, () => 1).store; const original = bad.progress;
    assert.throws(() => bad.recruit(10)); assert.deepEqual(bad.progress, original);
});
test('脑勋兑换可以任选名将神将，已有武将与积分不足不扣积分', () => {
    const { store, disk } = rich({ owned: [...STARTER_PARTY] });
    assert.equal(store.exchange('lvbu'), null); assert.equal(store.progress.points, 7900);
    assert.ok(store.exchange('lvbu')); assert.equal(store.progress.points, 7900);
    assert.equal(store.exchange('zhangfei'), null); assert.equal(store.progress.points, 6500);
    assert.ok(store.exchange('huanggai')); assert.equal(store.progress.points, 6500);
    assert.ok(new ProgressStore(disk, () => NOW).progress.owned.includes('lvbu'));
    assert.ok(rich({ points: 1, owned: [...STARTER_PARTY] }).store.exchange('zhouyu'));
});
test('阵容限制验证人数、归属、唯一性，三将最多1神将2名将', () => {
    const all = HERO_CATALOG.map(h => h.id);
    assert.ok(validateParty(['lvbu', 'caocao', 'guanyu'], all, 'trial'));
    assert.ok(validateParty(['guanyu', 'zhaoyun', 'zhangfei'], all, 'trial'));
    assert.ok(validateParty(['guanyu', 'guanyu', 'liubei'], all, 'trial'));
    assert.ok(validateParty(['lvbu', 'guanyu', 'liubei'], STARTER_PARTY, 'trial'));
    assert.equal(validateParty(['lvbu', 'zhangfei', 'liubei'], all, 'trial'), null);
    const s = rich().store; const before = s.progress.trialParty;
    assert.ok(s.setParty(['lvbu', 'caocao', 'guanyu'], 'trial'));
    assert.deepEqual(s.progress.trialParty, before);
});
test('攻城每天3次，失败仍有少量奖励；挑战票据重载恢复且结算去重', () => {
    const { store, disk } = rich();
    const first = store.startActivity('city');
    assert.throws(() => store.startActivity('city'));
    const s = new ProgressStore(disk, () => NOW);
    assert.equal(s.progress.pending.id, first.id);
    assert.deepEqual(s.settleActivity(first.id, false), { granted: true, daibi: 90, points: 8, saved: true });
    assert.equal(s.settleActivity(first.id, false).granted, false);
    for (let i = 0; i < 2; i++) { const r = s.startActivity('city'); s.settleActivity(r.id, true); }
    assert.throws(() => s.startActivity('city'));
    assert.equal(s.progress.daily.cityUsed, 3);
});
test('上海时区零点刷新次数；改小本机日期不刷新；跨日旧日票据不结算', () => {
    let now = Date.UTC(2026, 9, 30, 15, 59, 59);
    const s = new ProgressStore(storage(), () => now); const old = s.startActivity('city');
    now += 2000; assert.equal(s.progress.daily.cityUsed, 0);
    assert.equal(s.settleActivity(old.id, true).granted, false);
    const newRun = s.startActivity('city'); s.settleActivity(newRun.id, true);
    now -= DAY_MS; assert.equal(s.progress.daily.cityUsed, 1);
    assert.equal(chinaDay(Date.UTC(2026, 9, 30, 16)), chinaDay(Date.UTC(2026, 9, 31, 0)));
});
test('世界Boss固定30秒，记录有效伤害，死亡后等到计时结束并只计个人最高', () => {
    const s = rich().store; const run = s.startActivity('boss');
    const engine = new BattleEngine(createActivityOptions(run)); engine.advance(100);
    assert.equal(engine.status, 'scored'); assert.ok(Math.abs(engine.elapsed - 30) < 1e-7);
    assert.ok(engine.damageDealt > 0);
    const amount = Math.floor(engine.damageDealt);
    s.settleActivity(run.id, false, amount);
    const second = s.startActivity('boss'); const reward = s.settleActivity(second.id, false, amount - 1);
    assert.equal(reward.daibi, 0); assert.equal(reward.points, 0);
    assert.equal(s.progress.daily.bossBest, amount);
    const dead = new BattleEngine(createActivityOptions(run)); dead.heroes.forEach(u => { u.hp = 0; });
    dead.advance(100); assert.equal(dead.status, 'scored'); assert.equal(dead.damageDealt, 0);
});
test('Boss无限次挑战只发当日最高档差额，不能无限刷呆币或脑勋', () => {
    const s = rich().store; let daibi = 0; let points = 0;
    for (const damage of [100, 3000, 10000, 25000, 50000, 99999, 0]) {
        const run = s.startActivity('boss'); const r = s.settleActivity(run.id, false, damage);
        daibi += r.daibi; points += r.points;
    }
    assert.equal(daibi, 320); assert.equal(points, 30);
});
test('三将关卡确实产生不同战斗特性，首通才能递增关卡和得奖励', () => {
    const s = rich().store;
    const opts = [];
    for (let i = 0; i < 5; i++) { const r = s.startActivity('trial'); opts.push(createActivityOptions(r)); s.settleActivity(r.id, true); }
    assert.equal(new Set([1, 2, 3, 4, 5].map(n => trialTrait(n)[0])).size, 5);
    assert.ok(opts[0].waves[0][0].defense > opts[1].waves[0][0].defense);
    assert.equal(opts[2].enemyRegen, 0.025); assert.equal(opts[3].energyRate, 3.5); assert.equal(opts[4].heroDrain, 0.012);
    assert.ok(opts.every(o => o.heroes.length === 3 && o.waves[0].length === 5));
    assert.equal(s.progress.trialHighest, 5);
    const failed = s.startActivity('trial'); assert.equal(s.settleActivity(failed.id, false).daibi, 0);
    assert.equal(s.progress.trialHighest, 5);
});
test('草船借宝每天2次，三种筹谋改变不同属性，失败小奖，放弃也扣次数', () => {
    const s = rich().store;
    assert.throws(() => s.startActivity('boat', [])); assert.equal(s.progress.daily.boatUsed, 0);
    const a = s.startActivity('boat', ['wind', 'wind', 'wind']); const optA = createActivityOptions(a);
    assert.equal(s.settleActivity(a.id, false).daibi, 130);
    const b = s.startActivity('boat', ['guard', 'repair', 'repair']); const optB = createActivityOptions(b);
    assert.ok(optA.heroes[0].attack > optB.heroes[0].attack);
    assert.ok(optB.heroes[0].maxHp > optA.heroes[0].maxHp);
    assert.ok(optB.heroes[0].defense > optA.heroes[0].defense);
    s.abandonActivity(); assert.equal(s.progress.daily.boatUsed, 2);
    assert.throws(() => s.startActivity('boat', ['wind', 'wind', 'wind']));
});
test('副本入场快照固定阵容与属性，保存失败也不会在会话内重复发奖', () => {
    const { store } = rich(); const run = store.startActivity('trial');
    store.setParty(['lvbu', 'guanyu', 'liubei'], 'trial');
    assert.deepEqual(store.progress.pending.party, STARTER_PARTY.slice(0, 3));
    run.party[0] = 'lvbu'; assert.notEqual(store.progress.pending.party[0], 'lvbu');
    const seed = store.progress;
    const s = new ProgressStore({ getItem: () => JSON.stringify(seed), setItem: () => { throw Error('disk full'); } }, () => NOW);
    const r = s.settleActivity(seed.pending.id, true); assert.equal(r.saved, false);
    assert.equal(s.settleActivity(seed.pending.id, true).granted, false);
});

test('Boss受到足以击杀目标的伤害也必须打满30秒，不能提前通关', () => {
    const run = rich().store.startActivity('boss'); const options = createActivityOptions(run);
    options.waves[0][0].maxHp = 10;
    const engine = new BattleEngine(options); engine.advance(3);
    assert.equal(engine.status, 'fighting'); assert.equal(engine.enemies[0].hp, 10);
    engine.advance(30); assert.equal(engine.status, 'scored'); assert.ok(Math.abs(engine.elapsed - 30) < 1e-7);
});
