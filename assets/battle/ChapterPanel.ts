import { Color, Graphics, Node, UITransform, view } from 'cc';
import {
    ASSAULT_ARMOR_DROP, CAMPAIGN_TICKET_CAP, assaultTicketCap, assaultTicketReward, delveTicketCap,
    CHAPTERS, CHAPTER_CLEAR_SOULS, chapterCoinReward, CHAPTER_MAPS, CHAPTER_MIN_LEVELS, CHAPTER_PROTAGONIST_ID,
    DAILY_CHALLENGE_LIMIT, DAILY_SOUL_CAP, DAILY_STAMINA, DELVE_TICKET, DIFFICULTIES, DIFFICULTY_PALETTES,
    DUEL_CHARM, DUEL_MILESTONES, duelGrades, DUNGEON_HALL, MAP_DROP_RATES, RAGE_TONIC, SIDE_DUNGEONS, SPEED_TONIC, TONIC_LIMIT, TONIC_RUNS, WORKSHOPS,
    chapterBattleExperience, chapterDelvePool, chapterDialogue, chapterDropEquipment, chapterFirstEquipment, chapterGearPool,
    chapterIndex, chapterMapHint, chapterMapOfficer, chapterMaps, chapterName, chapterProtagonist, chapterRift, chapterRiftTrait,
    campaignMaterialReward, chapterSeed, chapterStoryHero, delveTicketsForWin,
    isChapterRift, isSideDungeon, workshopIndex, workshopMaterialReward, workshopBonusRate, workshopBonusMaterial, TRANSFER_SEAL, TRANSFER_SEAL_RATE,
} from '../data/ChapterConfig';
import type { ChapterRun, Difficulty, StoryPhase } from '../data/ChapterConfig';
import { formatAmount, MAX_LEVEL } from '../data/GrowthConfig';
import type { HeroId } from '../data/HeroCatalog';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import { ProgressStore } from './ProgressStore';
import type { ChapterRewardDetail, ChapterRewardPreview } from './ProgressStore';
import { equipmentFitLabel, equipmentStats, RARITY_COLORS, RARITY_NAMES, signatureEffect, SLOT_NAMES, slotOf } from '../data/EquipmentConfig';
import { equipmentIcon } from './EquipmentIcon';
import { heroArtwork, heroDetails } from './HeroCard';
import { FormationPanel } from './FormationPanel';
import { portrait } from './HeroPortrait';
import { mainlineTheme } from '../data/MainlineThemes';
import { worldBoss } from '../data/WorldBossConfig';
import { comicHead } from './ComicHead';
import { UnitActor } from './UnitActor';
import { previewUnit } from './UnitPreview';
import { button, makeNode, panel, text } from './BattleUI';

export type CampaignSection = 'camp' | 'chart' | 'dungeons' | 'workshop' | 'roster';

interface MapEntry {
    id: ChapterRun['map'];
    name: string;
    boss: string;
    scene: number;
    visualId: string;
    ink: string;
}

interface ChapterPanelOptions {
    current?: ChapterRun;
    chapter?: number;
    map?: ChapterRun['map'];
    section?: CampaignSection;
    version: string;
    close?: () => void;
    gear: () => void;
    heroes: () => void;
    sound: () => void;
    profile?: () => void;
}

const PLAY_GUIDE = [
    { title: '出营 · 刷图', cards: [
        ['五十章战图', '从破旗坡出发，首通可拿武将和装备。\n先看上一章收尾，再开启下一章剧情。'],
        ['破阵与首领', '战斗自动推进，击杀涨破阵进度，精英加得更多。\n进度满后首领现身，击败它就过关。'],
        ['三档难度', '探路、硬仗、翻天逐档解锁。\n备战时用箭头切难度，点掉落名称看属性。'],
        ['体力与连刷', '每天早7点恢复至300体力。连刷遇败即停。\n五倍结算只打一场，败退也扣五倍体力。'],
    ] },
    { title: '布阵 · 养成', cards: [
        ['主公与随将', '主公必上阵，可再带0–4名随将或小兵。\n拖动换位，怒气满后可点技能或开启自动施法。'],
        ['装备与整装', '主公和随将共用背包，均可穿武器、战甲、兵符。\n打磨加属性，刻阵加开场效果，压阵强化阵纹。'],
        ['将帖与升星', '剧情和掉落可结识武将，重复将帖转专属碎片。\n升星优先用本将碎片，脑力可补足差额。'],
        ['离线挂机与药铺', '派队后才开始刷已通关战图，回来领取时扣体力。\n鼓劲汤加快聚气，疾行汤解锁4倍速。'],
    ] },
    { title: '奇战营 · 四处战场', cards: [
        ['赤门惊坛', '章末翻天首通后开放对应章节，进场消耗赤门令。\n闯门击坛战巨将，刷稀有将帖、专武和遗珍。'],
        ['军器换班', '每两天更换战斗和材料。\n炉砂用于打磨、阵纹墨用于刻阵、压阵印用于压阵。'],
        ['魔王轮番揍', '每周轮换魔王，30秒内尽量打出高伤害。\n刷新个人纪录，达成伤害档位拿奖励。'],
        ['城门别闹', '带队冲击城门，破门后再击退守军。\n攻城胜利可拿额外赤门令。'],
    ] },
] as const;

export function showPlayGuide(parent: Node, multiplier: number, onClose: () => void, first = false): Node {
    const popup = panel(parent, 'ExperienceGift', 0, 0, 720, 1280, '#101A2DFE', 0);
    popup.on(Node.EventType.TOUCH_END, () => {});
    let page = 0;
    const render = () => {
        popup.destroyAllChildren();
        const guide = PLAY_GUIDE[page];
        text(popup, 'GiftTitle', '呆脑三国 · 出征手册', 0, 548, 34, '#F0CF8C', 660);
        text(popup, 'PlayGuidePageTitle', guide.title, 0, 487, 28, '#F5DBA1', 640);
        text(popup, 'GiftExperience', multiplier > 1 ? `经验 ×${multiplier}` : '单机刷宝', 0, 429, 26, '#E9D9AB', 600);
        text(popup, 'GiftRule', '进度保存在当前设备，武将和装备通过玩法获得', 0, 390, 19, '#AFCBD7', 650);
        guide.cards.forEach(([title, description], i) => {
            const card = panel(popup, `GuideCard-${i}`, 0, 292 - i * 154, 642, 140, '#20364D', 16);
            text(card, `GuideHeading-${i}`, title, 0, 37, 25, '#F1D5A0', 610);
            const body = text(card, `GuideText-${i}`, description, 0, -15, 21, '#C8D8E4', 594);
            body.node.getComponent(UITransform)!.setContentSize(594, 63);
        });
        const turn = (delta: number) => { page += delta; render(); };
        if (page > 0) button(popup, 'PreviousGuidePage', '‹ 上一页', -218, -310, 188, 60, '#344C66', () => turn(-1));
        text(popup, 'PlayGuidePageNumber', `${page + 1} / ${PLAY_GUIDE.length}`, 0, -310, 22, '#C8D8E4', 170);
        if (page + 1 < PLAY_GUIDE.length) button(popup, 'NextGuidePage', '下一页 ›', 218, -310, 188, 60, '#344C66', () => turn(1));
        button(popup, 'GiftContinue', first ? '进入主公营地' : '返回', 0, -425, 590, 68, '#4E7560', () => {
            popup.removeFromParent();
            popup.destroy();
            onClose();
        });
    };
    render();
    return popup;
}

export function chapterRewardLink(parent: Node, id: string, detail: ChapterRewardDetail, x: number, y: number,
    size: number, open: () => void, summary?: string): void {
    const officer = detail.hero ? getHero(detail.hero)! : undefined;
    const item = detail.item;
    const fragments = officer ? `${officer.name}专属碎片` : '';
    const name = item?.name ?? (summary?.startsWith(fragments) ? fragments : `${officer!.name}将帖`);
    const suffix = summary?.startsWith(name) ? summary.slice(name.length).trim() : '';
    const value = summary && !summary.startsWith(name) ? summary : name;
    const width = Math.min(312, value.length * size + 14);
    const suffixWidth = suffix ? Math.min(240, suffix.length * (size - 2) + 8) : 0;
    const color = item ? RARITY_COLORS[item.rarity - 1] : TIER_COLORS[officer!.tier - 1];
    const label = text(parent, id, value, x - suffixWidth / 2, y, size, color, width);
    label.isUnderline = true;
    label.underlineHeight = 1;
    label.node.on(Node.EventType.TOUCH_END, open);
    if (suffix) text(parent, id + 'Note', suffix, x + width / 2, y, size - 2, '#BBCBD4', suffixWidth);
}

