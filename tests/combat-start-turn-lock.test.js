const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const combatSrc = fs.readFileSync(path.join(root, 'js/systems/combat.js'), 'utf8');

// Source contract: Combat.start must clear isPlayerTurn before the delayed startTurn,
// so a leftover player-turn from the previous fight cannot arm 结束回合 during windup.
{
  const startChunk = combatSrc.slice(
    combatSrc.indexOf('start: (encounterId)'),
    combatSrc.indexOf('shuffle:')
  );
  const lockIdx = startChunk.indexOf('State.combat.isPlayerTurn = false');
  const startTurnIdx = startChunk.indexOf('setTimeout(Combat.startTurn');
  assert.ok(lockIdx >= 0, 'Combat.start must set isPlayerTurn = false');
  assert.ok(startTurnIdx >= 0, 'Combat.start must schedule startTurn');
  assert.ok(lockIdx < startTurnIdx, 'isPlayerTurn must be cleared before startTurn is scheduled');
  assert.ok(startChunk.includes("innerText = '准备开战'") || startChunk.includes('准备开战'),
    'Combat.start must disarm the end-turn button during windup');
  assert.ok(startChunk.includes('Combat.renderHand()'),
    'Combat.start must re-render hand so the previous fight\'s cards are not left on screen');
}

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
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    setAttribute() {},
    removeAttribute() {}
  };
}

function makeContext() {
  const elements = new Map();
  const timers = [];
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
      body: makeElement('body'),
      createElement: () => makeElement(),
      querySelectorAll: () => [],
      querySelector: () => makeElement()
    },
    window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
    $: getEl,
    hideKeywordTooltip() {},
    bindKeywordTooltips() {},
    AudioSys: { stopBGM() {}, playBGMTrack() {}, playSFX() {} },
    MapSys: { renderMap() {} },
    Settlement: { show() {} },
    Game: {
      showToast() {},
      updateUI() {},
      navTo() {},
      createCardDOM() { return makeElement('card'); }
    },
    WeaponDB: {},
    EnemyArchetypes: {
      dummy: {
        intent: () => '意图: 等待',
        act: () => {}
      }
    },
    Combat_startFromEncounter: () => ({
      enemies: [{
        arch: 'dummy',
        name: '试锋',
        hp: 40,
        maxHp: 40,
        turnCounter: 1,
        weak: 0,
        vuln: 0,
        stun: false,
        block: 0,
        str: 0,
        sprite: ''
      }],
      rewardTier: 'normal'
    })
  };

  context._timers = timers;
  context._getEl = getEl;
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

{
  const context = makeContext();
  load(context, 'js/core/state.js');
  load(context, 'js/systems/combat.js');

  const State = get(context, 'State');
  const Combat = get(context, 'Combat');
  const endBtn = context._getEl('end-turn-btn');
  const handEl = context._getEl('hand-container');

  // Simulate a previous fight that ended on the player's turn (victory / leave).
  State.deck = ['c1', 'c2'];
  State.hp = 40;
  State.maxHp = 50;
  State.energy = 1;
  State.relics = [];
  State.combat.inCombat = false;
  State.combat.isPlayerTurn = true;
  State.combat.hand = ['c1', 'c20'];
  endBtn.className = 'active';
  endBtn.innerText = '洗墨 (结束回合)';
  handEl.innerHTML = '<div class="card">stale</div>';

  Combat.start('fight1');

  assert.strictEqual(State.combat.inCombat, true, 'new fight should be in combat');
  assert.strictEqual(State.combat.isPlayerTurn, false, 'player turn must stay off until startTurn');
  assert.strictEqual(endBtn.className, '', 'end-turn button must not stay armed from last fight');
  assert.strictEqual(endBtn.innerText, '准备开战');
  assert.strictEqual(State.combat.hand.length, 0, 'hand is rebuilt on startTurn, not during windup');
  assert.strictEqual(handEl.innerHTML, '', 'stale previous-fight hand DOM must be cleared');

  const timersBeforeEndTurn = context._timers.length;
  Combat.endTurn();
  assert.strictEqual(
    context._timers.length,
    timersBeforeEndTurn,
    '结束回合 during windup must not schedule enemyTurn'
  );
  assert.strictEqual(State.combat.isPlayerTurn, false, 'endTurn during windup must be a no-op');
}

console.log('combat-start-turn-lock.test.js ok');
