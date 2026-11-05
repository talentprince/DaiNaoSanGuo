interface PreferenceStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export class BattlePreferences {
    private storage:PreferenceStorage;private profile:'standard'|'experience'|'test';
    constructor(storage:PreferenceStorage,profile:'standard'|'experience'|'test'){this.storage=storage;this.profile=profile;}
    get autoSkill():boolean {try{const saved=this.storage.getItem(this.key);if(saved==='on'||saved==='off')return saved==='on';}catch(_){}return true;}
    set autoSkill(value:boolean){try{this.storage.setItem(this.key,value?'on':'off');}catch(_){}}
    private get key():string{return `dainaosanguo.${this.profile}.auto-skill.v1`;}
}
