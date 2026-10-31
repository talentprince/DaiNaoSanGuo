import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { HERO_CATALOG,getHero } from '../assets/data/HeroCatalog.ts';
import { FEMALE_HEROES } from '../assets/data/HeroIdentity.ts';
import { applyBonds,bondProgress } from '../assets/data/BondConfig.ts';
import { createHeroes,createLineup } from '../assets/data/BattleConfig.ts';
import { createDeveloperStore,configureDeveloper,isLocalDevelopment,DEV_KEY } from '../assets/battle/DeveloperMode.ts';
import { ProgressStore } from '../assets/battle/ProgressStore.ts';
const config=(id,changes={})=>({id,name:id,kind:'hero',heroTier:3,tactic:'cleave',maxHp:10000,attack:100,defense:0,interval:999,priority:0,color:'#FFFFFF',...changes});
function fight(element='fire',tier=3){const e=new BattleEngine({heroes:[config('caster',{element,heroTier:tier})],waves:[Array.from({length:5},(_,i)=>config(`foe${i}`,{kind:'soldier'}))],seed:1});e.autoSkill=false;e.heroes[0].energy=100;return e;}
test('44将中8位女将，小乔为神将，新增女将有来源且无普通治疗',()=>{
 assert.equal(HERO_CATALOG.length,44);assert.equal(FEMALE_HEROES.length,8);assert.ok(FEMALE_HEROES.every(id=>getHero(id)));assert.equal(getHero('xiaoqiao').tier,4);assert.equal(getHero('xiaoqiao').element,'blizzard');
 assert.ok(['daqiao','zhurong','zhenji'].every(id=>getHero(id).storyStage));assert.ok(HERO_CATALOG.filter(h=>h.tier===1).every(h=>h.tactic!=='heal'));
});
test('羁绊看实际同阵，重复ID不凑人数，拥有但未上阵不触发',()=>{
 assert.equal(bondProgress(['guanyu','guanyu','liubei']).find(p=>p.bond.id==='peach').active,false);
 assert.equal(bondProgress(['guanyu','liubei','zhangfei']).find(p=>p.bond.id==='peach').active,true);
 const one=applyBonds(createHeroes(['guanyu']));assert.deepEqual(one[0].bondIds,[]);assert.equal(one[0].attack,getHero('guanyu').attack);
});
test('桃园/五虎属性确实增强且只给成员，原配置不被修改、重复应用不叠加',()=>{
 const raw=createHeroes(['guanyu','zhangfei','liubei','huatuo']);const before=structuredClone(raw);const bonded=applyBonds(raw);
 assert.equal(bonded[0].attack,Math.round(raw[0].attack*1.16));assert.equal(bonded[0].maxHp,Math.round(raw[0].maxHp*1.12));assert.equal(bonded[3].maxHp,raw[3].maxHp);
 assert.deepEqual(raw,before);assert.deepEqual(applyBonds(bonded),bonded);
});
test('小兵不计羁绊，阵型工厂会应用真实羁绊',()=>{
 const raw=createHeroes(['guanyu','zhangfei','liubei']);raw[2].kind='soldier';assert.equal(applyBonds(raw)[0].bondIds.includes('peach'),false);
 const lineup=createLineup([{hero:'guanyu',spot:'r0c1'},{hero:'zhangfei',spot:'r1c2'},{hero:'liubei',spot:'r2c0'}],1);assert.ok(lineup[0].bondIds.includes('peach'));
});
test('二乔/巾帼蓄能和治疗加成进入引擎，未上阵的女将不帮忙凑羁绊',()=>{
 const qiao=applyBonds(createHeroes(['daqiao','xiaoqiao']));assert.ok(qiao.every(u=>u.bondEnergy===.15||Math.abs(u.bondEnergy-.15)<1e-9));assert.equal(qiao[0].bondHealing,.10);
 const e=new BattleEngine({heroes:qiao,waves:[[config('enemy',{kind:'soldier',maxHp:1e8})]],seed:1});e.autoSkill=false;e.heroes[0].hp=100;e.heroes[0].energy=100;e.castSkill('daqiao');assert.equal(e.heroes[0].hp,100+Math.floor(e.heroes[0].maxHp*.12*1.1));
 const alone=applyBonds(createHeroes(['xiaoqiao']));assert.equal(alone[0].bondEnergy,0);
});
test('名将火技能只对3名原目标灼烧4秒，不把持续伤害扩为全场',()=>{
 const e=fight();e.castSkill();const before=e.enemies.map(u=>u.hp);assert.equal(e.enemies.filter(u=>u.burnRemaining>0).length,3);e.heroes[0].cooldown=999;e.enemies.forEach(u=>u.cooldown=999);e.advance(4.1);
 assert.equal(e.enemies[0].hp,before[0]-48);assert.deepEqual(e.enemies.slice(3).map(u=>u.hp),before.slice(3));assert.ok(e.enemies.every(u=>u.burnRemaining===0&&u.burnPower===0));
});
test('冰雪实际减速25%，4秒后恢复；暂停冻结负面状态',()=>{
 const e=fight('blizzard',4);e.castSkill();assert.ok(e.enemies.every(u=>u.slow===.25));e.paused=true;e.advance(100);assert.equal(e.enemies[0].slowRemaining,4);e.paused=false;e.enemies[0].cooldown=10;e.advance(1);assert.ok(Math.abs(e.enemies[0].cooldown-9.25)<1e-7);e.advance(3.1);assert.equal(e.enemies[0].slow,0);
});
test('中毒抑疗25%实际生效，到期恢复原治疗量',()=>{
 const e=fight('poison',4);e.enemies[0].kind='hero';e.enemies[0].tactic='heal';e.castSkill();e.enemies[0].hp=100;e.enemies[0].energy=100;e.castSkill('foe0');assert.equal(e.enemies[0].hp,1000);
 e.enemies[0].energy=0;e.heroes[0].cooldown=999;e.enemies.forEach(u=>u.cooldown=999);e.advance(4.1);e.enemies[0].hp=100;e.enemies[0].energy=100;e.castSkill('foe0');assert.equal(e.enemies[0].hp,1300);
});
test('持续伤害可被盾吸收；施法者阵亡、仍有队友时已经施加的灼烧继续',()=>{
 const e=fight();e.castSkill();e.enemies[0].shield=100;e.enemies[0].shieldRemaining=6;const hp=e.enemies[0].hp;e.heroes.push({...e.heroes[0],id:'friend',hp:1000,attack:0,cooldown:999});e.heroes[0].hp=0;e.enemies.forEach(u=>u.cooldown=999);e.advance(.5);assert.equal(e.enemies[0].hp,hp);assert.equal(e.enemies[0].shield,94);
});
test('负面状态刷新不无限叠加，旧灼烧到期后不能借用旧高伤害',()=>{
 const e=fight();e.castSkill();e.heroes[0].energy=100;e.castSkill();assert.equal(e.enemies[0].burnPower,12);e.heroes[0].cooldown=999;e.enemies.forEach(u=>u.cooldown=999);e.advance(4.1);
 e.heroes[0].attack=10;e.heroes[0].energy=100;e.castSkill();assert.equal(e.enemies[0].burnPower,1.2);
});
test('治疗有3.6秒随身状态，满血也有施法表现，不复活',()=>{
 const e=fight('heal');e.heroes[0].tactic='heal';e.castSkill();assert.equal(e.heroes[0].healGlowRemaining,3.6);e.paused=true;e.advance(20);assert.equal(e.heroes[0].healGlowRemaining,3.6);e.paused=false;e.advance(3.7);assert.equal(e.heroes[0].healGlowRemaining,0);
});
test('本地开发识别拒绝远程地址和伪装域名，支持微信devtools标记',()=>{
 for(const host of ['localhost','127.0.0.1','::1','[::1]'])assert.equal(isLocalDevelopment(host),true);
 for(const host of ['example.com','localhost.example.com','127.0.0.1.example.com','192.168.1.2',''])assert.equal(isLocalDevelopment(host),false);
 assert.equal(isLocalDevelopment('',true),true);
});
function memory(){const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),map};}
test('独立开发档拥有全部44将、Lv300/6星与132件配装，不改正常存档字节',()=>{
 const disk=memory();const normal=new ProgressStore(disk);normal.settleVictory('normal',1);const before=disk.getItem('dainaosanguo.demo.progress.v1');
 const dev=createDeveloperStore(disk);const p=dev.progress;assert.equal(p.owned.length,44);assert.equal(p.heroLevel,300);assert.ok(p.owned.every(h=>p.stars[h]===6));assert.equal(p.inventory.length,132);assert.equal(dev.inventoryCapacity,160);assert.equal(Object.keys(p.loadouts).length,44);
 assert.equal(disk.getItem('dainaosanguo.demo.progress.v1'),before);assert.equal(new ProgressStore(disk).inventoryCapacity,40);
});
test('开发参数可降等级/星级/换地图，重开保留；重置不重复堆物品',()=>{
 const disk=memory();createDeveloperStore(disk);const dev=configureDeveloper(disk,{level:30,stars:3,stage:100});assert.equal(dev.progress.heroLevel,30);assert.equal(dev.progress.highestCleared,99);assert.equal(dev.progress.stars.xiaoqiao,3);
 assert.equal(createDeveloperStore(disk).progress.heroLevel,30);const reset=createDeveloperStore(disk,Date.now,Math.random,true);assert.equal(reset.progress.heroLevel,300);assert.equal(reset.progress.inventory.length,132);
 assert.throws(()=>configureDeveloper(disk,{level:301,stars:6,stage:999}));
});
test('开发档损坏可重建，存储拒绝时仍可会话测试并明确未保存',()=>{
 const disk=memory();disk.setItem(DEV_KEY,'broken');assert.equal(createDeveloperStore(disk).progress.owned.length,44);
 const failed=createDeveloperStore({getItem:()=>null,setItem:()=>{throw Error('denied');}});assert.equal(failed.progress.heroLevel,300);assert.equal(failed.progress.owned.length,44);assert.equal(failed.storageAvailable,false);
});
