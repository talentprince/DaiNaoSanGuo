export function worldBossPresentation(fieldHeight:number,id='') {
    const extra=Math.max(0,fieldHeight-1108),growth=Math.min(1.12,1+extra/2800);
    return {scale:(id==='world-zhangjiao'?3.2:3.4)*growth,y:135+Math.min(80,extra*.22),heroScale:1.08,divineScale:1.15,soldierScale:.88};
}
