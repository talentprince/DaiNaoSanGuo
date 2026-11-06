import { levelFactor } from './GrowthConfig';
import { ACTIVITY_NAMES, createActivityOptions } from './ActivityConfig';
import type { WorldBossId } from './WorldBossConfig';
import { createMainlineOptions } from './BattleConfig';
import type { BattleOptions, CombatBonus, UnitConfig, WeaponKind } from '../battle/BattleEngine';
import { getHero, STARTER_PARTY } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';
import { mainlineMob } from './EnemyCatalog';
import { signatureFor } from './EquipmentConfig';
import type { Equipment } from './EquipmentConfig';
import type { FormationEntry } from './FormationConfig';

export const DIFFICULTIES = ['探路', '硬仗', '翻天'] as const;
export type Difficulty = 0 | 1 | 2;
export const DIFFICULTY_PALETTES = [
    { card: '#385D62', border: '#83C5BB' },
    { card: '#383357', border: '#A899E6' },
    { card: '#321D2C', border: '#EC7F69' },
] as const;
const LEGACY_MAPS = [
    { id: 'road', name: '长坂路', boss: '拦路校尉', goal: 30, scene: 401, visualId: 'mob-shield', weapon: 'sword', ink: '#658693' },
    { id: 'ridge', name: '铁枪坡', boss: '铁枪坡督军', goal: 44, scene: 201, visualId: 'mob-spear', weapon: 'spear', ink: '#8F794B' },
    { id: 'bridge', name: '小桥口', boss: '追骑统领', goal: 48, scene: 801, visualId: 'mob-bow', weapon: 'bow', ink: '#BC8248' },
    { id: 'siege', name: '长坂围阵', boss: '长坂铁骑都尉', goal: 60, scene: 101, visualId: 'mob-axe', weapon: 'axe', ink: '#9D6559' },
    { id: 'rift', name: '赤门惊坛·断桥', boss: '守阵将·断桥铁胆', goal: 100, scene: 901, visualId: 'mob-shaman', weapon: 'staff', ink: '#8369AF' },
    { id: 'yellow-road', name: '破旗坡', boss: '裂旗头目', goal: 30, scene: 1, visualId: 'mob-shield', weapon: 'sword', ink: '#9F7A47' },
    { id: 'yellow-ridge', name: '铁锅营', boss: '铁锅寨主', goal: 40, scene: 501, visualId: 'mob-axe', weapon: 'axe', ink: '#A76346' },
    { id: 'yellow-bridge', name: '黄巾岗', boss: '黄巾弩督', goal: 46, scene: 301, visualId: 'mob-bow', weapon: 'bow', ink: '#AA8B50' },
    { id: 'yellow-siege', name: '祭旗台', boss: '祭旗渠帅', goal: 58, scene: 701, visualId: 'mob-shaman', weapon: 'staff', ink: '#976E71' },
    { id: 'yellow-rift', name: '赤门惊坛·黄天', boss: '守阵将·黄天雷师', goal: 100, scene: 601, visualId: 'mob-shaman', weapon: 'staff', ink: '#B38453' },
] as const;
const CAMPAIGN = [
    { id: 'yellow', name: '黄巾开锅', scene: 1, ink: '#B68C53', maps: ['破旗坡','铁锅营','黄巾岗','破鼓沟','焦麦地','缚旗寨','雷符井','祭旗台'], heroes: ['huatuo','caiwenji','chengpu','handang','guanhai'] },
    { id: 'tiger', name: '虎牢拍门', scene: 201, ink: '#A8684D', maps: ['汜水哨','石门道','风沙口','铁蒺坡','裂盾营','悬锤阶','双戟桥','虎牢关'], heroes: ['lvbu','diaochan','dianwei','xuhuang'] },
    { id: 'grain', name: '徐州护粮', scene: 101, ink: '#AA9965', maps: ['春野驿','米袋巷','护粮桥','空仓里','护车堤','暗弩棚','谷桶阵','粮车围'], heroes: ['liubei','xunyu','yuejin','mifang','jianyong','songxian'] },
    { id: 'fire', name: '官渡烧仓', scene: 301, ink: '#AA5947', maps: ['河沿营','断粮路','乌巢外','焦车渡','黑烟垒','灰粮台','破桶场','官渡大营'], heroes: ['caocao','xuchu','zhenji','caohong'] },
    { id: 'longban', name: '长坂七转', scene: 401, ink: '#658693', maps: ['长坂路','铁枪坡','小桥口','追蹄滩','弩台口','乱石坂','断桥头','长坂围阵'], heroes: ['zhaoyun','zhangfei','mizhu','liaohua'] },
    { id: 'wind', name: '赤壁借风', scene: 501, ink: '#D2784E', maps: ['雾中渡','箭雨江','连船坞','船钉湾','铁锁江','潮头营','火索台','火船口'], heroes: ['zhouyu','xiaoqiao','daqiao','ganning','huanggai'] },
    { id: 'ferry', name: '荆襄争渡', scene: 801, ink: '#54887F', maps: ['竹影道','青雾桥','两江汊','滩头哨','芦花港','锁船堤','斜帆寨','夺渡营'], heroes: ['guanyu','sunce','sunquan','sunshangxiang','taishici','zhoucang'] },
    { id: 'mountain', name: '蜀道抄近', scene: 701, ink: '#766F9C', maps: ['石阶口','云上栈','山崖寨','折木梯','挂铃崖','回声洞','缆车关','入蜀关'], heroes: ['machao','huangyueying','pangtong','huangzhong'] },
    { id: 'south', name: '南中闯寨', scene: 601, ink: '#658449', maps: ['林边寨','象鼓坡','火藤径','竹牙洞','兽印谷','赤泥台','七索桥','七门寨'], heroes: ['jiaxu','zhurong','luxun'] },
    { id: 'star', name: '五丈点星', scene: 901, ink: '#7964A3', maps: ['夜旗原','星火营','断续阵','漏刻台','落星沟','六角垒','借灯道','五丈星台'], heroes: ['zhugeliang','simayi','zhangliao'] },
] as const satisfies readonly { id: string; name: string; scene: number; ink: string; maps: readonly string[]; heroes: readonly HeroId[] }[];

