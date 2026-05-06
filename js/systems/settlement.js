const Settlement = {
            currentRewards: {},
            selectedCardIds: [],
            maxCardPicks: 1,

            show: (rewardTier) => {
                const isElite = rewardTier === 'elite';

                State._settlementFromVillageAmbush = !!State.combat.encounterKey && State.combat.encounterKey === 'enc_village_ambush';
                if (State._settlementFromVillageAmbush && State.deck && !State.deck.includes('c9')) {
                    State.deck.push('c9');
                    Game.showToast('荒村厄除：念奴娇已写入残卷');
                }

                Settlement.currentRewards.gold = isElite ? rand(40, 60) : rand(20, 40);
                Settlement.currentRewards.wuxing = isElite ? 0.5 : 0.2;
                
                const optionsCount = Math.max(1, Math.floor(State.wuxing));
                Settlement.maxCardPicks = State.wuxing < 4 ? 1 : 2;
                Settlement.selectedCardIds = [];

                const allKeys = Object.keys(CardDB).filter(k => CardDB[k].rarity !== 'equip' && CardDB[k].rarity !== 'token');
                const rewardKeyPool = State._settlementFromVillageAmbush ? allKeys.filter((k) => k !== 'c9') : allKeys;
                Settlement.currentRewards.cards = [];
                
                const getRandomCardByRarity = () => {
                    const roll = Math.random();
                    let targetRarity = 'low'; // 45%
                    if(roll > 0.45 && roll <= 0.85) targetRarity = 'mid'; // 40%
                    else if(roll > 0.85) targetRarity = 'high'; // 15%
                    
                    const pool = rewardKeyPool.filter(k => CardDB[k].rarity === targetRarity);
                    return pool[rand(0, pool.length - 1)];
                };

                while(Settlement.currentRewards.cards.length < optionsCount) {
                    const rCard = getRandomCardByRarity();
                    if(!Settlement.currentRewards.cards.includes(rCard)) {
                        Settlement.currentRewards.cards.push(rCard);
                    }
                }
                
                Settlement.currentRewards.weapon = isElite ? Items.randomWeapon() : null;
                const ownedRelicNames = new Set(State.relics || []);
                const relicFromCombat = State.combat && State.combat.encounterKey === 'enc_xiu_luo';
                Settlement.currentRewards.relic = relicFromCombat ? Items.randomRelic(ItemPools.eliteRelics, ownedRelicNames) : null;
                const poetryChance = isElite ? 0.8 : 0.3;
                const ownedPoetryIds = new Set(State.poetry || []);
                Settlement.currentRewards.poetry = Math.random() < poetryChance ? Items.randomPoetry(ItemPools.poetry, ownedPoetryIds) : null;

                const qibuId = State._qibuPoetryReward;
                State._qibuPoetryReward = null;
                Settlement.currentRewards.qibuPoetry = (qibuId && typeof PoetryDB !== 'undefined' && PoetryDB[qibuId]) ? PoetryDB[qibuId] : null;

                Settlement.render();
                Game.navTo('screen-settlement');
            },

            render: () => {
                const r = Settlement.currentRewards;
                
                Settlement.createBox('gold', `获得 ${r.gold} 钱`, () => {
                    State.gold += r.gold; Game.showToast(`获得 ${r.gold} 钱财`);
                });

                Settlement.createBox('wuxing', `获得 ${r.wuxing} 点悟性`, () => {
                    State.wuxing += r.wuxing; Game.showToast('悟性提升！');
                });

                const cBox = $('reward-card-box'); cBox.className = 'reward-box';
                const cContent = $('reward-card-content'); 
                cContent.innerHTML = '';
                cContent.className = 'reward-card-container'; 
                
                $('reward-card-title').innerText = `卡牌 (可挑 ${Settlement.maxCardPicks} 张)`;

                r.cards.forEach(cId => {
                    const cd = CardDB[cId];
                    const domWrapper = document.createElement('div');
                    domWrapper.className = 'reward-card-wrapper';
                    const cardDom = Game.createCardDOM(cd);
                    if(cd.rarity === 'mid') cardDom.classList.add('mid-rarity-card');
                    if(cd.rarity === 'high') cardDom.classList.add('high-rarity-card');
                    domWrapper.appendChild(cardDom);
                    
                    domWrapper.onclick = () => {
                        if(cBox.classList.contains('claimed')) return; 
                        
                        if(domWrapper.classList.contains('selected')) {
                            domWrapper.classList.remove('selected');
                            Settlement.selectedCardIds = Settlement.selectedCardIds.filter(id => id !== cId);
                        } else {
                            if(Settlement.selectedCardIds.length < Settlement.maxCardPicks) {
                                domWrapper.classList.add('selected');
                                Settlement.selectedCardIds.push(cId);
                            } else {
                                Game.showToast(`当前悟性最多只能选取 ${Settlement.maxCardPicks} 张卡！`);
                            }
                        }
                        updateClaimBtn();
                    };
                    cContent.appendChild(domWrapper);
                });

                const claimBtn = document.createElement('div');
                claimBtn.className = 'reward-claim-btn disabled'; claimBtn.innerText = '确认领取选中卡牌';
                
                const updateClaimBtn = () => {
                    if(Settlement.selectedCardIds.length > 0) {
                        claimBtn.classList.remove('disabled');
                        claimBtn.onclick = () => {
                            Settlement.selectedCardIds.forEach(id => State.deck.push(id));
                            Game.showToast(`成功将 ${Settlement.selectedCardIds.length} 张牌洗入残卷库！`);
                            cBox.classList.add('claimed');
                            claimBtn.onclick = null; 
                        };
                    } else {
                        claimBtn.classList.add('disabled'); claimBtn.onclick = null;
                    }
                };
                
                if(r.cards.length > 0) {
                    const btnContainer = document.createElement('div');
                    btnContainer.style.width = '100%';
                    btnContainer.style.display = 'flex';
                    btnContainer.style.justifyContent = 'center';
                    btnContainer.style.gap = '14px';
                    btnContainer.appendChild(claimBtn);

                    const skipBtn = document.createElement('div');
                    skipBtn.className = 'reward-claim-btn';
                    skipBtn.style.borderColor = '#555';
                    skipBtn.style.background = 'rgba(80,80,88,0.18)';
                    skipBtn.innerText = '空过（不选卡）';
                    skipBtn.onclick = () => {
                        Settlement.selectedCardIds = [];
                        cContent.querySelectorAll('.reward-card-wrapper.selected').forEach((el) => el.classList.remove('selected'));
                        cBox.classList.add('claimed');
                        claimBtn.classList.add('disabled');
                        claimBtn.onclick = null;
                        skipBtn.onclick = null;
                        Game.showToast('本次未领取卡牌');
                    };
                    btnContainer.appendChild(skipBtn);
                    cContent.appendChild(btnContainer);
                }

                Settlement.createBox('weapon', r.weapon ? `获得 ${r.weapon.name}（力${r.weapon.str || 0}，御${r.weapon.def || 0}）` : null, (done) => {
                    Game.tryAcquireWeapon(r.weapon.id, (ok) => {
                        if (typeof done === 'function') done(!!ok);
                    });
                    return false;
                });

                Settlement.createBox('relic', r.relic ? `获得 ${r.relic.name}\n${r.relic.desc || ''}` : null, () => {
                    if (State.relics.includes(r.relic.name)) {
                        Game.showToast('已拥有该法宝');
                        return;
                    }
                    State.relics.push(r.relic.name);
                    Game.showToast(`获得法宝：${r.relic.name}`);
                });

                Settlement.createBox('poetry', r.poetry ? `\u5bfb\u5f97\u8bd7\u5377\uff1a\n\u300c${r.poetry.text}\u300d` : null, () => {
                    if (!State.poetry.includes(r.poetry.id)) {
                        State.poetry.push(r.poetry.id);
                        Game.showToast(`\u9886\u609f\u8bd7\u53e5\uff1a${r.poetry.text}`);
                    } else {
                        Game.showToast('已参悟该诗句');
                    }
                });

                Settlement.createBox('qibu', r.qibuPoetry ? `七步成诗·本场参得残篇：\n「${r.qibuPoetry.text}」\n（已记入佚札）` : null, () => {
                    if (!State.poetry.includes(r.qibuPoetry.id)) State.poetry.push(r.qibuPoetry.id);
                    Game.updateInfoPanel();
                    Game.showToast(`领悟残篇：${r.qibuPoetry.text}`);
                });
            },
            createBox: (type, text, claimCb) => {
                const box = $(`reward-${type}-box`);
                const content = $(`reward-${type}-content`);
                box.className = 'reward-box'; 
                
                if(!text) {
                    content.innerHTML = `<div class="reward-empty">当前回合没有获得该奖励</div>`;
                    box.classList.add('claimed'); 
                } else {
                    content.innerHTML = `<div style="font-size:18px; margin-bottom:15px; white-space:pre-wrap;">${text}</div>`;
                    const btn = document.createElement('div');
                    btn.className = 'reward-claim-btn'; btn.innerText = '领取';
                    btn.onclick = () => {
                        const finalize = (ok = true) => {
                            if (ok) box.classList.add('claimed');
                        };
                        const ret = claimCb(finalize);
                        if (ret !== false) finalize(true);
                    };
                    content.appendChild(btn);
                }
            },
            viewMap: () => {
                State.isViewingMap = true; 
                $('screen-settlement').classList.remove('active');
                $('screen-map').classList.add('active');
                $('map-return-btn').style.display = 'block';
            },
            returnFromMap: () => {
                State.isViewingMap = false; 
                $('screen-map').classList.remove('active');
                $('map-return-btn').style.display = 'none';
                $('screen-settlement').classList.add('active');
            },
            leave: () => {
                const pending = State._villagePendingChapter;
                const fromAmbush = State._settlementFromVillageAmbush;
                State._settlementFromVillageAmbush = false;
                MapSys.renderMap();
                Game.navTo('screen-map');
                if (fromAmbush && pending !== undefined && pending !== null) {
                    State._villagePendingChapter = undefined;
                    setTimeout(() => Village_postFightRewards(pending), 400);
                }
            }
        };
