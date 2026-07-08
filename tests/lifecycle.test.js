const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const timers = [];
const elements = new Map();

function makeClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      const shouldAdd = force === undefined ? !classes.has(name) : !!force;
      if (shouldAdd) classes.add(name);
      else classes.delete(name);
      return shouldAdd;
    }
  };
}

function makeElement(id = '') {
  return {
    id,
    style: {},
    dataset: {},
    hidden: false,
    innerText: '',
    innerHTML: '',
    className: '',
    classList: makeClassList(),
    parentNode: null,
    children: [],
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentNode = null;
    },
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    play: () => Promise.resolve(),
    pause() {}
  };
}

function el(id) {
  if (!elements.has(id)) elements.set(id, makeElement(id));
  return elements.get(id);
}

const context = {
  console,
  setTimeout: (fn, delay = 0) => {
    timers.push({ fn, delay });
    return timers.length;
  },
  clearTimeout: () => {},
  document: {
    body: makeElement('body'),
    getElementById: el,
    createElement: (tag) => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    querySelector: () => null,
    querySelectorAll: () => []
  },
  AudioSys: {
    playBGMTrack() {},
    stopBGM() {},
    playSFX() {}
  },
  Settlement: {
    shows: [],
    show(tier) {
      this.shows.push(tier);
    }
  }
};
context.globalThis = context;

const source = [
  'js/core/utils.js',
  'js/core/state.js',
  'js/systems/game.js',
  'js/systems/combat.js'
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n') +
  '\nglobalThis.__exports = { State, Game, Combat };';

vm.createContext(context);
vm.runInContext(source, context, { filename: 'game-lifecycle.js' });

const { State, Game, Combat } = context.__exports;
const navCalls = [];
Game.refreshMainMenuCTA = () => {};
Game.navTo = (screenId) => { navCalls.push(screenId); };
Game.showToast = () => {};
Game.updateUI = () => {};

function runAllTimers() {
  while (timers.length > 0) {
    const pending = timers.splice(0, timers.length);
    pending.forEach((timer) => timer.fn());
  }
}

function resetTimerQueue() {
  timers.splice(0, timers.length);
}

function setupCombat({ runId, combatId, hp = 10, enemies = [] }) {
  State._runId = runId;
  State._hasJourneyCheckpoint = true;
  State.hp = hp;
  State.relics = [];
  State.combat.inCombat = true;
  State.combat._runId = runId;
  State.combat._combatId = combatId;
  State.combat.enemies = enemies;
  State.combat.lastRewardTier = 'elite';
  State.combat.qibuPoetryId = null;
  State.combat._pendingPZChoice = false;
}

setupCombat({ runId: 10, combatId: 3, enemies: [] });
Combat.checkDeath();
Game.clearJourneyCheckpoint();
State._hasJourneyCheckpoint = true;
runAllTimers();
assert.deepStrictEqual(context.Settlement.shows, [], 'stale victory callback must not show settlement in a new journey');

resetTimerQueue();
context.Settlement.shows = [];
setupCombat({ runId: 20, combatId: 5, enemies: [] });
Combat.checkDeath();
runAllTimers();
assert.deepStrictEqual(context.Settlement.shows, ['elite'], 'active victory callback should still show settlement');

resetTimerQueue();
navCalls.splice(0, navCalls.length);
setupCombat({ runId: 30, combatId: 8, hp: 0, enemies: [{ hp: 1 }] });
Combat.checkDeath();
State._runId = 31;
State._hasJourneyCheckpoint = true;
runAllTimers();
assert(!navCalls.includes('screen-main'), 'stale death callback must not return a new journey to main');

resetTimerQueue();
let effectCount = 0;
context.CardDB = {
  test_card: {
    id: 'test_card',
    name: 'Test Card',
    cost: 1,
    type: 'ping',
    typeClass: 'type-ping',
    cardType: 'test',
    effect: () => { effectCount += 1; }
  }
};
Combat.renderHand = () => {};
Combat.renderPZ = () => {};
Combat.checkPoetryTrigger = () => {};
let pickPZ;
Combat.openPZChoiceModal = (onPick) => { pickPZ = onPick; };
setupCombat({ runId: 40, combatId: 9, enemies: [{ hp: 1 }] });
State.energy = 1;
State.combat.isPlayerTurn = true;
State.combat.player.ignorePZ = true;
State.combat.hand = ['test_card'];
State.combat.discardPile = [];
State.combat.pzHistory = [];

Combat.playCard(0);
assert.strictEqual(State.combat._pendingPZChoice, true, 'PZ modal should mark a pending choice');
assert.strictEqual(State.energy, 0, 'pending PZ card should be paid for immediately');
assert.deepStrictEqual(State.combat.hand, [], 'pending PZ card should leave the hand immediately');
assert.deepStrictEqual(State.combat.discardPile, ['test_card'], 'pending PZ card should be committed to discard');
assert.strictEqual(effectCount, 0, 'pending PZ card effect should wait for the PZ choice');

Combat.endTurn();
assert.strictEqual(State.combat.isPlayerTurn, true, 'end turn should be blocked while PZ choice is pending');

pickPZ('ze');
assert.strictEqual(State.combat._pendingPZChoice, false, 'PZ choice should clear the pending marker');
assert.deepStrictEqual(State.combat.pzHistory, ['ze'], 'chosen PZ value should be recorded');
assert.strictEqual(effectCount, 1, 'card effect should resolve exactly once after PZ choice');

console.log('lifecycle tests passed');
