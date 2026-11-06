import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeveloperStore } from '../assets/battle/DeveloperMode.ts';
import { BattleEngine, isRangedWeapon } from '../assets/battle/BattleEngine.ts';
import { DAY_MS, equipmentRecycleYield, ProgressStore } from '../assets/battle/ProgressStore.ts';
import { CHAPTERS, CHAPTER_PROTAGONIST_ID, chapterDialogue, chapterEquipment, chapterFirstEquipment, chapterMaps, chapterRift, chapterRiftPool, chapterRiftTrait, chapterScenery, chapterSeed, chapterStaminaCost, createChapterOptions, DIFFICULTY_PALETTES, nextCampaignMap, WORKSHOPS } from '../assets/data/ChapterConfig.ts';
import { approachX, meleeContactX } from '../assets/data/EncounterPresentation.ts';
import { chapterAllyPosition, FORMATION_SPOTS, moveChapterMember } from '../assets/data/FormationConfig.ts';
import { HERO_CATALOG } from '../assets/data/HeroCatalog.ts';
import { canWear, equipmentStats, RARITY_COLORS, signatureFor } from '../assets/data/EquipmentConfig.ts';
import { ASSAULT_ARMOR_DROP, assaultTicketCap, chapterDropEquipment, CHAPTER_MIN_LEVELS, duelGrades, MAX_POLISH, polishEnergyNeeded, polishTransfer, tuningMaterialCost, campaignMaterialReward, chapterDelveDrop, chapterDelveGear, chapterDelvePool, chapterGearPool, tuningCoinCost, workshopMaterialReward } from '../assets/data/ChapterConfig.ts';

const SHANGHAI_START = Date.parse('2026-11-05T00:00:00+08:00');
const MINUTE = 60000;

function profile(roll = .1, { longbanTrial = true, level = 1 } = {}) {
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
    env.editSave = edit => { const save = JSON.parse(value); edit(save); value = JSON.stringify(save); };
    const fresh = env.reopen().progress;
    fresh.chapter.longbanTrial = longbanTrial;
    fresh.heroLevel = level;
    value = JSON.stringify(fresh);
    env.store = env.reopen();
    return env;
}

function settle(store, map, difficulty = 0, won = true) {
    const run = store.startChapter(map, difficulty);
    assert.equal(store.settleChapter(run.id, won).saved, true);
    return run;
}

function unlockRift(store) {
    for (const [map, difficulty] of [['road', 0], ['ridge', 0], ['bridge', 0], ['siege', 0], ['siege', 1], ['siege', 2]]) {
        settle(store, map, difficulty);
    }
}

function delveRoll(map, predicate) {
    let start = 0;
    for (const drop of chapterDelvePool(map, 'preview')) {
        if (predicate(drop)) return (start + drop.rate / 2) / 100;
        start += drop.rate;
    }
    throw new Error('Missing test reward');
}

function fight(store, map, difficulty = 0) {
    const run = store.startChapter(map, difficulty);
    const battle = new BattleEngine(createChapterOptions(run));
    while (battle.status === 'fighting') battle.advance(.25);
    store.settleChapter(run.id, battle.status === 'won', 0, battle.enemyExperience);
    return battle;
}

test('章节开图、三难度和首通将帖与行军枪沿用同一存档', () => {
    const env = profile();
    const store = env.store;
    assert.throws(() => store.startChapter('workshop', 0), /长坂路首通/);
    assert.throws(() => store.startChapter('road', 1), /本图探路/);
    assert.throws(() => store.startChapter('bridge', 0), /长坂路探路/);
    assert.throws(() => store.startChapter('rift', 2), /翻天首通/);
    const run = settle(store, 'road');
    assert.equal(store.progress.highestCleared, 0);
    assert.ok(store.progress.owned.includes('zhangfei'));
    assert.equal(store.progress.inventory[0].name, '长坂行军枪');
    assert.match(store.settleChapter(run.id, true).lines[0], /已结算/);
    settle(store, 'road');
    assert.equal(store.progress.inventory.filter(item => item.name === '长坂行军枪').length, 1);
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
    for (let i = 0; store.progress.heroLevel < 2 && i < 5; i++) assert.equal(fight(store, 'road').status, 'won');
    assert.equal(store.progress.heroLevel, 2);
    assert.equal(fight(store, 'bridge').status, 'won');
    assert.ok(store.progress.owned.includes('mizhu'));
    assert.ok(store.progress.owned.includes('liaohua'));
    const team = ['zhangfei', 'mizhu', 'guanhai', 'songxian', 'liaohua'];
    assert.equal(store.setParty(team, 'main'), null);
    const reserve = store.progress.formations.main.find(entry => entry.hero === 'guanhai');
    assert.equal(store.saveChapterFormation({ protagonistSpot: reserve.spot, companions: store.progress.formations.main.filter(entry => entry.spot !== reserve.spot) }), null);
    for (let i = 0; i < 5; i++) {
        assert.equal(fight(store, 'ridge').status, 'won');
        assert.equal(fight(store, 'road').status, 'won');
    }
    assert.equal(fight(store, 'workshop').status, 'won');
    team.forEach(hero => store.equipBest(hero));
    assert.equal(store.tuneEquipment(store.progress.loadouts.songxian.weapon, 0), null);
    let skillCount = 0;
    for (const [map, difficulty] of [['bridge', 0], ['siege', 0], ['siege', 1], ['siege', 2], ['rift', 2]]) {
        if (map === 'siege' && difficulty === 2) {
            for (let i = 0; store.progress.heroLevel < 4 && i < 10; i++) assert.equal(fight(store, 'ridge').status, 'won');
            assert.ok(store.progress.heroLevel >= 4);
            team.forEach(hero => store.equipBest(hero));
        }
        const battle = fight(store, map, difficulty);
        assert.equal(battle.status, 'won', `${map}/${difficulty}`);
        skillCount += battle.skillCount;
    }
    assert.ok(skillCount > 0);
    assert.equal(store.progress.owned.includes('zhaoyun'), false);
    assert.equal(store.progress.highestCleared, 0);
    assert.ok(store.progress.inventory.some(item => item.slot === 'armor'));
    assert.ok(store.progress.inventory.some(item => item.slot === 'charm'));
});

test('战图胜利补充脑力且共用每日上限，挂机和失败不发放', () => {
    const env = profile(.99);
    const store = env.store;
    settle(store, 'road');
    for (let i = 0; i < 11; i++) settle(store, 'road');
    assert.equal(store.progress.souls, 20);
    assert.equal(store.progress.daily.soulEarned, 20);
    assert.equal(store.assignChapterOffline('road', 0), null);
    env.now += DAY_MS;
    store.claimChapterOffline();
    assert.equal(store.progress.souls, 20);
    settle(store, 'road', 0, false);
    assert.equal(store.progress.daily.soulEarned, 0);
    settle(store, 'road');
    assert.equal(store.progress.souls, 22);
    assert.equal(store.starUp('zhangfei'), null);
});

