import { BattleEngine } from '../assets/battle/BattleEngine.ts';
import { createMainlineOptions } from '../assets/data/BattleConfig.ts';
import { STARTER_PARTY } from '../assets/data/HeroCatalog.ts';
import { signatureFor } from '../assets/data/EquipmentConfig.ts';
import { xpRequired, xpPerMinute } from '../assets/data/GrowthConfig.ts';
const elite=['caocao','guanyu','zhaoyun','zhugeliang','huatuo'];
const builds=[{name:'初始普通1星',party:STARTER_PARTY,bonuses:{}},{name:'神将1星',party:elite,bonuses:{}},{name:'神将3星+专武',party:elite,bonuses:Object.fromEntries(elite.map(h=>{const w=signatureFor(h);return[h,{attack:w.attack,defense:w.defense,maxHp:w.maxHp,stars:3,signature:h}];}))}];
function wins(stage,level,build,seed=42){const e=new BattleEngine(createMainlineOptions(stage,seed,level,build.bonuses,build.party));e.advance(151);return e.status==='won';}
function frontier(level,build){let lo=0,hi=1000;while(hi-lo>1){const mid=Math.floor((hi+lo)/2);if(wins(mid,level,build))lo=mid;else hi=mid;}return lo;}
const rows=[];for(const level of [1,8,20,40,80,150,300]){const row={level};for(const build of builds)row[build.name]=frontier(level,build);rows.push(row);}
const dayRows=[];let level=1,xp=0;for(let day=1;day<=30;day++){const map=frontier(level,builds[0]);xp+=Math.floor(xpPerMinute(map)*240);while(level<300&&xp>=xpRequired(level)){xp-=xpRequired(level);level++;}if([1,3,7,14,21,30].includes(day))dayRows.push({day,level,mapBeforeClaim:map,mapAfterGrowth:frontier(level,builds[0])});}
const markdown=['# 0.13数值冒烟报告','','固定种子42、自动技能、5人、满血逐关独立模拟；二分定位单调难度边界。此表为战斗引擎结果，不是玩家留存/爽感验证。没有计入装备掉落、剧情换将、抽卡与真实玩家操作。','','| 全队等级 | 初始普通1星 | 神将1星 | 神将3星+专武 |','| --- | --- | --- | --- |',...rows.map(r=>`| ${r.level} | ${r['初始普通1星']} | ${r['神将1星']} | ${r['神将3星+专武']} |`),'','纯初始队、每日按4h经验且脑铢足够的成长投影（不作为实际玩家升级保证）：','','| 日 | 等级 | 领经验前地图 | 成长后地图 |','| --- | --- | --- | --- |',...dayRows.map(r=>`| ${r.day} | ${r.level} | ${r.mapBeforeClaim} | ${r.mapAfterGrowth} |`),'','每日满额脑勋100：名将1400=14天、神将2100=21天、专武700=7天；共用钱包，兑换专武会延后换将。全败完成日常仍有70脑勋。','','999关是数据范围；未逐关人工验收。Boss更换、随机事件、各武将独立机制和长期行为测试见SPEC Review清单。',''].join('\n');
console.log(markdown);
