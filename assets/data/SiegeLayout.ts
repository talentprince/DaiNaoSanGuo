/** One side-on world plan for gate masonry, both tower slots and the editor. */
export const SIEGE = { anchorX:300,anchorY:20,frontX:184,rearX:348,bottom:-265,top:295,approachTime:3.3,travel:460 } as const;
export function defensePosition(spot:string):{x:number;y:number} {
    if(spot==='tower-left')return{x:270,y:185};
    if(spot==='tower-right')return{x:270,y:-90};
    const i=Number(spot.slice(7));return{x:10+i%3*60,y:100-Math.floor(i/3)*220};
}
export function defenseBoardPosition(spot:string) {
    const p=defensePosition(spot);return{x:(p.x-141)*1.83,y:170+p.y*.83};
}
/** Camera travels horizontally; fortress and guards retain their world size/spacing. */
export function siegeCamera(remaining:number) {
    const t=Math.max(0,Math.min(1,remaining/SIEGE.approachTime));
    const offset=SIEGE.travel*t*t*(3-2*t);
    return {x:SIEGE.anchorX+offset,y:SIEGE.anchorY,offset,scale:1,opacity:255};
}
