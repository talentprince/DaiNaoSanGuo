import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperienceStore, EXPERIENCE_MULTIPLIER, EXPERIENCE_KEY } from '../assets/battle/ExperienceMode.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { LocalSession } from '../assets/battle/LocalSession.ts';
const memory = () => { const data = new Map(); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };

test('体验版只有挂机经验倍率，默认走新体验档，旧补给和常规档保留', () => {
    const disk = memory();
    const legacy = 'dainaosanguo.experience.progress.v1';
    disk.setItem(legacy, JSON.stringify({ progress: { coins: 10000000 } }));
    const standard = new ProgressStore(disk);
    standard.settleVictory('phone-first', 1);
    const before = new Map(disk.data), first = createExperienceStore(disk);
    assert.equal(first.granted, true);
    assert.equal(first.store.experienceMultiplier, EXPERIENCE_MULTIPLIER);
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
        store.settleChapter(run.id, true);
        now += 20 * 60 * 1000;
        const preview = store.experiencePreview();
        assert.equal(store.claimExperience(), preview.amount);
        return store.progress;
    });
    const [standard, boost] = outcomes;
    assert.equal(boost.experience, standard.experience * EXPERIENCE_MULTIPLIER);
    assert.equal(standard.experience, 271);
    for (const key of ['coins', 'daibi', 'points', 'souls', 'owned', 'inventory', 'chapter']) assert.deepEqual(boost[key], standard[key]);
});
test('存储被拒绝时仍能体验并标记未保存', () => {
    const disk = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const { store } = createExperienceStore(disk);
    assert.equal(store.storageAvailable, false);
    assert.equal(store.progress.daibi, 0);
});
