const Combat = {
            start: (fightId) => {
                AudioSys.playBGM('assets/bgm_combat.mp3'); 

                State.combat.inCombat = true; State.combat.turn = 1; State.combat.pzHistory = [];
                State.combat.drawPile = [...State.deck]; Combat.shuffle(State.combat.drawPile);
                State.combat.discardPile = []; State.combat.hand = []; State.combat.exhaustPile = [];
                // 计算装备武器的力/御
                const weaponData = (typeof WeaponDB !== 'undefined' && State.weapon) ? WeaponDB[State.weapon] : null;
                const wStr = weaponData ? (weaponData.str || 0) : 0;
                const wDef = weaponData ? (weaponData.def || 0) : 0;
                State.combat.player = { block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, vuln: 0, turnStr: 0, turnDef: 0, turnDmgMod: 0, combatStr: 0, combatDef: 0, wStr, wDef, keepBlock: 0, nianNuJiao: false, dmgDouble: false, takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false, deathCountdown: 0, lostStrAcc: 0, emei: false, emeiCount: 0, fengDao: false, yiZhuan: false, chunQiang: false, guRuo: false, _inRepeat: false };
                State.combat.shanjia = 0;
                State.combat._snapshot = null;
                State.combat._prevSnapshot = null;
                
                $('pz-tracker').innerHTML = '';
                
                const e = State.combat.enemy;
                const enemyData = EnemyDB[fightId] || EnemyDB.fight1;
                e.id = enemyData.id; e.name = enemyData.name; e.hp = e.maxHp = enemyData.hp;
                e.turnCounter = 1; e.weak = 0; e.vuln = 0; e.stun = false; e.dataKey = fightId;
                $('enemy-sprite').style.background = enemyData.sprite;
                // 开发者模式：敌人 HP 设为 10000，便于测试伤害
                if (State._dev) { e.hp = e.maxHp = 10000; }
                
                Game.navTo('screen-combat');
                Game.updateUI();

                if(State.relics.includes('【佛像】开局震慑')) setTimeout(() => { Combat.floatText('enemy', '-10', 'crit'); e.hp -= 10; Game.updateUI(); }, 500);

                setTimeout(Combat.startTurn, 1000);
            },
            shuffle: (arr) => { for(let i=arr.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } },
            startTurn: () => {
                State.combat.isPlayerTurn = true;
                State.energy = State.maxEnergy + (State.combat.player.nextTurnEnergy || 0);
                State.combat.player.nextTurnEnergy = 0;
                
                // 跨回合持守保留 (坚壁清野)
                if(State.combat.player.keepBlock > 0) {
                    State.combat.player.block = Math.min(State.combat.player.block, State.combat.player.keepBlock);
                    State.combat.player.keepBlock = 0;
                } else {
                    State.combat.player.block = 0;
                }

                State.combat.player.cantPlay = false;
                State.combat.player.cantDmg = State.combat.player.cantDmgNextTurn;
                State.combat.player.cantDmgNextTurn = false;
                State.combat.player.turnStr = 0; 
                State.combat.player.turnDef = 0;
                State.combat.player.turnDmgMod = 0;
                State.combat.player.ignorePZ = false;
                
                // 递减持续状态
                if(State.combat.player.weak > 0) State.combat.player.weak--;
                if(State.combat.player.vuln > 0) State.combat.player.vuln--;
                if(State.combat.enemy.weak > 0) State.combat.enemy.weak--;
                if(State.combat.enemy.vuln > 0) State.combat.enemy.vuln--;
                if(State.combat.enemy.stun) State.combat.enemy.stun = false; 

                // 案剑瞋目：倒计时死亡（>0 才计；从 N 减到 0 即触发死亡）
                if (State.combat.player.deathCountdown > 0) {
                    State.combat.player.deathCountdown -= 1;
                    if (State.combat.player.deathCountdown === 0) {
                        Game.showToast('案剑瞋目：力竭而亡');
                        State.hp = 0;
                        Game.updateUI();
                        Combat.checkDeath();
                        return;
                    }
                }

                // 功法：念奴娇 — 失 1 血 + 从弃牌堆随机打出 1 张（不耗气）
                if(State.combat.player.nianNuJiao) {
                    Combat.takeDmg(1, true);
                    const dp = State.combat.discardPile;
                    if (dp.length > 0) {
                        let pickedIdx = -1, picked = null;
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
                                try { picked.effect(); } catch (e) { console.error(e); }
                                if (picked.toExhaust) State.combat.exhaustPile.push(cid);
                                else State.combat.discardPile.push(cid);
                                Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                            }, 400);
                        }
                    }
                }
                
                $('end-turn-btn').className = 'active'; $('end-turn-btn').innerText = '洗墨 (结束回合)';
                
                Combat.updateEnemyIntent();
                Combat.draw(State.combat.turn === 1 ? 6 : 3);

                // 金蝉脱壳：滚动保存"上回合开始"快照（仅自身：HP/能量/势/玩家状态）
                State.combat._prevSnapshot = State.combat._snapshot || null;
                State.combat._snapshot = {
                    hp: State.hp,
                    energy: State.energy,
                    momentum: State.momentum,
                    player: { ...State.combat.player }
                };

                Game.updateUI();
            },
            // 手牌内部统一为对象 { cardId, isMirror?: bool, costOverride?: number }
            // 工具：把任意 hand 项规范化为对象（兼容历史 push 单 cardId 字符串）
            normalizeHandItem: (item) => (typeof item === 'string') ? { cardId: item } : item,
            draw: (amt) => {
                AudioSys.playSFX('assets/sfx_draw.mp3'); 
                for(let i=0; i<amt; i++) {
                    if(State.combat.hand.length >= 10) break;
                    if(State.combat.drawPile.length === 0) {
                        if(State.combat.discardPile.length === 0) break;
                        State.combat.drawPile = [...State.combat.discardPile]; State.combat.discardPile = [];
                        Combat.shuffle(State.combat.drawPile); Game.showToast('牌库重洗');
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
                
                // 镜像与原牌分组分开（视觉与原牌区分）
                const groupedHand = [];
                State.combat.hand.forEach((rawItem, i) => {
                    const item = Combat.normalizeHandItem(rawItem);
                    const groupKey = `${item.cardId}|${item.isMirror ? 'M' : 'O'}`;
                    let group = groupedHand.find(g => g.key === groupKey);
                    if(!group) {
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
                    const canPlay = State.combat.isPlayerTurn && !cd.unplayable && State.energy >= effCost && !State.combat.player.cantPlay;
                    
                    const el = document.createElement('div');
                    el.className = `card ${canPlay ? '' : 'disabled'}${item.isMirror ? ' is-mirror' : ''}`;
                    el.dataset.index = index;
                    el.style.zIndex = stackIndex + 1;
                    el.innerHTML = `
                        <div class="card-cost">${effCost}</div><div class="card-type ${cd.typeClass}">${cd.type}</div>
                        <div class="card-name">${cd.name}${item.isMirror ? ' <span class="mirror-tag">镜</span>' : ''}</div>
                        <div class="asset-placeholder card-img" style="background: url('assets/card_${cd.id}.png') center/cover, #222; border:none;"></div>
                        <div class="card-desc">${Game.renderCardDesc(cd)}</div>
                    `;
                    bindKeywordTooltips(el);
                    
                    if(canPlay) {
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
                if(cd.isAttack) State.momentum = Math.min(10, State.momentum + 1);
                
                if (!State.combat.player.ignorePZ) {
                    State.combat.pzHistory.push(cd.type);
                    if(State.combat.pzHistory.length > 5) State.combat.pzHistory.shift();
                    Combat.renderPZ();
                    Combat.checkPoetryTrigger();
                }

                State.combat.hand.splice(index, 1);
                // 去向：镜像或 toExhaust 的卡入沉沙堆，其它入弃牌堆
                if (item.isMirror || cd.toExhaust) {
                    State.combat.exhaustPile.push(cardId);
                } else {
                    State.combat.discardPile.push(cardId);
                }
                
                cd.effect();

                // === 功法触发钩子（c44/c45/c29/c47）===
                const p = State.combat.player;
                // 唇枪舌剑：每打仄 → 随机敌-5 伤（卡牌特性 -5，加角色武/武器力修正）
                if (cd.type === '仄' && p.chunQiang && cd.id !== 'c44') {
                    setTimeout(() => Combat.dealDmg(-5), 100);
                }
                // 固若金汤：每打平 → +持守（卡牌特性 -4，加御）
                if (cd.type === '平' && p.guRuo && cd.id !== 'c45') {
                    setTimeout(() => Combat.addBlock(-4), 100);
                }
                // 峨眉剑法：每打 3 武卡 → 抽 1
                if (cd.isAttack && p.emei) {
                    p.emeiCount = (p.emeiCount || 0) + 1;
                    if (p.emeiCount >= 3) {
                        p.emeiCount -= 3;
                        Game.showToast('峨眉剑法：抽 1 张');
                        setTimeout(() => Combat.draw(1), 100);
                    }
                }
                // 刀光剑影：名字含"剑" → 再打一次 effect（不再消耗气、不再触发钩子）
                if (p.daoGuang && /剑/.test(cd.name) && !p._inRepeat) {
                    setTimeout(() => {
                        if (!State.combat.inCombat) return;
                        p._inRepeat = true;
                        try { cd.effect(); } catch (e) { console.error(e); }
                        p._inRepeat = false;
                        Game.showToast('刀光剑影：再打一次');
                        Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
                    }, 400);
                }
                
                Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
            },
            // 通用选牌弹窗：source = 'hand' | 'exhaust'，maxCount 上限，onConfirm(indices)
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
                    const cardId = source === 'hand' ? Combat.normalizeHandItem(rawItem).cardId : rawItem;
                    const cd = CardDB[cardId]; if (!cd) return;
                    const wrap = document.createElement('div');
                    wrap.className = 'picker-card-wrapper';
                    wrap.appendChild(Game.createCardDOM(cd));
                    wrap.onclick = () => {
                        if (selected.has(idx)) {
                            selected.delete(idx);
                            wrap.classList.remove('selected');
                        } else {
                            if (selected.size >= maxCount) {
                                if (maxCount === 1) {
                                    // 单选：自动取消上一张
                                    const prev = Array.from(selected)[0];
                                    selected.clear();
                                    grid.querySelectorAll('.picker-card-wrapper.selected').forEach(el => el.classList.remove('selected'));
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
                    const indices = Array.from(selected).sort((a, b) => b - a); // 倒序，便于 splice
                    close();
                    onConfirm(indices);
                };
                cancelBtn.onclick = () => { close(); };
            },
            // 力损失钩子：仅 c24（束手就擒等显式减力的卡）调用
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
                if(hist.length > 0) AudioSys.playSFX('assets/sfx_pingze.mp3'); 
            },
            // 计算 pzHistory 的最长后缀，使其同时为某条已携带诗句 pattern 的前缀（多诗时取最大）
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
            // 检查 pzHistory 末尾是否完整命中任一已携带诗句的 pattern；命中则触发并消耗一张最早的平仄。
            // 多条诗句平仄相同则同帧并发触发；总共仅消耗一次。
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

                // 延迟 400ms：让 pz-tracker 上「全金圈 + 弹跳」先呈现给玩家，再结算
                setTimeout(() => {
                    if (!State.combat.inCombat) return;
                    triggered.forEach(pd => {
                        Game.showToast(`诗韵触发：${pd.text}`);
                        if (typeof Fx !== 'undefined' && Fx.poetryBurst) Fx.poetryBurst(pd.text);
                        try { pd.trigger(); } catch (e) { console.error('Poetry trigger error:', e); }
                    });
                    // 仅消耗最早一张平仄（与触发条数无关）
                    State.combat.pzHistory.shift();
                    Combat.renderPZ();
                    Game.updateUI();
                    Combat.checkDeath();
                }, 400);
            },
            // opts.withMirror: 打出时把每张被打出的武卡再以「镜像」形式加回手牌，本回合结束自动入沉沙
            playAllAttacks: (opts = {}) => {
                const playedItems = [];
                for(let i=State.combat.hand.length-1; i>=0; i--) {
                    const it = Combat.normalizeHandItem(State.combat.hand[i]);
                    const cd = CardDB[it.cardId];
                    if(cd && cd.isAttack) {
                        playedItems.push(it);
                        State.combat.hand.splice(i, 1);
                    }
                }
                if(playedItems.length === 0) return;
                
                let delay = 0;
                playedItems.forEach(it => {
                    setTimeout(() => {
                        const cd = CardDB[it.cardId];
                        // 沉沙归宿：原牌带 toExhaust 或本身是镜像（链式触发）→ 入沉沙；否则入弃牌堆
                        if (it.isMirror || cd.toExhaust) {
                            State.combat.exhaustPile.push(it.cardId);
                        } else {
                            State.combat.discardPile.push(it.cardId);
                        }
                        cd.effect();
                        State.momentum = Math.min(10, State.momentum + 1);
                        Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
                    }, delay);
                    delay += 400;
                });
                // 镜像生成：在所有联动伤害结算之后，统一入手牌（耗气 0）
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
            dealDmg: (base, isFixed = false) => {
                AudioSys.playSFX('assets/sfx_hit.mp3'); 
                if (State.combat.player.cantDmg) { Game.showToast("止战：本回合无法造成伤害！"); return; }

                // 开发者模式 · 一击必杀：直接清空敌人 HP
                if (State._dev && State._devOneShot) {
                    const killAmt = State.combat.enemy.hp;
                    if (killAmt > 0) {
                        State.combat.enemy.hp = 0;
                        Combat.floatText('enemy', `-${killAmt}`, 'crit');
                        $('screen-combat').classList.add('hit-stop');
                        $('enemy').classList.add('shake');
                        setTimeout(() => { $('screen-combat').classList.remove('hit-stop'); $('enemy').classList.remove('shake'); }, 300);
                    }
                    return;
                }

                const p = State.combat.player;
                // 计算：基础 + 角色力 + 战斗力 + 本回合力 + 武器力 + 本回合伤害修饰；若固定则仅算基础
                let dmg = isFixed ? base : base + State.str + (p.combatStr || 0) + (p.turnStr || 0) + (p.wStr || 0);
                dmg += (p.turnDmgMod || 0);
                if (dmg < 0) dmg = 0; 
                
                let isCrit = false;
                if(State.momentum >= 10) { dmg = Math.floor(dmg * 1.5); State.momentum = 0; isCrit = true; }
                if(State.combat.player.dmgDouble) dmg *= 2; 

                // 虚弱减伤(-30%) 与 易伤增伤(+50%)
                if(State.combat.player.weak > 0) dmg = Math.floor(dmg * 0.7);
                if(State.combat.enemy.vuln > 0) dmg = Math.floor(dmg * 1.5);

                State.combat.enemy.hp = Math.max(0, State.combat.enemy.hp - dmg);
                Combat.floatText('enemy', `-${dmg}`, isCrit ? 'crit' : '');
                
                $('screen-combat').classList.add('hit-stop');
                $('enemy').classList.add('shake');
                setTimeout(() => { $('screen-combat').classList.remove('hit-stop'); $('enemy').classList.remove('shake'); }, 300);
            },
            takeDmg: (dmg, ignoreBlock = false) => {
                // 自身易伤增伤
                if(State.combat.player.vuln > 0 && !ignoreBlock) dmg = Math.floor(dmg * 1.5);
                if(State.combat.player.takeDmgDouble && !ignoreBlock) dmg *= 2;
                
                if(!ignoreBlock) {
                    // 注：闪避已改为仅可主动打出（凑平仄），不再于此自动弃置抵伤
                    if(State.combat.player.block > 0) {
                        if(State.combat.player.block >= dmg) { State.combat.player.block -= dmg; dmg = 0; Combat.floatText('player', '持守', 'block'); }
                        else { dmg -= State.combat.player.block; State.combat.player.block = 0; }
                    }
                }
                
                if(dmg > 0) {
                    let nextHp = State.hp - dmg;
                    // 开发者模式 · 不死：HP 最低保留 1
                    if (State._dev && State._devGod && nextHp < 1) nextHp = 1;
                    State.hp = Math.max(0, nextHp);
                    Combat.floatText('player', `-${dmg}`, 'crit');
                    $('player').classList.add('shake'); setTimeout(()=>$('player').classList.remove('shake'), 300);
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
            // 卡面动态数值预览：返回 { value, tip } 用于 desc 中 {V_ATK}/{V_DEF} 渲染
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
                el.style.left = `${rect.left + rect.width/2 - 20}px`; el.style.top = `${rect.top + 50}px`;
                document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
            },
            endTurn: () => {
                if(!State.combat.isPlayerTurn) return;
                State.combat.isPlayerTurn = false;
                $('end-turn-btn').className = ''; $('end-turn-btn').innerText = '敌方回合';
                
                // 镜像在回合结束时进入沉沙
                for(let i = State.combat.hand.length - 1; i >= 0; i--) {
                    const it = Combat.normalizeHandItem(State.combat.hand[i]);
                    if (it.isMirror) {
                        State.combat.hand.splice(i, 1);
                        State.combat.exhaustPile.push(it.cardId);
                    }
                }
                
                State.combat.player.weak = false;
                Combat.renderHand(); 
                setTimeout(Combat.enemyTurn, 1000);
            },
            updateEnemyIntent: () => {
                const e = State.combat.enemy; const el = $('enemy-intent');
                const enemyData = EnemyDB[e.dataKey] || Object.values(EnemyDB).find(data => data.id === e.id);
                el.innerText = enemyData ? enemyData.intent(e) : '意图: 等待';
            },
            enemyTurn: () => {
                const e = State.combat.enemy;
                // 开发者模式 · 跳过敌方回合（敌人 turnCounter 不递增，意图序列保持原节奏）
                if (State._dev && State._devSkipEnemy) {
                    Game.showToast('开发者模式：敌方回合已跳过');
                } else if (e.stun) {
                    Game.showToast('敌人囿于旋风中无法行动！');
                } else {
                    const enemyData = EnemyDB[e.dataKey] || Object.values(EnemyDB).find(data => data.id === e.id);
                    if(enemyData) enemyData.act(e);
                }
                
                if (!(State._dev && State._devSkipEnemy)) e.turnCounter++;
                if(State.hp > 0 && e.hp > 0) { State.combat.turn++; setTimeout(Combat.startTurn, 1000); }
            },
            updateStatusBar: () => {
                const pBar = $('player-status-bar');
                const p = State.combat.player;
                if(pBar) {
                    pBar.innerHTML = '';
                    // 常驻：力 / 御 总览（含分项 hover）
                    const totalStr = State.str + (p.combatStr || 0) + (p.turnStr || 0) + (p.wStr || 0);
                    const totalDef = State.def + (p.combatDef || 0) + (p.turnDef || 0) + (p.wDef || 0);
                    const strDetail = `角色武力 ${State.str}` + (p.wStr ? `\n武器属性 +${p.wStr}` : '') + (p.combatStr ? `\n战斗武力 ${p.combatStr >= 0 ? '+' : ''}${p.combatStr}` : '') + (p.turnStr ? `\n本回合武力 ${p.turnStr >= 0 ? '+' : ''}${p.turnStr}` : '') + `\n= ${totalStr}`;
                    const defDetail = `角色御力 ${State.def}` + (p.wDef ? `\n武器属性 +${p.wDef}` : '') + (p.combatDef ? `\n战斗御力 ${p.combatDef >= 0 ? '+' : ''}${p.combatDef}` : '') + (p.turnDef ? `\n本回合御力 ${p.turnDef >= 0 ? '+' : ''}${p.turnDef}` : '') + `\n= ${totalDef}`;
                    pBar.innerHTML += `<div class="status-icon">⚔ ${totalStr}<div class="status-tooltip">${strDetail.replace(/\n/g,'<br>')}</div></div>`;
                    pBar.innerHTML += `<div class="status-icon">🛡 ${totalDef}<div class="status-tooltip">${defDetail.replace(/\n/g,'<br>')}</div></div>`;
                    if(p.weak > 0) pBar.innerHTML += `<div class="status-icon">📉<div class="status-tooltip">虚弱：造成的伤害降低 30% (剩余 ${p.weak} 回合)</div></div>`;
                    if(p.vuln > 0) pBar.innerHTML += `<div class="status-icon">💔<div class="status-tooltip">易伤：受到的伤害增加 50% (剩余 ${p.vuln} 回合)</div></div>`;
                    if(p.cantPlay) pBar.innerHTML += `<div class="status-icon">🛑<div class="status-tooltip">禁锢：本回合无法再打出卡牌</div></div>`;
                    if(p.cantDmg) pBar.innerHTML += `<div class="status-icon">🕊️<div class="status-tooltip">止战：本回合无法造成任何伤害</div></div>`;
                    if(p.turnDmgMod !== 0) pBar.innerHTML += `<div class="status-icon">🩸<div class="status-tooltip">本回合最终伤害修正：${p.turnDmgMod > 0 ? '+'+p.turnDmgMod : p.turnDmgMod}</div></div>`;
                    if(p.deathCountdown > 0) pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">💀 ${p.deathCountdown}<div class="status-tooltip">案剑瞋目：${p.deathCountdown} 回合后力竭而亡</div></div>`;
                    if(p.yiZhuan) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">↻<div class="status-tooltip">一转攻势：每失 3 力 +1 力（已累计 ${p.lostStrAcc || 0}/3）</div></div>`;
                    if(p.fengDao) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">🗡<div class="status-tooltip">封刀挂剑：每失力时抽 2 张</div></div>`;
                    if(p.emei) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚡ ${p.emeiCount || 0}<div class="status-tooltip">峨眉剑法：每打 3 张武卡抽 1 张（已 ${p.emeiCount || 0}/3）</div></div>`;
                    if(p.chunQiang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">舌<div class="status-tooltip">唇枪舌剑：每打仄牌对随机敌造成卡牌特性 -5 的伤害</div></div>`;
                    if(p.guRuo) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">壁<div class="status-tooltip">固若金汤：每打平牌获得卡牌特性 -4 的持守</div></div>`;
                    if(p.daoGuang) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">⚔×2<div class="status-tooltip">刀光剑影：名字含"剑"的卡牌打出时再打一次</div></div>`;
                    if(p.nianNuJiao) pBar.innerHTML += `<div class="status-icon" style="color:var(--gold);">📜<div class="status-tooltip">念奴娇：每回合开始失 1 血，从弃牌堆随机自动打出 1 张</div></div>`;
                    if(p.dmgDouble || p.takeDmgDouble) pBar.innerHTML += `<div class="status-icon" style="color:var(--blood-red);">2×<div class="status-tooltip">满江红：本回合伤害与受伤翻倍</div></div>`;
                    if(p.keepBlock > 0) pBar.innerHTML += `<div class="status-icon" style="color:#60a5fa;">壁${p.keepBlock}<div class="status-tooltip">坚壁清野：跨回合保留至多 ${p.keepBlock} 点持守</div></div>`;
                }
                const eBar = $('enemy-status-bar');
                if(eBar) {
                    eBar.innerHTML = '';
                    if(State.combat.enemy.stun) eBar.innerHTML += `<div class="status-icon">🌪️<div class="status-tooltip">囿于旋风：本回合无法行动</div></div>`;
                    if(State.combat.enemy.weak > 0) eBar.innerHTML += `<div class="status-icon">📉<div class="status-tooltip">虚弱：造成的伤害降低 30% (剩余 ${State.combat.enemy.weak} 回合)</div></div>`;
                    if(State.combat.enemy.vuln > 0) eBar.innerHTML += `<div class="status-icon">💔<div class="status-tooltip">易伤：受到的伤害增加 50% (剩余 ${State.combat.enemy.vuln} 回合)</div></div>`;
                }
            },
            viewPile: (type) => {
                if(!State.combat.inCombat) return;
                Game.toggleModal('pile-panel');
                const grid = $('pile-grid');
                grid.innerHTML = '';
                
                let pileArray, label;
                if (type === 'draw') { pileArray = State.combat.drawPile; label = '抽牌堆'; }
                else if (type === 'exhaust') { pileArray = State.combat.exhaustPile; label = '沉沙堆'; }
                else { pileArray = State.combat.discardPile; label = '弃牌堆'; }
                $('pile-title').innerText = `${label} (${pileArray.length} 张)`;

                const counts = {};
                pileArray.forEach(id => counts[id] = (counts[id] || 0) + 1);

                Object.entries(counts).forEach(([cId, count]) => {
                    grid.appendChild(Game.createCardDOM(CardDB[cId], count));
                });
            },
            checkDeath: () => {
                if(State.hp <= 0) {
                    State.combat.inCombat = false;
                    Game.showToast('胜败乃兵家常事，大侠重新来过...');
                    AudioSys.stopBGM();
                    setTimeout(() => Game.navTo('screen-main'), 3000);
                } 
                else if(State.combat.inCombat && State.combat.enemy.hp <= 0) {
                    State.combat.inCombat = false;
                    AudioSys.playBGM('assets/bgm_map.mp3'); 
                    setTimeout(() => { 
                        Settlement.show(State.combat.enemy.id); 
                    }, 1500);
                }
            }
        };
