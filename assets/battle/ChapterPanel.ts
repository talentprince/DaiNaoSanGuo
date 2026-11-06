import { Color, Graphics, Node, UITransform } from 'cc';
import { CHAPTERS, CHAPTER_MAPS, CHAPTER_MIN_LEVELS, chapterDialogue, chapterEquipment, chapterFirstEquipment, chapterIndex, chapterLoot, chapterMapHint, chapterMapOfficer, chapterMaps, chapterName, chapterProtagonist, chapterRift, chapterRiftPool, chapterRiftTrait, chapterSeed, chapterStaminaCost, chapterStoryHero, chapterTarget, DAILY_STAMINA, DELVE_TICKET, DELVE_TICKET_CAP, DIFFICULTIES, DIFFICULTY_PALETTES, DUNGEON_HALL, isChapterRift, isSideDungeon, MAP_DROP_RATES, RAGE_TONIC, SPEED_TONIC, TONIC_LIMIT, TONIC_RUNS, SIDE_DUNGEONS, WORKSHOPS } from '../data/ChapterConfig';
import type { ChapterRun, Difficulty, LootTarget, StoryPhase } from '../data/ChapterConfig';
import { formatAmount, MAX_LEVEL } from '../data/GrowthConfig';
import type { HeroId } from '../data/HeroCatalog';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import { ProgressStore } from './ProgressStore';
import type { ChapterRewardDetail, ChapterRewardPreview } from './ProgressStore';
import { equipmentStats, RARITY_COLORS, RARITY_NAMES, signatureEffect, signatureFor, SLOT_NAMES, slotOf } from '../data/EquipmentConfig';
import { equipmentIcon } from './EquipmentIcon';
import { heroArtwork, heroDetails } from './HeroCard';
import { FormationPanel } from './FormationPanel';
import { portrait } from './HeroPortrait';
import { mainlineTheme } from '../data/MainlineThemes';
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
    text(sheet, 'ChapterLootType', `${RARITY_NAMES[item.rarity - 1]} · ${SLOT_NAMES[slotOf(item)]}`, 0, 18, 21, '#BCD0D8', 530);
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
        guide: next ? `${next.name} · ${lock ?? '已开放'}` : '十章主线告捷',
        finish: () => complete(() => advance(next?.index ?? null)),
        alternate: backLabel,
        dismiss: () => complete(close),
    });
}

interface MapReward {
    detail: ChapterRewardDetail;
    chance: string;
}

export class ChapterPanel {
    readonly node: Node;
    private map: ChapterRun['map'];
    private chapterIndex: number;
    private difficulty: Difficulty = 0;
    private page: 'camp' | 'chart' | 'dungeons' = 'camp';
    private target: LootTarget = 'officer';
    private targetHero?: HeroId;
    private mapDialog: Node | null = null;

