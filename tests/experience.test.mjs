import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperienceStore, EXPERIENCE_GIFT, EXPERIENCE_KEY } from '../assets/battle/ExperienceMode.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { LocalSession } from '../assets/battle/LocalSession.ts';
const memory = () => { const data = new Map(); return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };

test('体验补给单向复制常规进度，五种资源入独立档，常规档与开发档不被写入', () => {
    const disk = memory(), normal = new ProgressStore(disk);
    normal.settleVictory('phone-first', 1);
    const before = new Map(disk.data), first = createExperienceStore(disk);
    assert.equal(first.granted, true); assert.equal(first.store.developerMode, false);
    assert.equal(first.store.progress.highestCleared, 1);
    for (const key of Object.keys(EXPERIENCE_GIFT)) assert.equal(first.store.progress[key], normal.progress[key] + EXPERIENCE_GIFT[key]);
    for (const [key, value] of before) assert.equal(disk.getItem(key), value);
    assert.equal(disk.data.size, before.size + 1); assert.ok(disk.data.has(EXPERIENCE_KEY));
});
test('补给只发一次，升级/抽卡花费后重载不会补满，切回standard仍是原常规档', () => {
    const disk = memory(), first = createExperienceStore(disk);
    assert.equal(first.store.upgradeTeam().upgraded, true); first.store.recruit(10);
    const after = first.store.progress, next = createExperienceStore(disk);
    assert.equal(next.granted, false); assert.equal(next.store.progress.daibi, after.daibi);
    assert.equal(next.store.progress.experience, after.experience); assert.equal(next.store.progress.heroLevel, 2);
    const standard = new LocalSession(disk, '', false, { serviceMode: 'local', localProfile: 'standard' }).initial();
    assert.equal(standard.progress.daibi, 0); assert.equal(standard.progress.heroLevel, 1);
    const internal = new LocalSession(disk, '', false, { serviceMode: 'local', localProfile: 'experience' }).initial();
    assert.equal(internal.progress.daibi, after.daibi); assert.equal(internal.developerMode, false);
});
test('存储被拒绝时仍能体验且标记未保存，不覆盖正常数据', () => {
    const disk = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const { store } = createExperienceStore(disk);
    assert.equal(store.storageAvailable, false); assert.equal(store.progress.daibi, EXPERIENCE_GIFT.daibi);
    assert.equal(store.upgradeTeam().saved, false);
});
