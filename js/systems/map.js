const MapSys = {
    getNodes: () => (typeof MapChapters !== 'undefined' && MapChapters[State.mapChapter]) ? MapChapters[State.mapChapter] : MapChapters[0],

    renderMap: () => {
        MapSys.nodesData = MapSys.getNodes();
        const svg = $('map-svg');
        const container = $('map-nodes-container');
        svg.innerHTML = '';
        container.innerHTML = '';

        for (let i = 0; i < MapSys.nodesData.length - 1; i++) {
            const n1 = MapSys.nodesData[i];
            const n2 = MapSys.nodesData[i + 1];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', `${n1.x}%`);
            line.setAttribute('y1', `${n1.y}%`);
            line.setAttribute('x2', `${n2.x}%`);
            line.setAttribute('y2', `${n2.y}%`);
            line.setAttribute('class', 'map-line');
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
        }

        MapSys.nodesData.forEach((n, i) => {
            const el = document.createElement('div');
            el.className = `map-node ${i < State.mapNodeIndex ? 'visited' : (i === State.mapNodeIndex ? 'reachable' : '')}`;
            el.style.left = `${n.x}%`;
            el.style.top = `${n.y}%`;
            const markClass = n.mark === 'seal' ? 'map-mark-seal' : 'map-mark-ink';
            const glyph = (typeof n.glyph === 'string' && n.glyph.length) ? n.glyph : '·';
            el.innerHTML = `<div class="node-name">${n.name}</div><div class="node-icon ${n.type} ${markClass}"><span class="node-glyph">${glyph}</span></div>`;
            if (i === State.mapNodeIndex) el.onclick = () => MapSys.enterNode(n);
            container.appendChild(el);
        });
    },

    afterVillageChapter: (marker) => {
        if (marker === 0) {
            State.mapChapter = 1;
            State.mapNodeIndex = 0;
        } else if (marker === 1) {
            State.mapChapter = 2;
            State.mapNodeIndex = 0;
        } else if (marker === 2) {
            // 第三章荒村事件：不改变章节，仅返回地图
        }
        MapSys.renderMap();
        Game.navTo('screen-map');
    },

    enterNode: (node) => {
        if (State.isViewingMap) { Game.showToast('请先返回结算界面完成战利品选择！'); return; }

        State.mapNodeIndex++;
        if (node.ev === 'vn1') EventSys.start(Events.vn1);
        else if (node.ev === 'vn2') EventSys.start(Events.vn2);
        else if (node.ev === 'vn3') EventSys.start(Events.vn3);
        else if (node.ev === 'end') EventSys.start(Events.end_story);
        else if (node.ev === 'rng_mountain') {
            Combat.setNextCombatBackground(node.combatBg);
            Combat.start(resolveMountainEncounterId());
        } else if (node.ev === 'enc_xiu_luo' || node.ev.startsWith('fight') || node.ev.startsWith('enc_')) {
            Combat.setNextCombatBackground(node.combatBg);
            Combat.start(node.ev);
        } else if (node.ev.startsWith('village_hub_')) EventSys.start(Events[node.ev]);
    }
};

const EventSys = {
    currEv: null, textIndex: 0,

    _EVENT_BG_CLASSES: ['event-bg-teahouse', 'event-bg-village', 'event-bg-temple', 'event-bg-wangxiang', 'event-bg-naihe'],

    applyEventBackground: (evData) => {
        const el = $('screen-event');
        if (!el) return;
        EventSys._EVENT_BG_CLASSES.forEach((c) => el.classList.remove(c));
        const skin = evData && evData.eventSkin;
        const map = {
            teahouse: 'event-bg-teahouse',
            village: 'event-bg-village',
            temple: 'event-bg-temple',
            wangxiang: 'event-bg-wangxiang',
            naihe: 'event-bg-naihe'
        };
        const cls = map[skin];
        if (cls) el.classList.add(cls);
    },

    start: (evData) => {
        if (typeof hideKeywordTooltip === 'function') hideKeywordTooltip();
        AudioSys.playBGMTrack('world');
        EventSys.applyEventBackground(evData);
        EventSys.currEv = evData; EventSys.textIndex = 0;
        $('event-name').innerText = evData.name;
        $('event-options').style.display = 'none';
        $('event-text').style.display = 'block';
        EventSys.renderText();
        Game.navTo('screen-event');
    },
    renderText: () => { $('event-text').innerText = EventSys.currEv.texts[EventSys.textIndex]; },
    nextDialog: () => {
        if (EventSys.textIndex < EventSys.currEv.texts.length - 1) {
            EventSys.textIndex++; EventSys.renderText();
        } else {
            if (EventSys.currEv.opts.length > 0) {
                $('event-text').style.display = 'none';
                const optBox = $('event-options'); optBox.style.display = 'flex'; optBox.innerHTML = '';
                EventSys.currEv.opts.forEach(o => {
                    const btn = document.createElement('div'); btn.className = 'dialog-opt-btn'; btn.innerHTML = o.text.replace('\n', '<br>');
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const keep = o.cb();
                        if (keep === false) return;
                        MapSys.renderMap();
                        Game.navTo('screen-map');
                    };
                    optBox.appendChild(btn);
                });
            } else { MapSys.renderMap(); Game.navTo('screen-map'); }
        }
    }
};
