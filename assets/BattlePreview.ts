import { PREVIEW } from 'cc/env';
import { buildCaption } from './data/BuildInfo';
import { BattlePreferences } from './data/BattlePreferences';
import { battleMusic } from './data/MusicRouting';
import { mobPosition } from './data/EnemyCatalog';
import { worldBossPresentation } from './data/BossPresentation';
import { mainlineTheme } from './data/MainlineThemes';
import { BossWarning } from './battle/BossWarning';
import { viewportLayout } from './data/ViewportLayout';
import type { MenuCapsule } from './data/ViewportLayout';
import { cityFortressPresentation,encounterPresentation } from './data/EncounterPresentation';
import { EXPERIENCE_GIFT } from './battle/ExperienceMode';
import { GameAudio } from './battle/GameAudio';
import { WORLD_BOSSES,worldBoss,bossRotation } from './data/WorldBossConfig';
import type { WorldBossId } from './data/WorldBossConfig';
import { captureEnergy } from './data/EnergyConfig';
import { FormationPanel } from './battle/FormationPanel';
import { LocalSession } from './battle/LocalSession';
import { bondProgress } from './data/BondConfig';
import { formatAmount } from './data/GrowthConfig';
declare const wx: { getSystemInfoSync?:()=>{brand?:string;platform?:string;windowWidth?:number;screenWidth?:number};getWindowInfo?:()=>{windowWidth:number};getMenuButtonBoundingClientRect?:()=>MenuCapsule };
import { MAX_STAGE, MAX_LEVEL } from './data/GrowthConfig';
import { _decorator, Color, Component, Graphics, Label, Mask, Node, ResolutionPolicy, screen, sys, UIOpacity, UITransform, view } from 'cc';
import { BattleEngine } from './battle/BattleEngine';
import type { BattleEvent, Unit } from './battle/BattleEngine';
import { ProgressStore, RARITY_NAMES } from './battle/ProgressStore';
import { InventoryPanel } from './battle/InventoryPanel';
import { SkillHud } from './battle/SkillHud';
import { battlePosition } from './data/FormationConfig';
import { MetaPanel } from './battle/MetaPanel';
import { UnitActor } from './battle/UnitActor';
import { CombatEffects } from './battle/CombatEffects';
import { BattleStage } from './battle/BattleStage';
import type { StageStyle } from './battle/BattleStage';
import { bar, button, iconButton, makeNode, panel, text } from './battle/BattleUI';
import type { UIButton } from './battle/BattleUI';
import { createMainlineOptions } from './data/BattleConfig';
import { getHero, TACTIC_NAMES } from './data/HeroCatalog';
import { ACTIVITY_NAMES, createActivityOptions, trialTrait } from './data/ActivityConfig';
import type { ActivityRun } from './data/ActivityConfig';
const { ccclass } = _decorator;

/** Scene orchestration only: rules, actors, scenery and effects are separate modules. */
@ccclass('BattlePreview')
export class BattlePreview extends Component {
    private root!: Node;
    private audio!:GameAudio;private soundButton!:UIButton;
    private session!:LocalSession;
    private developer=false;
    private localAllowed=false;
    private utility:Node|null=null;
    private controls!:Node;
    private controlsOpen=false;
    private signatureShortcut!:UIButton;private mainlineShortcut!:UIButton;
    private modeBadge!:UIButton;
    private bondsBadge!:UIButton;
    private field!: Node;
    private units!: Node;
    private enemyUnits!: Node;private enemyOpacity!:UIOpacity;
    private skillHud: SkillHud | null = null;
    private topHUD!:Node; private bottomHUD!:Node; private fullBackground!:Graphics;
    private warning!:BossWarning; private layoutBusy=false; private fieldWidth=720; private fieldHeight=1104;private fieldCenter=-88; private visualStop=0;
    private effectsRoot!: Node;
    private engine!: BattleEngine;
    private store!: ProgressStore;
    private actors = new Map<string, UnitActor>();
    private scenery: BattleStage | null = null;
    private fx!: CombatEffects;
    private stage = 1;
    private speed = 1;
    private autoShortcut!:ReturnType<typeof button>;private autoSkill = true;private preferences!:BattlePreferences;private combatState!:Label;private battleReadout!:Node;
    private battleId = '';
    private sequence = 0;
    private resultShown = false;
    private modal: Node | null = null;
    private title!: Label;
    private wallet!: Label;
    private overview!: Label;
    private overviewBar!: Graphics;
    private wave!: Label;
    private teamLabel!: Label;
    private enemyLabel!: Label;
    private statusLine!: Label;
    private energyBar!: Graphics;
    private pause!: UIButton;
    private speedButton!: UIButton;
    private autoButton!: UIButton;
    private trainButton!: UIButton;
    private inventoryButton!: UIButton;
    private activeLevel = 1;
    private inventory: InventoryPanel | null = null;
    private hall: MetaPanel | null = null;
    private activeRun: ActivityRun | null = null;
    private autoNext = 0;
    private screenShake=0;
    private nextLabel: Label | null = null;
    private fortress:Node|null=null;private mainlineDistance=0;private bossScore!:Label;

