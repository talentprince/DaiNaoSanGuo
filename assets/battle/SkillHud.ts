import { Color, Graphics, Node, UIOpacity, UITransform } from 'cc';
import type { Label } from 'cc';
import type { BattleEngine, Unit } from './BattleEngine';
import { makeNode, text } from './BattleUI';
import { portrait } from './HeroPortrait';
import { CHAPTER_PROTAGONIST_ID } from '../data/ChapterConfig';
import type { HeroId } from '../data/HeroCatalog';

export class SkillHud {
    readonly node: Node;
    private clock = 0;
    private entries: { unit: Unit; ring: Graphics; number: Label; opacity: UIOpacity }[] = [];
    constructor(parent: Node, private engine: BattleEngine, onClick: (id: string) => void) {
        this.node = makeNode('IndividualHeroSkills', parent);
        engine.heroes.filter(u => u.kind !== 'soldier').forEach((unit, i) => {
            const cell = makeNode(`Skill-${unit.id}`, this.node, -302, 225 - i * 100);
            cell.addComponent(UITransform).setContentSize(62, 86);
            const id = unit.visualId || unit.id;
            portrait(cell, id === CHAPTER_PROTAGONIST_ID ? { protagonist: true } : { hero: id as HeroId }, 50);
            const ring = makeNode('ChargeRing', cell).addComponent(Graphics);
            const number = text(cell, 'SkillCharge', '', 0, -36, 14, '#FFF1BD', 66);
            const name = text(cell, 'SkillOwner', unit.name, 0, 38, 15, '#FFF1BD', 68);
            for (const label of [number, name]) {
                label.enableOutline = true;
                label.outlineColor = new Color('#152238');
                label.outlineWidth = 2;
            }
            const opacity = cell.addComponent(UIOpacity);
            this.entries.push({ unit, ring, number, opacity });
            cell.on(Node.EventType.TOUCH_END, () => onClick(unit.id));
        });
    }
    update(dt: number): void {
        this.clock += dt;
        this.entries.forEach(({ unit, ring, number, opacity }) => {
            ring.clear(); ring.strokeColor = new Color('#31485B'); ring.lineWidth = 4; ring.circle(0, 0, 29); ring.stroke();
            const state=this.engine.skillState(unit.id),queued=this.engine.isSkillQueued(unit.id);
            const ready = state==='ready';
            ring.strokeColor = new Color(ready ? '#FFE29A' : '#718594'); ring.lineWidth = ready ? 5 : 3;
            if (unit.energy > 0) { ring.arc(0, 0, 29, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * unit.energy / 100, false); ring.stroke(); }
            if (ready) { ring.fillColor=new Color('#FFE29A66');ring.circle(0,0,34);ring.fill();ring.strokeColor=new Color('#FFF5C6');ring.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4+this.clock*.7;ring.moveTo(Math.cos(a)*34,Math.sin(a)*34);ring.lineTo(Math.cos(a)*39,Math.sin(a)*39);ring.stroke();} ring.circle(0, 0, 33 + Math.sin(this.clock * 7) * 2); ring.stroke(); }
            number.string = state==='dead'?'退场':state==='ended'?'待下一战':queued?'已预约':state==='ready'?(this.engine.autoSkill?'自动待放':'点击释放'):state==='energy'?`${Math.floor(unit.energy)}%`:state==='paused'?'暂停中':state==='finale'?'终结中':'接战后放';
            opacity.opacity = unit.hp <= 0 ? 70 : ready ? Math.round(218 + Math.sin(this.clock * 7) * 37) : 255;
        });
    }
    destroy(): void { this.node.destroy(); }
}
