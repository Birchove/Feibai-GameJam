const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

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
    onmousedown: null,
    ontouchstart: null,
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
      if (child.id) this[`_child_${child.id}`] = child;
    },
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 40, height: 40 }; },
    getContext() {
      return {
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        clearRect() {},
        arc() {},
        fill() {}
      };
    }
  };
}

function makeContext() {
  const elements = new Map();
  const timers = [];
  const body = makeElement('body');

  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const context = {
    console,
    Math,
    Array,
    Object,
    Set,
    Map,
    Promise,
    setTimeout(fn, delay) {
      timers.push({ fn, delay: delay || 0 });
      return timers.length;
    },
    clearTimeout() {},
    document: {
      body,
      createElement: () => makeElement(),
      createElementNS: () => makeElement(),
      querySelectorAll: () => [],
      querySelector: () => makeElement()
    },
    window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
    requestAnimationFrame() { return 0; },
    $: getEl,
    hideKeywordTooltip() {},
    bindKeywordTooltips() {},
    AudioSys: {
      stopBGM() {},
      playBGMTrack() {},
      playSFX() {}
    },
    MapSys: { renderMap() {} },
    EventSys: {},
    Settlement: {
      shown: 0,
      show() { this.shown += 1; }
    },
    Fx: {},
    Game: {
      showToast() {},
      updateUI() {},
      clearJourneyCheckpoint() {},
      navTo() {},
      createCardDOM() {
        return makeElement('card');
      }
    },
    K: {
      GF: '功法',
      CS: '沉沙',
      FX: '固定',
      YY: '囿于旋风',
      JX: '镜像',
      CSH: '侧声',
      XR: '虚弱',
      YS: '易伤',
      DW: '黩武',
      BL: '保留',
      CSHOU: '持守',
      SH: '伤害',
      LBMM: '厉兵秣马'
    },
    GONGFA_CARD_IDS: new Set(['c9'])
  };

  context.runAllTimers = () => {
    while (timers.length) timers.shift().fn();
  };
  context.timerCount = () => timers.length;

  vm.createContext(context);
  return context;
}

function load(context, relPath) {
  const code = fs.readFileSync(path.join(root, relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

function get(context, name) {
  return vm.runInContext(name, context);
}

function setupCombatForVictory(context) {
  load(context, 'js/core/state.js');
  load(context, 'js/systems/combat.js');
  load(context, 'js/data/cards.js');

  const State = get(context, 'State');
  const Combat = get(context, 'Combat');

  State.hp = 1;
  State.maxHp = 50;
  State.energy = 3;
  State.str = 5;
  State.def = 0;
  State.agi = 0;
  State.momentum = 0;
  State.relics = [];
  State.combat.inCombat = true;
  State.combat.isPlayerTurn = true;
  State.combat.hand = ['c20', 'c1'];
  State.combat.drawPile = [];
  State.combat.discardPile = [];
  State.combat.exhaustPile = [];
  State.combat.enemies = [{ name: 'dead', hp: 0, maxHp: 10 }];
  State.combat.player = {
    block: 0, dmgMod: 0, cantPlay: false, cantDmg: false, weak: 0, vuln: 0,
    turnStr: 0, turnDef: 0, turnDmgMod: 0, combatStr: 0, combatDef: 0,
    wStr: 0, wDef: 0, jianBiQingYe: false, nianNuJiao: false, dmgDouble: false,
    takeDmgDouble: false, daoGuang: false, ignorePZ: false, cantDmgNextTurn: false,
    cursedNextPlayer: false, emei: false, emeiCount: 0, chunQiang: false, guRuo: false,
    _inRepeat: false, incorporealStacks: 0
  };
  State.combat.pzHistory = [];
  State.combat.lastRewardTier = 'normal';

  const hand = context.$('hand-container');
  hand.innerHTML = '<div class="stale-card">playable</div>';
  hand.children = [makeElement('stale')];

  return { State, Combat };
}

function testPostVictoryPlayCardIgnored() {
  const context = makeContext();
  const { State, Combat } = setupCombatForVictory(context);

  Combat.checkDeath();

  assert.strictEqual(State.combat.inCombat, false);
  assert.strictEqual(State.combat.isPlayerTurn, false);
  assert.strictEqual(context.$('hand-container').innerHTML, '');
  assert.strictEqual(context.$('end-turn-btn').innerText, '胜负已分');

  // Stale hand still holds 伏击; playing it must not spend the last HP after victory.
  Combat.playCard(0);

  assert.strictEqual(State.hp, 1);
  assert.strictEqual(State.combat.hand.length, 2);
  assert.strictEqual(State.energy, 3);
  assert.strictEqual(context.Settlement.shown, 0);

  context.runAllTimers();
  assert.strictEqual(context.Settlement.shown, 1);
}

function testPostVictoryEndTurnIgnored() {
  const context = makeContext();
  const { State, Combat } = setupCombatForVictory(context);
  let enemyTurnCalls = 0;
  Combat.enemyTurn = () => { enemyTurnCalls += 1; };

  Combat.checkDeath();
  Combat.endTurn();

  assert.strictEqual(enemyTurnCalls, 0);
  assert.strictEqual(State.combat.hand.length, 2);
  assert.strictEqual(context.timerCount(), 1); // only settlement delay
}

testPostVictoryPlayCardIgnored();
testPostVictoryEndTurnIgnored();

console.log('post-victory-hand-lock tests passed');
