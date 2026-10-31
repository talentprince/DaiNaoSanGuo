/** Shared progression knobs. Values are a testable first balance pass, not a retention promise. */
export const MAX_STAGE = 999;
export const MAX_LEVEL = 300;
export const XP_DAILY_MS = 4 * 3600000;
export const MEDAL_DAILY_CAP = 100;
export const SIGNATURE_COST = 700;
export const MAX_STARS = 6;
export const STAR_COSTS = [20, 40, 60, 100, 160];
export function levelFactor(level: number): number { return Math.pow(1.055, level - 1); }
export function stageFactor(stage: number): number {
    return Math.pow(1.09, Math.min(9, stage - 1)) * Math.pow(1.014, Math.max(0, stage - 10)) * Math.pow(1.05, Math.floor(stage / 50));
}
export function xpRequired(level: number): number { return Math.floor(100 + 30 * Math.pow(level, 1.5)); }
export function xpPerMinute(highest: number): number { return highest > 0 ? 12 + highest * 0.35 : 0; }
export function starFactor(stars: number): number { return 1 + (stars - 1) * 0.16; }
export function expeditionBand(highest: number): number { return Math.min(20, 1 + Math.floor(highest / 50)); }
export function bossGrade(damage: number): number { return damage >= 50000 ? 4 : damage >= 25000 ? 3 : damage >= 10000 ? 2 : damage >= 3000 ? 1 : 0; }

export function formatAmount(value:number):string { const a=Math.abs(value);return a>=1e8?`${(value/1e8).toFixed(1)}亿`:a>=1e4?`${(value/1e4).toFixed(1)}万`:`${Math.floor(value)}`; }
