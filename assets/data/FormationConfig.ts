import { defensePosition,defenseBoardPosition } from './SiegeLayout';
import { getHero } from './HeroCatalog';
import type { HeroId } from './HeroCatalog';

export type FormationMode = 'main' | 'trial' | 'defense';
export type Troop = 'sword' | 'spear' | 'bow';
export interface FormationMember { hero?: HeroId; troop?: Troop; }
export interface FormationEntry extends FormationMember { spot: string; }
export interface FormationSpot { id: string; x: number; y: number; tower?: boolean; }
export const FORMATION_SPOTS: FormationSpot[] = Array.from({ length: 9 }, (_, i) => ({ id: `r${Math.floor(i / 3)}c${i % 3}`, x: (i % 3 - 1) * 200, y: 310 - Math.floor(i / 3) * 150 }));
export const COMPANION_CAPACITY = 4;
export type ChapterMember = FormationMember | { protagonist: true };
export interface ChapterFormation { protagonistSpot: string; companions: FormationEntry[]; }

export function chapterFormationFromLegacy(entries: readonly FormationEntry[], preferred?: string | null): ChapterFormation {
    const protagonistSpot = (entries.find(entry => entry.spot === preferred)
        || entries.find(entry => entry.spot === 'r1c2') || entries.find(entry => entry.spot.endsWith('c2')) || entries[0])?.spot ?? 'r1c2';
    return { protagonistSpot, companions: entries.filter(entry => entry.spot !== protagonistSpot).slice(0, COMPANION_CAPACITY).map(entry => ({ ...entry })) };
}

export function validateChapterFormation(formation: ChapterFormation, owned: readonly HeroId[]): string | null {
    if (!FORMATION_SPOTS.some(spot => spot.id === formation.protagonistSpot)) return '主公必须在一个有效阵位';
    const companions = formation.companions;
    if (!Array.isArray(companions) || companions.length > COMPANION_CAPACITY) return '最多上阵4名随从，武将和小兵共用席位';
    return validateFormation(companions, owned, 'main', false)
        || (companions.some(entry => entry.spot === formation.protagonistSpot) ? '主公阵位已被占用' : null);
}

export function moveChapterMember(formation: ChapterFormation, member: ChapterMember, destination: string | null, source?: string): ChapterFormation {
    const { protagonistSpot, companions } = formation;
    if (destination && !FORMATION_SPOTS.some(spot => spot.id === destination)) throw new Error('请放入一个有效阵位');
    if ('protagonist' in member) {
        if (!destination) throw new Error('主公必须上场，可以换位');
        return { protagonistSpot: destination, companions: companions.map(entry => entry.spot === destination ? { ...entry, spot: protagonistSpot } : entry) };
    }
    const from = source ?? (member.hero ? companions.find(entry => entry.hero === member.hero)?.spot : undefined);
    if (!destination) return { protagonistSpot, companions: companions.filter(entry => entry.spot !== from) };
    if (destination === protagonistSpot) {
        if (!from) throw new Error('主公必须上场，请选其他阵位');
        return { protagonistSpot: from, companions: companions.map(entry => entry.spot === from ? { ...entry, spot: destination } : entry) };
    }
    const displaced = companions.find(entry => entry.spot === destination);
    const placed = companions.filter(entry => entry.spot !== from && entry.spot !== destination);
    if (displaced && from && from !== destination) placed.push({ ...displaced, spot: from });
    placed.push({ ...member, spot: destination });
    return { protagonistSpot, companions: placed };
}

export const DEFENSE_SPOTS: FormationSpot[] = ['tower-left','tower-right',...Array.from({length:6},(_,i)=>`ground-${i}`)].map(id=>({id,...defenseBoardPosition(id),tower:id.startsWith('tower-')}));
export const capacity = (mode: FormationMode): number => mode === 'trial' ? 3 : 5;
export const spotsFor = (mode: FormationMode): FormationSpot[] => mode === 'defense' ? DEFENSE_SPOTS : FORMATION_SPOTS;
export const isTroop = (v: unknown): v is Troop => v === 'sword' || v === 'spear' || v === 'bow';

