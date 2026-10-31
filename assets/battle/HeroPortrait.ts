import { Color, Graphics, Node } from 'cc';
import { getHero, TIER_COLORS } from '../data/HeroCatalog';
import type { FormationMember } from '../data/FormationConfig';
import { makeNode } from './BattleUI';

export function portrait(parent: Node, member: FormationMember, size: number): Node {
    const node = makeNode('Portrait', parent); const g = node.addComponent(Graphics);
    const h = member.hero ? getHero(member.hero) : undefined;
    const color = h?.color || ({ sword: '#819B88', spear: '#819BAE', bow: '#B49C76' })[member.troop || 'sword'];
    const scale = size / 90;
    node.setScale(scale, scale, 1);
    g.fillColor = new Color('#1A2C42'); g.circle(0, 0, 42); g.fill();
    g.strokeColor = new Color(h ? TIER_COLORS[h.tier - 1] : '#78919C'); g.lineWidth = h && h.tier >= 3 ? 4 : 2; g.circle(0, 0, 41); g.stroke();
    g.fillColor = new Color(color); g.roundRect(-25, -29, 50, 39, 10); g.fill(); g.circle(0, 13, 26); g.fill();
    g.fillColor = new Color(member.hero === 'guanyu' ? '#D49D82' : '#EDC69B'); g.roundRect(-19, -5, 38, 29, 10); g.fill();
    g.fillColor = new Color('#213248'); g.circle(-7, 10, 2.5); g.circle(7, 10, 2.5); g.fill();
    const id = member.hero || '';
    if (['guanyu', 'zhangfei', 'caocao', 'huangzhong', 'huatuo'].indexOf(id) >= 0) {
        g.fillColor = new Color(id === 'huangzhong' || id === 'huatuo' ? '#DFE3DE' : '#253738'); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(0, -23); g.close(); g.fill();
    }
    if (id === 'lvbu') {
        g.strokeColor = new Color('#E9AE71'); g.lineWidth = 4;
        g.moveTo(-13, 30); g.quadraticCurveTo(-32, 58, -37, 32); g.stroke(); g.moveTo(13, 30); g.quadraticCurveTo(32, 58, 37, 32); g.stroke();
    } else if (id === 'zhugeliang' || id === 'simayi' || id === 'jiaxu' || id === 'sunquan') {
        g.fillColor = new Color(id === 'simayi' ? '#2D2842' : '#314865'); g.rect(-16, 27, 32, 15); g.fill();
    } else if (id === 'zhaoyun' || id === 'machao' || id === 'sunce') {
        g.fillColor = new Color('#E6EDF0'); g.moveTo(-10, 33); g.lineTo(0, 49); g.lineTo(13, 31); g.close(); g.fill();
    } else if (id === 'diaochan' || id === 'sunshangxiang') {
        g.fillColor = new Color('#E0ADC0'); g.circle(-22, 25, 8); g.circle(22, 25, 8); g.fill();
    }
    if (h?.tier === 4) { g.fillColor = new Color('#F1D383'); g.moveTo(-8, -30); g.lineTo(0, -37); g.lineTo(8, -30); g.lineTo(0, -22); g.close(); g.fill(); }
    if (!h) {
        g.strokeColor = new Color('#E0DBC2'); g.lineWidth = 3;
        if (member.troop === 'spear') { g.moveTo(27, -25); g.lineTo(27, 30); g.stroke(); g.moveTo(27, 39); g.lineTo(21, 25); g.lineTo(33, 25); g.close(); g.fillColor = new Color('#E2E9DE'); g.fill(); }
        else if (member.troop === 'bow') { g.arc(24, 0, 26, -1.15, 1.15, false); g.stroke(); g.moveTo(34, -23); g.lineTo(34, 23); g.stroke(); }
        else { g.moveTo(26, -24); g.lineTo(26, 30); g.stroke(); g.roundRect(-31, -25, 18, 28, 6); g.stroke(); }
    }
    return node;
}
