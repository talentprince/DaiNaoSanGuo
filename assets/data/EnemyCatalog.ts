import type { UnitConfig } from '../battle/BattleEngine';
import { mainlineTheme } from './MainlineThemes';
/** Real combatants, not decorative copies. More bodies share a smaller per-unit budget. */
export const ENEMY_ARCHETYPES = [
    { id:'shield',name:'锅盔盾兵',weapon:'sword',hp:1.2,attack:.9,interval:1.75 },
    { id:'spear',name:'长杆枪兵',weapon:'spear',hp:.95,attack:1.05,interval:1.7 },
    { id:'bow',name:'歪帽弓手',weapon:'bow',hp:.8,attack:.95,interval:1.6 },
    { id:'axe',name:'莽斧山匪',weapon:'axe',hp:1.12,attack:1.12,interval:1.95 },
    { id:'shaman',name:'符纸术士',weapon:'staff',hp:.82,attack:1.08,interval:1.85 },
    { id:'blade',name:'红巾快刀',weapon:'dual',hp:.9,attack:.9,interval:1.4 },
] as const;
const PALETTES=['#A67C43','#687C91','#B46640','#6F8E64','#5F8F8D','#9B6A55','#A55144','#648B68','#9A7D9E','#747BA9'];
export function mainlineMob(stage:number,wave:number,index:number,factor:number):UnitConfig {
    mainlineTheme(stage);const chapter=Math.floor((stage-1)/100);
    const elite=[1,3,4].indexOf(wave)>=0&&index===7;
    const a=ENEMY_ARCHETYPES[(index+wave*2+chapter)%ENEMY_ARCHETYPES.length];
    return { id:`mob-${wave}-${index}`,visualId:`mob-${a.id}`,name:elite?`精英·${a.name}`:a.name,role:elite?'精英':'杂兵',kind:'soldier',elite,heroTier:elite?2:1,weapon:a.weapon,
        maxHp:Math.max(1,Math.round((430+wave*80)*.26*a.hp*(elite?2.8:1)*factor)),attack:Math.max(1,Math.round((57+wave*10)*.3*a.attack*(elite?1.55:1)*factor)),
        defense:Math.round((elite?12:6)*factor),interval:a.interval,priority:a.weapon==='bow'||a.weapon==='staff'?3:0,
        color:elite?'#C06B48':PALETTES[chapter],riftValue:elite?10:2 };
}
export function mobPosition(index:number) {
    const row=index%3,col=Math.floor(index/3);
    return {x:60+col*92+(row%2)*14,y:175-row*145-col*18,scale:.61+(index%3)*.035};
}
