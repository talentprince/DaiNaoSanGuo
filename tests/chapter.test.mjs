import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { DAY_MS, ProgressStore } from '../assets/battle/ProgressStore.ts';
import { CHAPTER_PROTAGONIST_ID, createChapterOptions, WORKSHOPS } from '../assets/data/ChapterConfig.ts';
import { equipmentStats } from '../assets/data/EquipmentConfig.ts';

const SHANGHAI_START = Date.parse('2026-11-05T00:00:00+08:00');
const MINUTE = 60000;

function profile(roll = .1) {
    let value = null;
    const env = { now: SHANGHAI_START, roll, fail: false };
    const storage = {
        getItem: () => value,
        setItem: (_, text) => {
            if (env.fail) throw new Error('storage unavailable');
            value = text;
        },
    };
    env.reopen = () => new ProgressStore(storage, () => env.now, () => env.roll);
    env.store = env.reopen();
    return env;
}

function settle(store, map, difficulty = 0, target, won = true) {
    const run = store.startChapter(map, difficulty, target);
    assert.equal(store.settleChapter(run.id, won).saved, true);
    return run;
}

function unlockRift(store) {
    for (const [map, difficulty] of [['road', 0], ['ridge', 0], ['bridge', 0], ['siege', 0], ['siege', 1], ['siege', 2]]) {
        settle(store, map, difficulty);
    }
}

function fight(store, map, difficulty = 0, target) {
    const run = store.startChapter(map, difficulty, target);
    const battle = new BattleEngine(createChapterOptions(run));
    while (battle.status === 'fighting') battle.advance(.25);
    store.settleChapter(run.id, battle.status === 'won');
    return battle;
}

test('章节开图、三难度和首通将帖与行军枪沿用同一存档', () => {
    const env = profile();
    const store = env.store;
    assert.throws(() => store.startChapter('workshop', 0), /长坂路首通/);
    assert.throws(() => store.startChapter('road', 1), /本图探路/);
    assert.throws(() => store.startChapter('bridge', 0), /长坂路探路/);
    assert.throws(() => store.startChapter('rift', 2, 'officer'), /翻天首通/);
    const run = settle(store, 'road');
    assert.equal(store.progress.highestCleared, 0);
    assert.ok(store.progress.owned.includes('zhangfei'));
    assert.equal(store.progress.inventory[0].name, '长坂行军枪');
    assert.match(store.settleChapter(run.id, true).lines[0], /已结算/);
    settle(store, 'road');
    assert.equal(store.progress.inventory.length, 1);
    assert.throws(() => store.startChapter('siege', 0), /铁枪坡和小桥口/);
    assert.throws(() => store.startChapter('road', 2), /长坂围阵硬仗/);
    const restored = env.reopen().progress;
    assert.deepEqual(restored.chapter, store.progress.chapter);
    assert.deepEqual(restored.inventory, store.progress.inventory);
    assert.ok(restored.owned.includes('zhangfei'));
});

test('前台实战可从起步阵容刷枪、整装，换入治疗后通翻天和奇阵', () => {
    const env = profile();
    const store = env.store;
    assert.equal(fight(store, 'road').status, 'won');
    env.now += 20 * MINUTE;
    assert.ok(store.claimExperience() >= store.experienceCost);
    assert.equal(store.upgradeTeam().level, 2);
    for (let stage = 1; stage <= 4; stage++) store.settleVictory(`legacy-${stage}`, stage);
    const team = ['zhangfei', 'mizhu', 'guanhai', 'songxian', 'liaohua'];
    assert.equal(store.setParty(team, 'main'), null);
    const reserve = store.progress.formations.main.find(entry => entry.hero === 'guanhai');
    assert.equal(store.setProtagonistSpot(reserve.spot), null);
    for (let i = 0; i < 6; i++) assert.equal(fight(store, 'ridge').status, 'won');
    assert.equal(fight(store, 'workshop').status, 'won');
    team.forEach(hero => store.equipBest(hero));
    assert.equal(store.tuneEquipment(store.progress.loadouts.songxian.weapon, 0), null);
    for (const [map, difficulty] of [['bridge', 0], ['siege', 0], ['siege', 1], ['siege', 2], ['rift', 2]]) {
        const battle = fight(store, map, difficulty, 'officer');
        assert.equal(battle.status, 'won', `${map}/${difficulty}`);
        assert.ok(battle.skillCount > 0);
    }
    assert.equal(store.progress.chapter.pity.officer, 1);
});

