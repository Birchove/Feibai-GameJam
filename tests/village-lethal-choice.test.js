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
    classList: {
      _set: new Set(),
      add(...names) { names.forEach((n) => this._set.add(n)); },
      remove(...names) { names.forEach((n) => this._set.delete(n)); },
      contains(name) { return this._set.has(name); }
    },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; }
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
      querySelectorAll: () => []
    },
    $: getEl,
    rand: (a, b) => a,
    WeaponDB: {},
    RelicDB: {},
    AudioSys: {
      stopBGM() { context.bgmStopped = true; },
      playBGMTrack() {}
    },
    MapSys: {
      afterVillageChapterCalls: [],
      afterVillageChapter(marker) { this.afterVillageChapterCalls.push(marker); },
      renderMap() {}
    },
    Game: {
      updateUI() {},
      showToast() {},
      clearJourneyCheckpoint() { context.checkpointCleared = true; },
      navTo(screenId) { context.navTargets.push(screenId); },
      openDeckRemovePicker() {},
      tryAcquireWeapon() {}
    },
    Combat: {
      heal() {},
      checkDeath() {
        context.checkDeathCalls += 1;
        if (context.State.hp <= 0) {
          context.State.combat.inCombat = false;
          context.Game.showToast('胜负寻常事，洗净笔锋可重来', 4200);
          context.AudioSys.stopBGM();
          context.setTimeout(() => {
            context.Game.clearJourneyCheckpoint();
            context.Game.navTo('screen-main');
          }, 4200);
        }
      }
    },
    bgmStopped: false,
    checkpointCleared: false,
    checkDeathCalls: 0,
    navTargets: []
  };

  context.runAllTimers = () => {
    while (timers.length) timers.shift().fn();
  };

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

function loadVillageEvent(context) {
  load(context, 'js/core/state.js');
  context.State = get(context, 'State');
  load(context, 'js/data/events.js');
  return get(context, 'Events').village_hub_1;
}

function lethalChoice(hub) {
  return hub.opts.find((o) => o.text.includes('以武祓之'));
}

function testLethalVillageChoiceEndsJourney() {
  const context = makeContext();
  const hub = loadVillageEvent(context);
  const State = context.State;

  State.hp = 5;
  State.maxHp = 50;
  State.mapChapter = 1;
  State.mapNodeIndex = 4;
  State.relics = [];
  State._hasJourneyCheckpoint = true;
  State._resumeScreenId = 'screen-event';

  const keep = lethalChoice(hub).cb();
  assert.strictEqual(keep, false);
  assert.strictEqual(State.hp, 0);
  assert.ok(State.relics.includes('【红缨枪】'));
  assert.strictEqual(context.checkDeathCalls, 1);
  assert.deepStrictEqual(context.MapSys.afterVillageChapterCalls, []);

  context.runAllTimers();
  assert.strictEqual(context.checkpointCleared, true);
  assert.deepStrictEqual(context.navTargets, ['screen-main']);
  assert.strictEqual(State.mapChapter, 1);
}

function testNonLethalVillageChoiceAdvancesChapter() {
  const context = makeContext();
  const hub = loadVillageEvent(context);
  const State = context.State;

  State.hp = 20;
  State.maxHp = 50;
  State.mapChapter = 1;
  State.relics = [];

  const keep = lethalChoice(hub).cb();
  assert.strictEqual(keep, false);
  assert.strictEqual(State.hp, 14);
  assert.ok(State.relics.includes('【红缨枪】'));
  assert.strictEqual(context.checkDeathCalls, 0);
  assert.deepStrictEqual(context.MapSys.afterVillageChapterCalls, [1]);
}

testLethalVillageChoiceEndsJourney();
testNonLethalVillageChoiceAdvancesChapter();
console.log('village lethal choice tests passed');
