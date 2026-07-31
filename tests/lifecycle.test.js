const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const timers = [];

function makeElement(id = '') {
    const el = {
        id,
        className: '',
        style: {},
        children: [],
        parentNode: null,
        dataset: {},
        innerText: '',
        innerHTML: '',
        onclick: null,
        classList: {
            add: (...names) => {
                const classes = new Set(el.className.split(/\s+/).filter(Boolean));
                names.forEach((name) => classes.add(name));
                el.className = Array.from(classes).join(' ');
            },
            remove: (...names) => {
                const remove = new Set(names);
                el.className = el.className.split(/\s+/).filter((name) => name && !remove.has(name)).join(' ');
            },
            contains: (name) => el.className.split(/\s+/).includes(name)
        },
        appendChild: (child) => {
            child.parentNode = el;
            el.children.push(child);
            return child;
        },
        removeChild: (child) => {
            el.children = el.children.filter((c) => c !== child);
            child.parentNode = null;
        },
        remove: () => {
            if (el.parentNode) el.parentNode.removeChild(el);
        },
        querySelectorAll: () => [],
        querySelector: () => null,
        setAttribute: () => {},
        removeAttribute: () => {},
        addEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
    };
    return el;
}

const elements = new Map();
function getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
}

const documentStub = {
    body: makeElement('body'),
    getElementById,
    createElement: (tag) => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    querySelectorAll: (selector) => {
        if (selector === '.screen' || selector === '.modal') {
            return Array.from(elements.values()).filter((el) => el.classList.contains(selector.slice(1)));
        }
        return [];
    },
    querySelector: () => null
};

const context = vm.createContext({
    console,
    document: documentStub,
    setTimeout: (fn, ms) => {
        timers.push({ fn, ms });
        return timers.length;
    },
    clearTimeout: () => {},
    AudioSys: {
        playBGMTrack: () => {},
        stopBGM: () => {},
        playSFX: () => {}
    },
    ClassDB: {
        sword: {
            name: '剑',
            initial: { hp: 50, maxHp: 50, str: 5, def: 5, agi: 1, wuxing: 2.5 }
        }
    },
    PoetryDB: {
        wuGouShuangXueMing: { id: 'wuGouShuangXueMing', text: '吴钩霜雪明' }
    },
    WeaponDB: {
        xiuJian: { id: 'xiuJian', name: '绣剑', str: 1, def: 1 }
    },
    MapChapters: [[]],
    Combat_startFromEncounter: () => null,
    hideKeywordTooltip: () => {},
    bindKeywordTooltips: () => {}
});

function loadScript(file, expose) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    const suffix = expose.map((name) => `globalThis.${name} = ${name};`).join('\n');
    vm.runInContext(`${code}\n${suffix}`, context, { filename: file });
}

loadScript('js/core/utils.js', ['$', 'rand', 'hideKeywordTooltip', 'bindKeywordTooltips']);
loadScript('js/core/state.js', ['State']);
loadScript('js/systems/game.js', ['Game']);
loadScript('js/systems/combat.js', ['Combat']);
loadScript('js/systems/settlement.js', ['Settlement']);
loadScript('js/systems/map.js', ['MapSys']);

const { State, Game, Combat, Settlement, MapSys } = context;

function flushTimers() {
    while (timers.length) {
        const timer = timers.shift();
        timer.fn();
    }
}

function resetState(runId = 1) {
    timers.length = 0;
    State._runId = runId;
    State._hasJourneyCheckpoint = true;
    State._resumeScreenId = 'screen-map';
    State._qibuPoetryReward = null;
    State._villagePendingChapter = undefined;
    State._settlementFromVillageAmbush = false;
    State.isViewingMap = false;
    State.class = '剑';
    State.gold = 100;
    State.hp = 40;
    State.maxHp = 50;
    State.energy = 3;
    State.maxEnergy = 3;
    State.momentum = 0;
    State.str = 5;
    State.def = 5;
    State.agi = 1;
    State.wuxing = 2.5;
    State.weapon = '';
    State.poetry = [];
    State.deck = ['c1'];
    State.relics = [];
    State.mapNodeIndex = 0;
    State.mapChapter = 0;
    Object.assign(State.combat, {
        inCombat: false,
        _runId: runId,
        isPlayerTurn: false,
        hand: [],
        drawPile: [],
        discardPile: [],
        exhaustPile: [],
        enemies: [],
        lastRewardTier: 'normal',
        qibuPoetryId: null,
        player: { nextTurnEnergy: 0, block: 0 }
    });
    getElementById('map-return-btn').style.display = 'none';
}

resetState();

{
    resetState(10);
    const shown = [];
    Settlement.show = (tier) => shown.push(tier);
    State.combat.inCombat = true;
    State.combat._runId = 10;
    State.combat.enemies = [{ hp: 0 }];
    State.combat.lastRewardTier = 'elite';

    Combat.checkDeath();
    assert.strictEqual(State.combat.inCombat, false);

    Game.initGame('剑');
    flushTimers();

    assert.deepStrictEqual(shown, [], 'stale victory callback must not open settlement after a new run starts');
}

{
    resetState(20);
    State.isViewingMap = true;
    State.combat.inCombat = true;
    getElementById('map-return-btn').style.display = 'block';

    Game.initGame('剑');

    assert.strictEqual(State.isViewingMap, false, 'new runs must leave settlement map-preview mode');
    assert.strictEqual(getElementById('map-return-btn').style.display, 'none');
    assert.strictEqual(State.combat.inCombat, false, 'new runs must tear down stale combat state');
}

{
    resetState(30);
    const villageCalls = [];
    context.Village_postFightRewards = (chapter) => villageCalls.push(chapter);
    State._settlementFromVillageAmbush = true;
    State._villagePendingChapter = 1;

    Settlement.leave();
    Game.initGame('剑');
    flushTimers();

    assert.deepStrictEqual(villageCalls, [], 'stale village ambush reward callback must not mutate a new run');
}

{
    resetState(40);
    context.Combat_startFromEncounter = () => null;

    MapSys.enterNode({ ev: 'enc_missing' });

    assert.strictEqual(State.mapNodeIndex, 0, 'invalid encounter should not consume map progress');
    assert.strictEqual(State.combat.inCombat, false, 'invalid encounter should not leave combat active');
}

console.log('lifecycle regression tests passed');