test('主角固定出战且只对一个敌人施技，选位与随将阵容使用入场快照', () => {
    const env = profile();
    const store = env.store;
    const layout = store.progress.formations.main;
    const bench = layout.find(entry => entry.hero === 'songxian');
    assert.match(store.setProtagonistSpot('bad-spot'), /已排好/);
    assert.equal(store.setProtagonistSpot(bench.spot), null);
    const run = store.startChapter('road', 0);
    assert.equal(store.setProtagonistSpot(layout.find(entry => entry.hero === 'caohong').spot), null);
    const reloaded = env.reopen();
    const pending = reloaded.progress.chapter.pending;
    assert.equal(pending.protagonistSpot, run.protagonistSpot);
    assert.notEqual(reloaded.protagonistSpot, pending.protagonistSpot);
    const options = createChapterOptions(pending);
    assert.equal(options.heroes.length, 5);
    assert.equal(options.heroes.filter(u => u.id === CHAPTER_PROTAGONIST_ID).length, 1);
    assert.ok(options.heroes.every(u => u.id !== 'songxian'));
    assert.deepEqual(reloaded.progress.formations.main, layout);
    const engine = new BattleEngine(options);
    engine.autoSkill = false;
    engine.advance(1.7);
    const hero = engine.heroes.find(u => u.id === CHAPTER_PROTAGONIST_ID);
    assert.ok(hero.defense > 60);
    assert.ok(hero.attack >= 120 && hero.attack < 140);
    hero.energy = 100;
    assert.equal(engine.castSkill(hero.id), true);
    const cast = engine.drainEvents().find(event => event.type === 'skill' && event.source === hero.id);
    assert.equal(cast.targets.length, 1);
});

test('主角等级与四位随将共用旧档等级及每日经验上限', () => {
    const env = profile();
    const store = env.store;
    env.now += 500 * MINUTE;
    assert.equal(store.experiencePreview().amount, 0);
    const initial = settle(store, 'road');
    assert.equal(store.progress.highestCleared, 0);
    assert.equal(store.experiencePreview().amount, 0);
    env.now += 500 * MINUTE;
    assert.equal(store.experiencePreview().minutes, 240);
    assert.equal(store.claimExperience(), 2964);
    assert.equal(store.upgradeTeam().level, 2);
    store.settleVictory('shared-legacy-1', 1);
    env.now += 20 * MINUTE;
    assert.equal(store.claimExperience(), 0);
    const reloaded = env.reopen();
    const newRun = reloaded.startChapter('road', 0);
    assert.equal(newRun.level, 2);
    const before = createChapterOptions(initial).heroes;
    const after = createChapterOptions(newRun).heroes;
    assert.deepEqual(before.map(u => u.id), after.map(u => u.id));
    assert.ok(after.every((unit, i) => unit.maxHp > before[i].maxHp && unit.attack > before[i].attack));
});

test('破阵条召出首领和两名护卫，护卫存在时首领减伤，失去护卫后伤害放大', () => {
    const { store } = profile();
    unlockRift(store);
    const run = store.startChapter('rift', 2, 'spear');
    const options = createChapterOptions(run);
    assert.equal(options.riftGoal, 100);
    assert.equal(options.bossWave.filter(u => u.bodyguard).length, 2);
    assert.ok(options.waves.flat().some(u => u.elite && u.riftValue > 2));
    const [hero] = options.heroes;
    const [guard, , boss] = options.bossWave;
    const firstHit = (guarded, guards) => {
        const engine = new BattleEngine({ heroes: [{ ...hero, kind: 'soldier', attack: 100 }], seed: 71,
            waves: [[{ ...boss, guarded, priority: 0, maxHp: 1000, defense: 0, attack: 0 }, ...guards]] });
        engine.advance(.5);
        return engine.drainEvents().find(e => e.type === 'damage' && e.target === boss.id).amount;
    };
    const normal = firstHit(undefined, []);
    assert.equal(firstHit('break', [{ ...guard, priority: 9, attack: 0 }]), Math.floor(normal * .35));
    assert.equal(firstHit('break', []), Math.floor(normal * 1.25));
    assert.equal(firstHit('guard', []), normal);
});

