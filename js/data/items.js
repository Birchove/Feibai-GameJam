// Item data dictionary
const WeaponDB = {
    xiuJian: { id: 'xiuJian', name: '\u3010\u7ee3\u5251\u3011', str: 6, def: 6 }
};

const RelicDB = {
    baguaMirror: { id: 'baguaMirror', name: '\u3010\u516b\u5366\u62a4\u5fc3\u955c\u3011', desc: '\u62a4\u5fc3\u7167\u5f71\uff0c\u6682\u4f5c\u7cbe\u82f1\u6218\u5229\u54c1\u3002' },
    buddha: { id: 'buddha', name: '\u3010\u4f5b\u50cf\u3011\u5f00\u5c40\u9707\u6151', desc: '\u5f00\u5c40\u5bf9\u654c\u4eba\u9020\u621010\u70b9\u4f24\u5bb3\u3002' }
};

const PoetryDB = {
    ganShi: { id: 'ganShi', text: '\u611f\u65f6\u82b1\u6e85\u6cea' }
};

const ItemPools = {
    eliteWeapons: ['xiuJian'],
    eliteRelics: ['baguaMirror'],
    poetry: ['ganShi']
};

const Items = {
    randomWeapon: (pool = ItemPools.eliteWeapons) => WeaponDB[pool[rand(0, pool.length - 1)]],
    randomRelic: (pool = ItemPools.eliteRelics) => RelicDB[pool[rand(0, pool.length - 1)]],
    randomPoetry: (pool = ItemPools.poetry) => PoetryDB[pool[rand(0, pool.length - 1)]]
};
