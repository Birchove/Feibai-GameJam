const CardDB = {
            // [ 1-10: 低阶残卷 ]
            'c1': { id: 'c1', name: '横劈', cost: 1, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => Combat.dealDmg(0) },
            'c2': { id: 'c2', name: '闪避', cost: 1, type: '仄', typeClass: 'type-ze', defBase: 0, desc: `获得{V_DEF}点${K.CSHOU}`, rarity: 'low', cardType: '功卡', effect: () => Combat.addBlock(0) },
            'c3': { id: 'c3', name: '蝶恋花', cost: 0, type: '平', typeClass: 'type-ping', desc: `本回合你的${K.SH}减少3点，获得2点气`, rarity: 'low', cardType: '词牌', effect: () => { State.combat.player.turnDmgMod -= 3; State.energy += 2; } },
            'c4': { id: 'c4', name: '点水', cost: 1, type: '仄', typeClass: 'type-ze', desc: '抽取1张卡牌', rarity: 'low', cardType: '功卡', effect: () => Combat.draw(1) },
            'c5': { id: 'c5', name: '绣剑', cost: 0, type: '平', typeClass: 'type-ping', desc: '6力6防', rarity: 'equip', cardType: '装备卡', effect: () => {} },
            'c6': { id: 'c6', name: '破阵子', cost: 3, type: '仄', typeClass: 'type-ze', desc: `打出你手牌的所有武卡，下回合你不能造成${K.SH}`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.playAllAttacks(); State.combat.player.cantDmgNextTurn = true; } },
            'c7': { id: 'c7', name: '定风波', cost: 3, type: '平', typeClass: 'type-ping', desc: `你失去7点血量，让一名敌人${K.YY}`, rarity: 'high', cardType: '词牌', effect: () => { Combat.takeDmg(7, true); State.combat.enemy.stun = true; Game.showToast('敌人被旋风困住！'); } },
            'c8': { id: 'c8', name: '水调歌头', cost: 2, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `造成{V_ATK}点${K.SH}2次，抽取(1+轻功)张卡牌`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.dealDmg(0); setTimeout(()=>Combat.dealDmg(0), 200); Combat.draw(1 + State.agi); } },
            'c9': { id: 'c9', name: '念奴娇', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `${K.GF}，每回合开始失去1点生命，从弃牌堆打出1卡`, rarity: 'mid', cardType: '词牌', effect: () => { State.combat.player.nianNuJiao = true; Game.showToast('功法发动：念奴娇'); } },
            'c10': { id: 'c10', name: '满江红', cost: 0, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，抽取卡牌，本回合${K.SH}翻倍，受到的${K.SH}也翻倍`, rarity: 'mid', cardType: '词牌', effect: () => { Combat.draw(1); State.combat.player.dmgDouble = true; State.combat.player.takeDmgDouble = true; } },
            
            // [ 11-21: 低阶残卷-补充 ]
            'c11': { id: 'c11', name: '习武', cost: 0, type: '仄', typeClass: 'type-ze', desc: '本回合获得1点力，1点御', rarity: 'low', cardType: '功卡', effect: () => { State.combat.player.turnStr += 1; State.combat.player.turnDef += 1; Game.updateUI(); } },
            'c12': { id: 'c12', name: '刺击', cost: 1, type: '平', typeClass: 'type-ping', atkBase: -1, desc: `对所有敌人造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => Combat.dealDmg(-1) },
            'c13': { id: 'c13', name: '舞剑', cost: 1, type: '仄', typeClass: 'type-ze', atkBase: 1, desc: `造成{V_ATK}点${K.SH}，${K.FX}抽取1张卡牌`, isAttack: true, rarity: 'low', cardType: '武卡', effect: () => { Combat.dealDmg(1); Combat.draw(1); } },
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
            'c22': { id: 'c22', name: '歃血为盟', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，失去1点血量，对所有敌人给予三层${K.YS}和${K.XR}`, rarity: 'mid', cardType: '功卡', effect: () => { Combat.takeDmg(1, true); State.combat.enemy.weak += 3; State.combat.enemy.vuln += 3; Game.updateUI(); } },
            'c23': { id: 'c23', name: '一转攻势', cost: 1, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，你每失去3点力，获得1点力`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.yiZhuan = true; Game.showToast('一转攻势：开始计数'); } },
            'c24': { id: 'c24', name: '束手就擒', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，本回合失去2点力，敌人失去6点力`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.turnStr -= 2; Combat.onStrLost(2); Game.showToast('敌我力量削弱'); } },
            'c25': { id: 'c25', name: '厉兵秣马', cost: 0, type: '仄', typeClass: 'type-ze', desc: `在手牌中加一张${K.DW}，${K.FX}抽取三张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.hand.push({ cardId: 'c_duwu' }); Combat.draw(3); } },
            'c26': { id: 'c26', name: '万夫莫开', cost: 2, type: '平', typeClass: 'type-ping', defBase: 8, desc: `获得{V_DEF}点${K.CSHOU}，给所有敌人一层${K.XR}`, rarity: 'mid', cardType: '功卡', effect: () => { Combat.addBlock(8); State.combat.enemy.weak += 1; Game.updateUI(); } },
            'c27': { id: 'c27', name: '摧枯拉朽', cost: 2, type: '仄', typeClass: 'type-ze', keep: true, atkBase: () => 5 + (State.combat && State.combat.enemy && State.combat.enemy.maxHp ? Math.floor((1 - State.combat.enemy.hp / State.combat.enemy.maxHp) * 10) * 3 : 0), desc: `${K.BL}，造成{V_ATK}点${K.SH}，敌人每失去10%的血量，此牌的${K.SH}增加3`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => { let d = 5 + Math.floor((1 - State.combat.enemy.hp/State.combat.enemy.maxHp)*10)*3; Combat.dealDmg(d); } },
            'c28': { id: 'c28', name: '白虹贯日', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, atkBase: 5, desc: `打出后进入${K.CS}，造成{V_ATK}点${K.SH}，对血量最高敌人造成双倍${K.SH}`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => Combat.dealDmg(5) },
            'c29': { id: 'c29', name: '峨眉剑法', cost: 1, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，你每打出3张武卡，${K.FX}抽取1张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.emei = true; Game.showToast('峨眉剑法生效'); } },
            'c30': { id: 'c30', name: '以逸待劳', cost: 2, type: '平', typeClass: 'type-ping', defBase: 5, desc: `获得{V_DEF}点${K.CSHOU}，下回合额外获得2点气`, rarity: 'mid', cardType: '功卡', effect: () => { Combat.addBlock(5); State.combat.player.nextTurnEnergy = 2; } },
            'c31': { id: 'c31', name: '一剑封喉', cost: 2, type: '平', typeClass: 'type-ping', atkBase: 17, desc: `造成{V_ATK}点${K.SH}`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => Combat.dealDmg(17) },
            'c32': { id: 'c32', name: '波诡云谲', cost: 1, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，随机1张武卡加入手牌，其本回合耗气为0`, rarity: 'mid', cardType: '功卡', effect: () => { Combat.draw(1); } },
            'c33': { id: 'c33', name: '流星落月', cost: 1, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，对敌人的溢出${K.SH}转移到一名随机的其他敌人身上`, rarity: 'mid', cardType: '功卡', effect: () => { Game.showToast('流星落月生效'); } },
            'c34': { id: 'c34', name: '坚壁清野', cost: 2, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，你可以跨回合保留15点${K.CSHOU}`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.keepBlock = 15; Game.showToast('坚壁清野生效'); } },
            'c35': { id: 'c35', name: '付之一炬', cost: 1, type: '仄', typeClass: 'type-ze', desc: `将一张手牌放入${K.CS}，抽取1张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => {
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
                    }
                });
                if (State.combat.hand.length === 0) Combat.draw(1);
            } },
            'c36': { id: 'c36', name: '封刀挂剑', cost: 1, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，你每失去力时，${K.FX}抽取2张卡牌`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.fengDao = true; Game.showToast('封刀挂剑生效'); } },
            'c37': { id: 'c37', name: '七步成诗', cost: 0, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，本场战斗随机获得1份诗句残片`, rarity: 'mid', cardType: '功卡', effect: () => { Game.showToast('寻得残卷！'); } },
            'c38': { id: 'c38', name: '投笔从戎', cost: 1, type: '平', typeClass: 'type-ping', atkBase: 0, desc: `对一名敌人造成{V_ATK}点${K.SH}，本回合你的所有手牌不分平仄`, isAttack: true, rarity: 'mid', cardType: '武卡', effect: () => { Combat.dealDmg(0); State.combat.player.ignorePZ = true; } },
            'c39': { id: 'c39', name: '拔山扛鼎', cost: 1, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，本场战斗你获得4点力`, rarity: 'mid', cardType: '功卡', effect: () => { State.combat.player.combatStr += 4; Game.updateUI(); Game.showToast('拔山扛鼎：本场战斗 +4 力'); } },
            'c40': { id: 'c40', name: '文思泉涌', cost: 1, type: '仄', typeClass: 'type-ze', defBase: 0, desc: `清除你所有的${K.CSH}，每清除一个就获得{V_DEF}点${K.CSHOU}`, rarity: 'mid', cardType: '功卡', effect: () => { let count = State.combat.pzHistory.length; State.combat.pzHistory = []; Combat.renderPZ(); for(let i=0; i<count; i++) Combat.addBlock(0); } },
            
            // [ 41-50: 高阶绝学 ]
            'c41': { id: 'c41', name: '万剑归宗', cost: 3, type: '平', typeClass: 'type-ping', toExhaust: true, desc: `打出后进入${K.CS}，打出你手牌的所有武卡，同时加入它们的${K.JX}到你的手牌（这些镜像本回合耗气为0）`, rarity: 'high', cardType: '功卡', effect: () => Combat.playAllAttacks({ withMirror: true }) },
            'c42': { id: 'c42', name: '城焚烬余', cost: 2, type: '平', typeClass: 'type-ping', toExhaust: true, atkBase: -3, desc: `打出后进入${K.CS}，手牌全部放入${K.CS}，对所有敌人造成{V_ATK}点${K.SH}X次(X为${K.CS}牌数)`, isAttack: true, rarity: 'high', cardType: '武卡', effect: () => {
                // 1) 把当前所有手牌放入沉沙堆
                while (State.combat.hand.length > 0) {
                    const it = Combat.normalizeHandItem(State.combat.hand.pop());
                    State.combat.exhaustPile.push(it.cardId);
                }
                Combat.renderHand();
                // 2) X = 沉沙堆中的卡牌数（含本次操作之后的累计），至少打 1 次
                const X = Math.max(1, State.combat.exhaustPile.length);
                for (let i = 0; i < X; i++) {
                    setTimeout(() => Combat.dealDmg(-3), i * 200);
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
            'c44': { id: 'c44', name: '唇枪舌剑', cost: 3, type: '仄', typeClass: 'type-ze', toExhaust: true, atkBase: -5, desc: `${K.GF}，你每打出一张仄牌，就对随机一名敌人造成{V_ATK}点${K.SH}`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.chunQiang = true; Game.showToast('唇枪舌剑生效'); } },
            'c45': { id: 'c45', name: '固若金汤', cost: 3, type: '平', typeClass: 'type-ping', toExhaust: true, defBase: -4, desc: `${K.GF}，你每打出一张平牌，获得{V_DEF}点${K.CSHOU}`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.guRuo = true; Game.showToast('固若金汤生效'); } },
            'c46': { id: 'c46', name: '案剑瞋目', cost: 0, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `打出后进入${K.CS}，获得3点气，${K.FX}抽取3张牌，本场战斗 +3 力，3回合后死亡`, rarity: 'high', cardType: '功卡', effect: () => { State.energy += 3; Combat.draw(3); State.combat.player.combatStr += 3; State.combat.player.deathCountdown = 3; Game.updateUI(); Game.showToast('案剑瞋目：3 回合后力竭'); } },
            'c47': { id: 'c47', name: '刀光剑影', cost: 2, type: '仄', typeClass: 'type-ze', toExhaust: true, desc: `${K.GF}，所有名字里有"剑"的卡牌打出时，再打出一次`, rarity: 'high', cardType: '功卡', effect: () => { State.combat.player.daoGuang = true; Game.showToast('剑气纵横！') } },
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
            'c_duwu': { id: 'c_duwu', name: '黩武', cost: '-', type: '无', typeClass: 'type-ze', desc: `打出"${K.LBMM}"后，卡组中生成此卡，不可被打出`, rarity: 'token', cardType: '衍生物', unplayable: true, effect: () => {} }
        };
