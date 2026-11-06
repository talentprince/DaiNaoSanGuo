import { PREVIEW, WECHAT } from 'cc/env';
import { buildCaption, setBrowserBuildTitle } from './data/BuildInfo';
import { BattlePreferences } from './data/BattlePreferences';
import { battleMusic } from './data/MusicRouting';
import { mobPosition } from './data/EnemyCatalog';
import { mainlineTheme } from './data/MainlineThemes';
import { BossWarning } from './battle/BossWarning';
import { approachX, cityFortressPresentation, encounterPresentation, meleeContactX } from './data/EncounterPresentation';
import { worldBossPresentation } from './data/BossPresentation';
import { worldBoss } from './data/WorldBossConfig';
import { TACTIC_NAMES } from './data/HeroCatalog';
import type { ProgressStore } from './battle/ProgressStore';
import { viewportLayout } from './data/ViewportLayout';
import type { MenuCapsule } from './data/ViewportLayout';
import { GameAudio } from './battle/GameAudio';
import { LocalSession } from './battle/LocalSession';
import { bondProgress } from './data/BondConfig';
import { formatAmount, MAX_LEVEL } from './data/GrowthConfig';
declare const wx: { getSystemInfoSync?:()=>{brand?:string;platform?:string;windowWidth?:number;screenWidth?:number};getWindowInfo?:()=>{windowWidth:number};getMenuButtonBoundingClientRect?:()=>MenuCapsule };
import { _decorator, Color, Component, Graphics, Label, Mask, Node, ResolutionPolicy, screen, sys, UIOpacity, UITransform, view } from 'cc';
import { BattleEngine, isRangedWeapon } from './battle/BattleEngine';
import type { BattleEvent, Unit } from './battle/BattleEngine';
import { InventoryPanel } from './battle/InventoryPanel';
import { SkillHud } from './battle/SkillHud';
import { battlePosition, chapterAllyPosition } from './data/FormationConfig';
import type { CampaignSection } from './battle/ChapterPanel';
import { chapterRewardLink, ChapterPanel, showCampaignEnding, showChapterReward, showPlayGuide } from './battle/ChapterPanel';
import { CHAPTER_PROTAGONIST_ID, chapterScenery, chapterName, createChapterOptions, DELVE_REVEAL_SECONDS, DELVE_ROOMS, DIFFICULTIES, isChapterRift, isSideDungeon, nextCampaignMap, SPEED_TONIC, usesDelveRooms, WORKSHOPS, workshopIndex } from './data/ChapterConfig';
import type { ChapterRun } from './data/ChapterConfig';
import { MetaPanel } from './battle/MetaPanel';
import { UnitActor } from './battle/UnitActor';
import { CombatEffects } from './battle/CombatEffects';
import { BattleStage } from './battle/BattleStage';
import { bar, button, iconButton, makeNode, panel, text } from './battle/BattleUI';
import type { UIButton } from './battle/BattleUI';
const { ccclass } = _decorator;
const DELVE_JAR = { x: 137, y: 25 };
const FINALE_IMPACT_SECONDS = .22;

/** Scene orchestration only: rules, actors, scenery and effects are separate modules. */
@ccclass('BattlePreview')
export class BattlePreview extends Component {
    private root!: Node;
    private audio!:GameAudio;private soundButton!:UIButton;
    private session!:LocalSession;
    private developer=false;
    private caption = '';
    private localAllowed=false;
    private utility:Node|null=null;
    private controls!:Node;
    private controlsOpen=false;
    private modeBadge!:UIButton;
    private bondsBadge!:UIButton;
    private field!: Node;
    private units!: Node;
    private enemyUnits!: Node;
    private fortress: Node | null = null;
    private skillHud: SkillHud | null = null;
    private topHUD!:Node; private bottomHUD!:Node; private fullBackground!:Graphics;
    private warning!:BossWarning; private layoutBusy=false; private fieldWidth=720; private fieldHeight=1104;private fieldCenter=-88; private visualStop=0;
    private effectsRoot!: Node;
    private engine!: BattleEngine;
    private store!: ProgressStore;
    private actors = new Map<string, UnitActor>();
    private meleeLanes = new Map<string, { start: number; contact: number }>();
    private approachDuration = 0;
    private delveRoom = -1;
    private delveEntrances = new Map<string, { x: number; y: number; delay: number; giant: boolean }>();
    private verticalLanes = new Map<string, { start: number; contact: number }>();
    private marching = false;
    private scenery: BattleStage | null = null;
    private fx!: CombatEffects;
    private speed = 1;
    private autoShortcut!:ReturnType<typeof button>;private autoSkill = true;private preferences!:BattlePreferences;private combatState!:Label;private battleReadout!:Node;
    private resultShown = false;
    private modal: Node | null = null;
    private title!: Label;
    private wallet!: Label;
    private overview!: Label;
    private overviewBar!: Graphics;
    private statusLine!: Label;
    private pause!: UIButton;
    private speedButton!: UIButton;
    private autoButton!: UIButton;
    private inventory: InventoryPanel | null = null;
    private hall: MetaPanel | null = null;
    private activeChapter: ChapterRun | null = null;
    private chapterRepeats = 0;
    private autoNext = 0;
    private finaleImpactTime = 0;
    private nextLabel: Label | null = null;

