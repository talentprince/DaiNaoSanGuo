import type { UnitConfig, WeaponKind } from '../battle/BattleEngine';
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
type UniformStyle = 'plates' | 'coat' | 'straps' | 'fur' | 'robe' | 'sash';
interface EnemyUniform {
    color: string;
    lining: string;
    trim: string;
    belt: string;
    style: UniformStyle;
}
const UNIFORMS: Record<string, EnemyUniform> = {
    shield: { color: '#498292', lining: '#294B59', trim: '#B8D2D8', belt: '#64818B', style: 'plates' },
    spear: { color: '#688A50', lining: '#3D6242', trim: '#D6DEAA', belt: '#B69C62', style: 'coat' },
    bow: { color: '#CC9A4C', lining: '#875C3C', trim: '#F3D291', belt: '#623D35', style: 'straps' },
    axe: { color: '#A85C47', lining: '#653C3C', trim: '#E7C2A0', belt: '#804E40', style: 'fur' },
    shaman: { color: '#8161AD', lining: '#4A3869', trim: '#D5C3ED', belt: '#64578B', style: 'robe' },
    blade: { color: '#BA4A48', lining: '#733542', trim: '#EEC2A0', belt: '#537D76', style: 'sash' },
};

export function enemyUniform(visualId: string, weapon: WeaponKind = 'sword'): EnemyUniform {
    const archetype = visualId.startsWith('mob-') ? visualId.slice(4) : '';
    if (UNIFORMS[archetype]) return UNIFORMS[archetype];
    if (weapon === 'bow') return UNIFORMS.bow;
    if (weapon === 'spear') return UNIFORMS.spear;
    if (weapon === 'axe') return UNIFORMS.axe;
    if (weapon === 'staff') return UNIFORMS.shaman;
    if (weapon === 'dual') return UNIFORMS.blade;
    return UNIFORMS.shield;
}
export function mainlineMob(stage:number,wave:number,index:number,factor:number):UnitConfig {
    mainlineTheme(stage);const chapter=Math.floor((stage-1)/100);
    const elite=[1,3,4].indexOf(wave)>=0&&index===7;
    const a=ENEMY_ARCHETYPES[(index+wave*2+chapter)%ENEMY_ARCHETYPES.length];
    return { id:`mob-${wave}-${index}`,visualId:`mob-${a.id}`,name:elite?`精英·${a.name}`:a.name,role:elite?'精英':'杂兵',kind:'soldier',elite,heroTier:elite?2:1,weapon:a.weapon,
        maxHp:Math.max(1,Math.round((430+wave*80)*.26*a.hp*(elite?2.8:1)*factor)),attack:Math.max(1,Math.round((57+wave*10)*.3*a.attack*(elite?1.55:1)*factor)),
        defense:Math.round((elite?12:6)*factor),interval:a.interval,priority:a.weapon==='bow'||a.weapon==='staff'?3:0,
        color:UNIFORMS[a.id].color,riftValue:elite?10:2 };
}
export function mobPosition(index:number,elite=false) {
    const row=index%3,col=Math.floor(index/3);
    return {x:50+col*95+(row%2)*8,y:185-row*166-col*12,scale:elite?1.22:.96+(index%3)*.025};
}