const MAP_STYLES = [
    { loot: 'armor', tactic: 'vanguard', weapon: 'sword', visualId: 'mob-shield', boss: '先锋', hint: '盾兵在前，先击破前阵' },
    { loot: 'equipment', tactic: 'iron', weapon: 'axe', visualId: 'mob-axe', boss: '铁甲督军', hint: '铁甲兵防御更高' },
    { loot: 'officer', tactic: 'arrows', weapon: 'bow', visualId: 'mob-bow', boss: '强弩校尉', hint: '快弩兵密集，留意后排' },
    { loot: 'armor', tactic: 'guard', weapon: 'spear', visualId: 'mob-spear', boss: '护寨头领', hint: '两名精卫为首领挡伤' },
    { loot: 'equipment', tactic: 'fire', weapon: 'staff', visualId: 'mob-shaman', boss: '纵火术士', hint: '火术士会灼烧，带治疗稳住队伍' },
    { loot: 'charm', tactic: 'regen', weapon: 'staff', visualId: 'mob-shaman', boss: '回生坛主', hint: '敌人每秒回复生命' },
    { loot: 'officer', tactic: 'assault', weapon: 'spear', visualId: 'mob-spear', boss: '突阵队长', hint: '精兵起手快，先护住主公' },
    { loot: 'charm', tactic: 'finale', weapon: 'axe', visualId: 'mob-axe', boss: '镇关大将', hint: '攻破重重敌阵，击败镇关大将' },
] as const;
export type MapLoot = typeof MAP_STYLES[number]['loot'];
export type ChapterMap = string;
export interface ChapterMapEntry {
    id: ChapterMap; name: string; boss: string; goal: number; scene: number; visualId: string; weapon: WeaponKind;
    ink: string; chapter: number; rank: number; rift: boolean;
}
const WEAPONS: readonly WeaponKind[] = ['sword','halberd','bow','axe','spear','dual','glaive','fan','staff','serpent','ribbon','qin'];
const FINALE_LEADERS = [
    null, { name: '虎牢·飞将吕布', hero: 'lvbu' }, { name: '护粮大斧·徐晃', hero: 'xuhuang' },
    { name: '乌巢军师·贾诩', hero: 'jiaxu' }, null, { name: '铁索火督·周瑜', hero: 'zhouyu' },
    { name: '夺渡督军·孙权', hero: 'sunquan' }, { name: '山门神射·黄忠', hero: 'huangzhong' },
    { name: '七寨火帅·祝融', hero: 'zhurong' }, { name: '断星军师·司马懿', hero: 'simayi' },
] as const;
const LEGACY_IDS: Record<string, readonly string[]> = {
    yellow: ['yellow-road', 'yellow-ridge', 'yellow-bridge', '', '', '', '', 'yellow-siege', 'yellow-rift'],
    longban: ['road', 'ridge', 'bridge', '', '', '', '', 'siege', 'rift'],
};
export const CHAPTERS = CAMPAIGN.map((chapter, index) => ({
    ...chapter,
    maps: chapter.maps.map((_, rank) => LEGACY_IDS[chapter.id]?.[rank] || `${chapter.id}-${rank + 1}`),
    rift: LEGACY_IDS[chapter.id]?.[8] || `${chapter.id}-rift`,
    index,
}));
export const CHAPTER_MAPS: ChapterMapEntry[] = CHAPTERS.reduce((entries, chapter) => {
    chapter.maps.forEach((id, rank) => {
        const style = MAP_STYLES[rank];
        const name = CAMPAIGN[chapter.index].maps[rank];
        const legacy = LEGACY_MAPS.find(map => map.id === id);
        const leader = rank === 7 ? FINALE_LEADERS[chapter.index] : null;
        const hero = leader ? getHero(leader.hero)! : null;
        entries.push({ id, name,
            boss: leader?.name ?? `${name}·${style.boss}`, goal: [30,40,46,42,46,50,54,58][rank],
            scene: (chapter.scene + 100 * (rank % 4) - 1) % 900 + 1, ink: chapter.ink,
            weapon: hero?.weapon ?? style.weapon, visualId: hero?.visualId ?? style.visualId, ...legacy, chapter: chapter.index, rank, rift: false });
    });
    const legacy = LEGACY_MAPS.find(map => map.id === chapter.rift);
    entries.push({ id: chapter.rift, name: `赤门惊坛·${chapter.name.slice(0,2)}`,
        goal: 100, scene: chapter.scene, visualId: 'mob-shaman', weapon: 'staff',
        ink: chapter.ink, ...legacy, boss: '巨影将群 · 组合轮换', chapter: chapter.index, rank: 8, rift: true });
    return entries;
}, [] as ChapterMapEntry[]);
const MAP_INDEX = new Map(CHAPTER_MAPS.map(entry => [entry.id, entry]));
export function chapterIndex(map: ChapterRoute): number { return MAP_INDEX.get(map)?.chapter ?? -1; }
export function chapterMaps(index: number) { return CHAPTERS[index].maps.map(id => MAP_INDEX.get(id)!); }
export function chapterRift(index: number) { return MAP_INDEX.get(CHAPTERS[index].rift)!; }
export function isChapterRift(map: ChapterRoute): boolean { return !!MAP_INDEX.get(map)?.rift; }
export function nextCampaignMap(map: ChapterRoute): ChapterMapEntry | undefined {
    const entry = MAP_INDEX.get(map);
    if (!entry || entry.rift) return undefined;
    return chapterMaps(entry.chapter)[entry.rank + 1]
        ?? (CHAPTERS[entry.chapter + 1] ? chapterMaps(entry.chapter + 1)[0] : undefined);
}
export function chapterMapRank(map: ChapterMap): number { return MAP_INDEX.get(map)!.rank; }
export function chapterLoot(map: ChapterMap): MapLoot { return MAP_STYLES[chapterMapRank(map)].loot; }
export function chapterMapHint(map: ChapterMap): string { return MAP_STYLES[chapterMapRank(map)].hint; }
export function chapterWeapon(map: ChapterMap): WeaponKind {
    if (map === 'ridge') return 'spear';
    if (map === 'yellow-ridge') return 'sword';
    return WEAPONS[(chapterIndex(map) + (chapterMapRank(map) === 4 ? 4 : 0)) % WEAPONS.length];
}
export const DAILY_STAMINA = 300;
export const RAGE_TONIC = { name: '鼓劲汤', cost: 90, bonus: .35 } as const;
export const SPEED_TONIC = { name: '疾行汤', cost: 120, speed: 4 } as const;
export const TONIC_LIMIT = 4;
export const TONIC_RUNS = 10;
export type Tonic = 'rage' | 'speed';
export const CHAPTER_MIN_LEVELS = [1, 5, 8, 11, 14, 17, 20, 23, 26, 29] as const;

