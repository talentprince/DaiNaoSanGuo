import { Color, Graphics, Label, Layers, Node, UITransform } from 'cc';

export function makeNode(name: string, parent: Node, x = 0, y = 0): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.setPosition(x, y, 0);
    return node;
}

export function panel(parent: Node, name: string, x: number, y: number,
    width: number, height: number, color: string, radius = 16): Node {
    const node = makeNode(name, parent, x, y);
    node.addComponent(UITransform).setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(color);
    if (radius > 0) graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    else graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
    return node;
}

export function text(parent: Node, name: string, value: string, x: number, y: number,
    size = 24, color = '#EEE8DB', width = 650): Label {
    const node = makeNode(name, parent, x, y);
    node.addComponent(UITransform).setContentSize(width, size * 1.6);
    const label = node.addComponent(Label);
    label.string = value;
    label.fontSize = size;
    label.lineHeight = size * 1.3;
    label.color = new Color(color);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return label;
}

export interface UIButton { node: Node; label: Label; }

export function button(parent: Node, name: string, value: string, x: number, y: number,
    width: number, height: number, color: string, action: () => void): UIButton {
    const node = panel(parent, name, x, y, width, height, color, 15);
    const label = text(node, `${name}-label`, value, 0, 0, 24, '#F5ECD9', width - 16);
    node.on(Node.EventType.TOUCH_END, action);
    return { node, label };
}

export function bar(graphics: Graphics, ratio: number, width: number, height: number, color: string): void {
    graphics.clear();
    graphics.fillColor = new Color('#122033');
    graphics.roundRect(-width / 2, -height / 2, width, height, height / 2);
    graphics.fill();
    const fill = Math.max(0, Math.min(1, ratio)) * (width - 4);
    if (fill > 0) {
        graphics.fillColor = new Color(color);
        graphics.rect(-width / 2 + 2, -height / 2 + 2, fill, height - 4);
        graphics.fill();
    }
}
