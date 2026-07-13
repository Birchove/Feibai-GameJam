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
    parentNode: null,
    onclick: null,
    onended: null,
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
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
    pause() {},
    play() { return Promise.resolve(); }
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
    setTimeout(fn, delay) {
      timers.push({ fn, delay });
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
    $: getEl,
    hideKeywordTooltip() {},
    bindKeywordTooltips() {},
    AudioSys: {
      stopBGM() {},
      playBGMTrack() {},
      playSFX() {}
    },
    MapSys: {
      renderMap() {}
    },
    EventSys: {},
    Settlement: {
      show() {}
    },
    Fx: {},
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
    }
  };

  context.runAllTimers = () => {
    while (timers.length) timers.shift().fn();
  };
  context.runNextTimer = () => {
    const next = timers.shift();
    if (next) next.fn();
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

function testExitInvalidatesQueuedCombatCallbacks() {
  const context = makeContext();
  load(context, 'js/core/state.js');
  load(context, 'js/systems/game.js');

  const State = get(context, 'State');
  const Game = get(context, 'Game');

  State.hp = 50;
  State.combat.inCombat = true;
  State.combat.isPlayerTurn = false;
  State.combat.hand = ['c1'];
  State.combat.drawPile = ['c2'];
  State.combat.enemies = [{ hp: 10, maxHp: 10 }];

  Game.deferForRun(() => {
    State.hp = 0;
  }, 100, { requireCombat: true });

  Game.confirmExitToMainMenu();
  context.$('exit-main-yes').onclick({ stopPropagation() {} });
  context.runAllTimers();

  assert.strictEqual(State.hp, 50);
  assert.strictEqual(State.combat.inCombat, false);
  assert.strictEqual(State.combat.hand.length, 0);
  assert.strictEqual(State.combat.drawPile.length, 0);
  assert.strictEqual(State.combat.enemies.length, 0);
}

function testNewRunCancelsOldDelayedCardDamage() {
  const context = makeContext();
  load(context, 'js/core/state.js');
  load(context, 'js/systems/game.js');

  const State = get(context, 'State');
  const Game = get(context, 'Game');
  context.Combat = {
    dealDmg() {
      context.damageCount += 1;
    },
    dealDmgAll() {
      context.damageCount += 1;
    },
    draw() {},
    addBlock() {},
    takeDmg() {},
    _primaryTargetIdx() { return 0; },
    _livingIndices() { return [0]; },
    openCardPicker() {},
    renderHand() {}
  };
  context.damageCount = 0;
  load(context, 'js/data/cards.js');

  State.combat.inCombat = true;
  get(context, 'CardDB').c15.effect();
  assert.strictEqual(context.damageCount, 1);
  assert.strictEqual(context.timerCount(), 2);

  context.ClassDB = { sword: { name: '剑', initial: { hp: 50, maxHp: 50, str: 5, def: 5, agi: 1, wuxing: 2.5 } } };
  context.PoetryDB = { wuGouShuangXueMing: { id: 'wuGouShuangXueMing', text: '吴钩霜雪明' } };
  context.WeaponDB = { xiuJian: { id: 'xiuJian', name: '绣剑', str: 0, def: 0 } };
  Game.initGame('剑');

  // Even if a new combat has already started, old delayed hits must not land.
  State.combat.inCombat = true;
  context.runAllTimers();
  assert.strictEqual(context.damageCount, 1);
}

testExitInvalidatesQueuedCombatCallbacks();
testNewRunCancelsOldDelayedCardDamage();

console.log('lifecycle tests passed');
