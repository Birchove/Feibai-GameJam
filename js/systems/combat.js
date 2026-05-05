/** 功法：单场战斗仅可发动一次，不占沉沙、不可被折戟取回 */
const GONGFA_CARD_IDS = new Set(['c9', 'c23', 'c29', 'c33', 'c34', 'c36', 'c39', 'c44', 'c45', 'c47']);

const Combat = {
    enemyDmgAfterShushou: (en, raw) => Math.max(0, (raw || 0) - (en.shushouQin || 0)),

    cuiKuDamageForEnemy: (en) => {
        if (!en || en.hp <= 0 || !en.maxHp) return 5;
        return 5 + Math.floor((1 - en.hp / en.maxHp) * 10) * 3;
    },

    _arch(e) { return EnemyArchetypes[e.arch]; },

    _livingIndices() {
        return State.combat.enemies.map((en, i) => (en && en.hp > 0 ? i : -1)).filter(i => i >= 0);
    },

    _primaryTargetIdx() {
        const liv = Combat._livingIndices();
        if (!liv.length) return 0;
        if (liv.includes(State.combat.selectedTargetIndex)) return State.combat.selectedTargetIndex;
        return liv[0];
    },

    _syncEnemyAlias() {
        const e0 = State.combat.enemies[0];
        State.combat.enemy = e0 || { id: '', name: '', hp: 0, maxHp: 0, turnCounter: 1, weak: 0, vuln: 0, stun: false, block: 0, str: 0, shushouQin: 0 };
    },

    _randomOtherLivingIdx(excludeIdx) {
        const liv = Combat._livingIndices().filter(i => i !== excludeIdx);
        if (!liv.length) return -1;
        return liv[rand(0, liv.length - 1)];
    },

    start: (encounterId) => {
        AudioSys.playBGM('assets/bgm_combat.mp3');
        State.combat.encounterKey = encounterId;

        State.combat.inCombat = true;
        State.combat.turn = 1;
        State.combat.pzHistory = [];
        State.combat.drawPile = [...State.deck];
        Combat.shuffle(State.combat.drawPile);
        State.combat.discardPile = [];
        State.combat.hand = [];
        State.combat.exhaustPile = [];
        State.combat.kuHaiStats = { dealt: 0, taken: 0 };
        State.combat.liuXingLuoYue = false;
        State.combat.battleConsumed = [];
        State.combat.battleZeCount = 0;
        State.combat.battlePingCount = 0;
        State.combat.battleWuPlayed = 0;
        State.combat.qibuPoetryId = null;

        const weaponData = (typeof WeaponDB !== 'undefined' && State.weapon) ? WeaponDB[State.weapon] : null;
        const wStr = weaponData ? (weaponData.str || 0) : 0;
        const wDef = weaponData ? (weaponData.def || 0) : 0;
        State.combat.player = { block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, vuln: 0, turnStr: 0, turnDef: 0, turnDmgMod: 0, combatStr: 0, combatDef: 0, wStr, wDef, jianBiQingYe: false, nianNuJiao: false, dmgDouble: false, takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false, deathRoundsRemaining: 0, lostStrAcc: 0, emei: false, emeiCount: 0, fengDao: false, yiZhuan: false, chunQiang: false, guRuo: false, _inRepeat: false, cursedNextPlayer: false };
        State.combat.shanjia = 0;
        State.combat._snapshot = null;
        State.combat._prevSnapshot = null;

        $('pz-tracker').innerHTML = '';

        const pack = Combat_startFromEncounter(encounterId);
        if (!pack || !pack.enemies.length) {
            Game.showToast('遭遇配置错误');
            return;
        }
        State.combat.enemies = pack.enemies;
        State.combat.lastRewardTier = pack.rewardTier;
        Combat._syncEnemyAlias();
        State.combat.selectedTargetIndex = Combat._primaryTargetIdx();

        Game.navTo('screen-combat');
        Game.updateUI();
        Combat.renderEnemies();

        if (State.relics.includes('【佛像】开局震慑')) {
            setTimeout(() => {
                Game.showToast('【佛像震慑】争夺时你已受祟力反噬；此刻宝光荡开，全体敌人承受 10 点固定伤势');
                Combat.dealDmgAll(10, true);
            }, 500);
        }

        setTimeout(Combat.startTurn, 1000);
    },

    shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } },

    startTurn: () => {
        State.combat.isPlayerTurn = true;
        State.energy = State.maxEnergy + (State.combat.player.nextTurnEnergy || 0);
        State.combat.player.nextTurnEnergy = 0;

        if (State.combat.player.jianBiQingYe) {
            State.combat.player.block = Math.min(State.combat.player.block || 0, 15);
        } else {
            State.combat.player.block = 0;
        }

        State.combat.player.cantPlay = false;
        State.combat.player.cantDmg = State.combat.player.cantDmgNextTurn;
        State.combat.player.cantDmgNextTurn = false;
        if (State.combat.player.cursedNextPlayer) {
            State.combat.player.cantDmg = true;
            State.combat.player.cursedNextPlayer = false;
            Game.showToast('诅咒显化：本回合难施杀手');
        }
        State.combat.player.turnStr = 0;
        State.combat.player.turnDef = 0;
        State.combat.player.turnDmgMod = 0;
        State.combat.player.ignorePZ = false;

        if (State.combat.player.weak > 0) State.combat.player.weak--;
        if (State.combat.player.vuln > 0) State.combat.player.vuln--;

        State.combat.enemies.forEach((e) => {
            if (!e) return;
            if (e.weak > 0) e.weak--;
            if (e.vuln > 0) e.vuln--;
            if (e.stun) e.stun = false;
        });

        if (State.combat.player.nianNuJiao) {
            Combat.takeDmg(1, true);
            const dp = State.combat.discardPile;
            if (dp.length > 0) {
                let pickedIdx = -1; let picked = null;
                for (let tries = 0; tries < dp.length; tries++) {
                    const idx = rand(0, dp.length - 1);
                    const cid = dp[idx];
                    const cd = CardDB[cid];
                    if (cd && !cd.unplayable) { pickedIdx = idx; picked = cd; break; }
                }
                if (picked) {
                    const cid = dp.splice(pickedIdx, 1)[0];
                    setTimeout(() => {
                        if (!State.combat.inCombat) return;
                        Game.showToast(`念奴娇：自动打出 ${picked.name}`);
                        try { picked.effect(); } catch (err) { console.error(err); }
                        if (GONGFA_CARD_IDS.has(cid)) State.combat.battleConsumed.push(cid);
                        else if (picked.toExhaust) State.combat.exhaustPile.push(cid);
                        else State.combat.discardPile.push(cid);
                        Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                    }, 400);
                }
            }
        }

        $('end-turn-btn').className = 'active';
        $('end-turn-btn').innerText = '洗墨 (结束回合)';

        Combat.draw(State.combat.turn === 1 ? 6 : 3);

        State.combat._prevSnapshot = State.combat._snapshot || null;
        State.combat._snapshot = {
            hp: State.hp,
            energy: State.energy,
            momentum: State.momentum,
            player: { ...State.combat.player }
        };

        Game.updateUI();
        Combat.renderEnemies();
        Combat.maybeShowKuHaiFleeModal();
    },

    renderEnemies: () => {
        const list = $('enemy-list');
        if (!list) return;
        list.innerHTML = '';
        State.combat.enemies.forEach((en, i) => {
            if (!en) return;
            const wrap = document.createElement('div');
            let cls = `entity enemy-slot${i === State.combat.selectedTargetIndex ? ' target-selected' : ''}`;
            if (State.combat.isPlayerTurn) cls += ' enemy-phase-wait';
            wrap.className = cls;
            wrap.id = `enemy-slot-${i}`;
            wrap.dataset.index = String(i);
            wrap.onclick = () => {
                if (!State.combat.inCombat || !State.combat.isPlayerTurn) return;
                if (en.hp <= 0) return;
                State.combat.selectedTargetIndex = i;
                Combat.renderEnemies();
            };

            const intentEl = document.createElement('div');
            intentEl.className = 'intent';
            const arch = Combat._arch(en);
            let intentText = arch ? arch.intent(en) : '意图: …';
            intentEl.innerText = intentText;

            const spr = document.createElement('div');
            spr.className = 'asset-placeholder entity-sprite battle-enemy-sprite';
            spr.style.background = en.sprite;
            spr.style.border = 'none';

            const hpWrap = document.createElement('div');
            hpWrap.className = 'hp-container';
            const hpFill = document.createElement('div');
            hpFill.className = 'hp-fill';
            hpFill.style.width = `${en.maxHp > 0 ? (en.hp / en.maxHp) * 100 : 0}%`;
            const hpText = document.createElement('div');
            hpText.className = 'hp-text';
            const pct = en.maxHp > 0 ? Math.round((en.hp / en.maxHp) * 100) : 0;
            hpText.innerHTML = `${en.hp}/${en.maxHp}<span class="hp-pct">（${pct}%）</span>${(en.block || 0) > 0 ? ` <span class="hp-block">+${en.block}御</span>` : ''}`;
            hpWrap.appendChild(hpFill);
            hpWrap.appendChild(hpText);

            const nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-size:13px;color:#aaa;max-width:160px;text-align:center;line-height:1.3;';
            nameEl.innerText = en.name;

            const stBar = document.createElement('div');
            stBar.className = 'status-bar';
            stBar.innerHTML = Combat.renderOneEnemyStatusInner(en);

            wrap.appendChild(intentEl);
            wrap.appendChild(nameEl);
            wrap.appendChild(spr);
            wrap.appendChild(hpWrap);
            wrap.appendChild(stBar);
            list.appendChild(wrap);
        });
        Combat._syncEnemyAlias();
        if (State.combat.inCombat) Combat.updateStatusBar();
    },

    renderOneEnemyStatusInner: (en) => {
        let html = '';
        if (en.stun) html += '<div class="status-icon">🌪️<div class="status-tooltip">囿于旋风</div></div>';
        if (en.weak > 0) html += `<div class="status-icon">📉<div class="status-tooltip">虚弱 (${en.weak})</div></div>`;
        if (en.vuln > 0) html += `<div class="status-icon">💔<div class="status-tooltip">易伤 (${en.vuln})</div></div>`;
        if ((en.str || 0) > 0) html += `<div class="status-icon">力${en.str}<div class="status-tooltip">敌方力道加成</div></div>`;
        if (en.shushouQin) html += `<div class="status-icon">擒<div class="status-tooltip">束手就擒：对你造成的攻势 −${en.shushouQin}</div></div>`;
        return html;
    },

    maybeShowKuHaiFleeModal: () => {
        const kuIdx = State.combat.enemies.findIndex(e => e && e.hp > 0 && e.arch === 'ku_hai_guan_li');
        if (kuIdx < 0) return;
        Combat._buildKuHaiModalIfNeeded();
        const en = State.combat.enemies[kuIdx];
        const nextDmgRaw = 6 * en.turnCounter;
        const nextDmg = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(en, nextDmgRaw) : nextDmgRaw;
        const { dealt, taken } = State.combat.kuHaiStats;
        const pay = Math.max(0, Math.ceil(200 - dealt + taken));
        const el = $('kuhai-flee-modal');
        const tx = $('kuhai-flee-text');
        const bt = $('kuhai-flee-pay');
        tx.innerHTML = `枯骸官吏下一罚击将造成 <span style="color:var(--blood-red);font-weight:bold;">${nextDmg}</span> 点伤势。\n\n已对其造成 <b>${dealt}</b> 点伤害，自其处累计失去 <b>${taken}</b> 气血。\n按约：赎路钱财 = 200 − 已造伤害 + 已失气血 = <b style="color:var(--gold);">${pay}</b> 钱。\n\n付钱撤离将直接离开此地，不计取胜利物。`;
        const canPay = State.gold >= pay;
        bt.classList.toggle('disabled', !canPay);
        bt.onclick = () => {
            if (!canPay) return;
            State.gold -= pay;
            el.classList.remove('active');
            Combat._fleeCombatNoRewards();
        };
        $('kuhai-flee-stay').onclick = () => { el.classList.remove('active'); };
        document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'kuhai-flee-modal') m.classList.remove('active'); });
        el.classList.add('active');
    },

    _buildKuHaiModalIfNeeded: () => {
        if ($('kuhai-flee-modal')) return;
        const m = document.createElement('div');
        m.id = 'kuhai-flee-modal';
        m.className = 'modal';
        m.innerHTML = `
            <div class="kuhai-flee-box">
                <div class="kuhai-flee-title">官吏索赂</div>
                <pre id="kuhai-flee-text" class="kuhai-flee-text" style="white-space:pre-wrap;font-family:inherit;margin:0;"></pre>
                <div class="kuhai-flee-row">
                    <div class="btn-g" id="kuhai-flee-pay">付钱撤离</div>
                    <div class="btn-g" id="kuhai-flee-stay" style="border-color:#555;">继续招架</div>
                </div>
            </div>`;
        document.body.appendChild(m);
    },

    _fleeCombatNoRewards: () => {
        State.combat.inCombat = false;
        AudioSys.playBGM('assets/bgm_map.mp3');
        Game.showToast('暂且退让……');
        Game.updateUI();
        MapSys.renderMap();
        Game.navTo('screen-map');
    },

    normalizeHandItem: (item) => (typeof item === 'string') ? { cardId: item } : item,

    draw: (amt) => {
        AudioSys.playSFX('assets/sfx_draw.mp3');
        for (let i = 0; i < amt; i++) {
            if (State.combat.hand.length >= 10) break;
            if (State.combat.drawPile.length === 0) {
                if (State.combat.discardPile.length === 0) break;
                State.combat.drawPile = [...State.combat.discardPile];
                State.combat.discardPile = [];
                Combat.shuffle(State.combat.drawPile);
                Game.showToast('牌库重洗');
            }
            State.combat.hand.push({ cardId: State.combat.drawPile.pop() });
        }
        Combat.renderHand();
    },

    renderHand: () => {
        const c = $('hand-container'); c.innerHTML = '';
        $('draw-count').innerText = State.combat.drawPile.length;
        $('discard-count').innerText = State.combat.discardPile.length;
        const exEl = $('exhaust-count'); if (exEl) exEl.innerText = (State.combat.exhaustPile || []).length;

        const groupedHand = [];
        State.combat.hand.forEach((rawItem, i) => {
            const item = Combat.normalizeHandItem(rawItem);
            const groupKey = `${item.cardId}|${item.isMirror ? 'M' : 'O'}`;
            let group = groupedHand.find(g => g.key === groupKey);
            if (!group) {
                group = { key: groupKey, cardId: item.cardId, isMirror: !!item.isMirror, cards: [] };
                groupedHand.push(group);
            }
            group.cards.push({ item, index: i });
        });

        groupedHand.forEach(group => {
            const stack = document.createElement('div');
            stack.className = 'hand-card-stack';

            group.cards.forEach(({ item, index }, stackIndex) => {
                const cd = CardDB[item.cardId];
                const effCost = (item.costOverride !== undefined) ? item.costOverride : cd.cost;
                let canPlay = State.combat.isPlayerTurn && !cd.unplayable && State.energy >= effCost && !State.combat.player.cantPlay;
                if (cd.id === 'c35' && State.combat.hand.length < 2) canPlay = false;

                const el = document.createElement('div');
                el.className = `card ${canPlay ? '' : 'disabled'}${item.isMirror ? ' is-mirror' : ''}`;
                el.dataset.index = index;
                el.style.zIndex = stackIndex + 1;
                let descHtml = Game.renderCardDesc(cd);
                if (item.cardId === 'c29' && State.combat.player.emei) {
                    descHtml += `<div style="font-size:11px;color:var(--gold);margin-top:4px;text-align:center;">本场已打出武卡：${State.combat.battleWuPlayed || 0}</div>`;
                }
                el.innerHTML = `
                    <div class="card-cost">${effCost}</div><div class="card-type ${cd.typeClass}">${cd.type}</div>
                    <div class="card-name">${cd.name}${item.isMirror ? ' <span class="mirror-tag">镜</span>' : ''}</div>
                    <div class="asset-placeholder card-img" style="background: url('assets/card_${cd.id}.png') center/cover, #222; border:none;"></div>
                    <div class="card-desc">${descHtml}</div>
                `;
                bindKeywordTooltips(el);

                if (canPlay) {
                    el.onmousedown = (e) => DragSys.start(e, el, cd, index);
                    el.ontouchstart = (e) => DragSys.start(e.touches[0], el, cd, index);
                }
                stack.appendChild(el);
            });

            c.appendChild(stack);
        });
    },

    playCard: (index) => {
        const rawItem = State.combat.hand[index];
        if (!rawItem) return;
        const item = Combat.normalizeHandItem(rawItem);
        const cardId = item.cardId;
        const cd = CardDB[cardId];
        const effCost = (item.costOverride !== undefined) ? item.costOverride : cd.cost;
        if (State.energy < effCost || !State.combat.isPlayerTurn || State.combat.player.cantPlay) {
            Game.showToast('无法打出此牌');
            Combat.renderHand();
            return;
        }

        State.energy -= effCost;
        if (cd.isAttack) State.momentum = Math.min(10, State.momentum + 1);

        if (!State.combat.player.ignorePZ) {
            State.combat.pzHistory.push(cd.type);
            if (State.combat.pzHistory.length > 5) State.combat.pzHistory.shift();
            Combat.renderPZ();
            Combat.checkPoetryTrigger();
        }

        State.combat.hand.splice(index, 1);
        if (GONGFA_CARD_IDS.has(cardId)) {
            State.combat.battleConsumed.push(cardId);
        } else if (item.isMirror || cd.toExhaust) {
            State.combat.exhaustPile.push(cardId);
        } else {
            State.combat.discardPile.push(cardId);
        }

        cd.effect();

        const p = State.combat.player;
        if (cd.type === '仄' && p.chunQiang && cd.id !== 'c44') {
            setTimeout(() => {
                const t = Combat._randomOtherLivingIdx(Combat._primaryTargetIdx());
                const idx = t >= 0 ? t : Combat._primaryTargetIdx();
                Combat.dealDmg(-5, false, idx);
            }, 100);
        }
        if (cd.type === '平' && p.guRuo && cd.id !== 'c45') {
            setTimeout(() => Combat.addBlock(-4), 100);
        }
        if (cd.isAttack && p.emei) {
            p.emeiCount = (p.emeiCount || 0) + 1;
            if (p.emeiCount >= 3) {
                p.emeiCount -= 3;
                Game.showToast('峨眉剑法：抽 1 张');
                setTimeout(() => Combat.draw(1), 100);
            }
        }
        if (p.daoGuang && cd.id !== 'c47' && /剑/.test(cd.name) && !p._inRepeat) {
            setTimeout(() => {
                if (!State.combat.inCombat) return;
                p._inRepeat = true;
                try { cd.effect(); } catch (err) { console.error(err); }
                p._inRepeat = false;
                Game.showToast('刀光剑影：再打一次');
                Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
            }, 400);
        }

        if (cd.cardType === '武卡') State.combat.battleWuPlayed = (State.combat.battleWuPlayed || 0) + 1;
        if (cd.type === '仄' && cd.id !== 'c44') State.combat.battleZeCount = (State.combat.battleZeCount || 0) + 1;
        if (cd.type === '平' && cd.id !== 'c45') State.combat.battlePingCount = (State.combat.battlePingCount || 0) + 1;

        Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
    },

    openCardPicker: ({ source, maxCount = 1, prompt, onConfirm }) => {
        const sourceArr = source === 'hand' ? State.combat.hand : State.combat.exhaustPile;
        if (!sourceArr || sourceArr.length === 0) {
            Game.showToast(`${prompt || '请选择卡牌'}：可选项为空`);
            return;
        }
        const panel = $('card-picker');
        const grid = $('card-picker-grid');
        const title = $('card-picker-title');
        const confirmBtn = $('card-picker-confirm');
        const cancelBtn = $('card-picker-cancel');
        const selected = new Set();

        title.innerText = `${prompt || '请选择卡牌'}（最多 ${maxCount} 张）`;
        grid.innerHTML = '';

        sourceArr.forEach((rawItem, idx) => {
            const cid = source === 'hand' ? Combat.normalizeHandItem(rawItem).cardId : rawItem;
            const cdef = CardDB[cid]; if (!cdef) return;
            const wrap = document.createElement('div');
            wrap.className = 'picker-card-wrapper';
            wrap.appendChild(Game.createCardDOM(cdef));
            wrap.onclick = () => {
                if (selected.has(idx)) {
                    selected.delete(idx);
                    wrap.classList.remove('selected');
                } else {
                    if (selected.size >= maxCount) {
                        if (maxCount === 1) {
                            selected.clear();
                            grid.querySelectorAll('.picker-card-wrapper.selected').forEach(el2 => el2.classList.remove('selected'));
                        } else {
                            Game.showToast(`最多只能选 ${maxCount} 张`);
                            return;
                        }
                    }
                    selected.add(idx);
                    wrap.classList.add('selected');
                }
            };
            grid.appendChild(wrap);
        });

        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        panel.classList.add('active');

        const close = () => { panel.classList.remove('active'); confirmBtn.onclick = null; cancelBtn.onclick = null; };
        confirmBtn.onclick = () => {
            if (selected.size === 0) { Game.showToast('未选择'); return; }
            const indices = Array.from(selected).sort((a, b) => b - a);
            close();
            onConfirm(indices);
        };
        cancelBtn.onclick = () => { close(); };
    },

    onStrLost: (amount) => {
        const p = State.combat.player;
        if (p.yiZhuan) {
            p.lostStrAcc = (p.lostStrAcc || 0) + amount;
            while (p.lostStrAcc >= 3) {
                p.lostStrAcc -= 3;
                p.turnStr += 1;
                Game.showToast('一转攻势：本回合 +1 力');
            }
        }
        if (p.fengDao) {
            Game.showToast('封刀挂剑：抽 2 张');
            Combat.draw(2);
        }
    },

    renderPZ: () => {
        const tr = $('pz-tracker'); tr.innerHTML = '';
        const hist = State.combat.pzHistory;
        const matchLen = Combat.computeLongestMatchLen();
        hist.forEach((char, i) => {
            const s = document.createElement('span'); s.className = 'pz-char'; s.innerText = char;
            s.style.color = char === '平' ? '#9ca3af' : 'var(--blood-red)';
            if (matchLen > 0 && i >= hist.length - matchLen) s.classList.add('pz-match');
            tr.appendChild(s);
        });
        if (hist.length > 0) AudioSys.playSFX('assets/sfx_pingze.mp3');
    },

    computeLongestMatchLen: () => {
        if (typeof PoetryDB === 'undefined' || !State.poetry || State.poetry.length === 0) return 0;
        const hist = State.combat.pzHistory;
        if (!hist || hist.length === 0) return 0;
        let bestK = 0;
        for (const pid of State.poetry) {
            const pd = PoetryDB[pid];
            if (!pd || !pd.pattern) continue;
            const k = Combat.longestSuffixPrefix(hist, pd.pattern);
            if (k > bestK) bestK = k;
        }
        return bestK;
    },

    longestSuffixPrefix: (hist, pattern) => {
        const maxK = Math.min(hist.length, pattern.length);
        for (let k = maxK; k >= 1; k--) {
            let ok = true;
            for (let i = 0; i < k; i++) {
                if (hist[hist.length - k + i] !== pattern[i]) { ok = false; break; }
            }
            if (ok) return k;
        }
        return 0;
    },

    checkPoetryTrigger: () => {
        if (typeof PoetryDB === 'undefined' || !State.poetry || State.poetry.length === 0) return;
        const hist = State.combat.pzHistory;
        if (!hist || hist.length === 0) return;

        const triggered = [];
        for (const pid of State.poetry) {
            const pd = PoetryDB[pid];
            if (!pd || !pd.pattern || typeof pd.trigger !== 'function') continue;
            const N = pd.pattern.length;
            if (hist.length < N) continue;
            let match = true;
            for (let i = 0; i < N; i++) {
                if (hist[hist.length - N + i] !== pd.pattern[i]) { match = false; break; }
            }
            if (match) triggered.push(pd);
        }

        if (triggered.length === 0) return;

        setTimeout(() => {
            if (!State.combat.inCombat) return;
            triggered.forEach(pd => {
                Game.showToast(`诗韵触发：${pd.text}`);
                if (typeof Fx !== 'undefined' && Fx.poetryBurst) Fx.poetryBurst(pd.text);
                try { pd.trigger(); } catch (err) { console.error('Poetry trigger error:', err); }
            });
            State.combat.pzHistory.shift();
            Combat.renderPZ();
            Game.updateUI();
            Combat.checkDeath();
        }, 400);
    },

    playAllAttacks: (opts = {}) => {
        const playedItems = [];
        for (let i = State.combat.hand.length - 1; i >= 0; i--) {
            const it = Combat.normalizeHandItem(State.combat.hand[i]);
            const cd = CardDB[it.cardId];
            if (cd && cd.isAttack) {
                playedItems.push(it);
                State.combat.hand.splice(i, 1);
            }
        }
        if (playedItems.length === 0) return;

        let delay = 0;
        playedItems.forEach(it => {
            setTimeout(() => {
                const cd = CardDB[it.cardId];
                if (GONGFA_CARD_IDS.has(it.cardId)) {
                    State.combat.battleConsumed.push(it.cardId);
                } else if (it.isMirror || cd.toExhaust) {
                    State.combat.exhaustPile.push(it.cardId);
                } else {
                    State.combat.discardPile.push(it.cardId);
                }
                cd.effect();
                State.momentum = Math.min(10, State.momentum + 1);
                const pr = State.combat.player;
                if (cd.cardType === '武卡') State.combat.battleWuPlayed = (State.combat.battleWuPlayed || 0) + 1;
                if (cd.isAttack && pr.emei) {
                    pr.emeiCount = (pr.emeiCount || 0) + 1;
                    if (pr.emeiCount >= 3) {
                        pr.emeiCount -= 3;
                        Game.showToast('峨眉剑法：抽 1 张');
                        Combat.draw(1);
                    }
                }
                Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
            }, delay);
            delay += 400;
        });
        if (opts.withMirror) {
            setTimeout(() => {
                playedItems.forEach(it => {
                    if (State.combat.hand.length >= 10) return;
                    State.combat.hand.push({ cardId: it.cardId, isMirror: true, costOverride: 0 });
                });
                Combat.renderHand();
            }, delay);
        }
    },

    dealDmgAll: (base, isFixed = false) => {
        const liv = Combat._livingIndices();
        liv.forEach((idx, n) => {
            Combat.dealDmg(base, isFixed, idx, { fromAoE: true, deferRemoveDead: n < liv.length - 1 });
        });
        Combat._removeDeadEnemies();
        Combat.renderEnemies();
        Game.updateUI();
        Combat.checkDeath();
    },

    dealDmg: (base, isFixed = false, targetIdx, opts = {}) => {
        AudioSys.playSFX('assets/sfx_hit.mp3');
        if (State.combat.player.cantDmg) { Game.showToast('止战：本回合无法造成伤害！'); return; }

        if (State._dev && State._devOneShot) {
            State.combat.enemies.forEach((en, i) => {
                if (en && en.hp > 0) {
                    const killAmt = en.hp;
                    en.hp = 0;
                    Combat.floatTextSlot(i, `-${killAmt}`, 'crit');
                }
            });
            $('screen-combat').classList.add('hit-stop');
            setTimeout(() => { $('screen-combat').classList.remove('hit-stop'); }, 300);
            Combat._removeDeadEnemies();
            Combat.renderEnemies();
            Game.updateUI();
            Combat.checkDeath();
            return;
        }

        const idx = targetIdx !== undefined && targetIdx !== null
            ? targetIdx
            : Combat._primaryTargetIdx();
        const enemy = State.combat.enemies[idx];
        if (!enemy || enemy.hp <= 0) return;

        const p = State.combat.player;
        let dmg = isFixed ? base : base + State.str + (p.combatStr || 0) + (p.turnStr || 0) + (p.wStr || 0);
        dmg += (p.turnDmgMod || 0);
        if (dmg < 0) dmg = 0;

        let isCrit = false;
        if (State.momentum >= 10) { dmg = Math.floor(dmg * 1.5); State.momentum = 0; isCrit = true; }
        if (State.combat.player.dmgDouble) dmg *= 2;

        if (State.combat.player.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (enemy.vuln > 0) dmg = Math.floor(dmg * 1.5);

        const hpBefore = enemy.hp;
        const blockBefore = enemy.block || 0;
        let remaining = dmg;

        if (remaining > 0 && (enemy.block || 0) > 0) {
            const useBlock = Math.min(enemy.block, remaining);
            enemy.block -= useBlock;
            remaining -= useBlock;
        }

        const toHp = Math.min(enemy.hp, remaining);
        enemy.hp -= toHp;
        const overflow = remaining - toHp;

        if (enemy.arch === 'ku_hai_guan_li') {
            State.combat.kuHaiStats.dealt += (hpBefore - enemy.hp) + (blockBefore - (enemy.block || 0));
        }

        Combat.floatTextSlot(idx, `-${dmg}`, isCrit ? 'crit' : '');
        Combat.pulseEnemySlot(idx, 'hit');
        $('screen-combat').classList.add('hit-stop');
        setTimeout(() => { $('screen-combat').classList.remove('hit-stop'); }, 300);

        if (State.combat.liuXingLuoYue && overflow > 0) {
            const depth = opts.chainDepth || 0;
            if (depth < 24) {
                const oth = Combat._randomOtherLivingIdx(idx);
                if (oth >= 0) {
                    setTimeout(() => {
                        if (!State.combat.inCombat) return;
                        Combat.dealDmg(overflow, true, oth, { fromOverflow: true, chainDepth: depth + 1 });
                    }, 120);
                }
            }
        }

        if (!opts.deferRemoveDead) {
            Combat._removeDeadEnemies();
            Combat.renderEnemies();
            Game.updateUI();
            Combat.checkDeath();
        }
    },

    pulseEnemySlot: (idx, kind) => {
        const el = $(`enemy-slot-${idx}`);
        if (!el) return;
        el.classList.remove('enemy-glow-hit', 'enemy-glow-buff');
        void el.offsetWidth;
        el.classList.add(kind === 'buff' ? 'enemy-glow-buff' : 'enemy-glow-hit');
        setTimeout(() => { el.classList.remove('enemy-glow-hit', 'enemy-glow-buff'); }, 620);
    },

    pulseEnemyEntity: (en) => {
        if (!en) return;
        const i = State.combat.enemies.indexOf(en);
        if (i >= 0) Combat.pulseEnemySlot(i, 'buff');
    },

    floatTextSlot: (idx, text, cls) => {
        const slot = $(`enemy-slot-${idx}`);
        if (!slot) return;
        const el = document.createElement('div'); el.className = `dmg-text ${cls}`; el.innerText = text;
        const rect = slot.getBoundingClientRect();
        el.style.left = `${rect.left + rect.width / 2 - 20}px`;
        el.style.top = `${rect.top + 40}px`;
        document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
    },

    _removeDeadEnemies: () => {
        State.combat.enemies = State.combat.enemies.filter(e => e && e.hp > 0);
        State.combat.enemies.forEach((e, i) => { e.slotIndex = i; });
        Combat._clampTarget();
        Combat._syncEnemyAlias();
    },

    _clampTarget() {
        const liv = Combat._livingIndices();
        if (!liv.length) return;
        if (!liv.includes(State.combat.selectedTargetIndex)) State.combat.selectedTargetIndex = liv[0];
    },

    takeDmg: (dmg, ignoreBlock = false, attacker) => {
        if (attacker && attacker.shushouQin) dmg = Math.max(0, dmg - attacker.shushouQin);
        if (attacker && attacker.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (State.combat.player.vuln > 0 && !ignoreBlock) dmg = Math.floor(dmg * 1.5);
        if (State.combat.player.takeDmgDouble && !ignoreBlock) dmg *= 2;

        const hpBeforePlayer = State.hp;

        if (!ignoreBlock) {
            if (State.combat.player.block > 0) {
                if (State.combat.player.block >= dmg) {
                    State.combat.player.block -= dmg;
                    dmg = 0;
                    Combat.floatText('player', '持守', 'block');
                } else {
                    dmg -= State.combat.player.block;
                    State.combat.player.block = 0;
                }
            }
        }

        if (dmg > 0) {
            let nextHp = State.hp - dmg;
            if (State._dev && State._devGod && nextHp < 1) nextHp = 1;
            State.hp = Math.max(0, nextHp);
            Combat.floatText('player', `-${dmg}`, 'crit');
            $('player').classList.add('shake'); setTimeout(() => $('player').classList.remove('shake'), 300);

            if (attacker && attacker.arch === 'ku_hai_guan_li') {
                State.combat.kuHaiStats.taken += hpBeforePlayer - State.hp;
            }
        }
        Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
    },

    heal: (amt) => { State.hp = Math.min(State.maxHp, State.hp + amt); Game.updateUI(); Game.showToast(`回复 ${amt} 生命`); },

    addBlock: (base, isFixed = false) => {
        const p = State.combat.player;
        let blk = isFixed ? base : base + State.def + (p.combatDef || 0) + (p.turnDef || 0) + (p.wDef || 0);
        if (blk < 0) blk = 0;
        p.block += blk;
        Game.updateUI();
        Combat.floatText('player', `+${blk} 持守`, 'block');
    },

    previewAtk: (cd) => {
        const baseRaw = (typeof cd.atkBase === 'function') ? cd.atkBase() : cd.atkBase;
        const base = baseRaw || 0;
        const lines = [];
        if (cd.isFixed) {
            return { value: Math.max(0, base), tip: `固定值：${base}（无视角色武力与武器属性）` };
        }
        const inCombat = !!(State.combat && State.combat.inCombat);
        const p = inCombat ? State.combat.player : null;
        const cStr = p ? (p.combatStr || 0) : 0;
        const tStr = p ? (p.turnStr || 0) : 0;
        const wStr = p ? (p.wStr || 0) : (State.weapon && typeof WeaponDB !== 'undefined' && WeaponDB[State.weapon] ? (WeaponDB[State.weapon].str || 0) : 0);
        const tDmgMod = p ? (p.turnDmgMod || 0) : 0;
        const total = Math.max(0, base + State.str + cStr + tStr + wStr + tDmgMod);
        lines.push(`卡牌特性 ${base >= 0 ? '+' : ''}${base}`);
        lines.push(`角色武力 +${State.str}`);
        if (wStr) lines.push(`武器属性 +${wStr}`);
        if (cStr) lines.push(`战斗武力 ${cStr >= 0 ? '+' : ''}${cStr}`);
        if (tStr) lines.push(`本回合武力 ${tStr >= 0 ? '+' : ''}${tStr}`);
        if (tDmgMod) lines.push(`本回合伤害修正 ${tDmgMod >= 0 ? '+' : ''}${tDmgMod}`);
        lines.push(`= ${total}`);
        return { value: total, tip: lines.join('\n') };
    },

    previewDef: (cd) => {
        const baseRaw = (typeof cd.defBase === 'function') ? cd.defBase() : cd.defBase;
        const base = baseRaw || 0;
        const lines = [];
        if (cd.isFixed) {
            return { value: Math.max(0, base), tip: `固定值：${base}（无视角色武力与武器属性）` };
        }
        const inCombat = !!(State.combat && State.combat.inCombat);
        const p = inCombat ? State.combat.player : null;
        const cDef = p ? (p.combatDef || 0) : 0;
        const tDef = p ? (p.turnDef || 0) : 0;
        const wDef = p ? (p.wDef || 0) : (State.weapon && typeof WeaponDB !== 'undefined' && WeaponDB[State.weapon] ? (WeaponDB[State.weapon].def || 0) : 0);
        const total = Math.max(0, base + State.def + cDef + tDef + wDef);
        lines.push(`卡牌特性 ${base >= 0 ? '+' : ''}${base}`);
        lines.push(`角色御力 +${State.def}`);
        if (wDef) lines.push(`武器属性 +${wDef}`);
        if (cDef) lines.push(`战斗御力 ${cDef >= 0 ? '+' : ''}${cDef}`);
        if (tDef) lines.push(`本回合御力 ${tDef >= 0 ? '+' : ''}${tDef}`);
        lines.push(`= ${total}`);
        return { value: total, tip: lines.join('\n') };
    },

    floatText: (targetId, text, cls) => {
        const el = document.createElement('div'); el.className = `dmg-text ${cls}`; el.innerText = text;
        const rect = $(targetId).getBoundingClientRect();
        el.style.left = `${rect.left + rect.width / 2 - 20}px`;
        el.style.top = `${rect.top + 50}px`;
        document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
    },

    endTurn: () => {
        if (!State.combat.isPlayerTurn) return;
        const kuModal = $('kuhai-flee-modal');
        if (kuModal && kuModal.classList.contains('active')) return;

        State.combat.isPlayerTurn = false;
        $('end-turn-btn').className = '';
        $('end-turn-btn').innerText = '敌方回合';

        for (let i = State.combat.hand.length - 1; i >= 0; i--) {
            const it = Combat.normalizeHandItem(State.combat.hand[i]);
            if (it.isMirror) {
                State.combat.hand.splice(i, 1);
                State.combat.exhaustPile.push(it.cardId);
            }
        }

        Combat.renderHand();
        setTimeout(Combat.enemyTurn, 1000);
    },

    updateEnemyIntent: () => {
        State.combat.enemies.forEach((en, i) => {
            const slot = $(`enemy-slot-${i}`);
            if (!slot) return;
            const intentEl = slot.querySelector('.intent');
            const arch = Combat._arch(en);
            if (intentEl && arch) intentEl.innerText = arch.intent(en);
        });
    },

    enemyTurn: () => {
        if (State._dev && State._devSkipEnemy) {
            Game.showToast('开发者模式：敌方回合已跳过');
        } else {
            State.combat.enemies.forEach((e) => {
                if (!e || e.hp <= 0) return;
                if (e.stun) {
                    Game.showToast(`${e.name}囿于旋风中无法行动！`);
                } else {
                    const arch = Combat._arch(e);
                    if (arch) arch.act(e);
                }
                if (!(State._dev && State._devSkipEnemy)) e.turnCounter++;
            });
        }

        const p = State.combat.player;
        if (p.deathRoundsRemaining > 0) {
            p.deathRoundsRemaining -= 1;
            if (p.deathRoundsRemaining === 0) {
                Game.showToast('案剑瞋目：力竭而亡');
                State.hp = 0;
                Game.updateUI();
                Combat.checkDeath();
                return;
            }
        }

        if (State.hp > 0 && Combat._livingIndices().length > 0) {
            State.combat.turn++;
            setTimeout(Combat.startTurn, 1000);
        }
    },

    updateStatusBar: () => {
        const pBar = $('player-status-bar');
        const p = State.combat.player;
        if (pBar) {
            pBar.innerHTML = '';
            const totalStr = State.str + (p.combatStr || 0) + (p.turnStr || 0) + (p.wStr || 0);
            const totalDef = State.def + (p.combatDef || 0) + (p.turnDef || 0) + (p.wDef || 0);
            const strDetail = `角色武力 ${State.str}` + (p.wStr ? `\n武器属性 +${p.wStr}` : '') + (p.combatStr ? `\n战斗武力 ${p.combatStr >= 0 ? '+' : ''}${p.combatStr}` : '') + (p.turnStr ? `\n本回合武力 ${p.turnStr >= 0 ? '+' : ''}${p.turnStr}` : '') + `\n= ${totalStr}`;
            const defDetail = `角色御力 ${State.def}` + (p.wDef ? `\n武器属性 +${p.wDef}` : '') + (p.combatDef ? `\n战斗御力 ${p.combatDef >= 0 ? '+' : ''}${p.combatDef}` : '') + (p.turnDef ? `\n本回合御力 ${p.turnDef >= 0 ? '+' : ''}${p.turnDef}` : '') + `\n= ${totalDef}`;
            pBar.innerHTML += `<div class="status-icon">⚔ ${totalStr}<div class="status-tooltip">${strDetail.replace(/\n/g, '<br>')}</div></div>`;
            pBar.innerHTML += `<div class="status-icon">🛡 ${totalDef}<div class="status-tooltip">${defDetail.replace(/\n/g, '<br>')}</div></div>`;
            if (p.weak > 0) pBar.innerHTML += `<div class="status-icon">📉<div class="status-tooltip">虚弱 (剩余 ${p.weak} 回合)</div></div>`;
            if (p.vuln > 0) pBar.innerHTML += `<div class="status-icon">💔<div class="status-tooltip">易伤 (剩余 ${p.vuln} 回合)</div></div>`;
            if (p.cantPlay) pBar.innerHTML += `<div class="status-icon">🛑<div class="status-tooltip">禁锢</div></div>`;
            if (p.cantDmg) pBar.innerHTML += `<div class="status-icon">🕊️<div class="status-tooltip">止战</div></div>`;
            if (p.turnDmgMod !== 0) pBar.innerHTML += `<div class="status-icon">🩸<div class="status-tooltip">本回合伤害修正：${p.turnDmgMod > 0 ? '+' + p.turnDmgMod : p.turnDmgMod}</div></div>`;
            if (p.deathRoundsRemaining > 0) {
                pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">☠ ${p.deathRoundsRemaining}<div class="status-tooltip">案剑瞋目：距离死亡还有 ${p.deathRoundsRemaining} 回合</div></div>`;
            }
            if (p.yiZhuan) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">↻<div class="status-tooltip">一转攻势</div></div>`;
            if (p.fengDao) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">🗡<div class="status-tooltip">封刀挂剑</div></div>`;
            if (p.emei) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚡ ${p.emeiCount || 0}<div class="status-tooltip">峨眉剑法（3 武卡抽 1）</div></div>`;
            if (p.chunQiang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">舌${State.combat.battleZeCount != null ? State.combat.battleZeCount : 0}<div class="status-tooltip">唇枪舌剑：本场已打出仄牌 ${State.combat.battleZeCount || 0}（不含本身）</div></div>`;
            if (p.guRuo) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">壁${State.combat.battlePingCount != null ? State.combat.battlePingCount : 0}<div class="status-tooltip">固若金汤：本场已打出平牌 ${State.combat.battlePingCount || 0}（不含本身）</div></div>`;
            if (p.daoGuang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚔×2<div class="status-tooltip">刀光剑影（不含本身；每张含剑名仅追加一次）</div></div>`;
            if (p.nianNuJiao) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">📜<div class="status-tooltip">念奴娇</div></div>`;
            if (p.dmgDouble || p.takeDmgDouble) pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">2×<div class="status-tooltip">满江红</div></div>`;
            if (p.jianBiQingYe) pBar.innerHTML += `<div class="status-icon" style="color:#60a5fa;">壁≤15<div class="status-tooltip">坚壁清野：每回合至多跨回合保留 15 点持守</div></div>`;
        }
    },

    viewPile: (type) => {
        if (!State.combat.inCombat) return;
        Game.toggleModal('pile-panel');
        const grid = $('pile-grid');
        grid.innerHTML = '';

        let pileArray; let label;
        if (type === 'draw') { pileArray = State.combat.drawPile; label = '抽牌堆'; }
        else if (type === 'exhaust') { pileArray = State.combat.exhaustPile; label = '沉沙堆'; }
        else { pileArray = State.combat.discardPile; label = '弃牌堆'; }
        $('pile-title').innerText = `${label} (${pileArray.length} 张)`;

        const counts = {};
        pileArray.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

        Object.entries(counts).forEach(([cId, count]) => {
            grid.appendChild(Game.createCardDOM(CardDB[cId], count));
        });
    },

    checkDeath: () => {
        if (State.hp <= 0) {
            State.combat.inCombat = false;
            Game.showToast('胜败乃兵家常事，大侠重新来过...');
            AudioSys.stopBGM();
            setTimeout(() => Game.navTo('screen-main'), 3000);
        } else if (State.combat.inCombat && Combat._livingIndices().length === 0) {
            State._qibuPoetryReward = State.combat.qibuPoetryId || null;
            State.combat.qibuPoetryId = null;
            State.combat.inCombat = false;
            AudioSys.playBGM('assets/bgm_map.mp3');
            setTimeout(() => {
                Settlement.show(State.combat.lastRewardTier || 'normal');
            }, 1500);
        }
    }
};