    start(): void {
        view.setDesignResolutionSize(720, 1280, screen.windowSize.height>=screen.windowSize.width?ResolutionPolicy.FIXED_WIDTH:ResolutionPolicy.SHOW_ALL);
        let simulator=false;try{if(typeof wx!=='undefined'){const info=wx.getSystemInfoSync?.();simulator=info?.brand==='devtools'||info?.platform==='devtools';}}catch(_){}
        const host=typeof window!=='undefined'&&window.location?window.location.hostname:'';
        try { this.session=new LocalSession(sys.localStorage,host,simulator); }
        catch (_) {
            const blocked=makeNode('ServiceUnavailable',this.node);
            text(blocked,'ServiceMessage','本地战图暂时无法启动',0,0,30,'#EADBBF',650);
            return;
        }
        this.localAllowed=this.session.testAllowed;
        this.store=this.session.initial();this.developer=this.store.developerMode;this.loadPreferences();
        const native = WECHAT || typeof wx !== 'undefined';
        const caption = this.caption = buildCaption(PREVIEW, native);
        setBrowserBuildTitle(typeof document === 'undefined' ? undefined : document, caption, native);
        console.info('[Build]', caption);
        this.audio = new GameAudio(this.localAllowed, this.session.experienceMode);
        this.fullBackground=makeNode('EdgeToEdgeBackground',this.node).addComponent(Graphics);
        this.root = makeNode('BattleDemo', this.node);
        this.topHUD=makeNode('TopHUD',this.root);this.bottomHUD=makeNode('BottomHUD',this.root);
        // Activate the completed hierarchy together so mask/graphics register in consistent render order.
        this.root.active = false;
        this.root.addComponent(UITransform).setContentSize(720, 1280);
        this.wallet=text(this.topHUD,'Wallet','',0,612,21,'#D6D3B9',710);
        this.title=text(this.topHUD,'Stage','',-55,558,24,'#EADBBF',560);
        this.modeBadge=button(this.topHUD,'ModeBadge','常规',297,557,92,42,'#4B5C65',()=>{if(this.localAllowed)this.openDeveloper();else if(this.session.experienceMode)this.openExperienceGift();});
        this.overview=text(this.topHUD,'EncounterOverview','',0,518,17,'#C6CBAA',700);
        this.overviewBar=makeNode('EncounterProgress',this.topHUD,0,495).addComponent(Graphics);
        panel(this.root,'BattlefieldFrame',0,-88,720,1104,'#192C3D',14);
        this.field=makeNode('Battlefield',this.root,0,-88);this.field.addComponent(UITransform).setContentSize(720,1104);this.field.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        this.units = makeNode('Units', this.field);
        this.effectsRoot = makeNode('CombatEffects', this.field);
        this.fx = new CombatEffects(this.effectsRoot);
        const versionPlate = panel(this.bottomHUD, 'VersionPlate', 0, -622, 270, 27, '#142238DE', 8);
        text(versionPlate, 'BuildVersion', caption, 0, 0, 15, '#E0E7EF', 255);
        this.battleReadout = panel(this.bottomHUD, 'BattleReadout', 0, -496, 548, 54, '#142238E8', 12);
        this.statusLine = text(this.battleReadout, 'BattleLog', '', 0, 12, 17, '#F4EAD6', 520);
        this.combatState = text(this.battleReadout, 'CombatState', '', 0, -13, 16, '#F0D18B', 520);
        this.bondsBadge=button(this.field,'BondsBadge','羁绊',-162,437,170,36,'#2D4754',()=>this.openBonds());
        iconButton(this.topHUD, 'WorkshopShortcut', '换班', 'scene', 313, 338, 68, 72, () => this.openChapter('workshop'));
        iconButton(this.topHUD, 'RosterShortcut', '主角', 'hero', -313, 338, 68, 72, () => this.openChapter('roster'));
        this.autoShortcut=button(this.field,'AlwaysVisibleAutoSkill','自动施法：开',-278,348,134,48,'#397357',()=>this.toggleAutoSkill());
        this.soundButton=iconButton(this.topHUD,'SoundButton','声音','sound',313,246,68,72,()=>this.openAudioSettings());
        this.controls=makeNode('FoldableBattleControls',this.bottomHUD);
        this.autoButton = iconButton(this.controls, 'AutoSkillButton', '自动开', 'auto', -210, -483, 114, 64, () => this.toggleAutoSkill());
        this.pause = iconButton(this.controls, 'PauseButton', '暂停', 'pause', -70, -483, 114, 64, () => { this.engine.paused = !this.engine.paused; this.refresh(); });
        this.speedButton = iconButton(this.controls, 'SpeedButton', '×1', 'speed', 70, -483, 114, 64, () => {
            if (this.stageStyle === 'boss') return;
            this.speed = this.speed === 1 ? 2 : this.speed === 2 && this.activeChapter?.speedTonic ? SPEED_TONIC.speed : 1;
            this.refresh();
        });
        iconButton(this.controls, 'RestartButton', '重战', 'restart', 210, -483, 114, 64, () => this.restart());
        this.controls.active = false;
        iconButton(this.bottomHUD, 'HallButton', '随将', 'hero', -260, -567, 150, 68, () => this.openHall());
        iconButton(this.bottomHUD, 'GearShortcut', '行装', 'bag', -87, -567, 150, 68, () => this.openInventory());
        iconButton(this.bottomHUD, 'ChartShortcut', '战图', 'scene', 87, -567, 150, 68, () => this.openChapter('chart'));
        iconButton(this.bottomHUD,'ToggleControls','菜单','menu',260,-567,150,68,()=>{
            this.controlsOpen = !this.controlsOpen;
            this.controls.active = this.controlsOpen;
            this.battleReadout.setPosition(0, this.controlsOpen ? -410 : -496);
        });
        this.topHUD.setSiblingIndex(this.root.children.length-1);this.bottomHUD.setSiblingIndex(this.root.children.length-1);
        this.warning=new BossWarning(this.node);this.applyViewport();
        view.on('canvas-resize',this.applyViewport,this);
        this.root.active = true;this.scheduleOnce(()=>this.applyViewport(),0);
        if (!this.developer && this.session.experienceGiftApplied) this.openExperienceGift(true);
        else this.openChapter();
        // Refresh once after the first frame, after the runtime mask and graphic assemblers have initialized.
        this.scheduleOnce(() => { this.root.active = false; this.root.active = true; }, 0.1);
    }

