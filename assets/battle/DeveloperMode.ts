import { ProgressStore, createEquipment } from './ProgressStore';
import type { StorageAdapter,Progress } from './ProgressStore';
import { HERO_CATALOG } from '../data/HeroCatalog';
import { signatureFor } from '../data/EquipmentConfig';
import { arrangeParty } from '../data/FormationConfig';
import { MAX_LEVEL } from '../data/GrowthConfig';
export const DEV_KEY='dainaosanguo.developer.progress.v1';
export const MODE_KEY='dainaosanguo.local.mode.v1';
export function isLocalDevelopment(host:string,simulator=false):boolean{return simulator||host==='localhost'||host==='127.0.0.1'||host==='::1'||host==='[::1]';}
export function developerStorage(storage:StorageAdapter):StorageAdapter{return{getItem:()=>storage.getItem(DEV_KEY),setItem:(_,value)=>storage.setItem(DEV_KEY,value)};}
export interface DeveloperSettings{level:number;stars:number;stage:number;}
function filledProfile(p:Progress):Progress{
    p.owned=HERO_CATALOG.map(h=>h.id);p.heroLevel=MAX_LEVEL;p.highestCleared=998;p.coins=1000000;p.daibi=1000000;p.points=1000000;p.souls=100000;
    p.inventory=[];p.loadouts={};p.equipped={};p.pending=null;p.experience=100000;
    HERO_CATALOG.forEach(h=>{
        p.stars[h.id]=6;p.fragments[h.id]=1000;
        const weapon=signatureFor(h.id);const armor={...createEquipment(999,`dev-armor-${h.id}`),id:`dev-armor-${h.id}`,slot:'armor' as const,appearance:'armor' as const,name:'试炼麒麟甲',attack:20,defense:50,maxHp:900};
        const charm={...createEquipment(999,`dev-charm-${h.id}`),id:`dev-charm-${h.id}`,slot:'charm' as const,appearance:'charm' as const,name:'试炼龙纹符',attack:10,defense:20,maxHp:1000};
        p.inventory.push(weapon,armor,charm);p.loadouts[h.id]={weapon:weapon.id,armor:armor.id,charm:charm.id};p.equipped[h.id]=weapon.id;
    });
    p.formations.main=arrangeParty(['guanyu','liubei','zhangfei','xiaoqiao','daqiao'],'main');
    p.formations.trial=arrangeParty(['xiaoqiao','daqiao','caiwenji'],'trial');
    p.formations.defense=arrangeParty(['guanyu','liubei','zhangfei','xiaoqiao','daqiao'],'defense','mixed',['xiaoqiao','daqiao']);
    return p;
}
export function createDeveloperStore(storage:StorageAdapter,clock:()=>number=Date.now,random:()=>number=Math.random,reset=false):ProgressStore{
    const disk=developerStorage(storage);let exists=false;try{const raw=disk.getItem('');const p=raw?JSON.parse(raw):null;exists=!!p&&Array.isArray(p.owned)&&p.owned.length>=HERO_CATALOG.length;}catch(_){exists=false;}
    if(!exists||reset){const p=filledProfile(new ProgressStore({getItem:()=>null,setItem:()=>{}},clock,random,{developer:true}).progress);try{disk.setItem('',JSON.stringify(p));}catch(_){const raw=JSON.stringify(p);const fallback=new ProgressStore({getItem:()=>raw,setItem:()=>{throw new Error('测试档未保存');}},clock,random,{developer:true});fallback.storageAvailable=false;return fallback;}}
    return new ProgressStore(disk,clock,random,{developer:true});
}
export function configureDeveloper(storage:StorageAdapter,settings:DeveloperSettings):ProgressStore{
    if(!Number.isInteger(settings.level)||settings.level<1||settings.level>300||!Number.isInteger(settings.stars)||settings.stars<1||settings.stars>6||!Number.isInteger(settings.stage)||settings.stage<1||settings.stage>999)throw new Error('测试参数无效');
    const p=createDeveloperStore(storage).progress;p.heroLevel=settings.level;p.highestCleared=settings.stage-1;p.pending=null;HERO_CATALOG.forEach(h=>{p.stars[h.id]=settings.stars;});
    try{developerStorage(storage).setItem('',JSON.stringify(p));return createDeveloperStore(storage);}catch(_){const raw=JSON.stringify(p);const fallback=new ProgressStore({getItem:()=>raw,setItem:()=>{throw new Error('测试档未保存');}},Date.now,Math.random,{developer:true});fallback.storageAvailable=false;return fallback;}
}
