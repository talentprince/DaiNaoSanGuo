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

/** Small original pictograms retain a short caption for recognition. */
export function iconButton(parent: Node, name: string, value: string, kind: 'bag'|'hero'|'growth'|'restart'|'pause'|'speed'|'auto'|'skill'|'menu'|'scene'|'sound', x:number,y:number,width:number,height:number,action:()=>void):UIButton {
    const node=panel(parent,name,x,y,width,height,'#182D45D9',18);
    const label=text(node,`${name}-label`,value,0,-height*0.24,18,'#E8D9B8',width-10);
    const icon=makeNode('Pictogram',node,0,height*0.13);const g=icon.addComponent(Graphics);if(height<80){icon.setScale(.72,.72,1);label.fontSize=15;}
    g.strokeColor=new Color('#E5C682');g.fillColor=new Color('#E5C682');g.lineWidth=3;
    if(kind==='sound'){g.moveTo(-4,-5);g.lineTo(-4,24);g.lineTo(18,29);g.lineTo(18,1);g.stroke();g.ellipse(-11,-9,10,7);g.ellipse(11,-3,10,7);g.fill();}
    else if(kind==='menu'){[-10,2,14].forEach(y=>{g.moveTo(-18,y);g.lineTo(18,y);g.stroke();});}
    else if(kind==='scene'){g.moveTo(-21,-16);g.lineTo(-21,20);g.lineTo(21,20);g.lineTo(21,-16);g.close();g.stroke();g.moveTo(-8,-16);g.lineTo(-8,8);g.lineTo(8,8);g.lineTo(8,-16);g.stroke();}
    else if(kind==='bag'){g.roundRect(-18,-12,36,30,6);g.stroke();g.roundRect(-8,17,16,9,3);g.stroke();g.moveTo(-17,1);g.lineTo(17,1);g.stroke();}
    else if(kind==='hero'){g.circle(0,12,11);g.stroke();g.moveTo(-22,-15);g.quadraticCurveTo(-20,1,0,1);g.quadraticCurveTo(20,1,22,-15);g.stroke();}
    else if(kind==='growth'){g.moveTo(-20,-14);g.lineTo(0,18);g.lineTo(20,-14);g.stroke();g.moveTo(-12,2);g.lineTo(0,20);g.lineTo(12,2);g.stroke();}
    else if(kind==='pause'){g.roundRect(-13,-14,8,34,2);g.roundRect(5,-14,8,34,2);g.fill();}
    else if(kind==='speed'){[-15,3].forEach(x=>{g.moveTo(x,-14);g.lineTo(x+17,3);g.lineTo(x,20);g.close();g.stroke();});}
    else if(kind==='auto'||kind==='restart'){g.circle(0,2,18);g.stroke();g.moveTo(17,-8);g.lineTo(23,3);g.lineTo(9,0);g.close();g.fill();}
    else{g.moveTo(-3,-21);g.lineTo(12,5);g.lineTo(1,5);g.lineTo(9,28);g.lineTo(-15,-2);g.lineTo(-4,-2);g.close();g.fill();}
    node.on(Node.EventType.TOUCH_END,action);return{node,label};
}
