import type { MusicScene } from '../battle/AudioDirector';
export function battleMusic(mode:string|undefined,bossActive:boolean,menuOpen:boolean,bossId='dongzhuo'):MusicScene {
    if(menuOpen)return 'menu';
    if(!mode)return bossActive?'mainboss':'main';
    if(mode==='boss')return bossId==='zhangjiao'?'boss-zhangjiao':bossId==='menghuo'?'boss-menghuo':'boss';
    return mode==='city'?'city':mode==='trial'?'trial':'boat';
}