export function showChapterReward(parent: Node, store: ProgressStore, detail: ChapterRewardDetail, source: string, onClose?: () => void): void {
    if (detail.hero) {
        heroDetails(parent, store, detail.hero, () => {}, { source, onClose });
        return;
    }
    const item = detail.item;
    const stats = equipmentStats(item);
    const color = RARITY_COLORS[item.rarity - 1];
    const overlay = panel(parent, 'ChapterLootDialog', 0, 0, 720, 1280, '#080F1CEB', 0);
    overlay.on(Node.EventType.TOUCH_END, () => {});
    const close = () => { overlay.destroy(); onClose?.(); };
    const sheet = panel(overlay, 'ChapterLootSheet', 0, 0, 604, 630, '#1C3047', 22);
    button(sheet, 'CloseChapterLoot', '×', 249, 260, 61, 57, '#3D5169', close);
    equipmentIcon(sheet, item, 136).setPosition(0, 168);
    text(sheet, 'ChapterLootName', item.name, 0, 64, 32, color, 540);
    text(sheet, 'ChapterLootType', `${[RARITY_NAMES[item.rarity - 1], SLOT_NAMES[slotOf(item)], equipmentFitLabel(item)].filter(Boolean).join(' · ')}`, 0, 18, 21, '#BCD0D8', 530);
    const attributes = [['攻击', stats.attack], ['防御', stats.defense], ['生命', stats.maxHp]] as const;
    attributes.forEach(([label, value], i) => {
        const tile = panel(sheet, `LootStat-${label}`, (i - 1) * 174, -58, 159, 79, '#2A4056', 11);
        text(tile, 'Label', label, 0, 17, 18, '#ADC2D4', 146);
        text(tile, 'Value', `+${formatAmount(value)}`, 0, -18, 26, '#F0DBA6', 146);
    });
    if (item.exclusive) text(sheet, 'ChapterLootEffect',
        `限${getHero(item.exclusive)!.name} · ${signatureEffect(item.exclusive)}`, 0, -125, 19, '#F0CD96', 550);
    text(sheet, 'ChapterLootSource', source, 0, -181, 19, '#AFC6D6', 550);
    button(sheet, 'BackFromChapterLoot', '返回战利品', 0, -252, 510, 59, '#435F70', close);
}

interface StoryControls {
    action: string;
    finish: () => boolean | void;
    alternate?: string;
    dismiss?: () => boolean | void;
    guide?: string;
}

export function showChapterStory(parent: Node, index: number, phase: StoryPhase, controls: StoryControls): void {
    const lines = chapterDialogue(index, phase);
    const overlay = panel(parent, 'ChapterStory', 0, 0, 720, 1280, '#12172BF5', 0);
    overlay.on(Node.EventType.TOUCH_END, () => {});
    let frame = 0;
    const render = () => {
        overlay.destroyAllChildren();
        const [speaker, line, hero] = lines[frame];
        const side = frame % 2 ? 1 : -1;
        const chapter = CHAPTERS[index];
        text(overlay, 'StoryChapter', `第${index + 1}章 · ${chapter.name}`, 0, 502, 36, '#F7DA9A', 620);
        text(overlay, 'StoryFrame', `${phase === 'intro' ? '开篇' : '收尾'} · ${frame + 1}/${lines.length}`, 0, 447, 22, '#B7C9DB', 580);
        const splash = panel(overlay, 'StoryComic', 0, 151, 620, 491, chapter.ink, 19);
        const ink = makeNode('ComicBurst', splash).addComponent(Graphics);
        for (let ray = 0; ray < 24; ray++) {
            const angle = ray * Math.PI / 12;
            const reach = ray % 2 ? 145 : 206;
            ink.fillColor = new Color(ray % 2 ? '#FFD99165' : '#252A3F54');
            ink.moveTo(side * 55 + Math.cos(angle) * 47, Math.sin(angle) * 47);
            ink.lineTo(side * 55 + Math.cos(angle - .07) * reach, Math.sin(angle - .07) * reach);
            ink.lineTo(side * 55 + Math.cos(angle + .07) * reach, Math.sin(angle + .07) * reach);
            ink.close(); ink.fill();
        }
        if (hero) heroArtwork(splash, hero, side * 77, -57, 2.25);
        else {
            const actor = new UnitActor(splash, previewUnit(chapterProtagonist(1, 'r1c2')), side * 77, -57, side * 77, -57, 2.25);
            actor.hp.node.active = false;
            actor.hpText.node.active = false;
            actor.node.getChildByName('Name')!.active = false;
        }
        const bubble = panel(overlay, 'StorySpeechBubble', 0, -189, 618, 176, '#F5DCAB', 21);
        const tail = makeNode('SpeechTail', bubble).addComponent(Graphics);
        tail.fillColor = new Color('#F5DCAB');
        tail.moveTo(side * 85 - 22, 78); tail.lineTo(side * 85 + 26, 78); tail.lineTo(side * 111, 122); tail.close(); tail.fill();
        text(bubble, 'StorySpeaker', speaker, side * 190, 52, 28, '#873D3B', 185);
        const dialogue = text(bubble, 'StoryDialogue', line, 0, -12, 29, '#263045', 565);
        dialogue.node.getComponent(UITransform)!.setContentSize(565, 89);
        const last = frame === lines.length - 1;
        const guide = text(overlay, 'StoryGuide', last ? controls.guide ?? '' : '', 0, -321, 20, '#F2CC87', 620);
        const choose = (action: () => boolean | void) => {
            if (action() === false) { guide.string = '剧情进度未保存，点击重试'; return; }
            overlay.removeFromParent();
            overlay.destroy();
        };
        button(overlay, 'StoryContinue', last ? controls.action : '下一格 ›',
            0, -393, 540, 66, '#5D4B3E', () => {
                if (last) choose(controls.finish);
                else { frame++; render(); }
            });
        if (controls.alternate && controls.dismiss) button(overlay, 'StorySkip', controls.alternate,
            0, -486, 294, 46, '#354B62', () => choose(controls.dismiss!));
    };
    render();
}

export function showCampaignEnding(parent: Node, store: ProgressStore, index: number,
    advance: (next: number | null) => void, close: () => void, backLabel: string): void {
    const next = CHAPTERS[index + 1];
    const lock = next ? store.chapterEntryLock(next.maps[0], 0) : null;
    const complete = (then: () => void) => {
        if (!store.completeChapterEnding(index)) return false;
        then();
        return true;
    };
    showChapterStory(parent, index, 'outro', {
        action: next ? lock ? `查看第${index + 2}章` : `前往第${index + 2}章` : '凯旋回营',
        guide: next ? `${next.name} · ${lock ?? '已开放'}` : '五十章主线告捷',
        finish: () => complete(() => advance(next?.index ?? null)),
        alternate: backLabel,
        dismiss: () => complete(close),
    });
}

type MapReward = { chance: string; use?: string } & ({ detail: ChapterRewardDetail; name?: never } | { name: string; detail?: never });

interface DropGroup {
    title: string;
    notes: readonly string[];
    rewards: MapReward[];
}

const WORKSHOP_USES = [
    '打磨提高基础属性，最高 +12，失败积累保底能量。',
    '刻阵可选开场护盾或增攻 12%。适合稳定接敌。',
    '把巧作及以上装备的阵纹从 12% 提到 22%。适合后期主力。',
] as const;

function dropChance(rate: number): string {
    const rounded = Math.round(rate * 100) / 100;
    return `${rounded === rate ? '' : '约 '}${rounded}%`;
}

