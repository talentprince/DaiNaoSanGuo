import test from 'node:test';import assert from 'node:assert/strict';
import {createMainlineOptions} from '../assets/data/BattleConfig.ts';
import {BattleEngine} from '../assets/battle/BattleEngine.ts';
import {ENEMY_ARCHETYPES,mobPosition} from '../assets/data/EnemyCatalog.ts';
import {battleMusic} from '../assets/data/MusicRouting.ts';
import {DEFENSE_SPOTS,battlePosition} from '../assets/data/FormationConfig.ts';
import {defenseBoardPosition,SIEGE} from '../assets/data/SiegeLayout.ts';
import {AudioDirector} from '../assets/battle/AudioDirector.ts';
test('主线5波各8个真实小怪，普通2/精英10秘境值，体型位置不越界且单怪血攻预算受控',()=>{
 for(const stage of [1,100,101,999]){const o=createMainlineOptions(stage);assert.ok(o.waves.every(w=>w.length===8));assert.equal(new Set(o.waves[0].map(u=>u.visualId)).size,6);assert.ok(o.waves.flat().every(u=>u.kind==='soldier'&&u.riftValue===(u.elite?10:2)));}
 const options=createMainlineOptions(1);assert.equal(options.waves.length,5);assert.equal(options.waves.flat().filter(u=>u.elite).length,3);const normal=options.waves[1][1],elite=options.waves[1][7];assert.ok(elite.maxHp>normal.maxHp*2&&elite.attack>normal.attack);assert.equal(options.waves.flat().reduce((sum,u)=>sum+u.riftValue,0),104);const wave=options.waves[0];assert.ok(wave.reduce((s,u)=>s+u.maxHp,0)<430*4.1);assert.ok(wave.reduce((s,u)=>s+u.attack,0)<57*3.1);
 for(let i=0;i<8;i++){const p=mobPosition(i);assert.ok(p.scale<.75);assert.ok(p.x-45>0&&p.x+50<352&&p.y>-230&&p.y<220);}
 assert.equal(ENEMY_ARCHETYPES.length,6);
});
test('普通与精英不同秘境值，5波左右攒满100且只生成一次首领',()=>{
 const o=createMainlineOptions(1);o.heroes.forEach(u=>{u.attack=1e8;u.maxHp=1e9});o.bossWave[0].maxHp=1e12;const e=new BattleEngine(o);e.autoSkill=false;let bosses=0;
 for(let i=0;i<2000&&!e.bossActive;i++){e.advance(.05);bosses+=e.drainEvents().filter(e=>e.type==='boss').length;assert.equal(e.riftEnergy%2,0);}
 assert.ok(e.waveIndex>=4);assert.equal(e.riftEnergy,100);assert.equal(bosses,1);assert.equal(e.enemies.length,1);
 assert.throws(()=>new BattleEngine({...o,waves:[[{...o.waves[0][0],riftValue:-1}]]}),/数值/);
});
test('菜单、四副本、主线和主线Boss路由不同，关闭菜单按当前战场恢复，旧Boss用入场快照',()=>{
 assert.equal(battleMusic(undefined,false,false),'main');assert.equal(battleMusic(undefined,true,false),'mainboss');
 for(const mode of ['city','trial','boat']){assert.equal(battleMusic(mode,false,false),mode);assert.equal(battleMusic(mode,true,true),'menu');}
 assert.equal(battleMusic('boss',false,false,'zhangjiao'),'boss-zhangjiao');assert.equal(battleMusic('boss',false,false,'menghuo'),'boss-menghuo');assert.equal(battleMusic(undefined,true,true),'menu');assert.equal(battleMusic(undefined,true,false),'mainboss');
});
test('守城上/下两个阵位与六个门前阵位一一对应实战，城上留有身位、门前不穿墙',()=>{
 const a=battlePosition('tower-left','city'),b=battlePosition('tower-right','city');assert.equal(a.x,b.x);assert.ok(a.y-b.y>=250);
 for(const spot of DEFENSE_SPOTS){assert.deepEqual({x:spot.x,y:spot.y},defenseBoardPosition(spot.id));const world=battlePosition(spot.id,'city');if(!spot.tower)assert.ok(world.x+50<SIEGE.frontX);assert.ok(spot.x-50>=-320&&spot.x+50<=320&&spot.y-55>=-120&&spot.y+55<=410);}
});
test('Boss两声提示预留独占时间，不被普攻/暴击/技能截断；菜单切曲停止残余战斗音',()=>{
 let now=0;const channels=[];const a=new AudioDirector(()=>{const c={src:'',loop:false,volume:0,played:0,stopped:0,play(){this.played++},pause(){},stop(){this.stopped++}};channels.push(c);return c},undefined,()=>now);a.scene('mainboss');a.unlock();a.effect('boss-arrive');
 const sounds=()=>channels.slice(1).reduce((s,c)=>s+c.played,0);assert.equal(sounds(),1);now=400;a.effect('critical');a.effect('hit-slash');a.effect('fire');assert.equal(sounds(),1);now=1000;a.effect('fire');assert.equal(sounds(),2);
 const stops=channels.slice(1).reduce((s,c)=>s+c.stopped,0);a.scene('menu');assert.ok(channels.slice(1).reduce((s,c)=>s+c.stopped,0)>stops);const before=sounds();a.effect('hit-magic');a.effect('critical');assert.equal(sounds(),before);assert.equal(channels[0].src,'audio/menu.mp3');
});
