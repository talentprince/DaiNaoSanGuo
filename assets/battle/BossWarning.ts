import { BossWarningState } from '../data/BossWarningState';
import { Color, Graphics, Node, UIOpacity } from 'cc';
import { makeNode, text } from './BattleUI';
/** Outside the battlefield mask: the warning really covers the full phone canvas. */
export class BossWarning {
    readonly node: Node;
    private ink: Graphics;
    private opacity: UIOpacity;
    private state=new BossWarningState();
    constructor(parent: Node) {
        this.node = makeNode('FullScreenBossWarning', parent);
        this.ink = this.node.addComponent(Graphics);
        this.opacity = this.node.addComponent(UIOpacity);
        text(this.node, 'BossAlarmTitle', '首 领 来 袭', 0, 90, 64, '#FFF4D1', 680);
        text(this.node, 'BossAlarmHint', '前方杀气很呆！', 0, 15, 29, '#FFF2DD', 640);
        this.node.active = false;
    }
    resize(width: number, height: number): void {
        const g = this.ink; g.clear();
        g.fillColor = new Color('#981E393D'); g.rect(-width / 2, -height / 2, width, height); g.fill();
        g.strokeColor = new Color('#D65A6166'); g.lineWidth = 12; g.rect(-width / 2 + 12, -height / 2 + 12, width - 24, height - 24); g.stroke();
        g.fillColor = new Color('#24152799'); g.moveTo(-width / 2, 150); g.lineTo(width / 2, 180); g.lineTo(width / 2, -50); g.lineTo(-width / 2, -85); g.close(); g.fill();
    }
    show(duration = 1.25): void { this.state.show(duration); this.node.active = true; this.opacity.opacity=this.state.opacity; }
    clear(): void { this.state.clear(); this.node.active = false; }
    update(dt: number,covered=false): void {
        this.state.advance(dt,covered);this.node.active=this.state.active;this.opacity.opacity=this.state.opacity;
    }
}