    constructor(parent: Node, private store: ProgressStore, private onStart: (run: ChapterRun, count: number) => void,
        private options: ChapterPanelOptions) {
        const current = options.chapter === undefined ? options.current : undefined;
        const clears = store.progress.chapter.clears;
        const currentIndex = current ? chapterIndex(current.map) : -1;
        this.chapterIndex = options.chapter ?? (currentIndex >= 0 ? currentIndex : this.recommendedChapter());
        const maps = chapterMaps(this.chapterIndex);
        const selected = maps.find(entry => entry.id === options.map);
        const next = maps.find(entry => !((clears[entry.id] || 0) & 1));
        this.map = selected?.id || current?.map || next?.id || maps[maps.length - 1].id;
        this.difficulty = selected ? 0 : current?.difficulty ?? (next ? 0 : (clears[maps[maps.length - 1].id] || 0) & 2 ? 2 : 1);
        this.target = current?.target || 'officer';
        this.targetHero = current?.targetHero;
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
        const clears = this.store.progress.chapter.clears;
        const latest = CHAPTERS.reduce((last, chapter) => (clears[chapter.maps[7]] || 0) & 1 ? chapter.index + 1 : last, 0);
        return Math.min(CHAPTERS.length - 1, Math.max(latest, clears.road ? 4 : 0));
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
        if (this.store.hasChapterIntro(index) || this.store.chapterEntryLock(first.id, 0)) return false;
        showChapterStory(this.node, index, 'intro', {
            action: `前往${first.name}`,
            guide: '可先查看阵容、掉落和出战体力',
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
            `内测 · 经验 ×${this.store.experienceMultiplier}`, 0, -513, 21, '#E9CB8B', 620);
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

    private mapEntries(): MapEntry[] {
        if (this.page === 'chart') return chapterMaps(this.chapterIndex);
        const workshop = WORKSHOPS[this.store.currentWorkshop.index];
        const boss = this.store.currentBoss.boss;
        return [
            chapterRift(this.chapterIndex),
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
        const heading = this.page === 'camp' ? '主 公 营 地' : this.page === 'chart' ? '出 征 战 图' : DUNGEON_HALL;
        text(screen, 'ChapterHeading', heading, 0, 541, 42, '#F3D297', 450);
        if (this.page === 'camp') button(screen, 'ChapterSound', '声音', -296, 541, 92, 51, '#364D63', () => { this.node.destroy(); this.options.sound(); });
        else button(screen, 'BackToCamp', '‹ 营地', -296, 541, 103, 51, '#364D63', () => this.showPage('camp'));
        const body = panel(screen, 'ChapterBody', 0, -45, 682, 1008, '#152438', 20);
        if (this.page === 'camp') { this.renderCamp(body); return; }
        const chapter = this.store.progress.chapter;
        const switchChapter = (delta: number) => {
            this.chapterIndex = (this.chapterIndex + delta + CHAPTERS.length) % CHAPTERS.length;
            this.map = this.page === 'chart' ? chapterMaps(this.chapterIndex)[0].id : chapterRift(this.chapterIndex).id;
            this.difficulty = this.page === 'chart' ? 0 : 2;
            this.target = 'officer';
            this.targetHero = undefined;
            this.render();
            if (this.page === 'chart') this.promptCampaignStory();
        };
        button(body, 'PreviousCampaign', '‹', -203, 437, 65, 54, '#374F65', () => switchChapter(-1));
        text(body, 'CampaignSelection', `第${this.chapterIndex + 1}/${CHAPTERS.length}章 · ${CHAPTERS[this.chapterIndex].name}`, 0, 437, 30, '#F1D3A0', 320);
        button(body, 'NextCampaign', '›', 203, 437, 65, 54, '#374F65', () => switchChapter(1));
        text(body, 'ChartInstruction', this.page === 'chart' ? `主公 Lv.${CHAPTER_MIN_LEVELS[this.chapterIndex]} 起 · 体力 ${this.store.campaignSupply.stamina}/${DAILY_STAMINA}` : `${DELVE_TICKET} ${chapter.delveTickets} · 今日已得 ${this.store.progress.daily.delveEarned}/${DELVE_TICKET_CAP}`, 0, 386, 18, '#E6D5AB', 620);
        const entries = this.mapEntries();
        const chart = this.page === 'chart';
        const backdrop = makeNode('ChapterMapBackdrop', body, 0, chart ? 87 : 192).addComponent(Graphics);
        backdrop.fillColor = new Color(this.page === 'chart' ? '#526F63' : '#544C6D');
        backdrop.roundRect(-329, chart ? -290 : -213, 658, chart ? 580 : 426, 18); backdrop.fill();
        backdrop.strokeColor = new Color('#E9C88980'); backdrop.lineWidth = 4;
        backdrop.moveTo(-322,-131); backdrop.bezierCurveTo(-171,41,-18,-148,122,37);
        backdrop.bezierCurveTo(190,123,230,0,324,145); backdrop.stroke();
        for (let i = 0; i < 5; i++) {
            backdrop.fillColor = new Color('#E8D4A580'); backdrop.circle(-295 + i * 147, Math.sin(i * 1.25) * 75, 6); backdrop.fill();
        }
        entries.forEach((entry, index) => {
            const difficulty = this.page === 'chart' && this.map === entry.id ? this.difficulty : isChapterRift(entry.id) ? 2 : 0;
            const locked = this.store.chapterEntryLock(entry.id, difficulty);
            const palette = DIFFICULTY_PALETTES[difficulty];
            const card = panel(body, `ChapterMap-${entry.id}`, (index % 2 ? 1 : -1) * 161, 291 - Math.floor(index / 2) * (chart ? 138 : 183), 306, 123,
                palette.card, 14);
            const art = makeNode('MapLandscape', card).addComponent(Graphics);
            const theme = mainlineTheme(entry.scene);
            art.fillColor = new Color(theme.far + '8F');
            art.moveTo(-145,-22); art.lineTo(-111,16); art.lineTo(-87,4); art.lineTo(-37,39); art.lineTo(25,3);
            art.lineTo(79,32); art.lineTo(143,-17); art.lineTo(143,-51); art.lineTo(-145,-51); art.close(); art.fill();
            art.fillColor = new Color(theme.road + '76');
            if (theme.feature === 'river') {
                art.moveTo(-148,-38); art.bezierCurveTo(-96,-16,-50,-56,24,-37); art.lineTo(145,-21);
                art.lineTo(145,-52); art.lineTo(-148,-52); art.close(); art.fill();
            } else if (theme.feature === 'bridges') {
                art.roundRect(-132,-34,224,10,4); art.rect(-108,-55,11,26); art.rect(56,-55,11,26); art.fill();
            } else if (theme.feature === 'forts') {
                art.rect(-130,-52,215,22);
                for(let x=-130;x<80;x+=32)art.rect(x,-33,15,10);
                art.fill();
            }
            art.strokeColor = new Color(this.map === entry.id ? palette.border : palette.border + '88');
            art.lineWidth = this.map === entry.id ? 4 : 2; art.roundRect(-149,-58,298,116,12); art.stroke();
            const head = comicHead(card, entry.visualId, entry.ink, 3, false, true);
            head.setPosition(103, -1); head.setScale(.77, .77, 1);
            text(card, 'MapName', entry.name, -42, 25, 24, '#FFF0C8', 205);
            text(card, 'MapBoss', entry.boss, -42, -8, 18, '#DDE6E6', 205);
            text(card, 'MapState', locked ? '查看条件 ›' : '查看关卡 ›', -42, -37, 17, locked ? '#FFD0A0' : palette.border, 205);
            card.on(Node.EventType.TOUCH_END, () => this.selectMap(entry));
        });
        if (chart) {
            const index = this.chapterIndex;
            const finale = chapterMaps(index)[7].id;
            const canReplayOutro = !!((chapter.clears[finale] || 0) & 1) && this.store.pendingChapterEnding !== index;
            if (this.store.hasChapterIntro(index)) {
                button(body, 'ReplayChapterIntro', '回看开篇', canReplayOutro ? -125 : 0, -247, 218, 48, '#465971',
                    () => showChapterStory(this.node, index, 'intro', { action: '返回战图', finish: () => {} }));
            }
            if (canReplayOutro) button(body, 'ReplayChapterOutro', '回看收尾', 125, -247, 218, 48, '#64543F',
                () => showChapterStory(this.node, index, 'outro', { action: '返回战图', finish: () => {} }));
        }
        if (chapter.pending) {
            const pending = chapter.pending;
            button(body, 'OpenPending', `继续 ${chapterName(pending)} ›`, 0, chart ? -334 : -115, 554, 66, '#625742', () => this.showPending(pending));
        } else if (chapter.reserve) {
            button(body, 'OpenReserve', '领取寄存装备', 0, chart ? -334 : -115, 554, 66, '#625742', () => this.selectMap(entries[0]));
        }
    }

    private showPending(run: ChapterRun): void {
        const side = isChapterRift(run.map) || run.map === 'workshop' || isSideDungeon(run.map);
        const index = chapterIndex(run.map);
        if (index >= 0) this.chapterIndex = index;
        this.showPage(side ? 'dungeons' : 'chart', false);
        this.map = run.map;
        this.difficulty = run.difficulty;
        this.target = run.target || this.target;
        this.targetHero = run.targetHero;
        const entry = this.mapEntries().find(item => item.id === run.map);
        if (entry) this.openMapDialog(entry);
    }

    private selectMap(entry: MapEntry): void {
        if (isChapterRift(entry.id)) {
            this.difficulty = 2;
            if (this.map !== entry.id) this.targetHero = undefined;
        }
        else if (this.map !== entry.id || entry.id === 'workshop' || isSideDungeon(entry.id)) this.difficulty = 0;
        this.map = entry.id;
        this.openMapDialog(entry);
    }

    private closeMapDialog(): void {
        this.mapDialog?.removeFromParent();
        this.mapDialog?.destroy();
        this.mapDialog = null;
    }

    private openMapDialog(entry: MapEntry, repeat = false, message = ''): void {
        this.closeMapDialog();
        this.render();
        const overlay = this.mapDialog = panel(this.node, 'MapDialog', 0, 0, 720, 1280, '#080F1CCC', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const sheet = panel(overlay, 'MapSheet', 0, 29, 630, 868, '#16263A', 24);
        text(sheet, 'MapDialogTitle', entry.name, -28, 369, 39, '#F7DBA3', 476);
        button(sheet, 'CloseMapDialog', '×', 256, 369, 65, 62, '#32475D', () => this.closeMapDialog());

        const palette = DIFFICULTY_PALETTES[this.difficulty];
        const banner = panel(sheet, 'MapDialogBanner', 0, 251, 554, 150, palette.card, 16);
        const head = comicHead(banner, entry.visualId, entry.ink, 3, false, true);
        head.setPosition(182, -11);
        head.setScale(1.2, 1.2, 1);
        text(banner, 'MapDialogBoss', entry.boss, -42, 18, 27, '#FFF0CD', 327);
        const p = this.store.progress;
        const lock = this.store.chapterEntryLock(entry.id, this.difficulty);
        const rotation = this.store.currentWorkshop;
        let detail = '';
        const rewards: MapReward[] = [];
        let hint: string;

        const arrows = (label: string, action: (delta: number) => void,
            reward?: { detail: ChapterRewardDetail; source: string }) => {
            button(sheet, 'MapPrevious', '‹', -204, 130, 86, 60, '#374F65', () => action(-1));
            if (reward) chapterRewardLink(sheet, 'MapCurrentChoice', reward.detail, 0, 130, 26, () =>
                showChapterReward(overlay, this.store, reward.detail, reward.source));
            else text(sheet, 'MapCurrentChoice', label, 0, 130, 27, palette.border, 290);
            button(sheet, 'MapNext', '›', 204, 130, 86, 60, '#374F65', () => action(1));
        };
        const delve = isChapterRift(entry.id);
        if (delve) {
            const pool = chapterRiftPool(entry.id);
            const target = chapterTarget(entry.id, this.target, this.targetHero);
            const seed = p.chapter.pending?.map === entry.id ? p.chapter.pending.seed : chapterSeed(p.runSerial + 1);
            const trait = chapterRiftTrait(seed);
            const chance = `每胜 ${Math.round(target.rate * 100)}%`;
            const reward: ChapterRewardDetail = this.target === 'officer' ? { hero: target.hero } : { item: signatureFor(target.hero) };
            arrows(target.name, delta => {
                this.targetHero = pool[(pool.indexOf(target.hero) + delta + pool.length) % pool.length];
                this.openMapDialog(entry, repeat);
            }, { detail: reward, source: `${entry.name} · ${chance}` });
            button(sheet, 'ToggleRiftTarget', this.target === 'officer' ? '改追专武' : '改追将帖', 0, -54, 205, 40, '#51465E', () => {
                this.target = this.target === 'officer' ? 'spear' : 'officer';
                this.openMapDialog(entry, repeat);
            });
            detail = `${chance} · 独立判定 · 赤门令 ×1`;
            hint = `外廊 → 石阶 → 偏殿 → 赤门击坛 · ${trait.name}`;
        } else if (entry.id === 'workshop') {
            const workshop = WORKSHOPS[rotation.index];
            const next = new Date(rotation.switchAt + 8 * 3600000);
            text(sheet, 'MapCurrentChoice', `${next.getUTCMonth() + 1}月${next.getUTCDate()}日 00:00 换班`, 0, 130, 24, palette.border, 550);
            detail = `本轮产出 ${workshop.material} · 首胜9份，其后3份`;
            hint = workshop.hint;
        } else if (entry.id === 'duel') {
            const boss = this.store.currentBoss.boss;
            text(sheet, 'MapCurrentChoice', `个人最高 ${formatAmount(p.chapter.duelBest[boss.id] || 0)}`, 0, 130, 24, palette.border, 550);
            detail = `弱点 ${boss.weakness}`;
            hint = SIDE_DUNGEONS.duel.note;
        } else if (entry.id === 'assault') {
            text(sheet, 'MapCurrentChoice', '破城后守军失去保护', 0, 130, 24, palette.border, 550);
            detail = '胜利获得炉砂 ×2';
            hint = SIDE_DUNGEONS.assault.note;
        } else {
            const map = CHAPTER_MAPS.find(item => item.id === entry.id)!;
            const loot = chapterLoot(map.id);
            const story = chapterStoryHero(map.id);
            const officer = chapterMapOfficer(map.id);
            const cleared = !!((p.chapter.clears[entry.id] || 0) & (1 << this.difficulty));
            arrows(`${DIFFICULTIES[this.difficulty]}${cleared ? ' · 已通过' : ''}`, delta => {
                this.difficulty = ((this.difficulty + delta + DIFFICULTIES.length) % DIFFICULTIES.length) as Difficulty;
                this.openMapDialog(entry, repeat);
            });
            const first = this.difficulty === 0 && !cleared;
            const firstItem = chapterFirstEquipment(map.id, 'preview-first');
            const item = chapterEquipment(map.id, this.difficulty, 'preview-drop');
            if (first && story) rewards.push({ detail: { hero: story }, chance: '首通必得' });
            if (first && firstItem) rewards.push({ detail: { item: firstItem }, chance: '首通必得' });
            const chance = `${first && firstItem ? '首通后 ' : ''}${Math.round(MAP_DROP_RATES[loot][this.difficulty] * 100)}%`;
            if (item) rewards.push({ detail: { item }, chance });
            if (officer) rewards.push({ detail: { hero: officer }, chance });
            detail = '点名称查看掉落详情';
            hint = chapterMapHint(map.id) + (this.difficulty === 2 ? ' · 破卫后增伤' : '');
        }
        const pending = p.chapter.pending;
        const resume = pending?.map === entry.id && pending.difficulty === this.difficulty;
        const cost = resume ? chapterStaminaCost(pending) : this.store.chapterEntryCost(entry.id, this.difficulty);
        const supply = this.store.campaignSupply;
        text(banner, 'MapBannerHint', lock ? '待解锁' : '出战预览', -42, -22, 18, '#D4DDE0', 327);
        const waveCount = chapterIndex(entry.id) >= 0 && !delve ? `共${cost}波（含首领） · ` : '';
        text(sheet, 'MapPrize', `${waveCount}${resume ? '已扣体力' : '耗体力'} ${cost} · ${detail}`, 0, 38, 18, '#DFD0AA', 564);
        text(sheet, 'BattleHint', lock || hint, 0, 78, 19, lock ? '#FFC08E' : '#B4CED4', 554);

        rewards.forEach(({ detail: reward, chance }, index) => {
            const y = -7 - index * 43;
            const source = `${entry.name} · ${DIFFICULTIES[this.difficulty]} · ${chance}`;
            chapterRewardLink(sheet, `MapReward-${index}`, reward, -80, y, 21, () =>
                showChapterReward(overlay, this.store, reward, source));
            text(sheet, `RewardChance-${index}`, chance, 152, y, 18, '#CBD7D4', 135);
        });

        if (pending) {
            text(sheet, 'PendingChapter', `还有未完挑战 · ${chapterName(pending)}`, 0, -171, 23, '#F1CD90', 550);
            button(sheet, 'ResumeChapter', '继续未完挑战', 0, -253, 494, 71, '#456D55', () => this.launch(pending, 1));
            button(sheet, 'AbandonChapter', '放弃未完挑战', 0, -335, 256, 53, '#564451', () => {
                const abandoned = this.store.abandonChapter();
                this.openMapDialog(entry, repeat, abandoned ? '已放弃，可进入新关卡' : '存档失败，请重试');
            });
        } else if (p.chapter.reserve) {
            const item = p.chapter.reserve;
            chapterRewardLink(sheet, 'Reserve', { item }, 0, -171, 23, () =>
                showChapterReward(overlay, this.store, { item }, '已寄存 · 背包有空位时可领回'), `${item.name} · 已寄存`);
            button(sheet, 'ClaimReserve', '领回装备', 0, -253, 494, 71, '#6B5B3F', () => {
                this.openMapDialog(entry, repeat, this.store.claimChapterReserve() || '已领回装备');
            });
            button(sheet, 'ReserveGear', '去行装腾空间', 0, -335, 256, 53, '#40586B', () => { this.node.destroy(); this.options.gear(); });
        } else if (lock) {
            const disabled = panel(sheet, 'MapEntryLocked', 0, -253, 494, 71, '#344354', 15);
            text(disabled, 'MapEntryLockedLabel', '未解锁', 0, 0, 24, '#AAB9C4', 472);
        } else if (supply.stamina < cost) {
            text(sheet, 'NoChapterStamina', `剩余体力 ${supply.stamina}/${DAILY_STAMINA} · 次日早7点恢复`, 0, -221, 24, '#EDCC9A', 542);
        } else if (delve && !p.chapter.delveTickets) {
            text(sheet, 'NoDelveTickets', '战图胜利获得赤门令 · 每日最多10枚', 0, -171, 20, '#E7CB99', 525);
            button(sheet, 'FarmDelveTickets', '去战图刷赤门令', 0, -253, 494, 71, '#4B625A', () => {
                this.closeMapDialog();
                this.showPage('chart');
            });
        } else {
            button(sheet, 'ToggleMapRepeat', repeat ? '连刷5场 · 开' : '连刷5场 · 关', 0, -171, 256, 51, repeat ? '#67563C' : '#32475A', () => {
                this.openMapDialog(entry, !repeat);
            });
            button(sheet, 'StartChapter', repeat ? '进入 · 连刷5场' : '进入关卡', 0, -253, 494, 71, '#4D765B', () => {
                if (entry.id === 'workshop' && this.store.currentWorkshop.window !== rotation.window) {
                    const fresh = this.mapEntries().find(item => item.id === 'workshop')!;
                    this.openMapDialog(fresh, repeat, '已换班，请确认新产物');
                    return;
                }
                try { this.launch(this.store.startChapter(entry.id, this.difficulty, this.target, this.targetHero), repeat ? 5 : 1); }
                catch (error) { this.openMapDialog(entry, repeat, error instanceof Error ? error.message : '无法开战'); }
            });
        }
        text(sheet, 'ChapterNote', message, 0, -397, 19, '#F2CB98', 565);
    }

    private openRoster(note = ''): void {
        this.node.getChildByName('ChapterRoster')?.destroy();
        const view = panel(this.node, 'ChapterRoster', 0, 0, 720, 1280, '#121E32', 0);
        view.on(Node.EventType.TOUCH_END, () => {});
        const progress = this.store.progress;
        const layout = this.store.chapterFormation.companions;
        const lead = chapterProtagonist(progress.heroLevel, this.store.protagonistSpot);
        const experience = this.store.experiencePreview();
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
        button(view, 'ClaimLeadExperience', `领挂机经验 +${formatAmount(experience.amount)}`, -151, -214, 284, 61, '#43665B', () => {
            const amount = this.store.claimExperience();
            this.openRoster(amount ? `主角经验 +${formatAmount(amount)}` : '暂无经验或今日时长已用完');
        });
        button(view, 'UpgradeLead', progress.heroLevel >= MAX_LEVEL ? '主角已满级' : `升级 · ${formatAmount(this.store.upgradeCost)}脑铢`,
            151, -214, 284, 61, '#75613E', () => {
                if (progress.heroLevel >= MAX_LEVEL) { this.openRoster('主角已达满级'); return; }
                const result = this.store.upgradeTeam();
                this.openRoster(result.upgraded ? `主角和随将升至 Lv.${result.level} · 下一场生效`
                    : `升级需要 ${formatAmount(this.store.experienceCost)}经验与 ${formatAmount(result.cost)}脑铢`);
                if (result.upgraded && result.saved) this.promptCampaignStory(this.recommendedChapter());
            });
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
        const choices: { map: typeof CHAPTER_MAPS[number]; difficulty: 0 | 1 }[] = [];
        for (const map of CHAPTER_MAPS.filter(entry => !isChapterRift(entry.id))) {
            for (const difficulty of [0, 1] as const) {
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
        text(sheet, 'OfflineTiming', '每20分钟一场 · 最多缓存4小时 · 领取按场扣体力', 0, 284, 22, '#B3CAD6', 580);
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
            text(sheet, 'OfflineEligibility', '先打通任一张探路或硬仗地图', 0, 53, 22, '#C2CFD6', 580);
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
