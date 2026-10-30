import { Color, Graphics, Node } from 'cc';
import { makeNode } from './BattleUI';

export type StageStyle = 'rift' | 'boss' | 'city' | 'trial' | 'boat';
export class BattleStage {
    readonly node: Node;
    private tiles: Node[] = [];
    private offset = 0;
    private style: StageStyle;
    constructor(parent: Node, style: StageStyle) {
        this.style = style;
        this.node = makeNode('BattleScenery', parent);
        const floor = this.node.addComponent(Graphics);
        floor.fillColor = new Color(style === 'boss' ? '#29223C' : style === 'city' ? '#3A3936' : style === 'boat' ? '#1C3B4C' : '#263B3B');
        floor.roundRect(-325, -320, 650, 640, 22); floor.fill();
        if (style === 'boss') {
            floor.fillColor = new Color('#382A43'); floor.ellipse(0, 100, 210, 120); floor.fill();
            floor.strokeColor = new Color('#755668'); floor.lineWidth = 3;
            [90, 150, 230].forEach(r => { floor.ellipse(0, 0, r, r * 0.55); floor.stroke(); });
            [-270, 270].forEach(x => {
                floor.fillColor = new Color('#49354C'); floor.roundRect(x - 15, -230, 30, 440, 9); floor.fill();
                floor.fillColor = new Color('#C8865B'); floor.circle(x, 210, 12); floor.fill();
                floor.fillColor = new Color('#B55E50'); floor.rect(x - 38, 150, 76, 70); floor.fill();
            });
        } else {
            floor.fillColor = new Color(style === 'boat' ? '#4A6668' : '#6A6250');
            floor.moveTo(-325, -230); floor.lineTo(325, -140); floor.lineTo(325, 220); floor.lineTo(-325, 120); floor.close(); floor.fill();
            if (style === 'trial') {
                floor.strokeColor = new Color('#B49C69'); floor.lineWidth = 2; floor.moveTo(0, -270); floor.lineTo(0, 230); floor.stroke();
                floor.ellipse(0, -10, 160, 100); floor.stroke();
            }
            for (let i = 0; i < 2; i++) {
                const tile = makeNode(`Landscape-${i}`, this.node, i * 650, 0); const g = tile.addComponent(Graphics);
                for (let j = 0; j < 9; j++) {
                    const x = -310 + j * 78;
                    const top = j % 2 === 0;
                    const y = top ? 225 : -270;
                    g.fillColor = new Color(top ? '#35534B' : '#455342');
                    g.moveTo(x - 32, y - 25); g.lineTo(x, y + 37 + j % 3 * 7); g.lineTo(x + 35, y - 25); g.close(); g.fill();
                    g.fillColor = new Color('#8C8D75'); g.ellipse(x + 12, top ? 155 : -208, 8 + j % 3 * 2, 4); g.fill();
                    if (style === 'boat') {
                        g.strokeColor = new Color('#7CABB9'); g.lineWidth = 2;
                        g.moveTo(x - 15, y); g.lineTo(x + 18, y + 3); g.stroke();
                    }
                }
                this.tiles.push(tile);
            }
        }
    }
    update(dt: number, marching: boolean): void {
        if ((this.style === 'rift' && marching) || this.style === 'boat') {
            this.offset = (this.offset + dt * (this.style === 'boat' ? 13 : 52)) % 650;
            this.tiles.forEach((tile, i) => tile.setPosition(i * 650 - this.offset, 0, 0));
        }
    }
    destroy(): void { this.node.destroy(); }
}
