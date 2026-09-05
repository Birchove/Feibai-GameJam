// 开发者模式：abar 中间标题 5 次连击触发；本局有效，不持久化
const DevSys = {
    _tapCount: 0,
    _tapTimer: null,
    TAP_WINDOW_MS: 1500,
    TAP_NEEDED: 5,

    // —— 触发：仅在 screen-map 上响应连击 ——
    tap: () => {
        const map = document.getElementById('screen-map');
        if (!map || !map.classList.contains('active')) return;
        DevSys._tapCount += 1;
        if (DevSys._tapTimer) clearTimeout(DevSys._tapTimer);
        DevSys._tapTimer = setTimeout(() => { DevSys._tapCount = 0; }, DevSys.TAP_WINDOW_MS);

        // 微反馈：标题闪一下
        const t = document.getElementById('abar-title');
        if (t) {
            t.classList.remove('dev-tap-flash');
            // 强制 reflow 重启动画
            void t.offsetWidth;
            t.classList.add('dev-tap-flash');
        }

        if (DevSys._tapCount >= DevSys.TAP_NEEDED) {
            DevSys._tapCount = 0;
            clearTimeout(DevSys._tapTimer);
            DevSys.confirmEnter();
        }
    },

    confirmEnter: () => {
        if (State._dev) { DevSys.openPanel(); return; }
        DevSys._buildModalsIfNeeded();
        document.querySelectorAll('.modal').forEach(el => el.classList.remove('active'));
        document.getElementById('dev-confirm').classList.add('active');
    },

    enable: () => {
        State._dev = true;
        DevSys._renderAbarBadge();
        Game.showToast('已进入开发者模式');
        DevSys.openPanel();
    },

    disable: () => {
        State._dev = false;
        State._devGod = false;
        State._devOneShot = false;
        State._devSkipEnemy = false;
        DevSys._renderAbarBadge();
        DevSys.closePanel();
        Game.showToast('已关闭开发者模式');
    },

    _renderAbarBadge: () => {
        const abar = document.getElementById('abar');
        if (!abar) return;
        let badge = document.getElementById('dev-abar-btn');
        if (State._dev) {
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'dev-abar-btn';
                badge.className = 'abar-btn';
                badge.title = '开发者面板';
                badge.innerHTML = '<i class="fa-solid fa-screwdriver-wrench"></i>';
                badge.onclick = () => DevSys.openPanel();
                abar.appendChild(badge);
            }
        } else if (badge) {
            badge.remove();
        }
    },

    openPanel: () => {
        DevSys._buildModalsIfNeeded();
        document.querySelectorAll('.modal').forEach(el => el.classList.remove('active'));
        document.getElementById('dev-panel').classList.add('active');
        DevSys.renderPanel();
    },

    closePanel: () => {
        const m = document.getElementById('dev-panel');
        if (m) m.classList.remove('active');
    },

    _buildModalsIfNeeded: () => {
        if (!document.getElementById('dev-confirm')) {
            const c = document.createElement('div');
            c.id = 'dev-confirm';
            c.className = 'modal';
            c.innerHTML = `
                <div class="dev-confirm-box">
                    <div class="dev-confirm-title">进入开发者模式？</div>
                    <div class="dev-confirm-text">仅本局生效，不会写入存档。<br/>包含全部卡牌、敌人 10000 血、状态/牌堆/流程注入等调试能力。</div>
                    <div class="dev-confirm-btns">
                        <div class="btn-g" id="dev-confirm-yes">确认进入</div>
                        <div class="btn-g" id="dev-confirm-no" style="border-color:#555;">取消</div>
                    </div>
                </div>`;
            document.body.appendChild(c);
            document.getElementById('dev-confirm-yes').onclick = () => { c.classList.remove('active'); DevSys.enable(); };
            document.getElementById('dev-confirm-no').onclick = () => { c.classList.remove('active'); };
        }
        if (!document.getElementById('dev-panel')) {
            const p = document.createElement('div');
            p.id = 'dev-panel';
            p.className = 'modal';
            p.innerHTML = `
                <div class="dev-panel-box">
                    <div class="close-btn" onclick="DevSys.closePanel()"><i class="fa-solid fa-xmark"></i></div>
                    <div class="dev-panel-title">开发者模式 · 调试面板</div>
                    <div id="dev-panel-body" class="dev-panel-body"></div>
                </div>`;
            document.body.appendChild(p);
        }
    },

    // —— 渲染面板(每次打开重渲，反映最新 State)——
    renderPanel: () => {
        const body = document.getElementById('dev-panel-body');
        if (!body) return;
        const inCombat = !!(State.combat && State.combat.inCombat);
        const cardKeys = Object.keys(CardDB).filter(k => !CardDB[k].unplayable && k !== 'c_duwu');
        const weaponKeys = (typeof WeaponDB !== 'undefined') ? Object.keys(WeaponDB) : [];
        const relicKeys = (typeof RelicDB !== 'undefined') ? Object.keys(RelicDB) : [];
        const eventKeys = (typeof Events !== 'undefined') ? Object.keys(Events) : [];
        const enemyKeys = (typeof EnemyDB !== 'undefined') ? Object.keys(EnemyDB) : [];
        const nodes = typeof MapSys !== 'undefined' && MapSys.getNodes ? MapSys.getNodes() : [];

        const optWeapon = `<option value="">无</option>` + weaponKeys.map(k => `<option value="${k}" ${State.weapon === k ? 'selected' : ''}>${WeaponDB[k].name} (力${WeaponDB[k].str || 0}/御${WeaponDB[k].def || 0})</option>`).join('');
        // 法宝单选：选中条件用 RelicDB[k].name 是否在 State.relics 中
        const curRelicKey = relicKeys.find(k => State.relics && State.relics.includes(RelicDB[k].name)) || '';
        const optRelic = `<option value="">无</option>` + relicKeys.map(k => `<option value="${k}" ${curRelicKey === k ? 'selected' : ''}>${RelicDB[k].name}</option>`).join('');
        const optCard = cardKeys.map(k => `<option value="${k}">${CardDB[k].name} · ${CardDB[k].type || '-'} · ${CardDB[k].cardType || ''}</option>`).join('');
        const optEvent = eventKeys.map(k => `<option value="${k}">${k} - ${Events[k].name}</option>`).join('');
        const optEnemy = enemyKeys.map(k => {
            const spec = EncounterDB[k];
            return `<option value="${k}">${k}${spec && spec.rewardTier ? ' · ' + spec.rewardTier : ''}</option>`;
        }).join('');
        const optNode = nodes.map(n => `<option value="${n.id}">#${n.id} ${n.name} (${n.ev})</option>`).join('');

        body.innerHTML = `
            <div class="dev-section">
                <div class="dev-section-title">基础数值</div>
                <div class="dev-row">
                    <label>气血</label><input id="dev-hp" type="number" value="${State.hp}"/>
                    <label>气血上限</label><input id="dev-maxhp" type="number" value="${State.maxHp}"/>
                </div>
                <div class="dev-row">
                    <label>能量</label><input id="dev-energy" type="number" value="${State.energy}"/>
                    <label>能量上限</label><input id="dev-maxenergy" type="number" value="${State.maxEnergy}"/>
                </div>
                <div class="dev-row">
                    <label>力</label><input id="dev-str" type="number" value="${State.str}"/>
                    <label>御</label><input id="dev-def" type="number" value="${State.def}"/>
                </div>
                <div class="dev-row">
                    <label>钱</label><input id="dev-gold" type="number" value="${State.gold}"/>
                    <label>悟性</label><input id="dev-wuxing" type="number" step="0.1" value="${State.wuxing}"/>
                    <label>轻功</label><input id="dev-agi" type="number" value="${State.agi}"/>
                </div>
                <div class="dev-row"><div class="btn-g dev-btn" onclick="DevSys.applyStats()">应用基础数值</div></div>
            </div>

            <div class="dev-section">
                <div class="dev-section-title">修改器开关</div>
                <div class="dev-row dev-toggle-row">
                    <label><input type="checkbox" id="dev-god" ${State._devGod ? 'checked' : ''}/> 不死模式(HP 不低于 1)</label>
                    <label><input type="checkbox" id="dev-oneshot" ${State._devOneShot ? 'checked' : ''}/> 一击必杀(任一伤害直接清空敌人 HP)</label>
                    <label><input type="checkbox" id="dev-skipenemy" ${State._devSkipEnemy ? 'checked' : ''}/> 跳过敌方回合</label>
                </div>
                <div class="dev-row"><div class="btn-g dev-btn" onclick="DevSys.applyToggles()">应用开关</div></div>
            </div>

            <div class="dev-section">
                <div class="dev-section-title">武器 / 法宝 / 诗句</div>
                <div class="dev-row">
                    <label>武器(单选)</label>
                    <select id="dev-weapon">${optWeapon}</select>
                    <div class="btn-g dev-btn" onclick="DevSys.setWeapon()">切换武器</div>
                </div>
                <div class="dev-row">
                    <label>法宝(单选)</label>
                    <select id="dev-relic">${optRelic}</select>
                    <div class="btn-g dev-btn" onclick="DevSys.setRelic()">切换法宝</div>
                </div>
                <div class="dev-row">
                    <div class="btn-g dev-btn" onclick="DevSys.giveAllPoetry()">一键拥有全部诗句</div>
                    <div class="dev-mute">当前已拥有 ${(State.poetry || []).length} 条</div>
                </div>
            </div>

            <div class="dev-section">
                <div class="dev-section-title">卡组</div>
                <div class="dev-row">
                    <div class="btn-g dev-btn" onclick="DevSys.giveAllCards()">一键加入全部卡牌</div>
                    <div class="btn-g dev-btn" style="border-color:#555;" onclick="DevSys.clearDeck()">清空牌组</div>
                    <div class="dev-mute">当前牌组 ${(State.deck || []).length} 张</div>
                </div>
            </div>

            <div class="dev-section ${inCombat ? '' : 'dev-disabled'}">
                <div class="dev-section-title">战斗调试 ${inCombat ? '' : '<span class="dev-mute">(不在战斗中，部分功能不可用)</span>'}</div>
                <div class="dev-row">
                    <label>追加手牌</label>
                    <select id="dev-card-pick">${optCard}</select>
                    <label><input type="checkbox" id="dev-card-zerocost"/> 0 气</label>
                    <div class="btn-g dev-btn" onclick="DevSys.injectHandCard()">放入手牌</div>
                </div>
                <div class="dev-row">
                    <label>牌堆注入</label>
                    <select id="dev-pile-pick">${optCard}</select>
                    <select id="dev-pile-target">
                        <option value="discard">弃牌堆</option>
                        <option value="exhaust">沉沙堆</option>
                        <option value="draw">抽牌堆</option>
                    </select>
                    <div class="btn-g dev-btn" onclick="DevSys.injectPile()">放入</div>
                </div>
                <div class="dev-row">
                    <label>平仄历史</label>
                    <input id="dev-pz" type="text" placeholder='例：平平平仄'/>
                    <div class="btn-g dev-btn" onclick="DevSys.injectPzHistory()">追加</div>
                </div>
                <div class="dev-row">
                    <label>状态注入</label>
                    <select id="dev-status-target"><option value="player">玩家</option><option value="enemy">敌人</option></select>
                    <select id="dev-status-name"><option value="weak">虚弱</option><option value="vuln">易伤</option><option value="stun">囿于旋风</option></select>
                    <input id="dev-status-val" type="number" value="2" style="width:80px;"/>
                    <div class="btn-g dev-btn" onclick="DevSys.applyStatus()">施加</div>
                </div>
                <div class="dev-row">
                    <div class="btn-g dev-btn" onclick="DevSys.instantWin()">立即胜利</div>
                    <div class="btn-g dev-btn" style="border-color:var(--blood-red);" onclick="DevSys.instantLose()">立即败北</div>
                </div>
            </div>

            <div class="dev-section">
                <div class="dev-section-title">流程跳转</div>
                <div class="dev-row">
                    <label>地图节点</label>
                    <select id="dev-node">${optNode}</select>
                    <div class="btn-g dev-btn" onclick="DevSys.gotoNode()">跳到该节点</div>
                </div>
                <div class="dev-row">
                    <label>事件</label>
                    <select id="dev-event">${optEvent}</select>
                    <div class="btn-g dev-btn" onclick="DevSys.openEvent()">打开事件</div>
                </div>
                <div class="dev-row">
                    <label>战斗</label>
                    <select id="dev-fight">${optEnemy}</select>
                    <div class="btn-g dev-btn" onclick="DevSys.startFight()">开始战斗</div>
                </div>
            </div>

            <div class="dev-section">
                <div class="dev-row">
                    <div class="btn-g dev-btn" style="border-color:#777;" onclick="DevSys.disable()">关闭开发者模式</div>
                </div>
            </div>`;
    },

    // —— 操作实现 ——
    applyStats: () => {
        const num = (id, fallback) => {
            const v = parseFloat(document.getElementById(id).value);
            return Number.isFinite(v) ? v : fallback;
        };
        State.maxHp = Math.max(1, Math.floor(num('dev-maxhp', State.maxHp)));
        State.hp = Math.max(0, Math.min(State.maxHp, Math.floor(num('dev-hp', State.hp))));
        State.maxEnergy = Math.max(0, Math.floor(num('dev-maxenergy', State.maxEnergy)));
        State.energy = Math.max(0, Math.floor(num('dev-energy', State.energy)));
        State.str = Math.floor(num('dev-str', State.str));
        State.def = Math.floor(num('dev-def', State.def));
        State.gold = Math.max(0, Math.floor(num('dev-gold', State.gold)));
        State.wuxing = num('dev-wuxing', State.wuxing);
        State.agi = Math.floor(num('dev-agi', State.agi));
        Game.updateUI();
        if (State.combat && State.combat.inCombat) Combat.renderHand();
        Game.showToast('基础数值已应用');
    },

    applyToggles: () => {
        State._devGod = !!document.getElementById('dev-god').checked;
        State._devOneShot = !!document.getElementById('dev-oneshot').checked;
        State._devSkipEnemy = !!document.getElementById('dev-skipenemy').checked;
        Game.showToast('开关已应用');
    },

    setWeapon: () => {
        const v = document.getElementById('dev-weapon').value;
        State.weapon = v || '';
        // 战斗中同步 wStr/wDef，使卡面预览正确
        if (State.combat && State.combat.inCombat) {
            const w = v ? WeaponDB[v] : null;
            State.combat.player.wStr = w ? (w.str || 0) : 0;
            State.combat.player.wDef = w ? (w.def || 0) : 0;
            Combat.renderHand();
        }
        Game.updateUI();
        Game.showToast(v ? `已装备：${WeaponDB[v].name}` : '已卸下武器');
    },

    setRelic: () => {
        const v = document.getElementById('dev-relic').value;
        State.relics = [];
        if (v && RelicDB[v]) State.relics.push(RelicDB[v].name);
        Game.updateUI();
        Game.showToast(v ? `已装备：${RelicDB[v].name}` : '已卸下法宝');
    },

    giveAllPoetry: () => {
        if (typeof PoetryDB === 'undefined') return;
        Object.keys(PoetryDB).forEach(k => {
            if (!State.poetry.includes(k)) State.poetry.push(k);
        });
        Game.updateUI();
        Game.showToast(`已拥有全部诗句 (${State.poetry.length} 条)`);
        DevSys.renderPanel();
    },

    giveAllCards: () => {
        const keys = Object.keys(CardDB).filter(k => !CardDB[k].unplayable && k !== 'c_duwu');
        let added = 0;
        keys.forEach(k => { if (!State.deck.includes(k)) { State.deck.push(k); added++; } });
        Game.showToast(`牌组追加 ${added} 张(去重，当前共 ${State.deck.length} 张)`);
        DevSys.renderPanel();
    },

    clearDeck: () => {
        State.deck = [];
        Game.showToast('牌组已清空');
        DevSys.renderPanel();
    },

    injectHandCard: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        if (State.combat.hand.length >= 10) { Game.showToast('手牌已满(10 张上限)'); return; }
        const cId = document.getElementById('dev-card-pick').value;
        const free = document.getElementById('dev-card-zerocost').checked;
        const item = { cardId: cId };
        if (free) item.costOverride = 0;
        State.combat.hand.push(item);
        Combat.renderHand();
        Game.showToast(`手牌追加：${CardDB[cId].name}${free ? '(0 气)' : ''}`);
    },

    injectPile: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        const cId = document.getElementById('dev-pile-pick').value;
        const target = document.getElementById('dev-pile-target').value;
        if (target === 'exhaust') State.combat.exhaustPile.push(cId);
        else if (target === 'discard') State.combat.discardPile.push(cId);
        else State.combat.drawPile.push(cId);
        Combat.renderHand();
        const label = target === 'exhaust' ? '沉沙堆' : (target === 'discard' ? '弃牌堆' : '抽牌堆');
        Game.showToast(`已放入 ${label}：${CardDB[cId].name}`);
    },

    injectPzHistory: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        const seq = document.getElementById('dev-pz').value || '';
        let n = 0;
        for (const ch of seq) {
            if (ch === '平' || ch === '仄') { State.combat.pzHistory.push(ch); n++; }
        }
        if (typeof Combat.renderPZ === 'function') Combat.renderPZ();
        if (typeof Combat.checkPoetryTrigger === 'function') Combat.checkPoetryTrigger();
        Game.showToast(`平仄注入 ${n} 字`);
    },

    applyStatus: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        const tgt = document.getElementById('dev-status-target').value;
        const name = document.getElementById('dev-status-name').value;
        const val = parseInt(document.getElementById('dev-status-val').value || '0', 10) || 0;
        let obj;
        if (tgt === 'player') obj = State.combat.player;
        else {
            const liv = Combat._livingIndices();
            const idx = liv.length ? liv[0] : 0;
            obj = State.combat.enemies[idx];
            if (!obj) { Game.showToast('无存活敌人'); return; }
        }
        if (name === 'stun') obj.stun = !!val;
        else obj[name] = Math.max(0, val);
        if (typeof Combat.updateStatusBar === 'function') Combat.updateStatusBar();
        if (typeof Combat.renderEnemies === 'function') Combat.renderEnemies();
        Game.updateUI();
        Game.showToast(`已对${tgt === 'player' ? '玩家' : '敌人'}施加 ${name}=${val}`);
    },

    instantWin: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        State.combat.enemies.forEach(e => { if (e) e.hp = 0; });
        Game.updateUI();
        Combat.checkDeath();
        DevSys.closePanel();
    },

    instantLose: () => {
        if (!State.combat || !State.combat.inCombat) { Game.showToast('需在战斗中'); return; }
        State.hp = 0;
        Game.updateUI();
        Combat.checkDeath();
        DevSys.closePanel();
    },

    gotoNode: () => {
        const idx = parseInt(document.getElementById('dev-node').value, 10);
        if (!Number.isFinite(idx)) return;
        // 跳转：直接进入该节点逻辑(与正常点击节点一致)
        const node = MapSys.getNodes().find(n => n.id === idx);
        if (!node) return;
        // 退出战斗状态防干扰
        if (State.combat && State.combat.inCombat) State.combat.inCombat = false;
        // 同步索引(保证后续节点解锁状态正确)
        State.mapNodeIndex = idx;
        DevSys.closePanel();
        // 复用 MapSys.enterNode 的事件 / 战斗派发逻辑(force：战斗中跳转时地图未必仍为当前屏)
        MapSys.enterNode(node, { force: true });
    },

    openEvent: () => {
        const k = document.getElementById('dev-event').value;
        if (typeof Events !== 'undefined' && Events[k]) {
            DevSys.closePanel();
            EventSys.start(Events[k]);
        }
    },

    startFight: () => {
        const k = document.getElementById('dev-fight').value;
        if (typeof EnemyDB !== 'undefined' && EnemyDB[k]) {
            DevSys.closePanel();
            Combat.start(k);
        }
    },
};
