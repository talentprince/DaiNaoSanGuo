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

export type FaceShape = 'square' | 'round' | 'long' | 'pointed' | 'oval';
export type FaceMood = 'stern' | 'squint' | 'alert' | 'kind' | 'sly' | 'roar' | 'calm';
export type FaceDetail = 'plain' | 'scar' | 'age' | 'freckles' | 'paint';
export interface FaceDesign {
    shape: FaceShape;
    mood: FaceMood;
    skin: string;
    detail: FaceDetail;
}

const face = (shape: FaceShape, mood: FaceMood, skin: string, detail: FaceDetail = 'plain'): FaceDesign =>
    ({ shape, mood, skin, detail });

const FACES: Record<string, FaceDesign> = {
    liubei: face('oval', 'kind', '#F0BA83'),
    guanyu: face('long', 'squint', '#CF7350'),
    zhangfei: face('round', 'roar', '#D9975F'),
    zhaoyun: face('pointed', 'alert', '#F2C79B'),
    zhugeliang: face('long', 'calm', '#F2C69A'),
    lvbu: face('square', 'stern', '#D99B6B', 'scar'),
    caocao: face('pointed', 'sly', '#DCAA78'),
    zhouyu: face('oval', 'sly', '#EFB783'),
    simayi: face('long', 'sly', '#D5A980', 'age'),
    huatuo: face('round', 'kind', '#E8BA90', 'age'),
    sunce: face('square', 'alert', '#E5A06C'),
    jiaxu: face('pointed', 'calm', '#CDA480', 'age'),
    sunshangxiang: face('pointed', 'alert', '#EDAD83'),
    caiwenji: face('oval', 'calm', '#F5C9A6'),
    huangyueying: face('oval', 'sly', '#E8AC84', 'freckles'),
    diaochan: face('pointed', 'calm', '#F5BFA4'),
    daqiao: face('round', 'kind', '#F2B69A', 'freckles'),
    xiaoqiao: face('pointed', 'sly', '#F4C4A8'),
    zhurong: face('square', 'stern', '#C78358', 'paint'),
    zhenji: face('long', 'calm', '#EEC6AE'),
    guanhai: face('square', 'roar', '#C89060', 'scar'),
    caohong: face('square', 'stern', '#D5A270'),
    songxian: face('long', 'squint', '#C9976D'),
    jianyong: face('oval', 'kind', '#E4B68E'),
    mifang: face('round', 'sly', '#DEA874', 'freckles'),
    chengpu: face('long', 'stern', '#CC966A', 'age'),
    liaohua: face('square', 'squint', '#D4A174', 'scar'),
    huanggai: face('square', 'stern', '#BC845F', 'age'),
    mizhu: face('round', 'kind', '#E3B183'),
    yuejin: face('pointed', 'alert', '#DDA778', 'scar'),
    handang: face('long', 'squint', '#BB8961', 'age'),
    zhoucang: face('round', 'stern', '#BC8159', 'scar'),
    xuhuang: face('square', 'stern', '#D4A47A'),
    ganning: face('pointed', 'sly', '#D49A6F', 'scar'),
    xuchu: face('round', 'roar', '#C89065'),
    huangzhong: face('long', 'stern', '#CB9B74', 'age'),
    dianwei: face('square', 'roar', '#C38054', 'scar'),
    zhangliao: face('long', 'stern', '#DCA579'),
    luxun: face('pointed', 'calm', '#F1BD90'),
    sunquan: face('round', 'stern', '#DE9C71'),
    pangtong: face('long', 'sly', '#C69168', 'freckles'),
    xunyu: face('oval', 'calm', '#EFC092'),
    taishici: face('square', 'alert', '#CE996F'),
    machao: face('pointed', 'stern', '#E5AF80', 'scar'),
    'mob-shield': face('square', 'stern', '#C7A27E'),
    'mob-spear': face('long', 'alert', '#D4A379'),
    'mob-bow': face('pointed', 'squint', '#C29265', 'freckles'),
    'mob-axe': face('round', 'roar', '#BE8159', 'scar'),
    'mob-shaman': face('long', 'calm', '#D2A997', 'age'),
    'mob-blade': face('oval', 'sly', '#D9A16D', 'paint'),
    'world-dongzhuo': face('round', 'roar', '#D49260'),
    'world-zhangjiao': face('long', 'stern', '#D2A382', 'age'),
    'world-menghuo': face('square', 'roar', '#BD8056', 'paint'),
};

/** Stable per character so battle, skill portraits and collection cards agree. */
export function faceDesign(id: string, boss = false): FaceDesign {
    return FACES[id] || (boss ? FACES['world-dongzhuo'] : FACES['mob-spear']);
}
