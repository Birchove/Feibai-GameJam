// Item data dictionary
const WeaponDB = {
    xiuJian: { id: 'xiuJian', name: '\u7ee3\u5251', str: 6, def: 6 },
    xuanYuan: { id: 'xuanYuan', name: '\u8f69\u8f95', str: 10, def: 10 }
};

const RelicDB = {
    baguaMirror: { id: 'baguaMirror', name: '\u3010\u516b\u5366\u62a4\u5fc3\u955c\u3011', desc: '\u7b2cn\u56de\u5408\u5f00\u59cb\u65f6\u83b7\u5f9710-2n\u70b9\u6301\u5b88\uff08\u4e0d\u4f4e\u4e8e0\uff09\u3002' },
    buddha: { id: 'buddha', name: '\u3010\u4f5b\u50cf\u3011', desc: '\u62ff\u53d6\u65f6\u6c14\u8840\u4e0a\u9650-7\u3002\u6bcf\u573a\u6218\u5f00\u5c40\u5bf9\u5168\u4f53\u654c\u4eba11\u70b9\u56fa\u5b9a\u4f24\u5bb3\u3002' },
    lacquerIncense: { id: 'lacquerIncense', name: '\u3010\u9999\u7089\u3011', desc: '\u6bcf\u7b2c6\u300112\u2026\u4e2a\u6211\u65b9\u56de\u5408\u5f00\u59cb\u83b7\u5f971\u5c42\u65e0\u5b9e\u4f53\u5e76\u91cd\u7f6e\u8ba1\u6570\uff08\u4e0e\u654c\u65b9\u662f\u5426\u51fa\u624b\u65e0\u5173\uff09\u3002\u65e0\u5b9e\u4f53\u5c42\u6570\u6bcf\u6211\u65b9\u56de\u5408\u5f00\u59cb\u51cf1\u6700\u4f4e0\uff1b\u6301\u5b88\u540e\u5355\u6b21\u53d7\u4f24\u81f3\u591a\u7b49\u4e8e\u5c42\u6570\u3002' },
    fallenSoul: { id: 'fallenSoul', name: '\u3010\u843d\u9b44\u7075\u9b42\u3011', desc: '\u6bcf\u573a\u6218\u80dc\u5229\u65f6\u56de\u590d1\u6c14\u8840\u5e76\u83b7\u5f9715\u94b1\u3002' },
    ritualSkull: { id: 'ritualSkull', name: '\u3010\u4eea\u5f0f\u5934\u9aa8\u3011', desc: '\u82e5\u672c\u573a\u6218\u6597\u5931\u8840\u226510\uff0c\u83b7\u5f974\u9ede\u6b66\u529b\u3002' },
    redSpear: { id: 'redSpear', name: '\u3010\u7ea2\u7f28\u67aa\u3011', desc: '\u52bf\u6ee1\u65f6\u9020\u6210\u53cc\u500d\u4f24\u5bb3\uff08\u539f1.5\u500d\u6539\u4e3a2\u500d\uff09\u3002' },
    deadwoodBranch: { id: 'deadwoodBranch', name: '\u3010\u67af\u6728\u6811\u679d\u3011', desc: '\u6253\u51fa\u540e\u8fdb\u6c89\u6c99\u7684\u724c\u670950%\u6982\u7387\u518d\u6267\u884c\u4e00\u6b21\u6548\u679c\u3002' }
};

// PoetryDB 已迁移至 js/data/poetry.js（含平仄/效果/触发）

const ItemPools = {
    eliteWeapons: ['xuanYuan'],
    eliteRelics: ['baguaMirror'],
    poetry: ['ganShi']
};

const Items = {
    randomWeapon: (pool = ItemPools.eliteWeapons) => WeaponDB[pool[rand(0, pool.length - 1)]],
    randomRelic: (pool = ItemPools.eliteRelics) => RelicDB[pool[rand(0, pool.length - 1)]],
    randomPoetry: (pool = ItemPools.poetry) => PoetryDB[pool[rand(0, pool.length - 1)]]
};
