import { levelFactor, MAX_LEVEL } from './GrowthConfig';
import { ACTIVITY_NAMES, createActivityOptions } from './ActivityConfig';
import type { WorldBossId } from './WorldBossConfig';
import { createMainlineOptions } from './BattleConfig';
import type { BattleOptions, CombatBonus, UnitConfig, WeaponKind } from '../battle/BattleEngine';
import { getHero, STARTER_PARTY } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';
import { mainlineMob } from './EnemyCatalog';
import { ARMOR_NAMES, CHAPTER_PROTAGONIST_ID, CHARM_NAMES, signatureFor, SLOT_ORDER, WEAPON_NAMES, wearerEquipmentTypes } from './EquipmentConfig';
import type { Equipment, EquipmentSlot } from './EquipmentConfig';
import type { FormationEntry } from './FormationConfig';
import { CAMPAIGN_EXPANSION } from './CampaignExpansion';

export { CHAPTER_PROTAGONIST_ID } from './EquipmentConfig';

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
const OPENING_CAMPAIGN = [
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
const CAMPAIGN = [...OPENING_CAMPAIGN, ...CAMPAIGN_EXPANSION];

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
function finaleLeader(index: number): { name: string; hero: HeroId } | null {
    if (index < OPENING_CAMPAIGN.length) return FINALE_LEADERS[index];
    const chapter = CAMPAIGN_EXPANSION[index - OPENING_CAMPAIGN.length];
    return { name: `${chapter.maps[7]}·${getHero(chapter.leader)!.name}`, hero: chapter.leader };
}
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
        const leader = rank === 7 ? finaleLeader(chapter.index) : null;
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
export const CAMPAIGN_BATCH_SIZE = 5;
export const CHAPTER_COIN_REWARDS = [120, 180, 280] as const;
export const CHAPTER_CLEAR_SOULS = 2;
export const DAILY_SOUL_CAP = 20;
export const RAGE_TONIC = { name: '鼓劲汤', cost: 90, bonus: .35 } as const;
export const SPEED_TONIC = { name: '疾行汤', cost: 120, speed: 4 } as const;
export const TONIC_LIMIT = 4;
export const TONIC_RUNS = 10;
export type Tonic = 'rage' | 'speed';
export const CHAPTER_MIN_LEVELS = CHAPTERS.map((_, index) => index === 0 ? 1 : index * 3 + 2);

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
      outro: [['司马懿','你们把五丈星台的阵眼找着了？','simayi'],['诸葛亮','在锅底。主公拿它垫了十章。','zhugeliang'],['主公','怎么擦一下飞出个铃？跟上，别让它掉进汤里！']] },
];

