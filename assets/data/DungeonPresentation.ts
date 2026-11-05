import type {ActivityMode} from './ActivityConfig';
export const DUNGEON_CARDS:readonly {mode:ActivityMode;tag:string;subtitle:string;color:string;art:string}[]=[
 {mode:'city',tag:'攻守对决',subtitle:'破开城门 · 迎战守军',color:'#E6B573',art:'city'},
 {mode:'boss',tag:'巨兽讨伐',subtitle:'三魔王轮值 · 30秒极限',color:'#C5A1EF',art:'boss'},
 {mode:'trial',tag:'三将闯阵',subtitle:'三对五 · 奇阵破局',color:'#E3A19B',art:'trial'},
 {mode:'boat',tag:'东风借宝',subtitle:'三次筹谋 · 乘浪夺宝',color:'#92D3D4',art:'boat'},
];
export function dungeonCardPosition(index:number){return{x:index%2===0?-163:163,y:205-Math.floor(index/2)*381,width:310,height:354};}
