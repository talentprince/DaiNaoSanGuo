import { heroElement } from './HeroIdentity';
import type { UnitConfig, WeaponKind } from '../battle/BattleEngine';
export const HERO_IDS = ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'liubei', 'liaohua', 'zhoucang', 'guanhai', 'jianyong', 'mizhu',
    'huangzhong', 'sunshangxiang', 'huanggai', 'xuhuang', 'zhangliao', 'luxun', 'diaochan', 'ganning', 'machao', 'xuchu',
    'lvbu', 'caocao', 'zhouyu', 'simayi', 'chengpu', 'mifang', 'caohong', 'songxian', 'handang', 'yuejin', 'caiwenji', 'huatuo',
    'sunquan', 'sunce', 'dianwei', 'pangtong', 'huangyueying', 'jiaxu', 'taishici', 'xunyu', 'daqiao', 'xiaoqiao', 'zhurong', 'zhenji'] as const;
export type HeroId = typeof HERO_IDS[number];
export type HeroTier = 1 | 2 | 3 | 4 | 5;
export const TIER_NAMES = ['普通', '骁将', '名将', '传奇', '神将'];
export const TIER_COLORS = ['#FFFFFF', '#68D5ED', '#B36BFF', '#FF00FF', '#FFB400'];
export interface HeroDefinition extends UnitConfig { id: HeroId; tier: HeroTier; storyStage?: number; }
type Tactic = NonNullable<UnitConfig['tactic']>;
function hero(id: HeroId, name: string, tier: HeroTier, tactic: Tactic, weapon: WeaponKind,
    hp: number, atk: number, def: number, interval: number, priority: number, color: string, skillName: string,
    storyStage?: number): HeroDefinition {
    if (tier === 1 && tactic === 'heal') throw new Error('普通武将不配置治疗职业');
    return { id, name, tier, tactic, weapon, maxHp: hp, attack: atk, defense: def, interval, priority, color, skillName,
        role: ({ cleave: '猛攻', pierce: '破阵', volley: '速攻', guard: '护阵', heal: '治疗' })[tactic],
        storyStage, kind: 'hero', visualId: id, heroTier: tier, element: heroElement(id,tactic) };
}
export const HERO_CATALOG: HeroDefinition[] = [
    hero('guanhai', '管亥', 1, 'cleave', 'sword', 1150, 82, 20, 1.1, 2, '#B9A053', '斩将突击'),
    hero('caohong', '曹洪', 1, 'guard', 'sword', 2500, 62, 40, 1.4, 0, '#8D7D68', '坚阵迎敌'),
    hero('songxian', '宋宪', 1, 'volley', 'bow', 1100, 74, 19, 0.9, 3, '#9B9276', '穿云一箭'),
    hero('jianyong', '简雍', 1, 'pierce', 'fan', 950, 86, 15, 1.4, 4, '#849FC2', '策士点破'),
    hero('mifang', '糜芳', 1, 'cleave', 'staff', 1200, 67, 22, 1.25, 2, '#A08F78', '迎风重击'),
    hero('chengpu', '程普', 2, 'guard', 'spear', 2700, 84, 45, 1.35, 0, '#849D91', '江东铁壁', 1),
    hero('liaohua', '廖化', 2, 'pierce', 'spear', 1450, 95, 27, 1.05, 2, '#819B72', '老将突阵', 2),
    hero('huanggai', '黄盖', 2, 'guard', 'staff', 2900, 80, 49, 1.5, 0, '#B18A60', '苦肉破阵', 3),
    hero('mizhu', '糜竺', 2, 'heal', 'staff', 1300, 48, 23, 1.5, 3, '#B4A38A', '急济伤兵', 4),
    hero('yuejin', '乐进', 2, 'pierce', 'sword', 1700, 105, 30, 1.1, 1, '#8A899A', '先登破敌', 6),
    hero('handang', '韩当', 2, 'volley', 'bow', 1350, 100, 24, 0.9, 3, '#A48C73', '双矢追风', 7),
    hero('zhoucang', '周仓', 2, 'guard', 'glaive', 2800, 80, 47, 1.4, 0, '#A67E61', '护主横刀', 9),
    hero('xuhuang', '徐晃', 2, 'pierce', 'axe', 1700, 112, 33, 1.25, 1, '#8B93AE', '大斧开山', 10),
    hero('liubei', '刘备', 3, 'heal', 'dual', 2200, 65, 35, 1.4, 3, '#CBB069', '桃园仁心', 5),
    hero('sunshangxiang', '孙尚香', 3, 'volley', 'bow', 1500, 118, 27, 0.75, 2, '#D9869E', '枭姬三连', 8),
    hero('zhangfei', '张飞', 4, 'guard', 'serpent', 3400, 105, 55, 1.4, 0, '#BF8467', '当阳怒吼', 12),
    hero('ganning', '甘宁', 3, 'volley', 'dual', 1800, 125, 31, 0.85, 1, '#6DAEB9', '锦帆夜袭', 15),
    hero('caiwenji', '蔡文姬', 3, 'heal', 'qin', 1850, 70, 30, 1.4, 3, '#B6A4D3', '胡笳清音', 16),
    hero('xuchu', '许褚', 4, 'guard', 'glaive', 3700, 110, 60, 1.5, 0, '#BB946E', '虎痴震军', 18),
    hero('huangzhong', '黄忠', 4, 'pierce', 'bow', 1600, 155, 29, 1.2, 3, '#CFA16C', '百步穿杨', 20),
    hero('dianwei', '典韦', 4, 'guard', 'halberd', 3600, 118, 55, 1.3, 0, '#9F795E', '古之恶来', 22),
    hero('zhangliao', '张辽', 3, 'volley', 'halberd', 1900, 130, 37, 0.95, 1, '#718FB5', '威震逍遥', 25),
    hero('luxun', '陆逊', 3, 'cleave', 'sword', 1500, 160, 28, 1.4, 4, '#AF8875', '火烧连营', 30),
    hero('sunquan', '孙权', 4, 'cleave', 'sword', 2300, 125, 39, 1.2, 2, '#B08A64', '江东统御', 35),
    hero('huangyueying', '黄月英', 3, 'heal', 'fan', 1900, 85, 31, 1.35, 3, '#9FAF72', '木牛援军', 40),
    hero('pangtong', '庞统', 4, 'cleave', 'fan', 1700, 165, 27, 1.45, 4, '#AF8969', '凤雏连计', 45),
    hero('xunyu', '荀彧', 3, 'heal', 'fan', 2100, 80, 34, 1.4, 3, '#96A9B5', '王佐回春', 50),
    hero('taishici', '太史慈', 3, 'volley', 'bow', 1800, 145, 33, 0.85, 2, '#8DB2A7', '三矢贯阵', 55),
    hero('diaochan', '貂蝉', 3, 'heal', 'ribbon', 1950, 85, 32, 1.25, 3, '#C991BD', '倾城回舞', 60),
    hero('machao', '马超', 4, 'pierce', 'spear', 2100, 155, 36, 1, 1, '#B6BDCF', '西凉铁骑', 70),
    hero('daqiao', '大乔', 3, 'heal', 'ribbon', 2000, 85, 32, 1.3, 3, '#EB846B', '春风沐雨', 28),
    hero('zhurong', '祝融', 3, 'cleave', 'dual', 2400, 160, 35, 1.1, 2, '#DF6334', '南蛮烈焰', 65),
    hero('zhenji', '甄姬', 3, 'heal', 'ribbon', 2200, 90, 35, 1.35, 3, '#6D93D6', '洛水清波', 75),
    hero('guanyu', '关羽', 5, 'cleave', 'glaive', 2400, 185, 38, 1.1, 2, '#58A686', '青龙偃月'),
    hero('zhaoyun', '赵云', 5, 'pierce', 'spear', 2200, 165, 35, 0.8, 1, '#78ABD1', '七进七出'),
    hero('zhugeliang', '诸葛亮', 5, 'cleave', 'fan', 1900, 220, 30, 1.4, 4, '#AB93D1', '八阵东风'),
    hero('lvbu', '吕布', 5, 'cleave', 'halberd', 2600, 220, 44, 1, 1, '#C57969', '无双乱舞'),
    hero('caocao', '曹操', 5, 'guard', 'sword', 4000, 155, 70, 1.2, 0, '#9382BA', '挟令天下'),
    hero('zhouyu', '周瑜', 5, 'cleave', 'sword', 2050, 235, 36, 1.2, 4, '#D69674', '火烧赤壁'),
    hero('simayi', '司马懿', 5, 'heal', 'fan', 2300, 145, 42, 1.3, 3, '#8D93C7', '幽谋振军'),
    hero('huatuo', '华佗', 5, 'heal', 'staff', 2400, 105, 40, 1.35, 3, '#95B9A4', '青囊护生'),
    hero('sunce', '孙策', 5, 'pierce', 'spear', 2850, 195, 45, 1, 1, '#C98D70', '霸王破阵'),
    hero('xiaoqiao', '小乔', 5, 'volley', 'fan', 2150, 190, 35, 1.0, 3, '#75BFE4', '霜华漫天'),
    hero('jiaxu', '贾诩', 5, 'cleave', 'fan', 2200, 215, 32, 1.4, 4, '#8E90AA', '乱武毒谋'),
];
export const STARTER_PARTY: HeroId[] = ['guanhai', 'caohong', 'songxian', 'jianyong', 'mifang'];
export const LEGACY_PARTY: HeroId[] = ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'liubei'];
export function getHero(id: string): HeroDefinition | undefined { return HERO_CATALOG.find(hero => hero.id === id); }
export const DRAW_COST = 100;
export const TEN_DRAW_COST = 1000;
export const DIVINE_PITY = 80;
export const EXCHANGE_COST = { 3: 1400, 4: 1750, 5: 2100 };
export const TACTIC_NAMES = { cleave: '猛将斩击', pierce: '一击破阵', volley: '追风连射', guard: '攻守兼备', heal: '妙手回春' };
export function validateParty(ids: readonly string[], owned: readonly HeroId[], mode: 'main' | 'trial' | 'defense' = 'main'): string | null {
    if (new Set(ids).size !== ids.length || ids.some(id => !getHero(id) || owned.indexOf(id as HeroId) < 0)) return '只能使用已拥有且不重复的武将';
    if (mode === 'trial') {
        if (ids.length < 1 || ids.length > 3) return '请选择1至3名武将，空位由小兵补齐';
        if (ids.filter(id => getHero(id)!.tier === 5).length > 1) return '最多上阵1名神将';
        if (ids.filter(id => getHero(id)!.tier === 3 || getHero(id)!.tier === 4).length > 2) return '名将与传奇合计最多上阵2名';
    } else if (ids.length < 1 || ids.length > 5) return '请选择1至5名武将';
    return null;
}
