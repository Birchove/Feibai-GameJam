// 三章地图：第一章以村庄收束并进入第二章；第三章末尾奈何桥回主菜单
const MapChapters = [
    [
        { id: 0, x: 10, y: 80, name: '望乡台', type: 'big', icon: '🪨', ev: 'vn1' },
        { id: 1, x: 30, y: 50, name: '山路', type: 'normal', icon: '⛰️', ev: 'fight1' },
        { id: 2, x: 45, y: 70, name: '山路', type: 'normal', icon: '⛰️', ev: 'fight2' },
        { id: 3, x: 65, y: 40, name: '茶楼', type: 'normal', icon: '🏯', ev: 'vn2' },
        { id: 4, x: 80, y: 60, name: '破庙', type: 'normal', icon: '🏚️', ev: 'vn3' },
        { id: 5, x: 90, y: 20, name: '村庄', type: 'normal', icon: '🏘️', ev: 'village_hub_0' }
    ],
    [
        { id: 0, x: 12, y: 72, name: '山路', type: 'normal', icon: '⛰️', ev: 'rng_mountain' },
        { id: 1, x: 30, y: 52, name: '山路', type: 'normal', icon: '⛰️', ev: 'rng_mountain' },
        { id: 2, x: 48, y: 68, name: '茶楼', type: 'normal', icon: '🏯', ev: 'vn2' },
        { id: 3, x: 66, y: 42, name: '山路', type: 'normal', icon: '⛰️', ev: 'rng_mountain' },
        { id: 4, x: 88, y: 24, name: '村庄', type: 'normal', icon: '🏘️', ev: 'village_hub_1' }
    ],
    [
        { id: 0, x: 10, y: 78, name: '山路', type: 'normal', icon: '⛰️', ev: 'rng_mountain' },
        { id: 1, x: 28, y: 48, name: '修罗场', type: 'big', icon: '⚔️', ev: 'enc_xiu_luo' },
        { id: 2, x: 46, y: 66, name: '村庄', type: 'normal', icon: '🏘️', ev: 'village_hub_2' },
        { id: 3, x: 64, y: 42, name: '山路', type: 'normal', icon: '⛰️', ev: 'rng_mountain' },
        { id: 4, x: 80, y: 58, name: '茶楼', type: 'normal', icon: '🏯', ev: 'vn2' },
        { id: 5, x: 86, y: 38, name: '鬼门关', type: 'big', icon: '⛩️', ev: 'enc_yan_luo_wang' },
        { id: 6, x: 92, y: 20, name: '奈何桥', type: 'big', icon: '🌉', ev: 'end' }
    ]
];

const MapNodes = MapChapters[0];

function Village_pickOffer() {
    const offer = [];
    const keysW = typeof WeaponDB !== 'undefined' ? Object.keys(WeaponDB) : [];
    const keysRAll = typeof RelicDB !== 'undefined' ? Object.keys(RelicDB) : [];
    if (keysW.length) offer.push({ type: 'weapon', key: keysW[rand(0, keysW.length - 1)], price: 90 + rand(0, 40) });
    if (keysRAll.length) {
        const owned = new Set(State.relics || []);
        const keysR = keysRAll.filter((k) => RelicDB[k] && !owned.has(RelicDB[k].name));
        if (keysR.length) offer.push({ type: 'relic', key: keysR[rand(0, keysR.length - 1)], price: 110 + rand(0, 50) });
    }
    return offer;
}

