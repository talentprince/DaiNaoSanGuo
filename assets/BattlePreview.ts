import {
    _decorator, Color, Component, Graphics, Label, Layers,
    Node, ResolutionPolicy, UITransform, view,
} from 'cc';

const { ccclass } = _decorator;

/** 首次运行检查画面。战斗规则将在后续任务独立实现。 */
@ccclass('BattlePreview')
export class BattlePreview extends Component {
    start(): void {
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
        const root = this.makeNode('Preview', this.node);
        root.addComponent(UITransform).setContentSize(720, 1280);

        this.panel(root, 'Background', 0, 0, 720, 1280, '#111E30', 0);
        this.panel(root, 'TopAccent', 0, 632, 720, 16, '#D8B577', 0);
        this.panel(root, 'Version', 0, 488, 216, 48, '#28374A', 24);
        this.label(root, 'VersionText', 'DEMO 0.1 · 首次预览', 0, 488, 22, '#E5C58F', 260);
        this.label(root, 'Title', '呆脑三国', 0, 375, 76, '#F5E7CC', 660);
        this.label(root, 'Tagline', '呆萌武将，大闹三国！', 0, 294, 28, '#A9B6C7', 650);
        this.label(root, 'TeamHeading', '初 始 阵 容', 0, 162, 24, '#E5C58F', 650);

        const heroes = [
            { name: '关羽', role: '输出', color: '#519E80' },
            { name: '张飞', role: '坦克', color: '#B17A61' },
            { name: '赵云', role: '输出', color: '#6C9EC7' },
            { name: '诸葛亮', role: '谋士', color: '#9A88BC' },
            { name: '刘备', role: '辅助', color: '#C2A15F' },
        ];
        heroes.forEach((hero, index) => {
            const x = (index - 2) * 130;
            const card = this.panel(root, `Hero-${index}`, x, -6, 116, 234, '#233248', 18);
            const portrait = this.makeNode('Placeholder', card);
            portrait.setPosition(0, 42, 0);
            portrait.addComponent(UITransform).setContentSize(82, 90);
            const art = portrait.addComponent(Graphics);
            art.fillColor = new Color(hero.color);
            art.roundRect(-35, -38, 70, 65, 22);
            art.fill();
            art.circle(0, 22, 26);
            art.fill();
            art.fillColor = new Color('#162235');
            art.circle(-9, 25, 3);
            art.circle(9, 25, 3);
            art.fill();
            this.label(card, 'Name', hero.name, 0, -49, 25, '#F3EBDD', 112);
            this.label(card, 'Role', hero.role, 0, -86, 20, '#A9B6C7', 112);
        });

        this.panel(root, 'ReadyPanel', 0, -268, 620, 138, '#1D3A3B', 20);
        this.label(root, 'Ready', '开发环境已就绪', 0, -244, 32, '#A9DEC5', 580);
        this.label(root, 'ReadyDetail', 'Cocos Creator 3.8.8 · 2D 竖屏', 0, -292, 22, '#B8CECB', 580);
        this.label(root, 'Next', '下一步：自动攻击、血条与胜负结算', 0, -414, 24, '#ABB7C8', 660);
        this.label(root, 'PlaceholderNotice', '当前为占位角色展示，尚未实现战斗', 0, -552, 20, '#71829A', 660);
    }

    private makeNode(name: string, parent: Node): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.parent = parent;
        return node;
    }

    private panel(parent: Node, name: string, x: number, y: number,
        width: number, height: number, color: string, radius: number): Node {
        const node = this.makeNode(name, parent);
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(color);
        if (radius > 0) graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        else graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
        return node;
    }

    private label(parent: Node, name: string, text: string, x: number, y: number,
        size: number, color: string, width: number): void {
        const node = this.makeNode(name, parent);
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, size * 1.8);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size * 1.4;
        label.color = new Color(color);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
    }
}
