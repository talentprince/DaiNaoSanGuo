import { heroCard,heroArtwork,heroDetails } from './HeroCard';
import { formatAmount } from '../data/GrowthConfig';
import { Color,Graphics } from 'cc';
import { portrait } from './HeroPortrait';
import { MAX_LEVEL, STAR_COSTS, xpRequired } from '../data/GrowthConfig';
import { FormationPanel } from './FormationPanel';
import { Node } from 'cc';
import { button, panel, text, makeNode } from './BattleUI';
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
        text(this.node, 'HallTitle', ({heroes:'群 英 录',draw:'神 将 召 来',idle:'征 途',activities:'四 境 征 战',exchange:'名 将 坊'})[this.tab], 0, 548, 38, '#EACD96');
        text(this.node, 'HallWallet', `脑铢 ${formatAmount(p.coins)}    呆币 ${formatAmount(p.daibi)}    脑勋 ${formatAmount(p.points)}`, 0, 609, 21, '#C6D6DF');
        const tabs: [Tab, string][] = [['heroes', '武将'], ['draw', '招募'], ['idle', '成长'], ['activities', '副本'], ['exchange', '名将坊']];
        tabs.forEach(([id, title], i) => button(this.node, `Tab-${id}`, title, (i - 2) * 128, 479, 120, 52,
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
        const pages = Math.max(1, Math.ceil(total / 6));
        this.page = Math.max(0, Math.min(this.page, pages - 1));
        button(this.node, 'PagePrev', '上一页', -230, -421, 150, 52, '#2A4058', () => { this.page = (this.page + pages - 1) % pages; this.render(); });
        text(this.node, 'PageCount', `${this.page + 1} / ${pages}`, 0, -421, 20, '#91AAC2', 200);
        button(this.node, 'PageNext', '下一页', 230, -421, 150, 52, '#2A4058', () => { this.page = (this.page + 1) % pages; this.render(); });
    }
    private openHero(id:HeroId,mode:'roster'|'exchange'|'result'):void {
        heroDetails(this.node,this.store,id,mode,()=>this.render(),()=>new FormationPanel(this.node,this.store,()=>this.render()),()=>{this.tab='draw';this.page=0;this.results=[];this.render();});
    }
    private heroes():void {
        const p=this.store.progress;
        text(this.node,'RosterSummary',`已结识 ${p.owned.length}/${HERO_CATALOG.length} · 点击卡牌看属性与羁绊`,0,415,21,'#C7CCA8');
        button(this.node,'OpenFormationEditor','布阵 · 查看同阵羁绊',0,360,620,48,'#53694D',()=>new FormationPanel(this.node,this.store,()=>this.render()));
        const list=HERO_CATALOG.filter(h=>p.owned.indexOf(h.id)>=0).sort((a,b)=>b.tier-a.tier||(p.stars[b.id]||1)-(p.stars[a.id]||1)).concat(HERO_CATALOG.filter(h=>p.owned.indexOf(h.id)<0).sort((a,b)=>(a.storyStage||9999)-(b.storyStage||9999)));
        list.slice(this.page*6,this.page*6+6).forEach((h,i)=>heroCard(this.node,this.store,h.id,(i%3-1)*216,192-Math.floor(i/3)*310,200,284,p.owned.indexOf(h.id)>=0?h.role:'未结识',()=>this.openHero(h.id,'roster')));
        this.pagination(list.length);this.note=this.note||'卡牌与战斗共用人物造型 · 羁绊仅同阵生效';
    }
    private performDraw(count:1|10):void {
        try{this.results=this.store.recruit(count);this.note='招募结果已保存';this.render();this.showRecruitResults(count);}
        catch(error){this.note=error instanceof Error?error.message:'招募未完成';this.render();}
    }
    private draw():void {
        const p=this.store.progress;
        const banner=panel(this.node,'DivineRecruitBanner',0,205,640,380,'#362A42',20);
        const rays=makeNode('RecruitRays',banner).addComponent(Graphics);rays.fillColor=new Color('#E7C57224');
        for(let i=0;i<13;i++){const a=i*.5;const end=(v:number)=>[Math.max(-310,Math.min(310,Math.cos(v)*340)),Math.max(-170,Math.min(170,Math.sin(v)*340-115))];const p=end(a),q=end(a+.12);rays.moveTo(0,-115);rays.lineTo(p[0],p[1]);rays.lineTo(q[0],q[1]);rays.close();rays.fill();}
        heroArtwork(banner,'guanyu',-192,-7,1.52,true);heroArtwork(banner,'lvbu',0,-7,1.60,true);heroArtwork(banner,'xiaoqiao',192,-7,1.55,true);
        const titleBand=panel(banner,'RecruitTitleBand',0,160,600,44,'#2A233BEF',8);text(titleBand,'RecruitBannerTitle','神 将 · 专 武 风 采',0,0,28,'#FFE0A1',590);
        ['关羽 · 青龙风暴','吕布 · 无双乱舞','小乔 · 霜华漫天'].forEach((name,i)=>text(banner,'DivineName',name,(i-1)*207,-146,19,'#F4D7A2',204));
        text(banner,'SignaturePreviewNote','专武外观展示 · 招募获得基础武将，专武另行兑换',0,-176,15,'#BDB1CA',610);
        text(this.node,'DrawOdds','普通60% · 骁将30% · 名将9% · 神将1%',0,-33,21,'#AFC5DA');
        text(this.node,'DrawPity',`十连至少骁将 · 最迟80抽神将 · 当前${p.pity}/80`,0,-77,20,'#D7BFDE');
        button(this.node,'SingleRecruit','单抽 · 100呆币',-160,-153,300,76,'#456C5C',()=>this.performDraw(1));
        button(this.node,'TenRecruit','十连 · 1000呆币',160,-153,300,76,'#92723E',()=>this.performDraw(10));
        const rules=panel(this.node,'RecruitRules',0,-306,630,170,'#23374D');
        text(rules,'RecruitRuleTitle','结识新将 · 组合羁绊',0,49,25,'#DACA9C');
        text(rules,'RecruitRuleOne','重复武将 → 20专属碎片 + 脑铢',0,0,22,'#AAC7D8');
        text(rules,'RecruitRuleTwo','所有武将均可升到6星；保底跨次保存',0,-43,20,'#A4BBD0');
    }
    private showRecruitResults(count:1|10):void {
        const overlay=panel(this.node,'RecruitResults',0,0,720,1280,'#111827FC',0);overlay.on(Node.EventType.TOUCH_END,()=>{});
        text(overlay,'RecruitResultTitle',count===10?'十 连 · 将 星 入 营':'将 星 入 营',0,550,38,'#EBCD8C');
        text(overlay,'RecruitResultHint','点击卡牌查看属性与羁绊',0,493,21,'#9EBAD0');
        this.results.forEach((r,i)=>{
            const x=count===1?0:(i%5-2)*132;const y=count===1?155:240-Math.floor(i/5)*286;
            heroCard(overlay,this.store,r.hero,x,y,count===1?300:124,count===1?420:252,r.duplicate?`碎片+${r.fragments}`:r.guaranteed?'保底·新武将':'新武将',()=>this.openHero(r.hero,'result'));
        });
        text(overlay,'ResultsSaved','结果已入库 · 重复碎片和脑铢已结算',0,-298,21,'#AEC7B8');
        button(overlay,'RecruitAgain',count===10?'再十连 · 1000呆币':'再招募 · 100呆币',0,-416,580,74,'#80663F',()=>this.performDraw(count));
        button(overlay,'CloseResults','收下武将',0,-548,580,64,'#3C576A',()=>overlay.destroy());
    }
    private idle():void {
        const p=this.store.progress;const xp=this.store.experiencePreview();
        text(this.node,'GrowthTitle','征 途 · 每 日 成 长',0,348,31,'#E5CC92');
        const exp=panel(this.node,'ExperienceCard',0,239,630,145,'#213B4A');
        text(exp,'TeamLevel',`全队 Lv.${p.heroLevel}  ·  经验 ${p.experience}/${xpRequired(p.heroLevel)}`,0,38,28,'#D8E6CB',595);
        text(exp,'XpRate',`最高第${p.highestCleared}关 · ${xp.rate.toFixed(1)}经验/分钟`,0,-5,21,'#A6BED1',590);
        text(exp,'XpCap',`今日已领${Math.floor(p.daily.xpUsedMs/60000)}/240分钟 · 缓存最多4小时`,0,-43,20,'#9CB7C9',595);
        button(this.node,'ClaimExperience',`领取经验 +${xp.amount}`,-161,106,302,70,'#486F56',()=>this.attempt(()=>{const n=this.store.claimExperience();this.note=n?`经验+${n}`:'暂时无经验或今日已满4小时';}));
        button(this.node,'UpgradeGrowth',p.heroLevel>=MAX_LEVEL?'已满级':`升级 · ${this.store.upgradeCost}脑铢`,161,106,302,70,'#776440',()=>this.attempt(()=>{const r=this.store.upgradeTeam();this.note=r.upgraded?`全队升到Lv.${r.level}，下一场生效`:`需要${this.store.experienceCost}经验和${r.cost}脑铢`;}));
        text(this.node,'IdleCoins',`呆币缓存 ${this.store.idlePreview()} / 1000（24h）`,-64,6,22,'#DBCC9D',470);
        button(this.node,'ClaimIdle','领币',247,6,120,52,'#415F6F',()=>this.attempt(()=>{this.note=`领取${this.store.claimIdle()}呆币`;}));
        const goals=panel(this.node,'DailyGoals',0,-143,630,198,'#22364D');
        text(goals,'DailyMedals',`今日脑勋 ${p.daily.medalEarned}/100 · 脑力 ${p.daily.soulEarned}/20`,0,58,26,'#E4C994',600);
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
        const boss=this.store.currentBoss.boss;text(this.node,'WeeklyBoss',`本周${boss.name} · ${boss.attribute} · 周一0点轮换`,0,405,20,'#D6C5E5',650);
        const cards: [ActivityMode, string, string, string][] = [
            ['city', '本地守军演练 · 可选2名城上守将', `今日 ${p.daily.cityUsed}/3次 · 胜180呆币/12脑勋，败90/8`, '演练攻城'],
            ['boss', `${boss.name}·${boss.title} · 弱${boss.weakness}`, `30秒终结清场 · 今日最高${p.daily.bossBest} · 排名待联机`, '挑战魔王'],
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
    private exchange():void {
        const p=this.store.progress;
        text(this.node,'ExchangeRule','名将1400 · 神将2100脑勋 · 先看属性再兑换',0,414,21,'#CDBF9F');
        const list=HERO_CATALOG.filter(h=>h.tier>=3).sort((a,b)=>b.tier-a.tier);
        list.slice(this.page*6,this.page*6+6).forEach((h,i)=>heroCard(this.node,this.store,h.id,(i%3-1)*216,220-Math.floor(i/3)*326,200,300,p.owned.indexOf(h.id)>=0?'已拥有':`${EXCHANGE_COST[h.tier as 3|4]}脑勋`,()=>this.openHero(h.id,'exchange')));
        this.pagination(list.length);this.note=this.note||'点击卡牌查看属性、技能、专武和羁绊，再确认兑换';
    }
    private start(run: ActivityRun): void { this.closed = true; this.node.destroy(); this.onStart(run); }
}