    private applyViewport():void {
        if(this.layoutBusy||!this.root)return;this.layoutBusy=true;
        try {
            view.setDesignResolutionSize(720,1280,screen.windowSize.height>=screen.windowSize.width?ResolutionPolicy.FIXED_WIDTH:ResolutionPolicy.SHOW_ALL);
            const visible = view.getVisibleSize();
            let top = 0, bottom = 0;
            let capsule: MenuCapsule | undefined;
            try {
                const safe = sys.getSafeAreaRect(false);
                top = Math.max(0, visible.height - safe.y - safe.height);
                bottom = Math.max(0, safe.y);
            } catch (_) {}
            if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
                try {
                    const rect = wx.getMenuButtonBoundingClientRect();
                    const info = wx.getSystemInfoSync?.();
                    const width = wx.getWindowInfo?.().windowWidth || info?.windowWidth || info?.screenWidth;
                    if (width && Number.isFinite(rect.bottom) && rect.bottom > 0) {
                        const ratio = visible.width / width;
                        capsule = { left: rect.left * ratio, top: rect.top * ratio, bottom: rect.bottom * ratio };
                        if (!Number.isFinite(capsule.left) || !Number.isFinite(capsule.top)) top = Math.max(top, capsule.bottom + 8);
                    }
                } catch (_) {}
            }
            const layout = viewportLayout(visible.width, visible.height, { top, bottom }, capsule);
            this.root.setScale(layout.scale, layout.scale, 1);
            this.root.setPosition(0, layout.centerY, 0);
            this.topHUD.setPosition(0, layout.topOffset, 0);
            this.bottomHUD.setPosition(0, layout.bottomOffset, 0);
            this.wallet.node.setPosition(layout.wallet.x, layout.wallet.y, 0);
            this.wallet.node.getComponent(UITransform)!.setContentSize(layout.wallet.width, 33.6);
            this.title.node.setPosition(-55, 558 + layout.headerShift, 0);
            this.modeBadge.node.setPosition(297, 557 + layout.headerShift, 0);
            this.overview.node.setPosition(0, 518 + layout.headerShift, 0);
            this.overviewBar.node.setPosition(0, 495 + layout.headerShift, 0);

            const background = this.fullBackground;
            background.clear();
            background.fillColor = new Color(this.activeChapter ? mainlineTheme(chapterScenery(this.activeChapter)).ground : '#15243A');
            background.rect(-visible.width / 2, -visible.height / 2, visible.width, visible.height);
            background.fill();
            background.fillColor = new Color('#19283D');
            background.rect(-visible.width / 2, layout.headerBottom, visible.width, visible.height / 2 - layout.headerBottom);
            background.fill();

            this.fieldWidth = layout.fieldWidth;
            this.fieldHeight = layout.fieldHeight;
            this.fieldCenter = layout.fieldCenter;
            this.field.setPosition(0, this.fieldCenter, 0);
            this.field.getComponent(UITransform)!.setContentSize(this.fieldWidth, this.fieldHeight);
            const border = this.root.getChildByName('BattlefieldFrame')!;
            border.setPosition(0, this.fieldCenter, 0);
            border.getComponent(UITransform)!.setContentSize(this.fieldWidth, this.fieldHeight);
            const ink = border.getComponent(Graphics)!;
            ink.clear();
            ink.fillColor = new Color('#192C3D');
            ink.rect(-this.fieldWidth / 2, -this.fieldHeight / 2, this.fieldWidth, this.fieldHeight);
            ink.fill();
            this.scenery?.resize(this.fieldWidth, this.fieldHeight);
            this.fx.resize(this.fieldWidth, this.fieldHeight);
            this.warning.resize(visible.width, visible.height);
        } finally {this.layoutBusy=false;}
    }

    update(dt: number): void {
        if (!this.audio) return;
        this.syncMusic();this.audio.update(dt);
        if (!this.activeChapter) return;
        this.warning.update(Math.min(.25,Math.max(0,dt)),!!(this.hall||this.inventory||this.utility||this.modal)||this.engine.bossWarningRemaining<=0);
        const frame = Math.min(0.25, Math.max(0, dt));
        const style = this.stageStyle;
        const pace = style === 'boss' ? 1 : this.speed;
        this.engine.advance(frame * pace);
        this.processEvents();
        if (!this.engine.paused) {
            const march = this.marching || this.autoNext > 0;
            this.scenery?.update(frame * pace, march);
            this.visualStop=Math.max(0,this.visualStop-frame);
            this.actors.forEach(actor => {
                const ally = actor.unit.team === 'hero';
                const runningLane = (this.meleeLanes.has(actor.unit.id) || this.verticalLanes.has(actor.unit.id)) && (ally || this.engine.approachRemaining > 0);
                const walkingRear = ally && style !== 'boss' && (this.engine.approachRemaining > .55 || this.engine.transitioning || this.autoNext > 0);
                const run = march && actor.unit.hp > 0 && (runningLane || walkingRear);
                actor.update(this.visualStop > 0 ? 0 : frame * (ally || run ? pace : 1), run);
            });

            this.sortActors();
            this.fx.update(frame);
            if (this.autoNext > 0 && !this.hall && !this.inventory) {
                this.autoNext -= frame;
                if (this.nextLabel) this.nextLabel.string = `还可连刷${this.chapterRepeats}场 · ${Math.max(1, Math.ceil(this.autoNext))}秒后开战`;
                if (this.autoNext <= 0) {
                    this.repeatChapter(this.activeChapter, this.chapterRepeats);
                    return;
                }
            }
        }
        if (!this.engine.paused && this.finaleImpactTime > 0) {
            this.finaleImpactTime = Math.max(0, this.finaleImpactTime - frame);
            const recoil = this.finaleImpactTime > 0 ? Math.sin(Math.PI * this.finaleImpactTime / FINALE_IMPACT_SECONDS) : 0;
            this.field.setPosition(recoil * 5, this.fieldCenter - recoil * 3, 0);
        }
        this.skillHud?.update(frame);
        this.refresh();
    }

    private get stageStyle() {
        return this.activeChapter?.map === 'duel' ? 'boss' : this.activeChapter?.map === 'assault' ? 'city' : 'rift';
    }

    private begin(chapter: ChapterRun): void {
        if (chapter.speedTonic && !this.activeChapter?.speedTonic) this.speed = SPEED_TONIC.speed;
        else if (!chapter.speedTonic && this.speed > 2) this.speed = 2;
        this.activeChapter = chapter;
        const options = createChapterOptions(chapter);
        this.engine = new BattleEngine(options);
        this.approachDuration = options.approachTime || 0;
        this.marching = false;
        this.meleeLanes.clear();
        this.verticalLanes.clear();
        this.delveRoom = -1;
        this.delveEntrances.clear();
        this.finaleImpactTime = 0;
        this.engine.autoSkill = this.autoSkill;
        this.controlsOpen = false;
        this.controls.active = false;
        this.battleReadout.setPosition(0, -496);
        this.resultShown = false;
        this.autoNext = 0;
        this.nextLabel = null;
        this.warning.clear();
        this.visualStop = 0;
        this.modal?.destroy();
        this.modal = null;
        this.units.destroyAllChildren();
        this.enemyUnits = makeNode('EnemyArmy', this.units);
        const style = this.stageStyle;
        this.enemyUnits.active = style === 'boss';
        this.fortress = null;
        if (style === 'city') {
            const frame = cityFortressPresentation(3.3);
            this.fortress = makeNode('FixedFortress', this.units, frame.x, frame.y);
            this.fortress.addComponent(UIOpacity).opacity = frame.opacity;
        }
        this.fx.clear();
        this.actors.clear();
        this.skillHud?.destroy();
        this.scenery?.destroy();
        this.scenery = new BattleStage(this.field, style, chapterScenery(chapter));
        this.scenery.node.setSiblingIndex(0);
        this.applyViewport();
        this.engine.heroes.forEach((unit, i) => this.createActor(unit, i));
        this.statusLine.string = `${chapterName(chapter)} · ${style === 'boss' ? '迎面讨伐' : '自动行军'}`;
        if (style === 'boss') this.audio.effect('boss-arrive');
        this.syncMusic();
        this.processEvents();
        this.skillHud = new SkillHud(this.field, this.engine, id => {
            const request=this.engine.requestHeroSkill(id);
            if(request.accepted){this.processEvents();this.statusLine.string=request.queued?(request.state==='paused'?'已预约技能 · 点击继续后释放':'已预约技能 · 接战后释放'):'技能已释放';}
            else this.statusLine.string=request.state==='ended'?'本场已结束 · 进入下一战后释放':request.state==='dead'?'该武将已退场':request.state==='energy'?'能量未满 · 受伤、击杀加快聚气':request.state==='finale'?'魔王终结演出中':'该单位没有主动技能';
            this.refresh();
        });
        this.skillHud.update(0); this.refresh();
    }

    private createActor(unit: Unit, index: number): void {
        const hero = unit.team === 'hero';
        let { x, y, scale } = mobPosition(index, !!unit.elite);
        const style = this.stageStyle;
        if (hero) {
            ({ x, y } = chapterAllyPosition(unit.formationSpot!, style === 'rift' ? 'main' : style));
            scale = unit.id === CHAPTER_PROTAGONIST_ID ? 1.2 : unit.kind === 'soldier' ? .9 : unit.heroTier === 5 ? 1.28 : (unit.heroTier ?? 1) >= 3 ? 1.18 : 1.06;
        }
        let parent = hero ? this.units : this.enemyUnits;
        let fromX = hero ? x - 90 : x;
        let fromY: number | undefined;
        const stairs = this.delveRoom === 1;
        const jar = unit.visualId === 'delve-jar';
        if (style === 'boss') {
            const layout = worldBossPresentation(this.fieldHeight, unit.visualId);
            if (hero) scale = unit.kind === 'soldier' ? layout.soldierScale : unit.heroTier === 5 ? layout.divineScale : layout.heroScale;
            else { x = 0; y = layout.y; scale = layout.scale; }
            fromX = x;
        } else if (style === 'city' && !hero) {
            if (unit.kind === 'wall') { x = 300; y = 20; scale = 1; }
            else {
                const enemies = this.engine.enemies.filter(other => other.kind !== 'wall' && !!other.onWall === !!unit.onWall);
                const index = enemies.indexOf(unit);
                ({ x, y } = battlePosition(unit.onWall ? index === 0 ? 'tower-left' : 'tower-right' : `ground-${index}`, 'city', true));
                scale = unit.onWall ? 1 : 1.12;
            }
            if ((unit.kind === 'wall' || unit.onWall) && this.fortress) {
                parent = this.fortress;
                x -= 300; y -= 20;
            }
            fromX = x;
        } else if (stairs) {
            if (hero) {
                const spot = unit.formationSpot!;
                x = (Number(spot[1]) - 1) * 152;
                y = -123 + (Number(spot[3]) - 2) * 83;
            } else {
                x = (index % 3 - 1) * 150;
                y = 128 + Math.floor(index / 3) * 105;
            }
            fromX = x;
            fromY = y + (hero ? -90 : 77);
        } else if (jar) {
            ({ x, y } = DELVE_JAR); fromX = x;
        } else if (!hero && unit.kind === 'boss') {
            x = 185; y = 55; fromX = x; scale = 1.95;
            if (this.delveRoom === 4) {
                const giants = this.engine.enemies.filter(enemy => enemy.kind === 'boss').length;
                y = (index - (giants - 1) / 2) * 208;
                x = fromX = index % 2 ? 197 : 163;
                scale = 1.78;
            }
        } else if (!hero && this.delveRoom === 4) {
            const minion = index - this.engine.enemies.filter(enemy => enemy.kind === 'boss').length;
            x = 62 + (minion % 2) * 37; y = 166 - minion * 109; fromX = x;
        } else if (!hero && unit.bodyguard) {
            x = 104; y = index === 0 ? 196 : -105; fromX = x;
        }
        const ranged = isRangedWeapon(unit.weapon);
        if (ranged) fromX = x;
        const emerging = this.delveRoom === 4 && !hero;
        if (emerging) {
            const giant = unit.kind === 'boss';
            if (!giant && !ranged) x = meleeContactX(false, false, x);
            this.delveEntrances.set(unit.id, { x, y, delay: index * .055, giant });
            fromX = DELVE_JAR.x;
            fromY = DELVE_JAR.y;
        }
        const actor = new UnitActor(parent, unit, x, y, fromX, fromY ?? y, scale, hero ? 1 : -1,
            (style === 'boss' || stairs) && hero, style === 'boss' || stairs || (style === 'city' && !hero));
        if (stairs) {
            this.verticalLanes.set(unit.id, { start: fromY ?? y, contact: y + (ranged ? 0 : hero ? 58 : -47) });
        } else if (style !== 'boss' && !ranged && !emerging && unit.kind !== 'wall' && !unit.onWall) {
            const contact = meleeContactX(style === 'city', hero, x) + (unit.kind === 'boss' ? 24 : 0);
            this.meleeLanes.set(unit.id, { start: fromX, contact });
        }
        if (!hero && style === 'boss') {
            actor.hp.node.active = false;
            actor.node.getChildByName('Name')!.active = false;
        }
        if (!hero && style === 'rift' && unit.kind !== 'boss' && !jar) {
            const name = actor.node.getChildByName('Name')!;
            name.active = !!unit.elite;
            const label = name.getComponent(Label)!;
            label.fontSize = 16;
            label.color = new Color('#FFE1A0');
        }
        this.actors.set(unit.id, actor);
    }

    private sortActors(): void {
        const actors = Array.from(this.actors.values()).sort((a, b) => b.node.position.y - a.node.position.y || a.node.position.x - b.node.position.x);
        const order = new Map<Node, number>([[this.units, this.fortress ? 2 : 1], [this.enemyUnits, 0]]);
        if (this.fortress) this.fortress.setSiblingIndex(0);
        this.enemyUnits.setSiblingIndex(this.fortress ? 1 : 0);
        actors.forEach(actor => {
            if (actor.unit.kind === 'wall') return;
            const parent = actor.node.parent!;
            const index = order.get(parent) ?? 1;
            actor.node.setSiblingIndex(index);
            order.set(parent, index + 1);
        });
    }

    private syncEncounter(): void {
        if (this.engine.paused) return;
        const style = this.stageStyle;
        const remaining = this.engine.approachRemaining;
        const warning = this.engine.bossWarningRemaining;
        const presentation = encounterPresentation(style === 'city' ? 'city' : style === 'boss' ? 'other' : 'main',
            remaining, warning, this.engine.transitioning);
        this.marching = presentation.marching;
        const camera = style === 'city' ? cityFortressPresentation(remaining) : null;
        if (camera && this.fortress) {
            this.fortress.setPosition(camera.x, camera.y, 0);
            this.fortress.setScale(camera.scale, camera.scale, 1);
            this.fortress.getComponent(UIOpacity)!.opacity = camera.opacity;
        }
        const stairs = this.delveRoom === 1;
        const altar = this.delveRoom === 4;
        this.enemyUnits.setPosition(stairs || altar ? 0 : camera?.offset ?? presentation.enemyX, 0, 0);
        this.enemyUnits.active = altar || presentation.enemyVisible;
        if (stairs && warning <= 0) this.verticalLanes.forEach((lane, id) => {
            const actor = this.actors.get(id);
            if (actor && actor.unit.hp > 0) actor.placeOnLane(actor.node.position.x, approachX(lane.start, lane.contact, remaining, this.approachDuration));
        });
        if (warning <= 0) this.meleeLanes.forEach((lane, id) => {
            const actor = this.actors.get(id);
            if (actor && actor.unit.hp > 0) {
                const y = this.delveRoom >= 0 && actor.unit.team === 'hero'
                    ? chapterAllyPosition(actor.unit.formationSpot!, 'main').y : actor.node.position.y;
                actor.placeOnLane(approachX(lane.start, lane.contact, remaining, this.approachDuration), y);
            }
        });
        this.moveThroughDelvePortal();
        if (altar) this.animateDelveEntrances(warning);
    }

    private moveThroughDelvePortal(): void {
        if (!this.scenery || this.delveRoom < 0 || this.delveRoom >= 3 || !this.engine.transitioning) return;
        const stairs = this.delveRoom === 1;
        this.scenery.openDelvePortal();
        this.statusLine.string = '清场完成 · 传送圈开启';
        const portal = this.scenery.delvePortalPosition;
        const progress = Math.max(0, (this.engine.transitionProgress - .12) / .88);
        this.engine.heroes.filter(unit => unit.hp > 0).forEach(unit => {
            const actor = this.actors.get(unit.id)!;
            const seat = chapterAllyPosition(unit.formationSpot!, 'main');
            const fromX = stairs ? (Number(unit.formationSpot![1]) - 1) * 152 : this.meleeLanes.get(unit.id)?.contact ?? seat.x;
            const fromY = stairs ? this.verticalLanes.get(unit.id)!.contact : seat.y;
            const x = fromX + (portal.x - fromX) * progress;
            const y = fromY + (portal.y - fromY) * progress;
            actor.placeOnLane(x, y);
        });
    }

    private animateDelveEntrances(warning: number): void {
        const elapsed = DELVE_REVEAL_SECONDS - warning;
        this.delveEntrances.forEach((landing, id) => {
            const actor = this.actors.get(id)!;
            const t = Math.max(0, Math.min(1, (elapsed - landing.delay) / .72));
            actor.node.active = elapsed >= landing.delay;
            const arc = 4 * t * (1 - t) * (landing.giant ? 126 : 83);
            actor.placeOnLane(DELVE_JAR.x + (landing.x - DELVE_JAR.x) * t, DELVE_JAR.y + (landing.y - DELVE_JAR.y) * t + arc);
            const scale = .48 + .52 * t;
            actor.node.setScale(scale, scale, 1);
            if (t === 1) {
                this.delveEntrances.delete(id);
                this.fx.delveLanding(landing.x, landing.y - (landing.giant ? 70 : 43), landing.giant);
                if (landing.giant && landing.delay === 0) this.audio.effect('impact');
            }
        });
    }

    private showEnemyWave(): void {
        if (this.activeChapter && usesDelveRooms(this.activeChapter) && this.delveRoom !== this.engine.waveIndex) {
            this.delveRoom = this.engine.waveIndex;
            this.actors.forEach(actor => { actor.node.removeFromParent(); actor.node.destroy(); });
            this.actors.clear();
            this.meleeLanes.clear();
            this.verticalLanes.clear();
            this.scenery?.setDelveRoom(this.delveRoom);
            this.engine.heroes.forEach((unit, i) => {
                this.createActor(unit, i);
                if (!unit.hp) this.actors.get(unit.id)!.node.active = false;
            });
            this.engine.enemies.forEach((unit, index) => this.createActor(unit, index));
            this.syncEncounter();
            return;
        }
        this.actors.forEach((actor, id) => {
            if (actor.unit.team === 'enemy') {
                actor.node.destroy();
                this.actors.delete(id);
                this.meleeLanes.delete(id);
            } else {
                const lane = this.meleeLanes.get(id);
                if (lane) lane.start = actor.node.position.x;
            }
        });
        this.engine.enemies.forEach((unit, index) => this.createActor(unit, index));
        this.syncEncounter();
    }

    private processEvents(): void {
        const events = this.engine.drainEvents();
        if (!events.some(event => event.type === 'wave' || event.type === 'boss')) this.syncEncounter();
        events.forEach(event => this.showEvent(event));
    }

    private showEvent(event: BattleEvent): void {
        if (event.type === 'wave') {
            this.showEnemyWave();
            this.statusLine.string = this.delveRoom >= 0 ? DELVE_ROOMS[this.delveRoom]
                : this.stageStyle === 'boss' ? '巨型首领在上方 · 迎面讨伐'
                : this.stageStyle === 'city' ? '向右行军 · 攻破城门' : `遭遇第${event.wave}队敌兵 · 近战迎上，远程留在后排`;
        } else if (event.type === 'boss') {
            this.showEnemyWave();
            if (this.delveRoom !== 4) this.warning.show(1.25);
            this.syncMusic();this.audio.effect('boss-arrive');
            this.statusLine.string = this.delveRoom === 4 ? '封坛碎裂！巨将与随卫跃出' : '首领来袭！预警后继续行军接战';
        }
        else if (event.type === 'attack' && event.source && event.target) {
            const source = this.actors.get(event.source); const target = this.actors.get(event.target);
            if (source && target) { this.fx.attack(source, target); this.audio.hit(source.weapon); }
        } else if ((event.type === 'damage' || event.type === 'heal') && event.target) {
            const actor = this.actors.get(event.target);
            if (actor) { this.fx.number(actor, event.amount || 0, event.type === 'heal', !!event.critical); if (event.type === 'damage') {actor.hurt(!!event.critical);this.fx.impact(actor,!!event.critical);if(event.critical)this.visualStop=.045;} }
        } else if (event.type === 'buff' && event.target) {
            const actor = this.actors.get(event.target); if (actor) this.fx.status(actor, event.buff === 'attack' ? '战意+20%' : `护盾+${formatAmount(event.amount||0)}`, '#ADE0D8');
        } else if(event.type==='debuff'&&event.target){const actor=this.actors.get(event.target);if(actor)this.fx.status(actor,event.buff==='slow'?'冰缓−25%':event.buff==='burn'?'灼烧4秒':'中毒·抑疗','#B6C8F5');
        } else if (event.type === 'shield' && event.target) {
            const actor = this.actors.get(event.target); if (actor) this.fx.status(actor, `盾−${formatAmount(event.amount||0)}`, '#9DDBE4');
        } else if (event.type === 'death' && event.target) this.actors.get(event.target)?.die();
        else if (event.type === 'wall-break') {
            const wall = this.actors.get(event.target || '');
            if (wall) {
                wall.breakWall();
                if (wall.unit.visualId === 'delve-jar') {
                    this.fx.sealBurst(wall.impactPoint.x, wall.impactPoint.y);
                    this.statusLine.string = '封坛已破 · 巨将即将现身';
                    return;
                }
                this.fx.wallBreak(wall.impactPoint.x, wall.impactPoint.y);
            }
            const ground = this.engine.enemies.filter(unit => unit.kind !== 'wall' && !unit.onWall).length;
            let next = ground;
            for (const actor of this.actors.values()) {
                if (!actor.unit.onWall || actor.unit.hp <= 0) continue;
                const slot = battlePosition(`ground-${next++}`, 'city', true);
                actor.node.setParent(this.enemyUnits, true);
                actor.fallTo(slot.x, slot.y);
            }
            this.statusLine.string = '城门已破 · 守将落地';
        }
        else if (event.type === 'skill' && event.source) {
            const source = this.actors.get(event.source);
            if (source?.unit.team==='hero')console.info('[Skill] cast',source.unit.name,this.engine.autoSkill?'auto enabled':'manual',this.engine.skillCount);
            if (source) {
                const name = source.unit.skillName || (source.unit.kind === 'boss' ? '魔王震地' : TACTIC_NAMES[source.unit.tactic || 'cleave']);
                const targets: UnitActor[] = []; const friends: UnitActor[] = [];
                this.actors.forEach(actor => { if (actor.unit.team === source.unit.team) { if (source.unit.tactic !== 'heal' || event.targets?.indexOf(actor.unit.id) !== -1) friends.push(actor); } else if (event.targets?.indexOf(actor.unit.id) !== -1) targets.push(actor); });
                targets.sort((a, b) => (event.targets || []).indexOf(a.unit.id) - (event.targets || []).indexOf(b.unit.id));
                this.audio.effect(source.unit.element||'slash');if(source.unit.tactic!=='heal')this.visualStop=.055;
                this.fx.skill(source, targets, friends, name); this.statusLine.string = `${source.unit.name} · ${name}！`;
            }
        } else if (event.type === 'finale' && event.source) {
            const actor = this.actors.get(event.source);
            if (actor) {
                this.audio.effect('finale');
                this.fx.bossFinale(actor, event.skillName || '魔王终结');
                this.statusLine.string = `${actor.unit.name} · ${event.skillName}！`;
            }
        } else if (event.type === 'finale-impact') {
            this.audio.effect('impact');
            this.finaleImpactTime = FINALE_IMPACT_SECONDS;
            this.fx.finaleImpact();
        } else if (event.type === 'finish' && this.activeChapter && !this.resultShown) {
            this.resultShown = true;
            this.audio.effect(this.engine.status === 'lost' ? 'defeat' : 'victory');
            this.showChapterResult(this.activeChapter);
        }
    }

    onDestroy():void{view.off('canvas-resize',this.applyViewport,this);this.audio?.destroy();}
    private refresh(): void {
        this.soundButton.label.string = this.audio.caption;
        const run = this.activeChapter;
        if (!run) return;
        this.title.string = run.map === 'workshop' || isChapterRift(run.map) || isSideDungeon(run.map) ? chapterName(run) : `${chapterName(run)} · ${DIFFICULTIES[run.difficulty]}`;
        const progress = this.store.progress;
        this.wallet.string = `主公 Lv.${progress.heroLevel}     脑铢 ${formatAmount(progress.coins)}`;
        this.modeBadge.label.string = this.developer ? '测试' : this.session.experienceMode ? '内测' : '单机';
        const bonds = bondProgress(this.engine.heroes.filter(u => u.kind === 'hero').map(u => u.visualId || u.id)).filter(b => b.active);
        this.bondsBadge.label.string = `同阵羁绊 · ${bonds.length}`;
        this.actors.forEach(actor => {
            const unit = actor.unit;
            bar(actor.hp, unit.hp / unit.maxHp, unit.kind === 'boss' ? 175 : unit.team === 'enemy' ? (unit.elite ? 90 : 68) : 64, 8,
                unit.team === 'hero' ? '#7CC69E' : '#E0B76A');
            actor.hpText.node.active = false;
        });
        const phase = this.engine.paused ? '已暂停' : this.engine.bossWarningRemaining > 0 ? '首领预警'
            : this.engine.approachRemaining > 0 ? '正在接敌' : this.engine.status === 'fighting' ? '交战中' : '战斗结束';
        const goal = this.engine.riftGoal;
        const guard = this.engine.enemies.find(u => u.guarded)?.guarded;
        const escorts = this.engine.enemies.filter(u => u.bodyguard && u.hp > 0).length;
        if (run.map === 'duel') {
            const boss = worldBoss(run.bossId!);
            this.title.string = `${boss.name} · ${boss.title}`;
            this.overview.string = this.engine.finisherActive ? boss.finale
                : `${Math.floor(this.engine.elapsed)}/30秒 · 伤害 ${formatAmount(this.engine.damageDealt)} · 最高 ${formatAmount(progress.chapter.duelBest[boss.id] || 0)}`;
            bar(this.overviewBar, this.engine.elapsed / 30, 690, 10, '#C899D9');
        } else if (run.map === 'assault') {
            const wall = this.engine.enemies.find(unit => unit.kind === 'wall')!;
            this.overview.string = this.engine.wallAlive ? `城门 ${formatAmount(wall.hp)}/${formatAmount(wall.maxHp)} · 城上减伤60%` : '城门已破 · 守军失去保护';
            bar(this.overviewBar, wall.hp / wall.maxHp, 690, 10, '#D8BC75');
        } else if (this.delveRoom >= 0) {
            this.overview.string = `${this.delveRoom + 1}/${DELVE_ROOMS.length} · ${DELVE_ROOMS[this.delveRoom]}`;
            bar(this.overviewBar, (this.delveRoom + 1) / DELVE_ROOMS.length, 690, 10, '#EC936B');
        } else if (run.map === 'workshop') {
            const work = WORKSHOPS[workshopIndex(run.window!)];
            const timeLeft = Math.max(0, work.time - this.engine.elapsed);
            const wave = this.engine.waveCount > 1 ? ` · ${this.engine.waveIndex + 1}/${this.engine.waveCount}批` : '';
            const objective = guard === 'break' && !escorts ? '护阵已破 · 督军额外受伤25%' : work.goal;
            this.overview.string = `${objective}${wave} · 剩余${Math.ceil(timeLeft)}秒`;
            bar(this.overviewBar, timeLeft / work.time, 690, 10, '#D8BC75');
        } else {
            if (!this.engine.bossActive) {
                const wave = isChapterRift(run.map) ? '' : `第${this.engine.waveIndex + 1}波 · `;
                this.overview.string = `${wave}破阵进度 ${this.engine.riftEnergy}/${goal} · 满进度见首领`;
            }
            else if (escorts) this.overview.string = `首领受护 · 精卫剩${escorts}名 · 减伤65%`;
            else if (guard === 'break') this.overview.string = '护阵已破 · 首领受到伤害 +25%';
            else this.overview.string = guard ? '护阵已破 · 首领减伤解除' : '首领现身 · 击败即可通关';
            bar(this.overviewBar, this.engine.riftEnergy / goal, 690, 10, '#D8BC75');
        }
        this.autoButton.label.string = this.autoSkill ? '自动开' : '自动关';
        this.autoShortcut.label.string = this.autoSkill ? '自动施法：开' : '自动施法：关';
        this.combatState.string = `${phase} · ${this.autoSkill ? '自动开' : '手动'} · 我方技 ${this.engine.skillCount} / 敌攻 ${this.engine.enemyAttackCount}`;
        this.pause.label.string = this.engine.paused ? '继续' : '暂停';
        this.speedButton.label.string = run.map === 'duel' ? '固定 ×1' : `×${this.speed}`;
    }

    private restart(): void {
        const run = this.activeChapter;
        if (!run) return;
        const pending = this.store.progress.chapter.pending;
        if (pending?.id === run.id) {
            this.chapterRepeats = 0;
            this.begin(pending);
        } else this.repeatChapter(run, 1);
    }

    private openChapter(section?: CampaignSection, focus?: { chapter: number; map?: ChapterRun['map'] }): void {
        if (this.hall || this.inventory || this.utility) return;
        const inBattle = !!this.activeChapter;
        const wasPaused = inBattle ? this.engine.paused : false;
        if (inBattle) this.engine.paused = true;
        const close = () => {
            this.utility = null;
            if (inBattle) this.engine.paused = wasPaused;
        };
        const back = () => this.openChapter(section, focus);
        this.utility = new ChapterPanel(this.root, this.store, (run, count) => {
            close();
            this.chapterRepeats = count - 1;
            this.begin(run);
        }, {
            current: this.activeChapter || undefined, section, ...focus, version: this.caption,
            close: inBattle ? () => {
                close();
                if (this.engine.status === 'fighting' && this.store.progress.chapter.pending?.id !== this.activeChapter?.id) {
                    this.activeChapter = null;
                    this.openChapter();
                }
            } : undefined,
            gear: () => { close(); this.openInventory(back); },
            heroes: () => { close(); this.openHall(back); },
            sound: () => { close(); this.openAudioSettings(back); },
            profile: this.localAllowed ? () => { close(); this.openDeveloper(back); } : undefined,
        }).node;
    }

    private repeatChapter(run: ChapterRun, count: number): void {
        if (run.map === 'workshop' && this.store.currentWorkshop.window !== run.window) {
            this.stopChapterRepeat('军器换班已更新 · 回战图查看');
            return;
        }
        try {
            const next = this.store.startChapter(run.map, run.difficulty, !!run.extraRolls);
            this.chapterRepeats = Math.max(0, count - 1);
            this.begin(next);
        } catch (error) {
            this.stopChapterRepeat(error instanceof Error ? error.message : '无法再战');
        }
    }

    private showChapterResult(run: ChapterRun): void {
        const scored = this.engine.status === 'scored';
        const won = scored || this.engine.status === 'won';
        const score = Math.floor(this.engine.damageDealt);
        const reward = this.store.settleChapter(run.id, won, scored ? score : 0, this.engine.enemyExperience);
        this.modal?.destroy();
        this.modal = panel(this.root, 'ChapterResult', 0, 45, 622, 500, '#15253A', 22);
        text(this.modal, 'ChapterResultTitle', scored ? '魔 王 战 报' : won ? '战 图 告 捷' : '收 兵 整 队', 0, 172, 37, won ? '#F1CD89' : '#E6AB97', 580);
        const report = scored ? `本场伤害 ${formatAmount(score)}` : chapterName(run);
        text(this.modal, 'ChapterResultMap', `${report}${run.extraRolls ? ' · 五倍结算' : ''} · ${this.engine.elapsed.toFixed(1)}秒 · 敌军出手 ${this.engine.enemyAttackCount}次`, 0, 121, 22, '#B3C8D8', 580);
        const result = this.modal;
        const previews = reward.previews ?? [];
        const previewRows = new Set(previews.map(entry => entry.index));
        const all = reward.lines.map((_, index) => index);
        const front = all.filter(index => !previewRows.has(index)).slice(0, Math.max(0, 4 - previews.length))
            .concat(previews.slice(0, 4).map(entry => entry.index));
        const order = [...front, ...all.filter(index => front.indexOf(index) < 0)];
        const pages = Math.ceil(order.length / 4);
        let rewardPage = 0;
        let rows: Node | undefined;
        const renderRewards = () => {
            rows?.removeFromParent();
            rows?.destroy();
            const container = rows = makeNode('ChapterRewardRows', result);
            order.slice(rewardPage * 4, rewardPage * 4 + 4).forEach((index, row) => {
                const line = reward.lines[index];
                const preview = previews.find(entry => entry.index === index);
                const y = 88 - row * 30;
                if (preview) chapterRewardLink(container, `ChapterReward-${index}`, preview.detail, 0, y, 19, () => {
                    const wasPaused = this.engine.paused;
                    this.engine.paused = true;
                    showChapterReward(this.root, this.store, preview.detail, `${chapterName(run)} · 本场战利品`, () => {
                        this.engine.paused = wasPaused;
                    });
                }, line);
                else text(container, `ChapterReward-${index}`, line, 0, y, 21, '#F1D9A2', 570);
            });
        };
        if (pages > 1) {
            const turnPage = (delta: number) => {
                if (this.autoNext > 0) this.stopChapterRepeat('已暂停连刷 · 查看战利品');
                rewardPage = (rewardPage + delta + pages) % pages;
                renderRewards();
            };
            button(result, 'PreviousRewardPage', '‹', -251, 171, 55, 43, '#344E65', () => turnPage(-1));
            button(result, 'NextRewardPage', '›', 251, 171, 55, 43, '#344E65', () => turnPage(1));
        }
        renderRewards();
        const waiting = !!this.store.progress.chapter.reserve;
        const ending = reward.storyChapter;
        if (ending !== undefined) this.chapterRepeats = 0;
        const next = won && reward.saved ? nextCampaignMap(run.map) : undefined;
        const repeat = won && reward.saved && !waiting && this.chapterRepeats > 0;
        this.nextLabel = text(this.modal, 'ChapterContinue', waiting ? '装备已寄存 · 腾出背包后回战图领取'
            : !reward.saved ? '结算未保存，请重试' : won ? '奖励已结算' : '调整阵容或行装后再战', 0, -30, 19, '#AFC7D6', 580);
        if (reward.experience && reward.experience.combat + reward.experience.clear > 0) {
            const { combat, clear } = reward.experience;
            text(result, 'ExperienceAward', `经验 +${formatAmount(combat + clear)} · 击杀 ${formatAmount(combat)} / 通关 ${formatAmount(clear)}`, 0, -57, 18, '#C6DEAF', 570);
        }
        this.autoNext = repeat ? 3 : 0;
        button(this.modal, 'ChapterAgain', !reward.saved ? '重试结算' : repeat ? '停止连刷' : run.extraRolls ? '再战 · 五倍结算' : '再战一场', next ? -135 : 0, -112, next ? 255 : 520, 58, '#4C6A56', () => {
            if (!reward.saved) { this.showChapterResult(run); return; }
            if (this.autoNext > 0) {
                this.stopChapterRepeat('连刷已停止');
            } else this.repeatChapter(run, 1);
        });
        if (next) button(this.modal, 'ChapterNext', '下一关', 135, -112, 255, 58, '#6B573E', () => {
            if (this.autoNext > 0) this.stopChapterRepeat('连刷已停止');
            this.openChapter('chart', { chapter: next.chapter, map: next.id });
        });
        button(this.modal, 'OpenChapterMap', '返回营地', -135, -188, 255, 52, '#344E65', () => {
            if (this.autoNext > 0) this.stopChapterRepeat('连刷已停止');
            this.openChapter();
        });
        button(this.modal, 'GearFromChapter', '去整装', 135, -188, 255, 52, '#344E65', () => {
            if (this.autoNext > 0) this.stopChapterRepeat('连刷已停止');
            this.openInventory();
        });
        if (ending !== undefined) {
            const wasPaused = this.engine.paused;
            this.engine.paused = true;
            showCampaignEnding(this.root, this.store, ending, nextIndex => {
                this.engine.paused = wasPaused;
                if (nextIndex === null) this.openChapter();
                else this.openChapter('chart', { chapter: nextIndex });
            }, () => { this.engine.paused = wasPaused; }, '查看本场战报');
        }
    }

    private stopChapterRepeat(note: string): void {
        this.autoNext = 0;
        this.chapterRepeats = 0;
        const again = this.modal?.getChildByName('ChapterAgain')?.getChildByName('ChapterAgain-label')?.getComponent(Label);
        if (again) again.string = '再战一场';
        if (this.nextLabel) this.nextLabel.string = note;
    }

    private openAudioSettings(back?: () => void): void {
        if (this.utility || this.hall || this.inventory) return;
        const wasPaused = this.engine?.paused;
        if (this.engine) this.engine.paused = true;
        const overlay = this.utility = panel(this.root, 'AudioSettings', 0, 0, 720, 1280, '#101A2DBD', 0);
        overlay.on(Node.EventType.TOUCH_END, () => {});
        const card = panel(overlay, 'AudioSettingsCard', 0, 0, 570, 380, '#17283D', 22);
        text(card, 'AudioSettingsTitle', '声 音 设 置', 0, 137, 35, '#F0CF8C');
        const director = this.audio.director;
        const music = button(card, 'ToggleMusic', '', 0, 67, 470, 52, '#345F57', () => {
            this.audio.toggleMusic();
            updateLabels();
        });
        const master = button(card, 'ToggleGameSound', '', 0, 5, 470, 52, '#354D63', () => {
            this.audio.toggle();
            updateLabels();
        });
        const updateLabels = () => {
            music.label.string = `背景音乐 ${director.musicEnabled ? '开' : '关'}`;
            master.label.string = `游戏声音 ${director.enabled ? '开' : '关'}`;
            this.refresh();
        };
        button(card, 'RetryAudio', '重试加载音频', 0, -58, 470, 48, '#354D63', () => this.audio.retry());
        button(card, 'CloseAudio', back ? '返回战图' : '返回战场', 0, -129, 470, 54, '#345F57', () => {
            overlay.destroy();
            this.utility = null;
            if (this.engine && wasPaused !== undefined) this.engine.paused = wasPaused;
            back?.();
        });
        updateLabels();
    }

    private openBonds():void {
        if(this.utility||this.hall||this.inventory)return;const was=this.engine.paused;this.engine.paused=true;
        const popup=this.utility=panel(this.root,'BattleBonds',0,0,720,1280,'#101C2CFC',0);popup.on(Node.EventType.TOUCH_END,()=>{});
        text(popup,'BondsTitle','同 阵 · 羁 绊',0,550,38,'#E4CA92');text(popup,'BondsRule','仅实际上阵触发 · 入场生效，阵亡不移除',0,488,21,'#A7C2D2');
        const ids=this.engine.heroes.filter(u=>u.kind==='hero').map(u=>u.visualId||u.id);
        bondProgress(ids).forEach((p,i)=>{const row=panel(popup,`Bond-${p.bond.id}`,0,385-i*112,640,96,p.active?'#365344':'#24384F');text(row,'BondName',`${p.active?'已激活':'未激活'} · ${p.bond.name} ${p.count}/${p.bond.need}`,0,21,24,p.active?'#B7E9B5':'#D0C2A7',620);text(row,'BondEffect',p.bond.desc,0,-20,18,'#ABC3D3',620);});
        button(popup,'CloseBonds','返回战场',0,-554,620,66,'#3C5669',()=>{popup.destroy();this.utility=null;this.engine.paused=was;});
    }
    private persistMode(mode:'normal'|'test'):void{this.session.remember(mode);}
    private openExperienceGift(first = false): void {
        if (this.utility || this.hall || this.inventory) return;
        const was = this.engine?.paused;
        if (this.engine) this.engine.paused = true;
        this.utility = showPlayGuide(this.root, this.store.experienceMultiplier, () => {
            this.utility = null;
            if (this.engine && was !== undefined) this.engine.paused = was;
            if (first) this.openChapter();
        }, first);
    }

    private openDeveloper(back?: () => void): void {
        if (!this.localAllowed || this.utility || this.hall || this.inventory) return;
        const was = this.engine?.paused;
        if (this.engine) this.engine.paused = true;
        const popup = this.utility = panel(this.root, 'DeveloperPanel', 0, 0, 720, 1280, '#101A2DFD', 0);
        popup.on(Node.EventType.TOUCH_END, () => {});
        let level = this.store.progress.heroLevel;
        let stars = this.developer ? this.store.progress.stars.guanyu || 6 : 6;
        text(popup, 'DeveloperTitle', '本 地 · 测 试 台', 0, 548, 38, '#F0CF8C');
        text(popup, 'DeveloperRule', '独立测试存档 · 全武将开放', 0, 481, 21, '#AFCBD7');
        const summary = text(popup, 'TestSummary', '', 0, 408, 26, '#D8E9BA');
        const refresh = () => { summary.string = `主公 Lv.${level} · 随将 ${stars}星`; };
        refresh();
        text(popup, 'LevelLabel', '主公等级', 0, 338, 24);
        [1, 30, 100, MAX_LEVEL].forEach((n, i) => button(popup, `TestLevel-${n}`, `Lv.${n}`, (i - 1.5) * 157, 281, 145, 56, '#344D63', () => { level = n; refresh(); }));
        text(popup, 'StarLabel', '全部武将星级', 0, 211, 24);
        [1, 3, 6].forEach((n, i) => button(popup, `TestStars-${n}`, `${n}星`, (i - 1) * 205, 155, 190, 56, '#344D63', () => { stars = n; refresh(); }));
        const dismiss = () => {
            popup.destroy();
            this.utility = null;
            if (this.engine && was !== undefined) this.engine.paused = was;
        };
        const switchProfile = (store: ProgressStore) => {
            dismiss();
            this.store = store;
            this.developer = store.developerMode;
            this.persistMode(this.developer ? 'test' : 'normal');
            this.loadPreferences();
            this.activeChapter = null;
            this.modal?.destroy();
            this.modal = null;
            this.openChapter();
        };
        button(popup, 'ApplyDeveloper', '应用测试参数', 0, 40, 620, 64, '#8A6B3F',
            () => switchProfile(this.session.configure({ level, stars, stage: 1 })));
        button(popup, 'ResetDeveloper', '重置测试档 · 全满级满星', 0, -67, 620, 64, '#604557', () => switchProfile(this.session.test(true)));
        button(popup, 'UseNormalSave', this.session.experienceMode ? '切换内测存档' : '切换常规存档', 0, -174, 620, 64, '#354D63',
            () => switchProfile(this.session.normal()));
        if (this.activeChapter) button(popup, 'ChargeDeveloper', '充满我方技能', 0, -281, 620, 64, '#456B5C', () => {
            dismiss();
            this.engine.heroes.forEach(u => { if (u.kind !== 'soldier') u.energy = 100; });
            back?.();
        });
        button(popup, 'CloseDeveloper', '返回', 0, -554, 620, 64, '#3B5669', () => { dismiss(); back?.(); });
    }
    private toggleAutoSkill():void{this.autoSkill=!this.autoSkill;this.preferences.autoSkill=this.autoSkill;this.engine.autoSkill=this.autoSkill;console.info('[Skill] auto',this.autoSkill?'on':'off');this.statusLine.string=this.autoSkill?'自动施法已开启 · 满能接战后依次释放':'手动施法 · 点左侧满能头像释放';this.refresh();}
    private loadPreferences():void{this.preferences=new BattlePreferences(sys.localStorage,this.developer?'test':this.session.experienceMode?'experience':'standard');this.autoSkill=this.preferences.autoSkill;console.info('[Skill] preference',this.developer?'test':this.session.experienceMode?'experience':'standard',this.autoSkill?'on':'off');}
    private syncMusic(): void {
        const menu = !this.activeChapter || !!(this.hall || this.inventory || this.utility);
        const style = this.stageStyle;
        this.audio.scene(battleMusic(style === 'rift' ? undefined : style, !!this.activeChapter && this.engine.bossActive, menu, this.activeChapter?.bossId));
    }

    private openHall(back?: () => void): void {
        if (this.hall || this.inventory || this.utility) return;
        const was = this.engine?.paused;
        if (this.engine) this.engine.paused = true;
        this.hall = new MetaPanel(this.root, this.store, () => {
            this.hall = null;
            if (this.engine && was !== undefined) this.engine.paused = was;
            back?.();
        });
    }

    private openInventory(back?: () => void): void {
        if (this.inventory || this.hall || this.utility) return;
        const was = this.engine?.paused;
        if (this.engine) this.engine.paused = true;
        this.inventory = new InventoryPanel(this.root, this.store, () => {
            this.inventory = null;
            if (this.engine && was !== undefined) this.engine.paused = was;
            back?.();
        });
    }
}