    start(): void {
        view.setDesignResolutionSize(720, 1280, screen.windowSize.height>=screen.windowSize.width?ResolutionPolicy.FIXED_WIDTH:ResolutionPolicy.SHOW_ALL);
        let simulator=false;try{if(typeof wx!=='undefined'){const info=wx.getSystemInfoSync?.();simulator=info?.brand==='devtools'||info?.platform==='devtools';}}catch(_){}
        const host=typeof window!=='undefined'&&window.location?window.location.hostname:'';
        try { this.session=new LocalSession(sys.localStorage,host,simulator); }
        catch (_) {
            const blocked=makeNode('ServiceUnavailable',this.node);
            text(blocked,'ServiceMessage','云端版本尚未接入\n请使用本地构建继续试玩',0,0,30,'#EADBBF',650);
            return;
        }
        this.localAllowed=this.session.testAllowed;
        this.store=this.session.initial();this.developer=this.store.developerMode;this.loadPreferences();
        this.stage = Math.min(MAX_STAGE, this.store.progress.highestCleared + 1);
        if(typeof document!=='undefined')document.title=`呆脑三国 · ${buildCaption(PREVIEW,typeof wx!=='undefined')}`;
        console.info('[Build]',buildCaption(PREVIEW,typeof wx!=='undefined'));
        this.audio = new GameAudio(this.localAllowed || this.session.experienceMode);
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
        this.teamLabel = text(this.field, 'TeamLabel', '呆 萌 战 队', -176, 285, 18, '#A8CBB2', 270);
        this.enemyLabel = text(this.field, 'EnemyLabel', '敌 方 阵 地', 176, 285, 18, '#D5B77E', 270);
        this.wave = text(this.field, 'Wave', '', 0, -292, 18, '#C5D0D1', 620);
        this.units = makeNode('Units', this.field);
        this.effectsRoot = makeNode('CombatEffects', this.field);
        this.fx = new CombatEffects(this.effectsRoot);
        this.bossScore=text(this.field,'BossDamageScore','',0,500,23,'#FFE1A7',660);this.bossScore.node.active=false;
        const versionPlate = panel(this.bottomHUD, 'VersionPlate', 0, -622, 270, 27, '#142238DE', 8);
        text(versionPlate, 'BuildVersion', buildCaption(PREVIEW, typeof wx !== 'undefined'), 0, 0, 15, '#E0E7EF', 255);
        this.battleReadout = panel(this.bottomHUD, 'BattleReadout', 0, -496, 548, 54, '#142238E8', 12);
        this.statusLine = text(this.battleReadout, 'BattleLog', '', 0, 12, 17, '#F4EAD6', 520);
        this.combatState = text(this.battleReadout, 'CombatState', '', 0, -13, 16, '#F0D18B', 520);
        this.bondsBadge=button(this.field,'BondsBadge','羁绊',-231,437,202,36,'#2D4754',()=>this.openBonds());
        iconButton(this.topHUD,'SceneShortcut','副本','scene',313,338,68,72,()=>this.openHall('activities'));
        this.mainlineShortcut=iconButton(this.topHUD,'MainlineShortcut','推图','restart',-313,338,68,72,()=>this.returnToMainline());
        this.signatureShortcut=iconButton(this.topHUD,'SignatureShortcut','专武','bag',313,154,68,72,()=>this.openInventory(true));
        this.autoShortcut=button(this.field,'AlwaysVisibleAutoSkill','自动施法：开',-278,348,134,48,'#397357',()=>this.toggleAutoSkill());
        this.soundButton=iconButton(this.topHUD,'SoundButton','声音','sound',313,246,68,72,()=>this.openAudioSettings());
        this.controls=makeNode('FoldableBattleControls',this.bottomHUD);
        this.inventoryButton=iconButton(this.controls,'InventoryButton','行装','bag',-282,-483,80,64,()=>this.openInventory());
        iconButton(this.controls,'GrowthButton','成长','growth',-188,-483,80,64,()=>this.openHall('idle'));
        iconButton(this.controls,'FormationShortcut','布阵','hero',-94,-483,80,64,()=>{const was=this.engine.paused;this.engine.paused=true;new FormationPanel(this.root,this.store,()=>{this.engine.paused=was;});});
        this.autoButton=iconButton(this.controls,'AutoSkillButton','自动开','auto',0,-483,80,64,()=>this.toggleAutoSkill());
        this.pause=iconButton(this.controls,'PauseButton','暂停','pause',94,-483,80,64,()=>{this.engine.paused=!this.engine.paused;this.refresh();});
        this.speedButton=iconButton(this.controls,'SpeedButton','×1','speed',188,-483,80,64,()=>{if(this.activeRun?.mode!=='boss')this.speed=this.speed===1?2:this.speed===2?4:1;this.refresh();});
        iconButton(this.controls,'RestartButton','重战','restart',282,-483,80,64,()=>this.restart());this.controls.active=false;
        iconButton(this.bottomHUD,'HallButton','群英','hero',-260,-567,150,68,()=>this.openHall('heroes'));
        iconButton(this.bottomHUD,'DrawShortcut','招募','skill',-87,-567,150,68,()=>this.openHall('draw'));
        iconButton(this.bottomHUD,'ExchangeShortcut','名将坊','growth',87,-567,150,68,()=>this.openHall('exchange'));
        iconButton(this.bottomHUD,'ToggleControls','菜单','menu',260,-567,150,68,()=>{
            this.controlsOpen = !this.controlsOpen;
            this.controls.active = this.controlsOpen;
            this.battleReadout.setPosition(0, this.controlsOpen ? -410 : -496);
        });
        this.topHUD.setSiblingIndex(this.root.children.length-1);this.bottomHUD.setSiblingIndex(this.root.children.length-1);
        this.warning=new BossWarning(this.node);this.applyViewport();
        view.on('canvas-resize',this.applyViewport,this);
        this.begin(this.stage);
        this.root.active = true;this.scheduleOnce(()=>this.applyViewport(),0);
        if(!this.developer&&this.session.experienceGiftApplied)this.openExperienceGift(true);
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
            background.fillColor = new Color(this.activeRun ? '#15243A' : mainlineTheme(this.stage).ground);
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
            this.bossScore.node.setPosition(0, this.fieldHeight / 2 - 35, 0);
            this.warning.resize(visible.width, visible.height);
        } finally {this.layoutBusy=false;}
    }

    update(dt: number): void {
        if (!this.engine) return;
        this.syncMusic();this.audio.update(dt);
        this.warning.update(Math.min(.25,Math.max(0,dt)),!!(this.hall||this.inventory||this.utility||this.modal)||this.engine.bossWarningRemaining<=0);
        const frame = Math.min(0.25, Math.max(0, dt));
        const pace = this.activeRun?.mode === 'boss' ? 1 : this.speed;
        this.engine.advance(frame * pace);
        this.processEvents();
        if (!this.engine.paused) {
            const presentation=encounterPresentation(!this.activeRun?'main':this.activeRun.mode==='city'?'city':'other',this.engine.approachRemaining,this.engine.bossWarningRemaining,this.engine.transitioning);
            const march=presentation.marching||this.autoNext>0;
            const camera=this.activeRun?.mode==='city'?cityFortressPresentation(this.engine.approachRemaining):null;
            this.enemyUnits.setPosition(camera?.offset??presentation.enemyX,0,0);this.enemyUnits.active=presentation.enemyVisible;this.enemyOpacity.opacity=255;
            this.scenery?.update(frame * pace, march);
            if(!this.activeRun&&this.scenery)this.mainlineDistance=this.scenery.travelled;
            if(this.fortress){const f=cityFortressPresentation(this.engine.approachRemaining);this.fortress.setPosition(f.x,f.y,0);this.fortress.setScale(f.scale,f.scale,1);this.fortress.getComponent(UIOpacity)!.opacity=f.opacity;}
            this.visualStop=Math.max(0,this.visualStop-frame);
            this.actors.forEach(actor => actor.update(this.visualStop>0?0:frame * pace, march && actor.unit.team === 'hero' && actor.unit.hp > 0));

            this.sortActors();
            this.fx.update(frame);
            if (this.autoNext > 0 && !this.hall && !this.inventory) {
                this.autoNext -= frame;
                if (this.nextLabel) this.nextLabel.string = `继续向右 · ${Math.max(1, Math.ceil(this.autoNext))}秒后进入下一关`;
                if (this.autoNext <= 0) { this.begin(Math.min(MAX_STAGE, this.stage + 1)); return; }
            }
        }
        if(!this.engine.paused){this.screenShake=Math.max(0,this.screenShake-frame);this.field.setPosition(this.screenShake>0?Math.sin(this.engine.elapsed*50+this.screenShake*70)*8:0,this.fieldCenter+(this.screenShake>0?Math.cos(this.screenShake*65)*5:0),0);}
        this.skillHud?.update(frame);
        this.refresh();
    }

    private begin(stage: number, run: ActivityRun | null = null): void {
        this.activeRun = run; this.stage = stage; this.sequence += 1;
        this.battleId = `${Date.now()}-${this.sequence}`;
        const p = this.store.progress;
        this.activeLevel = run ? run.level : p.heroLevel;
        this.engine = new BattleEngine(run ? createActivityOptions(run)
            : createMainlineOptions(stage, 20261030, this.activeLevel, this.store.getEquipmentBonuses(), p.formation, p.troopType, p.formations.main));
        this.engine.autoSkill = this.autoSkill;
        if(!run){const carried=this.store.mainlineEnergyFor(stage);this.engine.heroes.forEach(u=>{const value=carried[u.visualId||u.id];if(value!==undefined&&u.kind!=='soldier')u.energy=value;});}
        if(run?.mode==='trial'){const carried=this.store.trialEnergyFor(run.stage);this.engine.heroes.forEach(u=>{const value=carried[u.visualId||u.id];if(value!==undefined&&u.kind!=='soldier')u.energy=value;});}
        if(this.developer&&this.sequence===1&&Object.keys(this.store.mainlineEnergyFor(stage)).length===0)this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});
        this.controlsOpen=false;this.controls.active=false;this.battleReadout.setPosition(0,-496);
        this.resultShown = false; this.autoNext = 0; this.nextLabel = null;this.warning.clear();this.visualStop=0;
        if (this.modal) { this.modal.destroy(); this.modal = null; }
        this.units.destroyAllChildren();this.fortress=null; this.enemyUnits = makeNode('EnemyArmy', this.units);this.enemyOpacity=this.enemyUnits.addComponent(UIOpacity);
        if(run?.mode==='city'){this.fortress=makeNode('FixedFortress',this.units,300,20);this.fortress.addComponent(UIOpacity);const f=cityFortressPresentation(3.3);this.fortress.setScale(f.scale,f.scale,1);this.fortress.getComponent(UIOpacity)!.opacity=f.opacity;} this.fx.clear(); this.actors.clear();
        this.skillHud?.destroy(); this.skillHud = null;
        this.enemyUnits.active=!!run;this.enemyUnits.setPosition(run?.mode==='city'?cityFortressPresentation(3.3).offset:0,0,0);
        this.scenery?.destroy();
        const style: StageStyle = !run ? 'rift' : run.mode === 'boss' ? 'boss' : run.mode === 'city' ? 'city' : run.mode === 'boat' ? 'boat' : 'trial';
        this.scenery = new BattleStage(this.field, style,stage,this.mainlineDistance); this.scenery.node.setSiblingIndex(0);this.scenery.resize(this.fieldWidth,this.fieldHeight);this.applyViewport();
        this.bossScore.node.active=run?.mode==='boss';this.teamLabel.node.active=false;this.enemyLabel.node.active=false;this.wave.node.active=false;
        this.engine.heroes.forEach((unit, i) => this.createActor(unit, i));
        this.statusLine.string = run ? `${ACTIVITY_NAMES[run.mode]} · 准备接战` : '一路向右 · 清怪攒秘境进度，满100召首领';
        this.syncMusic();if(run?.mode==='boss')this.audio.effect('boss-arrive');
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
        const hero = unit.team === 'hero'; const mode = this.activeRun?.mode;
        let x = hero ? (index % 2 === 0 ? -230 : -150) : (index % 2 === 0 ? 215 : 130);
        let y = 180 - index * 90;
        if (unit.formationSpot) ({ x, y } = battlePosition(unit.formationSpot, mode === 'boss' ? 'boss' : mode === 'city' ? 'city' : mode === 'trial' ? 'trial' : 'main', !hero));
        let fromX = hero ? x - 90 : x + 125; let fromY = y; let scale = unit.kind === 'soldier' ? 0.9 : unit.heroTier === 4 ? 1.28 : unit.heroTier === 3 ? 1.18 : unit.heroTier === 2 ? 1.1 : unit.kind === 'hero' ? 1.06 : 0.9;
        if (mode === 'boss') {
            const presentation=worldBossPresentation(this.fieldHeight,unit.visualId);
            if (!hero) { x = 0; y = presentation.y; scale=presentation.scale; } else scale = unit.kind === 'soldier' ? presentation.soldierScale : unit.heroTier===4?presentation.divineScale:presentation.heroScale;
            fromX = x; fromY = y;
        } else if (mode === 'city') {
            if (hero) fromX = x - 100;
            else if (unit.kind === 'wall') { x = 300; y = 20; fromX = x; fromY = y; scale = 1; }
            else {
                if (!unit.formationSpot) {
                    const wallIndex = this.engine.enemies.filter(u => u.onWall).findIndex(u => u.id === unit.id);
                    const groundIndex = this.engine.enemies.filter(u => u.kind !== 'wall' && !u.onWall).findIndex(u => u.id === unit.id);
                    ({ x, y } = battlePosition(unit.onWall ? wallIndex === 0 ? 'tower-left' : 'tower-right' : `ground-${Math.max(0, groundIndex)}`, 'city', true));
                }
                fromX = x; fromY = y; scale = unit.onWall ? 1 : unit.kind === 'soldier' ? 0.9 : unit.heroTier === 4 ? 1.24 : 1.12;
            }
        } else if (mode === 'trial') {
            if (!hero && !unit.formationSpot) ({ x, y } = battlePosition(['r0c2', 'r1c2', 'r2c2', 'r0c0', 'r2c0'][index], 'trial', true));
            fromX = hero ? -310 : 320; fromY = y;
        } else if (unit.kind === 'boss') { x = 185; y = 55; fromX = 325; fromY = y; scale = 1.95; }
        if(!hero&&!mode&&unit.kind!=='boss'){const p=mobPosition(index,!!unit.elite);x=p.x;y=p.y;scale=p.scale;}
        if(!hero&&!mode){fromX=x;fromY=y;}
        let parent=hero?this.units:this.enemyUnits;
        if(mode==='city'&&!hero&&(unit.kind==='wall'||unit.onWall)&&this.fortress){parent=this.fortress;x-=300;fromX-=300;y-=20;fromY-=20;}
        const actor = new UnitActor(parent, unit, x, y, fromX, fromY, scale, hero ? 1 : -1,
            mode === 'boss' && hero, mode === 'boss' || (mode === 'city' && !hero));
        if (mode === 'boss' && !hero) {actor.node.getChildByName('Name')!.active = false;actor.hp.node.active=false;}
        if(!hero&&!mode&&unit.kind!=='boss'){actor.node.getChildByName('Name')!.active=!!unit.elite;const name=actor.node.getChildByName('Name')!.getComponent(Label)!;name.fontSize=16;name.color=new Color('#FFE1A0');}
        this.actors.set(unit.id, actor);
    }

    private sortActors(): void {
        const allies:UnitActor[]=[],groups=new Map<Node,UnitActor[]>();
        this.actors.forEach(a=>{if(a.unit.team==='hero')allies.push(a);else{const parent=a.node.parent!;const list=groups.get(parent)||[];list.push(a);groups.set(parent,list);}});
        groups.forEach(list=>list.sort((a,b)=>a.unit.kind==='wall'?-1:b.unit.kind==='wall'?1:b.node.position.y-a.node.position.y).forEach((a,i)=>a.node.setSiblingIndex(i)));
        this.enemyUnits.setSiblingIndex(this.fortress?1:0);this.fortress?.setSiblingIndex(0);
        allies.sort((a,b)=>b.node.position.y-a.node.position.y||a.node.position.x-b.node.position.x).forEach((a,i)=>a.node.setSiblingIndex(i+(this.fortress?2:1)));
    }

    private processEvents(): void { this.engine.drainEvents().forEach(event => this.showEvent(event)); }
    private showEvent(event: BattleEvent): void {
        if (event.type === 'wave') {
            this.actors.forEach((actor, id) => { if (actor.unit.team === 'enemy') { actor.node.destroy(); this.actors.delete(id); } });
            this.engine.enemies.forEach((unit, i) => this.createActor(unit, i));
            this.statusLine.string = this.engine.riftGoal ? this.engine.bossActive ? '首领现身！击败它继续向右' : `遭遇第${event.wave}队敌兵 · 秘境行军中`
                : this.activeRun?.mode === 'boss' ? `${this.engine.enemies.find(u=>u.kind==='boss')?.name||'魔王'}在上，我军迎面讨伐！` : '双方正在接敌';
        } else if (event.type === 'boss') {
            this.actors.forEach((actor, id) => { if (actor.unit.team === 'enemy' && actor.unit.kind !== 'boss') { actor.node.destroy(); this.actors.delete(id); } });
            this.engine.enemies.forEach((unit, i) => { if (unit.kind === 'boss' && !this.actors.has(unit.id)) this.createActor(unit, i); });
            this.warning.show(1.25);this.syncMusic();this.audio.effect('boss-arrive');
            this.statusLine.string = '首领来袭！预警后继续行军接战';
        }
        else if (event.type === 'attack' && event.source && event.target) {
            const source = this.actors.get(event.source); const target = this.actors.get(event.target);
            if (source && target) {this.fx.attack(source, target);if(source.unit.team==='hero')this.audio.hit(source.weapon);}
        } else if ((event.type === 'damage' || event.type === 'heal') && event.target) {
            const actor = this.actors.get(event.target);
            if (actor) { this.fx.number(actor, event.amount || 0, event.type === 'heal', !!event.critical); if (event.type === 'damage') {actor.hurt(!!event.critical);this.fx.impact(actor,!!event.critical);if(event.critical){this.visualStop=.045;this.screenShake=Math.max(this.screenShake,.14);}} }
        } else if (event.type === 'buff' && event.target) {
            const actor = this.actors.get(event.target); if (actor) this.fx.status(actor, event.buff === 'attack' ? '战意+20%' : `护盾+${formatAmount(event.amount||0)}`, '#ADE0D8');
        } else if(event.type==='debuff'&&event.target){const actor=this.actors.get(event.target);if(actor)this.fx.status(actor,event.buff==='slow'?'冰缓−25%':event.buff==='burn'?'灼烧4秒':'中毒·抑疗','#B6C8F5');
        } else if (event.type === 'shield' && event.target) {
            const actor = this.actors.get(event.target); if (actor) this.fx.status(actor, `盾−${formatAmount(event.amount||0)}`, '#9DDBE4');
        } else if (event.type === 'death' && event.target) this.actors.get(event.target)?.die();
        else if (event.type === 'wall-break') {
            const wall = this.engine.enemies.find(u => u.kind === 'wall');
            if (wall) { const actor = this.actors.get(wall.id); actor?.breakWall(); if (actor) this.fx.wallBreak(actor.impactPoint.x, actor.impactPoint.y); }
            const used = new Set<string>();
            this.actors.forEach(a => { if (a.unit.formationSpot?.startsWith('ground-')) used.add(a.unit.formationSpot); });
            const free = Array.from({ length: 6 }, (_, i) => `ground-${i}`).filter(id => !used.has(id));
            let i = 0;
            this.actors.forEach(actor => {
                if (actor.unit.onWall && actor.unit.hp > 0) { const p = battlePosition(free[i++] || 'ground-4', 'city', true); actor.node.setParent(this.enemyUnits,true);actor.fallTo(p.x, p.y); }
            });
            this.fx.announce('城墙崩塌 · 守将减伤解除！'); this.statusLine.string = '破城！城上守军落地，恢复正常承伤';
        } else if (event.type === 'skill' && event.source) {
            const source = this.actors.get(event.source);
            if (source?.unit.team==='hero')console.info('[Skill] cast',source.unit.name,this.engine.autoSkill?'auto enabled':'manual',this.engine.skillCount);
            if (source) {
                const name = source.unit.skillName || (source.unit.kind === 'boss' ? '魔王震地' : TACTIC_NAMES[source.unit.tactic || 'cleave']);
                const targets: UnitActor[] = []; const friends: UnitActor[] = [];
                this.actors.forEach(actor => { if (actor.unit.team === source.unit.team) { if (source.unit.tactic !== 'heal' || event.targets?.indexOf(actor.unit.id) !== -1) friends.push(actor); } else if (event.targets?.indexOf(actor.unit.id) !== -1) targets.push(actor); });
                targets.sort((a, b) => (event.targets || []).indexOf(a.unit.id) - (event.targets || []).indexOf(b.unit.id));
                this.audio.effect(source.unit.element||'slash');if(source.unit.tactic!=='heal'){this.visualStop=.055;this.screenShake=Math.max(this.screenShake,.1);}
                this.fx.skill(source, targets, friends, name); this.statusLine.string = `${source.unit.name} · ${name}！`;
            }
        } else if(event.type==='finale'&&event.source){const actor=this.actors.get(event.source);if(actor){this.audio.effect('finale');this.fx.bossFinale(actor,event.skillName||'魔王终结');this.statusLine.string=`${actor.unit.name} · ${event.skillName}！`;}}else if(event.type==='finale-impact'){this.audio.effect('impact');this.screenShake=.7;this.fx.finaleImpact();}
        else if (event.type === 'finish'){this.audio.effect(this.engine.status==='won'||this.engine.status==='scored'?'victory':'defeat');this.showResult();}
    }

    onDestroy():void{view.off('canvas-resize',this.applyViewport,this);this.audio?.destroy();}
    private refresh(): void {
        this.soundButton.label.string=this.audio.caption;this.signatureShortcut.node.active=!this.activeRun;this.mainlineShortcut.node.active=!!this.activeRun;
        this.title.string = this.activeRun ? `${ACTIVITY_NAMES[this.activeRun.mode]}${this.activeRun.mode === 'trial' ? ` · 第${this.activeRun.stage}关` : this.activeRun.mode === 'city' ? ' · 演练' : ''}`
            : `第${this.stage}/${MAX_STAGE}关 · ${mainlineTheme(this.stage).name}`;
        if(this.activeRun?.mode==='boss'){const b=worldBoss(this.activeRun.worldBoss||bossRotation(this.activeRun.day*86400000).boss.id);this.title.string=`${b.name} · ${b.title}`;}
        const p = this.store.progress;
        this.wallet.string=`脑铢 ${formatAmount(p.coins)}     呆币 ${formatAmount(p.daibi)}     脑勋 ${formatAmount(p.points)}`;
        this.modeBadge.label.string=this.developer?'测试':this.session.experienceMode?'内测':'常规';
        const bonds=bondProgress(this.engine.heroes.filter(u=>u.kind==='hero').map(u=>u.visualId||u.id)).filter(b=>b.active);
        this.bondsBadge.label.string=`同阵羁绊 · ${bonds.length}`;
        this.inventoryButton.label.string = '行装';
        this.actors.forEach(actor => {
            const unit = actor.unit;
            bar(actor.hp, unit.hp / unit.maxHp, unit.kind === 'boss' ? 175 : unit.team==='enemy'&&!this.activeRun?(unit.elite?90:68):unit.formationSpot ? 64 : 85, 8, unit.team === 'hero' ? '#7CC69E' : '#E0B76A');
            actor.hpText.node.active=false;
        });
        const phase = this.engine.paused ? '已暂停' : this.engine.bossWarningRemaining>0?'首领预警':this.engine.approachRemaining > 0 ? '正在接敌' : this.engine.status === 'fighting' ? '交战中' : '战斗结束';
        const mode = this.activeRun?.mode;
        if (!this.activeRun) {
            this.overview.string = this.engine.bossActive ? '秘境进度100% · 击败首领进入下一关' : `秘境进度 ${this.engine.riftEnergy}/100 · 击杀小怪召唤首领`;
            bar(this.overviewBar, this.engine.riftEnergy / 100, 690, 10, '#D8BC75');
            this.wave.string = `${phase} · ${Math.floor(this.engine.elapsed)}秒 · 主将+补位兵共${this.engine.heroes.length}人`;
        } else if (mode === 'boss') {
            this.bossScore.string=`本次伤害 ${formatAmount(this.engine.damageDealt)} · 今日最高 ${formatAmount(p.daily.bossBest)}`;
            const boss=worldBoss(this.activeRun!.worldBoss||bossRotation(this.activeRun!.day*86400000).boss.id);this.overview.string=this.engine.finisherActive?`${boss.finale} · 魔王终结技！`:`${boss.attribute} · 弱${boss.weakness} · ${Math.floor(this.engine.elapsed)}/30秒`;
            bar(this.overviewBar, this.engine.elapsed / 30, 690, 10, '#BE8FCB');
            this.wave.string = `${phase} · ${Math.min(30, Math.floor(this.engine.elapsed))}/30秒 · 今日最高${p.daily.bossBest}`;
        } else if (mode === 'city') {
            const wall = this.engine.enemies.find(u => u.kind === 'wall');
            this.overview.string = this.engine.wallAlive ? `城墙 ${Math.ceil(wall!.hp)}/${wall!.maxHp} · 城上守将减伤60%` : '城墙已破 · 城上减伤解除';
            bar(this.overviewBar, wall ? wall.hp / wall.maxHp : 0, 690, 10, '#C6A574');
            this.wave.string = `${phase} · ${Math.floor(this.engine.elapsed)}秒 · 本地守军演练`;
        } else {
            this.overview.string = mode === 'trial' ? `${trialTrait(this.activeRun.stage).join(' · ')}` : '护船借宝 · 筹谋加成持续三波';
            bar(this.overviewBar, (this.engine.waveIndex + 1) / this.engine.waveCount, 690, 10, '#8CBAB1');
            this.wave.string = `${phase} · ${this.engine.waveIndex + 1}/${this.engine.waveCount}波 · ${Math.floor(this.engine.elapsed)}秒`;
        }
        this.autoButton.label.string=this.autoSkill?'自动开':'自动关';
        this.autoShortcut.label.string=this.autoSkill?'自动施法：开':'自动施法：关';
        this.combatState.string=`${phase} · ${this.autoSkill?'自动释放开':'手动释放'} · 本场已放${this.engine.skillCount}次`;
        this.pause.label.string=this.engine.paused?'继续':'暂停';
        this.speedButton.label.string=mode==='boss'?'固定×1':`×${this.speed}`;
    }

    private showResult(): void {
        if (this.resultShown) return;
        this.resultShown = true;
        if (this.activeRun) { this.showActivityResult(); return; }
        const won = this.engine.status === 'won';
        if(!won)this.store.clearMainlineEnergy();
        const reward = won ? this.store.settleVictory(this.battleId, this.stage,captureEnergy(this.engine.heroes)) : null;
        this.modal = panel(this.root, 'MainlineResult', 0, 60, 600, 380, '#15253A', 24);
        text(this.modal, 'ResultTitle', won ? '首 领 击 破' : '本 关 撤 退', 0, 119, 43, won ? '#E8C580' : '#E5A393', 550);
        text(this.modal, 'ResultReward', won ? `脑铢+${reward!.coins} · 呆币+${reward!.daibi || 0}` : '秘境进度清零，重新从本关出发', 0, 62, 26, '#C7DACE', 550);
        const detail = reward?.heroes?.length ? `剧情入队：${reward.heroes.map(id => getHero(id)!.name).join('、')}`
            : reward?.equipment ? `掉落${RARITY_NAMES[reward.equipment.rarity - 1]}·${reward.equipment.name}` : `用时${this.engine.elapsed.toFixed(1)}秒`;
        text(this.modal, 'ResultDetail', detail, 0, 16, 22, '#B1C4D4', 550);
        this.nextLabel = text(this.modal, 'AutoNext', won && this.stage < MAX_STAGE ? '继续向右 · 3秒后进入下一关' : won ? '999关征途已完成' : this.store.growthAdvice(), 0, -28, 19, '#98AFBF', 550);
        if (reward && !reward.saved) this.nextLabel.string = '存储不可用：奖励仅保留于当前会话';
        button(this.modal, 'NextStageButton', won ? this.stage>=MAX_STAGE?'重游终章':'立即向右 · 下一关' : '重新打本关', 0, -91, 470, 62, '#426D59', () => this.begin(won ? Math.min(MAX_STAGE, this.stage + 1) : this.stage));
        button(this.modal, 'AdjustParty', '查看武将与阵容', 0, -157, 470, 48, '#30465E', () => this.openHall());
        this.autoNext = won && this.stage < MAX_STAGE ? 3 : 0;
        this.statusLine.string = won ? '首领已击败 · 剩余技能能量带入下一关' : '挑战失败 · 本关需重新攒秘境进度';
    }

    private restart(): void {
        if (!this.activeRun) { this.store.clearMainlineEnergy();this.begin(this.stage); return; }
        try {
            if(this.activeRun.mode==='trial')this.store.clearTrialEnergy();
            const pending = this.store.progress.pending;
            const run = pending?.id === this.activeRun.id ? pending : this.store.startActivity(this.activeRun.mode, this.activeRun.choices);
            this.begin(this.stage, run);
        } catch (error) { this.statusLine.string = error instanceof Error ? error.message : '无法重开'; }
    }
    private showActivityResult(): void {
        const run = this.activeRun!; const won = this.engine.status === 'won'; const boss = run.mode === 'boss';
        const reward = this.store.settleActivity(run.id, won, Math.floor(this.engine.damageDealt),captureEnergy(this.engine.heroes));
        this.modal = panel(this.root, 'ActivityResult', 0, 60, 600, 420, '#15253A', 24);
        text(this.modal, 'ResultTitle', boss ? '魔 王 战 报' : won ? '大 获 全 胜' : '暂 时 撤 退', 0, 128, 43, '#E6C486', 550);
        text(this.modal, 'ResultReward', `呆币+${reward.daibi} · 脑勋+${reward.points}`, 0, 66, 29, '#C4D9CA', 550);
        text(this.modal, 'ResultDetail', boss ? `本次${Math.floor(this.engine.damageDealt)} · 今日最高${this.store.progress.daily.bossBest}` : `${ACTIVITY_NAMES[run.mode]} · ${this.engine.elapsed.toFixed(1)}秒`, 0, 12, 22, '#A9BBD0', 550);
        text(this.modal, 'ResultNote', !reward.granted ? '挑战已失效，不重复发奖励' : !reward.saved ? '本次未能保存' : boss ? '奖励只补当日最高档位差额' : run.mode === 'city' ? '当前为本地守军演练，真实玩家攻守待联机' : '结算已保存，不重复发奖', 0, -34, 18, '#8FA6BF', 550);
        button(this.modal, 'ActivityAgain', run.mode === 'trial' && won ? '挑战下一关' : '再次挑战', 0, -100, 470, 62, '#426D59', () => {
            try { this.begin(this.stage, this.store.startActivity(run.mode, run.choices)); }
            catch (error) { this.statusLine.string = error instanceof Error ? error.message : '无法进入副本'; }
        });
        button(this.modal, 'ReturnMain', '返回主线行军', 0, -171, 470, 52, '#30465E', () => this.returnToMainline());
        this.statusLine.string = boss ? '个人成绩已保存 · 全服榜单待联机' : won ? '副本通关，奖励已结算' : '调整阵容后再试';
    }
    private openAudioSettings(): void {
        if (this.utility || this.hall || this.inventory) return;
        const wasPaused = this.engine.paused;
        this.engine.paused = true;
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
        button(card, 'CloseAudio', '返回战场', 0, -129, 470, 54, '#345F57', () => {
            overlay.destroy();
            this.utility = null;
            this.engine.paused = wasPaused;
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
    private openExperienceGift(first=false):void {
        if(this.utility||this.hall||this.inventory)return;
        const was=this.engine.paused;this.engine.paused=true;
        const popup=this.utility=panel(this.root,'ExperienceGift',0,0,720,1280,'#101A2DF8',0);
        popup.on(Node.EventType.TOUCH_END,()=>{});
        text(popup,'GiftTitle',first?'内测补给已到账':'内测补给说明',0,405,38,'#F0CF8C');
        text(popup,'GiftRule','独立体验档 · 不带入正式服',0,328,23,'#AFCBD7');
        const gifts:[string,number][]=[['脑铢',EXPERIENCE_GIFT.coins],['呆币',EXPERIENCE_GIFT.daibi],['脑勋',EXPERIENCE_GIFT.points],['脑力',EXPERIENCE_GIFT.souls],['升级经验',EXPERIENCE_GIFT.experience]];
        gifts.forEach(([name,value],i)=>text(popup,`Gift-${i}`,`${name}  +${formatAmount(value)}`,0,228-i*80,30,'#E9D9AB',600));
        text(popup,'GiftHint','首次进入发放一次；消费后不自动补满。',0,-243,21,'#BBCBD4',640);
        text(popup,'GiftStorage',this.store.storageAvailable?'已保留原常规档进度，体验资源单独保存。':'当前存储不可用，退出后可能无法保留。',0,-290,19,'#BBCBD4',650);
        button(popup,'GiftContinue','开玩 · 招募配装去',0,-405,590,80,'#4E7560',()=>{popup.destroy();this.utility=null;this.engine.paused=was;});
    }
    private openDeveloper():void {
        if(!this.localAllowed||this.utility||this.hall||this.inventory)return;
        const was=this.engine.paused;this.engine.paused=true;const popup=this.utility=panel(this.root,'DeveloperPanel',0,0,720,1280,'#101A2DFD',0);popup.on(Node.EventType.TOUCH_END,()=>{});
        let level=this.store.progress.heroLevel,stars=this.developer?this.store.progress.stars.guanyu||6:6,stage=this.stage;
        text(popup,'DeveloperTitle','本 地 · 测 试 台',0,548,38,'#F0CF8C');text(popup,'DeveloperRule','独立测试存档 · 全武将开放 · 正常存档保留',0,481,21,'#AFCBD7');
        const summary=text(popup,'TestSummary',`Lv.${level} / ${stars}星 / 第${stage}关`,0,408,26,'#D8E9BA');
        const refresh=()=>{summary.string=`Lv.${level} / ${stars}星 / 第${stage}关`;};
        text(popup,'LevelLabel','全队等级',0,338,24);[1,30,100,300].forEach((n,i)=>button(popup,`TestLevel-${n}`,`Lv.${n}`,(i-1.5)*157,281,145,56,'#344D63',()=>{level=n;refresh();}));
        text(popup,'StarLabel','全部武将星级',0,211,24);[1,3,6].forEach((n,i)=>button(popup,`TestStars-${n}`,`${n}星`,(i-1)*205,155,190,56,'#344D63',()=>{stars=n;refresh();}));
        text(popup,'StageLabel','主线测试关卡',0,85,24);[1,100,500,999].forEach((n,i)=>button(popup,`TestStage-${n}`,`${n}关`,(i-1.5)*157,29,145,56,'#344D63',()=>{stage=n;refresh();}));
        const dismiss=()=>{popup.destroy();this.utility=null;};
        button(popup,'ApplyDeveloper',this.developer?'应用测试参数':'进入测试档',0,-66,620,72,'#8A6B3F',()=>{dismiss();this.store=this.session.configure({level,stars,stage});this.developer=true;this.persistMode('test');this.loadPreferences();this.begin(stage);this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});});
        button(popup,'ChargeDeveloper','充满我方技能',-161,-164,302,64,'#456B5C',()=>{dismiss();this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});this.engine.paused=was;});
        button(popup,'BossDeveloper','本周Boss技能测试',161,-164,302,64,'#456B5C',()=>{dismiss();if(!this.developer){this.store=this.session.test();this.developer=true;this.persistMode('test');}this.store.abandonActivity();this.loadPreferences();this.begin(stage,this.store.startActivity('boss'));this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});});
        button(popup,'ResetDeveloper','重置测试档 · 全满级满星',0,-263,620,64,'#604557',()=>{dismiss();this.store=this.session.test(true);this.developer=true;this.persistMode('test');this.loadPreferences();this.begin(999);this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});});
        button(popup,'UseNormalSave',this.session.experienceMode?'切换内测存档':'切换常规存档',0,-366,620,64,'#354D63',()=>{dismiss();this.store=this.session.normal();this.developer=false;this.persistMode('normal');this.loadPreferences();this.begin(Math.min(MAX_STAGE,this.store.progress.highestCleared+1));});
        button(popup,'ElementDeveloper','雷火毒演武队 · 满能Boss',0,-418,620,48,'#63527C',()=>{dismiss();if(!this.developer){this.store=this.session.test();this.developer=true;this.persistMode('test');}this.store.abandonActivity();this.store.setParty(['zhaoyun','zhouyu','jiaxu','xiaoqiao','huatuo'],'main');this.loadPreferences();this.begin(stage,this.store.startActivity('boss'));this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});});
        WORLD_BOSSES.forEach((b,i)=>button(popup,`BossPreview-${b.id}`,`${b.name}试战`,(i-1)*205,-480,190,48,'#57466D',()=>{dismiss();this.startDeveloperBoss(b.id,stage);}));
        button(popup,'CloseDeveloper','返回战场',0,-554,620,64,'#3B5669',()=>{dismiss();this.engine.paused=was;});
    }
    private startDeveloperBoss(id:WorldBossId,stage:number):void{if(!this.localAllowed)return;if(!this.developer){this.store=this.session.test();this.developer=true;this.persistMode('test');}this.store.abandonActivity();this.loadPreferences();this.begin(stage,this.store.startActivity('boss',[],id));this.engine.heroes.forEach(u=>{if(u.kind!=='soldier')u.energy=100;});}
    private toggleAutoSkill():void{this.autoSkill=!this.autoSkill;this.preferences.autoSkill=this.autoSkill;this.engine.autoSkill=this.autoSkill;console.info('[Skill] auto',this.autoSkill?'on':'off');this.statusLine.string=this.autoSkill?'自动施法已开启 · 满能接战后依次释放':'手动施法 · 点左侧满能头像释放';this.refresh();}
    private loadPreferences():void{this.preferences=new BattlePreferences(sys.localStorage,this.developer?'test':this.session.experienceMode?'experience':'standard');this.autoSkill=this.preferences.autoSkill;console.info('[Skill] preference',this.developer?'test':this.session.experienceMode?'experience':'standard',this.autoSkill?'on':'off');}
    private syncMusic():void{
        if(!this.engine)return;const menu=!!(this.hall||this.inventory||this.utility||this.root.getChildByName('FormationEditor'));
        const run=this.activeRun;this.audio.scene(battleMusic(run?.mode,this.engine.bossActive,menu,run?.worldBoss||(run?bossRotation(run.day*86400000).boss.id:undefined)));
    }
    private returnToMainline():void{
        this.hall?.node.destroy();this.hall=null;this.inventory?.node.destroy();this.inventory=null;
        this.utility?.destroy();this.utility=null;this.root.getChildByName('FormationEditor')?.destroy();
        // Keep an unfinished activity snapshot: resume via the dungeon hall, no refund or reward.
        this.begin(Math.min(MAX_STAGE,this.store.progress.highestCleared+1));
        if(this.store.progress.pending)this.statusLine.string='已回主线 · 未完副本可在副本页继续，不重复扣次数';
    }
    private openHall(tab: 'heroes'|'idle'|'draw'|'activities'|'exchange' = 'heroes'): void {
        if (this.hall || this.inventory) return;
        const wasPaused = this.engine.paused; this.engine.paused = true;
        this.hall = new MetaPanel(this.root, this.store, () => { this.hall = null; this.engine.paused = wasPaused; this.refresh(); }, run => { this.hall = null; this.begin(this.stage, run); }, tab,()=>{this.hall=null;this.returnToMainline();});
        this.refresh();
    }
    private openInventory(signatureShop=false): void {
        if (this.inventory || this.hall) return;
        const wasPaused = this.engine.paused; this.engine.paused = true;
        this.inventory = new InventoryPanel(this.root, this.store, () => { this.inventory = null; this.engine.paused = wasPaused; this.refresh(); },signatureShop);
        this.refresh();
    }
}
