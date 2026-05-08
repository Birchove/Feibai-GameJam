const CardDB = {
            // [ 1-10: 低阶残卷 ]
            'c1': { id: 'c1', name: '横劈', cost: 1, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => Combat.dealDmg(0) },
            'c2': { id: 'c2', name: '闪避', cost: 1, type: '仄', typeClass: 'type-ze', defBase: 0, desc: `获得{V_DEF}点${K.CSHOU}`, rarity: 'low', cardType: '功卡', effect: () => Combat.addBlock(0) },
            'c3': { id: 'c3', name: '蝶恋花', cost: 0, type: '平', typeClass: 'type-ping', desc: `本回合你的${K.SH}减少3点，获得2点气`, rarity: 'low', cardType: '词牌', effect: () => { State.combat.player.turnDmgMod -= 3; State.energy += 2; } },
            'c4': { id: 'c4', name: '点水', cost: 1, type: '仄', typeClass: 'type-ze', desc: '抽取1张卡牌', rarity: 'low', cardType: '功卡', effect: () => Combat.draw(1) },
            'c6': { id: 'c6', name: '破阵子', cost: 3, type: '仄', typeClass: 'type-ze', desc: `打出你手牌的所有武卡，下回合你不能造成${K.SH}`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.playAllAttacks(); State.combat.player.cantDmgNextTurn = true; } },
            'c7': { id: 'c7', name: '定风波', cost: 3, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `你失去7点血量，让一名敌人${K.YY}，打出后进入${K.CS}`, rarity: 'high', cardType: '词牌', effect: () => {
                Combat.takeDmg(7, true);
                const t = Combat._primaryTargetIdx();
                const en = State.combat.enemies[t];
                if (en && en.hp > 0) { en.stun = true; Game.showToast('敌人被旋风困住！'); }
            } },
            'c8': { id: 'c8', name: '水调歌头', cost: 2, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `造成{V_ATK}点${K.SH}2次，抽取(1+轻功)张卡牌`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.dealDmg(0); setTimeout(()=>Combat.dealDmg(0), 200); Combat.draw(1 + State.agi); } },
            'c9': { id: 'c9', name: '念奴娇', cost: 2, type: '平', typeClass: 'type-ping', desc: `${K.GF}，每回合开始失去1点生命，从弃牌堆打出1卡（本场打出后不再入手）`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.nianNuJiao = true; Game.showToast('功法发动：念奴娇'); } },
            'c10': { id: 'c10', name: '满江红', cost: 0, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，抽取卡牌，本回合${K.SH}翻倍，受到的${K.SH}也翻倍`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.draw(1); State.combat.player.dmgDouble = true; State.combat.player.takeDmgDouble = true; } },
            
            // [ 11-21: 低阶残卷-补充 ]
            'c11': { id: 'c11', name: '习武', cost: 0, type: '仄', typeClass: 'type-ze', desc: '本回合获得1点力，1点御', rarity: 'low', cardType: '功卡', effect: () => { State.combat.player.turnStr += 1; State.combat.player.turnDef += 1; Game.updateUI(); } },
            'c12': { id: 'c12', name: '刺击', cost: 1, type: '平', typeClass: 'type-ping', atkBase: -1, desc: `对所有敌人造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => Combat.dealDmgAll(-1) },
            'c13': { id: 'c13', name: '舞剑', cost: 1, type: '仄', typeClass: 'type-ze', atkBase: 10, isFixed: true, desc: `造成{V_ATK}点${K.SH}，${K.FX}抽取1张卡牌`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => { Combat.dealDmg(10, true); Combat.draw(1); } },
            'c14': { id: 'c14', name: '挂剑', cost: 1, type: '仄', typeClass: 'type-ze', atkBase: 1, desc: `造成{V_ATK}点${K.SH}，选择一张手牌放入${K.CS}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => {
                Combat.dealDmg(1);
                Combat.openCardPicker({
                    source: 'hand',
                    maxCount: 1,
                    prompt: '挂剑：选 1 张手牌放入沉沙',
                    onConfirm: (indices) => {
                        indices.forEach(i => {
                            const it = Combat.normalizeHandItem(State.combat.hand[i]);
                            State.combat.hand.splice(i, 1);
                            State.combat.exhaustPile.push(it.cardId);
                        });
                        Combat.renderHand();
                    }
                });
            } },
            'c15': { id: 'c15', name: '撩剑', cost: 1, type: '仄', typeClass: 'type-ze', atkBase: 4, isFixed: true, desc: `${K.FX}造成{V_ATK}点${K.SH}3次`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => { Combat.dealDmg(4, true); setTimeout(()=>Combat.dealDmg(4, true), 150); setTimeout(()=>Combat.dealDmg(4, true), 300); } },
            'c16': { id: 'c16', name: '抗衡', cost: 1, type: '平', typeClass: 'type-ping', defBase: 3, desc: `获得{V_DEF}点${K.CSHOU}`, rarity: 'low', cardType: '功卡', effect: () => Combat.addBlock(3) },
            'c17': { id: 'c17', name: '斡旋', cost: 0, type: '平', typeClass: 'type-ping', desc: `${K.FX}抽取1张卡牌`, rarity: 'low', cardType: '功卡', effect: () => Combat.draw(1) },
            'c18': { id: 'c18', name: '缮甲', cost: 1, type: '仄', typeClass: 'type-ze', defBase: () => (State.combat && State.combat.shanjia) ? State.combat.shanjia + 1 : 1, desc: `获得{V_DEF}点${K.CSHOU}（每打出一次额外+1）`, rarity: 'low', cardType: '功卡', effect: () => { State.combat.shanjia = (State.combat.shanjia || 0) + 1; Combat.addBlock(0 + State.combat.shanjia); } },
            'c19': { id: 'c19', name: '磨刀', cost: 1, type: '平', typeClass: 'type-ping', defBase: -2, desc: `获得{V_DEF}点${K.CSHOU}，本回合获得1点力`, rarity: 'low', cardType: '功卡', effect: () => { Combat.addBlock(-2); State.combat.player.turnStr += 1; } },
            'c20': { id: 'c20', name: '伏击', cost: 0, type: '平', typeClass: 'type-ping', atkBase: -1, desc: `失去1点血量，造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => { Combat.takeDmg(1, true); Combat.dealDmg(-1); } },
            'c21': { id: 'c21', name: '双斩', cost: 1, type: '仄', typeClass: 'type-ze', atkBase: -3, desc: `造成{V_ATK}点${K.SH}两次`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => { Combat.dealDmg(-3); setTimeout(()=>Combat.dealDmg(-3), 200); } },
            
            // [ 22-40: 中阶秘籍 ]
            'c22': { id: 'c22', name: '歃血为盟', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，固定失去1点血量，对所有敌人给予三层${K.YS}和${K.XR}`, rarity: 'mid', cardType: '功卡', effect: () => {
                Combat.takeDmg(1, true);
                State.combat.enemies.forEach(en => { if (en && en.hp > 0) { en.weak += 3; en.vuln += 3; Combat.pulseEnemyEntity(en); } });
                Game.updateUI();
                Combat.renderEnemies();
            } },
            'c23': { id: 'c23', name: '一转攻势', cost: 1, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，本场战斗你每失去3点力，获得1点力`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.yiZhuan = true; Game.showToast('一转攻势：开始计数'); } },
            'c24': { id: 'c24', name: '束手就擒', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，本回合失去2点力；每名敌人本回合对你攻势−6`, rarity: 'mid', cardType: '功卡', effect: () => {
                State.combat.player.turnStr -= 2;
                Combat.onStrLost(2);
                State.combat.enemies.forEach(en => { if (en && en.hp > 0) { en.atkDownThisRound = (en.atkDownThisRound || 0) + 6; Combat.pulseEnemyEntity(en); } });
                Game.showToast('束手就擒');
                Game.updateUI();
                Combat.renderEnemies();
            } },
            'c25': { id: 'c25', name: '厉兵秣马', cost: 0, type: '仄', typeClass: 'type-ze', desc: `在手牌中加一张${K.DW}，${K.FX}抽取三张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.hand.push({ cardId: 'c_duwu' }); Combat.draw(3); } },
            'c26': { id: 'c26', name: '万夫莫开', cost: 2, type: '平', typeClass: 'type-ping', defBase: 8, desc: `获得{V_DEF}点${K.CSHOU}，给所有敌人一层${K.XR}`, rarity: 'mid', cardType: '功卡', effect: () => {
                Combat.addBlock(8);
                State.combat.enemies.forEach(en => { if (en && en.hp > 0) { en.weak += 1; Combat.pulseEnemyEntity(en); } });
                Game.updateUI();
                Combat.renderEnemies();
            } },
            'c27': { id: 'c27', name: '摧枯拉朽', cost: 2, type: '仄', typeClass: 'type-ze', keep: true, atkBase: () => {
                const ens = (State.combat && State.combat.enemies) ? State.combat.enemies : [];
                const idx = Combat._primaryTargetIdx();
                const en = ens[idx];
                return Combat.cuiKuDamageForEnemy(en);
            }, desc: `${K.BL}，造成{V_ATK}点${K.SH}（每名敌人独立按其已损生命比例）；以当前选中敌人为准`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => {
                const idx = Combat._primaryTargetIdx();
                const en = State.combat.enemies[idx];
                if (!en || en.hp <= 0) return;
                const d = Combat.cuiKuDamageForEnemy(en);
                Combat.dealDmg(d, false, idx);
            } },
            'c28': { id: 'c28', name: '白虹贯日', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, atkBase: 5, desc: `打出后进入${K.CS}，造成{V_ATK}点${K.SH}，对血量最高敌人造成双倍${K.SH}`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => {
                const liv0 = Combat._livingIndices();
                if (!liv0.length) return;
                if (liv0.length === 1) {
                    const idx = liv0[0];
                    Combat.dealDmg(5, false, idx);
                    setTimeout(() => Combat.dealDmg(5, false, idx), 120);
                    return;
                }
                Combat.dealDmgAll(5);
                const liv = Combat._livingIndices();
                if (!liv.length) return;
                let bestI = liv[0]; let bestHp = -1;
                liv.forEach(i => {
                    const e = State.combat.enemies[i];
                    if (e && e.hp > bestHp) { bestHp = e.hp; bestI = i; }
                });
                Combat.dealDmg(5, false, bestI);
            } },
            'c29': { id: 'c29', name: '峨眉剑法', cost: 1, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，本场战斗每打出3张武卡，${K.FX}抽取1张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.emei = true; Game.showToast('峨眉剑法生效'); } },
            'c30': { id: 'c30', name: '以逸待劳', cost: 2, type: '平', typeClass: 'type-ping', defBase: 5, desc: `获得{V_DEF}点${K.CSHOU}，下回合额外获得2点气`, rarity: 'mid', cardType: '功卡', effect: () => { Combat.addBlock(5); State.combat.player.nextTurnEnergy = 2; } },
            'c31': { id: 'c31', name: '一剑封喉', cost: 2, type: '平', typeClass: 'type-ping', atkBase: 17, desc: `造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => Combat.dealDmg(17) },
            'c32': { id: 'c32', name: '波诡云谲', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，将1张随机武卡加入手牌，该牌本回合耗气为0`, rarity: 'mid', cardType: '功卡', effect: () => {
                const pool = Object.keys(CardDB).filter(k => {
                    const c = CardDB[k];
                    return c && c.cardType === '武卡' && !c.unplayable;
                });
                if (!pool.length) { Game.showToast('波诡云谲：无可用武卡'); return; }
                if (State.combat.hand.length >= 10) { Game.showToast('手牌已满'); return; }
                const pick = pool[rand(0, pool.length - 1)];
                State.combat.hand.push({ cardId: pick, costOverride: 0 });
                Combat.renderHand();
                Game.showToast(`波诡云谲：${CardDB[pick].name}（本回合0气）`);
            } },
            'c33': { id: 'c33', name: '流星落月', cost: 1, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，对敌人的溢出${K.SH}连锁溅射到随机其他敌人`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.liuXingLuoYue = true; Game.showToast('流星落月：劲力可连环泄于旁敌'); } },
            'c34': { id: 'c34', name: '坚壁清野', cost: 2, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，本场战斗每回合可跨回合至多保留15点${K.CSHOU}（不足15则按实际持守保留）`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.jianBiQingYe = true; Game.showToast('坚壁清野生效'); } },
            'c35': { id: 'c35', name: '付之一炬', cost: 1, type: '仄', typeClass: 'type-ze', desc: `将一张手牌放入${K.CS}，抽取1张卡牌（需另有可焚之手牌）`, rarity: 'mid', cardType: '功卡', effect: () => {
                Combat.openCardPicker({
                    source: 'hand',
                    maxCount: 1,
                    prompt: '付之一炬：选 1 张手牌放入沉沙',
                    onConfirm: (indices) => {
                        indices.forEach(i => {
                            const it = Combat.normalizeHandItem(State.combat.hand[i]);
                            State.combat.hand.splice(i, 1);
                            State.combat.exhaustPile.push(it.cardId);
                        });
                        Combat.draw(1);
                        Combat.renderHand();
                    }
                });
            } },
            'c36': { id: 'c36', name: '封刀挂剑', cost: 1, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，你每失去力时，${K.FX}抽取2张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.fengDao = true; Game.showToast('封刀挂剑生效'); } },
            'c37': { id: 'c37', name: '七步成诗', cost: 0, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，本场战斗必将获得随机1份诗句残篇`, rarity: 'mid', cardType: '功卡', effect: () => {
                const ids = (typeof PoetryDB !== 'undefined') ? Object.keys(PoetryDB) : [];
                const owned = new Set(State.poetry || []);
                const avail = ids.filter((id) => !owned.has(id));
                if (!avail.length) { Game.showToast('七步成诗：已穷尽残篇，不再重复获得'); return; }
                State.combat.qibuPoetryId = avail[rand(0, avail.length - 1)];
                Game.showToast('七步成诗：战后结算领取残篇');
            } },
            'c38': { id: 'c38', name: '投笔从戎', cost: 1, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `对一名敌人造成{V_ATK}点${K.SH}，本回合你每次打牌可自选平仄`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => { Combat.dealDmg(0); State.combat.player.ignorePZ = true; } },
            'c39': { id: 'c39', name: '拔山扛鼎', cost: 1, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，本场战斗你获得4点力`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.combatStr += 4; Game.updateUI(); Game.showToast('拔山扛鼎：本场战斗 +4 力'); } },
            'c40': { id: 'c40', name: '文思泉涌', cost: 1, type: '仄', typeClass: 'type-ze', defBase: 0, desc: `清除你所有的${K.CSH}，每清除一个就获得{V_DEF}点${K.CSHOU}`, rarity: 'mid', cardType: '功卡', effect: () => { let count = State.combat.pzHistory.length; State.combat.pzHistory = []; Combat.renderPZ(); for(let i=0; i<count; i++) Combat.addBlock(0); } },
            
            // [ 41-50: 高阶绝学 ]
            'c41': { id: 'c41', name: '万剑归宗', cost: 3, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，打出你手牌的所有武卡，同时加入它们的${K.JX}到你的手牌（这些镜像本回合耗气为0）`, rarity: 'high', cardType: '功卡', effect: () => Combat.playAllAttacks({ withMirror: true }) },
            'c42': { id: 'c42', name: '城焚烬余', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, atkBase: -3, desc: `打出后进入${K.CS}，手牌全部放入${K.CS}，对所有敌人造成{V_ATK}点${K.SH}X次(X为${K.CS}牌数)`, isAttack: true, rarity: 'high', cardType: '武卡', effect: () => {
                while (State.combat.hand.length > 0) {
                    const it = Combat.normalizeHandItem(State.combat.hand.pop());
                    State.combat.exhaustPile.push(it.cardId);
                }
                Combat.renderHand();
                const X = Math.max(1, State.combat.exhaustPile.length);
                for (let i = 0; i < X; i++) {
                    setTimeout(() => Combat.dealDmgAll(-3), i * 200);
                }
            } },
            'c43': { id: 'c43', name: '折戟沉沙', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，将${K.CS}中的至多两张卡牌加入你的手牌`, rarity: 'high', cardType: '功卡', effect: () => {
                Combat.openCardPicker({
                    source: 'exhaust',
                    maxCount: 2,
                    prompt: '折戟沉沙：从沉沙中取至多 2 张回手',
                    onConfirm: (indices) => {
                        // indices 已倒序
                        indices.forEach(i => {
                            if (State.combat.hand.length >= 10) return;
                            const cardId = State.combat.exhaustPile.splice(i, 1)[0];
                            State.combat.hand.push({ cardId });
                        });
                        Combat.renderHand();
                    }
                });
            } },
            'c44': { id: 'c44', name: '唇枪舌剑', cost: 3, type: '仄', typeClass: 'type-ze', atkBase: -5, desc: `${K.GF}，你每打出一张仄牌，就对随机一名敌人造成{V_ATK}点${K.SH}（本场仄牌数见状态栏）`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.chunQiang = true; Game.showToast('唇枪舌剑生效'); } },
            'c45': { id: 'c45', name: '固若金汤', cost: 3, type: '平', typeClass: 'type-ping', defBase: -4, desc: `${K.GF}，你每打出一张平牌，获得{V_DEF}点${K.CSHOU}（本场平牌数见状态栏）`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.guRuo = true; Game.showToast('固若金汤生效'); } },
            'c46': { id: 'c46', name: '案剑瞋目', cost: 0, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `打出后进入${K.CS}，获得3点气，${K.FX}抽取3张牌，本场战斗 +3 力；历经三轮敌方回合后暴毙`, rarity: 'high', cardType: '功卡', effect: () => {
                State.energy += 3;
                Combat.draw(3);
                State.combat.player.combatStr += 3;
                State.combat.player.deathRoundsRemaining = 3;
                Game.updateUI();
                Game.showToast('案剑瞋目：三轮敌动后力竭');
            } },
            'c47': { id: 'c47', name: '刀光剑影', cost: 2, type: '仄', typeClass: 'type-ze', desc: `${K.GF}，名字含「剑」的牌打出时再结算一次效果（不含本功法；每张牌每回合仅追加一次）`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.daoGuang = true; Game.showToast('剑气纵横！'); } },
            'c48': { id: 'c48', name: '金蝉脱壳', cost: 3, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `打出后进入${K.CS}，将你的血量和状态回退至上回合（不影响敌方）`, rarity: 'high', cardType: '功卡', effect: () => {
                const snap = State.combat._prevSnapshot || State.combat._snapshot;
                if (!snap) { Game.showToast('金蝉脱壳：无可回退的状态'); return; }
                // 仅回退角色自身：HP / 势 / 玩家状态字段（buff/debuff/连携/守备等）
                // 不回退：能量（本回合资源）、手牌/抽/弃/沉沙、平仄历史、敌方状态
                State.hp = snap.hp;
                State.momentum = snap.momentum;
                State.combat.player = { ...snap.player };
                // 回退后清空上一回合快照引用，避免对同一战斗"无限回退"
                State.combat._prevSnapshot = null;
                Game.updateUI();
                Combat.renderHand();
                Game.showToast('金蝉脱壳：状态已回退至上回合');
            } },
            'c49': { id: 'c49', name: '操戈擐甲', cost: 3, type: '仄', typeClass: 'type-ze', atkBase: 31, desc: `造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'high', cardType: '武卡', effect: () => Combat.dealDmg(31) },
            'c50': { id: 'c50', name: '枯木逢春', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，回复12点血量`, rarity: 'high', cardType: '功卡', effect: () => Combat.heal(12) },

            // 特殊/衍生物
            'c_duwu': { id: 'c_duwu', name: '黩武', cost: '-', type: '无', typeClass: 'type-ze', desc: `打出"${K.LBMM}"后，卡组中生成此卡，不可被打出`, rarity: 'token', cardType: '衍生物', unplayable: true, effect: () => {} },
            'c_jingkong': { id: 'c_jingkong', name: '惊恐', cost: '-', type: '无', typeClass: 'type-ze', desc: '诅咒。不可打出。抽到后保留 3 个我方回合，期满沉入沉沙。', rarity: 'token', cardType: '诅咒', unplayable: true, effect: () => {} },
            'c_jia_suo': { id: 'c_jia_suo', name: '枷锁', cost: '-', type: '无', typeClass: 'type-ze', desc: '不可打出。', rarity: 'token', cardType: '诅咒', unplayable: true, effect: () => {} },
            'c_hui': { id: 'c_hui', name: '悔', cost: '-', type: '无', typeClass: 'type-ze', desc: '诅咒。不可打出。若我方回合结束时仍在手牌，受到 2 点伤害。', rarity: 'token', cardType: '诅咒', unplayable: true, effect: () => {} }
        };
