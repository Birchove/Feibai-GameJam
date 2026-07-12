const Game = {
            getRunId: () => State._runId || 0,
            isRunCurrent: (runId) => (State._runId || 0) === runId,
            invalidateRunCallbacks: () => {
                State._runId = (State._runId || 0) + 1;
            },
            resetJourneyTransients: () => {
                if (!State.combat) return;
                State.combat.inCombat = false;
                State.combat.isPlayerTurn = true;
                State.combat.hand = [];
                State.combat.drawPile = [];
                State.combat.discardPile = [];
                State.combat.exhaustPile = [];
                State.combat.enemies = [];
                State.combat.enemy = { id: '', name: '', hp: 0, maxHp: 0, turnCounter: 1, dmgMod: 1, weak: 0, vuln: 0, stun: false, block: 0, str: 0 };
                State.combat.selectedTargetIndex = 0;
                State.combat.encounterKey = '';
                State.combat.lastRewardTier = 'normal';
                State.combat.qibuPoetryId = null;
            },
            refreshMainMenuCTA: () => {
                const btn = $('main-journey-btn');
                if (!btn) return;
                btn.innerText = State._hasJourneyCheckpoint ? '继续旅程' : '开始旅程';
            },
            onMainJourneyClick: () => {
                if (State._hasJourneyCheckpoint && State._resumeScreenId) {
                    Game.navTo(State._resumeScreenId);
                    return;
                }
                Game.navTo('screen-saves');
            },
            goMainMenuFromSettings: () => {
                const active = document.querySelector('.screen.active');
                if (active && active.id && active.id !== 'screen-main') {
                    State._resumeScreenId = active.id;
                    State._hasJourneyCheckpoint = true;
                }
                const panel = $('settings-panel');
                if (panel) panel.classList.remove('active');
                document.querySelectorAll('.modal').forEach((m) => m.classList.remove('active'));
                if (typeof Combat !== 'undefined' && Combat.clearDragBattleHint) Combat.clearDragBattleHint();
                Game.navTo('screen-main');
                Game.refreshMainMenuCTA();
            },
            clearJourneyCheckpoint: () => {
                State._hasJourneyCheckpoint = false;
                State._resumeScreenId = '';
                Game.refreshMainMenuCTA();
            },
            /** 确认后回到扉页「飞白」，关闭各类浮层；不改玩法数值逻辑 */
            confirmExitToMainMenu: () => {
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.style.zIndex = '620';
                modal.id = 'exit-to-main-confirm';
                modal.innerHTML = `
                    <div class="kuhai-flee-box" style="max-width:480px;">
                        <div class="kuhai-flee-title">返回飞白</div>
                        <div class="kuhai-flee-text">可要就此回到扉页「飞白」？确认后便回到主界面。</div>
                        <div class="kuhai-flee-row">
                            <div class="btn-g" id="exit-main-yes" style="font-size:16px;">确认</div>
                            <div class="btn-g" id="exit-main-no" style="font-size:16px;border-color:#555;">取消</div>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                const close = () => {
                    modal.classList.remove('active');
                    setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 40);
                };
                const yes = $('exit-main-yes');
                const no = $('exit-main-no');
                if (yes) yes.onclick = (ev) => {
                    ev.stopPropagation();
                    close();
                    if (typeof hideKeywordTooltip === 'function') hideKeywordTooltip();
                    const pv = $('pv-overlay');
                    if (pv) pv.style.display = 'none';
                    const video = $('pv-video');
                    if (video) { video.pause(); video.currentTime = 0; video.onended = null; }
                    document.querySelectorAll('.modal').forEach((m) => m.classList.remove('active'));
                    Game.invalidateRunCallbacks();
                    Game.resetJourneyTransients();
                    Game.clearJourneyCheckpoint();
                    Game.navTo('screen-main');
                    if (typeof AudioSys !== 'undefined' && AudioSys.stopBGM) AudioSys.stopBGM();
                };
                if (no) no.onclick = (ev) => { ev.stopPropagation(); close(); };
            },
            navTo: (screenId) => {
                if (typeof hideKeywordTooltip === 'function') hideKeywordTooltip();
                document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
                $(screenId).classList.add('active');
                $('abar').style.display = ['screen-map', 'screen-event', 'screen-combat', 'screen-settlement'].includes(screenId) ? 'flex' : 'none';
                if (screenId === 'screen-main') Game.refreshMainMenuCTA();
                if ((screenId === 'screen-map' || screenId === 'screen-event') && typeof AudioSys !== 'undefined' && AudioSys.playBGMTrack) {
                    AudioSys.playBGMTrack('world');
                }
            },
            showToast: (msg, durationMs = 2000) => {
                const t = $('toast'); t.innerText = msg; t.style.opacity = 1;
                setTimeout(() => { t.style.opacity = 0; }, durationMs);
            },
            toggleModal: (id) => {
                const el = $(id);
                if (!el) return;
                if (id === 'info-panel') {
                    if (el.classList.contains('active')) {
                        el.classList.remove('active');
                    } else {
                        el.classList.add('active');
                        Game.updateInfoPanel();
                    }
                    return;
                }
                if (el.classList.contains('active')) {
                    el.classList.remove('active');
                } else {
                    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
                    el.classList.add('active');
                }
            },
            closeInfoDetail: () => {
                const detail = $('info-detail-panel');
                const info = $('info-panel');
                if (detail) detail.classList.remove('active');
                if (info) {
                    Game.updateInfoPanel();
                    info.classList.add('active');
                }
            },
            openInfoDetail: (kind) => {
                const info = $('info-panel');
                if (info) info.classList.remove('active');
                const panel = $('info-detail-panel');
                const body = $('info-detail-body');
                const title = $('info-detail-title');
                if (!panel || !body || !title) return;
                body.innerHTML = '';
                if (kind === 'poetry') {
                    title.innerText = '诗句残篇';
                    if (!State.poetry || State.poetry.length === 0) {
                        body.innerHTML = '<div class="info-detail-empty">尚未搜集</div>';
                    } else {
                        const grid = document.createElement('div');
                        grid.className = 'info-detail-grid';
                        State.poetry.forEach((pid) => {
                            const pd = (typeof PoetryDB !== 'undefined') ? PoetryDB[pid] : null;
                            const card = document.createElement('div');
                            card.className = 'info-detail-entry';
                            if (!pd) {
                                card.innerHTML = `<div class="info-detail-entry-title">「${pid}」</div>`;
                            } else {
                                card.innerHTML = `
                                    <div class="info-detail-entry-title">「${pd.text}」</div>
                                    <div class="info-detail-entry-meta">${pd.source || ''}</div>
                                    <div class="info-detail-entry-line">平仄：${(pd.pattern || []).join(' ')}</div>
                                    <div class="info-detail-entry-desc">${pd.effectDesc || '—'}</div>
                                `;
                            }
                            grid.appendChild(card);
                        });
                        body.appendChild(grid);
                    }
                } else if (kind === 'relics') {
                    title.innerText = '法宝';
                    if (!State.relics || State.relics.length === 0) {
                        body.innerHTML = '<div class="info-detail-empty">囊中空空</div>';
                    } else {
                        const grid = document.createElement('div');
                        grid.className = 'info-detail-grid';
                        State.relics.forEach((name) => {
                            const card = document.createElement('div');
                            card.className = 'info-detail-entry';
                            let desc = '暂无说明';
                            if (typeof RelicDB !== 'undefined') {
                                const rk = Object.keys(RelicDB).find((x) => RelicDB[x] && RelicDB[x].name === name);
                                if (rk && RelicDB[rk].desc) desc = RelicDB[rk].desc;
                            }
                            card.innerHTML = `<div class="info-detail-entry-title">${name}</div><div class="info-detail-entry-desc">${desc}</div>`;
                            grid.appendChild(card);
                        });
                        body.appendChild(grid);
                    }
                }
                bindKeywordTooltips(body);
                panel.classList.add('active');
            },
            getWeaponLabel: (key) => {
                if (!key || typeof WeaponDB === 'undefined' || !WeaponDB[key]) return '徒手';
                const w = WeaponDB[key];
                return `${w.name}(力${w.str || 0}，御${w.def || 0})`;
            },
            promptWeaponReplace: (currentKey, nextKey, onDecision) => {
                const cur = (typeof WeaponDB !== 'undefined') ? WeaponDB[currentKey] : null;
                const nxt = (typeof WeaponDB !== 'undefined') ? WeaponDB[nextKey] : null;
                if (!nxt) {
                    if (typeof onDecision === 'function') onDecision(false);
                    return;
                }
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.style.zIndex = '520';
                modal.id = 'weapon-replace-modal-temp';
                modal.innerHTML = `
                    <div class="kuhai-flee-box" style="max-width:540px;">
                        <div class="kuhai-flee-title">是否换兵</div>
                        <div class="kuhai-flee-text">
                            手头所持：<span style="color:var(--gold-light);">${Game.getWeaponLabel(currentKey)}</span><br>
                            可否换成：<span style="color:var(--gold-light);">${Game.getWeaponLabel(nextKey)}</span>
                        </div>
                        <div class="kuhai-flee-row">
                            <div class="btn-g" id="weapon-replace-confirm" style="font-size:16px;">换成新兵</div>
                            <div class="btn-g" id="weapon-replace-cancel" style="font-size:16px;border-color:#555;">仍用旧兵</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                const recConfirm = $('weapon-replace-confirm');
                const recCancel = $('weapon-replace-cancel');
                if (cur && nxt && recConfirm && recCancel) {
                    const curStr = cur.str || 0; const curDef = cur.def || 0;
                    const nxtStr = nxt.str || 0; const nxtDef = nxt.def || 0;
                    const allBetter = nxtStr > curStr && nxtDef > curDef;
                    const allWorse = nxtStr < curStr && nxtDef < curDef;
                    if (allBetter) recConfirm.classList.add('reco-choice');
                    else if (allWorse) recCancel.classList.add('reco-choice');
                }
                const close = (ok) => {
                    modal.classList.remove('active');
                    setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 40);
                    if (typeof onDecision === 'function') onDecision(!!ok);
                };
                if (recConfirm) recConfirm.onclick = (ev) => { ev.stopPropagation(); close(true); };
                if (recCancel) recCancel.onclick = (ev) => { ev.stopPropagation(); close(false); };
            },
            tryAcquireWeapon: (nextKey, onDone) => {
                if (!nextKey || typeof WeaponDB === 'undefined' || !WeaponDB[nextKey]) {
                    if (typeof onDone === 'function') onDone(false);
                    return;
                }
                const currentKey = State.weapon || '';
                if (!currentKey) {
                    State.weapon = nextKey;
                    Game.showToast(`神兵入鞘：${Game.getWeaponLabel(nextKey)}`);
                    if (typeof onDone === 'function') onDone(true);
                    return;
                }
                if (currentKey === nextKey) {
                    Game.showToast(`已佩同一把神兵：${Game.getWeaponLabel(currentKey)}`);
                    if (typeof onDone === 'function') onDone(true);
                    return;
                }
                Game.promptWeaponReplace(currentKey, nextKey, (ok) => {
                    if (!ok) {
                        Game.showToast('仍用旧兵，未作更换');
                        if (typeof onDone === 'function') onDone(false);
                        return;
                    }
                    State.weapon = nextKey;
                    Game.showToast(`已换新兵：${Game.getWeaponLabel(nextKey)}`);
                    if (typeof onDone === 'function') onDone(true);
                });
            },
            selectSave: (slot) => {
                if(slot === 2) { Game.initGame('剑'); return; } 
                // 空存档进入新局：重置已选流派，避免沿用上次残留
                State.class = '';
                $('pv-overlay').style.display = 'flex';
                const video = $('pv-video');
                video.play().catch(e=>{}); 
                video.onended = () => { Game.skipPV(); };
            },
            skipPV: () => {
                $('pv-overlay').style.display = 'none';
                const video = $('pv-video');
                video.pause(); video.currentTime = 0; video.onended = null;  
                AudioSys.stopBGM();
                State.class = '';
                document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                $('class-enter').style.opacity = 0;
                $('class-icon').innerText = '❓';
                $('class-desc').innerText = '请先点选流派(本版仅可执剑出发)';
                Game.navTo('screen-class');
            },
            selectClass: (cls, desc) => {
                State.class = cls;
                document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                const clsData = Object.values(ClassDB).find(c => c.name === cls);
                const target = Array.from(document.querySelectorAll('.class-btn')).find(b => b.innerText === cls);
                if(target) target.classList.add('selected');
                $('class-icon').innerText = clsData ? clsData.icon : cls;
                $('class-enter').style.opacity = 1;
                $('class-desc').innerText = desc || (clsData ? clsData.desc : '');
                
                document.querySelector('.class-center').onmouseover = () => $('class-icon').style.color = 'white';
                document.querySelector('.class-center').onmouseout = () => $('class-icon').style.color = '#ccc';
            },
            enterMap: () => {
                if (!State.class) return Game.showToast('请先点选流派(本版仅可执剑)');
                if (State.class !== '剑') {
                    Game.showToast('此际只开放「剑」之一途，请改选剑再入冥府');
                    return;
                }
                Game.initGame(State.class);
            },
            initGame: (cls) => {
                const clsData = Object.values(ClassDB).find(c => c.name === cls) || ClassDB.sword;
                const init = clsData.initial;
                Game.invalidateRunCallbacks();
                Game.resetJourneyTransients();
                State._qibuPoetryReward = null;
                State.class = cls; State.hp = init.hp; State.maxHp = init.maxHp; State.gold = 100; State.mapNodeIndex = 0; State.mapChapter = 0; State.relics = [];
                State.maxEnergy = 3; State.energy = State.maxEnergy; State.momentum = 0;
                State._villagePendingChapter = undefined;
                State._settlementFromVillageAmbush = false;
                if (State.combat) State.combat._incenseCount = 0;
                State.str = init.str; State.def = init.def; State.agi = init.agi;
                State.weapon = ''; State.poetry = []; State.wuxing = init.wuxing; 
                // 流派开局自带诗句与武器(剑：吴钩霜雪明 + 绣剑)
                if (cls === '剑') {
                    if (typeof PoetryDB !== 'undefined' && PoetryDB.wuGouShuangXueMing) State.poetry.push('wuGouShuangXueMing');
                    if (typeof WeaponDB !== 'undefined' && WeaponDB.xiuJian) State.weapon = 'xiuJian';
                }
                // 严格遵循初始卡组设定
                State.deck = ['c1','c1','c1','c1', 'c2','c2','c2','c2', 'c3', 'c4']; 
                State._hasJourneyCheckpoint = true;
                State._resumeScreenId = 'screen-map';
                Game.refreshMainMenuCTA();
                MapSys.renderMap();
                AudioSys.playBGMTrack('world');
                Game.navTo('screen-map');
            },
            updateInfoPanel: () => {
                $('info-class').innerText = State.class || '无';
                $('info-hp').innerText = `${State.hp}/${State.maxHp}`;
                $('info-gold').innerText = State.gold;
                // 武器属性加成(仅当装备武器时)
                const weaponData = (State.weapon && typeof WeaponDB !== 'undefined') ? WeaponDB[State.weapon] : null;
                const wStr = weaponData ? (weaponData.str || 0) : 0;
                const wDef = weaponData ? (weaponData.def || 0) : 0;
                // 战斗中可读到 combatStr / combatDef
                const inCombat = !!(State.combat && State.combat.inCombat);
                const cStr = inCombat ? (State.combat.player.combatStr || 0) : 0;
                const cDef = inCombat ? (State.combat.player.combatDef || 0) : 0;
                const renderAttr = (base, w, c) => {
                    const total = base + w + c;
                    const extra = (w || c) ? ` <span style="color:var(--gold); font-size:14px;">(${base}${w ? '+'+w : ''}${c ? (c>=0?'+':'')+c : ''})</span>` : '';
                    return `${total}${extra}`;
                };
                $('info-str').innerHTML = renderAttr(State.str, wStr, cStr);
                $('info-def').innerHTML = renderAttr(State.def, wDef, cDef);
                $('info-wuxing').innerText = State.wuxing.toFixed(1);
                $('info-agi').innerText = State.agi;
                
                $('info-deck-count').innerText = State.deck.length; // 修复 Bug: 显示卡组总数
                // 中心栏：角色基础力/御(解释左侧 11(5+6) 中的 5)
                const baseStrEl = $('info-base-str'); if (baseStrEl) baseStrEl.innerText = State.str;
                const baseDefEl = $('info-base-def'); if (baseDefEl) baseDefEl.innerText = State.def;
                // 武器栏：名字 + 力/防 属性
                const weaponName = weaponData ? weaponData.name : (State.weapon || '');
                if (weaponData) {
                    $('info-weapon').innerHTML = `
                        <div style="font-family:'Ma Shan Zheng',cursive; font-size:24px; color:var(--gold-light); letter-spacing:2px; text-shadow:0 0 6px rgba(184,134,11,0.5);">${weaponName}</div>
                        <div style="margin-top:10px; display:flex; gap:14px; font-size:15px;">
                            <span style="color:#aaa;">力 <span style="color:#fff; font-weight:bold;">${weaponData.str || 0}</span></span>
                            <span style="color:#aaa;">御 <span style="color:#fff; font-weight:bold;">${weaponData.def || 0}</span></span>
                        </div>
                    `;
                } else {
                    $('info-weapon').innerHTML = weaponName ? `<span style="color:var(--gold); font-weight:bold;">${weaponName}</span>` : '<span style="color:#555;">未佩神兵</span>';
                }
                const poetryBox = $('info-poetry');
                poetryBox.innerHTML = '';
                if (State.poetry.length > 0) {
                    const line = State.poetry.map((pid) => ((typeof PoetryDB !== 'undefined' && PoetryDB[pid]) ? PoetryDB[pid].text : pid)).join(' · ');
                    poetryBox.innerHTML = `<div style="font-size:20px;letter-spacing:2px;line-height:1.5;">${line}</div><div style="color:#666;font-size:12px;margin-top:10px;">${State.poetry.length} 篇 · 点此框细览</div>`;
                } else {
                    poetryBox.innerHTML = '尚无残句';
                }
                const relicBox = $('info-relics');
                relicBox.innerHTML = '';
                if (State.relics.length > 0) {
                    const wrap = document.createElement('div');
                    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-content:flex-start;';
                    State.relics.forEach((r) => {
                        const sp = document.createElement('span');
                        sp.textContent = r;
                        sp.style.cssText = 'background:#111;padding:6px 12px;border:1px solid #555;border-radius:6px;color:var(--gold);font-size:13px;';
                        wrap.appendChild(sp);
                    });
                    relicBox.appendChild(wrap);
                    const hint = document.createElement('div');
                    hint.style.cssText = 'color:#666;font-size:12px;text-align:center;margin-top:4px;';
                    hint.innerText = '点此框细览';
                    relicBox.appendChild(hint);
                } else {
                    relicBox.innerHTML = '<span style="color:#666;">囊中空空</span>';
                }
            },
            updateUI: () => {
                $('ui-energy').innerText = State.energy; $('ui-max-energy').innerText = State.maxEnergy;
                $('ui-momentum').innerText = State.momentum;
                $('player-hp-text').innerHTML = `${State.hp}/${State.maxHp} <span style="color:#60a5fa">${State.combat.player.block > 0 ? `(+${State.combat.player.block}持守)` : ''}</span>`;
                $('player-hp-fill').style.width = `${(State.hp/State.maxHp)*100}%`;
                if(State.combat.inCombat) {
                    Combat.renderEnemies();
                    Combat.updateStatusBar();
                }
            },
            viewDeck: () => {
                Game.toggleModal('deck-panel');
                const grid = $('deck-grid');
                grid.innerHTML = '';
                $('deck-detail-count').innerText = State.deck.length; // 此处已修正 HTML ID 绑定

                State.deck.forEach(cId => {
                    grid.appendChild(Game.createCardDOM(CardDB[cId]));
                });
            },
            /** 地图/事件：从 State.deck 移除一张；onDone(ok) 确认时 ok=true */
            openDeckRemovePicker: (onDone) => {
                const deck = State.deck;
                if (!deck || deck.length === 0) {
                    Game.showToast('卡组已无牌可删');
                    if (typeof onDone === 'function') onDone(false);
                    return;
                }
                const panel = $('card-picker');
                const grid = $('card-picker-grid');
                const title = $('card-picker-title');
                const confirmBtn = $('card-picker-confirm');
                const cancelBtn = $('card-picker-cancel');
                let selectedIdx = -1;

                title.innerText = '择一张牌，自卡组永远除去';
                grid.innerHTML = '';

                deck.forEach((cid, idx) => {
                    const cdef = CardDB[cid];
                    if (!cdef) return;
                    const wrap = document.createElement('div');
                    wrap.className = 'picker-card-wrapper';
                    wrap.appendChild(Game.createCardDOM(cdef));
                    wrap.onclick = () => {
                        grid.querySelectorAll('.picker-card-wrapper.selected').forEach((el) => el.classList.remove('selected'));
                        selectedIdx = idx;
                        wrap.classList.add('selected');
                    };
                    grid.appendChild(wrap);
                });

                document.querySelectorAll('.modal').forEach((m) => m.classList.remove('active'));
                panel.classList.add('active');

                const close = () => {
                    panel.classList.remove('active');
                    confirmBtn.onclick = null;
                    cancelBtn.onclick = null;
                };
                confirmBtn.onclick = () => {
                    if (selectedIdx < 0) {
                        Game.showToast('尚未点选');
                        return;
                    }
                    const removed = State.deck.splice(selectedIdx, 1)[0];
                    const nm = CardDB[removed] ? CardDB[removed].name : removed;
                    close();
                    Game.showToast(`已从卡组撕去：${nm}`);
                    if (typeof Game.updateInfoPanel === 'function') Game.updateInfoPanel();
                    if (typeof onDone === 'function') onDone(true);
                };
                cancelBtn.onclick = () => {
                    close();
                    if (typeof onDone === 'function') onDone(false);
                };
            },
            showGallery: () => {
                Game.navTo('screen-gallery');
                $('gallery-low').innerHTML = ''; $('gallery-mid').innerHTML = ''; $('gallery-high').innerHTML = ''; $('gallery-token').innerHTML = '';
                
                Object.values(CardDB).forEach(cd => {
                    const dom = Game.createCardDOM(cd);
                    if(cd.rarity === 'low') $('gallery-low').appendChild(dom);
                    else if(cd.rarity === 'mid') {
                        dom.classList.add('mid-rarity-card');
                        $('gallery-mid').appendChild(dom);
                    }
                    else if(cd.rarity === 'high') {
                        dom.classList.add('high-rarity-card');
                        $('gallery-high').appendChild(dom);
                    }
                    else if(cd.rarity === 'token') {
                        $('gallery-token').appendChild(dom);
                    }
                });
            },
            // 渲染卡面描述：把 {V_ATK} / {V_DEF} 占位替换为带 hover 计算过程的动态数值
            renderCardDesc: (cd) => {
                let desc = cd.desc || '';
                if (desc.indexOf('{V_ATK}') !== -1 && cd.atkBase !== undefined && typeof Combat !== 'undefined' && Combat.previewAtk) {
                    const { value, tip } = Combat.previewAtk(cd);
                    desc = desc.split('{V_ATK}').join(`<span class="kw" data-tip="${tip}">${value}</span>`);
                }
                if (desc.indexOf('{V_DEF}') !== -1 && cd.defBase !== undefined && typeof Combat !== 'undefined' && Combat.previewDef) {
                    const { value, tip } = Combat.previewDef(cd);
                    desc = desc.split('{V_DEF}').join(`<span class="kw" data-tip="${tip}">${value}</span>`);
                }
                return desc;
            },
            createCardDOM: (cd, count = 0, opts = {}) => {
                const el = document.createElement('div');
                const effCost = (opts.effCost !== undefined && opts.effCost !== null) ? opts.effCost : cd.cost;
                const forHand = !!opts.forHand;
                let cls = forHand ? 'card' : 'deck-card';
                if (cd.rarity === 'mid') cls += ' mid-rarity-card';
                if (cd.rarity === 'high') cls += ' high-rarity-card';
                el.className = cls;
                let html = '';
                if (count > 0) html += `<div class="card-count-badge">x${count}</div>`;
                const mirrorHtml = opts.isMirror ? ' <span class="mirror-tag">镜</span>' : '';
                const catRaw = cd.cardType || '—';
                const cat = catRaw === '功法' ? '功卡' : catRaw;
                const extra = opts.extraDescHtml || '';
                html += `
                    <div class="card-cost">${effCost}</div><div class="card-type ${cd.typeClass}">${cd.type}</div>
                    <div class="card-name">${cd.name}${mirrorHtml}</div>
                    <div class="card-category">${cat}</div>
                    <div class="asset-placeholder card-img" style="background: url('./assets/card_${cd.id}.png') center/cover, #222; border:none;"></div>
                    <div class="card-desc">${Game.renderCardDesc(cd)}${extra}</div>
                `;
                el.innerHTML = html;
                bindKeywordTooltips(el);
                return el;
            },
            createPoetryCardDOM: (id) => {
                const pd = (typeof PoetryDB !== 'undefined') ? PoetryDB[id] : null;
                const el = document.createElement('div');
                el.className = 'poetry-card';
                if(!pd) {
                    el.innerHTML = `<div class="poetry-text">「${id}」</div>`;
                    return el;
                }
                const patternStr = pd.pattern ? pd.pattern.join(' ') : '—';
                const triggerTip = pd.pattern
                    ? `连续打出「${pd.pattern.join('')}」时(最近五张平仄若合于此)，${pd.effectDesc}。每应验一回，便消去最早一记平仄。`
                    : '暂且不懂如何用这句。';
                el.innerHTML = `
                    <div class="poetry-text">${pd.text}</div>
                    <div class="poetry-source">${pd.source || ''}</div>
                    <div class="poetry-pattern">${patternStr}</div>
                    <div class="poetry-effect"><span class="kw" data-tip="${triggerTip}">诗韵触发</span> · ${pd.effectDesc || '—'}</div>
                `;
                return el;
            }
        };

        // === 战斗结算系统 ===