function Village_openShopModal(onDone) {
    const offer = Village_pickOffer();
    let html = '<div class="kuhai-flee-title" style="margin-bottom:12px;">村肆货摊</div>';
    html += '<p style="color:#aaa;font-size:14px;line-height:1.65;text-align:left;margin:0 0 12px 0;">铜钱或可换得凡兵异宝。成交或离开皆由你意。</p>';
    offer.forEach((o, i) => {
        const name = o.type === 'weapon' ? WeaponDB[o.key].name : RelicDB[o.key].name;
        html += `<div class="btn-g" style="margin:8px 0;font-size:16px;" id="vshop-buy-${i}">${name} — ${o.price} 钱</div>`;
    });
    html += '<div class="btn-g" id="vshop-close" style="border-color:#555;margin-top:14px;">离开货摊</div>';

    let modal = $('village-shop-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'village-shop-modal';
        modal.className = 'modal';
        modal.style.zIndex = '400';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="kuhai-flee-box" style="max-width:440px;">${html}</div>`;

    const finish = () => {
        modal.classList.remove('active');
        if (typeof onDone === 'function') onDone();
    };

    offer.forEach((o, i) => {
        $(`vshop-buy-${i}`).onclick = (ev) => {
            ev.stopPropagation();
            if (State.gold < o.price) { Game.showToast('钱财不足'); return; }
            if (o.type === 'weapon') {
                Game.tryAcquireWeapon(o.key, (ok) => {
                    if (!ok) return;
                    State.gold -= o.price;
                    Game.showToast('成交');
                    finish();
                });
                return;
            }
            State.gold -= o.price;
            if (!State.relics.includes(RelicDB[o.key].name)) State.relics.push(RelicDB[o.key].name);
            Game.showToast('成交');
            finish();
        };
    });
    $('vshop-close').onclick = () => finish();

    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'village-shop-modal') m.classList.remove('active'); });
    modal.classList.add('active');
}

function Village_postFightRewards(chapterMarker) {
    const heal = Math.max(1, Math.floor(State.maxHp * 0.2));
    Combat.heal(heal);
    Village_openShopModal(() => MapSys.afterVillageChapter(chapterMarker));
}

function Village_buildHub(chapterMarker) {
    return {
        name: '荒村',
        texts: ['残垣断壁间，似有人烟……', '可要歇脚、易物，还是拔刀清厄？'],
        opts: [
            {
                text: '静坐调息（回复30%已损气血）',
                cb: () => {
                    const heal = Math.floor((State.maxHp - State.hp) * 0.3);
                    Combat.heal(Math.max(1, heal));
                    MapSys.afterVillageChapter(chapterMarker);
                    return false;
                }
            },
            {
                text: '逛村肆（购神兵法宝）',
                cb: () => {
                    Village_openShopModal(() => MapSys.afterVillageChapter(chapterMarker));
                    return false;
                }
            },
            {
                text: '剿灭阴祟（战后再疗养、易物）',
                cb: () => {
                    State._villagePendingChapter = chapterMarker;
                    Combat.start('enc_village_ambush');
                    return false;
                }
            }
        ]
    };
}

const Events = {
    vn1: { name: '我', texts: ['似乎有些记忆……', '想起了些什么……', '好像是……被杀了……', '我要杀出……阎王殿……'], opts: [] },
    vn2: { name: '冥府茶楼店小二', texts: ['小店……恭迎……客官……\n有何……吩咐？'], opts: [
        { text: '歇息一会 (回复35%已损生命)', cb: () => { const heal = Math.floor((State.maxHp - State.hp) * 0.35); Combat.heal(heal); } },
        { text: '活动筋骨 (支付100钱，删一张牌 - 暂未实装)', cb: () => Game.showToast('功能开发中') },
        { text: '凑凑热闹 (获得卡牌“破阵子”)', cb: () => { State.deck.push('c6'); Game.showToast('获得 破阵子'); } }
    ]},
    vn3: { name: '我', texts: ['破庙中心有一尊小佛像', '要做些什么？'], opts: [
        { text: '不去碰他，只是歇脚 (回复7生命)', cb: () => Combat.heal(7) },
        { text: '拿走佛像 (气血上限−7；获得「佛像」：每场战斗开始对全体敌人造成11点伤害)', cb: () => {
            State.maxHp = Math.max(1, State.maxHp - 7);
            State.hp = Math.min(State.hp, State.maxHp);
            if (!State.relics.includes('【佛像】')) State.relics.push('【佛像】');
            Game.updateUI();
            Game.showToast('佛相入手：气血上限减少 7。已得法宝「佛像」。');
        } },
        { text: '敬拜佛像 (悟性归零，获得卡牌“念奴娇”)', cb: () => { State.wuxing = 0; State.deck.push('c9'); Game.showToast('获得 念奴娇'); } }
    ]},
    village_hub_0: Village_buildHub(0),
    village_hub_1: {
        name: '荒村',
        texts: [
            '你看到一小群鬼魂……',
            '那貌似是死于战争的一个家庭……',
            '你不由得想到了北宋战乱的种种过往…………'
        ],
        opts: [
            {
                text: '同情他们（获得法宝「落魄灵魂」）',
                cb: () => {
                    if (!State.relics.includes('【落魄灵魂】')) State.relics.push('【落魄灵魂】');
                    Game.showToast('阴风呜咽间，似有微薄谢礼附上魂息。');
                    MapSys.afterVillageChapter(1);
                    return false;
                }
            },
            {
                text: '祓除他们（失去6点生命，获得法宝「红缨枪」）',
                cb: () => {
                    State.hp = Math.max(0, State.hp - 6);
                    if (!State.relics.includes('【红缨枪】')) State.relics.push('【红缨枪】');
                    Game.updateUI();
                    Game.showToast('杀气荡开阴祟，一杆赤缨透骨而现。');
                    MapSys.afterVillageChapter(1);
                    return false;
                }
            },
            {
                text: '无视他们（从卡组中删去一张牌）',
                cb: () => {
                    Game.openDeckRemovePicker((ok) => {
                        if (ok) MapSys.afterVillageChapter(1);
                    });
                    return false;
                }
            }
        ]
    },
    village_hub_2: {
        name: '荒村',
        texts: [
            '这里空无人烟……',
            '只有一些骷髅和枯木……',
            '要做些什么……'
        ],
        opts: [
            {
                text: '捡起枯木（「枯木树枝」+ 卡组加入1张「悔」）',
                cb: () => {
                    if (!State.relics.includes('【枯木树枝】')) State.relics.push('【枯木树枝】');
                    State.deck.push('c_hui');
                    Game.showToast('枯枝入手，指腹犹带湿凉。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '拿起骷髅头（「仪式头骨」+ 卡组加入1张「悔」）',
                cb: () => {
                    if (!State.relics.includes('【仪式头骨】')) State.relics.push('【仪式头骨】');
                    State.deck.push('c_hui');
                    Game.showToast('颅中似有空响，如有人低语。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '拂去尘土（「香炉」+ 卡组加入2张「悔」）',
                cb: () => {
                    if (!State.relics.includes('【香炉】')) State.relics.push('【香炉】');
                    State.deck.push('c_hui', 'c_hui');
                    Game.showToast('尘下露出兽足小炉，余温一缕。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '转身离开',
                cb: () => {
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            }
        ]
    },

    end_story: {
        name: '奈何桥',
        texts: [
            '雾开处，桥影如线，对岸灯火依稀，却照不见来时路。',
            '你掌中残卷已尽，冥府簿上无名亦有名——这一局，算你走过了。',
            '桥头有风，掠过耳畔时，像极了人间某座小城里的初夏。',
            '若有机缘再入轮回，愿你仍提剑、仍识字、仍记得那些未写完的句子。',
            '此番冥游记，到此一笔。珍重。'
        ],
        opts: [
            {
                text: '踏桥归去',
                cb: () => {
                    Game.showToast('魂光渐远……');
                    setTimeout(() => Game.navTo('screen-main'), 2200);
                    return false;
                }
            }
        ]
    }
};
