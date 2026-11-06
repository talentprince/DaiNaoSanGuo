import { Node } from 'cc';
import { HERO_CATALOG } from '../data/HeroCatalog';
import type { ProgressStore } from './ProgressStore';
import { button, panel, text } from './BattleUI';
import { heroCard, heroDetails, heroTierLabel, showHeroTierFilter } from './HeroCard';

import type { HeroTierFilter } from './HeroCard';

export class MetaPanel {
    readonly node: Node;
    private page = 0;
    private tier: HeroTierFilter = 'all';

    constructor(parent: Node, private store: ProgressStore, private onClose: () => void) {
        this.node = panel(parent, 'AdventureHall', 0, 0, 720, 1280, '#0C1729', 0);
        this.node.on(Node.EventType.TOUCH_END, () => {});
        this.render();
    }

    private render(): void {
        this.node.destroyAllChildren();
        const progress = this.store.progress;
        text(this.node, 'HallTitle', '随 将 图 鉴', 0, 548, 38, '#EACD96');
        text(this.node, 'RosterSummary', `已结识 ${progress.owned.length}/${HERO_CATALOG.length} · 随主公 Lv.${progress.heroLevel}`, 0, 482, 23, '#C7CCA8', 650);
        button(this.node, 'CatalogTierFilter', `品级 · ${heroTierLabel(this.tier)} ›`, 0, 426, 300, 48, '#354D63', () =>
            showHeroTierFilter(this.node, this.tier, tier => { this.tier = tier; this.page = 0; this.render(); }));
        const list = HERO_CATALOG.filter(h => progress.owned.indexOf(h.id) >= 0)
            .sort((a, b) => b.tier - a.tier || (progress.stars[b.id] || 1) - (progress.stars[a.id] || 1))
            .concat(HERO_CATALOG.filter(h => progress.owned.indexOf(h.id) < 0))
            .filter(hero => this.tier === 'all' || hero.tier === this.tier);
        const pages = Math.max(1, Math.ceil(list.length / 6));
        list.slice(this.page * 6, this.page * 6 + 6).forEach((hero, i) => heroCard(this.node, this.store, hero.id,
            (i % 3 - 1) * 216, 244 - Math.floor(i / 3) * 300, 200, 270, progress.owned.indexOf(hero.id) >= 0 ? hero.role : '未结识',
            () => heroDetails(this.node, this.store, hero.id, () => this.render())));
        const turn = (step: number) => { this.page = (this.page + step + pages) % pages; this.render(); };
        button(this.node, 'PagePrev', '上一页', -230, -318, 150, 52, '#2A4058', () => turn(-1));
        text(this.node, 'PageCount', `${this.page + 1} / ${pages}`, 0, -318, 20, '#91AAC2', 200);
        button(this.node, 'PageNext', '下一页', 230, -318, 150, 52, '#2A4058', () => turn(1));
        text(this.node, 'CatalogSource', '战图首通与定向掉落可获得随将', 0, -421, 19, '#CBDBBC', 660);
        button(this.node, 'CloseHall', '返回', 0, -554, 560, 64, '#3E5D71', () => { this.node.destroy(); this.onClose(); });
    }
}
