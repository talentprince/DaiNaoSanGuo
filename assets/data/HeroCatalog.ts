import type { UnitConfig } from '../battle/BattleEngine';

export const HERO_IDS = ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'liubei',
    'liaohua', 'zhoucang', 'guanhai', 'jianyong', 'mizhu', 'huangzhong', 'sunshangxiang',
    'huanggai', 'xuhuang', 'zhangliao', 'luxun', 'diaochan', 'ganning', 'machao', 'xuchu',
    'lvbu', 'caocao', 'zhouyu', 'simayi'] as const;
export type HeroId = typeof HERO_IDS[number];
export type HeroTier = 1 | 2 | 3 | 4;
export const TIER_NAMES = ['小将', '骁将', '名将', '神将'];
export const TIER_COLORS = ['#AFC5D5', '#7DBEE0', '#CE9DE8', '#EDC66F'];
export interface HeroDefinition extends UnitConfig { id: HeroId; tier: HeroTier; storyStage?: number; }
type Tactic = NonNullable<UnitConfig['tactic']>;
function hero(id: HeroId, name: string, tier: HeroTier, tactic: Tactic,
    hp: number, atk: number, def: number, interval: number, priority: number, color: string,
    storyStage?: number): HeroDefinition {
    const roles = { cleave: '群攻', pierce: '破阵', volley: '速攻', guard: '护阵', heal: '治疗' };
    return { id, name, tier, tactic, maxHp: hp, attack: atk, defense: def, interval, priority, color,
        role: roles[tactic], storyStage, kind: 'hero',
        weapon: tactic === 'volley' ? 'bow' : ['zhaoyun', 'machao', 'xuhuang', 'liaohua'].indexOf(id) >= 0 ? 'spear' : ['zhugeliang', 'zhouyu', 'simayi', 'mizhu', 'jianyong'].indexOf(id) >= 0 ? 'fan' : 'sword' };
}

export const HERO_CATALOG: HeroDefinition[] = [
    hero('liaohua', '廖化', 1, 'volley', 1100, 77, 22, 1, 2, '#819B72'),
    hero('zhoucang', '周仓', 1, 'guard', 2500, 65, 42, 1.4, 0, '#A67E61'),
    hero('guanhai', '管亥', 1, 'cleave', 1080, 85, 20, 1.1, 1, '#B9A053'),
    hero('jianyong', '简雍', 1, 'pierce', 850, 95, 12, 1.5, 4, '#849FC2'),
    hero('mizhu', '糜竺', 1, 'heal', 1000, 45, 18, 1.5, 3, '#B4A38A'),
    hero('liubei', '刘备', 2, 'heal', 1000, 45, 18, 1.5, 3, '#CBB069', 1),
    hero('huanggai', '黄盖', 2, 'guard', 2900, 76, 49, 1.5, 0, '#B18A60', 3),
    hero('sunshangxiang', '孙尚香', 2, 'volley', 1050, 86, 19, 0.7, 2, '#D9869E', 8),
    hero('xuhuang', '徐晃', 2, 'pierce', 1500, 102, 30, 1.25, 1, '#8B93AE', 10),
    hero('ganning', '甘宁', 2, 'volley', 1250, 98, 23, 0.85, 1, '#6DAEB9', 15),
    hero('xuchu', '许褚', 2, 'guard', 3200, 80, 52, 1.5, 0, '#BB946E', 18),
    hero('guanyu', '关羽', 3, 'cleave', 1150, 90, 22, 1.1, 2, '#58A686', 20),
    hero('zhangfei', '张飞', 3, 'guard', 2600, 65, 42, 1.4, 0, '#BF8467', 5),
    hero('zhaoyun', '赵云', 3, 'pierce', 1100, 75, 20, 0.8, 1, '#78ABD1', 12),
    hero('zhugeliang', '诸葛亮', 3, 'cleave', 850, 100, 12, 1.5, 4, '#AB93D1', 30),
    hero('huangzhong', '黄忠', 3, 'pierce', 1250, 145, 24, 1.2, 3, '#CFA16C', 25),
    hero('zhangliao', '张辽', 3, 'volley', 1750, 118, 34, 0.95, 1, '#718FB5', 40),
    hero('luxun', '陆逊', 3, 'cleave', 1200, 150, 23, 1.4, 4, '#AF8875', 50),
    hero('diaochan', '貂蝉', 3, 'heal', 1650, 75, 28, 1.25, 3, '#C991BD', 60),
    hero('machao', '马超', 3, 'pierce', 1700, 140, 30, 1, 1, '#B6BDCF', 70),
    hero('lvbu', '吕布', 4, 'cleave', 2500, 210, 42, 1, 1, '#C57969'),
    hero('caocao', '曹操', 4, 'guard', 3800, 145, 68, 1.2, 0, '#9382BA'),
    hero('zhouyu', '周瑜', 4, 'cleave', 1900, 230, 34, 1.2, 4, '#D69674'),
    hero('simayi', '司马懿', 4, 'heal', 2100, 180, 40, 1.3, 3, '#8D93C7'),
];
export const STARTER_PARTY: HeroId[] = ['guanhai', 'zhoucang', 'liaohua', 'jianyong', 'mizhu'];
export const LEGACY_PARTY: HeroId[] = ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'liubei'];
export function getHero(id: string): HeroDefinition | undefined { return HERO_CATALOG.find(hero => hero.id === id); }
export const DRAW_COST = 100;
export const TEN_DRAW_COST = 1000;
export const DIVINE_PITY = 80;
export const EXCHANGE_COST = { 3: 800, 4: 3000 };
export const TACTIC_NAMES = { cleave: '横扫千军', pierce: '一击破阵', volley: '箭雨连发', guard: '攻守兼备', heal: '妙手回春' };

export function validateParty(ids: readonly string[], owned: readonly HeroId[], mode: 'main' | 'trial' | 'defense' = 'main'): string | null {
    if (new Set(ids).size !== ids.length || ids.some(id => !getHero(id) || owned.indexOf(id as HeroId) < 0)) return '只能使用已拥有且不重复的武将';
    if (mode === 'trial') {
        if (ids.length < 1 || ids.length > 3) return '请选择1至3名武将，空位由小兵补齐';
        if (ids.filter(id => getHero(id)!.tier === 4).length > 1) return '最多上阵1名神将';
        if (ids.filter(id => getHero(id)!.tier === 3).length > 2) return '最多上阵2名名将';
    } else if (ids.length < 1 || ids.length > 5) return '请选择1至5名武将';
    return null;
}
