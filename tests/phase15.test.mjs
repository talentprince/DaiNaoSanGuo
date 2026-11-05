import test from 'node:test';
import assert from 'node:assert/strict';
import {BattlePreferences} from '../assets/data/BattlePreferences.ts';
import {BattleEngine} from '../assets/battle/BattleEngine.ts';
import {createDeveloperStore} from '../assets/battle/DeveloperMode.ts';
import {createActivityOptions} from '../assets/data/ActivityConfig.ts';
import {AudioDirector} from '../assets/battle/AudioDirector.ts';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('首次开发/体验/常规均默认自动，明确关闭仍跨场保留且不会改其他档',()=>{
 const disk=memory();for(const profile of ['test','experience','standard'])assert.equal(new BattlePreferences(disk,profile).autoSkill,true);
 new BattlePreferences(disk,'test').autoSkill=false;assert.equal(new BattlePreferences(disk,'test').autoSkill,false);assert.equal(new BattlePreferences(disk,'experience').autoSkill,true);
});
test('三个真实Boss配置从零能量自动战斗，30秒内我方五将均施法，终结不再施法',()=>{
 for(const boss of ['dongzhuo','zhangjiao','menghuo']){
  const disk=memory(),store=createDeveloperStore(disk);const run=store.startActivity('boss',[],boss);const e=new BattleEngine(createActivityOptions(run));e.autoSkill=new BattlePreferences(disk,'test').autoSkill;
  const cast=new Set();for(let i=0;i<600;i++){e.advance(.05);for(const ev of e.drainEvents())if(ev.type==='skill'&&e.heroes.some(u=>u.id===ev.source))cast.add(ev.source);}
  assert.equal(cast.size,e.heroes.filter(u=>u.kind!=='soldier').length,boss);assert.ok(e.skillCount>=5,boss);const count=e.skillCount;e.advance(3);assert.equal(e.skillCount,count);assert.equal(e.status,'scored');
 }
});
test('低沉双嗡警报完整1.1秒受保护，之后命中恢复，不把新尾音截断',()=>{
 let now=0;const channels=[];const a=new AudioDirector(()=>{const c={src:'',loop:false,volume:0,count:0,play(){this.count++},pause(){},stop(){}};channels.push(c);return c},undefined,()=>now);a.scene('main');a.unlock();a.effect('boss-arrive');now=1000;a.effect('hit-slash');assert.equal(channels[3].count,0);now=1101;a.effect('hit-slash');assert.equal(channels[3].count,1);assert.equal(channels[4].count,1);
});

const fighter=(id,extra={})=>({id,name:id,kind:'hero',heroTier:3,tactic:'cleave',maxHp:1000,attack:10,defense:0,interval:999,priority:0,color:'#FFFFFF',...extra});
function hurtFight(attack=100,extra={}){const e=new BattleEngine({heroes:[fighter('p',extra)],waves:[[fighter('foe',{heroTier:4,attack,maxHp:1e8})]],energyRate:0,seed:42});e.autoSkill=false;e.heroes[0].cooldown=e.enemies[0].cooldown=999;return e;}
const enemySkill=e=>{e.enemies[0].energy=100;assert.equal(e.castSkill('foe'),true)};
test('受伤聚气按真实失血比例，伤越重越多；同样比例不同血量获得相同能量',()=>{
 const a=hurtFight(20),b=hurtFight(100),c=hurtFight(200,{maxHp:2000});for(const e of [a,b,c])enemySkill(e);
 for(const e of [a,b,c])assert.ok(Math.abs(e.heroes[0].energy-(e.heroes[0].maxHp-e.heroes[0].hp)/e.heroes[0].maxHp*100)<1e-8);
 assert.ok(b.heroes[0].energy>a.heroes[0].energy);assert.ok(Math.abs(c.heroes[0].energy-b.heroes[0].energy)<.06);
});
test('护盾吸收不聚气，部分吸收只算真实失血；致死不回能且小兵不聚气',()=>{
 const full=hurtFight();full.heroes[0].shield=999;full.heroes[0].shieldRemaining=6;enemySkill(full);assert.equal(full.heroes[0].energy,0);
 const part=hurtFight();part.heroes[0].shield=20;part.heroes[0].shieldRemaining=6;enemySkill(part);assert.ok(Math.abs(part.heroes[0].energy-(1000-part.heroes[0].hp)/10)<1e-8);
 const fatal=hurtFight(10000);enemySkill(fatal);assert.equal(fatal.heroes[0].hp,0);assert.equal(fatal.heroes[0].energy,0);
 const soldier=hurtFight(100,{kind:'soldier'});enemySkill(soldier);assert.ok(soldier.heroes[0].hp<1000);assert.equal(soldier.heroes[0].energy,0);
});
test('灼烧/中毒伤害也聚气，暂停冻结；星级羁绊沿用聚气倍率，上限100',()=>{
 for(const element of ['fire','poison']){const e=hurtFight();e.enemies[0].element=element;enemySkill(e);e.heroes[0].energy=0;const hp=e.heroes[0].hp;e.paused=true;e.advance(1);assert.equal(e.heroes[0].hp,hp);assert.equal(e.heroes[0].energy,0);e.paused=false;e.advance(.5);assert.ok(e.heroes[0].hp<hp);assert.ok(Math.abs(e.heroes[0].energy-(hp-e.heroes[0].hp)/10)<1e-8);}
 const boosted=hurtFight(100,{stars:3,bondEnergy:.1});enemySkill(boosted);assert.ok(Math.abs(boosted.heroes[0].energy-(1000-boosted.heroes[0].hp)/10*1.21)<1e-8);
 boosted.heroes[0].energy=99;enemySkill(boosted);assert.equal(boosted.heroes[0].energy,100);
});
test('受伤满气后自动施法，不需要再次点击开关；护盾挡住伤害不会假满气',()=>{
 const e=hurtFight(20);e.autoSkill=true;e.heroes[0].energy=99;enemySkill(e);assert.equal(e.heroes[0].energy,100);e.advance(.05);assert.equal(e.skillCount,1);assert.ok(e.heroes[0].energy<100);
 const blocked=hurtFight(20);blocked.autoSkill=true;blocked.heroes[0].energy=99;blocked.heroes[0].shield=999;blocked.heroes[0].shieldRemaining=6;enemySkill(blocked);blocked.advance(.05);assert.equal(blocked.skillCount,0);
});
test('双方武将按失血公平聚气，计分Boss/城墙不因挨打无限施法',()=>{
 for(const kind of ['hero','boss','wall']){const e=hurtFight();e.enemies[0].kind=kind;e.enemies[0].energy=0;e.heroes[0].energy=100;assert.equal(e.castSkill('p'),true);assert.equal(e.enemies[0].energy>0,kind==='hero');}
});
