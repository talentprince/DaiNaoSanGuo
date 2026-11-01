import { game,Game,input,Input,sys } from 'cc';
import { AudioDirector } from './AudioDirector';
import type { SoundChannel,SoundKind,MusicScene } from './AudioDirector';
import type { WeaponKind } from './BattleEngine';
declare const wx:{createInnerAudioContext?:()=>SoundChannel;loadSubpackage?:(options:{name:string;success:()=>void;fail:()=>void})=>unknown};
export class GameAudio {
    readonly director:AudioDirector;private loading=false;
    constructor(){
        const native=typeof wx!=='undefined'&&!!wx.createInnerAudioContext;
        this.director=new AudioDirector(()=>{
            if(native)return wx.createInnerAudioContext!();
            if(typeof Audio!=='undefined'){const sound=new Audio();sound.preload='auto';return sound;}
            return{src:'',loop:false,volume:0,play:()=>{},pause:()=>{}};
        },sys.localStorage,Date.now,!native);
        input.on(Input.EventType.TOUCH_START,this.unlock,this);input.on(Input.EventType.MOUSE_DOWN,this.unlock,this);game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
        if(native){this.loadPackage();this.director.unlock();}
    }
    private loadPackage():void{
        if(this.loading||this.director.ready)return;this.loading=true;
        try{if(typeof wx!=='undefined'&&wx.loadSubpackage)wx.loadSubpackage({name:'battle-audio',success:()=>{this.loading=false;this.director.setReady(true);console.info('[Audio] battle-audio ready');},fail:()=>{this.loading=false;this.director.lastError='音乐包加载失败，点击声音按钮重试';}});
        else{this.loading=false;this.director.lastError='当前微信版本暂不能加载音乐包';}}catch(_){this.loading=false;this.director.lastError='音乐包暂不可用，点击声音按钮重试';}
    }
    private unlock():void{if(!this.director.ready)this.loadPackage();if(!this.director.unlocked)this.director.unlock();}
    private hide():void{this.director.hide();}
    private show():void{if(!this.director.ready)this.loadPackage();this.director.show();}
    scene(name:MusicScene):void{this.director.scene(name);if(name==='mainboss'||name.startsWith('boss'))this.director.effect('boss-arrive');}
    effect(kind:SoundKind):void{this.director.effect(kind);}
    hit(weapon:WeaponKind):void{this.director.effect(weapon==='bow'?'hit-bow':['spear','glaive','halberd','serpent'].indexOf(weapon)>=0?'hit-pierce':['fan','staff','qin','ribbon'].indexOf(weapon)>=0?'hit-magic':'hit-slash');}
    toggle():void{if(!this.director.ready&&this.director.lastError){this.loadPackage();if(!this.director.enabled)this.director.toggle();else this.director.unlock();return;}this.director.toggle();if(this.director.enabled&&!this.director.ready)this.loadPackage();}
    get caption():string{return !this.director.enabled?'声音关':this.director.ready?'声音开':this.director.lastError?'重试声音':'音乐载入';}
    get enabled():boolean{return this.director.enabled;}
    update(dt:number):void{this.director.update(dt);}
    destroy():void{input.off(Input.EventType.TOUCH_START,this.unlock,this);input.off(Input.EventType.MOUSE_DOWN,this.unlock,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.director.destroy();}
}