test('地图每档掉率独立且随难度增加，重复将帖使用现有专属碎片', () => {
    const env = profile(.5);
    const store = env.store;
    settle(store, 'road');
    settle(store, 'ridge', 0);
    assert.equal(store.progress.inventory.length, 1);
    settle(store, 'ridge', 1);
    assert.equal(store.progress.inventory.at(-1).rarity, 2);
    env.roll = .2;
    settle(store, 'bridge', 0);
    assert.ok(!store.progress.owned.includes('liaohua'));
    settle(store, 'bridge', 1);
    assert.ok(store.progress.owned.includes('liaohua'));
    settle(store, 'bridge', 1);
    assert.equal(store.progress.fragments.liaohua, 20);
});

test('奇阵定向可交替与重载，失败不加保底，保底与直掉同场只发一次', () => {
    const env = profile(.999);
    let store = env.store;
    unlockRift(store);
    for (let i = 0; i < 29; i++) settle(store, 'rift', 2, 'officer');
    settle(store, 'rift', 2, 'spear');
    settle(store, 'rift', 2, 'officer', false);
    store = env.reopen();
    assert.deepEqual(store.progress.chapter.pity, { officer: 29, spear: 1 });
    env.roll = .001;
    const run = settle(store, 'rift', 2, 'officer');
    store.settleChapter(run.id, true);
    assert.ok(store.progress.owned.includes('zhaoyun'));
    assert.equal(store.progress.fragments.zhaoyun || 0, 0);
    assert.deepEqual(store.progress.chapter.pity, { officer: 0, spear: 1 });
    env.roll = .999;
    for (let i = 1; i < 20; i++) settle(store, 'rift', 2, 'spear');
    assert.equal(store.progress.inventory.filter(item => item.id === 'signature-zhaoyun').length, 1);
    assert.equal(store.equip('zhaoyun', 'signature-zhaoyun'), true);
    assert.equal(store.getEquipmentBonuses().zhaoyun.signature, 'zhaoyun');
});

test('满包寄存、跨重载领取，失败的写入可重试且没有改签掉落', () => {
    const env = profile(.999);
    let store = env.store;
    unlockRift(store);
    while (store.progress.inventory.length < store.inventoryCapacity) store.settleVictory(`lootfill-${store.progress.inventory.length}`, 1);
    env.roll = .01;
    const run = store.startChapter('rift', 2, 'spear');
    env.fail = true;
    assert.equal(store.settleChapter(run.id, true).saved, false);
    assert.equal(store.progress.chapter.reserve, null);
    assert.equal(store.progress.chapter.pending.id, run.id);
    env.fail = false;
    env.roll = .999;
    store = env.reopen();
    assert.equal(store.settleChapter(run.id, true).saved, true);
    store = env.reopen();
    assert.equal(store.progress.chapter.reserve.id, 'signature-zhaoyun');
    assert.throws(() => store.startChapter('road', 0), /寄存/);
    assert.match(store.claimChapterReserve(), /背包已满/);
    assert.equal(store.recycleEquipment(store.progress.inventory[0].id), null);
    assert.equal(store.claimChapterReserve(), null);
    assert.equal(store.progress.chapter.reserve, null);
    assert.ok(env.reopen().progress.inventory.some(item => item.id === 'signature-zhaoyun'));
});

test('军器换班遵守上海两天边界，入场快照跨班有效，时钟回退不会重领', () => {
    const env = profile(.999);
    const store = env.store;
    settle(store, 'road');
    env.now += 2 * DAY_MS - 1;
    assert.equal(store.currentWorkshop.index, 0);
    assert.equal(store.currentWorkshop.switchAt, env.now + 1);
    const old = store.startChapter('workshop', 0);
    env.now += 1;
    assert.equal(store.currentWorkshop.index, 1);
    const reloaded = env.reopen();
    assert.equal(reloaded.progress.chapter.pending.window, old.window);
    reloaded.settleChapter(old.id, true);
    settle(reloaded, 'workshop');
    settle(reloaded, 'workshop');
    env.now += 2 * DAY_MS;
    assert.equal(WORKSHOPS[reloaded.currentWorkshop.index].material, '压阵印');
    settle(reloaded, 'workshop');
    env.now += 2 * DAY_MS;
    assert.equal(reloaded.currentWorkshop.index, 0);
    settle(reloaded, 'workshop');
    env.now -= 4 * DAY_MS;
    settle(reloaded, 'workshop');
    assert.deepEqual(reloaded.progress.chapter.materials, [18, 15, 9]);
});

