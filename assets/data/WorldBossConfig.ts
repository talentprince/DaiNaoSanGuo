import type { SkillElement } from './HeroIdentity';
import type { UnitConfig } from '../battle/BattleEngine';
export type WorldBossId='dongzhuo'|'zhangjiao'|'menghuo';
export interface WorldBossDefinition {id:WorldBossId;name:string;title:string;attribute:string;color:string;weapon:NonNullable<UnitConfig['weapon']>;element:SkillElement;attack:number;defense:number;interval:number;weakElement:SkillElement;weakTactic:NonNullable<UnitConfig['tactic']>;weakness:string;finale:string;}
export const WORLD_BOSSES:WorldBossDefinition[]=[
 {id:'dongzhuo',name:'董卓',title:'酒池肉山',attribute:'烈火·重甲',color:'#B53C34',weapon:'glaive',element:'fire',attack:32,defense:44,interval:2,weakElement:'blizzard',weakTactic:'pierce',weakness:'冰雪+30% / 破阵+15%',finale:'酒池焚天'},
 {id:'zhangjiao',name:'张角',title:'雷坛教主',attribute:'雷霆·急袭',color:'#9A74CC',weapon:'staff',element:'lightning',attack:26,defense:20,interval:1.25,weakElement:'poison',weakTactic:'volley',weakness:'毒雾+30% / 速攻+15%',finale:'九霄雷罚'},
 {id:'menghuo',name:'孟获',title:'南蛮铁憨',attribute:'蛮力·重击',color:'#66924D',weapon:'axe',element:'wind',attack:49,defense:29,interval:2.65,weakElement:'fire',weakTactic:'cleave',weakness:'烈焰+30% / 猛攻+15%',finale:'万岳压顶'},
];
export const BOSS_WEEK_MS=7*86400000;
// Monday 2026-10-26 00:00 Asia/Shanghai; not the machine's local timezone.
export const BOSS_ROTATION_EPOCH=Date.UTC(2026,9,25,16);
export function bossRotation(now:number):{boss:WorldBossDefinition;week:number;nextAt:number}{
 if(!Number.isFinite(now))throw new Error('轮值时间无效');const week=Math.floor((now-BOSS_ROTATION_EPOCH)/BOSS_WEEK_MS);return{boss:WORLD_BOSSES[((week%3)+3)%3],week,nextAt:BOSS_ROTATION_EPOCH+(week+1)*BOSS_WEEK_MS};
}
export function worldBoss(id:WorldBossId):WorldBossDefinition{const boss=WORLD_BOSSES.find(b=>b.id===id);if(!boss)throw new Error('魔王无效');return boss;}
export function bossVulnerability(source:Pick<UnitConfig,'element'|'tactic'>,target:Pick<UnitConfig,'weakElement'|'weakTactic'>):number{return 1+(target.weakElement&&source.element===target.weakElement ? .3 : 0)+(target.weakTactic&&source.tactic===target.weakTactic ? .15 : 0);}
