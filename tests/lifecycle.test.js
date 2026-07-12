const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeClassList() {
  const names = new Set();
  return {
    add: (...items) => items.forEach((item) => names.add(item)),
    remove: (...items) => items.forEach((item) => names.delete(item)),
    contains: (item) => names.has(item),
    toggle: (item, force) => {
      const shouldAdd = force === undefined ? !names.has(item) : !!force;
      if (shouldAdd) names.add(item);
      else names.delete(item);
      return shouldAdd;
    },
    toString: () => Array.from(names).join(' ')
  };
}

function makeElement(id = '') {
  const element = {
    id,
    style: {},
    dataset: {},
    children: [],
    classList: makeClassList(),
    innerHTML: '',
    innerText: '',
    textContent: '',
    hidden: false,
    parentNode: null,
    onclick: null,
    onmouseover: null,
    onmouseout: null,
    appendChild(child) {
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    removeChild(child) {
      element.children = element.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    remove() {
      if (element.parentNode) element.parentNode.removeChild(element);
    },
    setAttribute(name, value) {
      element[name] = value;
    },
    removeAttribute(name) {
      delete element[name];
    },
    addEventListener() {},
    querySelector() {
      return makeElement();
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };
    }
  };
  return element;
}

function createHarness() {
  const elements = new Map();
  const timers = [];
  const screenIds = [
    'screen-main',
    'screen-saves',
    'screen-class',
    'screen-gallery',
    'screen-map',
    'screen-event',
    'screen-combat',
    'screen-settlement'
  ];
  const modalIds = [
    'info-panel',
    'info-detail-panel',
    'deck-panel',
    'pile-panel',
    'card-picker',
    'settings-panel',
    'kuhai-flee-modal',
    'junxing-modal',
    'village-shop-modal'
  ];

  function getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  }

  screenIds.forEach((id) => {
    const el = getElementById(id);
    el.classList.add('screen');
    if (id === 'screen-main') el.classList.add('active');
  });
  modalIds.forEach((id) => getElementById(id).classList.add('modal'));
  ['main-journey-btn', 'abar', 'toast', 'map-svg', 'map-nodes-container', 'map-return-btn',
    'event-name', 'event-options', 'event-text', 'pv-overlay', 'pv-video', 'class-enter',
    'class-icon', 'class-desc', 'pz-tracker', 'enemy-list', 'hand-container', 'draw-count',
    'discard-count', 'exhaust-count', 'end-turn-btn', 'ui-energy', 'ui-max-energy',
    'ui-momentum', 'player-hp-text', 'player-hp-fill', 'player-status-bar',
    'reward-gold-box', 'reward-gold-content', 'reward-wuxing-box', 'reward-wuxing-content',
    'reward-card-box', 'reward-card-content', 'reward-card-title', 'reward-weapon-box',
    'reward-weapon-content', 'reward-relic-box', 'reward-relic-content', 'reward-poetry-box',
    'reward-poetry-content', 'reward-qibu-box', 'reward-qibu-content'].forEach(getElementById);

  getElementById('pv-video').play = () => Promise.resolve();
  getElementById('pv-video').pause = () => {};

  const document = {
    body: makeElement('body'),
    createElement: (tag) => makeElement(tag),
    createElementNS: (ns, tag) => makeElement(tag),
    getElementById,
    querySelectorAll: (selector) => {
      if (selector === '.screen') return screenIds.map(getElementById);
      if (selector === '.modal') return modalIds.map(getElementById);
      if (selector === '.class-btn') return [makeElement('class-btn')];
      return [];
    },
    querySelector: () => makeElement()
  };

  const context = vm.createContext({
    console,
    document,
    window: {},
    setTimeout: (fn, delay) => {
      timers.push({ fn, delay });
      return timers.length;
    },
    clearTimeout: () => {},
    Audio: function Audio() {
      this.play = () => Promise.resolve();
      this.pause = () => {};
      this.currentTime = 0;
      this.loop = false;
      this.volume = 1;
    },
    Math
  });
  context.window = context;

  const scripts = [
    'js/core/utils.js',
    'js/core/state.js',
    'js/core/audio.js',
    'js/data/constants.js',
    'js/data/classes.js',
    'js/data/cards.js',
    'js/data/poetry.js',
    'js/data/items.js',
    'js/data/enemies.js',
    'js/data/events.js',
    'js/systems/game.js',
    'js/systems/combat.js',
    'js/systems/settlement.js',
    'js/systems/map.js',
    'js/systems/fx.js',
    'js/systems/dev.js'
  ];
  scripts.forEach((script) => {
    const source = fs.readFileSync(path.join(ROOT, script), 'utf8');
    vm.runInContext(source, context, { filename: script });
  });

  return {
    context,
    flushTimers() {
      while (timers.length) {
        const next = timers.shift();
        next.fn();
      }
    }
  };
}

function runIn(context, source) {
  return vm.runInContext(source, context);
}

function testStaleVictorySettlementIsIgnoredAfterNewRun() {
  const h = createHarness();
  runIn(h.context, `
    let settlementShows = 0;
    Settlement.show = () => { settlementShows += 1; };
    State._runId = 7;
    State.hp = 30;
    State.maxHp = 50;
    State.gold = 100;
    State.wuxing = 2.5;
    State.deck = ['c1'];
    State.relics = [];
    State.poetry = [];
    State.combat.inCombat = true;
    State.combat.enemies = [];
    State.combat.lastRewardTier = 'elite';
    State.combat.encounterKey = 'fight2';
    State.combat.qibuPoetryId = null;
    Combat.checkDeath();
    Game.initGame('剑');
  `);
  h.flushTimers();
  assert.strictEqual(runIn(h.context, 'settlementShows'), 0);
}

function testStaleDeathReturnIsIgnoredAfterNewRun() {
  const h = createHarness();
  runIn(h.context, `
    const navs = [];
    Game.navTo = (screenId) => { navs.push(screenId); };
    State._runId = 11;
    State.hp = 0;
    State.maxHp = 50;
    State.combat.inCombat = true;
    State.combat.enemies = [{ hp: 10, maxHp: 10 }];
    Combat.checkDeath();
    Game.initGame('剑');
  `);
  h.flushTimers();
  assert.deepStrictEqual(runIn(h.context, 'navs'), ['screen-map']);
}

testStaleVictorySettlementIsIgnoredAfterNewRun();
testStaleDeathReturnIsIgnoredAfterNewRun();

console.log('lifecycle tests passed');
