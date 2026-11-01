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
