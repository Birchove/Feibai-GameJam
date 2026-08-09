const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const combatSrc = fs.readFileSync(path.join(root, 'js/systems/combat.js'), 'utf8');

// Source contract: playCard must resolve effect before committing the card to discard/exhaust.
{
  const playCardChunk = combatSrc.slice(
    combatSrc.indexOf('playCard:'),
    combatSrc.indexOf('openCardPicker:')
  );
  const effectIdx = playCardChunk.indexOf('cd.effect()');
  const discardIdx = playCardChunk.indexOf('State.combat.discardPile.push(cardId)');
  const exhaustIdx = playCardChunk.indexOf('State.combat.exhaustPile.push(cardId)');
  assert.ok(effectIdx >= 0, 'playCard must call cd.effect()');
  assert.ok(discardIdx >= 0 && exhaustIdx >= 0, 'playCard must still commit to discard/exhaust');
  assert.ok(effectIdx < discardIdx, 'discard commit must happen after cd.effect()');
  assert.ok(effectIdx < exhaustIdx, 'exhaust commit must happen after cd.effect()');
}

// Source contract: playAllAttacks must also delay pile commit until after effect (+ emei draw).
{
  const chunk = combatSrc.slice(
    combatSrc.indexOf('playAllAttacks:'),
    combatSrc.indexOf('dealDmgAll:')
  );
  const effectIdx = chunk.indexOf('cd.effect()');
  const discardIdx = chunk.indexOf('State.combat.discardPile.push(it.cardId)');
  assert.ok(effectIdx >= 0 && discardIdx >= 0, 'playAllAttacks must effect then discard');
  assert.ok(effectIdx < discardIdx, 'playAllAttacks discard must happen after cd.effect()');
}

// Source contract: finishPhase must bail out when combat already ended.
{
  const enemyTurnChunk = combatSrc.slice(
    combatSrc.indexOf('enemyTurn:'),
    combatSrc.indexOf('updateStatusBar:')
  );
  assert.ok(
    /if\s*\(\s*!State\.combat\s*\|\|\s*!State\.combat\.inCombat\s*\)\s*return;/.test(enemyTurnChunk),
    'finishPhase must return early when !inCombat'
  );
  const guardIdx = enemyTurnChunk.search(/if\s*\(\s*!State\.combat\s*\|\|\s*!State\.combat\.inCombat\s*\)\s*return;/);
  const deathTickIdx = enemyTurnChunk.indexOf('deathRoundsRemaining -= 1');
  assert.ok(guardIdx >= 0 && deathTickIdx >= 0 && guardIdx < deathTickIdx,
    'inCombat guard must precede 案剑 death tick');
}

function makeElement(id = '') {
  return {
    id,
    style: {},
    className: '',
    innerHTML: '',
    innerText: '',
    dataset: {},
    children: [],
    parentNode: null,
    onclick: null,
    onmousedown: null,
    ontouchstart: null,
    classList: {
      _set: new Set(),
      add(...names) { names.forEach((n) => this._set.add(n)); },
      remove(...names) { names.forEach((n) => this._set.delete(n)); },
      contains(name) { return this._set.has(name); }
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 40, height: 40 }; }
  };
}

