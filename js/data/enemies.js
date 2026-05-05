// 敌人 Archetype：intent(enemy, all)/act(enemy, all)；弱怪 HP 用 rollHp 在出战时掷定
// ArchKey 用于数据统计（枯骸官吏) 与 AI；displayId 用于结算 tier 等

const _pick = (arr) => arr[rand(0, arr.length - 1)];

const EnemyArchetypes = {
    legacy_fight1: {
        displayId: 'e1',
        name: '游魂',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => 160,
        intent: (e) => {
            if (e.turnCounter % 2 === 0) {
                const dmg = 4 + 5 * (e.turnCounter / 2 - 1);
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, dmg) : dmg;
                return `意图: 攻击 (${d})`;
            }
            return '意图: 等待';
        },
        act: (e) => {
            if (e.turnCounter % 2 === 0) {
                const dmg = 4 + 5 * (e.turnCounter / 2 - 1);
                Combat.takeDmg(dmg, false, e);
            }
        }
    },
    legacy_fight2: {
        displayId: 'e2',
        name: '恶鬼',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => 200,
        intent: (e) => {
            if (e.turnCounter % 2 !== 0) return '意图: 虚弱咒';
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 8) : 8;
            return `意图: 攻击 (${d})`;
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) {
                State.combat.player.weak += 1;
                Game.showToast('受到虚弱咒！造成的伤害降低');
            } else {
                Combat.takeDmg(8, false, e);
            }
        }
    },

    di_fu_ye_gui: {
        displayId: 'm_difu',
        name: '地府野鬼',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(46, 50),
        init: (e) => { e._nextAtkRoll = null; },
        intent: (e) => {
            if (e.turnCounter % 2 !== 0) {
                if (!e._nextAtkRoll) e._nextAtkRoll = rand(6, 8);
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, e._nextAtkRoll) : e._nextAtkRoll;
                return `意图: 攻击 (${d})`;
            }
            return '意图: 虚弱咒';
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) {
                const dmg = e._nextAtkRoll || rand(6, 8);
                e._nextAtkRoll = rand(6, 8);
                Combat.takeDmg(dmg, false, e);
            } else {
                State.combat.player.weak += 1;
                Game.showToast('虚弱咒缠身……');
            }
        }
    },
    bai_hun_ye_gui: {
        displayId: 'm_baihun',
        name: '白魂野鬼',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(70, 74),
        intent: (e) => {
            if (e.turnCounter % 2 !== 0) return `意图: 凝煞聚力 (+8力，当前 ${e.str || 0})`;
            const raw = 5 + (e.str || 0);
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, raw) : raw;
            return `意图: 扑击 (${d})`;
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) {
                e.str = (e.str || 0) + 8;
                Game.showToast('阴煞聚力，敌方力道陡增');
                if (typeof Combat !== 'undefined' && Combat.pulseEnemyEntity) Combat.pulseEnemyEntity(e);
            } else {
                const dmg = 5 + (e.str || 0);
                Combat.takeDmg(dmg, false, e);
            }
        }
    },
    lan_shi_guai: {
        displayId: 'm_lanshi',
        name: '烂尸怪',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => rand(58, 62),
        init: (e) => { e._lsPhase = 0; },
        intent: (e) => {
            const ph = e._lsPhase % 3;
            if (ph === 0) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 13) : 13;
                return `意图: 攻击 (${d})`;
            }
            if (ph === 1) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 5) : 5;
                return `意图: 脓毒或御骸 (50%攻${d} / 50%持守+10)`;
            }
            return '意图: 尸皮硬化 (+4力 +10持守)';
        },
        act: (e) => {
            const ph = e._lsPhase % 3;
            if (ph === 0) {
                Combat.takeDmg(13, false, e);
            } else if (ph === 1) {
                if (Math.random() < 0.5) Combat.takeDmg(5, false, e);
                else {
                    e.block = (e.block || 0) + 10;
                    Game.showToast('烂尸怪御起腐甲');
                    if (typeof Combat !== 'undefined' && Combat.pulseEnemyEntity) Combat.pulseEnemyEntity(e);
                }
            } else {
                e.str = (e.str || 0) + 4;
                e.block = (e.block || 0) + 10;
                Game.showToast('尸躯鼓胀，更难撼动');
                if (typeof Combat !== 'undefined' && Combat.pulseEnemyEntity) Combat.pulseEnemyEntity(e);
            }
            e._lsPhase++;
        }
    },

    chi_mei_single: {
        displayId: 'm_chimei',
        name: '魑魅魍魉',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(24, 32),
        intent: (e) => {
            if (e.turnCounter % 2 !== 0) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 6) : 6;
                return `意图: 咒缚 (75%虚弱咒 / 25%攻${d})`;
            }
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 4) : 4;
            return `意图: 撕扯 (${d})`;
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) {
                if (Math.random() < 0.75) {
                    State.combat.player.weak += 1;
                    Game.showToast('虚弱咒！');
                } else Combat.takeDmg(6, false, e);
            } else Combat.takeDmg(4, false, e);
        }
    },
    ye_ku_gui: {
        displayId: 'm_yeku',
        name: '夜哭鬼',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => rand(94, 98),
        init: (e) => { e._yk = 0; },
        intent: (e) => {
            const ph = e._yk % 3;
            if (ph === 0) return '意图: 诅咒（下回合不可攻）';
            if (ph === 1) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 6) : 6;
                return `意图: 侵攻 (${d})`;
            }
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 13) : 13;
            return `意图: 侵攻 (${d})`;
        },
        act: (e) => {
            const ph = e._yk % 3;
            if (ph === 0) {
                State.combat.player.cursedNextPlayer = true;
                Game.showToast('诅咒入骨：下回合难施杀手');
            } else if (ph === 1) Combat.takeDmg(6, false, e);
            else Combat.takeDmg(13, false, e);
            e._yk++;
        }
    },
    yin_sha: {
        displayId: 'm_yinsha',
        name: '阴煞',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => rand(94, 98),
        init: (e) => { e._ys = 0; },
        intent: (e) => {
            const ph = e._ys % 4;
            if (ph === 0) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 17) : 17;
                return `意图: 侵攻 (${d})`;
            }
            if (ph === 1) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 9) : 9;
                return `意图: 侵攻 (${d})`;
            }
            if (ph === 2) {
                const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 5) : 5;
                return `意图: 侵攻 (${d})`;
            }
            return '意图: 阴风遏止（眩晕）';
        },
        act: (e) => {
            const ph = e._ys % 4;
            if (ph === 0) Combat.takeDmg(17, false, e);
            else if (ph === 1) Combat.takeDmg(9, false, e);
            else if (ph === 2) Combat.takeDmg(5, false, e);
            else Game.showToast('阴煞僵滞，未及出手');
            e._ys++;
        }
    },
    ku_hai_guan_li: {
        displayId: 'm_kuhai',
        name: '枯骸官吏',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => 666,
        intent: (e) => {
            const raw = 6 * e.turnCounter;
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, raw) : raw;
            return `意图: 量罪罚击 (${d})`;
        },
        act: (e) => {
            Combat.takeDmg(6 * e.turnCounter, false, e);
        }
    },
    diao_si_gui: {
        displayId: 'm_diaosi',
        name: '吊死鬼',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(94, 98),
        intent: (e) => {
            const raw = 15;
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, raw) : raw;
            return e.turnCounter % 2 !== 0 ? `意图: 缢杀 ${d}，并缀易伤` : `意图: 缢杀 (${d})`;
        },
        act: (e) => {
            Combat.takeDmg(15, false, e);
            if (e.turnCounter % 2 !== 0) {
                State.combat.player.vuln += 1;
                Game.showToast('阴气入络，易伤缠身');
            }
        }
    },
    ye_xun_a: {
        displayId: 'm_yexun_a',
        name: '夜巡阴差·甲',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(46, 50),
        intent: (e) => {
            if (e.turnCounter % 2 !== 0) return '意图: 枷印（易伤+御骸12）';
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 14) : 14;
            return `意图: 勾魂锥 (${d})`;
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) {
                State.combat.player.vuln += 1;
                e.block = (e.block || 0) + 12;
                Game.showToast('阴差枷印：你更易受制');
                if (typeof Combat !== 'undefined' && Combat.pulseEnemyEntity) Combat.pulseEnemyEntity(e);
            } else Combat.takeDmg(14, false, e);
        }
    },
    ye_xun_b: {
        displayId: 'm_yexun_b',
        name: '夜巡阴差·乙',
        sprite: "url('assets/enemy_1.png') center/cover, #222",
        rollHp: () => rand(46, 50),
        intent: (e) => {
            if (e.turnCounter % 2 === 0) return '意图: 凝煞御骸';
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 14) : 14;
            return `意图: 链鞭 (${d})`;
        },
        act: (e) => {
            if (e.turnCounter % 2 !== 0) Combat.takeDmg(14, false, e);
            else {
                e.str = (e.str || 0) + 3;
                e.block = (e.block || 0) + 8;
                Game.showToast('阴差披甲，更难击破');
                if (typeof Combat !== 'undefined' && Combat.pulseEnemyEntity) Combat.pulseEnemyEntity(e);
            }
        }
    },
    xiu_luo_place: {
        displayId: 'm_xiuluo',
        name: '修罗场守厄',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => 1000,
        intent: (e) => {
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, 20) : 20;
            return `意图: 业刀 (占位 ${d})`;
        },
        act: (e) => {
            Combat.takeDmg(20, false, e);
        }
    },

    village_strong_rand: {
        displayId: 'm_village',
        name: '路劫阴魁',
        sprite: "url('assets/enemy_2.png') center/cover, #222",
        rollHp: () => rand(110, 130),
        intent: (e) => {
            const raw = 8 + e.turnCounter * 2;
            const d = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(e, raw) : raw;
            return `意图: 猛袭 (${d})`;
        },
        act: (e) => {
            let dmg = 8 + e.turnCounter * 2;
            Combat.takeDmg(dmg, false, e);
        }
    }
};

