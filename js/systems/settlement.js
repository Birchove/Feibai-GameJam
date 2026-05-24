const Settlement = {
            currentRewards: {},
            selectedCardIds: [],
            maxCardPicks: 1,

            show: (rewardTier) => {
                const isElite = rewardTier === 'elite';

                State._settlementFromVillageAmbush = !!State.combat.encounterKey && State.combat.encounterKey === 'enc_village_ambush';
                if (State._settlementFromVillageAmbush && State.deck && !State.deck.includes('c9')) {
                    State.deck.push('c9');
                    Game.showToast('荒村厄除：《念奴娇》已写入残卷');
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
                    if (roll > 0.45 && roll <= 0.85) targetRarity = 'mid'; // 40%
                    else if (roll > 0.85) targetRarity = 'high'; // 15%

                    let pool = rewardKeyPool.filter(k => CardDB[k].rarity === targetRarity);
                    if (!pool.length) pool = rewardKeyPool.slice();
                    if (!pool.length) return null;
                    return pool[rand(0, pool.length - 1)];
                };

                let guard = 0;
                while (Settlement.currentRewards.cards.length < optionsCount && guard < 500) {
                    guard++;
                    const rCard = getRandomCardByRarity();
                    if (rCard == null) break;
                    if (!Settlement.currentRewards.cards.includes(rCard)) Settlement.currentRewards.cards.push(rCard);
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
                
                Settlement.createBox('gold', `得 ${r.gold} 钱`, () => {
                    State.gold += r.gold; Game.showToast(`钱袋沉了 ${r.gold} 文`);
                });

                Settlement.createBox('wuxing', `得 ${r.wuxing} 点悟性`, () => {
                    State.wuxing += r.wuxing; Game.showToast('灵台一明，似有所悟');
                });

                const cBox = $('reward-card-box'); cBox.className = 'reward-box';
                const cContent = $('reward-card-content'); 
                cContent.innerHTML = '';
                cContent.className = 'reward-card-container'; 
                
                $('reward-card-title').innerText = `残卷择取(可选 ${Settlement.maxCardPicks} 张)`;

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
                                Game.showToast(`以你当下悟性，至多选 ${Settlement.maxCardPicks} 张`);
                            }
                        }
                        updateClaimBtn();
                    };
                    cContent.appendChild(domWrapper);
                });

                const claimBtn = document.createElement('div');
                claimBtn.className = 'reward-claim-btn disabled'; claimBtn.innerText = '领下所选之牌';
                
                const updateClaimBtn = () => {
                    if(Settlement.selectedCardIds.length > 0) {
                        claimBtn.classList.remove('disabled');
                        claimBtn.onclick = () => {
                            Settlement.selectedCardIds.forEach(id => State.deck.push(id));
                            Game.showToast(`已将 ${Settlement.selectedCardIds.length} 张牌洗入所携残卷`);
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
                    skipBtn.innerText = '空过不取';
                    skipBtn.onclick = () => {
                        Settlement.selectedCardIds = [];
                        cContent.querySelectorAll('.reward-card-wrapper.selected').forEach((el) => el.classList.remove('selected'));
                        cBox.classList.add('claimed');
                        claimBtn.classList.add('disabled');
                        claimBtn.onclick = null;
                        skipBtn.onclick = null;
                        Game.showToast('本次未取一牌');
                    };
                    btnContainer.appendChild(skipBtn);
                    cContent.appendChild(btnContainer);
                }

                Settlement.createBox('weapon', r.weapon ? `神兵现世：${r.weapon.name}(力${r.weapon.str || 0}，御${r.weapon.def || 0})` : null, (done) => {
                    Game.tryAcquireWeapon(r.weapon.id, (ok) => {
                        if (typeof done === 'function') done(!!ok);
                    });
                    return false;
                });

                Settlement.createBox('relic', r.relic ? `获得 ${r.relic.name}\n${r.relic.desc || ''}` : null, () => {
                    if (State.relics.includes(r.relic.name)) {
                        Game.showToast('这件法宝，你早已持于身侧');
                        return;
                    }
                    State.relics.push(r.relic.name);
                    Game.showToast(`法宝入手：${r.relic.name}`);
                });

                Settlement.createBox('poetry', r.poetry ? `得诗卷：\n「${r.poetry.text}」` : null, () => {
                    if (!State.poetry.includes(r.poetry.id)) {
                        State.poetry.push(r.poetry.id);
                        Game.showToast(`心头豁然：${r.poetry.text}`);
                    } else {
                        Game.showToast('此诗你已背熟');
                    }
                });

                Settlement.createBox('qibu', r.qibuPoetry ? `七步成诗·本场拾得残句：\n「${r.qibuPoetry.text}」\n(已记入佚札)` : null, () => {
                    if (!State.poetry.includes(r.qibuPoetry.id)) State.poetry.push(r.qibuPoetry.id);
                    Game.updateInfoPanel();
                    Game.showToast(`拾得残句：${r.qibuPoetry.text}`);
                });
            },
            createBox: (type, text, claimCb) => {
                const box = $(`reward-${type}-box`);
                const content = $(`reward-${type}-content`);
                box.className = 'reward-box'; 
                
                if(!text) {
                    content.innerHTML = `<div class="reward-empty">此番并无这一项犒赏</div>`;
                    box.classList.add('claimed'); 
                } else {
                    content.innerHTML = `<div style="font-size:18px; margin-bottom:15px; white-space:pre-wrap;">${text}</div>`;
                    const btn = document.createElement('div');
                    btn.className = 'reward-claim-btn'; btn.innerText = '领取犒赏';
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
                    if (typeof Combat !== 'undefined' && Combat.defer) {
                        Combat.defer(() => Village_postFightRewards(pending), 400, { requireCombat: false });
                    } else {
                        setTimeout(() => Village_postFightRewards(pending), 400);
                    }
                }
            }
        };
