import { game,Game,input,Input,sys } from 'cc';
import { AudioDirector } from './AudioDirector';
import type { SoundChannel,SoundKind } from './AudioDirector';
declare const wx:{createInnerAudioContext?:()=>SoundChannel};
export class GameAudio {
    readonly director:AudioDirector;
    constructor(){
        this.director=new AudioDirector(()=>{
            if(typeof wx!=='undefined'&&wx.createInnerAudioContext)return wx.createInnerAudioContext();
            if(typeof Audio!=='undefined'){const sound=new Audio();sound.preload='auto';return sound;}
            return{src:'',loop:false,volume:0,play:()=>{},pause:()=>{}};
        },sys.localStorage);
        input.on(Input.EventType.TOUCH_START,this.unlock,this);input.on(Input.EventType.MOUSE_DOWN,this.unlock,this);game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
        if(typeof wx!=='undefined'&&wx.createInnerAudioContext)this.director.unlock();
    }
    private unlock():void{if(!this.director.unlocked)this.director.unlock();}
    private hide():void{this.director.hide();}
    private show():void{this.director.show();}
    scene(boss:boolean):void{this.director.scene(boss?'boss':'main');}
    effect(kind:SoundKind):void{this.director.effect(kind);}
    toggle():void{this.director.toggle();}
    get enabled():boolean{return this.director.enabled;}
    update(dt:number):void{this.director.update(dt);}
    destroy():void{input.off(Input.EventType.TOUCH_START,this.unlock,this);input.off(Input.EventType.MOUSE_DOWN,this.unlock,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.director.destroy();}
}