export type StoryPhase = 'intro' | 'outro';
type StoryLine = readonly [speaker: string, line: string, portrait?: HeroId];
const CHAPTER_DIALOGUE: readonly Record<StoryPhase, readonly StoryLine[]>[] = [
    { intro: [['主公','门口怎么竖着一百面黄旗？'],['程普','他们说苍天已死。锅里的早饭还活着。','chengpu'],['主公','先上破旗坡！留一面旗给锅盖挡风。']],
      outro: [['蔡文姬','祭旗台清干净了。雷声也停了。','caiwenji'],['主公','那刚才是谁在打雷？'],['程普','是全军的肚子。开饭，然后赶往虎牢！','chengpu']] },
    { intro: [['主公','听说虎牢的门上写着免战。'],['典韦','我敲了三下，它改写成免敲了。','dianwei'],['主公','从汜水哨绕过去。手疼就用鼓槌。']],
      outro: [['吕布','我这一戟能扫倒三军！','lvbu'],['主公','还扫掉了你自己的门闩。'],['貂蝉','门开了，徐州的粮车可以过了。','diaochan']] },
    { intro: [['刘备','徐州粮车少了半袋米。','liubei'],['主公','快查，是谁偷吃了？'],['糜芳','米袋刚学会漏米，我们先沿春野驿找车。','mifang']],
      outro: [['荀彧','粮车一辆不少，米袋也补上了。','xunyu'],['主公','补袋子用的是什么？'],['刘备','借了敌将的披风。官渡那边还有一车。','liubei']] },
    { intro: [['许褚','对面粮仓守得滴水不漏。','xuchu'],['主公','那一缕炊烟是谁漏的？'],['曹洪','跟着烟走，河沿营那边有条小路。','caohong']],
      outro: [['曹操','仓烧了，敌军晚饭改成喝西北风。','caocao'],['主公','把锅带走。我们走长坂，路上还有人要接。'],['许褚','锅太沉，我把晚饭先吃完再抬。','xuchu']] },
    { intro: [['赵云','长坂敌阵有七道，我可以闯七趟。','zhaoyun'],['主公','我们先闯一趟，剩下六趟写进战报。'],['张飞','过长坂路！桥交给我，我吼一声试试。','zhangfei']],
      outro: [['张飞','桥没事，就是我嗓子没声了。','zhangfei'],['主公','下次吼之前先喝水。'],['赵云','河上有船，我们顺水去赤壁。','zhaoyun']] },
    { intro: [['周瑜','万事俱备，只欠东风。','zhouyu'],['小乔','你把扇子拿反了。','xiaoqiao'],['主公','先从雾中渡上船。风到之前把火绳收好。']],
      outro: [['甘宁','铁索断了！连对面的船都分家了。','ganning'],['主公','把自己的船拴牢，别跟着分家。'],['周瑜','东风还在，正好顺势去荆襄。','zhouyu']] },
    { intro: [['孙权','荆襄要塞只认渡船的通行令。','sunquan'],['主公','我们的令呢？'],['周仓','掉水里了。先走竹影道，我去捞一捞。','zhoucang']],
      outro: [['关羽','渡口拿下。通行令也捞上来了。','guanyu'],['主公','这一看就是块咸鱼。'],['孙尚香','拿着吧，蜀道上至少还能当干粮。','sunshangxiang']] },
    { intro: [['黄月英','蜀道窄得连木牛都要侧着走。','huangyueying'],['主公','那可不能带牛车并排。'],['马超','从石阶口排成一列。走丢的听铃声。','machao']],
      outro: [['黄忠','入蜀关到了，我那支箭还比我们早到。','huangzhong'],['主公','下回让箭先去订客栈。'],['庞统','南边有人敲象鼓。收队，朝鼓声去。','pangtong']] },
    { intro: [['祝融','南中的象一听见鼓就跑。','zhurong'],['主公','往哪边跑？'],['祝融','它自己决定。先从林边寨进去，离鼓远点。','zhurong']],
      outro: [['陆逊','七门寨都清了。象现在只跟着粮车。','luxun'],['主公','它赢了整场仗，奖两捆草。'],['贾诩','北边五丈原灯火不对劲，出发时记得带灯。','jiaxu']] },
    { intro: [['诸葛亮','星灯借我三盏，可照断续阵。','zhugeliang'],['主公','灯油还有多少？'],['张辽','够走到夜旗原。谁打喷嚏谁负责挡风。','zhangliao']],
      outro: [['司马懿','你们把五丈星台的阵眼找着了？','simayi'],['诸葛亮','在锅底。主公拿它垫了十章。','zhugeliang'],['主公','好！把阵眼擦擦，今晚还是用它垫锅。']] },
];

