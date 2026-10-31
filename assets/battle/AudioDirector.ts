export type SoundKind='lightning'|'fire'|'blizzard'|'wind'|'poison'|'heal'|'guard'|'slash'|'finale'|'impact'|'victory'|'defeat';
export interface SoundChannel {src:string;loop:boolean;volume:number;currentTime?:number;play():void|Promise<void>;pause():void;stop?():void;destroy?():void;}
interface Settings {getItem(key:string):string|null;setItem(key:string,value:string):void;}
/** Platform-independent audio policy. No battle outcomes or timers depend on audio. */
export class AudioDirector {
    enabled=true;unlocked=false;suspended=false;lastError='';
    private bgm:SoundChannel;private pool:SoundChannel[];private cursor=0;private music='';private duck=0;private dead=false;private recent:Record<string,number>={};private storage?:Settings;private clock:()=>number;
    constructor(factory:()=>SoundChannel,storage?:Settings,clock:()=>number=Date.now){this.storage=storage;this.clock=clock;try{this.enabled=storage?.getItem('dainaosanguo.audio.v1')!=='off';}catch(_){}this.bgm=factory();this.pool=[factory(),factory(),factory()];this.bgm.loop=true;this.bgm.volume=.28;}
    scene(name:'main'|'boss'):void{if(this.dead||this.music===name)return;this.music=name;this.bgm.pause();this.bgm.src=`audio/${name}.mp3`;this.resume();}
    unlock():void{if(this.dead)return;this.unlocked=true;this.resume();}
    toggle():void{if(this.dead)return;this.enabled=!this.enabled;try{this.storage?.setItem('dainaosanguo.audio.v1',this.enabled?'on':'off');}catch(_){}if(this.enabled)this.unlock();else{this.bgm.pause();this.pool.forEach(c=>this.stop(c));}}
    effect(kind:SoundKind):void{if(this.dead||!this.enabled||!this.unlocked||this.suspended)return;const now=this.clock();if(this.recent[kind]!==undefined&&now-this.recent[kind]<160)return;this.recent[kind]=now;
        if(kind==='finale'){this.pool.forEach(c=>this.stop(c));this.duck=2.8;}else this.duck=Math.max(this.duck,kind==='impact'?1:.3);
        const channel=this.pool[this.cursor++%this.pool.length];this.stop(channel);channel.src=`audio/${kind}.mp3`;channel.volume=kind==='impact'?.5:.38;channel.loop=false;this.play(channel);
    }
    update(dt:number):void{this.duck=Math.max(0,this.duck-Math.max(0,dt));this.bgm.volume=this.duck>0?.11:.28;}
    hide():void{this.suspended=true;this.bgm.pause();this.pool.forEach(c=>this.stop(c));}
    show():void{this.suspended=false;this.resume();}
    destroy():void{if(this.dead)return;this.dead=true;[this.bgm,...this.pool].forEach(c=>{this.stop(c);c.destroy?.();});}
    private resume():void{if(!this.dead&&this.enabled&&this.unlocked&&!this.suspended&&this.music)this.play(this.bgm);}
    private stop(c:SoundChannel):void{try{if(c.stop)c.stop();else{c.pause();c.currentTime=0;}}catch(_){} }
    private play(c:SoundChannel):void{try{const result=c.play();if(result&&typeof result.catch==='function')result.catch(()=>{this.lastError='点击游戏以启用声音';});}catch(_){this.lastError='声音暂不可用';}}
}