export function validateFormation(entries: readonly FormationEntry[], owned: readonly HeroId[], mode: FormationMode, complete = true): string | null {
    if (!Array.isArray(entries) || entries.length > capacity(mode) || (complete && entries.length !== capacity(mode))) return `阵容需要${capacity(mode)}人，空位可以用小兵补齐`;
    const spots = spotsFor(mode);
    const occupied = new Set<string>(); const heroes = new Set<string>();
    for (const entry of entries) {
        if (!entry || typeof entry.spot !== 'string' || !spots.some(s => s.id === entry.spot) || occupied.has(entry.spot)) return '阵位无效或重复';
        occupied.add(entry.spot);
        if (!!entry.hero === !!entry.troop) return '每个阵位只能放一名武将或一种小兵';
        if (entry.hero) {
            if (!getHero(entry.hero) || owned.indexOf(entry.hero) < 0 || heroes.has(entry.hero)) return '只能使用已拥有且不重复的武将';
            heroes.add(entry.hero);
        } else if (!isTroop(entry.troop)) return '小兵兵种无效';
    }
    if (mode === 'trial') {
        if (entries.filter(e => e.hero && getHero(e.hero)!.tier === 5).length > 1) return '三将最多1名神将';
        if (entries.filter(e => e.hero && [3, 4].indexOf(getHero(e.hero)!.tier) >= 0).length > 2) return '名将与传奇合计最多上阵2名';
    }
    if (complete && mode === 'defense' && (!occupied.has('tower-left') || !occupied.has('tower-right'))) return '守城需要2人站城上，另外3人可在城下布置';
    return null;
}
export function formationHeroes(entries: readonly FormationEntry[]): HeroId[] { return entries.filter(e => e.hero).map(e => e.hero!); }

export function arrangeParty(ids: readonly HeroId[], mode: FormationMode, troop: 'mixed' | Troop = 'mixed', wallHeroes: readonly HeroId[] = []): FormationEntry[] {
    const entries: FormationEntry[] = [];
    const available = spotsFor(mode);
    const add = (member: FormationMember, preferred: string[]) => {
        const id = preferred.concat(available.map(s => s.id)).find(spot => available.some(s => s.id === spot) && !entries.some(e => e.spot === spot));
        if (id && entries.length < capacity(mode)) entries.push({ ...member, spot: id });
    };
    if (mode === 'defense') {
        const upper = (wallHeroes.length ? wallHeroes.filter(id => ids.indexOf(id) >= 0) : [...ids]).slice(0, 2);
        upper.forEach((hero, i) => add({ hero }, [i === 0 ? 'tower-left' : 'tower-right']));
        ['tower-left', 'tower-right'].forEach(spot => { if (!entries.some(e => e.spot === spot)) add({ troop: 'bow' }, [spot]); });
    }
    ids.slice(0, capacity(mode)).forEach(hero => {
        if (entries.some(e => e.hero === hero)) return;
        const tactic = getHero(hero)!.tactic;
        add({ hero }, mode === 'defense' ? ['ground-1', 'ground-3', 'ground-5', 'ground-0', 'ground-2', 'ground-4']
            : tactic === 'guard' ? ['r1c2', 'r0c2', 'r2c2'] : tactic === 'heal' || tactic === 'volley' ? ['r0c0', 'r2c0', 'r1c0'] : ['r0c1', 'r2c1', 'r1c1']);
    });
    let i = 0;
    while (entries.length < capacity(mode)) {
        const type = troop === 'mixed' ? (['sword', 'spear', 'bow'] as const)[i++ % 3] : troop;
        add({ troop: type }, mode === 'defense' ? ['ground-1', 'ground-3', 'ground-5', 'ground-0', 'ground-2', 'ground-4'] : ['r0c2', 'r2c2', 'r1c0', 'r1c1', 'r0c0']);
    }
    return entries;
}
export function completeFormation(entries: readonly FormationEntry[], mode: FormationMode): FormationEntry[] {
    const result = entries.map(e => ({ ...e }));
    if (mode === 'defense') {
        for (const spot of ['tower-left', 'tower-right']) {
            if (!result.some(e => e.spot === spot)) {
                if (result.length >= 5) throw new Error('请为城上2人留出阵位，城下最多3人');
                result.push({ spot, troop: 'bow' });
            }
        }
    }
    const order = spotsFor(mode).map(s => s.id);
    const troops: Troop[] = ['sword', 'spear', 'bow'];
    let i = 0;
    for (const spot of order) {
        if (result.length >= capacity(mode)) break;
        if (!result.some(e => e.spot === spot)) result.push({ spot, troop: troops[i++ % 3] });
    }
    return result;
}
export function autoFormation(owned: readonly HeroId[], mode: FormationMode): FormationEntry[] {
    const ranked = [...owned].sort((a, b) => {
        const ha = getHero(a)!; const hb = getHero(b)!;
        return hb.tier - ha.tier || (hb.attack * 8 + hb.maxHp) - (ha.attack * 8 + ha.maxHp);
    });
    const chosen: HeroId[] = [];
    const accept = (id: HeroId) => {
        if (chosen.indexOf(id) >= 0 || chosen.length >= capacity(mode)) return false;
        if (mode === 'trial') {
            const tier = getHero(id)!.tier;
            if (tier === 5 && chosen.some(h => getHero(h)!.tier === 5)) return false;
            if ((tier === 3 || tier === 4) && chosen.filter(h => [3, 4].indexOf(getHero(h)!.tier) >= 0).length >= 2) return false;
        }
        chosen.push(id); return true;
    };
    const tank = ranked.find(id => getHero(id)!.tactic === 'guard'); if (tank) accept(tank);
    for (const id of ranked.filter(id => getHero(id)!.tactic === 'heal')) if (accept(id)) break;
    ranked.forEach(accept);
    const wall = mode === 'defense' ? [...chosen].sort((a, b) => Number(getHero(b)!.weapon === 'bow' || getHero(b)!.weapon === 'fan') - Number(getHero(a)!.weapon === 'bow' || getHero(a)!.weapon === 'fan')).slice(0, 2) : [];
    return arrangeParty(chosen, mode, 'mixed', wall);
}

