export type MusicScene='menu'|'main'|'city'|'trial'|'boat'|'mainboss'|'boss'|'boss-zhangjiao'|'boss-menghuo';
export type SoundKind='lightning'|'fire'|'blizzard'|'wind'|'poison'|'heal'|'guard'|'slash'|'finale'|'impact'|'victory'|'defeat'|'boss-arrive'|'critical'|'hit-slash'|'hit-pierce'|'hit-bow'|'hit-magic';
export interface SoundChannel {src:string;loop:boolean;volume:number;currentTime?:number;play():void|Promise<void>;pause():void;stop?():void;destroy?():void;onPlay?(listener:()=>void):void;onEnded?(listener:()=>void):void;onError?(listener:(error:{errCode?:number;errMsg?:string})=>void):void;seek?(position:number):void;onCanplay?(listener:()=>void):void;}
interface AudioOptions { musicDefault?: boolean; musicKey?: string; }
interface Settings {getItem(key:string):string|null;setItem(key:string,value:string):void;}
/** Platform-independent policy: ready gates package access, never battle outcomes. */
export class AudioDirector {
    musicEnabled: boolean;
    private readonly musicKey: string;
    enabled=true;unlocked=false;suspended=false;lastError='';ready=true;
    private bgm:SoundChannel;private pool:SoundChannel[];private hitChannel:SoundChannel;private alertChannel:SoundChannel;private loadedSfx=new Map<SoundChannel,string>();private cursor=0;private music='';private duck=0;private priority=0;private dead=false;
    private recent:Record<string,number>={};private lastHit=-Infinity;private variation:Record<string,number>={};private pending:SoundKind|null=null;private positions:Record<string,number>={};private loadedMusic='';private alertUntil=0;private seekTo=0;private storage?:Settings;private clock:()=>number;
    constructor(factory: () => SoundChannel, storage?: Settings, clock: () => number = Date.now, ready = true, options: AudioOptions = {}) {
        this.storage = storage;
        this.clock = clock;
        this.ready = ready;
        this.musicKey = options.musicKey ?? 'dainaosanguo.music.standard.v1';
        this.musicEnabled = options.musicDefault ?? true;
        try {
            this.enabled = storage?.getItem('dainaosanguo.audio.v1') !== 'off';
            const saved = storage?.getItem(this.musicKey);
            if (saved === 'on' || saved === 'off') this.musicEnabled = saved === 'on';
        } catch (_) {}
        this.bgm = factory();
        this.pool = [factory(), factory()];
        this.hitChannel = factory();
        this.alertChannel = factory();
        this.bgm.loop = true;
        this.bgm.volume = .28;
        this.bgm.onCanplay?.(() => this.restorePosition());
        [this.bgm, ...this.effects].forEach(channel => channel.onError?.(error => {
            this.lastError = '声音播放失败';
            console.warn('[Audio] playback failed', channel.src, error.errCode, error.errMsg);
        }));
    }

