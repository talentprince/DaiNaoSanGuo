import { portrait } from './HeroPortrait';
import { MAX_LEVEL, STAR_COSTS, xpRequired } from '../data/GrowthConfig';
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
    private note = '';
    private edit: 'main' | 'trial' | 'defense' | 'wall' = 'main';
    private draft: HeroId[];
    private results: RecruitResult[] = [];
    private boat: BoatChoice[] | null = null;
    private store: ProgressStore;
    private onClose: () => void;
    private onStart: (run: ActivityRun) => void;

    constructor(parent: Node, store: ProgressStore, onClose: () => void, onStart: (run: ActivityRun) => void, initialTab: Tab = 'heroes') {
        this.tab = initialTab; this.store = store; this.onClose = onClose; this.onStart = onStart;
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
        text(this.node, 'HallWallet', `呆币 ${p.daibi}   脑勋 ${p.points}   铜钱 ${p.coins}`, 0, 502, 23, '#C6D6DF');
        const tabs: [Tab, string][] = [['heroes', '武将'], ['draw', '招募'], ['idle', '成长'], ['activities', '副本'], ['exchange', '脑勋坊']];
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
        const list = HERO_CATALOG.filter(h => p.owned.indexOf(h.id) >= 0).sort((a,b)=>b.tier-a.tier||(p.stars[b.id]||1)-(p.stars[a.id]||1)).concat(HERO_CATALOG.filter(h => p.owned.indexOf(h.id) < 0).sort((a,b)=>(a.storyStage||9999)-(b.storyStage||9999)));
        list.slice(this.page * 5, this.page * 5 + 5).forEach((h, i) => {
            const row = panel(this.node, `Hero-${h.id}`, 0, 185 - i * 112, 630, 100, '#21364B', 12);
            const owned=p.owned.indexOf(h.id)>=0;
            portrait(row,{hero:h.id},65).setPosition(-259,0);
            text(row,'Name',`${h.name}  ${owned?'★'.repeat(p.stars[h.id]||1):TIER_NAMES[h.tier-1]}`,-28,21,23,TIER_COLORS[h.tier-1],390);
            text(row,'Source',owned?`${TIER_NAMES[h.tier-1]} · ${h.role} · 碎片${p.fragments[h.id]||0}`:acquisition(h.id),-28,-18,17,'#9CB2C6',390);
            button(row,'StarDetails',owned?'升星':'未结识',247,0,112,56,owned?'#665D42':'#34475C',()=>{if(owned)this.showStar(h.id);});
        });
        this.pagination(list.length);
        this.note = this.note || '点击上方拖拽布阵；头像拖入阵位，可混编刀枪弓';
    }
    private draw(): void {
        const p = this.store.progress;
        text(this.node, 'DrawTitle', '呆币招募 · 结识天下英雄', 0, 342, 30, '#E3C68C');
        text(this.node, 'DrawOdds', '基础概率：普通60% · 骁将30% · 名将9% · 神将1%', 0, 288, 21, '#B0C5DB');
        text(this.node, 'DrawPity', `十连至少1骁将 · 最迟80抽神将（当前 ${p.pity}/80）`, 0, 245, 21, '#CEB4D9');
        text(this.node, 'DrawDuplicate', '重复武将：20专属碎片 + 铜钱 · 全部武将可升星', 0, 204, 19, '#8DA6BF');
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
            text(row, 'Outcome', r.duplicate ? `碎片+${r.fragments} · 铜钱+${r.coins}` : '新武将已获得', 0, -19, 18, '#A6BECF', 288);
        });
    }
    private showStar(id:HeroId):void {
        const p=this.store.progress;const h=getHero(id)!;const star=p.stars[id]||1;const cost=STAR_COSTS[star-1];
        const overlay=panel(this.node,'StarOverlay',0,0,720,1280,'#101B2CF5',0);overlay.on(Node.EventType.TOUCH_END,()=>{});
        portrait(overlay,{hero:id},160).setPosition(0,300);
        text(overlay,'StarTitle',`${h.name} · ${star}星`,0,150,38,'#F2D08C');
        text(overlay,'StarRule','每升1星基础攻防生命+16% · 最高6星',0,75,23,'#BACDDD');
        text(overlay,'StarMilestone','3星：蓄能+10%   6星：攻击技能伤害+20%',0,23,22,'#DFC396');
        text(overlay,'StarFragments',`专属碎片 ${p.fragments[id]||0}  +  通用将魂 ${p.souls}`,0,-62,27,'#B9D1BE');
        text(overlay,'StarNeed',star>=6?'已达到最高星级':`本次消耗${cost}，优先使用本将碎片`,0,-119,23,'#C7B7CA');
        button(overlay,'ConfirmStar',star>=6?'已满星':'升星',0,-226,440,80,'#77613E',()=>{this.note=this.store.starUp(id)||`${h.name}升至${star+1}星，下一场生效`;this.render();});
        button(overlay,'CloseStar','返回武将',0,-350,440,64,'#344E64',()=>{overlay.destroy();});
    }
    private idle():void {
        const p=this.store.progress;const xp=this.store.experiencePreview();
        text(this.node,'GrowthTitle','征 途 · 每 日 成 长',0,348,31,'#E5CC92');
        const exp=panel(this.node,'ExperienceCard',0,239,630,145,'#213B4A');
        text(exp,'TeamLevel',`全队 Lv.${p.heroLevel}  ·  经验 ${p.experience}/${xpRequired(p.heroLevel)}`,0,38,28,'#D8E6CB',595);
        text(exp,'XpRate',`最高第${p.highestCleared}关 · ${xp.rate.toFixed(1)}经验/分钟`,0,-5,21,'#A6BED1',590);
        text(exp,'XpCap',`今日已领${Math.floor(p.daily.xpUsedMs/60000)}/240分钟 · 缓存最多4小时`,0,-43,20,'#9CB7C9',595);
        button(this.node,'ClaimExperience',`领取经验 +${xp.amount}`,-161,106,302,70,'#486F56',()=>this.attempt(()=>{const n=this.store.claimExperience();this.note=n?`经验+${n}`:'暂时无经验或今日已满4小时';}));
        button(this.node,'UpgradeGrowth',p.heroLevel>=MAX_LEVEL?'已满级':`升级 · ${this.store.upgradeCost}铜`,161,106,302,70,'#776440',()=>this.attempt(()=>{const r=this.store.upgradeTeam();this.note=r.upgraded?`全队升到Lv.${r.level}，下一场生效`:`需要${this.store.experienceCost}经验和${r.cost}铜钱`;}));
        text(this.node,'IdleCoins',`呆币缓存 ${this.store.idlePreview()} / 1000（24h）`,-64,6,22,'#DBCC9D',470);
        button(this.node,'ClaimIdle','领币',247,6,120,52,'#415F6F',()=>this.attempt(()=>{this.note=`领取${this.store.claimIdle()}呆币`;}));
        const goals=panel(this.node,'DailyGoals',0,-143,630,198,'#22364D');
        text(goals,'DailyMedals',`今日脑勋 ${p.daily.medalEarned}/100 · 将魂 ${p.daily.soulEarned}/20`,0,58,26,'#E4C994',600);
        text(goals,'DailyModes',`攻城${p.daily.cityUsed}/3  讨董${p.daily.modes.indexOf('boss')>=0?'✓':'○'}  借宝${p.daily.boatUsed}/2`,0,10,23,'#B7CBDB',595);
        text(goals,'DailyBonus',p.daily.bonusClaimed?'三种日常已体验 · 额外10脑勋已计入':'完成攻城、讨董、借宝各一次 → 额外10脑勋',0,-34,20,'#A8C6AE',605);
        text(goals,'ExchangeHorizon','满额日：专武7天 · 名将14天 · 神将21天',0,-72,19,'#AA9EC1',605);
        const advice=panel(this.node,'StrategistAdvice',0,-334,630,140,'#3C3D40');
        text(advice,'AdviceTitle','军师锦囊 · 下一步',0,37,24,'#E7CB8B',595);
        text(advice,'Advice',this.store.growthAdvice(),0,-15,21,'#CCDBD0',595);
        this.note=this.note||'通关不直接给经验；地图提高会提升之后的挂机效率';
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
            ['city', '本地守军演练 · 可选2名城上守将', `今日 ${p.daily.cityUsed}/3次 · 胜180呆币/12脑勋，败90/8`, '演练攻城'],
            ['boss', '30秒冲伤害 · 无限挑战 · 当日只取最高', `今日最高${p.daily.bossBest} · 全服排名待联机`, '挑战董卓'],
            ['trial', `3v5 · 最多1神将2名将 · 缺位补兵 · 下一关${Math.min(99, p.trialHighest + 1)}`, `${trialTrait(Math.min(99, p.trialHighest + 1)).join('：')}`, '三将出战'],
            ['boat', '三次筹谋再护船 · 东风/稳船/修缮自由搭配', `今日 ${p.daily.boatUsed}/2次 · 胜260呆币/12脑勋，败130/8`, '筹谋借宝'],
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
        this.note = this.note || '三将首通100呆币/10脑勋；脑勋每日总上限100';
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
        text(this.node, 'ExchangeRule', '脑勋每天最多100 · 名将1400 / 神将2100 · 任意选', 0, 357, 22, '#D2BE98');
        const list = HERO_CATALOG.filter(h => h.tier >= 3);
        list.slice(this.page * 5, this.page * 5 + 5).forEach((h, i) => {
            const owned = p.owned.indexOf(h.id) >= 0;
            const row = panel(this.node, `Exchange-${h.id}`, 0, 255 - i * 128, 630, 114, '#23374D', 12);
            text(row, 'Hero', `${TIER_NAMES[h.tier - 1]} · ${h.name} · ${h.role}`, -70, 24, 25, TIER_COLORS[h.tier - 1], 460);
            text(row, 'Cost', `${EXCHANGE_COST[h.tier as 3 | 4]}脑勋任选，获得后可立即编队`, -70, -21, 18, '#98B1C9', 460);
            button(row, 'Redeem', owned ? '已拥有' : '兑换此将', 240, 0, 134, 62, owned ? '#3C4B5A' : '#6C6046', () => this.attempt(() => {
                this.note = this.store.exchange(h.id) || `兑换成功！${h.name}已加入武将库`;
            }));
        });
        this.pagination(list.length);
    }
    private start(run: ActivityRun): void { this.closed = true; this.node.destroy(); this.onStart(run); }
}
