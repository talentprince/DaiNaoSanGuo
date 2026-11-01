export interface MainlineTheme {
    name: string; sky: string; haze: string; far: string; near: string; ground: string; road: string; ink: string;
    feature: 'flags'|'cliffs'|'forts'|'orchard'|'river'|'camp'|'fire'|'bamboo'|'bridges'|'stars';
}
export const MAINLINE_THEMES: readonly MainlineTheme[] = [
    {name:'黄巾荒野',sky:'#F6C686',haze:'#E6AD76',far:'#AB8D74',near:'#7C6D63',ground:'#D6A86A',road:'#EBC88A',ink:'#6B5645',feature:'flags'},
    {name:'汜水石关',sky:'#E9BC93',haze:'#CDA18E',far:'#9B7D7A',near:'#665F6E',ground:'#B38A72',road:'#D0A184',ink:'#584955',feature:'forts'},
    {name:'虎牢风沙',sky:'#EB9F6B',haze:'#D58C63',far:'#B06D54',near:'#7C514B',ground:'#C78A56',road:'#E6B277',ink:'#67483D',feature:'cliffs'},
    {name:'徐州春野',sky:'#B9D9BD',haze:'#B6D7A5',far:'#7CA58B',near:'#527D68',ground:'#8FAD6B',road:'#D5C395',ink:'#466A4D',feature:'orchard'},
    {name:'江东水乡',sky:'#A9D8DA',haze:'#9DCBD0',far:'#709DAA',near:'#477B91',ground:'#729B93',road:'#B4C8A5',ink:'#3B6575',feature:'river'},
    {name:'官渡营火',sky:'#D19996',haze:'#AF8297',far:'#7D6F89',near:'#514F70',ground:'#92756D',road:'#BE9E85',ink:'#514657',feature:'camp'},
    {name:'赤壁烈江',sky:'#AD6A76',haze:'#BF746D',far:'#785775',near:'#493F64',ground:'#725866',road:'#B58370',ink:'#4B3654',feature:'fire'},
    {name:'荆襄竹海',sky:'#ABD0BA',haze:'#91B4A6',far:'#618E81',near:'#365F60',ground:'#70967A',road:'#B6BE91',ink:'#34584A',feature:'bamboo'},
    {name:'巴蜀云栈',sky:'#C6C7E2',haze:'#B6B8CD',far:'#898CAB',near:'#5A6485',ground:'#8A9A8E',road:'#C7C1A3',ink:'#4D5C6B',feature:'bridges'},
    {name:'五丈星原',sky:'#282D57',haze:'#464974',far:'#373E64',near:'#282F50',ground:'#525C77',road:'#7F8398',ink:'#242B49',feature:'stars'},
];
export function mainlineTheme(stage: number): MainlineTheme {
    if (!Number.isInteger(stage) || stage < 1 || stage > 999) throw new Error('主线主题关卡无效');
    return MAINLINE_THEMES[Math.floor((stage - 1) / 100)];
}
export function panoramaItems(distance: number, spacing: number, width: number): { index: number; x: number; seed: number }[] {
    const first=Math.floor((distance-width/2)/spacing)-1, last=Math.ceil((distance+width/2)/spacing)+1;
    const items=[];
    for(let index=first;index<=last;index++)items.push({index,x:index*spacing-distance,seed:((Math.imul(index,1274126177)>>>0)%997)/997});
    return items;
}
