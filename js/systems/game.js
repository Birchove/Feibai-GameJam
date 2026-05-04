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
                // 流派开局自带诗句与武器（剑：吴钩霜雪明 + 绣剑）
                if (cls === '剑') {
                    if (typeof PoetryDB !== 'undefined' && PoetryDB.wuGouShuangXueMing) State.poetry.push('wuGouShuangXueMing');
                    if (typeof WeaponDB !== 'undefined' && WeaponDB.xiuJian) State.weapon = 'xiuJian';
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
                // 武器属性加成（仅当装备武器时）
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
                // 中心栏：角色基础力/御（解释左侧 11(5+6) 中的 5）
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
                    $('info-weapon').innerHTML = weaponName ? `<span style="color:var(--gold); font-weight:bold;">${weaponName}</span>` : '空缺';
                }
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
                    <div class="card-desc">${Game.renderCardDesc(cd)}</div>
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
