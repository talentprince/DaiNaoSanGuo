import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperienceStore, EXPERIENCE_MULTIPLIER, EXPERIENCE_KEY } from '../assets/battle/ExperienceMode.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { LocalSession } from '../assets/battle/LocalSession.ts';
import { xpRequired } from '../assets/data/GrowthConfig.ts';
const memory = () => { const data = new Map(); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };

test('体验版只有双倍经验加成，默认走新体验档，旧补给和常规档保留', () => {
    const disk = memory();
    const legacy = 'dainaosanguo.experience.progress.v1';
    disk.setItem(legacy, JSON.stringify({ progress: { coins: 10000000 } }));
    const standard = new ProgressStore(disk);
    standard.settleVictory('phone-first', 1);
    const before = new Map(disk.data), first = createExperienceStore(disk);
    assert.equal(first.granted, true);
    assert.equal(first.store.experienceMultiplier, 2);
    for (const key of ['coins', 'daibi', 'points', 'souls', 'experience', 'highestCleared']) assert.equal(first.store.progress[key], 0);
    assert.equal(first.store.progress.inventory.length, 0);
    assert.equal(first.store.progress.chapter.delveTickets, 0);
    for (const [key, value] of before) assert.equal(disk.getItem(key), value);
    assert.ok(disk.data.has(EXPERIENCE_KEY));
    assert.equal(new LocalSession(disk, 'localhost').initial().developerMode, false);
    assert.equal(createExperienceStore(disk).granted, false);
});
test('倍率作用于挂机与战斗经验，胜利币、票、装备与常规规则一致', () => {
    const outcomes = [1, EXPERIENCE_MULTIPLIER].map(experienceMultiplier => {
        let now = Date.parse('2026-11-06T01:00:00+08:00');
        const store = new ProgressStore(memory(), () => now, () => .99, { experienceMultiplier });
        const run = store.startChapter('yellow-road', 0);
        const battle = store.settleChapter(run.id, true);
        assert.equal(battle.experience.clear, 24 * experienceMultiplier);
        assert.equal(store.assignChapterOffline('yellow-road', 0), null);
        now += 20 * 60 * 1000;
        assert.equal(store.claimExperience(), 0);
        assert.match(store.claimChapterOffline().lines[0], /已结算 1 场/);
        return store.progress;
    });
    const [standard, boost] = outcomes;
    const total = progress => progress.experience + Array.from({ length: progress.heroLevel - 1 }, (_, index) => xpRequired(index + 1)).reduce((sum, xp) => sum + xp, 0);
    assert.equal(total(boost), total(standard) * EXPERIENCE_MULTIPLIER);
    assert.ok(boost.heroLevel > standard.heroLevel);
    for (const key of ['coins', 'daibi', 'points', 'souls', 'owned', 'inventory', 'chapter']) assert.deepEqual(boost[key], standard[key]);
});
test('存储被拒绝时仍能体验并标记未保存', () => {
    const disk = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const { store } = createExperienceStore(disk);
    assert.equal(store.storageAvailable, false);
    assert.equal(store.progress.daibi, 0);
});