const WeakArchPool = ['di_fu_ye_gui', 'bai_hun_ye_gui', 'lan_shi_guai'];
const StrongSoloPool = ['ye_ku_gui', 'yin_sha', 'ku_hai_guan_li', 'diao_si_gui'];

const EncounterDB = {
    fight1: { rewardTier: 'normal', units: [{ arch: 'legacy_fight1' }] },
    fight2: { rewardTier: 'elite', units: [{ arch: 'legacy_fight2' }] },
    enc_xiu_luo: { rewardTier: 'elite', units: [{ arch: 'xiu_luo_place' }] },
    enc_double_weak: { rewardTier: 'normal', units: () => {
        const a = _pick(WeakArchPool);
        let b = _pick(WeakArchPool);
        if (WeakArchPool.length > 1) { while (b === a) b = _pick(WeakArchPool); }
        return [{ arch: a }, { arch: b }];
    }},
    enc_chi_four: { rewardTier: 'elite', units: [{ arch: 'chi_mei_single' }, { arch: 'chi_mei_single' }, { arch: 'chi_mei_single' }, { arch: 'chi_mei_single' }] },
    enc_ye_xun_pair: { rewardTier: 'elite', units: [{ arch: 'ye_xun_a' }, { arch: 'ye_xun_b' }] },
    enc_strong_random: { rewardTier: 'elite', units: () => {
        const k = _pick(StrongSoloPool);
        if (k === 'ku_hai_guan_li') return [{ arch: 'ku_hai_guan_li' }];
        return [{ arch: k }];
    }},
    enc_strong_random_wide: { rewardTier: 'elite', units: () => {
        const roll = Math.random();
        if (roll < 0.15) return [{ arch: 'ku_hai_guan_li' }];
        if (roll < 0.35) return EncounterDB.enc_chi_four.units;
        if (roll < 0.55) return EncounterDB.enc_ye_xun_pair.units;
        const k = _pick(['ye_ku_gui', 'yin_sha', 'diao_si_gui']);
        return [{ arch: k }];
    }},
    enc_village_ambush: { rewardTier: 'elite', units: [{ arch: 'village_strong_rand' }] }
};

