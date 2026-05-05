// 诗句数据字典（含平仄模式、触发效果与说明）
// 注意：trigger 在 Combat 上下文中调用，依赖 Combat 已加载；
// 但运行时调用即可，不必在脚本加载时就要求 Combat 存在。
const PoetryDB = {
    wuGouShuangXueMing: {
        id: 'wuGouShuangXueMing',
        text: '吴钩霜雪明',
        source: '李白《侠客行》',
        // 五字平仄（与 Combat.pzHistory 中的 cd.type 一致：'平' / '仄'）
        pattern: ['平', '平', '平', '仄', '平'],
        effectDesc: '对所有敌人造成 30 点伤害',
        trigger: function () {
            if (typeof Combat !== 'undefined' && Combat.dealDmgAll) {
                Combat.dealDmgAll(30, true);
            }
        }
    },
    ganShi: {
        id: 'ganShi',
        text: '感时花溅泪',
        source: '杜甫《春望》',
        pattern: null,
        effectDesc: '尚未参悟其用',
        trigger: null
    }
};
