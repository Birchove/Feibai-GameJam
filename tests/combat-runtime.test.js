const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function makeElement() {
  const classes = new Set();
  return {
    style: {},
    innerText: '',
    innerHTML: '',
    hidden: false,
    parentNode: null,
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !classes.has(name) : !!force;
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
      }
    },
    setAttribute() {},
    removeAttribute() {},
    appendChild(child) {
      child.parentNode = this;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
  };
}

function loadRuntime() {
  const elements = new Map();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Math,
    AudioSys: { playSFX() {}, playBGMTrack() {}, stopBGM() {} },
    MapSys: { renderMap() {} },
    Settlement: { show() {} },
    hideKeywordTooltip() {},
    bindKeywordTooltips() {},
    $: (id) => {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    document: {
      querySelectorAll: () => [],
      querySelector: () => makeElement(),
      createElement: () => makeElement(),
      body: makeElement()
    }
  };
  vm.createContext(context);

  for (const [file, globalName] of [
    ['js/core/state.js', 'State'],
    ['js/systems/game.js', 'Game'],
    ['js/systems/combat.js', 'Combat']
  ]) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(`${code}\nglobalThis.${globalName} = ${globalName};`, context, { filename: file });
  }

  return context;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('resetJourneyRuntime invalidates delayed combat callbacks', async () => {
  const ctx = loadRuntime();
  ctx.State.combat.inCombat = true;
  ctx.State.combat._runId = 12;
  ctx.State.combat.hand = ['c1'];
  ctx.State.combat.drawPile = ['c2'];
  ctx.State.combat.enemies = [{ hp: 10 }];

  let ran = false;
  ctx.Combat.defer(() => {
    ran = true;
  }, 0);

  ctx.Game.resetJourneyRuntime();
  await wait(10);

  assert.equal(ran, false);
  assert.equal(ctx.State.combat._runId, 13);
  assert.equal(ctx.State.combat.inCombat, false);
  assert.deepEqual(ctx.State.combat.hand, []);
  assert.deepEqual(ctx.State.combat.drawPile, []);
  assert.deepEqual(ctx.State.combat.enemies, []);
});

test('startTurn ignores stale run ids', () => {
  const ctx = loadRuntime();
  ctx.State.combat._runId = 4;
  ctx.State.combat.inCombat = true;
  ctx.State.energy = 99;
  ctx.State.combat.player.nextTurnEnergy = 5;

  ctx.Combat.startTurn(3);

  assert.equal(ctx.State.energy, 99);
  assert.equal(ctx.State.combat.player.nextTurnEnergy, 5);
});
