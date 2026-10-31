import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_BOSSES,bossRotation,BOSS_ROTATION_EPOCH,BOSS_WEEK_MS,bossVulnerability} from '../assets/data/WorldBossConfig.ts';
import {createActivityOptions} from '../assets/data/ActivityConfig.ts';
import {BattleEngine} from '../assets/battle/BattleEngine.ts';
import {ProgressStore} from '../assets/battle/ProgressStore.ts';
import {createDeveloperStore} from '../assets/battle/DeveloperMode.ts';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
const hero=(id,extra={})=>({id,name:id,role:'测试',kind:'hero',heroTier:4,tactic:'cleave',maxHp:1e12,attack:100,defense:0,interval:1,priority:0,color:'#FFFFFF',...extra});
function encounter(){const s=new ProgressStore(memory(),()=>BOSS_ROTATION_EPOCH);const run=s.startActivity('boss');const options=createActivityOptions(run);options.heroes=[hero('one'),hero('two')];options.waves[0][0].attack=0;const e=new BattleEngine(options);e.autoSkill=false;return e;}
test('三个Boss按上海周一零点轮换，3周复始，边界与负周期正确',()=>{
 assert.equal(bossRotation(BOSS_ROTATION_EPOCH).boss.id,'dongzhuo');assert.equal(bossRotation(BOSS_ROTATION_EPOCH+BOSS_WEEK_MS-1).boss.id,'dongzhuo');assert.equal(bossRotation(BOSS_ROTATION_EPOCH+BOSS_WEEK_MS).boss.id,'zhangjiao');assert.equal(bossRotation(BOSS_ROTATION_EPOCH+BOSS_WEEK_MS*2).boss.id,'menghuo');assert.equal(bossRotation(BOSS_ROTATION_EPOCH+BOSS_WEEK_MS*3).boss.id,'dongzhuo');assert.equal(bossRotation(BOSS_ROTATION_EPOCH-1).boss.id,'menghuo');assert.equal(bossRotation(BOSS_ROTATION_EPOCH).nextAt,BOSS_ROTATION_EPOCH+BOSS_WEEK_MS);
});
test('三魔王属性、武器、弱点和终结技能分别不同，入场快照稳定',()=>{
 const disk=memory(),s=createDeveloperStore(disk,()=>BOSS_ROTATION_EPOCH);const configs=[];
 for(const b of WORLD_BOSSES){const run=s.startActivity('boss',[],b.id);const e=createActivityOptions(run);configs.push(e.waves[0][0]);assert.equal(run.bossWeek,0);assert.equal(e.bossFinale.name,b.finale);assert.equal(e.bossFinale.duration,2.8);s.abandonActivity();}
 assert.equal(new Set(configs.map(c=>c.visualId)).size,3);assert.equal(new Set(configs.map(c=>c.defense)).size,3);assert.equal(new Set(configs.map(c=>c.interval)).size,3);assert.equal(new Set(configs.map(c=>c.weapon)).size,3);
 const normal=new ProgressStore(memory(),()=>BOSS_ROTATION_EPOCH);assert.throws(()=>normal.startActivity('boss',[],'menghuo'));
});
test('弱点30%/职业15%确实进入伤害，叠加45%，其他不加成',()=>{
 const target={weakElement:'blizzard',weakTactic:'pierce'};assert.equal(bossVulnerability({element:'blizzard',tactic:'pierce'},target),1.45);assert.equal(bossVulnerability({element:'fire',tactic:'cleave'},target),1);
 const make=weak=>{const e=new BattleEngine({heroes:[hero('caster',{element:'blizzard',tactic:'pierce'})],waves:[[{...hero('enemy',{kind:'boss',maxHp:100000,defense:0}),...(weak?target:{})}]],seed:5});e.autoSkill=false;e.heroes[0].energy=100;e.castSkill();return e.enemies[0].maxHp-e.enemies[0].hp;};assert.equal(make(true),Math.floor(make(false)*1.45));
});
test('30秒触发蓄势而非直接结算，伤害锁定，落招无视盾秒杀所有并仅结算一次',()=>{
 const e=encounter();e.advance(30);assert.equal(e.elapsed,30);assert.equal(e.status,'fighting');assert.equal(e.finisherActive,true);assert.ok(e.heroes.every(u=>u.hp>0));const score=e.damageDealt;e.heroes.forEach(u=>{u.energy=100;u.shield=1e15;u.shieldRemaining=99;});assert.equal(e.castSkill('one'),false);
 e.advance(1.8);assert.ok(e.heroes.every(u=>u.hp===0&&u.shield===0));assert.equal(e.damageDealt,score);assert.equal(e.status,'fighting');e.advance(1.1);assert.equal(e.status,'scored');e.advance(99);const events=e.drainEvents();assert.equal(events.filter(v=>v.type==='finale').length,1);assert.equal(events.filter(v=>v.type==='finale-impact').length,1);assert.equal(events.filter(v=>v.type==='death'&&['one','two'].includes(v.target)).length,2);assert.equal(events.filter(v=>v.type==='finish').length,1);
});
test('终结演出暂停冻结，固定步长不因帧拆分改变伤害与结算',()=>{
 const a=encounter(),b=encounter();a.advance(30);a.paused=true;const remaining=a.finisherRemaining;a.advance(999);assert.equal(a.finisherRemaining,remaining);assert.ok(a.heroes.every(u=>u.hp>0));a.paused=false;a.advance(3);for(let i=0;i<330;i++)b.advance(.1);assert.equal(a.status,b.status);assert.equal(a.damageDealt,b.damageDealt);assert.deepEqual(a.heroes,b.heroes);
});
test('当前Boss与周次写入未完挑战，重载不重选，跨周日刷新成绩',()=>{
 let now=BOSS_ROTATION_EPOCH;const disk=memory(),s=new ProgressStore(disk,()=>now);const run=s.startActivity('boss');assert.equal(run.worldBoss,'dongzhuo');assert.equal(new ProgressStore(disk,()=>now).progress.pending.worldBoss,'dongzhuo');s.settleActivity(run.id,false,10000);assert.equal(s.progress.daily.bossBest,10000);now+=BOSS_WEEK_MS;const next=s.startActivity('boss');assert.equal(next.worldBoss,'zhangjiao');assert.equal(s.progress.daily.bossBest,0);
});