test('主角固定出战且只对一个敌人施技，选位与随将阵容使用入场快照', () => {
    const env = profile();
    const store = env.store;
    const layout = store.progress.formations.main;
    const bench = layout.find(entry => entry.hero === 'songxian');
    assert.match(store.saveChapterFormation({ protagonistSpot: 'bad-spot', companions: [] }), /有效阵位/);
    assert.equal(store.saveChapterFormation({ protagonistSpot: bench.spot, companions: layout.filter(entry => entry.spot !== bench.spot) }), null);
    const run = store.startChapter('road', 0);
    assert.equal(store.saveChapterFormation(moveChapterMember(store.chapterFormation, { protagonist: true }, layout.find(entry => entry.hero === 'caohong').spot)), null);
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

test('战图没有免费挂机经验，主公经验满后免费自动升级并带动随将', () => {
    const env = profile();
    const store = env.store;
    env.now += 500 * MINUTE;
    assert.equal(store.experiencePreview().amount, 0);
    const initial = settle(store, 'road');
    assert.equal(store.progress.highestCleared, 0);
    assert.equal(store.experiencePreview().amount, 0);
    env.now += 500 * MINUTE;
    assert.equal(store.experiencePreview().minutes, 0);
    assert.equal(store.claimExperience(), 0);
    assert.equal(store.chapterOffline, null);
    const coins = store.progress.coins;
    const second = store.startChapter('road', 0);
    assert.ok(store.settleChapter(second.id, true, 0, 51).saved);
    assert.equal(store.progress.coins, coins + 120);
    assert.equal(store.progress.experience, 0);
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
    const run = store.startChapter('rift', 2);
    const options = createChapterOptions({ ...run, target: 'spear' });
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

test('赤门每次独立按本章掉落池掷骰，超过旧次数门槛或重载也不保底', () => {
    const env = profile(.999);
    let store = env.store;
    unlockRift(store);
    for (let i = 0; i < 33; i++) {
        if (store.progress.chapter.delveTickets < 2) {
            env.now += DAY_MS;
            for (let win = 0; win < 10; win++) settle(store, 'road');
        }
        settle(store, 'rift', 2);
        settle(store, 'rift', 2);
    }
    store = env.reopen();
    assert.equal(store.progress.owned.includes('zhaoyun'), false);
    assert.equal(store.progress.inventory.some(item => item.id === 'signature-zhaoyun'), false);
    assert.equal('pity' in store.progress.chapter, false);
    env.now += DAY_MS;
    for (let win = 0; win < 3; win++) settle(store, 'road');
    env.roll = .029;
    settle(store, 'rift', 2, false);
    assert.equal(store.progress.owned.includes('zhaoyun'), false);
    const run = settle(store, 'rift', 2);
    store.settleChapter(run.id, true);
    assert.ok(store.progress.owned.includes('zhaoyun'));
    assert.equal(store.progress.fragments.zhaoyun || 0, 0);
    env.roll = delveRoll('rift', drop => drop.item?.exclusive === 'zhaoyun');
    settle(store, 'rift', 2);
    assert.equal(store.progress.inventory.filter(item => item.id === 'signature-zhaoyun').length, 1);
    assert.equal(store.equip('zhaoyun', 'signature-zhaoyun'), true);
    assert.equal(store.getEquipmentBonuses().zhaoyun.signature, 'zhaoyun');
});

test('战图敌军接敌后先出手，初始等级能打出超过1点的伤害', () => {
    const { store } = profile();
    const run = store.startChapter('road', 0);
    const battle = new BattleEngine(createChapterOptions(run));
    battle.advance(1.9);
    const events = battle.drainEvents();
    const first = events.find(event => event.type === 'attack');
    assert.equal(first.target, CHAPTER_PROTAGONIST_ID);
    assert.ok(first.source.startsWith('enemy-'));
    assert.ok(events.some(event => event.type === 'damage' && event.target === CHAPTER_PROTAGONIST_ID && event.amount > 1));
});

test('近战等到接敌完成才出手，远程留位并可在接敌末段射击', () => {
    const { store } = profile();
    const battle = new BattleEngine(createChapterOptions(store.startChapter('road', 0)));
    battle.advance(1.45);
    assert.ok(battle.approachRemaining > 0);
    const early = battle.drainEvents().filter(event => event.type === 'attack');
    assert.ok(early.length > 0);
    const units = [...battle.heroes, ...battle.enemies];
    assert.ok(early.every(event => isRangedWeapon(units.find(unit => unit.id === event.source).weapon)));
    battle.advance(.7);
    assert.equal(battle.approachRemaining, 0);
    assert.ok(battle.drainEvents().some(event => event.type === 'attack' && event.source === CHAPTER_PROTAGONIST_ID));

    const near = meleeContactX(false, true, -215);
    const far = meleeContactX(false, false, 240);
    assert.ok(near > -215 && near < 0);
    assert.ok(far < 240 && far > 0);
    assert.ok(approachX(-215, near, .8, 1.6) > -215);
    assert.equal(approachX(-215, near, 0, 1.6), near);
});

test('满级自动施法也会看到章节首领的真实起手，出手计数对应战斗事件', () => {
    const storage = new Map();
    const store = createDeveloperStore({getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
        () => SHANGHAI_START, () => .9);
    const engine = new BattleEngine(createChapterOptions(store.startChapter('yellow-road', 0)));
    const events = [];
    while (engine.status === 'fighting') {
        engine.advance(.05);
        events.push(...engine.drainEvents());
    }
    const arrival = events.findIndex(event => event.type === 'boss');
    const fight = events.slice(arrival + 1).filter(event => event.type === 'attack' || event.type === 'skill');
    assert.equal(engine.status, 'won');
    assert.equal(fight[0].type, 'attack');
    assert.ok(fight[0].source.startsWith('enemy-rift-boss-'));
    assert.equal(engine.enemyAttackCount, events.filter(event => event.type === 'attack' && event.source?.startsWith('enemy-')).length);
});

test('四图使用独立场景，难度的卡面底色逐档变深', () => {
    const scenes = ['road','ridge','bridge','siege'].map(map=>chapterScenery({map}));
    assert.equal(new Set(scenes).size, 4);
    const brightness = DIFFICULTY_PALETTES.map(({card}) =>
        card.slice(1).match(/../g).reduce((sum, hex) => sum + Number.parseInt(hex, 16), 0));
    assert.ok(brightness[0] > brightness[1] && brightness[1] > brightness[2]);
});

test('单机攻城复用墙体与守军，正面Boss复用终结技并保存独立个人纪录', () => {
    const env = profile();
    const store = env.store;
    assert.throws(() => store.startChapter('assault', 0), /首通后开放/);
    settle(store, 'road');
    const city = store.startChapter('assault', 0);
    const cityBattle = new BattleEngine(createChapterOptions(city));
    assert.equal(cityBattle.heroes[0].id, CHAPTER_PROTAGONIST_ID);
    assert.equal(cityBattle.wallAlive, true);
    assert.equal(cityBattle.enemies.filter(unit => unit.onWall).length, 2);
    while (cityBattle.status === 'fighting') cityBattle.advance(.25);
    assert.ok(cityBattle.drainEvents().some(event => event.type === 'wall-break'));
    assert.equal(cityBattle.wallAlive, false);
    assert.equal(store.settleChapter(city.id, true).saved, true);
    assert.equal(store.progress.chapter.materials[0], 0);
    assert.equal(store.progress.chapter.delveTickets, 3);
    assert.ok(!store.progress.inventory.some(item => item.name === ASSAULT_ARMOR_DROP.item.name));
    const duel = store.startChapter('duel', 0);
    env.now += 7 * DAY_MS;
    const reloaded = env.reopen();
    assert.equal(reloaded.progress.chapter.pending.bossId, duel.bossId);
    const battle = new BattleEngine(createChapterOptions(duel));
    while (battle.status === 'fighting') battle.advance(.25);
    assert.equal(battle.status, 'scored');
    assert.ok(battle.drainEvents().some(event => event.type === 'finale-impact'));
    const damage = Math.floor(battle.damageDealt);
    assert.ok(damage > 0);
    assert.equal(reloaded.settleChapter(duel.id, true, damage).saved, true);
    assert.equal(env.reopen().progress.chapter.duelBest[duel.bossId], damage);
});

test('满包寄存、跨重载领取，失败的写入可重试且没有改签掉落', () => {
    const env = profile(.999);
    let store = env.store;
    unlockRift(store);
    while (store.progress.inventory.length < store.inventoryCapacity) store.settleVictory(`lootfill-${store.progress.inventory.length}`, 1);
    env.roll = delveRoll('rift', drop => drop.item?.exclusive === 'zhaoyun');
    const run = store.startChapter('rift', 2);
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
    assert.equal(createChapterOptions(old).riftGoal, 0);
    assert.equal(createChapterOptions(old).timeLimit, 35);
    assert.equal(createChapterOptions(old).waves.length, 1);
    env.now += 1;
    assert.equal(store.currentWorkshop.index, 1);
    const reloaded = env.reopen();
    assert.equal(reloaded.progress.chapter.pending.window, old.window);
    reloaded.settleChapter(old.id, true);
    const bowAmbush = settle(reloaded, 'workshop');
    assert.equal(createChapterOptions(bowAmbush).waves.length, 2);
    assert.ok(createChapterOptions(bowAmbush).waves.every(wave => wave.some(unit => unit.weapon === 'bow' && unit.openingCooldown === 0)));
    const guarded = createChapterOptions({ ...bowAmbush, window: bowAmbush.window + 1 });
    assert.equal(guarded.waves[0].filter(unit => unit.bodyguard).length, 2);
    settle(reloaded, 'workshop');
    env.now += 2 * DAY_MS;
    assert.equal(WORKSHOPS[reloaded.currentWorkshop.index].material, '压阵印');
    settle(reloaded, 'workshop');
    env.now += 2 * DAY_MS;
    assert.equal(reloaded.currentWorkshop.index, 0);
    settle(reloaded, 'workshop');
    env.now -= 4 * DAY_MS;
    settle(reloaded, 'workshop');
    assert.deepEqual(reloaded.progress.chapter.materials, [28, 33, 14]);
});

test('整装实际进入旧主线与章节共享的装备加成，专武重载保留打磨和阵纹', () => {
    const env = profile(.001);
    let store = env.store;
    unlockRift(store);
    env.roll = delveRoll('rift', drop => drop.item?.exclusive === 'zhaoyun');
    settle(store, 'rift', 2);
    env.roll = delveRoll('rift', drop => drop.hero === 'zhaoyun');
    settle(store, 'rift', 2);
    for (let i = 0; i < 3; i++) {
        env.now = SHANGHAI_START + i * 2 * DAY_MS;
        settle(store, 'workshop');
    }
    env.editSave(save => { save.coins = 6000; });
    store = env.reopen();
    const id = 'signature-zhaoyun';
    const original = store.progress.inventory.find(i => i.id === id);
    assert.equal(store.equip('zhaoyun', id), true);
    const coins = store.progress.coins;
    assert.equal(store.tuneEquipment(id, 0), null);
    assert.equal(store.progress.coins, coins - tuningCoinCost(original, 0));
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

test('主公三格装备可与随将转交，整装属性和阵纹随入场快照重载', () => {
    const env = profile(.99, { longbanTrial: false });
    const lead = CHAPTER_PROTAGONIST_ID;
    const base = { stage: 1, rarity: 3, attack: 10, defense: 4, maxHp: 100 };
    const gear = [
        { ...base, id: 'lead-blade', name: '行军短刀', slot: 'weapon', polish: 1 },
        { ...base, id: 'lead-mail', name: '行军铁甲', slot: 'armor', rune: 'shield', stamped: true },
        { ...base, id: 'lead-seal', name: '行军令', slot: 'charm', rune: 'attack' },
    ];
    env.editSave(save => { save.inventory.push(...gear); save.points = 10000; });
    let store = env.reopen();
    const bare = store.startChapter('yellow-road', 0);
    assert.equal(createChapterOptions(bare).heroes[0].attack, 128);
    for (const item of gear) assert.equal(store.equip(lead, item.id), true);
    assert.equal(createChapterOptions(store.progress.chapter.pending).heroes[0].attack, 128);
    assert.equal(store.abandonChapter(), true);
    assert.equal(store.equipBest('guanhai'), false);
    assert.match(store.recycleEquipment(gear[1].id), /先卸下/);
    assert.equal(store.redeemSignature('guanhai'), null);
    assert.equal(store.equip(lead, 'signature-guanhai'), false);
    assert.equal(store.getEquipmentBonuses()[lead], undefined);

    const run = store.startChapter('yellow-road', 0);
    const before = new BattleEngine(createChapterOptions(run)).heroes[0];
    assert.deepEqual([before.attack, before.defense, before.maxHp], [166, 82, 3175]);
    assert.equal(before.shield, Math.floor(before.maxHp * .22));
    assert.equal(before.attackBuff, .12);
    assert.equal(store.equip('guanhai', gear[0].id), true);
    store = env.reopen();
    assert.equal(store.equipmentOwner(gear[0]), 'guanhai');
    assert.equal(store.equipmentOwner(gear[1]), lead);
    assert.equal(store.progress.loadouts[lead].weapon, undefined);
    assert.deepEqual(new BattleEngine(createChapterOptions(store.progress.chapter.pending)).heroes[0], before);
    assert.equal(store.equipBest(lead), false);
    assert.equal(store.equip(lead, gear[0].id), true);
    assert.equal(store.progress.loadouts.guanhai.weapon, undefined);
    assert.equal(store.unequip(lead, 'armor'), true);
    assert.equal(store.recycleEquipment(gear[1].id), null);
});

test('全队配装按品级与部位分配，保存失败回滚，替补装备不被挪用', () => {
    const env = profile(.99, { longbanTrial: false });
    const lead = CHAPTER_PROTAGONIST_ID;
    const item = { stage: 1, rarity: 1, attack: 20, defense: 10, maxHp: 100 };
    env.editSave(save => {
        save.owned.push('zhouyu', 'caocao');
        save.points = 700;
        save.inventory.push(
            { ...item, id: 'spare-sword', name: '行军刀', slot: 'weapon' },
            { ...item, id: 'spare-armor', name: '行军甲', slot: 'armor' },
            { ...item, id: 'bench-sword', name: '替补的刀', slot: 'weapon', attack: 99 },
            ...Array.from({ length: 4 }, (_, i) => ({ ...item, id: 'charm-' + i, name: '兵符', slot: 'charm' })),
        );
    });
    const store = env.reopen();
    assert.equal(store.saveChapterFormation({ protagonistSpot: 'r1c2', companions: [
        { spot: 'r0c0', hero: 'zhouyu' }, { spot: 'r0c2', hero: 'caocao' },
        { spot: 'r2c2', hero: 'caohong' }, { spot: 'r2c1', troop: 'spear' },
    ] }), null);
    assert.equal(store.equip('guanhai', 'bench-sword'), true);
    const before = store.progress.loadouts;
    env.fail = true;
    assert.equal(store.equipChapterTeam(), null);
    assert.deepEqual(store.progress.loadouts, before);
    env.fail = false;
    assert.equal(store.equipChapterTeam(), 4);
    const { loadouts } = env.reopen().progress;
    assert.equal(loadouts.zhouyu.weapon, 'spare-sword');
    assert.equal(loadouts.caocao.weapon, undefined);
    assert.equal(loadouts.caocao.armor, 'spare-armor');
    assert.equal(loadouts.guanhai.weapon, 'bench-sword');
    assert.deepEqual(new Set([lead, 'zhouyu', 'caocao', 'caohong'].map(id => loadouts[id].charm)),
        new Set(['charm-0', 'charm-1', 'charm-2', 'charm-3']));
    assert.equal(store.redeemSignature('caocao'), null);
    assert.equal(store.equipChapterTeam(), 1);
    assert.equal(store.progress.loadouts.caocao.weapon, 'signature-caocao');
    assert.equal(store.equipChapterTeam(), 0);
});

test('撤下随将返还装备并保留本场快照，批量分解闲置装备并返还打磨投入', () => {
    const env = profile(.99, { longbanTrial: false });
    const base = { stage: 1, rarity: 1, attack: 10, defense: 4, maxHp: 100 };
    const spare = { ...base, id: 'spare', name: '行军甲', slot: 'armor' };
    const companion = { ...base, id: 'companion', name: '行军刀', slot: 'weapon' };
    const lead = { ...base, id: 'lead', name: '主公甲', slot: 'armor' };
    const polished = { ...base, id: 'polished', name: '打磨甲', slot: 'armor', rarity: 3, polish: 1, polishSpend: { sand: 6, coins: 240 } };
    const runed = { ...base, id: 'runed', name: '刻阵甲', slot: 'armor', rarity: 2, rune: 'shield' };
    env.editSave(save => { save.inventory.push(spare, companion, lead, polished, runed); });
    const store = env.reopen();
    assert.equal(store.saveChapterFormation({ protagonistSpot: 'r1c2', companions: [{ spot: 'r2c2', hero: 'guanhai' }] }), null);
    assert.equal(store.equip('guanhai', companion.id), true);
    assert.equal(store.equip(CHAPTER_PROTAGONIST_ID, lead.id), true);
    const run = store.startChapter('yellow-road', 0);
    const formation = { protagonistSpot: 'r1c2', companions: [] };
    env.fail = true;
    assert.match(store.saveChapterFormation(formation), /存档失败/);
    assert.equal(store.equipmentOwner(companion), 'guanhai');
    env.fail = false;
    assert.equal(store.saveChapterFormation(formation), null);
    assert.equal(store.equipmentOwner(companion), undefined);
    assert.equal(store.equipmentOwner(lead), CHAPTER_PROTAGONIST_ID);
    assert.equal(env.reopen().equipmentOwner(companion), undefined);
    assert.deepEqual(store.progress.chapter.pending, JSON.parse(JSON.stringify(run)));
    assert.match(store.recycleSpareEquipment([spare.id, lead.id]), /状态已变化/);
    assert.match(store.recycleSpareEquipment([spare.id, 'missing']), /状态已变化/);
    const ids = [spare.id, companion.id, polished.id, runed.id];
    const before = store.progress;
    env.fail = true;
    assert.match(store.recycleSpareEquipment(ids), /存档失败/);
    assert.deepEqual(store.progress, before);
    env.fail = false;
    assert.equal(store.recycleSpareEquipment(ids), null);
    const reopened = env.reopen().progress;
    assert.deepEqual(reopened.inventory.map(item => item.id), [lead.id]);
    assert.equal(reopened.coins, before.coins + 4 * 16 + 120);
    assert.equal(reopened.chapter.materials[0], before.chapter.materials[0] + 3);
});

test('主动派队才能挂机，4小时封顶并按每场的随机波数扣体力', () => {
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
    const snapshot = store.chapterOffline.run;
    const serial = store.progress.runSerial;
    const stamina = store.campaignSupply.stamina;
    env.fail = true;
    assert.equal(store.claimChapterOffline().saved, false);
    assert.equal(store.progress.coins, coins);
    assert.equal(store.chapterOffline.ready, 12);
    env.fail = false;
    assert.match(store.claimChapterOffline().lines[0], /已结算 12 场/);
    store = env.reopen();
    assert.equal(store.progress.coins, coins + 12 * 120);
    const cost = Array.from({ length: 12 }, (_, i) => chapterStaminaCost({ ...snapshot, seed: chapterSeed(serial + i + 1) })).reduce((sum, waves) => sum + waves, 0);
    assert.equal(store.campaignSupply.stamina, stamina - cost);
    assert.equal(store.chapterOffline.ready, 0);
    assert.match(store.claimChapterOffline().lines[0], /未攒满/);
    assert.equal(store.stopChapterOffline(), true);
    assert.equal(env.reopen().chapterOffline, null);
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


test('主公和随从共用拖拽阵位，保存空位、兵种混编和移动都不改写旧阵容', () => {
    const env = profile();
    const store = env.store;
    const initial = store.chapterFormation;
    const lead = { protagonist: true };
    const follower = initial.companions[0];
    const swapped = moveChapterMember(initial, lead, follower.spot);
    assert.equal(swapped.protagonistSpot, follower.spot);
    assert.deepEqual(swapped.companions[0], { ...follower, spot: initial.protagonistSpot });
    assert.deepEqual(moveChapterMember(swapped, swapped.companions[0], follower.spot, initial.protagonistSpot), initial);
    assert.throws(() => moveChapterMember(swapped, lead, null), /必须上场/);
    assert.throws(() => moveChapterMember(swapped, { troop: 'bow' }, swapped.protagonistSpot), /必须上场/);
    const free = ['r0c0', 'r0c1', 'r0c2', 'r1c0', 'r1c1'].filter(spot => spot !== swapped.protagonistSpot);
    const full = { protagonistSpot: 'r2c2', companions: free.slice(0, 4).map((spot, index) => ({ spot, troop: index === 1 ? 'bow' : 'spear' })) };
    assert.equal(store.saveChapterFormation(full), null);
    assert.match(store.saveChapterFormation(moveChapterMember(full, { troop: 'sword' }, 'r2c1')), /最多上阵4名/);
    assert.equal(store.saveChapterFormation(moveChapterMember(full, full.companions[0], null, full.companions[0].spot)), null);
    assert.equal(env.reopen().chapterFormation.companions.length, 3);
    env.fail = true;
    assert.match(store.saveChapterFormation({ protagonistSpot: 'r2c2', companions: [] }), /存档失败/);
    assert.equal(store.chapterFormation.companions.length, 3);
    env.fail = false;
    assert.equal(store.saveChapterFormation({ protagonistSpot: 'r2c2', companions: [] }), null);
    const reloaded = env.reopen();
    assert.deepEqual(reloaded.chapterFormation, { protagonistSpot: 'r2c2', companions: [] });
    const run = reloaded.startChapter('yellow-road', 0);
    assert.deepEqual(createChapterOptions(run).heroes.map(unit => unit.id), [CHAPTER_PROTAGONIST_ID]);
    assert.equal(env.reopen().progress.chapter.pending.layout.length, 0);
});

test('黄巾四图独立解锁，可通关首战，赤门采用快照阵势与本章掉落池', () => {
    const env = profile(.01);
    const store = env.store;
    assert.throws(() => store.startChapter('yellow-ridge', 0), /先通关破旗坡探路/);
    assert.throws(() => store.startChapter('yellow-rift', 2), /祭旗台翻天首通/);
    assert.equal(fight(store, 'yellow-road').status, 'won');
    assert.ok(store.progress.owned.includes('chengpu'));
    assert.ok(store.progress.inventory.some(item => item.name === '破旗短刀'));
    assert.equal(new Set(['yellow-road', 'yellow-ridge', 'yellow-bridge', 'yellow-siege'].map(map => chapterScenery({ map }))).size, 4);
    settle(store, 'yellow-ridge');
    settle(store, 'yellow-bridge');
    assert.ok(store.progress.owned.includes('caiwenji'));
    assert.ok(store.progress.owned.includes('handang'));
    for (const difficulty of [0, 1, 2]) settle(store, 'yellow-siege', difficulty);
    assert.throws(() => store.startChapter('rift', 2), /长坂围阵翻天首通/);
    assert.ok(store.assignChapterOffline('yellow-rift', 2));
    const run = store.startChapter('yellow-rift', 2);
    assert.deepEqual(env.reopen().progress.chapter.pending, JSON.parse(JSON.stringify(run)));
    const traits = [0, 1, 2].map(seed => ({ trait: chapterRiftTrait(seed).id, options: createChapterOptions({ ...run, seed }) }));
    const iron = traits.find(entry => entry.trait === 'iron').options;
    const arrows = traits.find(entry => entry.trait === 'arrows').options;
    const regen = traits.find(entry => entry.trait === 'regen').options;
    assert.ok(iron.waves[4].length > arrows.waves[4].length);
    assert.ok(arrows.waves.flat().filter(unit => unit.weapon === 'bow').length > iron.waves.flat().filter(unit => unit.weapon === 'bow').length);
    assert.equal(regen.enemyRegen, .02);
    assert.ok(store.settleChapter(run.id, true).saved);
    assert.ok(store.progress.owned.includes('huatuo'));
    env.roll = .99;
    settle(store, 'yellow-rift', 2);
    assert.ok(!store.progress.inventory.some(item => item.id === 'signature-huatuo'));
    env.roll = delveRoll('yellow-rift', drop => drop.item?.exclusive === 'huatuo');
    settle(store, 'yellow-rift', 2);
    assert.ok(store.progress.inventory.some(item => item.id === 'signature-huatuo'));
});


test('横版战斗从出场到接敌，混排远近战也保留相邻角色的中心间距', () => {
    for (const mode of ['main', 'city']) {
        for (const spot of FORMATION_SPOTS) {
            for (const other of FORMATION_SPOTS.filter(entry => entry.id !== spot.id)) {
                const a = chapterAllyPosition(spot.id, mode);
                const b = chapterAllyPosition(other.id, mode);
                for (const rangedA of [false, true]) {
                    for (const rangedB of [false, true]) {
                        for (const remaining of [1, .75, .5, .25, 0]) {
                            const ax = rangedA ? a.x : approachX(a.x - 90, meleeContactX(mode === 'city', true, a.x), remaining, 1);
                            const bx = rangedB ? b.x : approachX(b.x - 90, meleeContactX(mode === 'city', true, b.x), remaining, 1);
                            assert.ok(Math.hypot(ax - bx, a.y - b.y) >= 58);
                        }
                    }
                }
            }
        }
    }
});


test('五十章各八图和一处赤门可完整解锁，所有武将及其专武都有归属', () => {
    assert.equal(CHAPTERS.length, 50);
    const roster = CHAPTERS.flatMap(chapter => chapterRiftPool(chapter.rift));
    assert.deepEqual([...new Set(roster)].sort(), HERO_CATALOG.map(hero => hero.id).sort());
    const env = profile(.99, { level: 150, longbanTrial: false });
    const { store } = env;
    for (const chapter of CHAPTERS) {
        env.now += DAY_MS;
        const maps = chapterMaps(chapter.index);
        assert.equal(maps.length, 8);
        assert.equal(new Set(maps.map(map => map.name)).size, 8);
        for (const map of maps) settle(store, map.id);
        assert.equal(store.completeChapterEnding(chapter.index), true);
        settle(store, maps[7].id, 1);
        settle(store, maps[7].id, 2);
        assert.equal(chapterRift(chapter.index).id, chapter.rift);
        const run = store.startChapter(chapter.rift, 2);
        assert.equal(run.target, undefined);
        assert.equal(createChapterOptions(run).waves.length, 5);
        assert.ok(store.abandonChapter());
    }
});

test('主线十枚赤门令之外可攻城多刷六枚，赤门入场只扣一次', () => {
    const env = profile(.99);
    const store = env.store;
    unlockRift(store);
    for (let win = 0; win < 3; win++) settle(store, 'assault');
    for (let win = 0; win < 9; win++) settle(store, 'road');
    assert.equal(store.progress.chapter.delveTickets, 16);
    assert.equal(store.progress.daily.delveEarned, 16);
    assert.equal(store.progress.daily.assaultDelveEarned, 6);
    env.fail = true;
    assert.throws(() => store.startChapter('rift', 2), /存档不可用/);
    assert.equal(store.progress.chapter.delveTickets, 16);
    env.fail = false;
    const run = store.startChapter('rift', 2);
    assert.equal(env.reopen().progress.chapter.delveTickets, 15);
    assert.equal(env.reopen().progress.chapter.pending.target, undefined);
    const options = createChapterOptions(run);
    assert.equal(options.waves[3][0].visualId, 'delve-jar');
    assert.ok(options.waves[4].filter(unit => unit.kind === 'boss').length >= 2);
    assert.ok(options.waves[4].some(unit => unit.kind === 'soldier'));
    const giantCounts = new Set([0,3,6].map(seed => createChapterOptions({ ...run, seed }).waves[4].filter(unit => unit.kind === 'boss').length));
    assert.deepEqual([...giantCounts].sort(), [2,3]);
    const engine = new BattleEngine({ ...options, heroes: options.heroes.map(unit => ({ ...unit, attack: 50000, maxHp: 50000 })) });
    const events = [];
    while (engine.status === 'fighting') { engine.advance(.05); events.push(...engine.drainEvents()); }
    assert.equal(engine.status, 'won');
    assert.deepEqual(events.filter(event => event.type === 'wave').map(event => event.wave), [1,2,3,4]);
    assert.ok(events.findIndex(event => event.type === 'wall-break' && event.target === 'delve-jar') < events.findIndex(event => event.type === 'boss'));
    store.settleChapter(run.id, true);
    settle(store, 'road');
    assert.equal(store.progress.chapter.delveTickets, 15);
    env.now += DAY_MS;
    settle(store, 'road');
    assert.equal(store.progress.chapter.delveTickets, 16);
    assert.equal(store.progress.daily.delveEarned, 1);
    assert.equal(store.assignChapterOffline('road', 0), null);
    env.now += 4 * 60 * MINUTE;
    assert.ok(store.claimChapterOffline().saved);
    assert.equal(store.progress.chapter.delveTickets, 25);
    assert.equal(store.progress.daily.delveEarned, 10);
    assert.equal(store.progress.daily.assaultDelveEarned, 0);
});


test('战图掉落详情和结算共用同一装备数据，存档失败时不展示已获装备', () => {
    const env = profile(0);
    const store = env.store;
    const run = store.startChapter('yellow-road', 0);
    env.fail = true;
    assert.equal(store.settleChapter(run.id, true).previews, undefined);
    env.fail = false;
    const rewards = store.settleChapter(run.id, true);
    assert.ok(rewards.saved);
    assert.ok(rewards.previews.some(preview => preview.detail.hero === 'chengpu' && /程普/.test(rewards.lines[preview.index])));
    const item = rewards.previews.find(preview => preview.detail.item).detail.item;
    assert.deepEqual(item, chapterFirstEquipment('yellow-road', item.id));
    assert.deepEqual(store.progress.inventory.find(gear => gear.id === item.id), item);
    const repeat = store.startChapter('yellow-road', 0);
    const regular = store.settleChapter(repeat.id, true).previews.find(preview => preview.detail.item).detail.item;
    assert.deepEqual(regular, chapterEquipment('yellow-road', 0, regular.id));
    assert.notEqual(regular.name, chapterEquipment('yellow-road', 1, regular.id).name);
});


test('体力按波数在入场扣除，恢复和药铺都在上海时间7点结算', () => {
    const env = profile(.999, { longbanTrial: false });
    const store = env.store;
    env.now += 6 * 60 * MINUTE + 59 * MINUTE;
    let stamina = 300;
    for (let i = 0; i < 4; i++) {
        stamina -= chapterStaminaCost(settle(store, 'yellow-road'));
        assert.equal(store.campaignSupply.stamina, stamina);
    }
    for (let i = 0; i < 4; i++) assert.equal(store.buyTonic('rage'), null);
    assert.match(store.buyTonic('rage'), /买满4瓶/);
    assert.equal(store.useTonic('rage'), null);
    const before = store.campaignSupply;
    env.fail = true;
    assert.throws(() => store.startChapter('yellow-road', 0), /存档不可用/);
    assert.deepEqual(store.campaignSupply, before);
    env.fail = false;
    const boosted = store.startChapter('yellow-road', 0);
    stamina -= chapterStaminaCost(boosted);
    assert.equal(boosted.rageTonic, true);
    assert.equal(env.reopen().progress.chapter.pending.rageTonic, true);
    assert.deepEqual(env.reopen().campaignSupply, { stamina, rage: { bought: 4, bottles: 3, runs: 9 }, speed: { bought: 0, bottles: 0, runs: 0 } });
    assert.ok(store.abandonChapter());
    for (;;) {
        try { store.startChapter('yellow-road', 0); }
        catch (error) { assert.equal(error.message, '体力不足，恢复后可再出战'); break; }
        assert.equal(store.abandonChapter(), true);
    }
    assert.ok(store.campaignSupply.stamina < 4);
    const exhausted = store.progress;
    assert.equal(store.campaignSupply.rage.runs, 0);
    assert.throws(() => store.startChapter('yellow-road', 0), /体力不足/);
    assert.deepEqual(store.progress, exhausted);
    env.now += MINUTE;
    assert.deepEqual(store.campaignSupply, { stamina: 300, rage: { bought: 0, bottles: 3, runs: 0 }, speed: { bought: 0, bottles: 0, runs: 0 } });
    const normal = store.startChapter('yellow-road', 0);
    const cost = chapterStaminaCost(normal);
    assert.equal(normal.rageTonic, undefined);
    env.now -= MINUTE;
    assert.equal(store.campaignSupply.stamina, 300 - cost);
});

test('五十章都有开篇与收尾漫画，首章结算分开显示击杀与通关经验，第二章受等级限制', () => {
    for (const chapter of CHAPTERS) {
        assert.equal(chapterDialogue(chapter.index, 'intro').length, 3);
        assert.equal(chapterDialogue(chapter.index, 'outro').length, 3);
    }
    const { store } = profile(.999, { longbanTrial: false });
    assert.equal(store.hasChapterIntro(0), false);
    const first = store.startChapter('yellow-road', 0);
    assert.equal(store.hasChapterIntro(0), true);
    const result = store.settleChapter(first.id, true, 0, 19);
    assert.deepEqual(result.experience, { combat: 19, clear: 24 });
    assert.equal(store.progress.experience, 43);
    for (const map of ['yellow-ridge','yellow-bridge']) settle(store, map);
    const finale = store.startChapter('yellow-siege', 0);
    assert.equal(store.settleChapter(finale.id, true).storyChapter, 0);
    assert.match(store.chapterEntryLock('tiger-1', 0), /Lv\.5/);
    assert.throws(() => store.startChapter('tiger-1', 0), /Lv\.5/);
    const repeat = store.startChapter('yellow-siege', 0);
    assert.equal(store.settleChapter(repeat.id, true).storyChapter, undefined);
    const failed = store.startChapter('yellow-road', 0);
    assert.deepEqual(store.settleChapter(failed.id, false, 0, 5).experience, { combat: 5, clear: 0 });
});

test('普通推图进入首领房之前聚气未满，主公在首领房普攻后首次施放', () => {
    const { store } = profile();
    const run = store.startChapter('yellow-road', 0);
    const engine = new BattleEngine(createChapterOptions(run));
    let boss = false;
    let leadSwings = 0;
    let firstCast = false;
    while (engine.status === 'fighting') {
        engine.advance(.05);
        for (const event of engine.drainEvents()) {
            if (event.type === 'boss') boss = true;
            if (boss && event.type === 'attack' && event.source === CHAPTER_PROTAGONIST_ID) leadSwings++;
            if (event.type === 'skill' && event.source === CHAPTER_PROTAGONIST_ID && !firstCast) {
                assert.equal(boss, true);
                assert.ok(leadSwings >= 1 && leadSwings <= 3);
                firstCast = true;
            }
        }
    }
    assert.ok(firstCast);
    assert.ok(engine.enemyExperience >= 20);
});


test('高伤害和精英击杀允许首领房前满怒，怒气不由房间切换发放', () => {
    const { store } = profile();
    const run = store.startChapter('yellow-road', 0);
    const normal = createChapterOptions(run);
    const enriched = createChapterOptions({ ...run, difficulty: 2 });
    assert.ok(enriched.heroEnergyMultiplier > normal.heroEnergyMultiplier);
    const lead = enriched.heroes[0];
    const wave = Array.from({ length: 10 }, (_, index) => ({
        ...enriched.waves[0][0], id: 'test-elite-' + index, maxHp: 1, elite: true, attack: 0, riftValue: 2,
    }));
    const engine = new BattleEngine({ ...enriched, heroes: [{ ...lead, attack: 10000, interval: .1 }], waves: [wave], riftGoal: 60 });
    engine.autoSkill = false;
    for (let elapsed = 0; elapsed < 4; elapsed += .05) engine.advance(.05);
    assert.equal(engine.bossActive, false);
    assert.equal(engine.heroes[0].energy, 100);
});

test('疾行汤与鼓劲汤独立计数，世界首领不消耗疾行汤', () => {
    const { store } = profile(.999, { longbanTrial: false });
    for (let win = 0; win < 3; win++) settle(store, 'yellow-road');
    assert.equal(store.buyTonic('speed'), null);
    assert.equal(store.buyTonic('rage'), null);
    assert.equal(store.useTonic('speed'), null);
    assert.equal(store.useTonic('rage'), null);
    const worldBoss = store.startChapter('duel', 0);
    assert.equal(worldBoss.speedTonic, undefined);
    assert.equal(worldBoss.rageTonic, true);
    assert.equal(store.campaignSupply.speed.runs, 10);
    assert.equal(store.campaignSupply.rage.runs, 9);
    assert.ok(store.abandonChapter());
    const main = store.startChapter('yellow-road', 0);
    assert.equal(main.speedTonic, true);
    assert.equal(main.rageTonic, true);
    assert.equal(store.campaignSupply.speed.runs, 9);
});


test('开篇确认可在未出战时存档，章末对白随首通持久化并在确认后清除', () => {
    const env = profile(.99, { longbanTrial: false });
    const store = env.store;
    assert.equal(store.completeChapterIntro(1), false);
    env.fail = true;
    assert.equal(store.completeChapterIntro(0), false);
    assert.equal(store.hasChapterIntro(0), false);
    env.fail = false;
    assert.equal(store.completeChapterIntro(0), true);
    assert.equal(env.reopen().hasChapterIntro(0), true);
    assert.equal(store.campaignSupply.stamina, 300);
    assert.equal(store.progress.chapter.pending, null);

    for (const map of ['yellow-road','yellow-ridge','yellow-bridge']) settle(store, map);
    const finale = store.startChapter('yellow-siege', 0);
    env.fail = true;
    assert.equal(store.settleChapter(finale.id, true).saved, false);
    assert.equal(store.pendingChapterEnding, null);
    env.fail = false;
    assert.equal(store.settleChapter(finale.id, true).storyChapter, 0);
    assert.equal(env.reopen().pendingChapterEnding, 0);
    assert.match(store.chapterEntryLock('tiger-1', 0), /Lv\.5/);
    env.fail = true;
    assert.equal(store.completeChapterEnding(0), false);
    assert.equal(store.pendingChapterEnding, 0);
    env.fail = false;
    assert.equal(store.completeChapterEnding(0), true);
    assert.equal(env.reopen().pendingChapterEnding, null);
    const replay = store.startChapter('yellow-siege', 0);
    assert.equal(store.settleChapter(replay.id, true).storyChapter, undefined);
    assert.equal(store.pendingChapterEnding, null);
});


test('战报下一关沿主线地图顺序跨章，奇战营关卡不生成下一关', () => {
    assert.equal(nextCampaignMap('yellow-road')?.id, 'yellow-ridge');
    assert.equal(nextCampaignMap('yellow-7')?.id, 'yellow-siege');
    assert.equal(nextCampaignMap('yellow-siege')?.id, 'tiger-1');
    assert.equal(nextCampaignMap('star-8').id, 'bell-1');
    assert.equal(nextCampaignMap('homefire-8'), undefined);
    for (const side of ['yellow-rift', 'duel', 'assault', 'workshop']) assert.equal(nextCampaignMap(side), undefined);
});

test('主公已到后续章节等级也只播放按序解锁的漫画', () => {
    const { store } = profile(.999, { level: 12, longbanTrial: false });
    assert.equal(store.canStartChapterStory(0), true);
    assert.equal(store.canStartChapterStory(2), false);
    assert.equal(store.completeChapterIntro(2), false);
    for (const map of ['yellow-road', 'yellow-ridge', 'yellow-bridge', 'yellow-siege']) settle(store, map);
    assert.equal(store.pendingChapterEnding, 0);
    assert.equal(store.canStartChapterStory(1), false);
    assert.throws(() => store.startChapter('tiger-1', 0), /收尾漫画/);
    assert.equal(store.completeChapterEnding(0), true);
    assert.equal(store.canStartChapterStory(1), true);
    assert.equal(store.canStartChapterStory(2), false);
    for (const map of [0, 1, 2, 7].map(index => CHAPTERS[1].maps[index])) settle(store, map);
    assert.equal(store.pendingChapterEnding, 1);
    assert.equal(store.completeChapterEnding(1), true);
    assert.equal(store.canStartChapterStory(2), true);
});


test('战图按随机敌群的击杀能量决定2–4波，能量满前不会刷首领', () => {
    const env = profile();
    const store = env.store;
    const run = store.startChapter('yellow-road', 0);
    assert.equal(run.dynamicRift, true);
    assert.equal(run.monsterWaves, undefined);
    assert.equal(store.campaignSupply.stamina, 300 - chapterStaminaCost(run));
    assert.deepEqual(env.reopen().progress.chapter.pending, JSON.parse(JSON.stringify(run)));

    const counts = [0, 0, 0];
    const seeds = new Map();
    const sizes = new Set();
    const eliteCounts = new Set();
    for (let i = 1; i <= 5000; i++) {
        const seeded = { ...run, seed: chapterSeed(i) };
        const options = createChapterOptions(seeded);
        const waves = chapterStaminaCost(seeded);
        assert.ok(waves >= 2 && waves <= 4);
        counts[waves - 2]++;
        if (!seeds.has(waves)) seeds.set(waves, seeded);
        sizes.add(options.waves[0].length);
        eliteCounts.add(options.waves[0].filter(unit => unit.elite).length);
    }
    assert.deepEqual([...sizes].sort(), [6, 7, 8]);
    assert.deepEqual([...eliteCounts].sort(), [0, 1, 2]);
    [1000, 3000, 1000].forEach((target, i) => assert.ok(Math.abs(counts[i] - target) < 150));

    for (const [waves, seeded] of seeds) {
        const options = createChapterOptions(seeded);
        assert.equal(options.riftGoal, 30);
        const engine = new BattleEngine({ ...options, heroes: options.heroes.map(hero => ({ ...hero, attack: 50000 })) });
        const rooms = [];
        while (engine.status === 'fighting') {
            engine.advance(.05);
            for (const event of engine.drainEvents()) {
                if (event.type === 'wave') {
                    assert.ok(engine.riftEnergy < engine.riftGoal);
                    rooms.push('mobs');
                }
                if (event.type === 'boss') {
                    assert.equal(engine.riftEnergy, engine.riftGoal);
                    rooms.push('boss');
                }
            }
        }
        assert.deepEqual(rooms, [...Array(waves - 1).fill('mobs'), 'boss']);
    }
});

test('旧战图快照延续原波数、首领进度和已扣体力', () => {
    const env = profile();
    env.store.startChapter('yellow-road', 0, true);
    env.editSave(save => {
        delete save.chapter.pending.dynamicRift;
        save.chapter.pending.monsterWaves = 2;
        save.chapter.supply.spent = 15;
    });
    const store = env.reopen();
    const run = store.progress.chapter.pending;
    assert.equal(chapterStaminaCost(run), 15);
    assert.equal(store.campaignSupply.stamina, 285);
    const options = createChapterOptions(run);
    assert.equal(options.waves.length, 2);
    assert.equal(options.riftGoal, options.waves.flat().reduce((total, unit) => total + unit.riftValue, 0));
});

test('五倍结算快照一场波数与五次掉落，失败扣全额，满包逐件寄存', () => {
    const env = profile(.01);
    const store = env.store;
    const failure = store.startChapter('road', 0, true);
    const cost = chapterStaminaCost(failure);
    assert.equal(cost, chapterStaminaCost({ ...failure, extraRolls: undefined }) * 5);
    assert.equal(store.campaignSupply.stamina, 300 - cost);
    assert.deepEqual(store.settleChapter(failure.id, false, 0, 3).experience, { combat: 20, clear: 0 });
    assert.equal(store.progress.coins, 0);
    assert.equal(store.progress.chapter.clears.road, undefined);

    while (store.progress.inventory.length < store.inventoryCapacity) store.settleVictory(`batch-fill-${store.progress.inventory.length}`, 1);
    const before = store.progress;
    const run = store.startChapter('road', 0, true);
    assert.equal(run.extraRolls.length, 4);
    const loaded = env.reopen();
    assert.deepEqual(loaded.progress.chapter.pending.extraRolls, run.extraRolls);
    env.fail = true;
    assert.equal(loaded.settleChapter(run.id, true).saved, false);
    assert.equal(loaded.progress.chapter.reserve, null);
    env.fail = false;
    const result = loaded.settleChapter(run.id, true);
    assert.equal(result.experience.clear, 165);
    assert.equal(loaded.progress.coins - before.coins, 600);
    assert.equal(loaded.progress.chapter.delveTickets - before.chapter.delveTickets, 5);
    assert.equal(result.previews.filter(preview => preview.detail.item).length, 5);
    assert.equal(result.previews.filter(preview => preview.detail.item?.name === '长坂行军枪').length, 1);
    const saved = env.reopen();
    assert.equal(saved.progress.chapter.reserveQueue.length, 4);
    const reserved = [saved.progress.chapter.reserve, ...saved.progress.chapter.reserveQueue];
    for (let i = 0; i < reserved.length; i++) {
        assert.equal(saved.recycleEquipment(before.inventory[i].id), null);
        assert.equal(saved.claimChapterReserve(), null);
    }
    assert.equal(saved.progress.chapter.reserve, null);
    assert.ok(reserved.every(item => saved.progress.inventory.some(gear => gear.id === item.id)));
});

test('奇战营免体力，攻城与换班按入场限次，魔王练习仍能领取伤害档奖励', () => {
    const env = profile(.99);
    const store = env.store;
    unlockRift(store);
    const stamina = store.campaignSupply.stamina;
    const tickets = store.progress.chapter.delveTickets;
    settle(store, 'rift', 2);
    assert.equal(store.progress.chapter.delveTickets, tickets - 1);
    for (const map of ['workshop', 'assault']) {
        for (let i = 0; i < 3; i++) settle(store, map, 0, false);
        assert.throws(() => store.startChapter(map, 0), /次数已用完/);
    }
    for (let i = 0; i < 3; i++) settle(store, 'duel');
    const practice = store.startChapter('duel', 0);
    assert.equal(practice.duelPractice, true);
    const reloaded = env.reopen();
    const coins = reloaded.progress.coins;
    const grades = duelGrades(practice.bossId, practice.level);
    const report = reloaded.settleChapter(practice.id, true, grades.at(-1).damage);
    assert.equal(reloaded.progress.coins - coins, grades.reduce((sum, tier) => sum + tier.coins, 0));
    assert.equal(report.experience.clear, 0);
    assert.ok(report.previews.some(preview => preview.detail.item?.name === grades.at(-1).item.name));
    const next = reloaded.startChapter('duel', 0);
    assert.equal(reloaded.settleChapter(next.id, true, 60000).previews.length, 0);
    assert.equal(reloaded.campaignSupply.stamina, stamina);
    env.now += 7 * 60 * MINUTE;
    assert.equal(reloaded.challengeAttemptsLeft('assault'), 3);
    assert.equal(reloaded.challengeAttemptsLeft('duel'), 3);
});

test('主线可混刷三种装备，赤门普通掉落复用主线配置，惊坛粉装用独立掉落', () => {
    const env = profile(.26);
    const store = env.store;
    settle(store, 'road');
    const run = store.startChapter('road', 0);
    assert.equal(store.settleChapter(run.id, true).previews.find(preview => preview.detail.item).detail.item.slot, 'weapon');
    assert.equal(new Set(chapterGearPool('road', 0).map(drop => drop.slot)).size, 3);
    assert.ok(chapterGearPool('tiger-1', 2)[0].rate > chapterGearPool('yellow-road', 0)[0].rate);
    unlockRift(store);
    const [shared, , , rare] = chapterDelveGear('rift', 'check');
    assert.equal(shared.rate, 8);
    assert.deepEqual(shared.item, chapterEquipment('siege', 2, 'check', shared.item.slot));
    env.roll = delveRoll('rift', drop => drop.item?.name === rare.item.name);
    settle(store, 'rift', 2);
    assert.ok(store.progress.inventory.some(item => item.name === rare.item.name && item.rarity === 4));
});

test('赤门池覆盖每位本章武将和专武，沿用旧的未完挑战快照', () => {
    for (const chapter of CHAPTERS) {
        const pool = chapterDelvePool(chapter.rift, 'preview');
        assert.deepEqual(pool.filter(drop => drop.kind === 'officer').map(drop => drop.hero).sort(), [...chapter.heroes].sort());
        assert.deepEqual(pool.filter(drop => drop.kind === 'signature').map(drop => drop.item.exclusive).sort(), [...chapter.heroes].sort());
        assert.deepEqual(chapterDelvePool(chapter.rift, 'preview', {}).filter(drop => drop.kind === 'relic').map(drop => drop.rate), [1, 1]);
        assert.ok(pool.every(drop => drop.rate > 0));
        assert.ok(pool.reduce((sum, drop) => sum + drop.rate, 0) <= 71.00001);
        for (const drop of pool) {
            const roll = delveRoll(chapter.rift, entry => entry.hero && entry.hero === drop.hero || entry.item?.name && entry.item.name === drop.item?.name);
            assert.deepEqual(chapterDelveDrop({ map: chapter.rift, roll, lootVersion: 2 }, 'preview'), drop);
        }
    }
    const env = profile(.019);
    unlockRift(env.store);
    const run = env.store.startChapter('rift', 2);
    env.editSave(save => { delete save.chapter.pending.lootVersion; Object.assign(save.chapter.pending, { target: 'spear', targetHero: 'zhaoyun' }); });
    const restored = env.reopen();
    assert.equal(restored.progress.chapter.pending.id, run.id);
    assert.equal(createChapterOptions(restored.progress.chapter.pending).waves.length, 5);
    assert.ok(restored.settleChapter(run.id, true).saved);
    assert.ok(restored.progress.inventory.some(item => item.id === 'signature-zhaoyun'));
});

test('打磨逐级提价，分解返还实际打磨投入的一半，保存失败可安全重试', () => {
    const env = profile(0);
    settle(env.store, 'yellow-road');
    settle(env.store, 'yellow-road');
    env.editSave(save => { save.coins = 1000; save.chapter.materials[0] = 40; });
    const store = env.reopen();
    const [item, old] = store.progress.inventory;
    const baseline = equipmentRecycleYield(item);
    assert.equal(baseline.sand, 0);
    const spent = { sand: 0, coins: 0 };
    for (let i = 0; i < 3; i++) {
        const current = store.progress.inventory.find(gear => gear.id === item.id);
        spent.sand += tuningMaterialCost(current, 0);
        spent.coins += tuningCoinCost(current, 0);
        assert.equal(store.tuneEquipment(item.id, 0), null);
    }
    const restored = env.reopen();
    const before = restored.progress;
    const polished = before.inventory.find(gear => gear.id === item.id);
    assert.equal(polished.polish, 3);
    assert.deepEqual(polished.polishSpend, spent);
    assert.equal(before.chapter.materials[0], 40 - spent.sand);
    assert.equal(before.coins, 1000 - spent.coins);
    env.fail = true;
    assert.match(restored.recycleEquipment(item.id), /存档失败/);
    assert.deepEqual(restored.progress, before);
    env.fail = false;
    assert.equal(restored.recycleEquipment(item.id), null);
    assert.equal(restored.progress.coins, before.coins + baseline.coins + Math.floor(spent.coins / 2));
    assert.equal(restored.progress.chapter.materials[0], before.chapter.materials[0] + Math.floor(spent.sand / 2));
    assert.match(restored.recycleEquipment(item.id), /不存在/);

    env.editSave(save => { save.inventory.find(gear => gear.id === old.id).polish = 2; });
    const legacy = env.reopen();
    const oldItem = legacy.progress.inventory.find(gear => gear.id === old.id);
    assert.deepEqual(equipmentRecycleYield(oldItem), { ...equipmentRecycleYield(old), sand: 6 });
});

test('材料随主公等级和战图进度增加，旧攻城场次按原奖励结算', () => {
    const env = profile(0, { level: 20 });
    settle(env.store, 'yellow-road');
    const before = env.store.progress.chapter.materials[0];
    settle(env.store, 'workshop');
    settle(env.store, 'workshop');
    assert.equal(env.store.progress.chapter.materials[0] - before, 59);
    assert.equal(workshopMaterialReward(30, true), 39);
    assert.equal(campaignMaterialReward('yellow-siege', 2), 3);
    assert.equal(campaignMaterialReward('star-8', 2), 6);
    assert.equal(chapterEquipment('yellow-4', 1, 'preview').name, ASSAULT_ARMOR_DROP.item.name);

    const old = env.store.startChapter('assault', 0);
    env.editSave(save => { delete save.chapter.pending.assaultTickets; delete save.chapter.pending.lootVersion; delete save.daily.assaultDelveEarned; save.daily.delveEarned = 10; });
    const restored = env.reopen();
    const tickets = restored.progress.chapter.delveTickets;
    assert.ok(restored.settleChapter(old.id, true).previews.some(reward => reward.detail.item?.name === ASSAULT_ARMOR_DROP.item.name));
    assert.equal(restored.progress.chapter.delveTickets, tickets);
    const next = restored.startChapter('assault', 0);
    env.fail = true;
    assert.equal(restored.settleChapter(next.id, true).saved, false);
    assert.equal(restored.progress.chapter.delveTickets, tickets);
    env.fail = false;
    assert.ok(restored.settleChapter(next.id, true).saved);
    assert.equal(restored.progress.daily.delveEarned, 12);
    assert.equal(restored.progress.daily.assaultDelveEarned, 2);
    assert.equal(restored.progress.chapter.delveTickets, tickets + 2);
});

test('50章解锁上限149级，剧情已读在第33和50章不会与低位章冲突', () => {
    assert.equal(CHAPTER_MIN_LEVELS.at(-1), 149);
    const env = profile(.99, { level: 149, longbanTrial: false });
    env.editSave(save => {
        for (const chapter of CHAPTERS.slice(0, 32)) save.chapter.clears[chapter.maps[7]] = 1;
    });
    let store = env.reopen();
    assert.equal(store.completeChapterIntro(32), true);
    assert.equal(store.hasChapterIntro(0), false);
    assert.equal(env.reopen().hasChapterIntro(32), true);
    env.editSave(save => {
        for (const chapter of CHAPTERS.slice(32, 49)) save.chapter.clears[chapter.maps[7]] = 1;
    });
    store = env.reopen();
    assert.equal(store.completeChapterIntro(49), true);
    assert.equal(env.reopen().hasChapterIntro(49), true);
    assert.equal(env.reopen().hasChapterIntro(17), false);
});

test('五档共色，普通图只在后段翻天有0.3%过渡粉，惊坛独占高粉与橙', () => {
    assert.deepEqual(RARITY_COLORS, ['#FFFFFF', '#68D5ED', '#B36BFF', '#FF00FF', '#FFB400']);
    assert.equal(signatureFor('zhangfei').rarity, 4);
    assert.equal(signatureFor('guanyu').rarity, 5);
    for (const chapter of CHAPTERS) {
        for (const map of chapterMaps(chapter.index)) {
            for (const difficulty of [0, 1, 2]) {
                const drops = chapterGearPool(map.id, difficulty);
                const field = drops.filter(drop => drop.fieldPink);
                assert.equal(field.length, chapter.index >= 7 && difficulty === 2 ? 1 : 0);
                for (const drop of field) {
                    assert.equal(drop.rate, .3);
                    assert.equal(chapterDropEquipment(map.id, difficulty, 'preview', drop).rarity, 4);
                }
                assert.ok(drops.every(drop => chapterDropEquipment(map.id, difficulty, 'preview', drop).rarity < 5));
            }
        }
        const gear = chapterDelveGear(chapter.rift, 'preview');
        for (const [rarity, expected] of [[4, 12], [5, 3]]) {
            const drops = gear.filter(drop => drop.item.rarity === rarity);
            assert.ok(Math.abs(drops.reduce((sum, drop) => sum + drop.rate, 0) - expected) < 1e-8);
            assert.ok(drops.every(drop => ['chapter-protagonist', ...chapter.heroes].some(id => canWear(id, drop.item))));
        }
    }
});

test('粉橙装备的武器、战甲、兵符限制适用于手动穿戴、全队配装和重载', () => {
    const env = profile(.99);
    const base = { stage: 42, attack: 100, defense: 20, maxHp: 700 };
    env.editSave(save => {
        save.owned.push('zhangfei');
        save.inventory = [
            { ...base, id: 'sword', name: '粉剑', rarity: 4, slot: 'weapon', appearance: 'sword' },
            { ...base, id: 'pike', name: '橙矛', rarity: 5, slot: 'weapon', appearance: 'serpent' },
            { ...base, id: 'cloth', name: '橙袍', rarity: 5, slot: 'armor', appearance: 'armor', armorType: 'cloth' },
            { ...base, id: 'heavy', name: '粉甲', rarity: 4, slot: 'armor', appearance: 'armor', armorType: 'heavy' },
            { ...base, id: 'charm', name: '橙符', rarity: 5, slot: 'charm', appearance: 'charm', charmType: 'guard' },
        ];
    });
    const store = env.reopen();
    assert.equal(store.saveChapterFormation({ protagonistSpot: 'r1c2', companions: [{ spot: 'r0c2', hero: 'zhangfei' }] }), null);
    assert.equal(store.equip(CHAPTER_PROTAGONIST_ID, 'pike'), false);
    assert.equal(store.equip(CHAPTER_PROTAGONIST_ID, 'cloth'), false);
    assert.equal(store.equip('zhangfei', 'sword'), false);
    assert.equal(store.equipChapterTeam(), 2);
    assert.deepEqual(store.progress.loadouts[CHAPTER_PROTAGONIST_ID], { weapon: 'sword' });
    assert.deepEqual(store.progress.loadouts.zhangfei, { weapon: 'pike', armor: 'heavy', charm: 'charm' });
    for (const id of [CHAPTER_PROTAGONIST_ID, 'zhangfei']) assert.deepEqual(env.reopen().progress.loadouts[id], store.progress.loadouts[id]);
});

test('打磨失败不掉级，保底下一次必成，跨品级续火显示溢出并原子保存', () => {
    const env = profile(.99);
    const base = { stage: 24, rarity: 1, name: '锻造测试', slot: 'weapon', attack: 1, defense: 1, maxHp: 1 };
    env.editSave(save => {
        save.coins = 500000;
        save.chapter.materials[0] = 5000;
        save.chapter.transferSeals = 2;
        save.inventory = [
            { ...base, id: 'test' },
            { ...base, id: 'source', rarity: 5, appearance: 'sword', polish: 11 },
            { ...base, id: 'target', polish: 11 },
            { ...base, id: 'target2', rarity: 4, appearance: 'spear' },
        ];
    });
    const store = env.reopen();
    assert.equal(store.tuneEquipment('test', 0), null);
    for (let i = 0; i < 5; i++) assert.match(store.tuneEquipment('test', 0), /未成功/);
    let current = env.reopen().progress.inventory[0];
    assert.equal(current.polish, 1);
    assert.equal(current.polishEnergy, polishEnergyNeeded(current));
    assert.equal(store.tuneEquipment('test', 0), null);
    current = store.progress.inventory[0];
    assert.equal(current.polish, 2);
    assert.equal(current.polishEnergy, 0);
    const before = store.progress;
    const [, source, target] = before.inventory;
    const result = polishTransfer(source, target);
    assert.equal(result.level, MAX_POLISH);
    assert.ok(result.overflow > 0);
    assert.match(store.transferPolish('source', 'target'), /会溢出/);
    assert.deepEqual(store.progress, before);
    env.fail = true;
    assert.match(store.transferPolish('source', 'target', result.overflow), /已保留/);
    assert.deepEqual(store.progress, before);
    env.fail = false;
    assert.equal(store.transferPolish('source', 'target', result.overflow), null);
    assert.equal(env.reopen().progress.inventory[1].polish, 0);
    assert.equal(env.reopen().progress.inventory[2].polish, MAX_POLISH);
    assert.equal(env.reopen().progress.chapter.transferSeals, 1);
    assert.equal(store.transferPolish('test', 'target2'), null);
    assert.equal(env.reopen().progress.chapter.transferSeals, 0);
});

test('高等级攻城提高门票上限并掉续火券，魔王奖励分档不重复领取', () => {
    const env = profile(.001, { level: 150, longbanTrial: false });
    const { store } = env;
    settle(store, 'yellow-road');
    const before = store.progress.coins;
    for (let i = 0; i < 3; i++) settle(store, 'assault');
    const p = env.reopen().progress;
    assert.equal(p.daily.assaultDelveEarned, assaultTicketCap(150));
    assert.equal(p.daily.assaultDelveEarned, 21);
    assert.equal(p.chapter.transferSeals, 3);
    assert.equal(p.coins - before, 3 * 2594);
    const bosses = ['dongzhuo', 'zhangjiao', 'menghuo'];
    const tracks = bosses.map(boss => duelGrades(boss, 150));
    assert.equal(new Set(tracks.map(track => track.at(-1).item.name)).size, 3);
    assert.deepEqual(tracks.map(track => track[0].material), [0, 1, 2]);
    assert.ok(tracks.every(track => track.length === 8 && track[7].damage > 100000000));
});
