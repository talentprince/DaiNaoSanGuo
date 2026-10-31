import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore, DAY_MS, createEquipment } from '../assets/battle/ProgressStore.ts';
import { HERO_CATALOG, STARTER_PARTY } from '../assets/data/HeroCatalog.ts';
import { createMainlineOptions, createHeroes } from '../assets/data/BattleConfig.ts';
import { createActivityOptions } from '../assets/data/ActivityConfig.ts';
import { slotOf, signatureFor, SLOT_ORDER } from '../assets/data/EquipmentConfig.ts';
import { MAX_LEVEL, XP_DAILY_MS, xpRequired, stageFactor, levelFactor } from '../assets/data/GrowthConfig.ts';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
const NOW=Date.UTC(2026,9,31,0);
function fixture(extra={},rng=()=>0.1){let now=NOW;let value=null;const disk={getItem:()=>value,setItem:(_,v)=>{value=v;}};const p=new ProgressStore(disk,()=>now).progress;value=JSON.stringify({...p,...extra});return{store:new ProgressStore(disk,()=>now,rng),disk,advance:ms=>{now+=ms;},get now(){return now;}};}
const rich=extra=>fixture({owned:HERO_CATALOG.map(h=>h.id),points:100000,coins:100000,daibi:100000,...extra});
test('999关/300级数值有限且增长，1000关与301级拒绝',()=>{
    for(const stage of [1,50,100,499,999]){const b=createMainlineOptions(stage,1,300);assert.ok(b.waves.flat().every(u=>Number.isSafeInteger(u.maxHp)&&u.maxHp>0));}
    assert.ok(stageFactor(999)>stageFactor(998));assert.ok(levelFactor(300)>levelFactor(299));assert.throws(()=>createMainlineOptions(1000));assert.throws(()=>createMainlineOptions(1,1,301));
});
test('重复刷主线不给即时经验，铜钱再多也不能无经验升级',()=>{
    const f=fixture({coins:1000000});for(let i=0;i<20;i++)f.store.settleVictory(`r${i}`,1);
    assert.equal(f.store.progress.experience,0);assert.equal(f.store.upgradeTeam().upgraded,false);assert.equal(f.store.progress.heroLevel,1);
});
test('经验离线缓存最多4小时、同日多次领取合计封顶；重载不复制',()=>{
    const f=fixture();f.store.settleVictory('start',1);f.advance(5*3600000);const p=f.store.experiencePreview();
    assert.equal(p.minutes,240);const first=f.store.claimExperience();assert.equal(first,Math.floor(240*12.35));
    f.advance(3*3600000);assert.equal(f.store.claimExperience(),0);assert.equal(f.store.progress.daily.xpUsedMs,XP_DAILY_MS);
    const reload=new ProgressStore(f.disk,()=>f.now);assert.equal(reload.claimExperience(),0);assert.equal(reload.progress.experience,first);
});
test('长离线不叠加7天经验；上海新一天恢复4h预算，倒时钟不刷新',()=>{
    const f=fixture({highestCleared:10});f.advance(DAY_MS*7);const n=f.store.claimExperience();assert.equal(n,Math.floor(240*15.5));
    f.advance(-DAY_MS);assert.equal(f.store.claimExperience(),0);assert.equal(f.store.progress.daily.xpUsedMs,XP_DAILY_MS);
    f.advance(DAY_MS*2);assert.ok(f.store.claimExperience()>0);assert.equal(f.store.progress.daily.xpUsedMs,XP_DAILY_MS);
});
test('分次经验领取保留整数余数，不能通过频繁领取突破日上限',()=>{
    const a=fixture({highestCleared:7});const b=fixture({highestCleared:7});
    for(let i=0;i<240;i++){a.advance(60000);a.store.claimExperience();}b.advance(XP_DAILY_MS);b.store.claimExperience();
    assert.equal(a.store.progress.experience,b.store.progress.experience);assert.equal(a.store.progress.xpRemainder,b.store.progress.xpRemainder);
});
test('推到更高地图不追溯放大过去经验，换图先按旧图结算',()=>{
    const f=fixture({highestCleared:1});f.advance(60000);f.store.settleVictory('higher',100);
    assert.equal(f.store.progress.experience,12);f.advance(60000);assert.equal(f.store.claimExperience(),47);assert.equal(f.store.progress.experience,59);
});
test('升级同时消费经验铜钱，到300级后不再消费',()=>{
    const f=fixture({coins:1000,experience:xpRequired(1)});assert.equal(f.store.upgradeTeam().upgraded,true);assert.equal(f.store.progress.experience,0);assert.equal(f.store.progress.coins,880);
    const full=fixture({heroLevel:MAX_LEVEL,coins:10000,experience:100000});const before=full.store.progress;assert.equal(full.store.upgradeTeam().upgraded,false);assert.deepEqual(full.store.progress,before);
});
test('三种装备槽均有掉落和外观，三件属性汇总，一物不能两将共用',()=>{
    const f=rich();let n=0;while(f.store.progress.inventory.length<35)f.store.settleVictory(`loot${n++}`,1);
    const items=SLOT_ORDER.map(slot=>f.store.progress.inventory.find(i=>slotOf(i)===slot));assert.ok(items.every(i=>i&&i.appearance));
    items.forEach(i=>assert.equal(f.store.equip('guanhai',i.id),true));const bonus=f.store.getEquipmentBonuses().guanhai;
    assert.equal(bonus.attack,items.reduce((a,i)=>a+i.attack,0));assert.equal(Object.keys(f.store.progress.loadouts.guanhai).length,3);
    f.store.equip('caohong',items[1].id);assert.equal(f.store.progress.loadouts.guanhai.armor,undefined);assert.equal(f.store.progress.loadouts.caohong.armor,items[1].id);
    f.store.unequip('caohong','armor');assert.equal(f.store.progress.inventory.length,35);
});
test('旧单武器穿戴迁移至weapon格，保留旧脑勋和武将等级',()=>{
    const item={...createEquipment(4,'legacy'),slot:undefined,appearance:undefined};const f=fixture({equipped:{guanhai:item.id},loadouts:undefined,inventory:[item],points:315,heroLevel:18});
    assert.equal(f.store.progress.loadouts.guanhai.weapon,item.id);assert.equal(f.store.progress.points,315);assert.equal(f.store.progress.heroLevel,18);assert.equal(f.store.progress.experience,0);
});
test('专武700脑勋仅兑换一次、仅本人可穿，不能分解',()=>{
    const f=rich({points:1400});assert.equal(f.store.redeemSignature('guanyu'),null);assert.equal(f.store.progress.points,700);
    assert.ok(f.store.redeemSignature('guanyu'));assert.equal(f.store.progress.points,700);assert.equal(f.store.equip('zhaoyun','signature-guanyu'),false);
    assert.equal(f.store.equip('guanyu','signature-guanyu'),true);assert.equal(f.store.getEquipmentBonuses().guanyu.signature,'guanyu');
    assert.ok(f.store.recycleEquipment('signature-guanyu'));f.store.unequip('guanyu');assert.ok(f.store.recycleEquipment('signature-guanyu'));
});
test('专武背包满/未有武将/钱不足均不扣脑勋',()=>{
    const f=fixture({points:700});const before=f.store.progress;assert.ok(f.store.redeemSignature('guanyu'));assert.equal(f.store.progress.points,before.points);
    for(let i=0;i<40;i++)f.store.settleVictory(`bag${i}`,1);assert.ok(f.store.redeemSignature('guanhai'));assert.equal(f.store.progress.points,700);
    const poor=fixture({points:699});assert.ok(poor.store.redeemSignature('guanhai'));assert.equal(poor.store.progress.points,699);
});
test('40武将均可1至6星、优先本将碎片再将魂、满星不再消费',()=>{
    const f=rich({souls:100000,fragments:{guanhai:10}});for(const h of HERO_CATALOG){for(let i=0;i<5;i++)assert.equal(f.store.starUp(h.id),null);assert.equal(f.store.progress.stars[h.id],6);}
    const before=f.store.progress.souls;assert.ok(f.store.starUp('guanhai'));assert.equal(f.store.progress.souls,before);assert.equal(f.store.progress.fragments.guanhai,0);
    const reload=new ProgressStore(f.disk,()=>f.now);assert.equal(reload.progress.stars.guanyu,6);
});
test('重复招募同时给20本将碎片，能升星但不能改变品级',()=>{
    const f=fixture({daibi:100});const r=f.store.recruit(1)[0];assert.equal(r.duplicate,true);assert.equal(r.fragments,20);assert.equal(f.store.progress.fragments[r.hero],20);
    assert.equal(f.store.starUp(r.hero),null);assert.equal(f.store.progress.stars[r.hero],2);assert.equal(f.store.progress.fragments[r.hero],0);
});
test('升星和专武改变真实属性/技能，既有副本快照不被后续养成修改',()=>{
    const f=rich({souls:20});f.store.setParty(['guanyu','zhangfei','liubei'],'trial');const run=f.store.startActivity('trial');const before=createActivityOptions(run);
    f.store.starUp('guanyu');f.store.redeemSignature('guanyu');f.store.equip('guanyu','signature-guanyu');
    assert.deepEqual(createActivityOptions(f.store.progress.pending),before);const grown=createHeroes(['guanyu'],1,f.store.getEquipmentBonuses())[0];assert.ok(grown.attack>before.heroes[0].attack);assert.equal(grown.signature,'guanyu');
});
test('专武治疗量+25%，不对敌造成治疗伤害；速攻专武缩短普攻间隔',()=>{
    const options=sig=>({heroes:[{...createHeroes(['huatuo'])[0],signature:sig}],waves:[[{...createHeroes(['guanyu'])[0],id:'enemy'}]],seed:1});
    const a=new BattleEngine(options(undefined));const b=new BattleEngine(options('huatuo'));[a,b].forEach(e=>{e.heroes[0].hp=100;e.heroes[0].energy=100;e.castSkill();});
    assert.ok(b.heroes[0].hp>a.heroes[0].hp);assert.equal(b.enemies[0].hp,b.enemies[0].maxHp);
    assert.ok(createHeroes(['sunshangxiang'],1,{sunshangxiang:{attack:0,defense:0,maxHp:0,signature:'sunshangxiang'}})[0].interval<createHeroes(['sunshangxiang'])[0].interval);
});
function daily(s,won=true){for(let i=0;i<3;i++){const r=s.startActivity('city');s.settleActivity(r.id,won);}const boss=s.startActivity('boss');s.settleActivity(boss.id,false,won?50000:0);for(let i=0;i<2;i++){const r=s.startActivity('boat',['wind','guard','repair']);s.settleActivity(r.id,won);}}
test('满额日程恰好100脑勋、将魂≤20；14天名将、21天神将预算可复现',()=>{
    const f=fixture();for(let day=0;day<21;day++){daily(f.store);assert.equal(f.store.progress.daily.medalEarned,100);assert.ok(f.store.progress.daily.soulEarned<=20);if(day===13)assert.equal(f.store.progress.points,1400);if(day<20)f.advance(DAY_MS);}
    assert.equal(f.store.progress.points,2100);assert.equal(f.store.exchange('guanyu'),null);assert.equal(f.store.progress.points,0);
});
test('失败日仍得70脑勋，重复Boss不复制奖励，将魂/脑勋按日刷新',()=>{
    const f=fixture();daily(f.store,false);assert.equal(f.store.progress.points,70);const before=f.store.progress;const r=f.store.startActivity('boss');const reward=f.store.settleActivity(r.id,false,0);
    assert.equal(reward.points,0);assert.equal(reward.daibi,0);assert.equal(f.store.progress.souls,before.souls);f.advance(DAY_MS);assert.equal(f.store.progress.daily.medalEarned,0);assert.equal(f.store.progress.daily.soulEarned,0);
});
test('三将连续首通脑勋受每日100上限，领取后重载无重复',()=>{
    const f=fixture();for(let i=0;i<15;i++){const r=f.store.startActivity('trial');f.store.settleActivity(r.id,true);}
    assert.equal(f.store.progress.points,100);assert.equal(f.store.progress.daily.medalEarned,100);assert.ok(f.store.progress.souls<=20);const reload=new ProgressStore(f.disk,()=>f.now);assert.equal(reload.progress.points,100);
});
test('专武与6星增伤生效，名将仍不能突破3目标上限',()=>{
    const make=(signature,stars)=>new BattleEngine({heroes:[{...createHeroes(['luxun'])[0],signature,stars}],waves:[Array.from({length:5},(_,i)=>({...createHeroes(['guanhai'])[0],id:`foe${i}`,maxHp:100000}))],seed:1});
    const a=make(undefined,1);const b=make('luxun',6);[a,b].forEach(e=>{e.energy=100;e.castSkill();});
    assert.equal(b.enemies.filter(u=>u.hp<u.maxHp).length,3);assert.ok(b.damageDealt>a.damageDealt*1.45);
    assert.throws(()=>createHeroes(['guanyu'],1,{guanyu:{attack:0,defense:0,maxHp:0,signature:'zhaoyun'}}));
});
test('3星蓄能更快，护阵专武提升护盾且不扩充攻击目标',()=>{
    const make=(stars,signature)=>new BattleEngine({heroes:[{...createHeroes(['zhangfei'])[0],stars,signature}],waves:[Array.from({length:5},(_,i)=>({...createHeroes(['guanhai'])[0],id:`foe${i}`,maxHp:100000}))],seed:1});
    const a=make(1,undefined);const b=make(3,'zhangfei');a.autoSkill=false;b.autoSkill=false;a.advance(1);b.advance(1);assert.ok(b.energy>a.energy);
    a.energy=100;b.energy=100;a.castSkill();b.castSkill();assert.equal(b.heroes[0].shield,Math.floor(b.heroes[0].maxHp*.18));assert.equal(b.enemies.filter(u=>u.hp<u.maxHp).length,3);
});
test('卡关建议随可领经验、可升级与装备空槽改变，提供可执行下一步',()=>{
    const f=fixture({highestCleared:1,coins:1000});assert.match(f.store.growthAdvice(),/装备槽/);f.advance(60000);assert.match(f.store.growthAdvice(),/领取挂机经验/);
    const ready=fixture({highestCleared:1,experience:1000,coins:1000});assert.match(ready.store.growthAdvice(),/提升全队/);
});
test('旧档首次迁移立即保存经验起算点，未打战斗就重开也不重置时钟',()=>{
    const f=fixture({growthVersion:undefined,xpAt:undefined,highestCleared:5});f.advance(3600000);
    const reload=new ProgressStore(f.disk,()=>f.now);assert.equal(reload.progress.xpAt,NOW);assert.equal(reload.claimExperience(),825);
});
