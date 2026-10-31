import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine} from '../assets/battle/BattleEngine.ts';
import {captureEnergy} from '../assets/data/EnergyConfig.ts';
import {weaponPresentation} from '../assets/data/WeaponPresentation.ts';
import {ProgressStore} from '../assets/battle/ProgressStore.ts';
import {createHeroes} from '../assets/data/BattleConfig.ts';
import {createDeveloperStore} from '../assets/battle/DeveloperMode.ts';
const u=(id,extra={})=>({id,name:id,role:'测试',kind:'hero',heroTier:3,tactic:'cleave',maxHp:10000,attack:10,defense:0,interval:100,priority:0,color:'#FFFFFF',...extra});
const make=(opts={})=>new BattleEngine({heroes:[u('caster'),u('healer',{tactic:'heal'})],waves:[[u('target',{kind:'soldier',maxHp:1000})]],seed:7,energyRate:0,...opts});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('初始零能量，普攻命中只加1，不按伤害膨胀或受伤回能',()=>{
 const a=make(),b=make({heroes:[u('caster',{attack:500}),u('healer',{tactic:'heal'})]});for(const e of[a,b]){e.autoSkill=false;e.heroes[1].cooldown=999;e.enemies[0].cooldown=999;e.advance(.4);}assert.equal(a.heroes[0].energy,1);assert.equal(b.heroes[0].energy,1);assert.equal(a.enemies[0].energy,0);
});
test('击杀全队存活武将+18，击杀者另+7，小兵/死亡将不回能',()=>{
 const e=make({heroes:[u('caster',{attack:9999}),u('healer',{tactic:'heal'}),u('dead'),u('soldier',{kind:'soldier'})]});e.autoSkill=false;e.heroes[2].hp=0;e.advance(.4);assert.equal(e.heroes[0].energy,26);assert.equal(e.heroes[1].energy,18);assert.equal(e.heroes[2].energy,0);assert.equal(e.heroes[3].energy,0);
});
test('技能击杀也回能且最多100，尸体不重复贡献、满能前不能手动释放',()=>{
 const e=make({heroes:[u('caster',{attack:9999})]});e.autoSkill=false;assert.equal(e.castSkill(),false);e.heroes[0].energy=100;e.castSkill();assert.equal(e.heroes[0].energy,25);e.advance(10);assert.equal(e.heroes[0].energy,25);
 const full=make({heroes:[u('caster',{attack:9999})],initialEnergy:{caster:99}});full.autoSkill=false;full.advance(.4);assert.equal(full.heroes[0].energy,100);
});
test('无击杀的世界Boss仍可蓄满，暂停不会回能',()=>{
 const e=new BattleEngine({heroes:[u('caster')],waves:[[u('boss',{kind:'boss',maxHp:1e9,attack:0})]],seed:7,scoreMode:true,timeLimit:30});e.autoSkill=false;e.heroes[0].interval=1;e.advance(27);assert.equal(e.heroes[0].energy,100);e.heroes[0].energy=0;e.paused=true;e.advance(60);assert.equal(e.heroes[0].energy,0);
});
test('初始能量按身份继承，不受阵位顺序影响，非法能量与小兵忽略',()=>{
 const e=make({heroes:[u('healer'),u('caster'),u('soldier',{kind:'soldier'})],initialEnergy:{caster:81.5,healer:100,soldier:100,bad:Infinity}});assert.equal(e.heroes[0].energy,100);assert.equal(e.heroes[1].energy,81.5);assert.equal(e.heroes[2].energy,0);e.heroes[0].hp=0;assert.deepEqual(captureEnergy(e.heroes),{healer:0,caster:81.5});
});
test('主线通关能量与结算一起保存，刷新仍继承，旧关/副本不会覆盖新关',()=>{
 const disk=memory(),s=new ProgressStore(disk);s.settleVictory('clear-1',1,{guanhai:81.5,caohong:100,bad:Infinity});assert.deepEqual(new ProgressStore(disk).mainlineEnergyFor(2),{guanhai:81.5,caohong:100});assert.deepEqual(s.mainlineEnergyFor(1),{});s.settleVictory('clear-1',1,{guanhai:0});assert.equal(s.mainlineEnergyFor(2).guanhai,81.5);
 s.settleVictory('clear-2',2,{guanhai:60});s.settleVictory('old-1',1,{guanhai:5});assert.equal(s.mainlineEnergyFor(3).guanhai,60);s.clearMainlineEnergy();assert.deepEqual(new ProgressStore(disk).mainlineEnergyFor(3),{});
});
test('三将下一关独立保存能量，Boss不串档、失败清空，重复结算不重置',()=>{
 const disk=memory(),s=new ProgressStore(disk);s.settleVictory('main',1,{guanhai:80});const trial=s.startActivity('trial');s.settleActivity(trial.id,true,0,{guanhai:67});assert.equal(new ProgressStore(disk).trialEnergyFor(2).guanhai,67);assert.equal(s.mainlineEnergyFor(2).guanhai,80);s.settleActivity(trial.id,true,0,{guanhai:0});assert.equal(s.trialEnergyFor(2).guanhai,67);
 const boss=s.startActivity('boss');s.settleActivity(boss.id,false,200,{guanhai:2});assert.equal(s.trialEnergyFor(2).guanhai,67);const next=s.startActivity('trial');s.settleActivity(next.id,false);assert.deepEqual(new ProgressStore(disk).trialEnergyFor(2),{});
});
test('普装穿卸/品质/图形不改变人物武器或发光，只有本人专武增强外观',()=>{
 const disk=memory(),s=createDeveloperStore(disk),id='guanyu';s.unequip(id,'weapon');const base=createHeroes([id],1,s.getEquipmentBonuses())[0];assert.deepEqual(weaponPresentation(base),{weapon:'glaive',exclusive:false,scale:1.12});
 const generic={id:'test-bow',name:'普通弓',rarity:1,stage:1,slot:'weapon',appearance:'bow',attack:1,defense:0,maxHp:1};const raw=s.progress;raw.inventory.push(generic);disk.setItem('dainaosanguo.developer.progress.v1',JSON.stringify(raw));const reload=createDeveloperStore(disk);reload.equip(id,'test-bow');assert.deepEqual(weaponPresentation(createHeroes([id],1,reload.getEquipmentBonuses())[0]),weaponPresentation(base));reload.equip(id,'signature-guanyu');assert.deepEqual(weaponPresentation(createHeroes([id],1,reload.getEquipmentBonuses())[0]),{weapon:'glaive',exclusive:true,scale:1.55});assert.equal(weaponPresentation({...base,signature:'zhaoyun'}).exclusive,false);
});
