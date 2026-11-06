import type { HeroId } from './HeroCatalog';

type ExpansionChapter = readonly [id: string, name: string, place: string, scene: number, leader: HeroId, allies: readonly HeroId[], clue: string];

const EXPANSION: readonly ExpansionChapter[] = [
    ['bell', '落铃问路', '落铃', 201, 'chengpu', ['handang','mizhu'], '星台飞出一枚铜铃，响一声就换一次路牌。'],
    ['salt', '盐滩借锅', '白盐', 1, 'huanggai', ['sunshangxiang','guanhai'], '掌锅人说半斤盐能买一张地图，主公扛来了一袋。'],
    ['reeds', '芦海藏印', '芦海', 801, 'zhouyu', ['daqiao','ganning'], '丢失的通行印成了水鸟的垫脚石。'],
    ['quay', '夜渡扣船', '夜渡', 501, 'sunce', ['sunquan','taishici'], '渡口只认船牌，排在前面的偏是一只澡盆。'],
    ['grove', '竹阵翻账', '竹阵', 601, 'xunyu', ['mifang','xiaoqiao'], '竹简账本一摊开，债主站满了半座山。'],
    ['forge', '赤炉抢钉', '赤炉', 301, 'dianwei', ['xuchu','xuhuang'], '箭钉被铸成一把巨大的汤勺，营里谁都不肯认领。'],
    ['ravine', '砂谷换旗', '砂谷', 701, 'zhangliao', ['yuejin','liaohua'], '谷里的旗号全被风吹反，哨兵只好认脚印。'],
    ['snow', '雪站夺炭', '雪站', 901, 'zhangfei', ['zhenji','zhoucang'], '炭车冻在雪坡上，张飞说喊热了就能走。'],
    ['market', '空市追符', '空市', 101, 'jiaxu', ['jianyong','caiwenji'], '卖符的人留了张收据，背面写着真正的藏处。'],
    ['watch', '双垒还铃', '双垒', 201, 'lvbu', ['diaochan','guanyu'], '双垒争谁的铃声响，擂台被他们拿去挂铃了。'],
    ['stone', '石马过关', '石马', 701, 'machao', ['huangzhong','xunyu'], '关上放着一匹石马，谁能绕过它谁就先过关。'],
    ['windmill', '风车借箭', '长风', 201, 'huangyueying', ['handang','pangtong'], '风车一转就吐出木箭，修理的人还在找扳手。'],
    ['rubble', '断垣守粮', '断垣', 301, 'xuchu', ['caohong','chengpu'], '塌了一截的墙后，粮袋排得比兵还整齐。'],
    ['tidal', '潮桥抢绳', '潮桥', 501, 'ganning', ['daqiao','sunce'], '桥绳拴错了桩，过河的队伍被摆到了对岸厨房。'],
    ['heron', '鹭湾寻帖', '鹭湾', 801, 'sunshangxiang', ['zhurong','huangzhong'], '求援信绑在白鹭腿上，白鹭却去河里抓鱼了。'],
    ['ink', '墨院点将', '墨院', 101, 'simayi', ['xunyu','yuejin'], '点名册沾了墨，主公在自己的名字旁看见三个圈。'],
    ['torch', '火廊闯阵', '火廊', 301, 'zhurong', ['luxun','xiaoqiao'], '巡夜人拿错火把，敌营的灯笼全亮成了信号。'],
    ['root', '古榕护商', '古榕', 601, 'liubei', ['mifang','mizhu'], '商队把车停在古树下，醒来发现车辕被根缠住了。'],
    ['moon', '月关破幕', '月关', 901, 'diaochan', ['caiwenji','zhenji'], '城上挂着一张假月亮，背面缝着过关的暗号。'],
    ['stove', '三炉聚火', '三炉', 301, 'zhouyu', ['huangyueying','huanggai'], '三座炉子都说自己煮的粥最好，偏偏只有一把勺。'],
    ['peak', '云脊试胆', '云脊', 701, 'zhaoyun', ['liaohua','chengpu'], '山道过不去车，赵云背起了第一辆。'],
    ['mire', '苇泥拔营', '苇泥', 801, 'taishici', ['zhoucang','sunshangxiang'], '拔营时才发现营钉埋得比灶台还深。'],
    ['gourd', '空葫套阵', '葫谷', 601, 'pangtong', ['jianyong','jiaxu'], '葫芦里有回声，敌兵听见了三支不存在的队伍。'],
    ['granite', '青石争道', '青石', 201, 'xuhuang', ['dianwei','guanhai'], '两队都说石路是自己修的，石碑却刻着同一个名字。'],
    ['mill', '水磨断流', '水磨', 501, 'huangyueying', ['xiaoqiao','luxun'], '磨盘停了，排队磨豆的伙夫比军师先找到了上游。'],
    ['ironwood', '铁木夺桩', '铁木', 601, 'xuchu', ['zhangfei','huanggai'], '阵桩砍不动，只能找出是谁把铁心打了进去。'],
    ['cliff', '鹰崖挂绳', '鹰崖', 701, 'huangzhong', ['sunshangxiang','songxian'], '崖上没路，黄忠把绳子一箭送到了对面。'],
    ['drum', '沉鼓鸣营', '沉鼓', 1, 'dianwei', ['yuejin','caohong'], '鼓手听不见鼓声，因为鼓被他们埋进了沙子。'],
    ['flood', '洪渠抢闸', '洪渠', 801, 'sunquan', ['sunce','ganning'], '闸门关不上，水上漂着一排刚洗好的锅。'],
    ['archive', '百册断案', '百册', 101, 'xunyu', ['simayi','liubei'], '军报叠了百册，最薄那本记着所有假路。'],
    ['mirror', '镜谷破影', '镜谷', 901, 'zhugeliang', ['pangtong','caiwenji'], '谷里每喊一声就多一个回音，军师说不能跟回音吵架。'],
    ['dune', '黄沙改道', '黄沙', 1, 'machao', ['zhaoyun','handang'], '沙丘一夜换了位置，昨日的路标今日成了屋顶。'],
    ['dike', '石堤斗篷', '石堤', 801, 'guanyu', ['zhoucang','liaohua'], '披风卡进了闸轮，关羽只好提着半边披风出战。'],
    ['smoke', '炊烟封阵', '炊烟', 301, 'caocao', ['xuchu','zhenji'], '营外升起十股炊烟，只有一股真的在煮饭。'],
    ['reef', '碎礁争灯', '碎礁', 501, 'zhouyu', ['daqiao','taishici'], '船灯倒挂，夜巡队跟着倒影绕了两圈。'],
    ['pass', '峭关接力', '峭关', 701, 'zhangfei', ['liubei','mizhu'], '接力的令旗折在半途，张飞打算用嗓门传完。'],
    ['orchard', '野果开宴', '野果', 601, 'zhurong', ['huatuo','mifang'], '野果是给象群准备的，伙夫却先排好了碗。'],
    ['crown', '旧冠归匣', '旧冠', 101, 'lvbu', ['diaochan','jiaxu'], '旧冠被锁进匣里，打开匣子才发现钥匙就在里面。'],
    ['observatory', '高台收星', '高台', 901, 'simayi', ['zhugeliang','huangyueying'], '高台上的星图缺了一角，补上它就能找到回营的路。'],
    ['homefire', '归灶大宴', '归灶', 501, 'guanyu', ['zhangfei','liubei','huatuo'], '从第一章带来的锅终于架好，只差把最后一支守军请到桌边。'],
];

const ROUTES = [
    ['路','营','哨','垒','渡','坛','桥','关'],
    ['驿','仓','岗','寨','道','台','口','围'],
    ['坡','堡','井','院','沟','坞','堤','阵'],
] as const;

export const CAMPAIGN_EXPANSION = EXPANSION.map(([id, name, place, scene, leader, allies, clue], index) => ({
    id, name, scene, leader, clue,
    ink: ['#B68C53','#A8684D','#54887F','#766F9C','#658449'][index % 5],
    maps: ROUTES[index % ROUTES.length].map(suffix => place + suffix),
    heroes: [leader, ...allies],
}));
