const Combat = {
            start: (fightId) => {
                AudioSys.playBGM('assets/bgm_combat.mp3'); 

                State.combat.inCombat = true; State.combat.turn = 1; State.combat.pzHistory = [];
                State.combat.drawPile = [...State.deck]; Combat.shuffle(State.combat.drawPile);
                State.combat.discardPile = []; State.combat.hand = [];
                State.combat.player = { block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, vuln: 0, turnStr: 0, turnDef: 0, turnDmgMod: 0, keepBlock: 0, nianNuJiao: false, dmgDouble: false, takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false };
                
                $('pz-tracker').innerHTML = '';
                
                const e = State.combat.enemy;
                const enemyData = EnemyDB[fightId] || EnemyDB.fight1;
                e.id = enemyData.id; e.name = enemyData.name; e.hp = e.maxHp = enemyData.hp;
                e.turnCounter = 1; e.weak = 0; e.vuln = 0; e.stun = false; e.dataKey = fightId;
                $('enemy-sprite').style.background = enemyData.sprite;
                
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

                // 功法：念奴娇
                if(State.combat.player.nianNuJiao) {
                    Combat.takeDmg(1, true);
                    Combat.draw(1);
                }
                
                $('end-turn-btn').className = 'active'; $('end-turn-btn').innerText = '洗墨 (结束回合)';
                
                Combat.updateEnemyIntent();
                Combat.draw(State.combat.turn === 1 ? 6 : 3);
                Game.updateUI();
            },
            draw: (amt) => {
                AudioSys.playSFX('assets/sfx_draw.mp3'); 
                for(let i=0; i<amt; i++) {
                    if(State.combat.hand.length >= 10) break;
                    if(State.combat.drawPile.length === 0) {
                        if(State.combat.discardPile.length === 0) break;
                        State.combat.drawPile = [...State.combat.discardPile]; State.combat.discardPile = [];
                        Combat.shuffle(State.combat.drawPile); Game.showToast('牌库重洗');
                    }
                    State.combat.hand.push(State.combat.drawPile.pop());
                }
                Combat.renderHand();
            },
            renderHand: () => {
                const c = $('hand-container'); c.innerHTML = '';
                $('draw-count').innerText = State.combat.drawPile.length;
                $('discard-count').innerText = State.combat.discardPile.length;
                
                const groupedHand = [];
                State.combat.hand.forEach((cardId, i) => {
                    let group = groupedHand.find(g => g.cardId === cardId);
                    if(!group) {
                        group = { cardId, cards: [] };
                        groupedHand.push(group);
                    }
                    group.cards.push({ cardId, index: i });
                });

                groupedHand.forEach(group => {
                    const stack = document.createElement('div');
                    stack.className = 'hand-card-stack';

                    group.cards.forEach(({ cardId, index }, stackIndex) => {
                    const cd = CardDB[cardId];
                    const canPlay = State.combat.isPlayerTurn && !cd.unplayable && State.energy >= cd.cost && !State.combat.player.cantPlay;
                    
                    const el = document.createElement('div');
                    el.className = `card ${canPlay ? '' : 'disabled'}`;
                    el.dataset.index = index;
                    el.style.zIndex = stackIndex + 1;
                    el.innerHTML = `
                        <div class="card-cost">${cd.cost}</div><div class="card-type ${cd.typeClass}">${cd.type}</div>
                        <div class="card-name">${cd.name}</div>
                        <div class="asset-placeholder card-img" style="background: url('assets/card_${cd.id}.png') center/cover, #222; border:none;"></div>
                        <div class="card-desc">${cd.desc}</div>
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
                const cardId = State.combat.hand[index];
                if (!cardId) return;
                const cd = CardDB[cardId];
                if (State.energy < cd.cost || !State.combat.isPlayerTurn || State.combat.player.cantPlay) {
                    Game.showToast('无法打出此牌');
                    Combat.renderHand();
                    return;
                }
                
                State.energy -= cd.cost;
                if(cd.isAttack) State.momentum = Math.min(10, State.momentum + 1);
                
                if (!State.combat.player.ignorePZ) {
                    State.combat.pzHistory.push(cd.type);
                    if(State.combat.pzHistory.length > 5) State.combat.pzHistory.shift();
                    Combat.renderPZ();
                }

                State.combat.hand.splice(index, 1);
                State.combat.discardPile.push(cardId);
                
                cd.effect();
                
                Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
            },
            renderPZ: () => {
                const tr = $('pz-tracker'); tr.innerHTML = '';
                State.combat.pzHistory.forEach(char => {
                    const s = document.createElement('span'); s.className = 'pz-char'; s.innerText = char;
                    s.style.color = char === '平' ? '#9ca3af' : 'var(--blood-red)';
                    tr.appendChild(s);
                });
                if(State.combat.pzHistory.length > 0) AudioSys.playSFX('assets/sfx_pingze.mp3'); 
            },
            playAllAttacks: () => {
                const attackIds = [];
                for(let i=State.combat.hand.length-1; i>=0; i--) {
                    if(CardDB[State.combat.hand[i]].isAttack) {
                        attackIds.push(State.combat.hand[i]);
                        State.combat.hand.splice(i, 1);
                    }
                }
                if(attackIds.length === 0) return;
                
                let delay = 0;
                attackIds.forEach(cid => {
                    setTimeout(() => {
                        State.combat.discardPile.push(cid);
                        CardDB[cid].effect();
                        State.momentum = Math.min(10, State.momentum + 1);
                        Combat.renderHand(); Game.updateUI(); Combat.checkDeath();
                    }, delay);
                    delay += 400;
                });
            },
            dealDmg: (base, isFixed = false) => {
                AudioSys.playSFX('assets/sfx_hit.mp3'); 
                if (State.combat.player.cantDmg) { Game.showToast("止战：本回合无法造成伤害！"); return; }
                
                let wStr = 0; // 武器力
                // 计算：基础 + 角色属性力 + 临时力 + 武器力 (若固定则仅算基础)
                let dmg = isFixed ? base : base + State.str + (State.combat.player.turnStr || 0) + wStr;
                dmg += (State.combat.player.turnDmgMod || 0); // 蝶恋花等伤害修饰
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
                    while(dmg > 0) {
                        const dodgeIdx = State.combat.hand.indexOf('c2'); // 闪避检测
                        if(dodgeIdx !== -1) {
                            State.combat.hand.splice(dodgeIdx, 1); State.combat.discardPile.push('c2');
                            dmg -= 5; Game.showToast('闪避生效！抵消 5 伤'); Combat.floatText('player', '闪避', 'block');
                        } else break;
                    }
                    if(dmg <= 0) { Combat.renderHand(); return; }

                    if(State.combat.player.block > 0) {
                        if(State.combat.player.block >= dmg) { State.combat.player.block -= dmg; dmg = 0; Combat.floatText('player', '持守', 'block'); }
                        else { dmg -= State.combat.player.block; State.combat.player.block = 0; }
                    }
                }
                
                if(dmg > 0) {
                    State.hp = Math.max(0, State.hp - dmg);
                    Combat.floatText('player', `-${dmg}`, 'crit');
                    $('player').classList.add('shake'); setTimeout(()=>$('player').classList.remove('shake'), 300);
                }
                Game.updateUI(); Combat.renderHand(); Combat.checkDeath();
            },
            heal: (amt) => { State.hp = Math.min(State.maxHp, State.hp + amt); Game.updateUI(); Game.showToast(`回复 ${amt} 生命`); },
            addBlock: (base, isFixed = false) => { 
                let wDef = 0; // 武器御
                let blk = isFixed ? base : base + State.def + (State.combat.player.turnDef || 0) + wDef;
                if (blk < 0) blk = 0;
                State.combat.player.block += blk; 
                Game.updateUI(); 
                Combat.floatText('player', `+${blk} 持守`, 'block'); 
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
                if(e.stun) { Game.showToast('敌人囿于旋风中无法行动！'); }
                else {
                    const enemyData = EnemyDB[e.dataKey] || Object.values(EnemyDB).find(data => data.id === e.id);
                    if(enemyData) enemyData.act(e);
                }
                
                e.turnCounter++;
                if(State.hp > 0 && e.hp > 0) { State.combat.turn++; setTimeout(Combat.startTurn, 1000); }
            },
            updateStatusBar: () => {
                const pBar = $('player-status-bar');
                if(pBar) {
                    pBar.innerHTML = '';
                    if(State.combat.player.weak > 0) pBar.innerHTML += `<div class="status-icon">📉<div class="status-tooltip">虚弱：造成的伤害降低 30% (剩余 ${State.combat.player.weak} 回合)</div></div>`;
                    if(State.combat.player.vuln > 0) pBar.innerHTML += `<div class="status-icon">💔<div class="status-tooltip">易伤：受到的伤害增加 50% (剩余 ${State.combat.player.vuln} 回合)</div></div>`;
                    if(State.combat.player.cantPlay) pBar.innerHTML += `<div class="status-icon">🛑<div class="status-tooltip">禁锢：本回合无法再打出卡牌</div></div>`;
                    if(State.combat.player.cantDmg) pBar.innerHTML += `<div class="status-icon">🕊️<div class="status-tooltip">止战：本回合无法造成任何伤害</div></div>`;
                    if(State.combat.player.turnStr !== 0) pBar.innerHTML += `<div class="status-icon">⚔️<div class="status-tooltip">本回合力修改：${State.combat.player.turnStr > 0 ? '+'+State.combat.player.turnStr : State.combat.player.turnStr}</div></div>`;
                    if(State.combat.player.turnDef !== 0) pBar.innerHTML += `<div class="status-icon">🛡️<div class="status-tooltip">本回合御修改：${State.combat.player.turnDef > 0 ? '+'+State.combat.player.turnDef : State.combat.player.turnDef}</div></div>`;
                    if(State.combat.player.turnDmgMod !== 0) pBar.innerHTML += `<div class="status-icon">🩸<div class="status-tooltip">本回合最终伤害修正：${State.combat.player.turnDmgMod > 0 ? '+'+State.combat.player.turnDmgMod : State.combat.player.turnDmgMod}</div></div>`;
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
                
                const isDraw = type === 'draw';
                const pileArray = isDraw ? State.combat.drawPile : State.combat.discardPile;
                $('pile-title').innerText = `${isDraw ? '抽牌堆' : '弃牌堆'} (${pileArray.length} 张)`;

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