export function chapterDialogue(index: number, phase: StoryPhase): readonly StoryLine[] {
    return CHAPTER_DIALOGUE[index][phase];
}

export function chapterStoryIndex(map: ChapterMap, phase: StoryPhase): number {
    return CHAPTERS.findIndex(chapter => chapter.maps[phase === 'intro' ? 0 : 7] === map);
}

export function chapterLevelLock(map: ChapterRoute, level: number): string | null {
    const index = chapterIndex(map);
    const minimum = CHAPTER_MIN_LEVELS[index];
    return minimum && level < minimum ? `主公需达到 Lv.${minimum} · 可回战图刷经验` : null;
}

export const DUNGEON_HALL = '奇战营';

export function chapterFirstEquipment(map: ChapterMap, id: string): Equipment | undefined {
    if (map !== 'yellow-road' && map !== 'road') return undefined;
    const yellow = map === 'yellow-road';
    return { id, name: yellow ? '破旗短刀' : '长坂行军枪', rarity: 1, stage: 1, chapter: true,
        slot: 'weapon', appearance: yellow ? 'sword' : 'spear', attack: 32, defense: 4, maxHp: 100 };
}

export function chapterEquipment(map: ChapterMap, difficulty: Difficulty, id: string): Equipment | undefined {
    const entry = MAP_INDEX.get(map)!;
    const loot = chapterLoot(map);
    const growth = entry.chapter > 4 ? entry.chapter - 3 : entry.chapter === 4 ? 1 : entry.chapter;
    const common = { id, rarity: ([1, 2, 3] as const)[difficulty], stage: 1 + entry.chapter * 8 + entry.rank, chapter: true as const };
    if (loot === 'armor') {
        const names = map === 'yellow-road' ? ['补旗布甲','绳扣皮甲','黄巾铁衣']
            : map === 'road' ? ['石纹甲','宽檐铁甲','长坂重甲'] : ['轻甲','锁甲','重甲'].map(name => entry.name + name);
        return { ...common, name: names[difficulty], slot: 'armor', appearance: 'armor',
            attack: 2, defense: 16 + difficulty * 9 + growth * 4, maxHp: 180 + difficulty * 110 + growth * 36 };
    }
    if (loot === 'equipment') {
        const names = map === 'yellow-ridge' ? ['开锅刀','锅沿厚刃','铁锅断旗刀']
            : map === 'ridge' ? ['挑石枪','翻坡长枪','铁脊破阵枪'] : ['随军兵刃','巧作兵刃','镇军兵刃'].map(name => entry.name + name);
        return { ...common, name: names[difficulty], slot: 'weapon', appearance: chapterWeapon(map),
            attack: 34 + difficulty * 16 + growth * 8, defense: 5 + difficulty * 5, maxHp: 120 + difficulty * 60 };
    }
    if (loot === 'charm') {
        const names = map === 'yellow-siege' ? ['黄布旗符','铜铃阵符','祭旗雷符']
            : map === 'siege' ? ['押营符','铁骑符','围阵虎符'] : ['军符','战符','虎符'].map(name => entry.name + name);
        return { ...common, name: names[difficulty], slot: 'charm', appearance: 'charm',
            attack: 5 + difficulty * 6 + growth * 3, defense: 3 + growth * 2, maxHp: 245 + difficulty * 140 + growth * 40 };
    }
    return undefined;
}

