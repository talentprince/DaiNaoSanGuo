import type { UnitConfig } from '../battle/BattleEngine';
export interface Bond {id:string;name:string;members:string[];need:number;attack?:number;hp?:number;defense?:number;energy?:number;healing?:number;skill?:number;desc:string;}
export const BONDS:Bond[]=[
 {id:'peach',name:'桃园结义',members:['liubei','guanyu','zhangfei'],need:3,attack:.08,hp:.12,desc:'刘关张同阵：三人攻击+8%、生命+12%'},
 {id:'tigers',name:'五虎并肩',members:['guanyu','zhangfei','zhaoyun','huangzhong','machao'],need:2,attack:.08,defense:.06,desc:'任2五虎同阵：在阵五虎攻击+8%、防御+6%'},
 {id:'wu',name:'江东双璧',members:['sunce','zhouyu'],need:2,attack:.12,desc:'孙策周瑜同阵：二人攻击+12%'},
 {id:'qiao',name:'二乔流光',members:['daqiao','xiaoqiao'],need:2,energy:.10,healing:.10,desc:'大小乔同阵：二人蓄能+10%、治疗+10%'},
 {id:'advisers',name:'卧龙凤雏',members:['zhugeliang','pangtong'],need:2,skill:.12,desc:'诸葛庞统同阵：二人主动攻击技能+12%'},
 {id:'heroines',name:'巾帼同行',members:['sunshangxiang','caiwenji','huangyueying','diaochan','daqiao','xiaoqiao','zhurong','zhenji'],need:2,hp:.08,energy:.05,desc:'任2女将同阵：在阵女将生命+8%、蓄能+5%'},
 {id:'luo',name:'洛水清音',members:['zhenji','caiwenji'],need:2,healing:.12,desc:'甄姬蔡文姬同阵：二人治疗+12%'},
];
export function bondProgress(ids:readonly string[]):{bond:Bond;count:number;active:boolean}[]{const unique=new Set(ids);return BONDS.map(bond=>{const count=bond.members.filter(id=>unique.has(id)).length;return{bond,count,active:count>=bond.need};});}
/** Entry-time synergy. Owning a hero without fielding it does not count; soldiers and duplicate IDs never count. */
export function applyBonds(units:UnitConfig[]):UnitConfig[]{
    if(units.some(u=>u.bondIds))return units.map(u=>({...u}));
    const active=bondProgress(units.filter(u=>u.kind==='hero').map(u=>u.visualId||u.id)).filter(p=>p.active).map(p=>p.bond);
    return units.map(u=>{
        if(u.kind!=='hero')return{...u};const id=u.visualId||u.id;const bonds=active.filter(b=>b.members.indexOf(id)>=0);
        const total=(key:'attack'|'hp'|'defense'|'energy'|'healing'|'skill',cap:number)=>Math.min(cap,bonds.reduce((n,b)=>n+(b[key]||0),0));
        return{...u,bondIds:bonds.map(b=>b.id),maxHp:Math.round(u.maxHp*(1+total('hp',.25))),attack:Math.round(u.attack*(1+total('attack',.25))),defense:Math.round(u.defense*(1+total('defense',.25))),bondEnergy:total('energy',.20),bondHealing:total('healing',.20),bondSkill:total('skill',.20)};
    });
}
