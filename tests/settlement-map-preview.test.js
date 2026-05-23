const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...classes) => classes.forEach((cls) => values.add(cls)),
    remove: (...classes) => classes.forEach((cls) => values.delete(cls)),
    contains: (cls) => values.has(cls)
  };
}

function createElement(id, classes = []) {
  return {
    id,
    style: {},
    innerText: '',
    innerHTML: '',
    onclick: null,
    classList: createClassList(classes),
    appendChild() {},
    removeChild() {},
    querySelectorAll() { return []; }
  };
}

const screens = ['screen-main', 'screen-saves', 'screen-class', 'screen-map', 'screen-event', 'screen-combat', 'screen-settlement'];
const elements = new Map();

function ensureElement(id, classes = []) {
  if (!elements.has(id)) elements.set(id, createElement(id, classes));
  return elements.get(id);
}

screens.forEach((id) => ensureElement(id, ['screen']));
['settings-panel', 'info-panel', 'deck-panel', 'card-picker'].forEach((id) => ensureElement(id, ['modal']));
[
  'main-journey-btn',
  'map-return-btn',
  'abar',
  'pv-overlay',
  'pv-video',
  'class-enter',
  'class-icon',
  'class-desc',
  'toast'
].forEach((id) => ensureElement(id));

ensureElement('pv-video').play = () => ({ catch() {} });
ensureElement('pv-video').pause = () => {};

function setActiveScreen(id) {
  screens.forEach((screenId) => ensureElement(screenId).classList.remove('active'));
  ensureElement(id).classList.add('active');
}

const documentMock = {
  body: {
    appendChild(el) {
      if (el && el.id) elements.set(el.id, el);
      el.parentNode = this;
    },
    removeChild() {}
  },
  createElement(tag) {
    return createElement(tag);
  },
  querySelector(selector) {
    if (selector === '.screen.active') {
      return screens.map((id) => ensureElement(id)).find((el) => el.classList.contains('active')) || null;
    }
    if (selector === '.class-center') return createElement('class-center');
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.screen') return screens.map((id) => ensureElement(id));
    if (selector === '.modal') {
      return Array.from(elements.values()).filter((el) => el.classList.contains('modal'));
    }
    if (selector === '.class-btn') return [];
    return [];
  }
};

const context = vm.createContext({
  console,
  document: documentMock,
  setTimeout(fn) {
    if (typeof fn === 'function') fn();
    return 0;
  },
  $: (id) => ensureElement(id),
  hideKeywordTooltip() {},
  MapSys: {
    renderMapCalls: 0,
    renderMap() {
      this.renderMapCalls += 1;
    }
  },
  AudioSys: {
    playBGMTrackCalls: [],
    playBGMTrack(track) {
      this.playBGMTrackCalls.push(track);
    },
    stopBGM() {}
  },
  PoetryDB: { wuGouShuangXueMing: { text: 'starter' } },
  WeaponDB: { xiuJian: { name: 'starter sword', str: 1, def: 0 } },
  bindKeywordTooltips() {}
});

function loadGlobal(relativePath, globalName) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  vm.runInContext(`${source}\nglobalThis.${globalName} = ${globalName};`, context, { filename });
}

loadGlobal('js/core/state.js', 'State');
loadGlobal('js/data/classes.js', 'ClassDB');
loadGlobal('js/systems/game.js', 'Game');
loadGlobal('js/systems/settlement.js', 'Settlement');

function primePreviewState() {
  context.State.isViewingMap = true;
  context.State._hasJourneyCheckpoint = true;
  context.State._resumeScreenId = 'screen-map';
  ensureElement('map-return-btn').style.display = 'block';
  ensureElement('settings-panel').classList.add('active');
  setActiveScreen('screen-map');
}

primePreviewState();
context.Game.goMainMenuFromSettings();
assert.strictEqual(context.State.isViewingMap, false, 'main menu clears settlement map preview guard');
assert.strictEqual(ensureElement('map-return-btn').style.display, 'none', 'main menu hides settlement return button');
assert.strictEqual(context.State._resumeScreenId, 'screen-settlement', 'main menu resumes pending rewards at settlement');
assert.strictEqual(ensureElement('screen-main').classList.contains('active'), true, 'main menu navigation stays intact');

primePreviewState();
context.Game.restartJourneyFromSettings();
assert.strictEqual(context.State.isViewingMap, false, 'restart clears settlement map preview guard');
assert.strictEqual(ensureElement('map-return-btn').style.display, 'none', 'restart hides settlement return button');
assert.strictEqual(context.State._hasJourneyCheckpoint, false, 'restart drops stale journey checkpoint before class select');
assert.strictEqual(ensureElement('screen-class').classList.contains('active'), true, 'restart opens class selection');

primePreviewState();
context.Game.initGame(context.ClassDB.sword.name);
assert.strictEqual(context.State.isViewingMap, false, 'new game clears settlement map preview guard');
assert.strictEqual(ensureElement('map-return-btn').style.display, 'none', 'new game hides settlement return button');
assert.strictEqual(ensureElement('screen-map').classList.contains('active'), true, 'new game opens map');

primePreviewState();
context.State._settlementFromVillageAmbush = false;
context.State._villagePendingChapter = undefined;
context.Settlement.leave();
assert.strictEqual(context.State.isViewingMap, false, 'leaving settlement clears settlement map preview guard');
assert.strictEqual(ensureElement('map-return-btn').style.display, 'none', 'leaving settlement hides settlement return button');

console.log('settlement map preview state tests passed');
