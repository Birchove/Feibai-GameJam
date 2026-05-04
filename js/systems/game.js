const Game = {
            navTo: (screenId) => {
                document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
                $(screenId).classList.add('active');
                $('abar').style.display = ['screen-map', 'screen-event', 'screen-combat', 'screen-settlement'].includes(screenId) ? 'flex' : 'none';
            },
            showToast: (msg) => {
                const t = $('toast'); t.innerText = msg; t.style.opacity = 1;
                setTimeout(() => t.style.opacity = 0, 2000);
            },
            toggleModal: (id) => {
                const el = $(id);
                if (el.classList.contains('active')) {
                    el.classList.remove('active');
                } else {
                    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
                    el.classList.add('active');
                    if(id === 'info-panel') Game.updateInfoPanel();
                }
            },
            selectSave: (slot) => {
                if(slot === 2) { Game.initGame('剑'); return; } 
                $('pv-overlay').style.display = 'flex';
                const video = $('pv-video');
                video.play().catch(e=>{}); 
                AudioSys.playBGM('assets/铁雨尘朝.mp3'); 
                video.onended = () => { Game.skipPV(); };
            },
            skipPV: () => {
                $('pv-overlay').style.display = 'none';
                const video = $('pv-video');
                video.pause(); video.currentTime = 0; video.onended = null;  
                AudioSys.stopBGM();
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
                if(!State.class) return Game.showToast('请先选择流派');
                Game.initGame(State.class);
            },
            initGame: (cls) => {
                const clsData = Object.values(ClassDB).find(c => c.name === cls) || ClassDB.sword;
                const init = clsData.initial;
                State.class = cls; State.hp = init.hp; State.maxHp = init.maxHp; State.gold = 100; State.mapNodeIndex = 0; State.relics = [];
                State.str = init.str; State.def = init.def; State.agi = init.agi;
                State.weapon = ''; State.poetry = []; State.wuxing = init.wuxing; 
                // 流派开局自带诗句（剑：吴钩霜雪明）
                if (cls === '剑' && typeof PoetryDB !== 'undefined' && PoetryDB.wuGouShuangXueMing) {
                    State.poetry.push('wuGouShuangXueMing');
                }
                // 严格遵循初始卡组设定
                State.deck = ['c1','c1','c1','c1', 'c2','c2','c2','c2', 'c3', 'c4']; 
                MapSys.renderMap();
                AudioSys.playBGM('assets/bgm_map.mp3'); 
                Game.navTo('screen-map');
            },
            updateInfoPanel: () => {
                $('info-class').innerText = State.class || '无';
                $('info-hp').innerText = `${State.hp}/${State.maxHp}`;
                $('info-gold').innerText = State.gold;
                $('info-str').innerText = State.str;
                $('info-def').innerText = State.def;
                $('info-wuxing').innerText = State.wuxing.toFixed(1);
                $('info-agi').innerText = State.agi;
                
                $('info-deck-count').innerText = State.deck.length; // 修复 Bug: 显示卡组总数
                $('info-weapon').innerHTML = State.weapon ? `<span style="color:var(--gold); font-weight:bold;">${State.weapon}</span>` : '空缺';
                const poetryBox = $('info-poetry');
                poetryBox.innerHTML = '';
                if (State.poetry.length > 0) {
                    State.poetry.forEach(p => {
                        poetryBox.appendChild(Game.createPoetryCardDOM(p));
                    });
                    bindKeywordTooltips(poetryBox);
                } else {
                    poetryBox.innerHTML = '暂无搜集';
                }
                $('info-relics').innerHTML = State.relics.length ? State.relics.map(r => `<div style="background:#111; padding:8px 15px; border:1px solid #555; border-radius:5px; color:var(--gold); font-size:14px;">${r}</div>`).join('') : '空空如也';
            },
            updateUI: () => {
                $('ui-energy').innerText = State.energy; $('ui-max-energy').innerText = State.maxEnergy;
                $('ui-momentum').innerText = State.momentum;
                $('player-hp-text').innerHTML = `${State.hp}/${State.maxHp} <span style="color:#60a5fa">${State.combat.player.block > 0 ? `(+${State.combat.player.block}持守)` : ''}</span>`;
                $('player-hp-fill').style.width = `${(State.hp/State.maxHp)*100}%`;
                if(State.combat.inCombat) {
                    $('enemy-hp-text').innerText = `${State.combat.enemy.hp}/${State.combat.enemy.maxHp}`;
                    $('enemy-hp-fill').style.width = `${(State.combat.enemy.hp/State.combat.enemy.maxHp)*100}%`;
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
            showGallery: () => {
                Game.navTo('screen-gallery');
                $('gallery-low').innerHTML = ''; $('gallery-mid').innerHTML = ''; $('gallery-high').innerHTML = ''; $('gallery-token').innerHTML = '';
                
                Object.values(CardDB).forEach(cd => {
                    if (cd.rarity === 'equip') return; // 不展示不可掉落的装备卡
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
            createCardDOM: (cd, count = 0) => {
                const el = document.createElement('div');
                el.className = 'deck-card';
                let html = '';
                if(count > 0) html += `<div class="card-count-badge">x${count}</div>`;
                html += `
                    <div class="card-cost">${cd.cost}</div><div class="card-type ${cd.typeClass}">${cd.type}</div>
                    <div class="card-name">${cd.name}</div>
                    <div class="card-category">${cd.cardType}</div>
                    <div class="asset-placeholder card-img" style="background: url('assets/card_${cd.id}.png') center/cover, #222; border:none;"></div>
                    <div class="card-desc">${cd.desc}</div>
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
                    ? `连续打出「${pd.pattern.join('')}」时（最近五张平仄即满足），${pd.effectDesc}。每次满足都会触发，并消耗最早一张平仄。`
                    : '尚未参悟其用。';
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