function loadHarness() {
  const timers = [];
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const State = {
    energy: 3,
    maxEnergy: 3,
    str: 0,
    def: 0,
    agi: 0,
    hp: 40,
    maxHp: 40,
    gold: 0,
    momentum: 0,
    relics: [],
    poetry: [],
    _dev: false,
    combat: {
      inCombat: true,
      isPlayerTurn: true,
      turn: 1,
      hand: [],
      drawPile: [],
      discardPile: [],
      exhaustPile: [],
      battleConsumed: [],
      enemies: [],
      selectedTargetIndex: 0,
      pzHistory: [],
      shanjia: 0,
      battleWuPlayed: 0,
      battleZeCount: 0,
      battlePingCount: 0,
      ganShiEchoEnemyPhase: false,
      ganShiEchoEnemyStacks: 0,
      player: {
        block: 0,
        cantPlay: false,
        cantDmg: false,
        weak: 0,
        weakNextTurn: 0,
        vuln: 0,
        dmgDouble: false,
        takeDmgDouble: false,
        turnStr: 0,
        turnDef: 0,
        turnDmgMod: 0,
        combatStr: 0,
        combatDef: 0,
        wStr: 0,
        wDef: 0,
        daoGuang: false,
        ignorePZ: false,
        emei: false,
        emeiCount: 0,
        chunQiang: false,
        guRuo: false,
        _inRepeat: false,
        deathRoundsRemaining: 0,
        nextTurnEnergy: 0,
        incorporealStacks: 0
      },
      enemy: { hp: 0, maxHp: 0 }
    }
  };

  const CardDB = {
    c17: {
      id: 'c17',
      name: '斡旋',
      cost: 0,
      type: '平',
      typeClass: 'type-ping',
      desc: '抽取1张卡牌',
      rarity: 'low',
      cardType: '功卡',
      effect: () => context.Combat.draw(1)
    },
    c1: {
      id: 'c1',
      name: '填充',
      cost: 1,
      type: '平',
      typeClass: 'type-ping',
      desc: 'noop',
      rarity: 'low',
      cardType: '功卡',
      effect: () => {}
    },
    c13: {
      id: 'c13',
      name: '舞剑',
      cost: 1,
      type: '仄',
      typeClass: 'type-ze',
      isAttack: true,
      cardType: '武卡',
      effect: () => { context.Combat.draw(1); }
    }
  };

  const EnemyArchetypes = {
    stub_kill_self: {
      intent: () => '自灭',
      act: (e) => {
        e.hp = 0;
        // Mimic victory path: checkDeath clears inCombat before finishPhase.
        State.combat.inCombat = false;
      }
    },
    stub_idle: {
      intent: () => '等待',
      act: () => {}
    }
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
      createElement: () => makeElement(),
      body: makeElement('body'),
      querySelectorAll: () => []
    },
    $: getEl,
    State,
    CardDB,
    EnemyArchetypes,
    AudioSys: { playSFX() {}, playBGMTrack() {}, stopBGM() {} },
    Game: {
      showToast() {},
      updateUI() {},
      navTo() {},
      clearJourneyCheckpoint() {},
      createCardDOM() { return makeElement('card'); },
      toggleModal() {}
    },
    hideKeywordTooltip() {},
    Settlement: { show() {} },
    MapSys: { renderMap() {} },
    Fx: {},
    rand: (a, b) => a,
    bindKeywordTooltips() {},
    Combat: null
  };

  vm.createContext(context);
  vm.runInContext(`${combatSrc}\n;this.Combat = Combat;`, context, { filename: 'js/systems/combat.js' });
  const Combat = context.Combat;
  Combat.renderHand = () => {};
  Combat.renderPZ = () => {};
  Combat.renderEnemies = () => {};
  Combat.updateStatusBar = () => {};
  Combat.checkPoetryTrigger = () => {};
  Combat.refreshEnemyIntentLocks = () => {};
  return { Combat, State, CardDB, timers };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

// Runtime: empty draw pile + 斡旋 must not reshuffle itself back into hand.
{
  const { Combat, State } = loadHarness();
  State.energy = 3;
  State.combat.hand = [{ cardId: 'c17' }];
  State.combat.drawPile = [];
  State.combat.discardPile = [];
  Combat.playCard(0);
  assert.strictEqual(State.combat.hand.length, 0, '斡旋 must not redraw itself on empty piles');
  assert.deepStrictEqual(State.combat.discardPile, ['c17'], '斡旋 must land in discard after effect');
}

// Runtime: reshuffle during draw must not include the card currently resolving.
{
  const { Combat, State } = loadHarness();
  State.combat.hand = [{ cardId: 'c17' }];
  State.combat.drawPile = [];
  State.combat.discardPile = ['c1', 'c1', 'c1'];
  Combat.playCard(0);
  assert.ok(!State.combat.hand.some((h) => Combat.normalizeHandItem(h).cardId === 'c17'),
    '斡旋 must not re-enter hand from its own reshuffle');
  assert.ok(State.combat.discardPile.includes('c17'), '斡旋 still discarded after draw');
  assert.strictEqual(State.combat.hand.length, 1, 'draw still pulls one filler card');
}

// Runtime: mid-enemy-turn victory must not tick 案剑 into a wiped run.
(async () => {
  const { Combat, State, timers } = loadHarness();
  State.hp = 30;
  State.combat.inCombat = true;
  State.combat.player.deathRoundsRemaining = 1;
  State.combat.enemies = [{
    arch: 'stub_kill_self',
    name: '影',
    hp: 1,
    maxHp: 1,
    turnCounter: 1,
    stun: false
  }];

  Combat.enemyTurn();
  await flushMicrotasks();

  assert.strictEqual(State.combat.inCombat, false, 'victory path leaves combat');
  assert.strictEqual(State.hp, 30, '案剑 must not zero HP after a won fight');
  assert.strictEqual(State.combat.player.deathRoundsRemaining, 1,
    '案剑 timer must not tick once combat already ended');
  assert.strictEqual(timers.length, 0, 'must not schedule startTurn after victory');

  console.log('combat-discard-and-anjian.test.js: ok');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