function showMapDrops(parent: Node, store: ProgressStore, source: string, groups: DropGroup[]): void {
    const overlay = panel(parent, 'MapDropDetails', 0, 0, 720, 1280, '#0B1425EF', 0);
    overlay.on(Node.EventType.TOUCH_END, () => {});
    const pageSize = 6;
    let selected = 0;
    let page = 0;
    const render = () => {
        const previous = overlay.getChildByName('DropSheet');
        previous?.removeFromParent();
        previous?.destroy();
        const group = groups[selected];
        const visible = group.rewards.slice(page * pageSize, (page + 1) * pageSize);
        const pages = Math.ceil(group.rewards.length / pageSize);
        const height = 158 + (groups.length > 1 ? 61 : 0) + group.notes.length * 30 + visible.length * 70 + (pages > 1 ? 49 : 0);
        const sheet = panel(overlay, 'DropSheet', 0, 4, 632, height, '#1B2A40', 22);
        const top = height / 2;
        text(sheet, 'DropTitle', '掉落详情', -30, top - 45, 34, '#F3D797', 470);
        button(sheet, 'CloseMapDrops', '×', 255, top - 45, 57, 52, '#34475D', () => overlay.destroy());
        text(sheet, 'DropSource', source, 0, top - 88, 19, '#AABED4', 560);
        let y = top - 125;
        if (groups.length > 1) {
            groups.forEach((entry, index) => button(sheet, `DropGroup-${index}`, entry.title, (index - (groups.length - 1) / 2) * 182, y, 168, 47,
                selected === index ? '#75593D' : '#30445D', () => { selected = index; page = 0; render(); }));
            y -= 54;
        }
        for (const note of group.notes) {
            text(sheet, `DropNote-${y}`, note, 0, y, 19, '#CCD9E1', 562);
            y -= 30;
        }
        y -= 29;
        visible.forEach((reward, index) => {
            const row = panel(sheet, `DropRow-${index}`, 0, y - index * 70, 560, 61, index % 2 ? '#263A51' : '#2D4259', 9);
            const hero = reward.detail?.hero ? getHero(reward.detail.hero) : undefined;
            const item = reward.detail?.item;
            const name = reward.name ?? (hero ? `${hero.name}将帖` : item!.name);
            const color = hero ? TIER_COLORS[hero.tier - 1] : item ? RARITY_COLORS[item.rarity - 1] : '#F2D49C';
            const title = text(row, `DropName-${index}`, reward.detail ? `${name} ›` : name, -107, reward.use ? 12 : 0, 21, color, 315);
            text(row, `DropChance-${index}`, reward.chance, 163, reward.use ? 12 : 0, 17, '#D3E0E8', 213);
            if (reward.use) text(row, `DropUse-${index}`, reward.use, 0, -14, 17, '#B9CCD7', 532);
            if (reward.detail) {
                const detail = reward.detail;
                title.isUnderline = true;
                row.on(Node.EventType.TOUCH_END, () => showChapterReward(overlay, store, detail, `${source} · ${reward.chance}`));
            }
        });
        if (pages > 1) {
            const turn = (delta: number) => { page = (page + delta + pages) % pages; render(); };
            button(sheet, 'PreviousDropPage', '‹', -174, -top + 37, 88, 43, '#34475D', () => turn(-1));
            text(sheet, 'DropPageNumber', `${page + 1} / ${pages}`, 0, -top + 37, 20, '#AABED4', 160);
            button(sheet, 'NextDropPage', '›', 174, -top + 37, 88, 43, '#34475D', () => turn(1));
        }
    };
    render();
}

export class ChapterPanel {
    readonly node: Node;
    private map: ChapterRun['map'];
    private chapterIndex: number;
    private riftChapterIndex: number;
    private difficulty: Difficulty = 0;
    private page: 'camp' | 'chart' | 'dungeons' = 'camp';
    private mapDialog: Node | null = null;

