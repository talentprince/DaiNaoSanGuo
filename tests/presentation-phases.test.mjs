import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { viewportLayout } from '../assets/data/ViewportLayout.ts';
import { encounterPresentation } from '../assets/data/EncounterPresentation.ts';
const u = (id, extra = {}) => ({ id, name: id, role: '', maxHp: 10000, attack: 0, defense: 0, interval: 1, priority: 0, color: '#ffffff', ...extra });
test('长屏背景按可见高度铺满，安全区内上下HUD扩展，短屏内容等比缩小不裁按钮', () => {
    const tall = viewportLayout(720, 1600, { top: 80, bottom: 40 });
    assert.equal(tall.height, 1600); assert.equal(tall.scale, 1); assert.equal(tall.centerY, -20);
    assert.ok(tall.fieldHeight > 1108); assert.equal(tall.topOffset, -tall.bottomOffset);
    assert.ok(612 + tall.topOffset + tall.centerY < 800 - 80);
    const short = viewportLayout(720, 1000); assert.ok(short.scale < 1); assert.ok(640 * short.scale <= 500);
});
test('攻城守军随镜头显露、主线只在接近末段入画', () => {
    for (const t of [3.3, 2, 1, .5, 0]) assert.equal(encounterPresentation('city', t).enemyX, 0);
    assert.equal(encounterPresentation('city', 2).enemyVisible, true);
    assert.equal(encounterPresentation('city', .5).enemyVisible, true);
    assert.equal(encounterPresentation('main', 1.6).enemyVisible, false);
    assert.equal(encounterPresentation('main', .3).enemyVisible, true);
    assert.equal(encounterPresentation('main', 0).marching, false);
});
test('主线每波先行军接敌，清场后有独立行军段且不隔空普攻/施法', () => {
    const e = new BattleEngine({ heroes: [u('h', { attack: 10000 })], waves: [[u('m', { maxHp: 1 })]],
        bossWave: [u('b')], riftGoal: 100, seed: 2, approachTime: 1.6, interWaveDelay: .3 });
    e.autoSkill = false; e.heroes[0].energy = 100; e.advance(1.5);
    assert.equal(e.enemies[0].hp, 1); assert.equal(e.castSkill(), false);
    e.advance(.5); assert.equal(e.enemies[0].hp, 0); assert.ok(e.transitioning);
    e.advance(.3); assert.equal(e.waveIndex, 1); assert.ok(e.approachRemaining > 0);
    e.drainEvents(); e.advance(.6); assert.equal(e.drainEvents().filter(v => v.type === 'attack').length, 0);
});
test('秘境满条后先预警、再行军、最后接战；暂停冻结预警且不消耗Boss血量', () => {
    const e = new BattleEngine({ heroes: [u('h', { attack: 10000 })], waves: [[u('m', { maxHp: 1 })]],
        bossWave: [u('b', { maxHp: 100000 })], riftGoal: 10, seed: 2, approachTime: 1.6, bossWarningTime: 1.25 });
    e.autoSkill = false; e.advance(2); assert.equal(e.bossActive, true); assert.ok(e.bossWarningRemaining > 0);
    const approach = e.approachRemaining, hp = e.enemies[0].hp;
    e.heroes[0].energy = 100; assert.equal(e.castSkill(), false);
    e.paused = true; const warning = e.bossWarningRemaining; e.advance(5); assert.equal(e.bossWarningRemaining, warning);
    e.paused = false; e.advance(.4); assert.equal(e.approachRemaining, approach); assert.equal(e.enemies[0].hp, hp);
    e.advance(1); assert.equal(e.bossWarningRemaining, 0); assert.ok(e.approachRemaining > 0); assert.equal(e.enemies[0].hp, hp);
    e.advance(3); assert.ok(e.enemies[0].hp < hp);
});
