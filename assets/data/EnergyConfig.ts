import type { Unit } from '../battle/BattleEngine';
export const ENERGY_RULES={maximum:100,hit:1,teamKill:18,killerBonus:7,passivePerSecond:.8,bossPerSecond:3,weatherSeconds:4.5};
export type EnergySnapshot=Record<string,number>;
export function cleanEnergy(value:unknown):EnergySnapshot{
    const result:EnergySnapshot={};if(!value||typeof value!=='object'||Array.isArray(value))return result;
    Object.keys(value).forEach(id=>{const n=(value as Record<string,unknown>)[id];if(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100&&id!=='__proto__'&&id!=='constructor'&&id!=='prototype')result[id]=n;});return result;
}
export function captureEnergy(units:readonly Unit[]):EnergySnapshot{
    const result:EnergySnapshot={};units.filter(u=>u.team==='hero'&&u.kind!=='soldier'&&u.kind!=='wall').forEach(u=>{result[u.visualId||u.id]=u.hp>0?Math.max(0,Math.min(100,u.energy)):0;});return result;
}
