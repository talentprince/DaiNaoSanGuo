import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { getHero, HERO_CATALOG, STARTER_PARTY } from '../assets/data/HeroCatalog.ts';
import { arrangeParty, autoFormation, completeFormation, validateFormation, battlePosition } from '../assets/data/FormationConfig.ts';
import { createActivityOptions } from '../assets/data/ActivityConfig.ts';
import { createLineup } from '../assets/data/BattleConfig.ts';

const unit = (id, changes = {}) => ({ id, name: id, role: '测试', maxHp: 10000, attack: 30, defense: 0, interval: 1, priority: 0, color: '#FFFFFF', kind: 'hero', ...changes });
function memory() { let value = null; return { getItem: () => value, setItem: (_, v) => { value = v; } }; }
test('阵型接受固定位置的混编刀枪弓，不允许重复武将、重复阵位或未拥有武将', () => {
    const layout = [ { spot: 'r1c2', hero: 'guanhai' }, { spot: 'r0c0', troop: 'bow' }, { spot: 'r2c0', troop: 'bow' },
        { spot: 'r0c1', troop: 'spear' }, { spot: 'r2c1', troop: 'sword' } ];
    assert.equal(validateFormation(layout, STARTER_PARTY, 'main'), null);
    assert.ok(validateFormation([{ ...layout[0] }, ...layout.slice(1).map(e => ({ ...e, spot: 'r1c2' }))], STARTER_PARTY, 'main'));
    assert.ok(validateFormation([{ spot: 'r0c0', hero: 'lvbu' }], STARTER_PARTY, 'main', false));
    assert.ok(validateFormation([{ spot: 'r0c0', hero: 'guanhai' }, { spot: 'r0c1', hero: 'guanhai' }], STARTER_PARTY, 'main', false));
    assert.ok(validateFormation([{ spot: 'outside', troop: 'bow' }], STARTER_PARTY, 'main', false));
});
test('手动阵位、各个小兵类型和三套阵型保存并重载，外部副本不会改写存档', () => {
    const disk = memory(); const s = new ProgressStore(disk);
    const layout = completeFormation([{ spot: 'r2c2', hero: 'guanhai' }, { spot: 'r0c0', troop: 'bow' }, { spot: 'r1c0', troop: 'spear' }], 'main');
    assert.equal(s.saveFormation('main', layout), null);
    const p = new ProgressStore(disk).progress;
    assert.deepEqual(p.formations.main, layout);
    assert.deepEqual(p.formation, ['guanhai']);
    p.formations.main[0].spot = 'r0c0';
    assert.equal(s.progress.formations.main[0].spot, 'r2c2');
    const configs = createLineup(layout, 1);
    assert.equal(configs[0].formationSpot, 'r2c2');
    assert.equal(configs[1].weapon, 'bow'); assert.equal(configs[2].weapon, 'spear');
});
test('纯小兵阵容可玩且副本快照刷新不丢失，不强行塞回初始武将', () => {
    const disk = memory(); const s = new ProgressStore(disk);
    const layout = completeFormation([], 'main');
    assert.equal(s.saveFormation('main', layout), null);
    assert.deepEqual(s.progress.formation, []);
    const run = s.startActivity('boss');
    const restored = new ProgressStore(disk);
    assert.equal(restored.progress.pending.id, run.id);
    const e = new BattleEngine(createActivityOptions(restored.progress.pending));
    assert.equal(e.heroes.length, 5); assert.ok(e.heroes.every(u => u.kind === 'soldier'));
    assert.equal(e.castSkill(e.heroes[0].id), false);
});
test('自动排布不突破三将品质限制，守城始终2人城上3人城下', () => {
    const all = HERO_CATALOG.map(h => h.id);
    for (const mode of ['main', 'trial', 'defense']) {
        const layout = autoFormation(all, mode);
        assert.equal(validateFormation(layout, all, mode), null);
        if (mode === 'defense') assert.equal(layout.filter(e => e.spot.startsWith('tower-')).length, 2);
    }
    const tooMany = arrangeParty(['lvbu', 'caocao', 'guanyu'], 'trial');
    assert.ok(validateFormation(tooMany, all, 'trial'));
});
test('守城阵容必须有两固定城上位置，城下位置与城门建筑区域分离', () => {
    const layout = arrangeParty(STARTER_PARTY, 'defense', 'mixed', STARTER_PARTY.slice(0, 2));
    assert.equal(validateFormation(layout, STARTER_PARTY, 'defense'), null);
    const invalid = layout.map(e => e.spot === 'tower-left' ? { ...e, spot: 'ground-0' } : e);
    assert.ok(validateFormation(invalid, STARTER_PARTY, 'defense'));
    const upper = battlePosition('tower-left', 'city'); const lower = battlePosition('ground-0', 'city');
    assert.ok(upper.y > 180); assert.ok(lower.x < 200);
});
test('副本保留入场阵型快照，后续拖动保存不修改正在打的阵型', () => {
    const s = new ProgressStore(memory()); const r = s.startActivity('trial');
    const before = structuredClone(r.layout);
    const replacement = completeFormation([{ spot: 'r2c0', troop: 'bow' }], 'trial');
    assert.equal(s.saveFormation('trial', replacement), null);
    assert.deepEqual(s.progress.pending.layout, before);
    assert.notDeepEqual(s.progress.formations.trial, before);
});
test('名将神将拥有明确不同的标志武器，而非共用一柄剑', () => {
    for (const [id, weapon] of [['guanyu', 'glaive'], ['zhangfei', 'serpent'], ['zhaoyun', 'spear'], ['zhugeliang', 'fan'], ['liubei', 'dual'], ['lvbu', 'halberd'], ['diaochan', 'ribbon'], ['xuhuang', 'axe']]) {
        assert.equal(getHero(id).weapon, weapon); assert.ok(getHero(id).skillName);
    }
});
test('每名武将独立蓄能与手动释放，释放一人不扣另一人能量，小兵始终无技能', () => {
    const e = new BattleEngine({ heroes: [unit('a', { tactic: 'cleave', heroTier: 3 }), unit('b', { tactic: 'pierce', heroTier: 2 }), unit('soldier', { kind: 'soldier' })],
        waves: [[unit('x', { kind: 'soldier' }), unit('y', { kind: 'soldier' })]], seed: 1 });
    e.autoSkill = false; e.heroes[0].energy = 100; e.heroes[1].energy = 100;
    assert.equal(e.castSkill('a'), true); assert.equal(e.heroes[0].energy, 0); assert.equal(e.heroes[1].energy, 100);
    assert.equal(e.castSkill('b'), true); assert.equal(e.heroes[1].energy, 0);
    e.heroes[2].energy = 100; assert.equal(e.castSkill('soldier'), false);
    const casts = e.drainEvents().filter(event => event.type === 'skill');
    assert.deepEqual(casts.map(event => event.source), ['a', 'b']);
    assert.ok(casts.every(event => event.targets.length === 2));
});
test('自动开关按每名武将就绪独立触发，暂停不蓄能，死亡者无法释放', () => {
    const e = new BattleEngine({ heroes: [unit('a'), unit('b')], waves: [[unit('x', { kind: 'soldier' })]], seed: 1 });
    e.autoSkill = false; e.heroes.forEach(u => { u.energy = 100; }); e.advance(0.05);
    assert.equal(e.skillCount, 0); e.autoSkill = true; e.advance(0.05); assert.equal(e.skillCount, 1); e.advance(.65); assert.equal(e.skillCount, 2);
    const energies = e.heroes.map(u => u.energy); e.paused = true; e.advance(99); assert.deepEqual(e.heroes.map(u => u.energy), energies);
    e.paused = false; e.heroes[0].hp = 0; e.heroes[0].energy = 100; assert.equal(e.castSkill('a'), false);
});
test('敌方名将和Boss也有全场技能，城墙和普通小兵不施法', () => {
    const e = new BattleEngine({ heroes: [unit('a'), unit('b')], waves: [[unit('boss', { kind: 'boss' }), unit('wall', { kind: 'wall' }), unit('m', { kind: 'soldier' })]], seed: 1 });
    e.autoSkill = false; e.enemies.forEach(u => { u.energy = 100; }); e.advance(0.05);
    const casts = e.drainEvents().filter(event => event.type === 'skill');
    assert.equal(casts.length, 1); assert.equal(casts[0].source, 'boss'); assert.equal(casts[0].targets.length, 2);
});
