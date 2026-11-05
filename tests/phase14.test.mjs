import test from 'node:test';import assert from 'node:assert/strict';
import {BattleEngine} from '../assets/battle/BattleEngine.ts';import {BattlePreferences} from '../assets/data/BattlePreferences.ts';import {AudioDirector} from '../assets/battle/AudioDirector.ts';
import {ProgressStore} from '../assets/battle/ProgressStore.ts';import {DUNGEON_CARDS,dungeonCardPosition} from '../assets/data/DungeonPresentation.ts';import {buildCaption} from '../assets/data/BuildInfo.ts';
const unit=(id,more={})=>({id,name:id,role:'将',kind:'hero',heroTier:3,tactic:'cleave',maxHp:1e6,attack:10,defense:0,interval:100,priority:0,color:'#FFFFFF',...more});
const engine=(extra={})=>new BattleEngine({heroes:['a','b','c'].map(id=>unit(id)),waves:[[unit('foe',{kind:'soldier',maxHp:1e8,attack:0})]],seed:42,energyRate:0,...extra});
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
test('自动开启后满能接战会依次释放，任何普通攻击冷却不阻塞技能；反复回满不饿死后位武将',()=>{
 const e=engine();e.heroes.forEach(u=>{u.energy=100;u.cooldown=999});e.advance(.05);assert.equal(e.skillCount,1);assert.equal(e.heroes[0].energy,0);e.heroes[0].energy=100;
 e.advance(.6);assert.equal(e.skillCount,2);assert.equal(e.heroes[1].energy,0);e.advance(.6);assert.equal(e.skillCount,3);assert.equal(e.heroes[2].energy,0);
});
test('手动满能在接敌中预约、暂停中不扣能，恢复接战后释放；开自动同样不浪费在进场段',()=>{
 const e=engine({approachTime:1});e.autoSkill=false;e.heroes[0].energy=100;assert.deepEqual(e.requestHeroSkill('a'),{accepted:true,queued:true,state:'approach'});e.paused=true;e.advance(9);assert.equal(e.skillCount,0);assert.equal(e.heroes[0].energy,100);e.paused=false;e.advance(1.1);assert.equal(e.skillCount,1);assert.equal(e.isSkillQueued('a'),false);
 const auto=engine({approachTime:1});auto.heroes.forEach(u=>u.energy=100);auto.advance(.9);assert.equal(auto.skillCount,0);auto.advance(1.4);assert.equal(auto.skillCount,3);
});
test('自动关闭不再自行施法，手动预约仍可执行；死亡/未满/战斗结束不会伪装可释放',()=>{
 const e=engine();e.autoSkill=false;e.heroes[0].energy=100;e.advance(1);assert.equal(e.skillCount,0);e.requestHeroSkill('a');assert.equal(e.skillCount,1);assert.equal(e.requestHeroSkill('a').state,'energy');e.heroes[1].hp=0;e.heroes[1].energy=100;assert.equal(e.requestHeroSkill('b').state,'dead');e.status='won';e.heroes[2].energy=100;assert.equal(e.skillState('c'),'ended');
});
test('自动开关跨重建保存，常规/体验/满级档分别隔离；存储不可用仍可使用默认值',()=>{
 const disk=memory(),testPref=new BattlePreferences(disk,'test');assert.equal(testPref.autoSkill,true);testPref.autoSkill=true;assert.equal(new BattlePreferences(disk,'test').autoSkill,true);const normal=new BattlePreferences(disk,'standard');assert.equal(normal.autoSkill,true);normal.autoSkill=false;assert.equal(new BattlePreferences(disk,'test').autoSkill,true);assert.equal(new BattlePreferences(disk,'experience').autoSkill,true);assert.equal(new BattlePreferences({getItem(){throw Error()},setItem(){throw Error()}},'standard').autoSkill,true);
});
test('普攻命中与技能独立声道、不会互相停止，音量可听且Boss两声警报不被它们截断',()=>{
 let now=1000;const channels=[];const a=new AudioDirector(()=>{const c={src:'',loop:false,volume:0,played:0,stopped:0,play(){this.played++},pause(){},stop(){this.stopped++}};channels.push(c);return c},undefined,()=>now);a.scene('main');a.unlock();a.effect('fire');const skillStops=channels[1].stopped;a.effect('hit-slash');assert.equal(channels[3].played,1);assert.ok(channels[3].volume>=.35);assert.equal(channels[1].stopped,skillStops);const hitStops=channels[3].stopped;a.effect('blizzard');assert.equal(channels[3].stopped,hitStops);now+=1000;a.effect('boss-arrive');const alertStops=channels[4].stopped;now+=200;a.effect('hit-bow');a.effect('fire');assert.equal(channels[4].stopped,alertStops);assert.equal(channels[4].played,1);
});
test('切换副本校验失败保留原未完挑战及次数，成功只扣目标模式次数、不补偿旧奖励',()=>{
 const s=new ProgressStore(memory(),()=>Date.UTC(2026,10,1),()=>.5);const city=s.startActivity('city');const before=s.progress;assert.throws(()=>s.switchActivity('boat',[]),/筹谋/);assert.equal(s.progress.pending.id,city.id);assert.equal(s.progress.daily.cityUsed,1);const boss=s.switchActivity('boss');assert.equal(s.progress.pending.id,boss.id);assert.equal(s.progress.daily.cityUsed,1);assert.equal(s.progress.points,before.points);const boat=s.switchActivity('boat',['wind','guard','repair']);assert.equal(boat.mode,'boat');assert.equal(s.progress.daily.boatUsed,1);
});
test('副本四张卡片严格2x2对称且有各自原画，所有入口保持显示；版本号明确区分源码/构建',()=>{
 assert.equal(new Set(DUNGEON_CARDS.map(c=>c.art)).size,4);const p=DUNGEON_CARDS.map((_,i)=>dungeonCardPosition(i));assert.equal(p[0].x,-p[1].x);assert.equal(p[2].x,-p[3].x);assert.equal(p[0].y,p[1].y);assert.equal(p[2].y,p[3].y);assert.equal(p[0].width,p[3].width);assert.ok(buildCaption(true,false).includes('Cocos源码'));assert.ok(buildCaption(false,true).includes('微信构建'));assert.ok(buildCaption(false,false).includes('Web构建'));
});
