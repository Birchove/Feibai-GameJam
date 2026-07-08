/** 功法：单场战斗仅可发动一次，不占沉沙、不可被折戟取回 */
const GONGFA_CARD_IDS = new Set(['c9', 'c23', 'c29', 'c33', 'c34', 'c36', 'c39', 'c44', 'c45', 'c47']);

/** 需选单体的攻击牌中，群体伤害类(多敌时允许在空白处打出，仍打全体) */
const ATTACK_CARD_NO_ENEMY_TARGET = new Set(['c12', 'c28', 'c42']);

const Combat = {
    /** 下一次 `Combat.start` 使用的战斗背景皮肤(由地图节点 `combatBg` 传入；使用后清空) */
    _nextCombatBgSkin: null,

    setNextCombatBackground: (skin) => {
        Combat._nextCombatBgSkin = skin || null;
    },

    _COMBAT_BG_SCREEN_CLASSES: ['combat-bg-mountain'],

    applyCombatBackgroundToScreen: (skin) => {
        const el = $('screen-combat');
        if (!el) return;
        Combat._COMBAT_BG_SCREEN_CLASSES.forEach((c) => el.classList.remove(c));
        if (skin === 'mountain') el.classList.add('combat-bg-mountain');
    },

    /** 功法：本场战斗打出后，同 ID 不再出现在抽/弃/手/沉沙(非沉沙消耗，本场封存) */
    registerBattleConsumed: (cardId) => {
        if (!GONGFA_CARD_IDS.has(cardId)) return;
        if (!State.combat.battleConsumed.includes(cardId)) State.combat.battleConsumed.push(cardId);
        Combat._purgeConsumedCardsFromCombatPiles();
    },

    _purgeConsumedCardsFromCombatPiles: () => {
        const ban = new Set(State.combat.battleConsumed || []);
        if (ban.size === 0) return;
        State.combat.drawPile = (State.combat.drawPile || []).filter((id) => !ban.has(id));
        State.combat.discardPile = (State.combat.discardPile || []).filter((id) => !ban.has(id));
        State.combat.exhaustPile = (State.combat.exhaustPile || []).filter((id) => !ban.has(id));
        for (let i = State.combat.hand.length - 1; i >= 0; i--) {
            const cid = Combat.normalizeHandItem(State.combat.hand[i]).cardId;
            if (ban.has(cid)) State.combat.hand.splice(i, 1);
        }
    },

    enemyDmgAfterShushou: (en, raw) => Math.max(0, (raw || 0) - (en.shushouQin || 0) - (en.atkDownThisRound || 0)),

    cuiKuDamageForEnemy: (en) => {
        if (!en || en.hp <= 0 || !en.maxHp) return 5;
        return 5 + Math.floor((1 - en.hp / en.maxHp) * 10) * 3;
    },

    cardNeedsEnemyTarget: (cd) => {
        if (!cd || cd.unplayable || !cd.isAttack) return false;
        if (ATTACK_CARD_NO_ENEMY_TARGET.has(cd.id)) return false;
        return true;
    },

    getIntentText: (en) => {
        const arch = Combat._arch(en);
        if (!arch) return '意图: …';
        if (arch.displayIntent) return arch.displayIntent(en);
        return arch.intent(en);
    },

    /** 意图条悬停：白话详解(含具体数值)；仅部分 archetype 实现，其余返回 null 不设 title */
    getIntentHover: (en) => {
        const arch = Combat._arch(en);
        if (!arch || typeof arch.intentHover !== 'function') return null;
        try {
            const t = arch.intentHover(en);
            return t ? String(t) : null;
        } catch (_) {
            return null;
        }
    },

    refreshEnemyIntentLocks: () => {
        if (!State.combat || !State.combat.inCombat) return;
        const t = State.combat.turn;
        State.combat.enemies.forEach((en) => {
            if (!en || en.hp <= 0) return;
            if (en.arch === 'chi_mei_single') {
                if (en._chiLockTurn === t) return;
                en._chiLockTurn = t;
                if (en.turnCounter % 2 !== 0) {
                    en._chiMeiNext = Math.random() < 0.75 ? 'weak' : 'atk';
                } else {
                    en._chiMeiNext = 'tear';
                }
            } else if (en.arch === 'lan_shi_guai') {
                const ph = en._lsPhase % 3;
                if (ph === 1) {
                    if (en._lanLockTurn !== t) {
                        en._lanLockTurn = t;
                        en._lanNext = Math.random() < 0.5 ? 'atk' : 'blk';
                    }
                }
            }
        });
    },

    intentGlowKind: (en) => {
        const arch = Combat._arch(en);
        if (arch && typeof arch.intentGlow === 'function') return arch.intentGlow(en);
        const s = Combat.getIntentText(en);
        if (/等待|僵滞/.test(s)) return 'wait';
        if (/攻击\s*\(|侵攻|攻袭|缢杀|勾魂|链鞭|量罪|撕扯|罚击|脓毒攻|扑击|勾魂锥|索命|猛袭|薄惩|还魂鞭/.test(s)) return 'atk';
        if (/虚弱|诅咒|枷印|眩晕|虚弱咒|御骸|持守|尸皮|凝煞|易伤|咒[(：]|咒缚|冥律|再缚|借生气|聚怨/.test(s)) return 'buff';
        return 'wait';
    },

    _resolveAtkBaseForTarget: (cd, idx) => {
        if (cd.atkBase === undefined) return 0;
        if (typeof cd.atkBase === 'function') {
            if (cd.id === 'c27') {
                const en = State.combat.enemies[idx];
                return Combat.cuiKuDamageForEnemy(en);
            }
            return cd.atkBase();
        }
        return cd.atkBase;
    },

    previewDamageToSlot: (cd, idx) => {
        if (!cd || !cd.isAttack) return null;
        const en = State.combat.enemies[idx];
        if (!en || en.hp <= 0) return null;
        const baseRaw = Combat._resolveAtkBaseForTarget(cd, idx);
        const base = baseRaw || 0;
        const p = State.combat.player;
        let dmg = cd.isFixed ? base : base + State.str + (p.combatStr || 0) + (p.turnStr || 0) + (p.wStr || 0) + (p.turnDmgMod || 0);
        if (dmg < 0) dmg = 0;
        const momCrit = State.momentum >= 10;
        if (momCrit) {
            const mult = (State.relics && State.relics.includes('【红缨枪】')) ? 2 : 1.5;
            dmg = Math.floor(dmg * mult);
        }
        if (p.dmgDouble) dmg *= 2;
        if (p.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (en.vuln > 0) dmg = Math.floor(dmg * 1.5);
        let hits = 1;
        if (cd.id === 'c21' || cd.id === 'c8') hits = 2;
        if (cd.id === 'c15') hits = 3;
        const total = dmg * hits;
        return { perHit: dmg, hits, total, momCrit };
    },

    updateDragBattleHint: (cd, pt) => {
        const hint = $('drag-battle-hint');
        if (!hint || !State.combat || !State.combat.inCombat || !cd) return;
        document.querySelectorAll('.entity.enemy-slot.drag-hover-target').forEach((el) => el.classList.remove('drag-hover-target'));
        if (!Combat.cardNeedsEnemyTarget(cd)) {
            hint.classList.remove('visible');
            hint.setAttribute('aria-hidden', 'true');
            return;
        }
        const liv = Combat._livingIndices();
        if (!liv.length) {
            hint.classList.remove('visible');
            return;
        }
        let hitIdx = -1;
        if (pt && State.combat.enemies && State.combat.enemies.length) {
            State.combat.enemies.forEach((en, i) => {
                if (!en || en.hp <= 0) return;
                const slot = document.getElementById(`enemy-slot-${i}`);
                if (!slot) return;
                const r = slot.getBoundingClientRect();
                if (pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) hitIdx = i;
            });
        }
        hint.style.left = `${pt.x}px`;
        hint.style.top = `${pt.y}px`;
        if (liv.length > 1 && hitIdx < 0) {
            hint.innerHTML = '请将牌拖到敌影之上';
            hint.classList.add('visible');
            hint.setAttribute('aria-hidden', 'false');
            return;
        }
        const useIdx = hitIdx >= 0 ? hitIdx : liv[0];
        const slotEl = $(`enemy-slot-${useIdx}`);
        if (slotEl) slotEl.classList.add('drag-hover-target');
        const en = State.combat.enemies[useIdx];
        const prev = Combat.previewDamageToSlot(cd, useIdx);
        if (!prev) {
            hint.classList.remove('visible');
            return;
        }
        const momNote = prev.momCrit ? ((State.relics && State.relics.includes('【红缨枪】')) ? '(含蓄势×2)' : '(含蓄势×1.5)') : '';
        const hitDetail = prev.hits > 1
            ? `每段 ${prev.perHit} 点，合计 ${prev.total} 点`
            : `${prev.perHit} 点`;
        hint.innerHTML = `<b>${en.name}</b> · 预计伤势 ${hitDetail}${momNote}`;
        hint.classList.add('visible');
        hint.setAttribute('aria-hidden', 'false');
    },

    clearDragBattleHint: () => {
        const hint = $('drag-battle-hint');
        if (hint) {
            hint.classList.remove('visible');
            hint.setAttribute('aria-hidden', 'true');
        }
        document.querySelectorAll('.entity.enemy-slot.drag-hover-target').forEach((el) => el.classList.remove('drag-hover-target'));
    },

    isRunActive: (runId) => (
        typeof Game !== 'undefined' && Game.isRunActive
            ? Game.isRunActive(runId)
            : ((State._runId || 0) === runId && !!State._hasJourneyCheckpoint)
    ),

    isCombatActive: (runId, combatId) => (
        !!(State.combat && State.combat.inCombat && Combat.isRunActive(runId) && State.combat._combatId === combatId)
    ),

    isPZChoicePending: () => {
        const modal = $('pz-choice-modal');
        return !!(State.combat && (State.combat._pendingPZChoice || (modal && modal.classList.contains('active'))));
    },

    openPZChoiceModal: (onPick) => {
        let modal = $('pz-choice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pz-choice-modal';
            modal.className = 'modal';
            modal.style.zIndex = '980';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="kuhai-flee-box" style="max-width:420px;">
                <div class="kuhai-flee-title" style="margin-bottom:8px;">投笔从戎</div>
                <div class="kuhai-flee-text" style="text-align:center;">这一笔，欲写「平」还是「仄」？</div>
                <div class="kuhai-flee-row" style="margin-top:14px;">
                    <div class="btn-g" id="pz-pick-ping" style="font-size:18px;">平</div>
                    <div class="btn-g" id="pz-pick-ze" style="font-size:18px;">仄</div>
                </div>
            </div>`;
        modal.classList.add('active');
        $('pz-pick-ping').onclick = (ev) => {
            ev.stopPropagation();
            modal.classList.remove('active');
            if (typeof onPick === 'function') onPick('平');
        };
        $('pz-pick-ze').onclick = (ev) => {
            ev.stopPropagation();
            modal.classList.remove('active');
            if (typeof onPick === 'function') onPick('仄');
        };
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
        const runId = State._runId || 0;
        const combatId = (State.combat._combatId || 0) + 1;
        const pendingBg = Combat._nextCombatBgSkin;
        Combat._nextCombatBgSkin = null;
        Combat.applyCombatBackgroundToScreen(pendingBg);

        const bossBattle = encounterId === 'enc_yan_luo_wang';
        AudioSys.playBGMTrack(bossBattle ? 'boss' : 'combat');
        State.combat._runId = runId;
        State.combat._combatId = combatId;
        State.combat.encounterKey = encounterId;

        State.combat.inCombat = true;
        State.combat.turn = 1;
        State.combat.pzHistory = [];
        State.combat._pendingPZChoice = false;
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
        if (typeof State.combat._incenseCount !== 'number') State.combat._incenseCount = 0;
        State.combat.playerHpLost = 0;
        State.combat._ritualSkullFired = false;
        State.combat.ganShiEchoEnemyPhase = false;
        State.combat.ganShiEchoEnemyStacks = 0;
        State.combat._ganShiReflecting = false;
        State.combat._ganShiReflectHandled = false;

        const weaponData = (typeof WeaponDB !== 'undefined' && State.weapon) ? WeaponDB[State.weapon] : null;
        const wStr = weaponData ? (weaponData.str || 0) : 0;
        const wDef = weaponData ? (weaponData.def || 0) : 0;
        State.combat.player = { block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, weakNextTurn: 0, vuln: 0, turnStr: 0, turnDef: 0, turnDmgMod: 0, combatStr: 0, combatDef: 0, wStr, wDef, jianBiQingYe: false, nianNuJiao: false, dmgDouble: false, takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false, deathRoundsRemaining: 0, lostStrAcc: 0, emei: false, emeiCount: 0, fengDao: false, yiZhuan: false, chunQiang: false, guRuo: false, _inRepeat: false, cursedNextPlayer: false, yanJunxingBloodCount: 0, yanJunxingNextStr: 0, incorporealStacks: 0, choosePZThisTurn: false, nextTurnEnergy: 0 };
        State.combat.shanjia = 0;
        State.combat._snapshot = null;
        State.combat._prevSnapshot = null;

        $('pz-tracker').innerHTML = '';

        const pack = Combat_startFromEncounter(encounterId);
        if (!pack || !pack.enemies.length) {
            State.combat.inCombat = false;
            State.combat._pendingPZChoice = false;
            AudioSys.playBGMTrack('world');
            Game.showToast('此战遭遇未成编，恐有误');
            return;
        }
        State.combat.enemies = pack.enemies;
        State.combat.lastRewardTier = pack.rewardTier;
        Combat._syncEnemyAlias();
        State.combat.selectedTargetIndex = Combat._primaryTargetIdx();

        Combat.refreshEnemyIntentLocks();
        Game.navTo('screen-combat');
        Game.updateUI();
        Combat.renderEnemies();

        if (State.relics.includes('【佛像】') || State.relics.includes('【佛像】开局震慑')) {
            setTimeout(() => {
                if (!Combat.isCombatActive(runId, combatId)) return;
                Game.showToast('【佛像】光起：诸邪各承 11 点惩戒');
                Combat.dealDmgAll(11, true);
            }, 500);
        }

        setTimeout(() => {
            if (Combat.isCombatActive(runId, combatId)) Combat.startTurn();
        }, 1000);
    },

    shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } },

    startTurn: () => {
        if (!State.combat || !State.combat.inCombat || !Combat.isCombatActive(State.combat._runId, State.combat._combatId)) return;
        State.combat.isPlayerTurn = true;
        State.energy = State.maxEnergy + (State.combat.player.nextTurnEnergy || 0);
        State.combat.player.nextTurnEnergy = 0;

        if ((State.combat.player.incorporealStacks || 0) > 0) {
            State.combat.player.incorporealStacks = Math.max(0, State.combat.player.incorporealStacks - 1);
        }

        if (State.combat.player.jianBiQingYe) {
            State.combat.player.block = Math.min(State.combat.player.block || 0, 15);
        } else {
            State.combat.player.block = 0;
        }

        if (State.relics.includes('【八卦护心镜】')) {
            const n = State.combat.turn || 1;
            const blk = Math.max(0, 10 - 2 * n);
            if (blk > 0) {
                Combat.addBlock(blk, true);
                Game.showToast(`【八卦护心镜】镜华凝壁，持守 +${blk}`);
            }
        }

        if (State.relics.includes('【香炉】')) {
            State.combat._incenseCount = (State.combat._incenseCount || 0) + 1;
            if (State.combat._incenseCount >= 6) {
                State.combat._incenseCount = 0;
                State.combat.player.incorporealStacks = (State.combat.player.incorporealStacks || 0) + 1;
                Game.showToast('【香炉】青烟绕身：无实体 +1(计数已清；每轮我方回合层数 −1)');
            }
        }

        State.combat.player.cantPlay = false;
        State.combat.player.cantDmg = State.combat.player.cantDmgNextTurn;
        State.combat.player.cantDmgNextTurn = false;
        if (State.combat.player.cursedNextPlayer) {
            State.combat.player.cantDmg = true;
            State.combat.player.cursedNextPlayer = false;
            Game.showToast('诅咒缠身：本回合难以杀手');
        }
        State.combat.player.turnStr = 0;
        State.combat.player.turnDef = 0;
        State.combat.player.turnDmgMod = 0;
        State.combat.player.ignorePZ = false;

        if ((State.combat.player.yanJunxingNextStr || 0) > 0) {
            const pen = State.combat.player.yanJunxingNextStr;
            State.combat.player.turnStr -= pen;
            Game.showToast(`阎罗峻刑余威：本回合武力 −${pen}`);
            State.combat.player.yanJunxingNextStr = 0;
        }

        if (State.combat.player.weak > 0) State.combat.player.weak--;
        if (State.combat.player.vuln > 0) State.combat.player.vuln--;
        if ((State.combat.player.weakNextTurn || 0) > 0) {
            const gain = State.combat.player.weakNextTurn;
            State.combat.player.weak += gain;
            State.combat.player.weakNextTurn = 0;
            Game.showToast(`虚弱咒入骨：本回合虚弱 ${gain}`);
        }

        State.combat.enemies.forEach((e) => {
            if (!e) return;
            e.atkDownThisRound = 0;
            if (e.weak > 0) e.weak--;
            if (e.vuln > 0) e.vuln--;
            if (e.stun) e.stun = false;
        });

        for (let hi = State.combat.hand.length - 1; hi >= 0; hi--) {
            const raw = State.combat.hand[hi];
            if (!raw || typeof raw === 'string') continue;
            if (raw.retainTurnsLeft != null) {
                raw.retainTurnsLeft -= 1;
                if (raw.retainTurnsLeft <= 0) {
                    const cid = raw.cardId;
                    State.combat.hand.splice(hi, 1);
                    State.combat.exhaustPile.push(cid);
                    const nm = CardDB[cid] ? CardDB[cid].name : cid;
                    Game.showToast(`「${nm}」时限已尽，沉入沉沙`);
                }
            }
        }

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
                        Game.showToast(`念奴娇牵动：自动打出「${picked.name}」`);
                        try { picked.effect(); } catch (err) { console.error(err); }
                        if (GONGFA_CARD_IDS.has(cid)) Combat.registerBattleConsumed(cid);
                        else if (picked.toExhaust) State.combat.exhaustPile.push(cid);
                        else State.combat.discardPile.push(cid);
                        Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                    }, 400);
                }
            }
        }

        $('end-turn-btn').className = 'active';
        $('end-turn-btn').innerText = '洗墨 (结束回合)';

        Combat.refreshEnemyIntentLocks();

        Combat.draw(5);

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
        const living = State.combat.enemies.filter((e) => e && e.hp > 0).length;
        list.className = 'enemy-list';
        const liveEnemies = State.combat.enemies.filter((e) => e && e.hp > 0);
        const allChiFour = living === 4 && liveEnemies.every((e) => e.arch === 'chi_mei_single');
        if (allChiFour) list.classList.add('enemy-layout-chi-four');
        else if (living >= 4) list.classList.add('enemy-layout-grid');
        else if (living === 3) list.classList.add('enemy-layout-triple');

        State.combat.enemies.forEach((en, i) => {
            if (!en) return;
            const wrap = document.createElement('div');
            let cls = 'entity enemy-slot';
            if (State.combat.isPlayerTurn) cls += ` enemy-intent-${Combat.intentGlowKind(en)}`;
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
            let intentText = Combat.getIntentText(en);
            intentEl.innerText = intentText;
            const intentHover = Combat.getIntentHover(en);
            if (intentHover) {
                intentEl.title = intentHover;
                intentEl.classList.add('intent-has-detail');
            } else {
                intentEl.removeAttribute('title');
                intentEl.classList.remove('intent-has-detail');
            }

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
            hpText.innerHTML = `${en.hp}/${en.maxHp}<span class="hp-pct">(${pct}%)</span>${(en.block || 0) > 0 ? ` <span class="hp-block">+${en.block}御</span>` : ''}`;
            hpWrap.appendChild(hpFill);
            hpWrap.appendChild(hpText);

            const nameEl = document.createElement('div');
            nameEl.className = 'enemy-name-tag';
            nameEl.style.cssText = 'font-size:15px;color:#e8eaef;max-width:160px;text-align:center;line-height:1.3;';
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
        if (en.atkDownThisRound) html += `<div class="status-icon">抑<div class="status-tooltip">本回合其攻势对你 −${en.atkDownThisRound}</div></div>`;
        if ((en.qieNuoStacks || 0) > 0) html += `<div class="status-icon">怯<div class="status-tooltip">怯懦×${en.qieNuoStacks}：攻势×${(Math.pow(0.8, en.qieNuoStacks)).toFixed(2)}</div></div>`;
            if ((en.shehun || 0) > 0) html += `<div class="status-icon">魂${en.shehun}<div class="status-tooltip">摄魂 ${en.shehun} 层(行动后获得等量力与双倍层数御)</div></div>`;
        if (en.shushouQin) html += `<div class="status-icon">擒<div class="status-tooltip">束手就擒：对你造成的攻势 −${en.shushouQin}</div></div>`;
        return html;
    },

    maybeShowKuHaiFleeModal: () => {
        const kuIdx = State.combat.enemies.findIndex(e => e && e.hp > 0 && e.arch === 'ku_hai_guan_li');
        if (kuIdx < 0) return;
        Combat._buildKuHaiModalIfNeeded();
        const el = $('kuhai-flee-modal');
        if (el && !$('kuhai-flee-hint')) {
            const row = el.querySelector('.kuhai-flee-row');
            if (row && row.parentNode) {
                const h = document.createElement('div');
                h.id = 'kuhai-flee-hint';
                h.className = 'kuhai-flee-hint';
                h.hidden = true;
                row.parentNode.insertBefore(h, row);
            }
        }
        const en = State.combat.enemies[kuIdx];
        const nextDmgRaw = 6 * en.turnCounter;
        const nextDmg = typeof Combat !== 'undefined' && Combat.enemyDmgAfterShushou ? Combat.enemyDmgAfterShushou(en, nextDmgRaw) : nextDmgRaw;
        const { dealt, taken } = State.combat.kuHaiStats;
        const pay = Math.max(0, Math.ceil(200 - dealt + taken));
        const tx = $('kuhai-flee-text');
        const bt = $('kuhai-flee-pay');
        const hintEl = $('kuhai-flee-hint');
        tx.innerHTML = `枯骸官吏下一罚击将造成 <span style="color:var(--blood-red);font-weight:bold;">${nextDmg}</span> 点伤势。\n\n已对其造成 <b>${dealt}</b> 点伤害，自其处累计失去 <b>${taken}</b> 气血。\n按约：赎路钱财 = 200 − 已造伤害 + 已失气血 = <b style="color:var(--gold);">${pay}</b> 钱。\n\n付钱撤离将直接离开此地，不计取胜利物。`;
        const canPay = State.gold >= pay;
        bt.classList.toggle('disabled', !canPay);
        if (hintEl) {
            if (!canPay) {
                hintEl.hidden = false;
                hintEl.innerHTML = `囊中铜钱仅 <span style="color:var(--gold);font-weight:bold;">${State.gold}</span>，不敷赎路之约(约需 <span style="color:var(--gold);font-weight:bold;">${pay}</span>)。`;
            } else {
                hintEl.hidden = true;
                hintEl.innerHTML = '';
            }
        }
        bt.onclick = () => {
            const payNeed = Math.max(0, Math.ceil(200 - State.combat.kuHaiStats.dealt + State.combat.kuHaiStats.taken));
            if (State.gold < payNeed) {
                Game.showToast('铜钱不够，践不得约，撤不得身');
                return;
            }
            State.gold -= payNeed;
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
                <div id="kuhai-flee-hint" class="kuhai-flee-hint" hidden></div>
                <div class="kuhai-flee-row">
                    <div class="btn-g" id="kuhai-flee-pay">付钱撤离</div>
                    <div class="btn-g" id="kuhai-flee-stay" style="border-color:#555;">继续招架</div>
                </div>
            </div>`;
        document.body.appendChild(m);
    },

    _fleeCombatNoRewards: () => {
        State.combat.inCombat = false;
        AudioSys.playBGMTrack('world');
        Game.showToast('暂且退让，避其锋芒……');
        Game.updateUI();
        MapSys.renderMap();
        Game.navTo('screen-map');
    },

    normalizeHandItem: (item) => (typeof item === 'string') ? { cardId: item } : item,

    _handPileToEntry: (cardId) => {
        const entry = { cardId };
        if (cardId === 'c_jingkong') entry.retainTurnsLeft = 3;
        const cd = CardDB[cardId];
        if (cd && cd.keep) entry.retain = true;
        return entry;
    },

    shouldRetainAcrossTurn: (item) => {
        if (!item || item.isMirror) return false;
        if (item.retainTurnsLeft != null) return true;
        if (item.retain) return true;
        const cd = CardDB[item.cardId];
        return !!(cd && cd.keep);
    },

    draw: (amt) => {
        AudioSys.playSFX('./assets/sfx_draw.mp3');
        for (let i = 0; i < amt; i++) {
            if (State.combat.hand.length >= 10) break;
            if (State.combat.drawPile.length === 0) {
                if (State.combat.discardPile.length === 0) break;
                const ban = new Set(State.combat.battleConsumed || []);
                State.combat.drawPile = State.combat.discardPile.filter((id) => !ban.has(id));
                State.combat.discardPile = [];
                Combat.shuffle(State.combat.drawPile);
                Game.showToast('残卷洗尽，重新洗牌');
            }
            State.combat.hand.push(Combat._handPileToEntry(State.combat.drawPile.pop()));
        }
        Combat.renderHand();
    },

    renderHand: () => {
        if (!State.combat.inCombat) return;
        const c = $('hand-container');
        if (!c) return;
        c.innerHTML = '';
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
                let canPlay = State.combat.isPlayerTurn && !cd.unplayable && State.energy >= effCost && !State.combat.player.cantPlay && !Combat.isPZChoicePending();
                if (cd.id === 'c35' && State.combat.hand.length < 2) canPlay = false;

                let extraDesc = '';
                if (item.cardId === 'c29' && State.combat.player.emei) {
                    extraDesc = `<div style="font-size:11px;color:var(--gold);margin-top:4px;text-align:center;">本场已打出武卡：${State.combat.battleWuPlayed || 0}</div>`;
                }
                if (item.retainTurnsLeft != null) {
                    extraDesc += `<div style="font-size:11px;color:#93c5fd;margin-top:4px;text-align:center;">保留：剩 ${item.retainTurnsLeft} 个我方回合后沉沙</div>`;
                } else if (Combat.shouldRetainAcrossTurn(item)) {
                    extraDesc += `<div style="font-size:11px;color:#93c5fd;margin-top:4px;text-align:center;">保留：跨回合留存</div>`;
                }
                const el = Game.createCardDOM(cd, 0, { forHand: true, effCost, isMirror: !!item.isMirror, extraDescHtml: extraDesc });
                el.dataset.index = index;
                el.style.zIndex = stackIndex + 1;
                if (!canPlay) el.classList.add('disabled');
                if (item.isMirror) el.classList.add('is-mirror');

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
        if (Combat.isPZChoicePending()) return;
        const rawItem = State.combat.hand[index];
        if (!rawItem) return;
        const item = Combat.normalizeHandItem(rawItem);
        const cardId = item.cardId;
        const cd = CardDB[cardId];
        if (!cd) return;
        if (cd.unplayable) {
            Game.showToast('此牌封笔，不能打出');
            Combat.renderHand();
            return;
        }
        const effCost = (item.costOverride !== undefined) ? item.costOverride : cd.cost;
        if (State.energy < effCost || !State.combat.isPlayerTurn || State.combat.player.cantPlay) {
            Game.showToast('此刻气象不合，打不出去');
            Combat.renderHand();
            return;
        }
        if (typeof hideKeywordTooltip === 'function') hideKeywordTooltip();

        const recordPZ = (resolvedType) => {
            if (!resolvedType) return;
            State.combat.pzHistory.push(resolvedType);
            if (State.combat.pzHistory.length > 5) State.combat.pzHistory.shift();
            Combat.renderPZ();
            Combat.checkPoetryTrigger();
        };

        const commitCardPlay = () => {
            State.energy -= effCost;
            if (cd.isAttack) State.momentum = Math.min(10, State.momentum + 1);

            State.combat.hand.splice(index, 1);
            if (GONGFA_CARD_IDS.has(cardId)) {
                Combat.registerBattleConsumed(cardId);
            } else if (item.isMirror || cd.toExhaust) {
                State.combat.exhaustPile.push(cardId);
            } else {
                State.combat.discardPile.push(cardId);
            }
        };

        const afterPZResolved = (resolvedType) => {
            cd.effect();

            const p = State.combat.player;
            const goesExhaust = !GONGFA_CARD_IDS.has(cardId) && (item.isMirror || cd.toExhaust);
            if (State.relics.includes('【枯木树枝】') && goesExhaust && Math.random() < 0.5) {
                Game.showToast('【枯木树枝】枯木逢光：再演一回');
                p._inRepeat = true;
                try { cd.effect(); } catch (err) { console.error(err); }
                p._inRepeat = false;
            }

            if (resolvedType === '仄' && p.chunQiang && cd.id !== 'c44') {
                setTimeout(() => {
                    const t = Combat._randomOtherLivingIdx(Combat._primaryTargetIdx());
                    const idx = t >= 0 ? t : Combat._primaryTargetIdx();
                    Combat.dealDmg(-5, false, idx);
                }, 100);
            }
            if (resolvedType === '平' && p.guRuo && cd.id !== 'c45') {
                setTimeout(() => Combat.addBlock(-4), 100);
            }
            if (cd.isAttack && p.emei) {
                p.emeiCount = (p.emeiCount || 0) + 1;
                if (p.emeiCount >= 3) {
                    p.emeiCount -= 3;
                    Game.showToast('峨眉剑法：再抽一张');
                    setTimeout(() => Combat.draw(1), 100);
                }
            }
            if (p.daoGuang && cd.id !== 'c47' && /剑/.test(cd.name) && !p._inRepeat) {
                setTimeout(() => {
                    if (!State.combat.inCombat) return;
                    p._inRepeat = true;
                    try { cd.effect(); } catch (err) { console.error(err); }
                    p._inRepeat = false;
                    Game.showToast('刀光剑影：同一招式再演');
                    Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                }, 400);
            }

            if (cd.cardType === '武卡') State.combat.battleWuPlayed = (State.combat.battleWuPlayed || 0) + 1;
            if (resolvedType === '仄' && cd.id !== 'c44') State.combat.battleZeCount = (State.combat.battleZeCount || 0) + 1;
            if (resolvedType === '平' && cd.id !== 'c45') State.combat.battlePingCount = (State.combat.battlePingCount || 0) + 1;

            Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
        };

        if (State.combat.player.ignorePZ) {
            State.combat._pendingPZChoice = true;
            commitCardPlay();
            Combat.renderHand();
            Game.updateUI();
            Combat.openPZChoiceModal((pickedType) => {
                if (!State.combat._pendingPZChoice) return;
                State.combat._pendingPZChoice = false;
                recordPZ(pickedType);
                afterPZResolved(pickedType);
            });
            return;
        }
        recordPZ(cd.type);
        commitCardPlay();
        afterPZResolved(cd.type);
    },

    openCardPicker: ({ source, maxCount = 1, prompt, onConfirm }) => {
        const sourceArr = source === 'hand' ? State.combat.hand : State.combat.exhaustPile;
        if (!sourceArr || sourceArr.length === 0) {
            Game.showToast(`${prompt || '请择一张牌'}：竟无牌可选`);
            return;
        }
        const panel = $('card-picker');
        const grid = $('card-picker-grid');
        const title = $('card-picker-title');
        const confirmBtn = $('card-picker-confirm');
        const cancelBtn = $('card-picker-cancel');
        const selected = new Set();

        title.innerText = `${prompt || '请点选卡牌'}(至多 ${maxCount} 张)`;
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
                            Game.showToast(`至多择 ${maxCount} 张`);
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
            if (selected.size === 0) { Game.showToast('尚未点选'); return; }
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
                p.combatStr += 1;
                Game.showToast('一转攻势：本场战斗中武力 +1');
            }
        }
        if (p.fengDao) {
            Game.showToast('封刀挂剑：再抽两张');
            Combat.draw(2);
        }
    },

    /** 敌方虚弱咒：在下个我方回合生效，仅持续该回合 */
    applyPlayerWeakCurse: (stacks = 1) => {
        if (!State.combat || !State.combat.player || stacks <= 0) return;
        const p = State.combat.player;
        p.weakNextTurn = (p.weakNextTurn || 0) + stacks;
        Game.updateUI();
    },

    /** 感时花溅泪：按当前意图分类，仅在诗韵标记的敌方行动轮内生效 */
    ganShiIntentKind: (en) => {
        if (!en) return 'other';
        const s = Combat.getIntentText(en) || '';
        if (/虚弱咒/.test(s)) return 'weak';
        /* 咒缚等仍出伤但 intentGlow 可能落在 wait，需按攻势反噬处理 */
        if (/咒缚/.test(s)) return 'atk';
        const glow = Combat.intentGlowKind(en);
        if (glow === 'wait') return 'wait';
        if (glow === 'atk') return 'atk';
        return 'other';
    },

    /** 敌方吃下一轮「等量」攻势(仅数值与格挡，不含玩家蓄势/武力) */
    applyEnemySelfStrike: (enemy, amount) => {
        if (!enemy || enemy.hp <= 0 || !amount || amount < 1) return;
        const idx = State.combat.enemies.indexOf(enemy);
        if (idx < 0) return;
        AudioSys.playSFX('./assets/sfx_hit.mp3');
        let remaining = amount;
        if (remaining > 0 && (enemy.block || 0) > 0) {
            const useBlock = Math.min(enemy.block, remaining);
            enemy.block -= useBlock;
            remaining -= useBlock;
        }
        const toHp = Math.min(enemy.hp, remaining);
        enemy.hp -= toHp;
        Combat.floatTextSlot(idx, `反噬 ${amount}`, 'gan-shi');
        Combat.pulseEnemySlot(idx, 'hit');
        $('screen-combat').classList.add('hit-stop');
        setTimeout(() => { $('screen-combat').classList.remove('hit-stop'); }, 300);
        Combat._removeDeadEnemies();
        Combat.renderEnemies();
        Game.updateUI();
        Combat.checkDeath();
    },

    /** 感时花溅泪：将虚弱咒反缚给敌人自身，并立即刷新状态栏显示 */
    applyEnemyWeakCurse: (enemy, stacks = 1) => {
        if (!enemy || enemy.hp <= 0 || stacks <= 0) return;
        const idx = State.combat.enemies.indexOf(enemy);
        if (idx < 0) return;
        enemy.weak = (enemy.weak || 0) + stacks;
        Combat.pulseEnemyEntity(enemy);
        Combat.floatTextSlot(idx, `虚弱+${stacks}`, 'block');
        Combat.renderEnemies();
        Game.updateUI();
    },

    pzHighlightByPoem: () => {
        const blade = new Set();
        const tear = new Set();
        if (typeof PoetryDB === 'undefined' || !State.poetry || !State.poetry.length) return { blade, tear };
        const hist = State.combat.pzHistory;
        if (!hist || !hist.length) return { blade, tear };
        State.poetry.forEach((pid) => {
            const pd = PoetryDB[pid];
            if (!pd || !pd.pattern) return;
            const k = Combat.longestSuffixPrefix(hist, pd.pattern);
            if (k <= 0) return;
            const variant = pd.fxVariant === 'tear' ? 'tear' : 'blade';
            for (let i = hist.length - k; i < hist.length; i++) {
                if (variant === 'tear') tear.add(i);
                else blade.add(i);
            }
        });
        return { blade, tear };
    },

    renderPZ: () => {
        const tr = $('pz-tracker'); tr.innerHTML = '';
        const hist = State.combat.pzHistory;
        const { blade: bIdx, tear: tIdx } = Combat.pzHighlightByPoem();
        hist.forEach((char, i) => {
            const s = document.createElement('span');
            s.className = char === '平' ? 'pz-char pz-ping' : 'pz-char pz-ze';
            s.innerText = char;
            const wb = bIdx.has(i);
            const wt = tIdx.has(i);
            if (wb && wt) s.classList.add('pz-match-both');
            else if (wb) s.classList.add('pz-match-blade');
            else if (wt) s.classList.add('pz-match-tear');
            tr.appendChild(s);
        });
        if (hist.length > 0) AudioSys.playSFX('./assets/sfx_pingze.mp3');
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
                Game.showToast(`诗韵应和：${pd.text}`);
                if (typeof Fx !== 'undefined' && Fx.poetryBurst) Fx.poetryBurst(pd.text, pd.fxVariant || 'blade');
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
                    Combat.registerBattleConsumed(it.cardId);
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
                        Game.showToast('峨眉剑法：再抽一张');
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
        AudioSys.playSFX('./assets/sfx_hit.mp3');
        if (State.combat.player.cantDmg) { Game.showToast('止戈：本回合难以伤人'); return; }

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
        if (State.momentum >= 10) {
            const mult = (State.relics && State.relics.includes('【红缨枪】')) ? 2 : 1.5;
            dmg = Math.floor(dmg * mult);
            State.momentum = 0;
            isCrit = true;
            if (State.relics && State.relics.includes('【红缨枪】')) Game.showToast('【红缨枪】势盈刃满：杀伤加倍');
        }
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
        const dying = State.combat.enemies.filter((e) => e && e.hp <= 0);
        dying.forEach((d) => {
            if (d.arch === 'chi_mei_single') {
                State.combat.enemies.forEach((l) => {
                    if (l && l.hp > 0 && l.arch === 'chi_mei_single') {
                        l.qieNuoStacks = (l.qieNuoStacks || 0) + 1;
                    }
                });
            }
            if (d.arch === 'hei_wu_chang') {
                State.combat.enemies.forEach((l) => {
                    if (l && l.hp > 0 && l.arch === 'bai_wu_chang') l._wuChangRagePhase = 'prep';
                });
            }
            if (d.arch === 'bai_wu_chang') {
                State.combat.enemies.forEach((l) => {
                    if (l && l.hp > 0 && l.arch === 'hei_wu_chang') l._wuChangRagePhase = 'prep';
                });
            }
        });
        State.combat.enemies = State.combat.enemies.filter((e) => e && e.hp > 0);
        State.combat.enemies.forEach((e, i) => { e.slotIndex = i; });
        Combat._clampTarget();
        Combat._syncEnemyAlias();
    },

    _buildJunxingModalIfNeeded: () => {
        if ($('junxing-modal')) return;
        const m = document.createElement('div');
        m.id = 'junxing-modal';
        m.className = 'modal';
        m.innerHTML = `
            <div class="kuhai-flee-box" style="max-width:500px;">
                <div class="kuhai-flee-title">峻刑临簿</div>
                <p id="junxing-lead" class="kuhai-flee-text" style="margin:0 0 16px 0;">阎罗笔落，须择其一。</p>
                <div class="kuhai-flee-row" style="flex-direction:column;align-items:stretch;gap:10px;">
                    <div class="btn-g" id="junxing-opt-blood"></div>
                    <div class="btn-g" id="junxing-opt-shackle" style="border-color:#a85548;">在弃牌堆加入 1 张「枷锁」</div>
                    <div class="btn-g" id="junxing-opt-str" style="border-color:#555;">下回合失去 6 点武力</div>
                </div>
            </div>`;
        document.body.appendChild(m);
    },

    showJunxingModal: () => new Promise((resolve) => {
        if (!State.combat || !State.combat.inCombat || State.hp <= 0) {
            resolve();
            return;
        }
        Combat._buildJunxingModalIfNeeded();
        const el = $('junxing-modal');
        const p = State.combat.player;
        const nBlood = p.yanJunxingBloodCount || 0;
        const bloodLoss = Math.floor(Math.pow(2, nBlood));
        const bloodNext = Math.floor(Math.pow(2, nBlood + 1));
        $('junxing-opt-blood').innerHTML = `失去 <b style="color:var(--blood-red)">${bloodLoss}</b> 点生命(真实伤势；下次择此项为 ${bloodNext})`;

        const finish = () => {
            el.classList.remove('active');
            $('junxing-opt-blood').onclick = null;
            $('junxing-opt-shackle').onclick = null;
            $('junxing-opt-str').onclick = null;
            resolve();
        };

        $('junxing-opt-blood').onclick = () => {
            Combat.takeDmg(bloodLoss, true);
            p.yanJunxingBloodCount = nBlood + 1;
            Game.showToast('峻刑·削命');
            finish();
        };
        $('junxing-opt-shackle').onclick = () => {
            State.combat.discardPile.push('c_jia_suo');
            Game.showToast('峻刑·枷锁');
            finish();
        };
        $('junxing-opt-str').onclick = () => {
            p.yanJunxingNextStr += 6;
            Game.showToast('峻刑·锢力');
            finish();
        };

        document.querySelectorAll('.modal').forEach((mod) => { if (mod.id !== 'junxing-modal') mod.classList.remove('active'); });
        el.classList.add('active');
    }),

    yanLuowangStrikeAndJunxing: async (attacker, rawDmg) => {
        if (!State.combat.inCombat) return;
        Combat.takeDmg(rawDmg, false, attacker);
        if (State.combat._ganShiReflectHandled) return;
        if (!State.combat.inCombat || State.hp <= 0) return;
        await Combat.showJunxingModal();
    },

    _clampTarget() {
        const liv = Combat._livingIndices();
        if (!liv.length) return;
        if (!liv.includes(State.combat.selectedTargetIndex)) State.combat.selectedTargetIndex = liv[0];
    },

    takeDmg: (dmg, ignoreBlock = false, attacker) => {
        State.combat._ganShiReflectHandled = false;
        if (attacker) {
            const pen = (attacker.shushouQin || 0) + (attacker.atkDownThisRound || 0);
            if (pen) dmg = Math.max(0, dmg - pen);
        }
        if (attacker && attacker.weak > 0) dmg = Math.floor(dmg * 0.7);
        if (attacker && (attacker.qieNuoStacks || 0) > 0) {
            dmg = Math.floor(dmg * Math.pow(0.8, attacker.qieNuoStacks));
        }

        const ganShiStacks = State.combat.ganShiEchoEnemyStacks || 0;
        if (!ignoreBlock && attacker && ganShiStacks > 0 && !State.combat._ganShiReflecting) {
            const gk = attacker._ganShiKindThisAct || Combat.ganShiIntentKind(attacker);
            if (gk === 'atk' && dmg > 0) {
                let rd = dmg * ganShiStacks;
                if (attacker.arch === 'yan_luo_wang') rd = Math.floor(rd);
                State.combat._ganShiReflecting = true;
                try {
                    Combat.applyEnemySelfStrike(attacker, rd);
                    State.combat._ganShiReflectHandled = true;
                    const tip = ganShiStacks > 1 ? `(x${ganShiStacks})` : '';
                    Game.showToast(`感时花溅泪：泪尽锋折，还施彼身${tip}`);
                } finally {
                    State.combat._ganShiReflecting = false;
                }
                Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                return;
            }
        }

        if (State.combat.player.vuln > 0 && !ignoreBlock) dmg = Math.floor(dmg * 1.5);
        if (State.combat.player.takeDmgDouble && !ignoreBlock) dmg *= 2;
        if (attacker && attacker.arch === 'yan_luo_wang') dmg = Math.floor(dmg);

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

        if (dmg > 0 && State.combat && State.combat.inCombat && (State.combat.player.incorporealStacks || 0) > 0) {
            const st = State.combat.player.incorporealStacks;
            dmg = Math.min(dmg, st);
        }

        if (dmg > 0) {
            let nextHp = State.hp - dmg;
            if (State._dev && State._devGod && nextHp < 1) nextHp = 1;
            State.hp = Math.max(0, nextHp);
            Combat.floatText('player', `-${dmg}`, 'crit');
            $('player').classList.add('shake'); setTimeout(() => $('player').classList.remove('shake'), 300);

            const lostNow = hpBeforePlayer - State.hp;
            if (lostNow > 0 && State.combat.inCombat) {
                State.combat.playerHpLost = (State.combat.playerHpLost || 0) + lostNow;
                if (State.relics.includes('【仪式头骨】') && State.combat.playerHpLost >= 10 && !State.combat._ritualSkullFired) {
                    State.combat._ritualSkullFired = true;
                    State.combat.player.combatStr += 4;
                    Game.showToast('【仪式头骨】剧痛入骨：本场武力 +4');
                }
            }

            if (attacker && attacker.arch === 'ku_hai_guan_li') {
                State.combat.kuHaiStats.taken += hpBeforePlayer - State.hp;
            }
        }
        Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
    },

    heal: (amt) => { State.hp = Math.min(State.maxHp, State.hp + amt); Game.updateUI(); Game.showToast(`气血回补 ${amt}`); },

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
            return { value: Math.max(0, base), tip: `固定值：${base}(无视角色武力与武器属性)` };
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
            return { value: Math.max(0, base), tip: `固定值：${base}(无视角色武力与武器属性)` };
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
        if (Combat.isPZChoicePending()) return;
        const kuModal = $('kuhai-flee-modal');
        if (kuModal && kuModal.classList.contains('active')) return;
        const jxModal = $('junxing-modal');
        if (jxModal && jxModal.classList.contains('active')) return;
        const runId = State._runId || 0;
        const combatId = State.combat._combatId;

        let huiN = 0;
        State.combat.hand.forEach((raw) => {
            const it = Combat.normalizeHandItem(raw);
            if (it.cardId === 'c_hui') huiN += 1;
        });
        if (huiN > 0) {
            Combat.takeDmg(2 * huiN, true);
            Game.showToast(`「悔」缠手 ${huiN} 张，折去 ${2 * huiN} 点气血`);
            if (State.hp <= 0) return;
        }

        State.combat.isPlayerTurn = false;
        $('end-turn-btn').className = '';
        $('end-turn-btn').innerText = '敌方回合';
        // 「当前回合」类增益在回合结束立即失效(例如：满江红)
        State.combat.player.dmgDouble = false;
        State.combat.player.takeDmgDouble = false;
        for (let i = 0; i < State.combat.hand.length; i++) {
            const raw = State.combat.hand[i];
            if (!raw || typeof raw === 'string') continue;
            if (raw.costOverride !== undefined) delete raw.costOverride;
        }

        for (let i = State.combat.hand.length - 1; i >= 0; i--) {
            const it = Combat.normalizeHandItem(State.combat.hand[i]);
            if (it.isMirror) {
                State.combat.hand.splice(i, 1);
                State.combat.exhaustPile.push(it.cardId);
                continue;
            }
            if (it.costOverride !== undefined) delete it.costOverride;
            if (Combat.shouldRetainAcrossTurn(it)) continue;
            State.combat.hand.splice(i, 1);
            State.combat.discardPile.push(it.cardId);
        }

        Combat.renderHand();
        setTimeout(() => {
            if (Combat.isCombatActive(runId, combatId)) Combat.enemyTurn();
        }, 1000);
    },

    updateEnemyIntent: () => {
        State.combat.enemies.forEach((en, i) => {
            const slot = $(`enemy-slot-${i}`);
            if (!slot) return;
            const intentEl = slot.querySelector('.intent');
            if (intentEl) {
                intentEl.innerText = Combat.getIntentText(en);
                const ih = Combat.getIntentHover(en);
                if (ih) {
                    intentEl.title = ih;
                    intentEl.classList.add('intent-has-detail');
                } else {
                    intentEl.removeAttribute('title');
                    intentEl.classList.remove('intent-has-detail');
                }
            }
        });
    },

    enemyTurn: () => {
        const runId = State._runId || 0;
        const combatId = State.combat._combatId;
        if (!Combat.isCombatActive(runId, combatId)) return;
        const finishPhase = () => {
            if (!Combat.isCombatActive(runId, combatId)) return;
            State.combat.ganShiEchoEnemyPhase = false;
            State.combat.ganShiEchoEnemyStacks = 0;
            const p = State.combat.player;
            if (p.deathRoundsRemaining > 0) {
                p.deathRoundsRemaining -= 1;
                if (p.deathRoundsRemaining === 0) {
                    Game.showToast('案剑瞋目：力尽气绝');
                    State.hp = 0;
                    Game.updateUI();
                    Combat.checkDeath();
                    return;
                }
            }

            if (State.hp > 0 && Combat._livingIndices().length > 0) {
                State.combat.turn++;
                setTimeout(() => {
                    if (Combat.isCombatActive(runId, combatId)) Combat.startTurn();
                }, 1000);
            }
        };

        if (State._dev && State._devSkipEnemy) {
            Game.showToast('开发者模式：敌方回合已跳过');
            finishPhase();
            return;
        }

        (async () => {
            for (const e of State.combat.enemies) {
                if (!Combat.isCombatActive(runId, combatId) || State.hp <= 0) break;
                if (!e || e.hp <= 0) continue;
                if (e.stun) {
                    Game.showToast(`${e.name}困于旋风，不得出手！`);
                } else {
                    const arch = Combat._arch(e);
                    if (arch) {
                        let skipAct = false;
                        if ((State.combat.ganShiEchoEnemyStacks || 0) > 0) {
                            const gk = Combat.ganShiIntentKind(e);
                            e._ganShiKindThisAct = gk;
                            if (gk === 'weak') {
                                const stacks = State.combat.ganShiEchoEnemyStacks || 1;
                                // 敌方减层时机在我方回合开始，单层感时按 +2 实际等效 1 层；可叠层按倍数放大
                                Combat.applyEnemyWeakCurse(e, 2 * stacks);
                                const tip = stacks > 1 ? `(x${stacks})` : '';
                                Game.showToast(`感时花溅泪：${e.name} 反受虚弱咒${tip}`);
                                skipAct = true;
                            }
                        }
                        if (!skipAct) {
                            const ret = arch.act(e);
                            if (ret && typeof ret.then === 'function') await ret;
                            if (!Combat.isCombatActive(runId, combatId)) break;
                        }
                        e._ganShiKindThisAct = null;
                    }
                }
                if (!(State._dev && State._devSkipEnemy)) e.turnCounter++;
            }
            finishPhase();
        })();
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
            if ((p.weakNextTurn || 0) > 0) pBar.innerHTML += `<div class="status-icon">📉⏳<div class="status-tooltip">虚弱咒：下回合生效 (${p.weakNextTurn})</div></div>`;
            if (p.vuln > 0) pBar.innerHTML += `<div class="status-icon">💔<div class="status-tooltip">易伤 (剩余 ${p.vuln} 回合)</div></div>`;
            if (p.cantPlay) pBar.innerHTML += `<div class="status-icon">🛑<div class="status-tooltip">禁锢</div></div>`;
            if (p.cantDmg) pBar.innerHTML += `<div class="status-icon">🕊️<div class="status-tooltip">止战</div></div>`;
            if (p.turnDmgMod !== 0) pBar.innerHTML += `<div class="status-icon">🩸<div class="status-tooltip">本回合伤害修正：${p.turnDmgMod > 0 ? '+' + p.turnDmgMod : p.turnDmgMod}</div></div>`;
            if (p.deathRoundsRemaining > 0) {
                pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">☠ ${p.deathRoundsRemaining}<div class="status-tooltip">案剑瞋目：距离死亡还有 ${p.deathRoundsRemaining} 回合</div></div>`;
            }
            if (p.yiZhuan) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">↻<div class="status-tooltip">一转攻势</div></div>`;
            if (p.fengDao) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">🗡<div class="status-tooltip">封刀挂剑</div></div>`;
            if ((p.nextTurnEnergy || 0) > 0) pBar.innerHTML += `<div class="status-icon" style="color:#93c5fd;">⚡+${p.nextTurnEnergy}<div class="status-tooltip">以逸待劳：下回合额外获得 ${p.nextTurnEnergy} 点气</div></div>`;
            if (p.emei) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚡ ${p.emeiCount || 0}<div class="status-tooltip">峨眉剑法(3 武卡抽 1)</div></div>`;
            if (p.chunQiang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">舌${State.combat.battleZeCount != null ? State.combat.battleZeCount : 0}<div class="status-tooltip">唇枪舌剑：本场已打出仄牌 ${State.combat.battleZeCount || 0}(不含本身)</div></div>`;
            if (p.guRuo) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">壁${State.combat.battlePingCount != null ? State.combat.battlePingCount : 0}<div class="status-tooltip">固若金汤：本场已打出平牌 ${State.combat.battlePingCount || 0}(不含本身)</div></div>`;
            if (p.daoGuang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚔×2<div class="status-tooltip">刀光剑影(不含本身；每张含剑名仅追加一次)</div></div>`;
            if (p.dmgDouble || p.takeDmgDouble) pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">2×<div class="status-tooltip">满江红</div></div>`;
            if (p.jianBiQingYe) pBar.innerHTML += `<div class="status-icon" style="color:#60a5fa;">壁≤15<div class="status-tooltip">坚壁清野：每回合至多跨回合保留 15 点持守</div></div>`;
            if ((p.incorporealStacks || 0) > 0) {
                const wstTip = '无实体(香炉)：每第6、12…个我方回合开始+1层并清零香炉计数(与敌方当回合是否出手无关)。持守抵扣后，单次伤势至多与层数相同。每个我方回合开始层数−1最低0；若敌方本回合未对你造成伤害，下回合开始层数仍会衰减，不顺延保留。';
                const st = p.incorporealStacks;
                pBar.innerHTML += `<div class="status-icon" style="color:#a7c7e7;">无实体×<span class="kw" data-tip="${wstTip}">${st}</span></div>`;
            }
            if (State.relics.includes('【香炉】')) {
                const left = Math.max(1, 6 - (State.combat._incenseCount || 0));
                pBar.innerHTML += `<div class="status-icon" style="color:#67e8f9;">🕯<div class="status-tooltip">还有 ${left} 回合获得一层无实体</div></div>`;
            }
            if (p.ignorePZ) pBar.innerHTML += `<div class="status-icon" style="color:#c4b5fd;">平仄自择<div class="status-tooltip">投笔从戎：本回合每张牌可自定平或仄</div></div>`;
            bindKeywordTooltips(pBar);
        }
    },

    viewPile: (type) => {
        if (!State.combat.inCombat) return;
        if (Combat.isPZChoicePending()) return;
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
            const runId = State._runId || 0;
            const combatId = State.combat._combatId;
            State.combat.inCombat = false;
            State.combat._pendingPZChoice = false;
            Game.showToast('胜负寻常事，洗净笔锋可重来', 4200);
            AudioSys.stopBGM();
            setTimeout(() => {
                if ((State._runId || 0) !== runId || State.combat._combatId !== combatId) return;
                Game.clearJourneyCheckpoint();
                Game.navTo('screen-main');
            }, 4200);
        } else if (State.combat.inCombat && Combat._livingIndices().length === 0) {
            const runId = State._runId || 0;
            const combatId = State.combat._combatId;
            if (State.relics.includes('【落魄灵魂】')) {
                State.hp = Math.min(State.maxHp, State.hp + 1);
                State.gold += 15;
                Game.showToast('【落魄灵魂】魂火一闪：气血 +1，铜钱 +15');
            }
            State._qibuPoetryReward = State.combat.qibuPoetryId || null;
            State.combat.qibuPoetryId = null;
            State.combat.inCombat = false;
            State.combat._pendingPZChoice = false;
            AudioSys.playBGMTrack('world');
            const rewardTier = State.combat.lastRewardTier || 'normal';
            setTimeout(() => {
                if ((State._runId || 0) !== runId || State.combat._combatId !== combatId || !State._hasJourneyCheckpoint || State.combat.inCombat) return;
                Settlement.show(rewardTier);
            }, 1500);
        }
    }
};
