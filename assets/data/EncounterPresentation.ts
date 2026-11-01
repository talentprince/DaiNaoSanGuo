/** City masonry never rides the enemy formation's entrance translation. */
export function encounterPresentation(mode: 'main' | 'city' | 'other', approach: number, warning = 0, transitioning = false) {
    if (mode === 'city') return { enemyX: 0, enemyVisible: approach <= 1.05, marching: approach > 0 };
    if (mode === 'main') return { enemyX: Math.pow(Math.min(1, Math.max(0, approach) / 1.1),2) * 260,
        enemyVisible: warning <= 0 && approach <= 1.1,
        marching: warning <= 0 && (approach > 0 || transitioning) };
    return { enemyX: 0, enemyVisible: true, marching: false };
}

/** Fixed fortress anchor. Perspective changes with camera approach, never with troop movement. */
export function cityFortressPresentation(remaining:number) {
    const progress=Math.max(0,Math.min(1,1-remaining/3.3));
    const eased=progress*progress*(3-2*progress);
    return { x:300,y:20,scale:.38+eased*.62,opacity:Math.round(160+95*eased) };
}