    constructor(parent: Node, private store: ProgressStore, private onStart: (run: ChapterRun, count: number) => void,
        private options: ChapterPanelOptions) {
        const current = options.chapter === undefined ? options.current : undefined;
        const clears = store.progress.chapter.clears;
        const currentIndex = current ? chapterIndex(current.map) : -1;
        this.chapterIndex = options.chapter ?? (currentIndex >= 0 ? currentIndex : this.recommendedChapter());
        this.riftChapterIndex = this.chapterIndex;
        const maps = chapterMaps(this.chapterIndex);
        const selected = maps.find(entry => entry.id === options.map);
        const next = maps.find(entry => !((clears[entry.id] || 0) & 1));
        this.map = selected?.id || current?.map || next?.id || maps[maps.length - 1].id;
        this.difficulty = selected ? 0 : current?.difficulty ?? (next ? 0 : (clears[maps[maps.length - 1].id] || 0) & 2 ? 2 : 1);
        if (options.section === 'workshop') this.map = 'workshop';
        if (options.section === 'chart' || options.section === 'dungeons' || options.section === 'workshop') {
            this.showPage(options.section === 'chart' ? 'chart' : 'dungeons', false);
        }
        this.node = panel(parent, 'ChapterOverlay', 0, 0, 720, 1280, '#101A2B', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        if (options.close) button(this.node, 'CloseChapters', '×', 302, 541, 64, 60, '#364D63', () => { this.node.destroy(); options.close?.(); });
        if (options.profile) button(this.node, 'ChapterTestProfile', '本地测试台', 0, -572, 250, 44, '#293E53', () => { this.node.destroy(); options.profile?.(); });
        text(this.node, 'CampaignBuild', options.version, 0, -620, 16, '#8298AC', 650);
        this.render();
        if (options.section === 'roster') this.openRoster();
        else if (this.page !== 'dungeons' && !this.promptCampaignStory() && options.chapter !== undefined) {
            this.selectMap(selected ?? maps[0]);
        }
    }

    private recommendedChapter(): number {
        return Math.min(CHAPTERS.length - 1, this.store.campaignStoryChapter);
    }

    private openStoryChapter(index: number): void {
        const first = chapterMaps(index)[0];
        this.node.getChildByName('ChapterRoster')?.destroy();
        this.chapterIndex = index;
        this.map = first.id;
        this.difficulty = 0;
        this.showPage('chart', false);
        this.render();
        if (!this.promptCampaignStory() && this.store.chapterEntryLock(first.id, 0)) this.selectMap(first);
    }

    private promptCampaignStory(index = this.page === 'camp' ? this.recommendedChapter() : this.chapterIndex): boolean {
        if (this.store.progress.chapter.pending) return false;
        const ending = this.store.pendingChapterEnding;
        if (ending !== null) {
            showCampaignEnding(this.node, this.store, ending, next => {
                if (next === null) this.showPage('camp');
                else this.openStoryChapter(next);
            }, () => {}, '稍后出发');
            return true;
        }
        const first = chapterMaps(index)[0];
        if (!this.store.canStartChapterStory(index)) return false;
        showChapterStory(this.node, index, 'intro', {
            action: `前往${first.name}`,
            guide: '可先查看阵容、掉落和关卡条件',
            finish: () => {
                if (!this.store.completeChapterIntro(index)) return false;
                this.node.getChildByName('ChapterRoster')?.destroy();
                this.chapterIndex = index;
                this.difficulty = 0;
                this.showPage('chart', false);
                this.selectMap(first);
                return true;
            },
            alternate: '稍后出发',
            dismiss: () => this.store.completeChapterIntro(index),
        });
        return true;
    }

    private showPage(page: 'camp' | 'chart' | 'dungeons', refresh = true): void {
        this.page = page;
        if (page === 'chart' && (isChapterRift(this.map) || this.map === 'workshop' || isSideDungeon(this.map))) {
            this.map = chapterMaps(this.chapterIndex)[0].id;
            this.difficulty = 0;
        }
        if (page === 'dungeons' && !isChapterRift(this.map) && this.map !== 'workshop' && !isSideDungeon(this.map)) this.map = 'workshop';
        if (refresh) {
            this.render();
            if (page !== 'dungeons') this.promptCampaignStory();
        }
    }

    private renderCamp(body: Node): void {
        const p = this.store.progress;
        const shelter = panel(body, 'CampIllustration', 0, 225, 632, 386, '#344C5D', 18);
        const ink = makeNode('CampInk', shelter).addComponent(Graphics);
        const block = (x: number, y: number, w: number, h: number, color: string) => {
            ink.fillColor = new Color(color); ink.rect(x, y, w, h); ink.fill();
        };
        const polygon = (points: number[][], color: string) => {
            ink.fillColor = new Color(color); ink.moveTo(points[0][0], points[0][1]);
            points.slice(1).forEach(([x, y]) => ink.lineTo(x, y)); ink.close(); ink.fill();
        };
        ink.fillColor = new Color('#F6CD81'); ink.circle(192, 101, 39); ink.fill();
        polygon([[-312,-60],[-270,63],[-218,18],[-112,133],[-30,45],[55,93],[163,11],[255,61],[310,-13],[310,-147],[-312,-147]], '#54736D');
        block(-310,-175,620,112,'#AC8A60');
        block(-122,-119,244,155,'#A26047');
        polygon([[-151,27],[-108,90],[93,90],[153,27],[132,16],[-145,16]],'#253C47');
        block(-92,31,184,9,'#D8A36A');
        block(-34,-121,68,123,'#4E373A');
        block(-110,-55,48,42,'#F2C779'); block(62,-55,48,42,'#F2C779');
        block(-226,-116,10,129,'#433D43'); polygon([[-222,12],[-152,-7],[-219,-31]],'#C56A46');
        block(218,-118,10,129,'#433D43'); polygon([[223,12],[284,-7],[226,-31]],'#C56A46');
        const hero = new UnitActor(shelter, previewUnit(chapterProtagonist(p.heroLevel, this.store.protagonistSpot)), -117, -139, -117, -139, 1.28);
        hero.hp.node.active = false;
        hero.hpText.node.active = false;
        hero.node.getChildByName('Name')!.active = false;
        text(shelter, 'CampWelcome', '扎营整备 · 再上战图', 111, -143, 24, '#FFF0C9', 280);
        button(body, 'OpenCampaignChart', '出营 · 章节战图', -155, -12, 294, 74, '#6F583B', () => this.showPage('chart'));
        button(body, 'OpenSoloDungeons', DUNGEON_HALL, 155, -12, 294, 74, '#594868', () => this.showPage('dungeons'));
        button(body, 'OpenChapterRoster', '主角与阵容', -155, -107, 294, 65, '#465F53', () => this.openRoster());
        button(body, 'ChapterGear', '行装 · 整装', 155, -107, 294, 65, '#405D73', () => { this.node.destroy(); this.options.gear(); });
        button(body, 'OpenCompanionCatalog', '随将图鉴', -155, -191, 294, 65, '#405D73', () => { this.node.destroy(); this.options.heroes(); });
        const ready = this.store.chapterOffline?.ready || 0;
        button(body, 'ChapterOffline', ready ? `挂机可领 ${ready} 场` : '离线挂机', 155, -191, 294, 65, '#4C6458', () => this.openOffline());
        text(body, 'CampResources', `主公 Lv.${p.heroLevel} · 脑铢 ${formatAmount(p.coins)} · 脑力 ${formatAmount(p.souls)}`, 0, -282, 24, '#E8D4A6', 632);
        text(body, 'CampMaterials', [...WORKSHOPS.map((work, i) => `${work.material} ${p.chapter.materials[i]}`), `${DELVE_TICKET} ${p.chapter.delveTickets}`].join('    '), 0, -329, 20, '#C3D5CF', 632);
        if (this.store.experienceMultiplier > 1) text(body, 'CampExperienceBoost',
            `内测 · 经验 ×${this.store.experienceMultiplier}`, -133, -513, 21, '#E9CB8B', 320);
        button(body, 'OpenPlayGuide', '出征手册 ›', 211, -513, 181, 47, '#344C66', () => {
            showPlayGuide(this.node, this.store.experienceMultiplier, () => {});
        });
        const supply = this.store.campaignSupply;
        text(body, 'CampStamina', `体力 ${supply.stamina}/${DAILY_STAMINA} · 早7点恢复`, -99, -392, 21, '#D6E2C7', 365);
        button(body, 'OpenCampShop', '行军药铺', 211, -392, 181, 47, '#68523E', () => this.openCampShop());
        if (p.chapter.pending) {
            const pending = p.chapter.pending;
            button(body, 'CampPending', `继续 ${chapterName(pending)} ›`, 0, -455, 490, 55, '#625742', () => this.showPending(pending));
        } else if (p.chapter.reserve) {
            button(body, 'CampReserve', '领取寄存装备 ›', 0, -455, 490, 55, '#625742', () => {
                this.showPage('chart', false);
                this.selectMap(chapterMaps(this.chapterIndex)[0]);
            });
        }
    }

    private openCampShop(message = ''): void {
        const previous = this.node.getChildByName('CampShop');
        previous?.removeFromParent();
        previous?.destroy();
        const overlay = panel(this.node, 'CampShop', 0, 0, 720, 1280, '#080F1CDD', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const shop = panel(overlay, 'CampShopSheet', 0, 19, 640, 781, '#182B3E', 22);
        button(shop, 'CloseCampShop', '×', 259, 328, 62, 56, '#374F65', () => { overlay.destroy(); this.render(); });
        text(shop, 'CampShopTitle', '行 军 药 铺', -27, 326, 35, '#F1D5A0', 480);
        text(shop, 'TonicStockRule', `脑铢 ${formatAmount(this.store.progress.coins)} · 每种每日限购${TONIC_LIMIT}瓶 · 早7点补货`, 0, 264, 19, '#ADBED1', 550);
        const supply = this.store.campaignSupply;
        const goods = [
            { kind: 'rage', tonic: RAGE_TONIC, key: 'Rage', note: `接下来${TONIC_RUNS}场出战聚气 +${RAGE_TONIC.bonus * 100}%`, ink: '#4E8B78' },
            { kind: 'speed', tonic: SPEED_TONIC, key: 'Speed', note: `接下来${TONIC_RUNS}场可开 ${SPEED_TONIC.speed}× · 世界首领除外`, ink: '#5684AD' },
        ] as const;
        goods.forEach(({ kind, tonic, key, note, ink }, i) => {
            const card = panel(shop, `Tonic-${kind}`, 0, 133 - i * 244, 568, 216, '#243A50', 13);
            const jar = makeNode('TonicBottle', card, -225, 37).addComponent(Graphics);
            jar.fillColor = new Color(ink); jar.strokeColor = new Color('#213041'); jar.lineWidth = 4;
            jar.roundRect(-24,-31,48,59,15); jar.fill(); jar.stroke();
            jar.fillColor = new Color('#D9A96A'); jar.roundRect(-16,19,32,14,4); jar.fill(); jar.stroke();
            text(card, `TonicName-${key}`, tonic.name, 25, 73, 26, '#E8CD92', 397);
            text(card, `TonicEffect-${key}`, note, 25, 39, 18, '#BFD3D8', 398);
            const stock = supply[kind];
            text(card, `TonicInventory-${key}`, `持有 ${stock.bottles}瓶 · 药效剩余 ${stock.runs}场 · 已购 ${stock.bought}/${TONIC_LIMIT}`, 25, 6, 18, '#D5DAC0', 425);
            button(card, `Buy${key}Tonic`, `买一瓶 · ${tonic.cost}脑铢`, -132, -57, 240, 52, '#68563F',
                () => this.openCampShop(this.store.buyTonic(kind) || `已购入${tonic.name}`));
            button(card, `Use${key}Tonic`, '饮用一瓶', 132, -57, 240, 52, '#466858',
                () => this.openCampShop(this.store.useTonic(kind) || `${tonic.name}已生效 · 下一场开始计数`));
        });
        text(shop, 'TonicHint', '离线挂机按派队快照结算', 0, -253, 17, '#B4CAD1', 540);
        text(shop, 'ShopFeedback', message, 0, -310, 21, '#F1CE8C', 540);
    }

    private openChapterPicker(parent: Node, current: number, choose: (index: number) => void): void {
        const overlay = panel(parent, 'CampaignPicker', 0, 0, 720, 1280, '#0B1425EF', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const sheet = panel(overlay, 'CampaignPickerSheet', 0, 10, 636, 690, '#1B2A40', 22);
        const pageSize = 10;
        const pages = Math.ceil(CHAPTERS.length / pageSize);
        let page = Math.floor(current / pageSize);
        const render = () => {
            sheet.destroyAllChildren();
            text(sheet, 'CampaignPickerTitle', '选择章节', -24, 293, 32, '#F3D797', 420);
            button(sheet, 'CloseCampaignPicker', '×', 262, 293, 56, 53, '#34475D', () => overlay.destroy());
            CHAPTERS.slice(page * pageSize, (page + 1) * pageSize).forEach((chapter, i) => {
                const index = chapter.index;
                const cell = button(sheet, `PickCampaign-${index}`, `第${index + 1}章 · ${chapter.name}`,
                    (i % 2 ? 1 : -1) * 147, 207 - Math.floor(i / 2) * 90, 278, 75,
                    index === current ? '#76593D' : '#31475F', () => { overlay.destroy(); choose(index); });
                cell.label.fontSize = 20;
                cell.label.node.setPosition(0, 9);
                text(cell.label.node.parent!, 'CampaignLevel', `Lv.${CHAPTER_MIN_LEVELS[index]}`, 0, -19, 17, '#BFCFD9', 240);
            });
            const turn = (delta: number) => { page = (page + pages + delta) % pages; render(); };
            button(sheet, 'PreviousCampaignPage', '‹', -200, -265, 74, 49, '#34475D', () => turn(-1));
            text(sheet, 'CampaignPickerPage', `第 ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, CHAPTERS.length)} 章`, 0, -265, 21, '#BFCFD9', 250);
            button(sheet, 'NextCampaignPage', '›', 200, -265, 74, 49, '#34475D', () => turn(1));
        };
        render();
    }

    private mapEntries(): MapEntry[] {
        if (this.page === 'chart') return chapterMaps(this.chapterIndex);
        const workshop = WORKSHOPS[this.store.currentWorkshop.index];
        const boss = this.store.currentBoss.boss;
        return [
            chapterRift(this.riftChapterIndex),
            { id: 'workshop', name: '军器换班', boss: workshop.name, scene: 501, visualId: 'mob-axe', ink: '#AD8054' },
            { id: 'duel', name: SIDE_DUNGEONS.duel.name, boss: boss.name, scene: 901, visualId: `world-${boss.id}`, ink: boss.color },
            { id: 'assault', name: SIDE_DUNGEONS.assault.name, boss: '本地守军', scene: 101, visualId: 'mob-shield', ink: '#A56550' },
        ];
    }

    private render(): void {
        const previous = this.node.getChildByName('ChapterContent');
        previous?.removeFromParent();
        previous?.destroy();
        const screen = makeNode('ChapterContent', this.node);
        screen.setSiblingIndex(0);
        const room = this.page === 'camp' ? 0 : Math.max(0, Math.min(54,
            (view.getVisibleSize().height / Math.max(.1, Math.abs(this.node.worldScale.y)) - 1280) / 3));
        const headingY = 541 + room;
        this.node.getChildByName('CloseChapters')?.setPosition(302, headingY);
        const heading = this.page === 'camp' ? '主 公 营 地' : this.page === 'chart' ? '出 征 战 图' : DUNGEON_HALL;
        text(screen, 'ChapterHeading', heading, 0, headingY, 42, '#F3D297', 450);
        if (this.page === 'camp') button(screen, 'ChapterSound', '声音', -296, 541, 92, 51, '#364D63', () => { this.node.destroy(); this.options.sound(); });
        else button(screen, 'BackToCamp', '‹ 营地', -296, headingY, 103, 51, '#364D63', () => this.showPage('camp'));
        if (this.page === 'camp') {
            this.renderCamp(panel(screen, 'ChapterBody', 0, -45, 682, 1008, '#152438', 20));
            return;
        }
        const progress = this.store.progress;
        const chapter = progress.chapter;
        const chart = this.page === 'chart';
        const body = makeNode('ChapterBody', screen, 0, -14);
        const band = panel(body, 'SelectionHeader', 0, 431 + room * .86, 644, 104, '#233148', 14);
        const chooseChapter = (index: number) => {
            this.chapterIndex = index;
            this.map = chapterMaps(this.chapterIndex)[0].id;
            this.difficulty = 0;
            this.render();
            this.promptCampaignStory();
        };
        if (chart) {
            button(band, 'PreviousCampaign', '‹', -267, 2, 57, 60, '#354A60', () => chooseChapter((this.chapterIndex + CHAPTERS.length - 1) % CHAPTERS.length));
            text(band, 'CampaignSelection', `第${this.chapterIndex + 1}/${CHAPTERS.length}章 · ${CHAPTERS[this.chapterIndex].name} ›`, 0, 20, 29, '#F1D3A0', 426).node.on(Node.EventType.TOUCH_END, () => this.openChapterPicker(screen, this.chapterIndex, chooseChapter));
            button(band, 'NextCampaign', '›', 267, 2, 57, 60, '#354A60', () => chooseChapter((this.chapterIndex + 1) % CHAPTERS.length));
            text(band, 'ChartInstruction', `主公 Lv.${CHAPTER_MIN_LEVELS[this.chapterIndex]} 起 · 体力 ${this.store.campaignSupply.stamina}/${DAILY_STAMINA}`, 0, -24, 19, '#C8D8E4', 450);
        } else {
            text(band, 'DungeonSelection', '四处战场 · 挑选本次挑战', 0, 20, 28, '#F1D3A0', 565);
            text(band, 'ChartInstruction', `挑战免体力 · ${DELVE_TICKET} ${chapter.delveTickets}（今日已得 ${progress.daily.delveEarned}/${delveTicketCap(progress.heroLevel)}）`, 0, -24, 19, '#C8D8E4', 580);
        }
        const entries = this.mapEntries();
        const dungeonCards = [
            { color: '#392D4D', accent: '#D8ADEB', loot: '将帖 · 专武 · 遗珍', type: '配阵与后期装备' },
            { color: '#3E352E', accent: '#E8BE7D', loot: WORKSHOPS[this.store.currentWorkshop.index].material, type: '整装材料' },
            { color: '#442C3B', accent: '#F1A4AD', loot: '专属军符 · 整装材料', type: '伤害档位奖励' },
            { color: '#273E4C', accent: '#A9D6EA', loot: '赤门令 · 续火券', type: '刷宝与强化转移' },
        ];
        entries.forEach((entry, index) => {
            const difficulty = chart && this.map === entry.id ? this.difficulty : isChapterRift(entry.id) ? 2 : 0;
            const locked = this.store.chapterEntryLock(entry.id, difficulty);
            const palette = DIFFICULTY_PALETTES[difficulty];
            const dungeon = dungeonCards[index];
            const accent = chart ? palette.border : dungeon.accent;
            const height = chart ? 150 + room * .28 : 239 + room * .48;
            const y = (chart ? 294 : 249) + room * .74 - Math.floor(index / 2) * (height + (chart ? 18 : 20));
            const card = panel(body, `ChapterMap-${entry.id}`, (index % 2 ? 1 : -1) * 166, y, 312, height,
                chart ? palette.card : dungeon.color, 15);
            const art = makeNode('MapLandscape', card).addComponent(Graphics);
            const theme = mainlineTheme(entry.scene);
            art.fillColor = new Color(theme.far + '65');
            art.moveTo(29, -25); art.lineTo(67, 25); art.lineTo(96, 9); art.lineTo(128, 37); art.lineTo(150, 15);
            art.lineTo(150, -48); art.lineTo(29, -48); art.close(); art.fill();
            art.strokeColor = new Color(this.map === entry.id ? accent : accent + '75');
            art.lineWidth = this.map === entry.id ? 3 : 2;
            art.roundRect(-154, -height / 2 + 2, 308, height - 4, 13); art.stroke();
            const head = comicHead(card, entry.visualId, entry.ink, 3, false, true);
            const size = chart ? .69 : .96;
            head.setPosition(100, chart ? 6 : 16); head.setScale(size, size, 1);
            text(card, 'MapName', entry.name, -46, chart ? 28 : 69, chart ? 23 : 26, '#FFF0C8', 201);
            text(card, 'MapBoss', entry.boss, -46, chart ? -7 : 30, 18, '#E0E6E9', 198);
            const footer = panel(card, 'CardFooter', 0, -height / 2 + (chart ? 24 : 42), 292, chart ? 33 : 66, '#152338', 8);
            const label = chart ? (locked ? '查看解锁条件 ›' : '备战 ›') : dungeon.loot + ' ›';
            text(footer, 'MapState', label, 0, chart ? 0 : 12, 18, locked && chart ? '#FFD0A0' : accent, 268);
            if (!chart) text(footer, 'DungeonPurpose', dungeon.type, 0, -15, 16, '#BDC9D7', 268);
            card.on(Node.EventType.TOUCH_END, () => this.selectMap(entry));
        });
        if (chart) {
            const index = this.chapterIndex;
            const finale = chapterMaps(index)[7].id;
            const canReplayOutro = !!((chapter.clears[finale] || 0) & 1) && this.store.pendingChapterEnding !== index;
            if (this.store.hasChapterIntro(index)) {
                button(body, 'ReplayChapterIntro', '回看开篇', canReplayOutro ? -126 : 0, -327 - room * .28, 226, 47, '#314359',
                    () => showChapterStory(this.node, index, 'intro', { action: '返回战图', finish: () => {} }));
            }
            if (canReplayOutro) button(body, 'ReplayChapterOutro', '回看收尾', 126, -327 - room * .28, 226, 47, '#59483F',
                () => showChapterStory(this.node, index, 'outro', { action: '返回战图', finish: () => {} }));
        } else {
            const guide = panel(body, 'DungeonGuide', 0, -245, 644, 140, '#233148', 14);
            text(guide, 'DungeonGuideTitle', '想补哪一项？', 0, 36, 25, '#F1D3A0', 595);
            text(guide, 'DungeonGuideGear', '缺赤门令就攻城，强化行装去换班。', 0, -1, 21, '#D3DFE7', 605);
            text(guide, 'DungeonGuideTeam', '想换阵容刷赤门，想检验输出打魔王。', 0, -34, 21, '#D3DFE7', 605);
        }
        if (chapter.pending) {
            const pending = chapter.pending;
            button(body, 'OpenPending', `继续 ${chapterName(pending)} ›`, 0, chart ? -407 - room * .28 : -373, 550, 61, '#625742', () => this.showPending(pending));
        } else if (chapter.reserve) {
            button(body, 'OpenReserve', '领取寄存装备', 0, chart ? -407 - room * .28 : -373, 550, 61, '#625742', () => this.selectMap(entries[0]));
        } else if (chart) text(body, 'MapGridHint', '点关卡切换难度、查看首领与掉落', 0, -402 - room * .28, 19, '#A8B9CC', 610);
        else {
            const today = panel(body, 'DungeonToday', 0, -397, 644, 114, '#1C2B40', 14);
            text(today, 'DungeonTodayTitle', '今日挑战余额', 0, 25, 21, '#D7C4A3', 600);
            text(today, 'DungeonTodayCounts', `换班 ${this.store.challengeAttemptsLeft('workshop')}/${DAILY_CHALLENGE_LIMIT} · 攻城 ${this.store.challengeAttemptsLeft('assault')}/${DAILY_CHALLENGE_LIMIT} · 魔王基础奖励 ${this.store.challengeAttemptsLeft('duel')}/${DAILY_CHALLENGE_LIMIT}`, 0, -20, 18, '#B6C9D9', 590);
        }
    }

    private showPending(run: ChapterRun): void {
        const side = isChapterRift(run.map) || run.map === 'workshop' || isSideDungeon(run.map);
        const index = chapterIndex(run.map);
        if (isChapterRift(run.map)) this.riftChapterIndex = index;
        else if (index >= 0) this.chapterIndex = index;
        this.showPage(side ? 'dungeons' : 'chart', false);
        this.map = run.map;
        this.difficulty = run.difficulty;
        const entry = this.mapEntries().find(item => item.id === run.map);
        if (entry) this.openMapDialog(entry);
    }

    private selectMap(entry: MapEntry): void {
        if (isChapterRift(entry.id)) this.difficulty = 2;
        else if (this.map !== entry.id || entry.id === 'workshop' || isSideDungeon(entry.id)) this.difficulty = 0;
        this.map = entry.id;
        this.openMapDialog(entry);
    }

    private closeMapDialog(): void {
        this.mapDialog?.removeFromParent();
        this.mapDialog?.destroy();
        this.mapDialog = null;
    }

    private openMapDialog(entry: MapEntry, repeat = false, message = '', fivefold = false): void {
        this.closeMapDialog();
        this.render();
        const overlay = this.mapDialog = panel(this.node, 'MapDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const sheet = panel(overlay, 'MapSheet', 0, 16, 630, 706, '#1B2A40', 24);
        text(sheet, 'MapDialogTitle', entry.name, -29, 292, 36, '#F7DBA3', 476);
        button(sheet, 'CloseMapDialog', '×', 256, 292, 61, 57, '#32475D', () => this.closeMapDialog());

        const delve = isChapterRift(entry.id);
        const campaign = chapterIndex(entry.id) >= 0 && !delve;
        const palette = DIFFICULTY_PALETTES[this.difficulty];
        const p = this.store.progress;
        const pending = p.chapter.pending;
        const resume = pending?.map === entry.id && pending.difficulty === this.difficulty;
        const level = resume ? pending.level : p.heroLevel;
        const updated = !resume || pending.lootVersion === 2;
        const ticketReward = (source: 'campaign' | 'assault') => delveTicketsForWin(source, p.daily.delveEarned, p.daily.assaultDelveEarned, updated ? level : 1);
        const lock = resume ? null : this.store.chapterEntryLock(entry.id, this.difficulty);
        const rotation = this.store.currentWorkshop;
        const boss = resume && pending.bossId ? worldBoss(pending.bossId) : this.store.currentBoss.boss;
        const workshop = WORKSHOPS[resume && pending.window !== undefined ? workshopIndex(pending.window) : rotation.index];
        const banner = panel(sheet, 'MapDialogBanner', 0, 122, 554, 127, palette.card, 15);
        const head = comicHead(banner, entry.id === 'duel' ? `world-${boss.id}` : entry.visualId, entry.id === 'duel' ? boss.color : entry.ink, 3, false, true);
        head.setPosition(181, -8);
        head.setScale(1.03, 1.03, 1);
        const opponent = entry.id === 'duel' ? boss.name : entry.id === 'workshop' ? workshop.name : entry.boss;
        text(banner, 'MapDialogBoss', opponent, -45, 17, 27, '#FFF0CD', 330);
        text(banner, 'MapBannerHint', lock ? '查看解锁条件' : '出战预览', -45, -24, 18, '#D4DDE0', 330);
        const groups: DropGroup[] = [];
        let hint: string;
        let entryNote = '';
        if (delve) {
            const chooseRift = (index: number) => {
                this.riftChapterIndex = index;
                this.selectMap(chapterRift(this.riftChapterIndex));
            };
            button(sheet, 'PreviousRiftChapter', '‹', -230, 221, 63, 52, '#374F65', () => chooseRift((this.riftChapterIndex + CHAPTERS.length - 1) % CHAPTERS.length));
            text(sheet, 'RiftChapter', `第${this.riftChapterIndex + 1}/${CHAPTERS.length}章 · ${CHAPTERS[this.riftChapterIndex].name} ›`, 0, 221, 24, '#F1D3A0', 394).node.on(Node.EventType.TOUCH_END, () => this.openChapterPicker(sheet.parent!, this.riftChapterIndex, chooseRift));
            button(sheet, 'NextRiftChapter', '›', 230, 221, 63, 52, '#374F65', () => chooseRift((this.riftChapterIndex + 1) % CHAPTERS.length));
            const seed = p.chapter.pending?.map === entry.id ? p.chapter.pending.seed : chapterSeed(p.runSerial + 1);
            const trait = chapterRiftTrait(seed);
            hint = `外廊 → 石阶 → 偏殿 → 赤门击坛 · ${trait.name}`;
            entryNote = '赤门令 ×1';
            const oldRun = resume && !updated ? pending : undefined;
            const rule = oldRun ? '此场沿用入场时的掉落规则。' : '每胜抽一次本章掉落池，下列为单件掉率。';
            const officers: DropGroup = { title: '将帖', notes: [rule, '首次入队可换阵容，重复将帖转 20 枚碎片用于升星。'], rewards: [] };
            const signatures: DropGroup = { title: '专武', notes: [rule, '专武强化本人技能，影响主力输出、治疗或护盾。'], rewards: [] };
            const gear: DropGroup = { title: '装备与遗珍', notes: [rule, '高阶粉装、橙装和专武为赤门专属。'], rewards: [] };
            for (const drop of chapterDelvePool(entry.id, 'preview-delve', oldRun)) {
                const chance = dropChance(drop.rate);
                if (drop.kind === 'officer') officers.rewards.push({ detail: { hero: drop.hero }, chance });
                else if (drop.kind === 'signature') signatures.rewards.push({ detail: { item: drop.item }, chance });
                else gear.rewards.push({ detail: { item: drop.item }, chance, use: drop.kind === 'relic'
                    ? slotOf(drop.item) === 'armor' ? '遗珍战甲，显著提升前排防御和生命。' : '遗珍兵符，同时增加攻防和生命。'
                    : drop.item.rarity >= 4 ? equipmentFitLabel(drop.item) : '章末翻天同款，可换装或分解。' });
            }
            groups.push(...[officers, signatures, gear].filter(group => group.rewards.length));
        } else if (entry.id === 'workshop') {
            const next = new Date(rotation.switchAt + 8 * 3600000);
            text(sheet, 'MapCurrentChoice', resume ? '沿用入场班次' : `${next.getUTCMonth() + 1}月${next.getUTCDate()}日 00:00 换班`, 0, 221, 23, palette.border, 550);
            hint = workshop.hint;
            entryNote = `今日剩 ${this.store.challengeAttemptsLeft('workshop')}/${DAILY_CHALLENGE_LIMIT} 次`;
            groups.push({ title: '整装材料', notes: [`${workshop.material} · 换班首胜 ${workshopMaterialReward(level, true)} 份，其后 ${workshopMaterialReward(level, false)} 份。`, `随等级变强。另有 ${dropChance(workshopBonusRate(level) * 100)} 机会多掉 ${workshopBonusMaterial(level)} 份。`],
                rewards: WORKSHOPS.map((work, index) => ({ name: `${work.material} · ${work.action}`, chance: work === workshop ? '本轮产出' : '轮换产出', use: WORKSHOP_USES[index] })) });
        } else if (entry.id === 'duel') {
            text(sheet, 'MapCurrentChoice', `个人最高 ${formatAmount(p.chapter.duelBest[boss.id] || 0)}`, 0, 221, 24, palette.border, 550);
            hint = `30秒计分 · 弱点 ${boss.weakness}`;
            const coins = chapterCoinReward({ map: entry.id, difficulty: this.difficulty, level, lootVersion: updated ? 2 : undefined });
            const experience = chapterBattleExperience({ map: entry.id, difficulty: this.difficulty }, true, 0) * this.store.experienceMultiplier;
            const attempts = this.store.challengeAttemptsLeft('duel');
            const practice = resume ? !!pending.duelPractice : attempts === 0;
            entryNote = practice ? '本场计个人纪录和伤害档奖励' : `今日基础奖励剩 ${attempts}/${DAILY_CHALLENGE_LIMIT} 场`;
            const claimed = updated ? p.chapter.duelGradesClaimed[boss.id] || 0 : p.chapter.duelRewardTier[boss.id] || 0;
            const rewards = updated ? duelGrades(boss.id, level).map((tier, index): MapReward => {
                const chance = `${formatAmount(tier.damage)}伤害${index < claimed ? ' · 已领' : ''}`;
                const use = `脑铢 +${formatAmount(tier.coins)} · ${WORKSHOPS[tier.material].material} +${tier.quantity}${tier.brain ? ` · 脑力 +${tier.brain}` : ''}`;
                return tier.item ? { detail: { item: tier.item }, chance, use } : { name: tier.name, chance, use };
            }) : DUEL_MILESTONES.map((tier, index): MapReward => {
                const chance = `${formatAmount(tier.damage)}伤害${index < claimed ? ' · 已领' : ''}`;
                return tier.coins ? { name: `${tier.name} · 脑铢 +${tier.coins}`, chance }
                    : { detail: { item: { id: 'preview-duel', ...DUEL_CHARM } }, chance };
            });
            groups.push({ title: '伤害档位', notes: [`每日前 3 场各得 ${coins} 脑铢、${experience} 经验和基础脑力。`,
                `基础脑力每日最多 ${DAILY_SOUL_CAP} 点。每位魔王各档领一次。`], rewards });
        } else if (entry.id === 'assault') {
            text(sheet, 'MapCurrentChoice', '先破城门，再清守军', 0, 221, 24, palette.border, 550);
            entryNote = `今日剩 ${this.store.challengeAttemptsLeft('assault')}/${DAILY_CHALLENGE_LIMIT} 次`;
            hint = '破城后城上守军失去减伤保护';
            if (resume && !pending.assaultTickets) {
                groups.push({ title: '旧场次奖励', notes: ['这一场沿用入场时的掉落规则。'], rewards: [
                    { detail: { item: { id: 'preview-assault', ...ASSAULT_ARMOR_DROP.item } }, chance: dropChance(ASSAULT_ARMOR_DROP.rate * 100) },
                ] });
            } else {
                const tickets = ticketReward('assault');
                groups.push({ title: '攻城战利品', notes: [`Lv.${level} · 每胜 ${assaultTicketReward(updated ? level : 1)} 枚赤门令 · ${chapterCoinReward({ map: entry.id, difficulty: 0, level, lootVersion: updated ? 2 : undefined })} 脑铢。`,
                    `攻城今日已得 ${p.daily.assaultDelveEarned}/${assaultTicketCap(p.heroLevel)} 枚，门票额度零点刷新。`], rewards: [
                    { name: DELVE_TICKET, chance: tickets ? `本场胜利 +${tickets} 枚` : '今日额度已满', use: '每枚可进入一次赤门惊坛，未用门票可以留到次日。' },
                    ...(updated ? [{ name: TRANSFER_SEAL, chance: dropChance(TRANSFER_SEAL_RATE * 100), use: '跨品级转移同部位装备的打磨能量。' }] : []),
                ] });
            }
        } else {
            const map = CHAPTER_MAPS.find(item => item.id === entry.id)!;
            const story = chapterStoryHero(map.id);
            const officer = chapterMapOfficer(map.id);
            const cleared = !!((p.chapter.clears[entry.id] || 0) & (1 << this.difficulty));
            const changeDifficulty = (delta: number) => {
                this.difficulty = ((this.difficulty + delta + DIFFICULTIES.length) % DIFFICULTIES.length) as Difficulty;
                this.openMapDialog(entry, repeat, '', fivefold);
            };
            button(sheet, 'MapPrevious', '‹', -230, 221, 63, 52, '#374F65', () => changeDifficulty(-1));
            text(sheet, 'MapCurrentChoice', `${DIFFICULTIES[this.difficulty]}${cleared ? ' · 已通过' : ''}`, 0, 221, 25, palette.border, 390);
            button(sheet, 'MapNext', '›', 230, 221, 63, 52, '#374F65', () => changeDifficulty(1));
            const first = this.difficulty === 0 && !cleared;
            const firstItem = chapterFirstEquipment(map.id, 'preview-first');
            const rewards: MapReward[] = [];
            if (first && story) rewards.push({ detail: { hero: story }, chance: '首通必得' });
            if (first && firstItem) rewards.push({ detail: { item: firstItem }, chance: '首通必得' });
            if (officer) rewards.push({ detail: { hero: officer }, chance: `${Math.round(MAP_DROP_RATES.officer[this.difficulty] * 100)}%` });
            for (const drop of chapterGearPool(map.id, this.difficulty, updated)) {
                const item = chapterDropEquipment(map.id, this.difficulty, `preview-${drop.slot}`, drop);
                if (item) rewards.push({ detail: { item }, chance: `${first && firstItem ? '首通后 ' : ''}${drop.rate}%` });
            }
            hint = chapterMapHint(map.id) + (this.difficulty === 2 ? ' · 破卫后增伤' : '');
            const notes = [`战图每胜可得 1 枚赤门令，每日最多 ${CAMPAIGN_TICKET_CAP} 枚。`];
            const material = campaignMaterialReward(map.id, this.difficulty);
            if (material) notes.push(`获胜另得 ${material} 份整装材料，随章节和难度提高。`);
            groups.push({ title: '战图掉落', notes, rewards });
        }
        const supply = this.store.campaignSupply;
        const costLabel = campaign ? `剩余体力 ${supply.stamina}/${DAILY_STAMINA}` : '免体力';
        text(sheet, 'BattleHint', lock || hint, 0, 31, 19, lock ? '#FFC08E' : '#B4CED4', 554);
        text(sheet, 'MapPrize', entryNote ? `${costLabel} · ${entryNote}` : costLabel, 0, -8, 20, '#DFD0AA', 554);
        button(sheet, 'OpenMapDrops', '掉落详情 ›', 0, -70, 494, 54, '#3B516B', () =>
            showMapDrops(overlay, this.store, campaign ? `${entry.name} · ${DIFFICULTIES[this.difficulty]}` : entry.name, groups));

        if (pending) {
            text(sheet, 'PendingChapter', `还有未完挑战 · ${chapterName(pending)}`, 0, -139, 23, '#F1CD90', 550);
            button(sheet, 'ResumeChapter', '继续未完挑战', 0, -215, 494, 65, '#456D55', () => this.launch(pending, 1));
            button(sheet, 'AbandonChapter', '放弃未完挑战', 0, -284, 256, 48, '#564451', () => {
                const abandoned = this.store.abandonChapter();
                this.openMapDialog(entry, repeat, abandoned ? '已放弃，可进入新关卡' : '存档失败，请重试');
            });
        } else if (p.chapter.reserve) {
            const item = p.chapter.reserve;
            chapterRewardLink(sheet, 'Reserve', { item }, 0, -139, 23, () =>
                showChapterReward(overlay, this.store, { item }, '已寄存 · 背包有空位时可领回'), `${item.name} · 已寄存`);
            button(sheet, 'ClaimReserve', '领回装备', 0, -215, 494, 65, '#6B5B3F', () => {
                this.openMapDialog(entry, repeat, this.store.claimChapterReserve() || '已领回装备');
            });
            button(sheet, 'ReserveGear', '去行装腾空间', 0, -284, 256, 48, '#40586B', () => { this.node.destroy(); this.options.gear(); });
        } else if (lock) {
            const disabled = panel(sheet, 'MapEntryLocked', 0, -215, 494, 65, '#344354', 15);
            text(disabled, 'MapEntryLockedLabel', '未解锁', 0, 0, 24, '#AAB9C4', 472);
        } else if (delve && !p.chapter.delveTickets) {
            const canAssault = ticketReward('assault') > 0 && this.store.challengeAttemptsLeft('assault') > 0;
            const canCampaign = ticketReward('campaign') > 0;
            const source = canAssault ? '攻城胜利可获得赤门令' : canCampaign ? '战图胜利可获得赤门令' : '今日可刷门票已用完';
            text(sheet, 'NoDelveTickets', source, 0, -139, 20, '#E7CB99', 525);
            if (canAssault || canCampaign) button(sheet, 'FarmDelveTickets', canAssault ? '去攻城刷赤门令' : '去战图刷赤门令', 0, -215, 494, 65, '#4B625A', () => {
                this.closeMapDialog();
                if (canAssault) this.selectMap(this.mapEntries().find(item => item.id === 'assault')!);
                else this.showPage('chart');
            });
        } else {
            const maximum = entry.id === 'workshop' || entry.id === 'assault' ? this.store.challengeAttemptsLeft(entry.id) : delve ? Math.min(5, p.chapter.delveTickets) : 5;
            const runCount = repeat ? Math.max(1, maximum) : 1;
            if (maximum > 1) button(sheet, 'ToggleMapRepeat', `连刷${maximum}场 · ${repeat ? '开' : '关'}`, campaign ? -130 : 0, -139, 242, 50, repeat ? '#67563C' : '#32475A', () => {
                this.openMapDialog(entry, !repeat);
            });
            if (campaign) button(sheet, 'ToggleFivefold', `${fivefold ? '☑' : '☐'} 五倍结算`, 130, -139, 242, 50, fivefold ? '#67563C' : '#32475A', () => {
                this.openMapDialog(entry, false, '', !fivefold);
            });
            if (fivefold) text(sheet, 'FivefoldRisk', '只打一场 · 败退照扣五倍体力', 0, -179, 17, '#E7CB99', 540);
            const startLabel = fivefold ? '进入 · 五倍结算' : runCount > 1 ? `进入 · 连刷${runCount}场` : '进入关卡';
            button(sheet, 'StartChapter', startLabel, 0, -229, 494, 65, '#4D765B', () => {
                if (entry.id === 'workshop' && this.store.currentWorkshop.window !== rotation.window) {
                    const fresh = this.mapEntries().find(item => item.id === 'workshop')!;
                    this.openMapDialog(fresh, repeat, '已换班，请确认新产物');
                    return;
                }
                try { this.launch(this.store.startChapter(entry.id, this.difficulty, fivefold), runCount); }
                catch (error) { this.openMapDialog(entry, repeat, error instanceof Error ? error.message : '无法开战', fivefold); }
            });
        }
        if (message) text(sheet, 'ChapterNote', message, 0, -330, 19, '#F2CB98', 565);
    }

    private openRoster(note = ''): void {
        this.node.getChildByName('ChapterRoster')?.destroy();
        const view = panel(this.node, 'ChapterRoster', 0, 0, 720, 1280, '#121E32', 0);
        view.on(Node.EventType.TOUCH_END, () => {});
        const progress = this.store.progress;
        const layout = this.store.chapterFormation.companions;
        const lead = chapterProtagonist(progress.heroLevel, this.store.protagonistSpot, this.store.getEquipmentBonuses(true)[CHAPTER_PROTAGONIST_ID]);
        const displayName = (entry: typeof layout[number]) => entry.hero ? getHero(entry.hero)!.name
            : entry.troop === 'spear' ? '长枪兵' : entry.troop === 'bow' ? '弓箭兵' : '刀盾兵';

        text(view, 'RosterTitle', '主 角 与 随 将', 0, 533, 38, '#F2D294', 650);
        portrait(view, { protagonist: true }, 94).setPosition(-209, 421);
        text(view, 'LeadName', `${lead.name} Lv.${progress.heroLevel} · 固定出战`, 59, 451, 28, '#F3D690', 480);
        text(view, 'LeadSkill', `${lead.skillName} · 单体攻击 · 铁甲先锋`, 59, 411, 21, '#C1D7E0', 480);
        text(view, 'LeadStats', `生命 ${formatAmount(lead.maxHp)}   攻击 ${formatAmount(lead.attack)}   防御 ${formatAmount(lead.defense)}`, 59, 374, 21, '#ACCBDA', 480);
        text(view, 'CompanionRule', `已上阵随从 ${layout.length}/4 · 随主公升级 · 可留空`, 0, 309, 22, '#BFD5DA', 650);
        for (let i = 0; i < 4; i++) {
            const entry = layout[i];
            const cell = panel(view, `ChapterCompanion-${i}`, (i - 1.5) * 145, 185, 128, 130, '#263D50', 13);
            if (entry) portrait(cell, entry, 76).setPosition(0, 13);
            else text(cell, 'EmptyCompanion', '+', 0, 12, 35, '#91ACB9', 115);
            text(cell, 'SeatName', entry ? displayName(entry) : '空位', 0, -40, 20, '#C7D8DF', 118);
            cell.on(Node.EventType.TOUCH_END, () => openFormation());
        }
        const openFormation = () => {
            view.destroy();
            new FormationPanel(this.node, this.store, () => this.openRoster());
        };
        button(view, 'ChooseCompanions', '拖拽布阵 · 调整主公与随从', 0, 52, 588, 66, '#405D73', openFormation);
        text(view, 'RosterExperience', `主角经验${this.store.experienceMultiplier > 1 ? `（×${this.store.experienceMultiplier}）` : ''} ${formatAmount(progress.experience)} / ${formatAmount(this.store.experienceCost)} · 随将 Lv.${progress.heroLevel}`, 0, -149, 23, '#E3CD9E', 650);
        text(view, 'LeadLevelRule', progress.heroLevel >= MAX_LEVEL ? '主公已达满级' : '经验满后自动升级 · 随将同步', 0, -202, 23, '#C9DEC3', 600);
        button(view, 'RosterOffline', '派队离线挂机', 0, -273, 320, 58, '#43665B', () => { view.destroy(); this.openOffline(); });
        button(view, 'RosterGear', '主公行装 ›', 0, -349, 320, 58, '#405D73', () => { this.node.destroy(); this.options.gear(); });
        text(view, 'RosterNote', note, 0, -401, 20, '#F4D199', 650);
        button(view, 'CloseRoster', '返回', 0, -524, 588, 64, '#39546A', () => view.destroy());
    }

    private openOffline(lines: string[] = [], index?: number, previews: ChapterRewardPreview[] = []): void {
        const previous = this.node.getChildByName('ChapterOfflineOverlay');
        previous?.removeFromParent();
        previous?.destroy();
        const overlay = panel(this.node, 'ChapterOfflineOverlay', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const sheet = panel(overlay, 'ChapterOfflineSheet', 0, 20, 632, 808, '#16263A', 22);
        const job = this.store.chapterOffline;
        const clears = this.store.progress.chapter.clears;
        const choices: { map: typeof CHAPTER_MAPS[number]; difficulty: Difficulty }[] = [];
        for (const map of CHAPTER_MAPS.filter(entry => !isChapterRift(entry.id))) {
            for (const difficulty of [0, 1, 2] as const) {
                if ((clears[map.id] || 0) & (1 << difficulty)) choices.push({ map, difficulty });
            }
        }
        const current = choices.findIndex(entry => entry.map.id === job?.run.map && entry.difficulty === job.run.difficulty);
        const selected = index ?? Math.max(0, current);
        const destination = choices[selected];
        const attempt = (action: () => string[]) => {
            try { this.openOffline(action(), selected); }
            catch (error) { this.openOffline([error instanceof Error ? error.message : '挂机操作未完成'], selected); }
        };
        text(sheet, 'OfflineTitle', '离线挂机', -26, 346, 35, '#F0D29D', 488);
        button(sheet, 'CloseChapterOffline', '×', 258, 346, 63, 59, '#344B62', () => { overlay.destroy(); this.render(); });
        text(sheet, 'OfflineTiming', '派队后每20分钟一场 · 缓存4小时 · 领取按波扣体力', 0, 284, 21, '#B3CAD6', 580);
        text(sheet, 'OfflineCurrent', job ? `驻扎 ${chapterName(job.run)} · ${DIFFICULTIES[job.run.difficulty]}` : '尚未派队', 0, 235, 24, '#EDD3A5', 570);
        if (job?.ready) {
            button(sheet, 'ClaimChapterOffline', `领取 ${job.ready} 场战利品`, 0, 160, 508, 65, '#536A4C', () => {
                try {
                    const result = this.store.claimChapterOffline();
                    this.openOffline(result.lines, selected, result.previews);
                } catch (error) {
                    this.openOffline([error instanceof Error ? error.message : '挂机领取未完成'], selected);
                }
            });
        } else if (job) text(sheet, 'OfflineNoRewards', '尚未攒满一场', 0, 160, 20, '#A6B9C8', 560);
        if (job) button(sheet, 'StopChapterOffline', job.ready ? '停止挂机 · 放弃未领收益' : '停止挂机', 0, 104, 386, 43, '#53444D', () => {
            attempt(() => [this.store.stopChapterOffline() ? '已停止挂机' : '停止未保存，请重试']);
        });
        if (destination) {
            const cycle = (delta: number) => this.openOffline([], (selected + delta + choices.length) % choices.length);
            if (choices.length > 1) {
                button(sheet, 'OfflinePrevious', '‹', -214, 53, 74, 57, '#374F65', () => cycle(-1));
                button(sheet, 'OfflineNext', '›', 214, 53, 74, 57, '#374F65', () => cycle(1));
            }
            text(sheet, 'OfflineDestination', `${destination.map.name} · ${DIFFICULTIES[destination.difficulty]}`, 0, 53, 23, '#E4D2A2', 330);
            if (selected === current) text(sheet, 'OfflineAlreadyAssigned', '当前队伍驻扎于此', 0, -29, 21, '#B7C9CD', 560);
            else button(sheet, 'AssignChapterOffline', job ? '改派到此图' : '开始挂机', 0, -29, 508, 65, '#4C6C5C', () => {
                attempt(() => [this.store.assignChapterOffline(destination.map.id, destination.difficulty) || '试战通过 · 已开始挂机']);
            });
        } else {
            text(sheet, 'OfflineEligibility', '先打通任一张主线战图', 0, 53, 22, '#C2CFD6', 580);
            button(sheet, 'OfflineOpenChart', '去选图 ›', 0, -29, 508, 65, '#405F72', () => { overlay.destroy(); this.showPage('chart'); });
        }
        lines.forEach((line, i) => {
            const reward = previews.find(entry => entry.index === i);
            const y = -105 - i * 42;
            if (reward) chapterRewardLink(sheet, `OfflineSummary-${i}`, reward.detail, 0, y, 20, () =>
                showChapterReward(overlay, this.store, reward.detail, job ? chapterName(job.run) + ' · 挂机战利品' : '挂机战利品'), line);
            else text(sheet, `OfflineSummary-${i}`, line, 0, y, 20, '#DCDBB9', 574);
        });
    }

    private launch(run: ChapterRun, count: number): void {
        this.node.destroy();
        this.onStart(run, count);
    }
}