function Encounter_resolveUnits(spec) {
    const raw = spec.units;
    const arr = typeof raw === 'function' ? raw() : raw;
    return arr.map((u) => ({ arch: u.arch }));
}

function Encounter_spawnList(encounterId) {
    const spec = EncounterDB[encounterId];
    if (!spec) return null;
    return { rewardTier: spec.rewardTier, units: Encounter_resolveUnits(spec) };
}

function Combat_createEnemyInstance(archKey, slotIndex) {
    const def = EnemyArchetypes[archKey];
    if (!def) return null;
    const hp = def.rollHp();
    const e = {
        arch: archKey,
        slotIndex,
        id: def.displayId,
        name: def.name,
        hp,
        maxHp: hp,
        turnCounter: 1,
        weak: 0,
        vuln: 0,
        stun: false,
        block: 0,
        str: 0,
        shushouQin: 0,
        sprite: def.sprite,
        _nextAtkRoll: null,
        _lsPhase: 0,
        _yk: 0,
        _ys: 0
    };
    if (def.init) def.init(e);
    if (State._dev) { e.hp = e.maxHp = 10000; }
    return e;
}

function Combat_startFromEncounter(encounterId) {
    const pack = Encounter_spawnList(encounterId);
    if (!pack) return null;
    const list = [];
    let idx = 0;
    for (const u of pack.units) {
        const inst = Combat_createEnemyInstance(u.arch, idx);
        if (inst) {
            if (pack.units.filter((x) => x.arch === 'chi_mei_single').length > 1 && u.arch === 'chi_mei_single') {
                const sub = ['魑', '魅', '魍', '魉'];
                inst.name = `魑魅魍魉·${sub[idx]}`;
            }
            list.push(inst);
            idx++;
        }
    }
    return { enemies: list, rewardTier: pack.rewardTier };
}

function resolveMountainEncounterId() {
    if (Math.random() < 0.5) return 'enc_double_weak';
    return 'enc_strong_random_wide';
}

var EnemyDB = EncounterDB;