/** Battle positions are discrete and independent from the drag-board's display coordinates. */
export function battlePosition(spot: string, mode: 'main' | 'trial' | 'boss' | 'city', enemy = false): { x: number; y: number } {
    if (spot.startsWith('tower-')||spot.startsWith('ground-')) return defensePosition(spot);
    const match = /^r([0-2])c([0-2])$/.exec(spot);
    const row = match ? Number(match[1]) : 1; const col = match ? Number(match[2]) : 1;
    if (mode === 'boss') return { x: (col - 1) * 160, y: -105 - row * 104 };
    return { x: enemy ? 215 - col * 76 : -215 + col * 76, y: 150 - row * 160 };
}

export function chapterAllyPosition(spot: string, mode: 'main' | 'boss' | 'city'): { x: number; y: number } {
    const position = battlePosition(spot, mode);
    const column = /^r[0-2]c([0-2])$/.exec(spot)?.[1];
    if (mode !== 'boss' && column !== undefined) position.y += (Number(column) - 1) * 58;
    return position;
}

/** Preserve saved positions when tier changes invalidate an old trial lineup. Excess elite heroes become troops. */
export function repairFormation(entries: readonly FormationEntry[], owned: readonly HeroId[], mode: FormationMode): FormationEntry[] {
    const repaired: FormationEntry[] = [];
    for (const entry of entries.slice(0, capacity(mode))) {
        if (!entry || !spotsFor(mode).some(s => s.id === entry.spot) || repaired.some(e => e.spot === entry.spot)) continue;
        const candidate: FormationEntry = entry.hero && owned.indexOf(entry.hero) >= 0 ? { hero: entry.hero, spot: entry.spot } : { troop: isTroop(entry.troop) ? entry.troop : 'sword', spot: entry.spot };
        if (validateFormation([...repaired, candidate], owned, mode, false)) repaired.push({ spot: entry.spot, troop: 'spear' });
        else repaired.push(candidate);
    }
    return completeFormation(repaired, mode);
}