    toggleMusic(): void {
        if (this.dead) return;
        this.musicEnabled = !this.musicEnabled;
        try { this.storage?.setItem(this.musicKey, this.musicEnabled ? 'on' : 'off'); } catch (_) {}
        if (this.musicEnabled) this.unlock();
        else this.bgm.pause();
    }
    private get effects():SoundChannel[]{return [...this.pool,this.hitChannel,this.alertChannel];}
    scene(name:MusicScene):void{if(this.dead||this.music===name)return;if(this.music&&this.loadedMusic===this.music&&Number.isFinite(this.bgm.currentTime))this.positions[this.music]=this.bgm.currentTime||0;this.music=name;this.effects.forEach(c=>this.stop(c));this.duck=0;this.priority=0;this.bgm.pause();this.resume();}
    setReady(ready:boolean):void{if(this.dead)return;this.ready=ready;if(ready){this.lastError='';this.resume();this.flush();}}
    unlock():void{if(this.dead)return;this.unlocked=true;this.resume();this.flush();}
    toggle():void{if(this.dead)return;this.enabled=!this.enabled;try{this.storage?.setItem('dainaosanguo.audio.v1',this.enabled?'on':'off');}catch(_){}if(this.enabled)this.unlock();else{this.pending=null;this.bgm.pause();this.effects.forEach(c=>this.stop(c));}}
    effect(kind:SoundKind):void{
        if(this.dead||!this.enabled||this.suspended||(this.music==='menu'&&kind!=='boss-arrive'))return;
        if(!this.ready||!this.unlocked){if(kind==='boss-arrive')this.pending=kind;return;}
        const now=this.clock(),hit=kind.startsWith('hit-');
        if(now<this.alertUntil&&kind!=='finale')return;
        if(hit&&now-this.lastHit<180)return;
        if(this.recent[kind]!==undefined&&now-this.recent[kind]<(kind==='critical'?600:160))return;this.recent[kind]=now;
        if(kind==='boss-arrive'){this.effects.forEach(c=>this.stop(c));this.alertUntil=now+1100;}
        if(hit)this.lastHit=now;
        else if(kind==='finale'){this.effects.forEach(c=>this.stop(c));this.duck=this.priority=2.8;}
        else{this.priority=Math.max(this.priority,kind==='boss-arrive'?1.1:kind==='impact'?.8:.22);this.duck=Math.max(this.duck,kind==='boss-arrive'?1.1:kind==='impact'?1:.3);}
        const variant=hit?`-${(this.variation[kind]=(this.variation[kind]||0)+1)%2}`:'';
        const channel=kind==='boss-arrive'?this.alertChannel:hit||kind==='critical'?this.hitChannel:this.pool[this.cursor++%this.pool.length];
        this.stop(channel);const path=`audio/${kind}${variant}.mp3`;
        if(this.loadedSfx.get(channel)!==path){channel.src=path;this.loadedSfx.set(channel,path);}
        channel.volume=hit?.42:kind==='critical'?.35:kind==='boss-arrive'?.72:kind==='impact'?.5:.42;channel.loop=false;this.play(channel);
    }

    update(dt:number):void{const elapsed=Math.max(0,dt);this.duck=Math.max(0,this.duck-elapsed);this.priority=Math.max(0,this.priority-elapsed);this.bgm.volume=this.duck>0?.11:.28;}
    hide():void{this.suspended=true;this.pending=null;this.bgm.pause();this.effects.forEach(c=>this.stop(c));}
    show():void{this.suspended=false;this.resume();}
    destroy():void{if(this.dead)return;this.dead=true;[this.bgm,...this.effects].forEach(c=>{this.stop(c);c.destroy?.();});}
    private flush():void{if(this.pending&&this.ready&&this.unlocked){const kind=this.pending;this.pending=null;this.effect(kind);}}
    retry():void{if(this.dead)return;this.lastError='';this.loadedMusic='';this.loadedSfx.clear();this.resume();}
    private resume():void{if(!this.dead&&this.ready&&this.enabled&&this.musicEnabled&&this.unlocked&&!this.suspended&&this.music){if(this.loadedMusic!==this.music){this.loadedMusic=this.music;this.seekTo=this.positions[this.music]||0;this.bgm.src=`audio/${this.music}.mp3`;if(!this.bgm.onCanplay)this.restorePosition();}this.play(this.bgm);}}
    private restorePosition():void{if(this.dead||this.seekTo<=0)return;try{if(this.bgm.seek)this.bgm.seek(this.seekTo);else this.bgm.currentTime=this.seekTo;}catch(_){}this.seekTo=0;}
    private stop(c:SoundChannel):void{try{if(c.stop)c.stop();else{c.pause();c.currentTime=0;}}catch(_){} }
    private play(c:SoundChannel):void{try{const result=c.play();if(result&&typeof result.catch==='function')result.catch(()=>{this.lastError='点击游戏以启用声音';});}catch(_){this.lastError='声音暂不可用';}}
}
