import { FormationPanel } from './FormationPanel';
import { Node } from 'cc';
import { button, panel, text } from './BattleUI';
import { ProgressStore } from './ProgressStore';
import type { RecruitResult } from './ProgressStore';
import { HERO_CATALOG, getHero, TIER_NAMES, TIER_COLORS, EXCHANGE_COST, TACTIC_NAMES } from '../data/HeroCatalog';
import type { HeroId } from '../data/HeroCatalog';
import { acquisition, ACTIVITY_NAMES, trialTrait } from '../data/ActivityConfig';
import type { ActivityMode, ActivityRun, BoatChoice } from '../data/ActivityConfig';

type Tab = 'heroes' | 'draw' | 'idle' | 'activities' | 'exchange';
export class MetaPanel {
    readonly node: Node;
    private tab: Tab = 'heroes';
    private page = 0;
    private closed = false;
    private note = '主线、招募和副本都能结识新伙伴';
    private edit: 'main' | 'trial' | 'defense' | 'wall' = 'main';
    private draft: HeroId[];
    private results: RecruitResult[] = [];
    private boat: BoatChoice[] | null = null;
    private store: ProgressStore;
    private onClose: () => void;
    private onStart: (run: ActivityRun) => void;

    constructor(parent: Node, store: ProgressStore, onClose: () => void, onStart: (run: ActivityRun) => void) {
        this.store = store; this.onClose = onClose; this.onStart = onStart;
        this.draft = [...store.progress.formation];
        this.node = panel(parent, 'AdventureHall', 0, 0, 720, 1280, '#0C1729', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        this.render();
    }
    private attempt(action: () => void): void {
        try { action(); } catch (error) { this.note = error instanceof Error ? error.message : '操作未完成'; }
        if (!this.closed) this.render();
    }
    private render(): void {
        this.node.destroyAllChildren();
        const p = this.store.progress;
        text(this.node, 'HallTitle', '呆 营 · 集 结', 0, 558, 42, '#EACD96');
        text(this.node, 'HallWallet', `呆币 ${p.daibi}   军功 ${p.points}   铜钱 ${p.coins}`, 0, 502, 23, '#C6D6DF');
        const tabs: [Tab, string][] = [['heroes', '武将阵容'], ['draw', '招募将台'], ['idle', '主线挂机'], ['activities', '四大副本'], ['exchange', '军功换将']];
        tabs.forEach(([id, title], i) => button(this.node, `Tab-${id}`, title, (i - 2) * 128, 440, 120, 56,
            this.tab === id ? '#666E53' : '#293C54', () => { this.tab = id; this.page = 0; this.boat = null; this.note = ''; this.render(); }));
        if (this.tab === 'heroes') this.heroes();
        else if (this.tab === 'draw') this.draw();
        else if (this.tab === 'idle') this.idle();
        else if (this.tab === 'exchange') this.exchange();
        else this.activities();
        text(this.node, 'HallNote', this.note + (this.store.storageAvailable ? '' : '（未保存）'), 0, -488, 19, '#CBDBBC', 660);
        button(this.node, 'CloseHall', '返回战斗', 0, -554, 620, 64, '#3E5D71', () => { this.closed = true; this.node.destroy(); this.onClose(); });
        text(this.node, 'LocalNotice', '本地试玩 · 真实玩家攻守与全服排名待接入', 0, -611, 16, '#7D91AD');
    }
    private pagination(total: number): void {
        const pages = Math.max(1, Math.ceil(total / 5));
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        button(this.node, 'PagePrev', '上一页', -230, -421, 150, 52, '#2A4058', () => { this.page = (this.page + pages - 1) % pages; this.render(); });
        text(this.node, 'PageCount', `${this.page + 1} / ${pages}`, 0, -421, 20, '#91AAC2', 200);
        button(this.node, 'PageNext', '下一页', 230, -421, 150, 52, '#2A4058', () => { this.page = (this.page + 1) % pages; this.render(); });
    }
    private heroes(): void {
        const p = this.store.progress;
        text(this.node, 'RosterSummary', `已结识${p.owned.length}/40位武将 · 阵型分别保存`, 0, 358, 25, '#D9C79C');
        button(this.node, 'OpenFormationEditor', '拖拽布阵 · 主线 / 三将 / 守城', 0, 282, 620, 70, '#5A7156', () => {
            new FormationPanel(this.node, this.store, () => this.render());
        });
        const list = HERO_CATALOG.filter(h => p.owned.indexOf(h.id) >= 0).concat(HERO_CATALOG.filter(h => p.owned.indexOf(h.id) < 0));
        list.slice(this.page * 5, this.page * 5 + 5).forEach((h, i) => {
            const row = panel(this.node, `Hero-${h.id}`, 0, 185 - i * 112, 630, 100, '#21364B', 12);
            text(row, 'Name', `${TIER_NAMES[h.tier - 1]} · ${h.name} · ${h.role}`, 0, 22, 24, TIER_COLORS[h.tier - 1], 600);
            text(row, 'Source', `${p.owned.indexOf(h.id) >= 0 ? '已拥有 · ' : ''}${acquisition(h.id)}`, 0, -16, 18, '#9CB2C6', 600);
        });
        this.pagination(list.length);
        this.note = this.note || '点击上方拖拽布阵；头像拖入阵位，可混编刀枪弓';
    }
    private draw(): void {
        const p = this.store.progress;
        text(this.node, 'DrawTitle', '呆币招募 · 结识天下英雄', 0, 342, 30, '#E3C68C');
        text(this.node, 'DrawOdds', '基础概率：普通60% · 骁将30% · 名将9% · 神将1%', 0, 288, 21, '#B0C5DB');
        text(this.node, 'DrawPity', `十连至少1骁将 · 最迟80抽神将（当前 ${p.pity}/80）`, 0, 245, 21, '#CEB4D9');
        text(this.node, 'DrawDuplicate', '重复武将转铜钱：200 / 500 / 2000 / 6000', 0, 204, 19, '#8DA6BF');
        button(this.node, 'SingleRecruit', '招募1次 · 100呆币', -160, 126, 300, 74, '#426C59', () => this.attempt(() => {
            this.results = this.store.recruit(1); this.note = '招募结果已入库，前往武将阵容上阵';
        }));
        button(this.node, 'TenRecruit', '招募10次 · 1000呆币', 160, 126, 300, 74, '#7C6644', () => this.attempt(() => {
            this.results = this.store.recruit(10); this.note = '十连结果已保存；新伙伴可以立即编队';
        }));
        if (!this.results.length) text(this.node, 'DrawHint', '主线首通、挂机与副本产出呆币', 0, -70, 24, '#8FA8C3');
        this.results.forEach((r, i) => {
            const h = getHero(r.hero)!;
            const row = panel(this.node, `DrawResult-${i}`, i % 2 === 0 ? -160 : 160, 20 - Math.floor(i / 2) * 88, 300, 74, '#21374C', 12);
            text(row, 'Hero', `${TIER_NAMES[h.tier - 1]} · ${h.name}${r.guaranteed ? '（保底）' : ''}`, 0, 13, 23, TIER_COLORS[h.tier - 1], 288);
            text(row, 'Outcome', r.duplicate ? `重复 → 铜钱+${r.coins}` : '新武将已获得', 0, -19, 18, '#A6BECF', 288);
        });
    }
    private idle(): void {
        const p = this.store.progress;
        text(this.node, 'IdleTitle', '主线挂机 · 呆着也有收获', 0, 334, 30, '#E0C58F');
        text(this.node, 'IdleRules', '主线首通第1关后开启 · 收益最多存24小时', 0, 263, 23, '#ADC2D6');
        text(this.node, 'IdleCap', '24小时最多1000呆币 = 一发十连', 0, 199, 26, '#C4D9C4');
        text(this.node, 'IdleAmount', `${this.store.idlePreview()} 呆币`, 0, 67, 56, '#EDCC82');
        text(this.node, 'IdleRefresh', '重新进入此页会刷新可领取数量', 0, -9, 18, '#8BA4BD');
        button(this.node, 'ClaimIdle', p.highestCleared ? '领取挂机收益' : '先通关主线第1关', 0, -103, 440, 80, '#496B56', () => this.attempt(() => {
            const amount = this.store.claimIdle(); this.note = amount ? `领取${amount}呆币，未满1呆币的时间会保留` : '暂时没有可领取的完整呆币';
        }));
        text(this.node, 'IdleSource', '反复重打主线不产呆币；副本提供额外收益', 0, -232, 22, '#9BB3C9');
        text(this.node, 'IdleFirstClear', '主线首通：每关10呆币，每5关额外50呆币', 0, -285, 21, '#9BB3C9');
    }
    private activities(): void {
        const p = this.store.progress;
        if (p.pending) {
            text(this.node, 'PendingTitle', `${ACTIVITY_NAMES[p.pending.mode]} · 尚未结束`, 0, 284, 32, '#D6C28F');
            text(this.node, 'PendingRule', '入场阵容已固定；继续挑战不会重复扣次数', 0, 200, 22, '#AFC7DC');
            button(this.node, 'ResumeRun', '继续挑战', 0, 61, 470, 78, '#426D59', () => this.start(p.pending!));
            button(this.node, 'AbandonRun', '放弃挑战（不退次数、无奖励）', 0, -53, 470, 66, '#6C5149', () => this.attempt(() => { this.store.abandonActivity(); this.note = '已放弃，消耗次数不会退回'; }));
            return;
        }
        if (this.boat) { this.boatRoute(); return; }
        const cards: [ActivityMode, string, string, string][] = [
            ['city', '本地守军演练 · 可选2名城上守将', `今日 ${p.daily.cityUsed}/3次 · 胜120呆币/60军功，败30/15`, '演练攻城'],
            ['boss', '30秒冲伤害 · 无限挑战 · 当日只取最高', `今日最高${p.daily.bossBest} · 全服排名待联机`, '挑战董卓'],
            ['trial', `3v5 · 最多1神将2名将 · 缺位补兵 · 下一关${Math.min(99, p.trialHighest + 1)}`, `${trialTrait(Math.min(99, p.trialHighest + 1)).join('：')}`, '三将出战'],
            ['boat', '三次筹谋再护船 · 东风/稳船/修缮自由搭配', `今日 ${p.daily.boatUsed}/2次 · 胜200呆币/100军功，败50/25`, '筹谋借宝'],
        ];
        cards.forEach(([mode, desc, rule, action], i) => {
            const row = panel(this.node, `Activity-${mode}`, 0, 289 - i * 181, 636, 160, '#20364B', 16);
            text(row, 'Title', ACTIVITY_NAMES[mode], -84, 47, 29, '#E5CC97', 430);
            text(row, 'Desc', desc, -60, 2, 19, '#BDCDDC', 490);
            text(row, 'Rule', rule, 0, -50, 18, '#8CA6C0', 610);
            button(row, 'Enter', action, 225, 47, 158, 51, '#46694F', () => this.attempt(() => {
                if (mode === 'boat') { this.boat = []; this.note = '筹谋阶段不消耗次数，出航时扣除'; }
                else this.start(this.store.startActivity(mode));
            }));
        });
        this.note = this.note || '三将首通80呆币/40军功；Boss奖励随最高档位补差额';
    }
    private boatRoute(): void {
        text(this.node, 'RouteTitle', `草船借宝 · 第 ${Math.min(3, this.boat!.length + 1)} 次筹谋`, 0, 326, 32, '#E6C88D');
        text(this.node, 'RouteChoices', this.boat!.length ? this.boat!.map(c => ({ wind: '借东风', guard: '稳住船', repair: '修船板' }[c])).join(' → ') : '三次选择可重复，组合成你的航线', 0, 244, 23, '#A6BED4');
        const choices: [BoatChoice, string, string][] = [['wind', '借东风', '全队攻击+20%'], ['guard', '稳住船', '全队防御+35%'], ['repair', '修船板', '全队生命+20%']];
        choices.forEach(([id, name, effect], i) => {
            button(this.node, `Route-${id}`, `${name} · ${effect}`, 0, 118 - i * 118, 540, 82, '#3A5D65', () => {
                if (this.boat!.length < 3) this.boat!.push(id);
                this.render();
            });
        });
        if (this.boat!.length === 3) button(this.node, 'Sail', '扬帆出航 · 消耗1次', 0, -260, 540, 78, '#71683E', () => this.attempt(() => this.start(this.store.startActivity('boat', this.boat!))));
        button(this.node, 'ResetRoute', '重新筹谋', 0, -366, 300, 52, '#34485E', () => { this.boat = []; this.render(); });
    }
    private exchange(): void {
        const p = this.store.progress;
        text(this.node, 'ExchangeRule', '军功来自副本 · 名将800 / 神将3000 · 任意选', 0, 357, 22, '#D2BE98');
        const list = HERO_CATALOG.filter(h => h.tier >= 3);
        list.slice(this.page * 5, this.page * 5 + 5).forEach((h, i) => {
            const owned = p.owned.indexOf(h.id) >= 0;
            const row = panel(this.node, `Exchange-${h.id}`, 0, 255 - i * 128, 630, 114, '#23374D', 12);
            text(row, 'Hero', `${TIER_NAMES[h.tier - 1]} · ${h.name} · ${h.role}`, -70, 24, 25, TIER_COLORS[h.tier - 1], 460);
            text(row, 'Cost', `${EXCHANGE_COST[h.tier as 3 | 4]}军功任选，获得后可立即编队`, -70, -21, 18, '#98B1C9', 460);
            button(row, 'Redeem', owned ? '已拥有' : '兑换此将', 240, 0, 134, 62, owned ? '#3C4B5A' : '#6C6046', () => this.attempt(() => {
                this.note = this.store.exchange(h.id) || `兑换成功！${h.name}已加入武将库`;
            }));
        });
        this.pagination(list.length);
    }
    private start(run: ActivityRun): void { this.closed = true; this.node.destroy(); this.onStart(run); }
}
