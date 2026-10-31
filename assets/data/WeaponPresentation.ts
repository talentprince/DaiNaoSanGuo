import { getHero } from './HeroCatalog';
import type { UnitConfig } from '../battle/BattleEngine';
/** Generic gear improves stats only. Identity defines the held weapon; only a valid signature adds ornament and glow. */
export function weaponPresentation(unit:Pick<UnitConfig,'id'|'visualId'|'weapon'|'signature'|'kind'>):{weapon:NonNullable<UnitConfig['weapon']>;exclusive:boolean;scale:number}{
    const id=unit.visualId||unit.id;const hero=getHero(id);const exclusive=!!hero&&unit.signature===id;
    return{weapon:hero?.weapon||unit.weapon||'sword',exclusive,scale:exclusive?1.55:unit.kind==='soldier'?1:1.12};
}
