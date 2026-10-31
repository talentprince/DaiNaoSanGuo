import { Color, Graphics, Node, UIOpacity, UITransform } from 'cc';
import type { Label } from 'cc';
import type { BattleEngine, Unit } from './BattleEngine';
import { makeNode, text } from './BattleUI';
import { portrait } from './HeroPortrait';
import type { HeroId } from '../data/HeroCatalog';

export class SkillHud {
    readonly node: Node;
    private clock = 0;
    private entries: { unit: Unit; ring: Graphics; number: Label; opacity: UIOpacity }[] = [];
    constructor(parent: Node, engine: BattleEngine, onClick: (id: string) => void) {
        this.node = makeNode('IndividualHeroSkills', parent);
        engine.heroes.filter(u => u.kind !== 'soldier').forEach((unit, i) => {
            const cell = makeNode(`Skill-${unit.id}`, this.node, -302, 225 - i * 100);
            cell.addComponent(UITransform).setContentSize(62, 86);
            const id = (unit.visualId || unit.id) as HeroId;
            portrait(cell, { hero: id }, 50);
            const ring = makeNode('ChargeRing', cell).addComponent(Graphics);
            const number = text(cell, 'SkillCharge', '', 0, -36, 13, '#F5D58D', 66);
            text(cell, 'SkillOwner', unit.name, 0, 38, 14, '#E5D5AF', 68);
            const opacity = cell.addComponent(UIOpacity);
            this.entries.push({ unit, ring, number, opacity });
            cell.on(Node.EventType.TOUCH_END, () => onClick(unit.id));
        });
    }
    update(dt: number): void {
        this.clock += dt;
        this.entries.forEach(({ unit, ring, number, opacity }) => {
            ring.clear(); ring.strokeColor = new Color('#31485B'); ring.lineWidth = 4; ring.circle(0, 0, 29); ring.stroke();
            const ready = unit.energy >= 100 && unit.hp > 0;
            ring.strokeColor = new Color(ready ? '#FFE29A' : '#88BDB0'); ring.lineWidth = ready ? 5 : 3;
            if (unit.energy > 0) { ring.arc(0, 0, 29, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * unit.energy / 100, false); ring.stroke(); }
            if (ready) { ring.circle(0, 0, 33 + Math.sin(this.clock * 7) * 2); ring.stroke(); }
            number.string = unit.hp <= 0 ? '退场' : ready ? '点击释放' : `${Math.floor(unit.energy)}%`;
            opacity.opacity = unit.hp <= 0 ? 80 : ready ? Math.round(218 + Math.sin(this.clock * 7) * 37) : 255;
        });
    }
    destroy(): void { this.node.destroy(); }
}
