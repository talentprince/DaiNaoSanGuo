import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine, skillTargetLimit } from '../assets/battle/BattleEngine.ts';
import { HERO_CATALOG, HERO_IDS, STARTER_PARTY, getHero } from '../assets/data/HeroCatalog.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { validateFormation, battlePosition } from '../assets/data/FormationConfig.ts';

const unit = (id, changes = {}) => ({ id, name: id, role: '测试', maxHp: 1000, attack: 50, defense: 0, interval: 2,
    priority: 0, color: '#FFFFFF', kind: 'hero', heroTier: 1, tactic: 'cleave', ...changes });
const engine = (caster, friends = [], foes = 5) => {
    const e = new BattleEngine({ heroes: [caster, ...friends], waves: [Array.from({ length: foes }, (_, i) => unit(`enemy-${i}`, { kind: 'soldier', maxHp: 10000 }))], seed: 5 });
    e.autoSkill = false; e.heroes[0].energy = 100; return e;
};
test('40武将ID唯一，普通无治疗，神将无剧情赠送节点，新初始均为普通', () => {
    assert.equal(HERO_CATALOG.length, 40); assert.equal(new Set(HERO_IDS).size, 40);
    assert.ok(HERO_CATALOG.filter(h => h.tier === 1).every(h => h.tactic !== 'heal'));
    assert.ok(HERO_CATALOG.filter(h => h.tier === 4).every(h => !h.storyStage));
    assert.ok(STARTER_PARTY.every(id => getHero(id).tier === 1));
    assert.equal(getHero('guanyu').tier, 4); assert.equal(getHero('liubei').tier, 3); assert.equal(getHero('mizhu').tier, 2);
});
test('普通/骁将/名将攻击技能分别最多1/2/3目标，神将才命中全场', () => {
    for (const [tier, limit] of [[1, 1], [2, 2], [3, 3], [4, 5]]) {
        for (const tactic of ['cleave', 'pierce', 'volley', 'guard']) {
            const e = engine(unit('caster', { heroTier: tier, tactic }));
            assert.equal(e.castSkill(), true);
            assert.equal(e.drainEvents().find(event => event.type === 'skill').targets.length, limit);
            assert.equal(e.enemies.filter(u => u.hp < u.maxHp).length, limit);
        }
    }
    assert.equal(skillTargetLimit({ heroTier: 4 }), Infinity);
});
test('无品级的普通单位不能偷用全场技能，治疗技能不损伤敌方', () => {
    const ordinary = engine(unit('ordinary', { heroTier: undefined })); ordinary.castSkill();
    assert.equal(ordinary.enemies.filter(u => u.hp < u.maxHp).length, 1);
    const healer = engine(unit('healer', { heroTier: 3, tactic: 'heal' }), [unit('a')]);
    healer.heroes[1].hp = 20; healer.castSkill();
    assert.ok(healer.enemies.every(u => u.hp === u.maxHp));
});
test('普通不可施放治疗，骁将治疗只救最低生命比例的一人', () => {
    const invalid = engine(unit('invalid', { heroTier: 1, tactic: 'heal' }));
    assert.equal(invalid.castSkill(), false); assert.equal(invalid.heroes[0].energy, 100);
    const e = engine(unit('healer', { heroTier: 2, tactic: 'heal' }), [unit('a'), unit('b')]);
    e.heroes[0].hp = 900; e.heroes[1].hp = 100; e.heroes[2].hp = 200;
    e.castSkill(); assert.deepEqual(e.heroes.map(u => u.hp), [900, 320, 200]);
    assert.deepEqual(e.drainEvents().find(event => event.type === 'skill').targets, ['a']);
});
test('名将治疗全部存活队友，不超上限、不复活、不附神将状态', () => {
    const e = engine(unit('healer', { heroTier: 3, tactic: 'heal' }), [unit('a'), unit('b'), unit('dead')]);
    e.heroes[0].hp = 950; e.heroes[1].hp = 100; e.heroes[2].hp = 200; e.heroes[3].hp = 0;
    e.castSkill(); assert.deepEqual(e.heroes.map(u => u.hp), [1000, 220, 320, 0]);
    assert.ok(e.heroes.every(u => !u.shield && !u.attackBuff));
});
test('华佗全体治疗并加护盾，护盾吸收伤害且到期消失，不无限叠加', () => {
    const e = engine(unit('huatuo', { heroTier: 4, tactic: 'heal', visualId: 'huatuo' }), [unit('a')], 1);
    e.heroes[1].hp = 100; e.castSkill(); assert.equal(e.heroes[1].hp, 300);
    assert.ok(e.heroes.every(u => u.shield === 120));
    e.heroes[0].energy = 100; e.castSkill(); assert.ok(e.heroes.every(u => u.shield === 120));
    const before = e.heroes.reduce((sum, u) => sum + u.hp, 0); e.enemies[0].cooldown = 0; e.advance(0.05);
    assert.equal(e.heroes.reduce((sum, u) => sum + u.hp, 0), before); assert.ok(e.heroes.some(u => u.shield < 120));
    e.advance(6.1); assert.ok(e.heroes.every(u => u.shield === 0));
});
test('司马懿全体治疗并加20%攻击，暂停冻结状态时间，到期恢复', () => {
    const e = engine(unit('simayi', { heroTier: 4, tactic: 'heal', visualId: 'simayi' }), [unit('a')], 1);
    e.heroes[1].hp = 100; e.castSkill(); assert.equal(e.heroes[1].hp, 260);
    assert.ok(e.heroes.every(u => u.attackBuff === 0.2));
    e.heroes[0].energy = 100; e.castSkill(); assert.ok(e.heroes.every(u => u.attackBuff === 0.2));
    e.paused = true; e.advance(100); assert.ok(e.heroes.every(u => u.attackBuffRemaining === 6));
    e.paused = false; e.advance(6.1); assert.ok(e.heroes.every(u => u.attackBuff === 0));
});
test('神将攻击提升状态确实提高普攻伤害，而非只有图标', () => {
    const a = engine(unit('a'), [], 1); const b = engine(unit('a'), [], 1);
    a.heroes[0].energy = 0; b.heroes[0].energy = 0;
    a.heroes[0].attackBuff = 0.2; a.heroes[0].attackBuffRemaining = 6;
    a.heroes[0].cooldown = 0; b.heroes[0].cooldown = 0; a.advance(0.05); b.advance(0.05);
    assert.ok(a.enemies[0].hp < b.enemies[0].hp);
});
test('品级升级后修复旧三将阵型，保留第一神将与原阵位，超额神将补兵', () => {
    let value = null; const disk = { getItem: () => value, setItem: (_, v) => { value = v; } };
    const seed = new ProgressStore(disk).progress;
    seed.owned = [...new Set([...seed.owned, 'guanyu', 'zhaoyun', 'liubei'])];
    seed.formations.trial = [{ spot: 'r0c1', hero: 'guanyu' }, { spot: 'r1c2', hero: 'zhaoyun' }, { spot: 'r2c0', hero: 'liubei' }];
    value = JSON.stringify(seed); const restored = new ProgressStore(disk).progress;
    assert.equal(validateFormation(restored.formations.trial, restored.owned, 'trial'), null);
    assert.ok(restored.formations.trial.some(e => e.hero === 'guanyu' && e.spot === 'r0c1'));
    assert.ok(restored.formations.trial.some(e => e.hero === 'liubei'));
    assert.ok(restored.formations.trial.some(e => e.spot === 'r1c2' && e.troop));
    assert.ok(restored.owned.includes('zhaoyun'));
});
test('六个城下候选位置全在最右侧城门前方左侧，城上两位仍固定', () => {
    for (let i = 0; i < 6; i++) assert.ok(battlePosition(`ground-${i}`, 'city').x < 200);
    assert.ok(battlePosition('tower-left', 'city').x > 200); assert.ok(battlePosition('tower-right', 'city').x > 200);
});
