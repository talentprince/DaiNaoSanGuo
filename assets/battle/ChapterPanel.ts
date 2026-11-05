import { Node } from 'cc';
import { CHAPTER_MAPS, chapterLock, chapterName, chapterProtagonist, DIFFICULTIES, MAP_DROP_RATES, TARGETS, WORKSHOPS } from '../data/ChapterConfig';
import type { ChapterRun, Difficulty, LootTarget } from '../data/ChapterConfig';
import { FORMATION_SPOTS } from '../data/FormationConfig';
import { formatAmount, MAX_LEVEL } from '../data/GrowthConfig';
import { getHero } from '../data/HeroCatalog';
import { ProgressStore } from './ProgressStore';
import { FormationPanel } from './FormationPanel';
import { portrait } from './HeroPortrait';
import { button, panel, text } from './BattleUI';

export class ChapterPanel {
    readonly node: Node;
    private map: ChapterRun['map'] = 'road';
    private difficulty: Difficulty = 0;
    private target: LootTarget = 'officer';
    private note = '';

    constructor(parent: Node, private store: ProgressStore, onClose: () => void,
        private onStart: (run: ChapterRun, count: number) => void, private onGear: () => void, current?: ChapterRun) {
        if (current) {
            this.map = current.map;
            this.difficulty = current.difficulty;
            this.target = current.target || 'officer';
        }
        this.node = panel(parent, 'ChapterOverlay', 0, 0, 720, 1280, '#101A2B', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        button(this.node, 'CloseChapters', '×', 302, 539, 64, 60, '#364D63', () => { this.node.destroy(); onClose(); });
        text(this.node, 'ChapterHeading', '长 坂 七 转', 0, 539, 42, '#F3D297', 530);
        button(this.node, 'OpenChapterRoster', '选将 · 主角和随将', 0, 474, 442, 46, '#536548', () => this.openRoster());
        this.render();
    }

    private render(): void {
        this.node.getChildByName('ChapterContent')?.destroy();
        const body = panel(this.node, 'ChapterContent', 0, -59, 682, 990, '#152438', 20);
        const chapter = this.store.progress.chapter;
        const rotation = this.store.currentWorkshop;
        const workshop = WORKSHOPS[rotation.index];
        const next = new Date(rotation.switchAt + 8 * 3600000);
        const switchDate = `${next.getUTCMonth() + 1}月${next.getUTCDate()}日 00:00`;
        const entries = [...CHAPTER_MAPS, { id: 'workshop' as const, name: '军器换班', prize: `${workshop.name} · ${workshop.material}` }];
        entries.forEach((entry, index) => {
            const difficulty = entry.id === 'rift' ? 2 : 0;
            const locked = chapterLock(chapter.clears, entry.id, difficulty);
            const card = panel(body, `ChapterMap-${entry.id}`, (index % 2 ? 1 : -1) * 163, 407 - Math.floor(index / 2) * 107,
                307, 94, this.map === entry.id ? '#52624F' : locked ? '#233147' : '#304961', 14);
            text(card, 'MapName', entry.name, 0, 17, 26, locked ? '#B0BFD1' : '#F4D69E', 286);
            const caption = locked ? '待解锁' : entry.id === 'workshop' ? entry.prize : ['剧情首通', '专刷枪类', '将帖 / 碎片', '章末首领', '稀有战利品'][index];
            text(card, 'MapCaption', caption, 0, -20, 19, '#C9D8DD', 286);
            card.on(Node.EventType.TOUCH_END, () => { this.map = entry.id; this.difficulty = difficulty; this.note = ''; this.render(); });
        });
        const locked = chapterLock(chapter.clears, this.map, this.difficulty);
        if (this.map === 'rift') {
            (['officer', 'spear'] as const).forEach((target, index) => {
                const entry = TARGETS[target];
                button(body, `Target-${target}`, entry.name, index === 0 ? -163 : 163, 99, 305, 54,
                    this.target === target ? '#77633F' : '#354C64', () => { this.target = target; this.note = ''; this.render(); });
                text(body, `Pity-${target}`, `${entry.rate * 100}% · 保底 ${chapter.pity[target]}/${entry.guarantee}`,
                    index === 0 ? -163 : 163, 52, 20, this.target === target ? '#FFD378' : '#B9C8DB', 301);
            });
        } else if (this.map === 'workshop') {
            text(body, 'WorkshopToday', `本轮 ${workshop.name} · 产出 ${workshop.material}`, 0, 98, 25, '#F4D69E', 650);
            text(body, 'WorkshopNext', `上海时间 ${switchDate}换班 · 每窗首胜9份，再胜3份`, 0, 53, 19, '#BCD0D9', 650);
        } else {
            DIFFICULTIES.forEach((name, index) => {
                const difficulty = index as Difficulty;
                const cleared = !!((chapter.clears[this.map as keyof typeof chapter.clears] || 0) & (1 << difficulty));
                const lock = chapterLock(chapter.clears, this.map, difficulty);
                button(body, `Difficulty-${index}`, `${name}${cleared ? ' ✓' : lock ? ' · 锁' : ''}`, (index - 1) * 212, 99, 195, 54,
                    this.difficulty === difficulty ? '#77633F' : '#354C64', () => { this.difficulty = difficulty; this.note = ''; this.render(); });
            });
            const map = CHAPTER_MAPS.find(m => m.id === this.map)!;
            const odds = this.map === 'ridge' ? MAP_DROP_RATES.equipment[this.difficulty] : this.map === 'bridge' ? MAP_DROP_RATES.officer[this.difficulty] : null;
            text(body, 'MapPrize', `${map.prize}${odds === null ? '' : ` · ${Math.round(odds * 100)}%`}`, 0, 52, 20, '#D9C89E', 650);
        }
        const hint = this.map === 'workshop' ? workshop.hint : this.difficulty === 2
            ? '击破精卫后，首领额外受到25%伤害'
            : this.difficulty === 1 ? '先破两名护阵精卫，解除首领减伤' : '自动行军 · 击败精英更快召出首领';
        text(body, 'BattleHint', locked || hint, 0, 4, 20, locked ? '#EEAA89' : '#A9CED1', 650);

        if (chapter.pending) {
            const pending = chapter.pending;
            text(body, 'PendingChapter', `未完战图 · ${chapterName(pending)} · 从本场开头继续`, 0, -78, 22, '#EDD0A5', 650);
            button(body, 'ResumeChapter', '继续未完挑战', -162, -147, 302, 64, '#446A56', () => this.launch(pending, 1));
            button(body, 'AbandonChapter', '放弃本场', 162, -147, 302, 64, '#685049', () => {
                this.note = this.store.abandonChapter() ? '已放弃本场' : '存档失败，请重试';
                this.render();
            });
        } else if (chapter.reserve) {
            text(body, 'Reserve', `寄存装备 · ${chapter.reserve.name}`, 0, -78, 24, '#FFD378', 650);
            button(body, 'ClaimReserve', '领取装备', 0, -147, 550, 64, '#6F6344', () => {
                this.note = this.store.claimChapterReserve() || '已领取到行装';
                this.render();
            });
        } else {
            const start = (count: number) => {
                if (this.map === 'workshop' && this.store.currentWorkshop.window !== rotation.window) {
                    this.note = '已换班，请确认新任务产物';
                    this.render();
                    return;
                }
                try { this.launch(this.store.startChapter(this.map, this.difficulty, this.target), count); }
                catch (error) { this.note = error instanceof Error ? error.message : '无法开战'; this.render(); }
            };
            button(body, 'StartChapter', '挑战一场', -162, -99, 302, 68, locked ? '#3C4755' : '#496E58', () => start(1));
            button(body, 'RepeatChapter', '自动连刷5场', 162, -99, 302, 68, locked ? '#3C4755' : '#6F6344', () => start(5));
            text(body, 'RepeatRule', '连刷遇撤退、装备寄存或换班会停下', 0, -166, 19, '#9DB4C8', 650);
        }
        text(body, 'WorkshopMaterials', WORKSHOPS.map((entry, index) => `${entry.material} ${chapter.materials[index]}`).join('    '), 0, -241, 23, '#E4D09F', 650);
        button(body, 'ChapterGear', '行装 · 整装', -162, -306, 302, 66, '#405D73', () => { this.node.destroy(); this.onGear(); });
        const ready = this.store.chapterOffline?.ready || 0;
        button(body, 'ChapterOffline', ready ? `挂机可领 ${ready} 场` : '离线挂机', 162, -306, 302, 66, '#4C6458', () => this.openOffline());
        text(body, 'ChapterNote', this.note, 0, -387, 20, '#F2CB98', 650);
        text(body, 'ChapterFooter', '保留原主线进度 · 可派队挂机已通关地图', 0, -453, 19, '#A8BBCC', 650);
    }

    private openRoster(note = ''): void {
        this.node.getChildByName('ChapterRoster')?.destroy();
        const view = panel(this.node, 'ChapterRoster', 0, 0, 720, 1280, '#121E32', 0);
        view.on(Node.EventType.TOUCH_END, () => {});
        const progress = this.store.progress;
        const layout = progress.formations.main;
        const lead = chapterProtagonist(progress.heroLevel, this.store.protagonistSpot);
        const experience = this.store.experiencePreview();
        const displayName = (entry: typeof layout[number]) => entry.hero ? getHero(entry.hero)!.name
            : entry.troop === 'spear' ? '长枪兵' : entry.troop === 'bow' ? '弓箭兵' : '刀盾兵';

        text(view, 'RosterTitle', '主 角 与 随 将', 0, 533, 38, '#F2D294', 650);
        portrait(view, { protagonist: true }, 94).setPosition(-209, 421);
        text(view, 'LeadName', `${lead.name} Lv.${progress.heroLevel} · 固定出战`, 59, 451, 28, '#F3D690', 480);
        text(view, 'LeadSkill', `${lead.skillName} · 单体攻击 · 铁甲先锋`, 59, 411, 21, '#C1D7E0', 480);
        text(view, 'LeadStats', `生命 ${formatAmount(lead.maxHp)}   攻击 ${formatAmount(lead.attack)}   防御 ${formatAmount(lead.defense)}`, 59, 374, 21, '#ACCBDA', 480);
        text(view, 'CompanionRule', '四席随将跟随主角等级 · 点已占阵位可换主角位置', 0, 318, 20, '#BFD5DA', 650);
        FORMATION_SPOTS.forEach(spot => {
            const entry = layout.find(member => member.spot === spot.id);
            const selected = spot.id === lead.formationSpot;
            const cell = panel(view, `ChapterSeat-${spot.id}`, spot.x, 204 + (spot.y - 310) * .72, 177, 95,
                selected ? '#726141' : entry ? '#314A60' : '#1B2B40', 13);
            if (selected) portrait(cell, { protagonist: true }, 49).setPosition(0, 12);
            else if (entry) portrait(cell, entry, 49).setPosition(0, 12);
            text(cell, 'SeatName', selected ? '主角' : entry ? displayName(entry) : '空阵位', 0, -29, 19, selected ? '#FFD77D' : '#C7D8DF', 160);
            if (entry && !selected) cell.on(Node.EventType.TOUCH_END, () => {
                this.openRoster(this.store.setProtagonistSpot(spot.id) || '已调整 · 下一场生效');
            });
        });
        const reserve = layout.find(member => member.spot === lead.formationSpot)!;
        text(view, 'RosterReserve', `${displayName(reserve)}下一场替补 · 原主线阵容仍保留`, 0, -87, 20, '#ADBFCD', 650);
        text(view, 'RosterExperience', `主角经验 ${formatAmount(progress.experience)} / ${formatAmount(this.store.experienceCost)} · 随将 Lv.${progress.heroLevel}`, 0, -149, 23, '#E3CD9E', 650);
        button(view, 'ClaimLeadExperience', `领挂机经验 +${formatAmount(experience.amount)}`, -151, -214, 284, 61, '#43665B', () => {
            const amount = this.store.claimExperience();
            this.openRoster(amount ? `主角经验 +${formatAmount(amount)}` : '暂无经验或今日时长已用完');
        });
        button(view, 'UpgradeLead', progress.heroLevel >= MAX_LEVEL ? '主角已满级' : `升级 · ${formatAmount(this.store.upgradeCost)}脑铢`,
            151, -214, 284, 61, '#75613E', () => {
                const result = this.store.upgradeTeam();
                this.openRoster(result.upgraded ? `主角和随将升至 Lv.${result.level} · 下一场生效`
                    : `升级需要 ${formatAmount(this.store.experienceCost)}经验与 ${formatAmount(result.cost)}脑铢`);
            });
        button(view, 'ChooseCompanions', '更换随将 · 打开布阵', 0, -311, 588, 65, '#405D73', () => {
            view.destroy();
            new FormationPanel(this.node, this.store, () => this.openRoster());
        });
        text(view, 'RosterNote', note, 0, -401, 20, '#F4D199', 650);
        button(view, 'CloseRoster', '返回战图', 0, -524, 588, 64, '#39546A', () => view.destroy());
    }

    private openOffline(lines: string[] = []): void {
        this.node.getChildByName('ChapterOfflineOverlay')?.destroy();
        const overlay = panel(this.node, 'ChapterOfflineOverlay', 0, 0, 720, 1280, '#131F32', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const job = this.store.chapterOffline;
        const selection = CHAPTER_MAPS.find(map => map.id === this.map);
        const attempt = (action: () => string[]) => {
            try { this.openOffline(action()); }
            catch (error) { this.openOffline([error instanceof Error ? error.message : '挂机操作未完成']); }
        };
        text(overlay, 'OfflineTitle', '战 图 · 挂 机', 0, 470, 39, '#F0D29D', 650);
        text(overlay, 'OfflineTiming', '每20分钟完成一场 · 最多缓存4小时', 0, 376, 24, '#B3CAD6', 650);
        text(overlay, 'OfflineEligibility', '仅已通关的探路 / 硬仗 · 派队时按当前行装自动试战', 0, 326, 20, '#B3CAD6', 650);
        text(overlay, 'OfflineCurrent', job ? `驻扎 ${chapterName(job.run)} · ${DIFFICULTIES[job.run.difficulty]} · Lv.${job.run.level}` : '尚未派队', 0, 240, 25, '#EDD3A5', 650);
        button(overlay, 'ClaimChapterOffline', job ? `结算 ${job.ready} 场` : '暂无挂机奖励', 0, 158, 574, 70, '#53654A', () => {
            attempt(() => this.store.claimChapterOffline().lines);
        });
        const selectable = !!selection && this.map !== 'rift' && this.difficulty < 2;
        button(overlay, 'AssignChapterOffline', selectable ? `派队 · ${selection.name} ${DIFFICULTIES[this.difficulty]}` : '请先选一张探路 / 硬仗地图',
            0, 48, 574, 70, selectable ? '#645B43' : '#37495A', () => {
                attempt(() => [this.store.assignChapterOffline(this.map, this.difficulty) || '试战通过 · 已开始挂机']);
            });
        lines.forEach((line, i) => text(overlay, `OfflineSummary-${i}`, line, 0, -64 - i * 47, 22, '#DCDBB9', 650));
        button(overlay, 'CloseChapterOffline', '返回战图', 0, -524, 574, 64, '#39546A', () => { overlay.destroy(); this.render(); });
    }

    private launch(run: ChapterRun, count: number): void {
        this.node.destroy();
        this.onStart(run, count);
    }
}