export function chapterDialogue(index: number, phase: StoryPhase): readonly StoryLine[] {
    if (index < OPENING_CAMPAIGN.length) return CHAPTER_DIALOGUE[index][phase];
    const chapter = CAMPAIGN_EXPANSION[index - OPENING_CAMPAIGN.length];
    const leader = getHero(chapter.leader)!;
    if (phase === 'intro') return [['传令兵', chapter.clue], [leader.name, `我在${chapter.maps[7]}等你们。`, leader.id],
        ['主公', `先去${chapter.maps[0]}探路，锅别落下！`]];
    const next = CAMPAIGN_EXPANSION[index - OPENING_CAMPAIGN.length + 1];
    return [[leader.name, `${chapter.maps[7]}的路通了。`, leader.id], ['传令兵', next ? next.clue : '五十章的军报都齐了，饭也熟了。'],
        ['主公', next ? `去${next.maps[0]}。这一回谁也别把地图当锅盖！` : '收兵开饭！谁拿了我的大勺？']];
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

const MAP_LOOT_SLOTS: Record<MapLoot, EquipmentSlot | undefined> = {
    armor: 'armor', equipment: 'weapon', charm: 'charm', officer: undefined,
};

export function chapterEquipment(map: ChapterMap, difficulty: Difficulty, id: string,
    slot = MAP_LOOT_SLOTS[chapterLoot(map)]): Equipment | undefined {
    const entry = MAP_INDEX.get(map)!;
    const growth = entry.chapter;
    const common = { id, rarity: ([1, 2, 3] as const)[difficulty], stage: 1 + entry.chapter * 8 + entry.rank, chapter: true as const };
    if (slot === 'armor') {
        if (map === 'yellow-4' && difficulty === 1) return { ...ASSAULT_ARMOR_DROP.item, ...common };
        const names = map === 'yellow-road' ? ['补旗布甲','绳扣皮甲','黄巾铁衣']
            : map === 'road' ? ['石纹甲','宽檐铁甲','长坂重甲'] : ['轻甲','锁甲','重甲'].map(name => entry.name + name);
        return { ...common, name: names[difficulty], slot: 'armor', appearance: 'armor',
            attack: 2, defense: 16 + difficulty * 9 + growth * 4, maxHp: 180 + difficulty * 110 + growth * 36 };
    }
    if (slot === 'weapon') {
        const names = map === 'yellow-ridge' ? ['开锅刀','锅沿厚刃','铁锅断旗刀']
            : map === 'ridge' ? ['挑石枪','翻坡长枪','铁脊破阵枪'] : ['随军兵刃','精制兵刃','巧作兵刃'].map(name => entry.name + name);
        return { ...common, name: names[difficulty], slot: 'weapon', appearance: chapterWeapon(map),
            attack: 34 + difficulty * 16 + growth * 8, defense: 5 + difficulty * 5, maxHp: 120 + difficulty * 60 };
    }
    if (slot === 'charm') {
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

const CAMPAIGN_RIFT_GOAL = 30;

function campaignWave(scene: number, seed: number, difficulty: Difficulty, wave: number): UnitConfig[] {
    const packSeed = seed ^ Math.imul(wave + 1, 0x9e3779b9);
    const size = 6 + Math.floor(chapterWaveRoll(packSeed) * 3);
    const roll = chapterWaveRoll(packSeed ^ 0x41c64e6d);
    const eliteCount = roll < .30 + difficulty * .05 ? 2 : roll < .45 + difficulty * .08 ? 1 : 0;
    // Arrow formations replace slots 1 and 4. Keep their archers separate from the elite roll.
    const slots = [0, 2, 3, 5, 6, 7].filter(index => index < size);
    const elites = Array.from({ length: eliteCount }, (_, i) => {
        const slot = Math.floor(chapterWaveRoll(packSeed ^ Math.imul(i + 1, 0x85ebca6b)) * slots.length);
        return slots.splice(slot, 1)[0];
    });
    return Array.from({ length: size }, (_, index) => mainlineMob(scene, wave, index, 1, elites.indexOf(index) >= 0));
}

function mobWavesUntilGoal(waves: UnitConfig[][], goal: number): number {
    let energy = 0;
    let count = 0;
    while (energy < goal) {
        for (const enemy of waves[count % waves.length]) energy += enemy.riftValue ?? 10;
        count++;
    }
    return count;
}

export const DELVE_TICKET = '赤门令';
export const CAMPAIGN_TICKET_CAP = 10;
export const ASSAULT_TICKETS_PER_WIN = 2;
export const DELVE_ROOMS = ['横闯外廊','传送 · 逆阶上攻','传送 · 横扫偏殿','坛室 · 击碎封坛','巨将出坛 · 清剿随卫'] as const;
export const DELVE_REVEAL_SECONDS = 1.25;

export const SIDE_DUNGEONS = {
    duel: { name: ACTIVITY_NAMES.boss, art: 'boss', note: '正面讨伐 · 30秒个人战报' },
    assault: { name: ACTIVITY_NAMES.city, art: 'city', note: '横向破门 · 对手为本地守军', coins: 210 },
} as const;
// The same armor moves to the early campaign. The old chance is used by already-started siege runs.
export const ASSAULT_ARMOR_DROP = {
    rate: .3,
    item: { name: '撞门铁甲', rarity: 2, stage: 1, chapter: true, slot: 'armor', appearance: 'armor',
        attack: 2, defense: 32, maxHp: 315 } satisfies Omit<Equipment, 'id'>,
} as const;
export const DUEL_MILESTONES = [
    { name: '震鼓', damage: 8000, coins: 180 },
    { name: '掀营', damage: 25000, coins: 450 },
    { name: '封将', damage: 50000, coins: 0 },
] as const;
export const DUEL_CHARM = {
    name: '镇魔鼓符', rarity: 3, stage: 60, chapter: true, slot: 'charm', appearance: 'charm',
    attack: 36, defense: 18, maxHp: 620,
} as const satisfies Omit<Equipment, 'id'>;
const DUEL_TRACKS = {
    dongzhuo: { names: ['叩桌','裂席','劈盏','断梁','翻宴','碎甲','清场','拆酒池'], damage: [2200, 4400, 7400, 11200, 16300, 23000, 31500, 43500], material: 0, gear: '酒池镇门令', stats: [12, 35, 620] },
    zhangjiao: { names: ['断签','收符','灭烛','封坛','截雷','压云','撕天书','雷坛熄火'], damage: [2600, 5100, 8600, 12800, 18300, 25600, 34500, 46500], material: 1, gear: '避雷行军符', stats: [28, 15, 680] },
    menghuo: { names: ['拍山','惊寨','滚石','夺旗','翻象阵','碎山骨','平群峰','搬走大山'], damage: [2400, 4800, 8000, 12100, 17500, 24400, 33000, 44800], material: 2, gear: '蛮山破阵符', stats: [39, 20, 520] },
} as const;
export const DUEL_GRADE_COUNT = 8;
function duelDamageFactor(level: number): number { return levelFactor(level) * (1 + (level - 1) * .009); }
export function duelPerformance(score: number, level: number): number { return score / duelDamageFactor(level); }
export function duelGrades(boss: WorldBossId, level: number) {
    const track = DUEL_TRACKS[boss];
    return track.names.map((name, index) => ({
        name, damage: Math.ceil(track.damage[index] * duelDamageFactor(level)), normalized: track.damage[index],
        coins: Math.round((120 + index * index * 75) * (1 + level / 25) * (boss === 'dongzhuo' ? 1.25 : 1)),
        material: track.material, quantity: 3 + index * 3 + Math.floor(level / 10),
        brain: (boss === 'menghuo' ? 2 : 0) + Math.floor(index / 2),
        item: index === DUEL_GRADE_COUNT - 1 ? { id: `duel-trophy-${boss}`, name: track.gear, rarity: 3, stage: 60, chapter: true,
            slot: 'charm', appearance: 'charm', attack: track.stats[0], defense: track.stats[1], maxHp: track.stats[2] } as const satisfies Equipment : undefined,
    }));
}
export type SideDungeon = keyof typeof SIDE_DUNGEONS;
export type DailyChallenge = SideDungeon | 'workshop';
export const DAILY_CHALLENGE_LIMIT = 3;
export const ASSAULT_TICKET_CAP = ASSAULT_TICKETS_PER_WIN * DAILY_CHALLENGE_LIMIT;
export const DELVE_TICKET_CAP = CAMPAIGN_TICKET_CAP + ASSAULT_TICKET_CAP;
export function assaultTicketReward(level: number): number { return ASSAULT_TICKETS_PER_WIN + Math.floor(Math.min(level, MAX_LEVEL) / 30); }
export function assaultTicketCap(level: number): number { return assaultTicketReward(level) * DAILY_CHALLENGE_LIMIT; }
export function delveTicketCap(level: number): number { return CAMPAIGN_TICKET_CAP + assaultTicketCap(level); }
export function assaultCoinReward(level: number): number { return SIDE_DUNGEONS.assault.coins + 16 * (level - 1); }
export const TRANSFER_SEAL = '续火券';
export const TRANSFER_SEAL_RATE = .005;
export function delveTicketsForWin(source: 'campaign' | 'assault', earned: number, assaultEarned: number, level = 1): number {
    const remaining = source === 'assault' ? assaultTicketCap(level) - assaultEarned : CAMPAIGN_TICKET_CAP - (earned - assaultEarned);
    return Math.max(0, Math.min(source === 'assault' ? assaultTicketReward(level) : 1, remaining));
}
export type ChapterRoute = ChapterMap | 'workshop' | SideDungeon;
export function isSideDungeon(map: ChapterRoute): map is SideDungeon {
    return map === 'duel' || map === 'assault';
}
export function chapterRiftPool(map: ChapterMap): readonly HeroId[] { return CHAPTERS[chapterIndex(map)].heroes; }

type DelveDrop = { kind: 'officer'; hero: HeroId; rate: number }
    | { kind: 'signature' | 'relic' | 'gear'; item: Equipment; rate: number };

type WearerTypes = ReturnType<typeof wearerEquipmentTypes>;
function highGear(map: ChapterMap, id: string, slot: EquipmentSlot, rarity: 4 | 5, types: WearerTypes, field = false): Equipment {
    const base = chapterEquipment(map, 2, id, slot)!;
    const type = slot === 'weapon' ? WEAPON_NAMES[types.weapon] : slot === 'armor' ? ARMOR_NAMES[types.armor] : CHARM_NAMES[types.charm] + '符';
    const factor = field ? 1.13 : rarity === 4 ? 1.38 : 1.72;
    const prefix = field ? '试锋' : rarity === 4 ? '惊坛' : '镇坛';
    return { ...base, rarity, name: `${prefix}·${CHAPTERS[chapterIndex(map)].name.slice(0, 2)}${type}`,
        appearance: slot === 'weapon' ? types.weapon : slot, armorType: slot === 'armor' ? types.armor : undefined,
        charmType: slot === 'charm' ? types.charm : undefined,
        attack: Math.round(base.attack * factor), defense: Math.round(base.defense * factor), maxHp: Math.round(base.maxHp * factor) };
}

export function chapterDelveGear(map: ChapterMap, id: string, legacy = false): { item: Equipment; rate: number; relic?: true }[] {
    const index = chapterIndex(map);
    const finale = chapterMaps(index)[7].id;
    if (!legacy) {
        const types = [...chapterRiftPool(map), CHAPTER_PROTAGONIST_ID].map(wearerEquipmentTypes);
        const gear: { item: Equipment; rate: number }[] = SLOT_ORDER.map(slot => ({ item: chapterEquipment(finale, 2, id, slot)!, rate: 8 }));
        for (const rarity of [4, 5] as const) {
            for (const slot of SLOT_ORDER) {
                const distinct = types.filter((entry, i) => types.findIndex(type => type[slot] === entry[slot]) === i);
                for (const type of distinct) gear.push({ item: highGear(finale, id, slot, rarity, type), rate: (rarity === 4 ? 12 : 3) / SLOT_ORDER.length / distinct.length });
            }
        }
        return gear;
    }
    const base = { id, rarity: 3, stage: (index + 1) * 8, chapter: true } as const;
    const relics = [
        { item: { ...base, name: '惊坛遗甲', slot: 'armor', appearance: 'armor', attack: 6,
            defense: 49 + index * 5, maxHp: 460 + index * 45 }, rate: 1, relic: true },
        { item: { ...base, name: '回煞令', slot: 'charm', appearance: 'charm', attack: 26 + index * 4,
            defense: 13 + index * 3, maxHp: 650 + index * 55 }, rate: 1, relic: true },
    ] as const;
    return [...relics, ...SLOT_ORDER.map(slot => ({ item: chapterEquipment(finale, 1, id, slot)!, rate: 8 }))];
}

export function chapterDelvePool(map: ChapterMap, id: string, run?: Pick<ChapterRun, 'target' | 'targetHero' | 'lootVersion'>): DelveDrop[] {
    const roster = chapterRiftPool(map);
    const legacy = !!run && run.lootVersion !== 2;
    const gear: DelveDrop[] = chapterDelveGear(map, id, legacy).map(({ item, rate, relic }) => ({ kind: relic ? 'relic' : 'gear', item, rate }));
    const legacyTier = (hero: HeroId) => getHero(hero)!.tier === 5 ? 4 : Math.min(getHero(hero)!.tier, 3);
    if (run?.target) {
        const hero = run.targetHero ?? roster[0];
        const tier = legacyTier(hero);
        return [run.target === 'officer' ? { kind: 'officer', hero, rate: tier === 4 ? 3 : tier === 3 ? 7 : 12 }
            : { kind: 'signature', item: { ...signatureFor(hero), chapter: true }, rate: tier === 4 ? 2 : 5 }, ...gear];
    }
    const drops: DelveDrop[] = [];
    const ranks = legacy ? [[4, 3], [3, 7], [2, 12]] : [[5, 3], [4, 4], [3, 6], [2, 12]];
    for (const [tier, rate] of ranks) {
        const heroes = roster.filter(hero => Math.max(2, legacy ? legacyTier(hero) : getHero(hero)!.tier) === tier);
        for (const hero of heroes) drops.push({ kind: 'officer', hero, rate: rate / heroes.length });
    }
    for (const divine of [true, false]) {
        const heroes = roster.filter(hero => (getHero(hero)!.tier === 5) === divine);
        for (const hero of heroes) drops.push({ kind: 'signature', item: { ...signatureFor(hero), chapter: true }, rate: (divine ? 2 : 5) / heroes.length });
    }
    return drops.concat(gear);
}

export function chapterDelveDrop(run: Pick<ChapterRun, 'map' | 'target' | 'targetHero' | 'roll' | 'lootVersion'>, id: string): DelveDrop | undefined {
    let cutoff = 0;
    return chapterDelvePool(run.map, id, run).find(drop => run.roll < (cutoff += drop.rate) / 100);
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

interface MapGearDrop { slot: EquipmentSlot; rate: number; end: number; fieldPink?: true }
export function chapterGearPool(map: ChapterMap, difficulty: Difficulty, updated = true): MapGearDrop[] {
    const loot = chapterLoot(map);
    const primary = MAP_LOOT_SLOTS[loot];
    const primaryRate = Math.round(MAP_DROP_RATES[loot][difficulty] * 100);
    const secondary = SLOT_ORDER.filter(slot => slot !== primary);
    const field = updated && difficulty === 2 && chapterIndex(map) >= 7;
    const extraRate = Math.min(3 + 3 * difficulty + Math.floor(chapterIndex(map) / 3), Math.floor(((field ? 99 : 100) - primaryRate) / secondary.length));
    const pool: MapGearDrop[] = secondary.map((slot, index) => ({ slot, rate: extraRate, end: primaryRate + (index + 1) * extraRate }));
    if (primary) pool.unshift({ slot: primary, rate: primaryRate, end: primaryRate });
    if (field) pool.push({ slot: primary ?? 'weapon', rate: .3, end: 100, fieldPink: true });
    return pool;
}

export function chapterDropEquipment(map: ChapterMap, difficulty: Difficulty, id: string, drop: MapGearDrop): Equipment {
    const index = chapterIndex(map) + chapterMapRank(map);
    return drop.fieldPink ? highGear(map, id, drop.slot, 4, { weapon: chapterWeapon(map), armor: (['cloth', 'leather', 'heavy'] as const)[index % 3],
        charm: (['assault', 'guard', 'support'] as const)[index % 3] }, true) : chapterEquipment(map, difficulty, id, drop.slot)!;
}

export function chapterOfficerSource(id: HeroId): string {
    if (STARTER_PARTY.indexOf(id) >= 0) return '开局随将';
    const story = CHAPTER_MAPS.find(map => !map.rift && chapterStoryHero(map.id) === id);
    if (story) return `${story.name} · 探路首通`;
    const drop = CHAPTER_MAPS.find(map => !map.rift && chapterMapOfficer(map.id) === id);
    if (drop) return `${drop.name} · 将帖掉落`;
    const chapter = CHAPTERS.find(entry => (entry.heroes as readonly HeroId[]).indexOf(id) >= 0)!;
    return `${chapterRift(chapter.index).name} · 将帖掉落`;
}

export function chapterSignatureSource(id: HeroId): string {
    const chapter = CHAPTERS.find(entry => (entry.heroes as readonly HeroId[]).indexOf(id) >= 0)!;
    return `${chapterRift(chapter.index).name} · 专武掉落`;
}

export const WORKSHOPS = [
    { name: '炉前抢砂', material: '炉砂', action: '打磨', cost: 6, time: 35, goal: '限时击破重甲守队', hint: '35秒击破重甲守队 · 破阵武将适合抢砂' },
    { name: '灯下夺墨', material: '阵纹墨', action: '刻阵', cost: 6, time: 60, goal: '击退两批伏击弩手', hint: '伏击弩手开场先手 · 用护阵稳住队伍' },
    { name: '将台夺印', material: '压阵印', action: '压阵', cost: 8, time: 60, goal: '先破精卫，再打督军', hint: '精卫落败后，督军额外受到25%伤害' },
] as const;
export type WorkshopIndex = 0 | 1 | 2;
export const MAX_POLISH = 12;
const POLISH_RATES = [100, 90, 80, 68, 55, 43, 33, 25, 18, 12, 8, 5];
export function polishRate(item: Equipment): number { return POLISH_RATES[item.polish || 0] ?? 0; }
export function polishEnergyNeeded(item: Equipment, current = item.polish || 0): number {
    return (current + 1) * (12 + 4 * item.rarity + Math.floor(item.stage / 12));
}
export function totalPolishEnergy(item: Equipment): number {
    let total = item.polishEnergy || 0;
    for (let level = 0; level < (item.polish || 0); level++) total += polishEnergyNeeded(item, level);
    return total;
}
export function polishTransfer(source: Equipment, target: Equipment): { level: number; energy: number; overflow: number } {
    let level = target.polish || 0;
    let energy = (target.polishEnergy || 0) + totalPolishEnergy(source);
    while (level < MAX_POLISH && energy >= polishEnergyNeeded(target, level)) {
        energy -= polishEnergyNeeded(target, level);
        level++;
    }
    return level === MAX_POLISH ? { level, energy: 0, overflow: energy } : { level, energy, overflow: 0 };
}

export function tuningMaterialCost(item: Equipment, action: WorkshopIndex): number {
    if (action !== 0) return WORKSHOPS[action].cost + Math.floor(item.stage / 24);
    const level = item.polish || 0;
    return Math.ceil((5 + level * 2 + level * level / 3) * (1 + (item.rarity - 1) * .13 + item.stage / 180));
}

export function tuningCoinCost(item: Equipment, action: WorkshopIndex): number {
    const level = item.polish || 0;
    const base = action === 0 ? 64 + 26 * level + 10 * level * level : action === 1 ? 140 : 220;
    return Math.round(base * item.rarity * (1 + (item.stage - 1) / 110));
}

export function polishInvestment(item: Equipment): { sand: number; coins: number } {
    return item.polishSpend ?? { sand: (item.polish || 0) * WORKSHOPS[0].cost, coins: 0 };
}

export function workshopMaterialReward(level: number, first: boolean): number {
    return (first ? 14 : 9) + Math.floor(level * (first ? .85 : .55));
}
export function workshopBonusRate(level: number): number { return Math.min(.65, .20 + level * .003); }
export function workshopBonusMaterial(level: number): number { return 3 + Math.floor(level / 12); }

export function campaignMaterialReward(map: ChapterMap, difficulty: Difficulty): number {
    const rank = chapterMapRank(map);
    return rank === 5 || rank === 7 ? difficulty + 1 + Math.floor(chapterIndex(map) / 3) : 0;
}
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
    // Only pending runs started before the shared drop pool have a chosen target.
    target?: 'officer' | 'spear';
    targetHero?: HeroId;
    window?: number;
    bossId?: WorldBossId;
    assaultTickets?: true;
    lootVersion?: 2;
    level: number;
    layout: FormationEntry[];
    protagonistSpot: string;
    equipment: Record<string, CombatBonus>;
    seed: number;
    roll: number;
    extraRolls?: number[];
    dynamicRift?: true;
    monsterWaves?: 1 | 2 | 3;
    rageTonic?: true;
    speedTonic?: true;
    duelPractice?: true;
}

export function usesDelveRooms(run: Pick<ChapterRun, 'map' | 'target' | 'targetHero'>): boolean {
    return isChapterRift(run.map) && (!run.target || !!run.targetHero);
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

export const CHAPTER_PROTAGONIST_COLOR = '#357F9A';
export function chapterProtagonist(level: number, spot: string, bonus?: CombatBonus): UnitConfig {
    const factor = levelFactor(level);
    return {
        id: CHAPTER_PROTAGONIST_ID, name: '主公', role: '主角 · 铁甲先锋', kind: 'hero', heroTier: 1, tactic: 'pierce',
        color: CHAPTER_PROTAGONIST_COLOR, weapon: 'sword', element: 'slash', skillName: '点将一击',
        maxHp: Math.round((2850 + (bonus?.maxHp ?? 0)) * factor), attack: Math.round((128 + (bonus?.attack ?? 0)) * factor),
        defense: Math.round((68 + (bonus?.defense ?? 0)) * factor), openingShield: bonus?.openingShield, openingAttack: bonus?.openingAttack,
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
    const heroes = [chapterProtagonist(run.level, run.protagonistSpot, run.equipment[CHAPTER_PROTAGONIST_ID]), ...base.heroes];
    if (isSideDungeon(run.map)) {
        const duel = run.map === 'duel';
        const side = createActivityOptions({
            id: run.id, mode: duel ? 'boss' : 'city', stage: 1, day: 0, worldBoss: run.bossId, level: run.level,
            party: [], layout: companions, equipment: run.equipment, choices: [],
            defenders: ['caohong', 'chengpu', 'liaohua', 'songxian', 'jianyong'],
        });
        const growth = run.lootVersion ? levelFactor(run.level) : 1;
        const assaultPressure = run.lootVersion ? 1 + (run.level - 1) * .0025 : 1;
        const waves = side.waves.map(wave => wave.map(unit => {
            if (duel) return { ...unit, defense: Math.round(unit.defense * growth), attack: Math.round(unit.attack * levelFactor(run.level) * 1.55) };
            if (unit.kind === 'wall') return { ...unit, maxHp: Math.round(unit.maxHp * assaultPressure),
                defense: Math.round(unit.defense * growth) };
            return { ...unit, maxHp: Math.round(unit.maxHp * .82 * assaultPressure), attack: Math.round(unit.attack * .72 * assaultPressure),
                defense: Math.round(unit.defense * assaultPressure) };
        }));
        return { ...side, seed: run.seed, heroes, waves, heroEnergyMultiplier: (duel && run.lootVersion ? 1 : .65) * tonic, heroEliteKillEnergy: 12 };
    }
    const workshop = run.map === 'workshop';
    const workIndex = workshop ? workshopIndex(run.window!) : 0;
    const map = workshop ? chapterMaps(4)[workIndex] : MAP_INDEX.get(run.map)!;
    const trait = isChapterRift(run.map) ? chapterRiftTrait(run.seed).id : undefined;
    // Prototype numbers are independent of the 999-stage map and use the actual player loadout.
    const legacyLongban = map.chapter === 4 && (map.rank <= 2 || map.rank >= 7);
    const openingScales = [.87,1.07,1.24,1.44,1.63,1.86,2.18,2.72,3.26,3.85];
    const chapterScale = legacyLongban ? 1 : openingScales[map.chapter] ?? 3.85 * levelFactor(CHAPTER_MIN_LEVELS[map.chapter] - 28);
    const rankScale = [1,1.16,1.32,1.28,1.34,1.39,1.44,1.48,1.64][map.rank];
    const difficultyScale = (map.chapter >= 10 ? [1, 1.73, 2.9] : map.chapter >= 5 ? [1, 1.56, 2.36] : [1, 1.48, 2.2])[run.difficulty];
    const scale = workshop ? (1.1 + workIndex * .15) * (run.lootVersion ? levelFactor(run.level) ** .94 * (1 + (run.level - 1) * .0025) : 1) : rankScale * difficultyScale * chapterScale;
    const tactic = map.rift ? undefined : MAP_STYLES[map.rank].tactic;
    const leader = !workshop && map.rank === 7 ? finaleLeader(map.chapter) : null;
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
    const waveSource = run.dynamicRift ? Array.from({ length: 3 }, (_, wave) => campaignWave(map.scene, run.seed, run.difficulty, wave))
        : workshop || map.chapter === 0 || map.chapter === 4 ? base.waves
            : base.waves.map((wave, number) => wave.map((_, i) => mainlineMob(map.scene, number, i, 1)));
    const planned = run.monsterWaves;
    const eliteRoll = chapterWaveRoll(run.seed ^ 0x41c64e6d);
    const eliteSlots = [0, 2, 3, 5, 6];
    const eliteIndex = eliteSlots[Math.floor(chapterWaveRoll(run.seed ^ 0x9e3779b9) * eliteSlots.length)];
    const archer = waveSource[0].find(unit => unit.weapon === 'bow' && !unit.elite) ?? base.waves[0].find(unit => unit.weapon === 'bow')!;
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
    if (workshop) {
        const options = { ...base, heroes, riftGoal: 0, bossWave: undefined,
            heroEnergyMultiplier: .8 * tonic, heroEliteKillEnergy: 12, rangedApproach: true, timeLimit: WORKSHOPS[workIndex].time };
        if (workIndex === 0) {
            const miners = waves[0].slice(0, 5).map(unit => ({ ...unit, maxHp: Math.round(unit.maxHp * 1.6) }));
            return { ...options, waves: [miners] };
        }
        if (workIndex === 1) {
            const ambushes = waves.slice(0, 2).map(wave => wave.slice(0, 6).map(unit => unit.weapon === 'bow'
                ? { ...unit, openingCooldown: 0, interval: unit.interval * .85 } : unit));
            return { ...options, waves: ambushes, approachTime: 0, interWaveDelay: .6 };
        }
        return { ...options, waves: [[...guards, boss]], scriptedBossWave: 0, bossWarningTime: 0, bossOpeningStrike: true };
    }
    if (usesDelveRooms(run)) {
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
            bossWave: undefined, scriptedBossWave: 4, bossWarningTime: DELVE_REVEAL_SECONDS, enemyRegen, heroEnergyMultiplier: .35 * tonic, heroEliteKillEnergy: 12, rangedApproach: true, bossOpeningStrike: true, interWaveDelay: 1.05, timeLimit: 150 };
    }
    const goal = run.dynamicRift ? CAMPAIGN_RIFT_GOAL
        : planned ? waves.reduce((total, wave) => total + wave.reduce((sum, enemy) => sum + (enemy.riftValue ?? 10), 0), 0) : map.goal;
    const rageRate = run.dynamicRift ? [.42, .33, .305][mobWavesUntilGoal(waves, goal) - 1] : planned ? .56 / planned : .33 * 30 / map.goal;
    return { ...base, heroes, waves, enemyRegen, riftGoal: goal,
        heroEnergyMultiplier: rageRate * (1 + run.difficulty * .16) * tonic, heroEliteKillEnergy: 12, rangedApproach: true, bossOpeningStrike: true, bossWave: [...guards, boss] };
}


/** Only the campaign consumes stamina, including its boss wave. */
export function chapterStaminaCost(run: ChapterRun): number {
    if (isChapterRift(run.map) || run.map === 'workshop' || isSideDungeon(run.map)) return 0;
    const multiplier = run.extraRolls ? CAMPAIGN_BATCH_SIZE : 1;
    if (run.monsterWaves) return (run.monsterWaves + 1) * multiplier;
    const options = createChapterOptions(run);
    return (mobWavesUntilGoal(options.waves, options.riftGoal!) + 1) * multiplier;
}

export function chapterCoinReward(run: Pick<ChapterRun, 'map' | 'difficulty' | 'level' | 'lootVersion'>): number {
    if (run.map === 'assault') return assaultCoinReward(run.lootVersion ? run.level : 1);
    const base = CHAPTER_COIN_REWARDS[run.difficulty];
    if (!run.lootVersion) return base;
    const index = chapterIndex(run.map);
    return index >= 0 ? base + Math.max(0, index - 9) * 40 * (run.difficulty + 1) : base + Math.floor(run.level / 10) * 24;
}

export function chapterBattleExperience(run: Pick<ChapterRun, 'map' | 'difficulty'>, won: boolean, enemyExperience: number): number {
    const index = Math.max(0, chapterIndex(run.map));
    const kills = enemyExperience * (1 + Math.floor(index / 3) + run.difficulty);
    const scale = index === 0 ? 1 : index < 10 ? .63 : .63 + (index - 9) * .035;
    return Math.round(kills * scale) + (won ? Math.round((24 + index * 7) * (run.difficulty + 1) * scale) : 0);
}
