export type SkillElement = 'lightning'|'blizzard'|'fire'|'wind'|'poison'|'heal'|'guard'|'slash';
export const FEMALE_HEROES = ['sunshangxiang','caiwenji','huangyueying','diaochan','daqiao','xiaoqiao','zhurong','zhenji'];
export function isFemaleHero(id:string):boolean { return FEMALE_HEROES.indexOf(id)>=0; }
const PALETTE:Record<string,string>={guanyu:'#168D63',liubei:'#D1A541',zhangfei:'#C95332',zhaoyun:'#58A7ED',zhugeliang:'#8054C9',lvbu:'#C73148',caocao:'#4D3E92',zhouyu:'#ED6736',simayi:'#5850A1',huatuo:'#4FB58D',sunce:'#EB972F',diaochan:'#D65C9A',sunshangxiang:'#C85764',caiwenji:'#A884CB',huangyueying:'#C4A445',daqiao:'#EB846B',xiaoqiao:'#75BFE4',zhurong:'#DF6334',zhenji:'#6D93D6'};
export function heroColor(id:string,fallback='#8CA3B6'):string{return PALETTE[id]||fallback;}
export function heroElement(id:string,tactic?:string):SkillElement{
    if(tactic==='heal')return'heal';if(tactic==='guard')return'guard';
    if(['zhouyu','luxun','zhurong','sunshangxiang'].indexOf(id)>=0)return'fire';
    if(id==='xiaoqiao')return'blizzard';if(id==='jiaxu')return'poison';
    if(['zhugeliang','zhaoyun','sunce'].indexOf(id)>=0)return'lightning';
    if(['guanyu','lvbu','pangtong'].indexOf(id)>=0)return'wind';return'slash';
}
export const ELEMENT_NAMES:Record<SkillElement,string>={lightning:'雷霆',blizzard:'冰雪·减速',fire:'烈焰·灼烧',wind:'风暴',poison:'毒雾·抑疗',heal:'回春',guard:'护盾',slash:'斩击'};