test('整装实际进入旧主线与章节共享的装备加成，专武重载保留打磨和阵纹', () => {
    const env = profile(.001);
    let store = env.store;
    unlockRift(store);
    settle(store, 'rift', 2, 'spear');
    settle(store, 'rift', 2, 'officer');
    for (let i = 0; i < 3; i++) {
        env.now = SHANGHAI_START + i * 2 * DAY_MS;
        settle(store, 'workshop');
    }
    const id = 'signature-zhaoyun';
    const original = store.progress.inventory.find(i => i.id === id);
    assert.equal(store.equip('zhaoyun', id), true);
    assert.equal(store.tuneEquipment(id, 0), null);
    assert.equal(store.tuneEquipment(id, 1, 'shield'), null);
    assert.equal(store.tuneEquipment(id, 2), null);
    assert.match(store.tuneEquipment(id, 2), /只可压阵一次/);
    store = env.reopen();
    const stats = equipmentStats(store.progress.inventory.find(i => i.id === id));
    assert.equal(stats.attack, original.attack + 8);
    assert.equal(store.getEquipmentBonuses().zhaoyun.openingShield, .22);
    store.setParty(['zhaoyun', 'zhangfei', 'guanhai', 'jianyong', 'songxian'], 'main');
    const run = store.startChapter('road', 0);
    const engine = new BattleEngine(createChapterOptions(run));
    const zhaoyun = engine.heroes.find(u => u.id === 'zhaoyun');
    assert.equal(zhaoyun.shield, Math.floor(zhaoyun.maxHp * .22));
    assert.equal(zhaoyun.signature, 'zhaoyun');
});

test('离线仅挂机已通关探路与硬仗，4小时封顶，批次存档可恢复且不重复领', () => {
    const env = profile(.1);
    let store = env.store;
    assert.match(store.assignChapterOffline('ridge', 0), /先通关/);
    settle(store, 'road');
    settle(store, 'ridge');
    assert.equal(store.assignChapterOffline('ridge', 0), null);
    env.now += 19 * MINUTE;
    assert.equal(store.chapterOffline.ready, 0);
    env.now += 500 * MINUTE;
    store = env.reopen();
    assert.equal(store.chapterOffline.ready, 12);
    const coins = store.progress.coins;
    env.fail = true;
    assert.equal(store.claimChapterOffline().saved, false);
    assert.equal(store.progress.coins, coins);
    assert.equal(store.chapterOffline.ready, 12);
    env.fail = false;
    assert.match(store.claimChapterOffline().lines[0], /已结算 12 场/);
    store = env.reopen();
    assert.equal(store.progress.coins, coins + 12 * 120);
    assert.equal(store.chapterOffline.ready, 0);
    assert.match(store.claimChapterOffline().lines[0], /未攒满/);
    assert.throws(() => store.startChapter('ridge', 2), /长坂围阵硬仗/);
});

test('离线满包只结算到第一件寄存，清空间后剩余场数可领', () => {
    const env = profile(.1);
    const store = env.store;
    settle(store, 'road');
    settle(store, 'ridge');
    while (store.progress.inventory.length < store.inventoryCapacity) store.settleVictory(`fill-${store.progress.inventory.length}`, 1);
    assert.equal(store.assignChapterOffline('ridge', 0), null);
    env.now += 60 * MINUTE;
    assert.match(store.claimChapterOffline().lines[0], /已结算 1 场 · 剩余 2 场/);
    assert.equal(store.chapterOffline.ready, 2);
    assert.match(store.claimChapterOffline().lines[0], /领取寄存/);
    for (const item of store.progress.inventory.slice(0, 3)) store.recycleEquipment(item.id);
    assert.equal(store.claimChapterReserve(), null);
    assert.match(store.claimChapterOffline().lines[0], /已结算 2 场 · 剩余 0 场/);
});
