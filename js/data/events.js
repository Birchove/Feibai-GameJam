// 三章地图：第一章以村庄收束并进入第二章；第三章末尾奈何桥回主菜单
const MapChapters = [
    [
        { id: 0, x: 10, y: 80, name: '望乡台', type: 'big', glyph: '望', mark: 'seal', ev: 'vn1' },
        { id: 1, x: 30, y: 50, name: '山路', type: 'normal', glyph: '刃', mark: 'ink', ev: 'fight1', combatBg: 'mountain' },
        { id: 2, x: 45, y: 70, name: '山路', type: 'normal', glyph: '战', mark: 'ink', ev: 'fight2', combatBg: 'mountain' },
        { id: 3, x: 65, y: 40, name: '茶楼', type: 'normal', glyph: '茗', mark: 'seal', ev: 'vn2' },
        { id: 4, x: 80, y: 60, name: '破庙', type: 'normal', glyph: '刹', mark: 'ink', ev: 'vn3' },
        { id: 5, x: 90, y: 20, name: '村庄', type: 'normal', glyph: '憩', mark: 'seal', ev: 'village_hub_0' }
    ],
    [
        { id: 0, x: 12, y: 72, name: '山路', type: 'normal', glyph: '遇', mark: 'ink', ev: 'rng_mountain', combatBg: 'mountain' },
        { id: 1, x: 30, y: 52, name: '山路', type: 'normal', glyph: '缘', mark: 'ink', ev: 'rng_mountain', combatBg: 'mountain' },
        { id: 2, x: 48, y: 68, name: '茶楼', type: 'normal', glyph: '茗', mark: 'seal', ev: 'vn2' },
        { id: 3, x: 66, y: 42, name: '山路', type: 'normal', glyph: '伐', mark: 'ink', ev: 'rng_mountain', combatBg: 'mountain' },
        { id: 4, x: 88, y: 24, name: '村庄', type: 'normal', glyph: '肆', mark: 'seal', ev: 'village_hub_1' }
    ],
    [
        { id: 0, x: 10, y: 78, name: '山路', type: 'normal', glyph: '逢', mark: 'ink', ev: 'rng_mountain', combatBg: 'mountain' },
        { id: 1, x: 28, y: 48, name: '修罗场', type: 'big', glyph: '魁', mark: 'seal', ev: 'enc_xiu_luo' },
        { id: 2, x: 46, y: 66, name: '村庄', type: 'normal', glyph: '憩', mark: 'seal', ev: 'village_hub_2' },
        { id: 3, x: 64, y: 42, name: '山路', type: 'normal', glyph: '刃', mark: 'ink', ev: 'rng_mountain', combatBg: 'mountain' },
        { id: 4, x: 80, y: 58, name: '茶楼', type: 'normal', glyph: '茗', mark: 'seal', ev: 'vn2' },
        { id: 5, x: 86, y: 38, name: '鬼门关', type: 'big', glyph: '冥', mark: 'seal', ev: 'enc_yan_luo_wang' },
        { id: 6, x: 92, y: 20, name: '奈何桥', type: 'big', glyph: '归', mark: 'seal', ev: 'end' }
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
    let html = '<div class="kuhai-flee-title" style="margin-bottom:12px;">荒村货摊</div>';
    html += '<p style="color:#aaa;font-size:14px;line-height:1.65;text-align:left;margin:0 0 12px 0;">铜钱在手，或可换得兵器法宝；买也好走也好，全凭尊便。</p>';
    offer.forEach((o, i) => {
        const name = o.type === 'weapon' ? WeaponDB[o.key].name : RelicDB[o.key].name;
        html += `<div class="btn-g" style="margin:8px 0;font-size:16px;" id="vshop-buy-${i}">${name} — ${o.price} 钱</div>`;
    });
    html += '<div class="btn-g" id="vshop-close" style="border-color:#555;margin-top:14px;">转身离去</div>';

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
            if (State.gold < o.price) { Game.showToast('铜钱不够'); return; }
            if (o.type === 'weapon') {
                Game.tryAcquireWeapon(o.key, (ok) => {
                    if (!ok) return;
                    State.gold -= o.price;
                    Game.showToast('银货两讫');
                    finish();
                });
                return;
            }
            State.gold -= o.price;
            if (!State.relics.includes(RelicDB[o.key].name)) State.relics.push(RelicDB[o.key].name);
            Game.showToast('银货两讫');
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
        eventSkin: 'village',
        name: '荒村',
        texts: ['断垣残瓦之间，隐约有炊烟痕迹……', '或可歇脚喘息，或可入市易物，抑或拔刀涤荡阴祟？'],
        opts: [
            {
                text: '静坐调息 (按已损生命值回复 30% 气血)',
                cb: () => {
                    const heal = Math.floor((State.maxHp - State.hp) * 0.3);
                    Combat.heal(Math.max(1, heal));
                    MapSys.afterVillageChapter(chapterMarker);
                    return false;
                }
            },
            {
                text: '入市肆 (用铜钱购买神兵或法宝)',
                cb: () => {
                    Village_openShopModal(() => MapSys.afterVillageChapter(chapterMarker));
                    return false;
                }
            },
            {
                text: '剿灭阴祟 (先进战斗；打赢后仍可回血与购物)',
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
    vn1: {
        eventSkin: 'wangxiang',
        name: '我',
        texts: [
            '望乡台上，雾冷风凄，心底忽有旧事浮起，似曾相识。',
            '片断纷至：人声嘈杂，刀光掠过，天地骤然一空。',
            '我终是懂了——阳寿已尽，似是遭人毒手，魂坠黄泉。',
            '无路可走，便劈一条路出来：阎王殿前，我也要闯出去。'
        ],
        opts: []
    },
    vn2: { eventSkin: 'teahouse', name: '冥府茶楼店小二', texts: ['客官……里边请……\n要饮一盏茶，还是听一段闲话？'], opts: [
        { text: '借座歇脚 (恢复已损失生命值的 35%)', cb: () => { const heal = Math.floor((State.maxHp - State.hp) * 0.35); Combat.heal(heal); } },
        { text: '活动筋骨 (支付 100 钱，从卡组中永久删除 1 张牌)', cb: () => {
            if (State.gold < 100) {
                Game.showToast('百钱未足，难成此议');
                return false;
            }
            Game.openDeckRemovePicker((ok) => {
                if (!ok) return;
                State.gold -= 100;
                Game.showToast('筋骨已舒：百钱已付，牌已撕去');
                MapSys.renderMap();
                Game.navTo('screen-map');
            });
            return false;
        } },
        { text: '听人闲扯 (获得卡牌「破阵子」)', cb: () => { State.deck.push('c6'); Game.showToast('《破阵子》一阕，已写入残卷'); } }
    ]},
    vn3: { eventSkin: 'temple', name: '我', texts: ['破庙深处，有尊小佛低眉。', '近前，还是远观？'], opts: [
        { text: '只当歇脚 (回复 7 点生命)', cb: () => Combat.heal(7) },
        { text: '携佛而去 (生命上限 -7；获得法宝「佛像」，每场战斗开始时对全体敌人造成 11 点伤害)', cb: () => {
            State.maxHp = Math.max(1, State.maxHp - 7);
            State.hp = Math.min(State.hp, State.maxHp);
            if (!State.relics.includes('【佛像】')) State.relics.push('【佛像】');
            Game.updateUI();
            Game.showToast('佛像离座：气血上限减 7；法宝「佛像」已入手');
        } },
        { text: '跪拜叩首 (悟性变为 0；获得卡牌「念奴娇」)', cb: () => { State.wuxing = 0; State.deck.push('c9'); Game.showToast('《念奴娇》已写入残卷'); } }
    ]},
    village_hub_0: Village_buildHub(0),
    village_hub_1: {
        eventSkin: 'village',
        name: '荒村',
        texts: [
            '雾中聚着几个游魂，似是一户战殁之人，骨立如柴。',
            '你心头一紧，想起兵燹连年的旧闻……',
            '当如何处置？'
        ],
        opts: [
            {
                text: '心生恻隐 (获得法宝「落魄灵魂」)',
                cb: () => {
                    if (!State.relics.includes('【落魄灵魂】')) State.relics.push('【落魄灵魂】');
                    Game.showToast('阴风过处，似有一缕微光随魂息落入手心。');
                    MapSys.afterVillageChapter(1);
                    return false;
                }
            },
            {
                text: '以武祓之 (自己失去 6 点生命；获得法宝「红缨枪」)',
                cb: () => {
                    State.hp = Math.max(0, State.hp - 6);
                    if (!State.relics.includes('【红缨枪】')) State.relics.push('【红缨枪】');
                    Game.updateUI();
                    Game.showToast('杀气荡开阴雾，一杆红缨自虚空中凝实。');
                    MapSys.afterVillageChapter(1);
                    return false;
                }
            },
            {
                text: '转身不顾 (从卡组中永久删除 1 张牌)',
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
        eventSkin: 'village',
        name: '荒村',
        texts: [
            '四下无人，唯余枯骨与朽木，风过如诉。',
            '可拾，可弃，也可一走了之……',
            '你欲何为？'
        ],
        opts: [
            {
                text: '拾起枯枝 (获得法宝「枯木树枝」；卡组加入 1 张「悔」)',
                cb: () => {
                    if (!State.relics.includes('【枯木树枝】')) State.relics.push('【枯木树枝】');
                    State.deck.push('c_hui');
                    Game.showToast('枯枝入手，指间尚带潮凉。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '捧起骷髅 (获得法宝「仪式头骨」；卡组加入 1 张「悔」)',
                cb: () => {
                    if (!State.relics.includes('【仪式头骨】')) State.relics.push('【仪式头骨】');
                    State.deck.push('c_hui');
                    Game.showToast('颅骨轻响，似有人贴耳低语。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '扫去浮尘 (获得法宝「香炉」；卡组加入 2 张「悔」)',
                cb: () => {
                    if (!State.relics.includes('【香炉】')) State.relics.push('【香炉】');
                    State.deck.push('c_hui', 'c_hui');
                    Game.showToast('尘下露出一尊兽足小炉，余温未绝。');
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            },
            {
                text: '径自离开',
                cb: () => {
                    MapSys.afterVillageChapter(2);
                    return false;
                }
            }
        ]
    },

    end_story: {
        eventSkin: 'naihe',
        name: '奈何桥',
        texts: [
            '雾散处，桥如一线，对岸灯影憧憧，照不见来时路。',
            '你袖中残卷将尽，冥册之上无名亦有名——此局，算你走过一遭。',
            '桥头风过，掠耳时竟像人间某座小城的初夏。',
            '异日若再入轮回，愿你仍提剑、仍识字，不忘那些未写完的句子。',
            '冥游记此搁笔。珍重。'
        ],
        opts: [
            {
                text: '踏桥而返',
                cb: () => {
                    Game.showToast('魂光渐远……');
                    const runId = Game.getRunId();
                    setTimeout(() => {
                        if (!Game.isRunCurrent(runId)) return;
                        Game.clearJourneyCheckpoint();
                        Game.navTo('screen-main');
                    }, 2200);
                    return false;
                }
            }
        ]
    }
};
