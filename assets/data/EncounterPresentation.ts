/** City masonry never rides the enemy formation's entrance translation. */
export function encounterPresentation(mode: 'main' | 'city' | 'other', approach: number, warning = 0, transitioning = false) {
    if (mode === 'city') return { enemyX: 0, enemyVisible: true, marching: approach > 0 };
    if (mode === 'main') return { enemyX: Math.pow(Math.min(1, Math.max(0, approach) / 1.1),2) * 260,
        enemyVisible: warning <= 0 && approach <= 1.1,
        marching: warning <= 0 && (approach > 0 || transitioning) };
    return { enemyX: 0, enemyVisible: true, marching: false };
}

/** Shared side-on camera, no perspective scaling. */
export {siegeCamera as cityFortressPresentation} from './SiegeLayout';

/** Keep melee units spread across the formation while both sides close on the same lane. */
export function meleeContactX(siege: boolean, ally: boolean, start: number): number {
    if (siege) return ally ? -116 + (start + 215) * .88 : Math.min(start, 142 + Math.max(0, start - 142) * .24);
    return ally ? -148 + (start + 215) * .88 : 72 + Math.max(0, start - 50) * .27;
}

export function approachX(start: number, contact: number, remaining: number, duration: number): number {
    if (remaining <= 0 || duration <= 0) return contact;
    const fraction = 1 - Math.min(1, remaining / duration);
    return start + (contact - start) * fraction;
}
