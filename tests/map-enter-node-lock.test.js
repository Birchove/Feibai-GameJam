const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const mapSrc = fs.readFileSync(path.join(root, 'js/systems/map.js'), 'utf8');

function makeElement(id = '') {
    return {
        id,
        style: {},
        className: '',
        innerHTML: '',
        innerText: '',
        children: [],
        dataset: {},
        parentNode: null,
        onclick: null,
        classList: {
            _set: new Set(),
            add(...names) { names.forEach((n) => this._set.add(n)); },
            remove(...names) { names.forEach((n) => this._set.delete(n)); },
            contains(name) { return this._set.has(name); },
            toggle(name, force) {
                if (force === undefined ? !this._set.has(name) : force) this._set.add(name);
                else this._set.delete(name);
            }
        },
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
        },
        setAttribute() {},
        removeAttribute() {}
    };
}

function loadMap() {
    const elements = new Map();
    const getEl = (id) => {
        if (!elements.has(id)) elements.set(id, makeElement(id));
        return elements.get(id);
    };
    getEl('screen-map').classList.add('active');
    getEl('screen-event');
    getEl('screen-combat');
    getEl('map-svg');
    getEl('map-nodes-container');

    const eventStarts = [];
    const combatStarts = [];

    const context = {
        console,
        Math,
        Array,
        Object,
        Set,
        Map,
        document: {
            createElement: (tag) => makeElement(tag),
            createElementNS: (ns, tag) => makeElement(tag),
            querySelectorAll: () => [],
            querySelector: (sel) => {
                if (sel === '.screen.active') {
                    for (const el of elements.values()) {
                        if (el.classList.contains('active')) return el;
                    }
                    return null;
                }
                return null;
            }
        },
        $: getEl,
        State: {
            isViewingMap: false,
            mapNodeIndex: 4,
            mapChapter: 0,
            combat: { inCombat: false }
        },
        MapChapters: [
            [
                { id: 0, ev: 'vn1' },
                { id: 1, ev: 'fight1' },
                { id: 2, ev: 'fight2' },
                { id: 3, ev: 'vn2' },
                { id: 4, ev: 'vn3' },
                { id: 5, ev: 'village_hub_0' }
            ],
            [],
            [
                { id: 0, ev: 'rng_mountain' },
                { id: 1, ev: 'enc_xiu_luo' },
                { id: 2, ev: 'village_hub_2' },
                { id: 3, ev: 'rng_mountain' },
                { id: 4, ev: 'vn2' },
                { id: 5, ev: 'enc_yan_luo_wang' },
                { id: 6, ev: 'end' }
            ]
        ],
        Events: {
            vn1: { name: 'vn1' },
            vn2: { name: 'vn2' },
            vn3: { name: 'vn3' },
            end_story: { name: 'end' },
            village_hub_0: { name: 'hub0' },
            village_hub_2: { name: 'hub2' }
        },
        Game: {
            showToast() {},
            navTo(screenId) {
                for (const el of elements.values()) el.classList.remove('active');
                getEl(screenId).classList.add('active');
            }
        },
        Combat: {
            setNextCombatBackground() {},
            start(id) {
                combatStarts.push(id);
                context.State.combat.inCombat = true;
                context.Game.navTo('screen-combat');
            }
        },
        resolveMountainEncounterId: () => 'enc_double_weak',
        EventSys: null,
        MapSys: null
    };

    vm.runInNewContext(mapSrc + '\nthis.MapSys = MapSys;\nthis.EventSys = EventSys;\n', context);

    context.EventSys.start = (ev) => {
        eventStarts.push(ev && ev.name);
        context.Game.navTo('screen-event');
    };

    return { context, eventStarts, combatStarts, getEl };
}

{
    const { context, eventStarts } = loadMap();
    const node = { ev: 'vn3', name: '破庙' };
    context.State.mapNodeIndex = 4;
    context.MapSys.enterNode(node);
    context.MapSys.enterNode(node);
    assert.strictEqual(context.State.mapNodeIndex, 5,
        'double-click 破庙 must increment mapNodeIndex only once (else index 6 strands chapter 0)');
    assert.strictEqual(eventStarts.length, 1, 'double-click must start the temple event only once');
}

{
    const { context, combatStarts } = loadMap();
    context.State.mapChapter = 2;
    context.State.mapNodeIndex = 5;
    const node = { ev: 'enc_yan_luo_wang', name: '鬼门关' };
    context.MapSys.enterNode(node);
    context.MapSys.enterNode(node);
    assert.strictEqual(context.State.mapNodeIndex, 6,
        'double-click 鬼门关 must increment only once (else index 7 skips 奈何桥 and soft-locks)');
    assert.deepStrictEqual(combatStarts, ['enc_yan_luo_wang']);
}

{
    const { context, eventStarts } = loadMap();
    context.State.mapNodeIndex = 4;
    context.MapSys.enterNode({ ev: 'vn3' });
    context.Game.navTo('screen-map');
    context.MapSys.renderMap();
    context.State.mapNodeIndex = 5;
    context.MapSys.enterNode({ ev: 'village_hub_0' });
    assert.strictEqual(context.State.mapNodeIndex, 6, 'after returning to the map, the next node must still be enterable');
    assert.deepStrictEqual(eventStarts, ['vn3', 'hub0']);
}

{
    const { context, eventStarts } = loadMap();
    context.State.isViewingMap = true;
    context.State.mapNodeIndex = 4;
    context.MapSys.enterNode({ ev: 'vn3' });
    assert.strictEqual(context.State.mapNodeIndex, 4, 'settlement map preview must not consume a node');
    assert.strictEqual(eventStarts.length, 0);
}

{
    const { context, combatStarts, getEl } = loadMap();
    getEl('screen-map').classList.remove('active');
    getEl('screen-combat').classList.add('active');
    context.State.mapNodeIndex = 5;
    context.MapSys.enterNode({ ev: 'enc_yan_luo_wang' }, { force: true });
    assert.strictEqual(context.State.mapNodeIndex, 6, 'dev force entry must still work off the map screen');
    assert.deepStrictEqual(combatStarts, ['enc_yan_luo_wang']);
}

console.log('map-enter-node-lock.test.js: all assertions passed');
