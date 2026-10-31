import type { Unit,UnitConfig } from './BattleEngine';
export function previewUnit(config:UnitConfig):Unit{return{...config,team:'hero',hp:config.maxHp,cooldown:0,energy:0,shield:0,shieldRemaining:0,attackBuff:0,attackBuffRemaining:0,healGlowRemaining:0,slow:0,slowRemaining:0,burnRemaining:0,burnPower:0,burnTick:0,burnSource:'',poisonRemaining:0,poisonPower:0,poisonTick:0,poisonSource:''};}
