const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function makeElement(id = '') {
  const classes = new Set();
  const el = {
    id,
    style: {},
    dataset: {},
    children: [],
    parentNode: null,
    innerText: '',
    innerHTML: '',
    className: '',
    hidden: false,
    onclick: null,
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
      return child;
    },
    removeChild(child) {
      el.children = el.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    remove() {
      if (el.parentNode) el.parentNode.removeChild(el);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute(name, value) {
      el[name] = value;
    },
    removeAttribute(name) {
      delete el[name];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };
    },
    classList: {
      add(...names) {
        names.forEach((name) => classes.add(name));
        el.className = Array.from(classes).join(' ');
      },
      remove(...names) {
        names.forEach((name) => classes.delete(name));
        el.className = Array.from(classes).join(' ');
      },
      contains(name) {
        return classes.has(name);
      },
      toggle(name, force) {
        if (force === true || (force === undefined && !classes.has(name))) {
          classes.add(name);
          el.className = Array.from(classes).join(' ');
          return true;
        }
        classes.delete(name);
        el.className = Array.from(classes).join(' ');
        return false;
      }
    }
  };
  return el;
}

function makeHarness() {
  const timers = [];
  const elements = new Map();
  const screenIds = ['screen-main', 'screen-map', 'screen-event', 'screen-combat', 'screen-settlement'];

  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  screenIds.forEach((id) => getElementById(id).classList.add('screen'));
  getElementById('screen-main').classList.add('active');
  getElementById('toast');
  getElementById('main-journey-btn');
  getElementById('map-return-btn');

  const document = {
    body: makeElement('body'),
    getElementById,
    createElement: (tag) => makeElement(tag),
    createElementNS: (_ns, tag) => makeElement(tag),
    querySelectorAll(selector) {
      if (selector === '.screen') return screenIds.map(getElementById);
      if (selector === '.modal') return Array.from(elements.values()).filter((el) => el.classList.contains('modal'));
      return [];
    },
    querySelector(selector) {
      if (selector === '.screen.active') {
        return screenIds.map(getElementById).find((el) => el.classList.contains('active')) || null;
      }
      if (selector === '.class-center') return getElementById('class-center');
      return null;
    }
  };

  const context = {
    console,
    document,
    window: {},
    setTimeout(fn, delay) {
      timers.push({ fn, delay });
      return timers.length;
    },
    clearTimeout() {},
    AudioSys: {
      playBGMTrack() {},
      stopBGM() {},
      playSFX() {}
    },
    $: getElementById,
    bindKeywordTooltips() {},
    hideKeywordTooltip() {}
  };
  vm.createContext(context);

  const runFile = (relativePath, exportName) => {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    vm.runInContext(`${source}\nthis.${exportName} = ${exportName};`, context, { filename: relativePath });
  };

  runFile('js/core/state.js', 'State');
  runFile('js/systems/game.js', 'Game');
  runFile('js/systems/combat.js', 'Combat');

  const runTimers = () => {
    const pending = timers.splice(0, timers.length);
    pending.forEach((timer) => timer.fn());
  };

  return { context, State: context.State, Game: context.Game, Combat: context.Combat, runTimers };
}

function setupCombat(State) {
  State._runId = 1;
  State._combatId = 1;
  State._hasJourneyCheckpoint = true;
  State.hp = 25;
  State.maxHp = 50;
  State.relics = [];
  State.combat.inCombat = true;
  State.combat.isPlayerTurn = true;
  State.combat.hand = ['c1'];
  State.combat.drawPile = ['c2'];
  State.combat.discardPile = ['c3'];
  State.combat.exhaustPile = ['c4'];
  State.combat.enemies = [{ hp: 10, maxHp: 10 }];
  State.combat.lastRewardTier = 'normal';
  State.combat._deathHandled = false;
  State.combat._settlementPending = false;
}

{
  const { State, Game } = makeHarness();
  setupCombat(State);
  State.isViewingMap = true;
  const runId = State._runId;
  const combatId = State._combatId;

  Game.clearJourneyCheckpoint();

  assert.equal(State._runId, runId + 1);
  assert.equal(State._combatId, combatId + 1);
  assert.equal(State._hasJourneyCheckpoint, false);
  assert.equal(State._resumeScreenId, '');
  assert.equal(State.isViewingMap, false);
  assert.equal(State.combat.inCombat, false);
  assert.equal(State.combat.isPlayerTurn, false);
  assert.deepEqual(State.combat.hand, []);
  assert.deepEqual(State.combat.enemies, []);
}

{
  const { State, Game, Combat, runTimers } = makeHarness();
  setupCombat(State);
  let fired = false;

  Combat.deferInCombat(() => {
    fired = true;
    State.hp = 1;
  }, 100);
  Game.clearJourneyCheckpoint();
  State._runId = 99;
  State._combatId = 99;
  State.combat.inCombat = true;
  runTimers();

  assert.equal(fired, false);
  assert.equal(State.hp, 25);
}

{
  const { context, State, Game, Combat, runTimers } = makeHarness();
  setupCombat(State);
  State.combat.enemies = [];
  State.combat.lastRewardTier = 'elite';
  let shown = false;
  context.Settlement = { show: (tier) => { shown = tier; } };

  Combat.checkDeath();
  Game.clearJourneyCheckpoint();
  runTimers();

  assert.equal(shown, false);
}

{
  const { context, State, Combat, runTimers } = makeHarness();
  setupCombat(State);
  State.combat.enemies = [];
  let shown = null;
  context.Settlement = { show: (tier) => { shown = tier; } };

  Combat.checkDeath();
  runTimers();

  assert.equal(shown, 'normal');
}

{
  const { context, State, Combat, runTimers } = makeHarness();
  setupCombat(State);
  State.hp = 0;
  const navs = [];
  context.Game.navTo = (screenId) => navs.push(screenId);

  Combat.checkDeath();
  State._runId += 1;
  runTimers();

  assert.deepEqual(navs, []);
}

console.log('lifecycle tests passed');