export const chapterSeed = (serial: number): number => (20261105 + serial) >>> 0;
function chapterWaveRoll(seed: number): number {
    let hash = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function chapterMonsterWaves(seed: number): 1 | 2 | 3 {
    const roll = chapterWaveRoll(seed);
    return roll < .2 ? 1 : roll < .8 ? 2 : 3;
}

export const DELVE_TICKET = '赤门令';
export const DELVE_TICKET_CAP = 10;
export const DELVE_ROOMS = ['横闯外廊','过门 · 逆阶上攻','过门 · 横扫偏殿','进赤门 · 击碎封坛','巨将出坛 · 清剿随卫'] as const;

export const SIDE_DUNGEONS = {
    duel: { name: ACTIVITY_NAMES.boss, art: 'boss', note: '正面讨伐 · 30秒个人战报' },
    assault: { name: ACTIVITY_NAMES.city, art: 'city', note: '横向破门 · 对手为本地守军' },
} as const;
export type SideDungeon = keyof typeof SIDE_DUNGEONS;
export type ChapterRoute = ChapterMap | 'workshop' | SideDungeon;
export function isSideDungeon(map: ChapterRoute): map is SideDungeon {
    return map === 'duel' || map === 'assault';
}
// Retain the old weapon target key for pending encounters saved by r16f.
export type LootTarget = 'officer' | 'spear';
export function chapterRiftPool(map: ChapterMap): readonly HeroId[] { return CHAPTERS[chapterIndex(map)].heroes; }
export function chapterTarget(map: ChapterMap, target: LootTarget, selected?: HeroId) {
    const hero = selected ?? chapterRiftPool(map)[0];
    const officer = getHero(hero)!;
    return target === 'officer' ? { name: `${officer.name}将帖`, rate: officer.tier === 4 ? .03 : officer.tier === 3 ? .07 : .12, hero }
        : { name: signatureFor(hero).name, rate: .05, hero };
}
export function chapterStoryHero(map: ChapterMap): HeroId | undefined {
    const rank = chapterMapRank(map);
    if (map === 'road') return 'zhangfei';
    if (map === 'yellow-road') return 'chengpu';
    if (map === 'bridge') return 'mizhu';
    if (map === 'yellow-bridge') return 'caiwenji';
    if (rank === 2) return chapterRiftPool(map).find(id => getHero(id)!.tier === 3);
    return undefined;
}
export function chapterMapOfficer(map: ChapterMap): HeroId | undefined {
    if (map === 'bridge') return 'liaohua';
    if (map === 'yellow-bridge') return 'handang';
    if (chapterLoot(map) !== 'officer') return undefined;
    const pool = chapterRiftPool(map).filter(id => getHero(id)!.tier < 4);
    return pool[chapterMapRank(map) === 2 ? pool.length - 1 : 0];
}

const RIFT_TRAITS = [
    { id: 'iron', name: '铁卫', hint: '精卫血量与护甲增加' },
    { id: 'arrows', name: '连弩', hint: '弓手增多，出手加快' },
    { id: 'regen', name: '回生', hint: '敌人每秒回复2%生命' },
] as const;
export function chapterRiftTrait(seed: number) {
    return RIFT_TRAITS[seed % RIFT_TRAITS.length];
}

export const MAP_DROP_RATES = {
    armor: [.25, .45, .65],
    equipment: [.35, .6, .85],
    charm: [.2, .35, .55],
    officer: [.12, .24, .4],
} as const;
export function chapterOfficerSource(id: HeroId): string {
    if (STARTER_PARTY.indexOf(id) >= 0) return '开局随将';
    const story = CHAPTER_MAPS.find(map => !map.rift && chapterStoryHero(map.id) === id);
    if (story) return `${story.name} · 探路首通`;
    const drop = CHAPTER_MAPS.find(map => !map.rift && chapterMapOfficer(map.id) === id);
    if (drop) return `${drop.name} · 将帖掉落`;
    const chapter = CHAPTERS.find(entry => (entry.heroes as readonly HeroId[]).indexOf(id) >= 0)!;
    return `${chapterRift(chapter.index).name} · 定向将帖`;
}

export function chapterSignatureSource(id: HeroId): string {
    const chapter = CHAPTERS.find(entry => (entry.heroes as readonly HeroId[]).indexOf(id) >= 0)!;
    return `${chapterRift(chapter.index).name} · 定向专武`;
}

export const WORKSHOPS = [
    { name: '炉前抢砂', material: '炉砂', action: '打磨', cost: 6, hint: '铁甲兵防御更高 · 带破阵武将' },
    { name: '灯下夺墨', material: '阵纹墨', action: '刻阵', cost: 6, hint: '弓兵密集且出手更快 · 用护阵稳住队伍' },
    { name: '将台夺印', material: '压阵印', action: '压阵', cost: 8, hint: '击破精卫后，督军额外受到25%伤害' },
] as const;
export type WorkshopIndex = 0 | 1 | 2;
const WORKSHOP_START_DAY = Date.UTC(2026, 10, 5) / 86400000; // Shanghai calendar day.
export function workshopIndex(window: number): WorkshopIndex {
    return ((window % 3 + 3) % 3) as WorkshopIndex;
}
export function workshopRotation(day: number) {
    const window = Math.floor((day - WORKSHOP_START_DAY) / 2);
    return { window, index: workshopIndex(window), switchAt: (WORKSHOP_START_DAY + (window + 1) * 2) * 86400000 - 8 * 3600000 };
}
export interface ChapterRun {
    id: string;
    map: ChapterRoute;
    difficulty: Difficulty;
    target?: LootTarget;
    targetHero?: HeroId;
    window?: number;
    bossId?: WorldBossId;
    level: number;
    layout: FormationEntry[];
    protagonistSpot: string;
    equipment: Record<string, CombatBonus>;
    seed: number;
    roll: number;
    monsterWaves?: 1 | 2 | 3;
    rageTonic?: true;
    speedTonic?: true;
}
export type ChapterClears = Partial<Record<ChapterMap, number>>;
export function chapterLock(clears: ChapterClears, map: ChapterRun['map'], difficulty: Difficulty, longbanTrial = false): string | null {
    if (map === 'workshop' || isSideDungeon(map)) return clears.road || clears['yellow-road'] ? null : '破旗坡或长坂路首通后开放';
    const index = chapterIndex(map);
    const [road, ridge, bridge, , , , , finale] = chapterMaps(index);
    const previous = index > 0 ? chapterMaps(index - 1)[7] : null;
    if (previous && !(index === 4 && longbanTrial) && !((clears[previous.id] || 0) & 1) && !clears[road.id]) return `先通关${previous.name}探路`;
    if (isChapterRift(map)) return (clears[finale.id] || 0) & 4 ? null : `${finale.name}翻天首通后开放`;
    if (map !== road.id && !((clears[road.id] || 0) & 1)) return `先通关${road.name}探路`;
    if (map === finale.id && !((clears[ridge.id] || 0) & (clears[bridge.id] || 0) & 1)) return `先通关${ridge.name}和${bridge.name}探路`;
    const rank = chapterMapRank(map);
    if (rank >= 3 && rank <= 6) {
        const route = chapterMaps(index)[rank <= 4 ? 1 : 2];
        if (!((clears[route.id] || 0) & 1)) return `先通关${route.name}探路`;
    }
    if (difficulty === 1 && !((clears[map] || 0) & 1)) return '先通关本图探路';
    if (difficulty === 2 && !((clears[finale.id] || 0) & 2)) return `先通关${finale.name}硬仗`;
    if (difficulty === 2 && !((clears[map] || 0) & 2)) return '先通关本图硬仗';
    return null;
}
export function chapterName(run: Pick<ChapterRun, 'map' | 'window'>): string {
    if (isSideDungeon(run.map)) return SIDE_DUNGEONS[run.map].name;
    return run.map === 'workshop' ? WORKSHOPS[workshopIndex(run.window!)].name : CHAPTER_MAPS.find(m => m.id === run.map)!.name;
}

export const CHAPTER_PROTAGONIST_ID = 'chapter-protagonist';
export const CHAPTER_PROTAGONIST_COLOR = '#357F9A';
export function chapterProtagonist(level: number, spot: string): UnitConfig {
    const factor = levelFactor(level);
    return {
        id: CHAPTER_PROTAGONIST_ID, name: '主公', role: '主角 · 铁甲先锋', kind: 'hero', heroTier: 1, tactic: 'pierce',
        color: CHAPTER_PROTAGONIST_COLOR, weapon: 'sword', element: 'slash', skillName: '点将一击',
        maxHp: Math.round(2850 * factor), attack: Math.round(128 * factor), defense: Math.round(68 * factor),
        interval: 1.15, priority: -1, formationSpot: spot,
    };
}

export function chapterScenery(run: Pick<ChapterRun, 'map' | 'window'>): number {
    if (run.map === 'workshop') return [101, 501, 301][workshopIndex(run.window!)];
    return CHAPTER_MAPS.find(entry => entry.id === run.map)?.scene ?? 401;
}

export function createChapterOptions(run: ChapterRun): BattleOptions {
    const tonic = run.rageTonic ? 1 + RAGE_TONIC.bonus : 1;
    const companions = run.layout.filter(entry => entry.spot !== run.protagonistSpot);
    const base = createMainlineOptions(1, run.seed, run.level, run.equipment, [], 'mixed', companions);
    const heroes = [chapterProtagonist(run.level, run.protagonistSpot), ...base.heroes];
    if (isSideDungeon(run.map)) {
        const duel = run.map === 'duel';
        const side = createActivityOptions({
            id: run.id, mode: duel ? 'boss' : 'city', stage: 1, day: 0, worldBoss: run.bossId, level: run.level,
            party: [], layout: companions, equipment: run.equipment, choices: [],
            defenders: ['caohong', 'chengpu', 'liaohua', 'songxian', 'jianyong'],
        });
        const waves = side.waves.map(wave => wave.map(unit => {
            if (duel) return { ...unit, attack: Math.round(unit.attack * levelFactor(run.level) * 1.55) };
            if (unit.kind === 'wall') return unit;
            return { ...unit, maxHp: Math.round(unit.maxHp * .82), attack: Math.round(unit.attack * .72) };
        }));
        return { ...side, seed: run.seed, heroes, waves, heroEnergyMultiplier: .65 * tonic, heroEliteKillEnergy: 12 };
    }
    const workshop = run.map === 'workshop';
    const workIndex = workshop ? workshopIndex(run.window!) : 0;
    const map = workshop ? chapterMaps(4)[workIndex] : MAP_INDEX.get(run.map)!;
    const trait = isChapterRift(run.map) ? chapterRiftTrait(run.seed).id : undefined;
    // Prototype numbers are independent of the 999-stage map and use the actual player loadout.
    const legacyLongban = map.chapter === 4 && (map.rank <= 2 || map.rank >= 7);
    const chapterScale = legacyLongban ? 1 : [.87,1.07,1.24,1.44,1.63,1.86,2.18,2.72,3.26,3.85][map.chapter];
    const rankScale = [1,1.16,1.32,1.28,1.34,1.39,1.44,1.48,1.64][map.rank];
    const difficultyScale = (map.chapter >= 5 ? [1,1.56,2.36] : [1,1.48,2.2])[run.difficulty];
    const scale = workshop ? 1.1 + workIndex * .15 : rankScale * difficultyScale * chapterScale;
    const tactic = map.rift ? undefined : MAP_STYLES[map.rank].tactic;
    const leader = !workshop && map.rank === 7 ? FINALE_LEADERS[map.chapter] : null;
    const bossHero = leader ? getHero(leader.hero)! : null;
    const guarded = run.difficulty === 2 || (workshop && workIndex === 2) ? 'break'
        : run.difficulty === 1 || (!workshop && tactic === 'guard') ? 'guard' : undefined;
    const boss: UnitConfig = { ...base.bossWave![0], name: workshop ? `${chapterName(run)}·督军` : map.boss,
        weapon: map.weapon, element: !workshop && tactic === 'fire' ? 'fire' : bossHero?.element ?? base.bossWave![0].element,
        skillName: tactic === 'fire' ? '燎旗火阵' : bossHero?.skillName, openingEnergy: tactic === 'fire' && !workshop ? 94 : undefined, tactic: bossHero?.tactic === 'heal' ? 'guard' : bossHero?.tactic, visualId: map.visualId, color: map.ink, maxHp: Math.round(1750 * scale),
        attack: Math.round(103 * scale), defense: Math.round(20 * scale), openingCooldown: .12, guarded,
    };
    const guards = guarded ? base.waves[1].slice(0, 2).map((unit, i): UnitConfig => ({
        ...unit, id: `chapter-escort-${i}`, name: '护阵精卫', elite: true, bodyguard: true, priority: -2,
        maxHp: Math.round(430 * scale * (trait === 'iron' ? 1.2 : 1)), attack: Math.round(30 * scale), defense: Math.round(18 * scale * (trait === 'iron' ? 1.3 : 1)),
    })) : [];
    const armoredCamp = (!workshop && tactic === 'iron') || (workshop && workIndex === 0);
    const archerLine = (!workshop && tactic === 'arrows') || (workshop && workIndex === 1) || trait === 'arrows';
    const waveSource = workshop || map.chapter === 0 || map.chapter === 4 ? base.waves
        : base.waves.map((wave, number) => wave.map((_, i) => mainlineMob(map.scene, number, i, 1)));
    const planned = run.monsterWaves;
    const eliteRoll = chapterWaveRoll(run.seed ^ 0x41c64e6d);
    const eliteSlots = [0, 2, 3, 5, 6];
    const eliteIndex = eliteSlots[Math.floor(chapterWaveRoll(run.seed ^ 0x9e3779b9) * eliteSlots.length)];
    const archer = waveSource[0].find(unit => unit.weapon === 'bow')!;
    const waves = waveSource.slice(0, planned ?? waveSource.length).map((wave, waveIndex) => wave.map((unit, index) => {
        const bowLine = archerLine && (index === 1 || index === 4);
        const gear = bowLine ? archer : unit;
        const charging = !workshop && tactic === 'assault' && index % 3 === 0;
        const extraElite = planned !== undefined && waveIndex === planned - 1 &&
            (planned === 1 && index === eliteIndex || eliteRoll < .24 + run.difficulty * .14 && index === (planned === 1 ? 7 : eliteIndex));
        const elite = !!unit.elite || extraElite;
        const fireCaster = !workshop && tactic === 'fire' && elite;
        return {
            ...gear, id: unit.id, elite, riftValue: extraElite ? 10 : unit.riftValue,
            name: extraElite ? `精英·${gear.name}` : gear.name, role: elite ? '精英' : gear.role,
            kind: fireCaster ? 'hero' : gear.kind, openingEnergy: fireCaster ? 94 : undefined, tactic: fireCaster ? 'cleave' : gear.tactic, element: fireCaster ? 'fire' : gear.element,
            openingCooldown: charging ? .1 : .16 + (index % 3) * .065, interval: gear.interval * (bowLine || charging ? .72 : 1),
            maxHp: Math.round(gear.maxHp * scale * (extraElite ? 2.8 : 1)), attack: Math.round(gear.attack * scale * (extraElite ? 1.55 : 1) + 28),
            defense: Math.round(gear.defense * scale * (armoredCamp ? 2.4 : 1) * (extraElite ? 2 : 1)),
        };
    }));
    const enemyRegen = trait === 'regen' || (!workshop && tactic === 'regen') ? .02 : undefined;
    if (map.rift && run.targetHero) {
        const pack = (index: number) => waves[index].slice(0, 5).map(unit => ({ ...unit, id: `delve-${index}-${unit.id}` }));
        const jar: UnitConfig = { ...boss, id: 'delve-jar', visualId: 'delve-jar', name: '赤纹封坛', kind: 'wall',
            attack: 0, defense: 0, maxHp: Math.round(320 * scale), guarded: undefined };
        const pool = chapterRiftPool(run.map);
        const variant = (run.seed + Math.floor(run.seed / 3)) % 3;
        const giants = Array.from({ length: variant === 2 ? 3 : 2 }, (_, i): UnitConfig => {
            const officer = getHero(pool[(variant + i) % pool.length])!;
            const tank = (variant + i) % 3 === 0;
            return { ...boss, id: `delve-giant-${i}`, visualId: officer.id, name: `巨影·${officer.name}`, weapon: officer.weapon,
                element: officer.element, color: officer.color, tactic: officer.tactic, skillName: officer.skillName,
                guarded: undefined, maxHp: Math.round(boss.maxHp * (tank ? .60 : .44)),
                attack: Math.round(boss.attack * (tank ? .36 : .50)), defense: Math.round(boss.defense * (tank ? 1.32 : .82)), priority: tank ? 0 : 1 };
        });
        const minions = pack(3).slice(0, trait === 'iron' ? 4 : 3).map(unit => trait === 'iron'
            ? { ...unit, defense: Math.round(unit.defense * 1.35), maxHp: Math.round(unit.maxHp * 1.2) } : unit);
        return { ...base, heroes, waves: [pack(0), pack(1), pack(2), [jar], [...giants, ...minions]], riftGoal: 0,
            bossWave: undefined, scriptedBossWave: 4, enemyRegen, heroEnergyMultiplier: .35 * tonic, heroEliteKillEnergy: 12, rangedApproach: true, bossOpeningStrike: true, interWaveDelay: 1.05, timeLimit: 150 };
    }
    const goal = planned ? waves.reduce((total, wave) => total + wave.reduce((sum, enemy) => sum + (enemy.riftValue ?? 10), 0), 0) : map.goal;
    const rageRate = planned ? .56 / planned : .33 * 30 / map.goal;
    return { ...base, heroes, waves, enemyRegen, riftGoal: goal,
        heroEnergyMultiplier: rageRate * (1 + run.difficulty * .16) * tonic, heroEliteKillEnergy: 12, rangedApproach: true, bossOpeningStrike: true, bossWave: [...guards, boss] };
}


/** Planned monster waves, including the boss room. Empty gate scenery never consumes stamina. */
export function chapterStaminaCost(run: ChapterRun): number {
    if (run.monsterWaves) return run.monsterWaves + 1;
    const options = createChapterOptions(run);
    if (!options.riftGoal) return options.waves.filter(wave => wave.some(unit => unit.kind !== 'wall')).length;
    let energy = 0;
    let waves = 0;
    while (energy < options.riftGoal) {
        for (const enemy of options.waves[waves % options.waves.length]) energy += enemy.riftValue ?? 10;
        waves++;
    }
    return waves + 1;
}

export function chapterBattleExperience(run: ChapterRun, won: boolean, enemyExperience: number): number {
    const index = Math.max(0, chapterIndex(run.map));
    const kills = enemyExperience * (1 + Math.floor(index / 3) + run.difficulty);
    return kills + (won ? (24 + index * 7) * (run.difficulty + 1) : 0);
}
