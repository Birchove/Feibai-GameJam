const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const combatSrc = fs.readFileSync(path.join(root, 'js/systems/combat.js'), 'utf8');
const cardsSrc = fs.readFileSync(path.join(root, 'js/data/cards.js'), 'utf8');

// Source contract: attack momentum must not rise before the card effect resolves.
{
  const playCardChunk = combatSrc.slice(
    combatSrc.indexOf('playCard:'),
    combatSrc.indexOf('openCardPicker:')
  );
  const armedIdx = playCardChunk.indexOf('_momCritArmed');
  const effectIdx = playCardChunk.indexOf('cd.effect()');
  const gainIdx = playCardChunk.indexOf('State.momentum = Math.min(10, State.momentum + 1)');
  assert.ok(armedIdx >= 0 && effectIdx >= 0 && gainIdx >= 0, 'playCard must arm/gain momentum around effect');
  assert.ok(armedIdx < effectIdx, 'crit arming must happen before cd.effect()');
  assert.ok(effectIdx < gainIdx, 'momentum gain must happen after cd.effect()');
}

{
  assert.ok(
    /dealDmgToEnemy\(4,\s*true,\s*en\)/.test(cardsSrc),
    '撩剑 must lock hits to the selected enemy object'
  );
  assert.ok(
    /dealDmgToEnemy\(-3,\s*false,\s*en\)/.test(cardsSrc),
    '双斩 must lock hits to the selected enemy object'
  );
  assert.ok(
    /dealDmgToEnemy\(0,\s*false,\s*en\)/.test(cardsSrc),
    '水调歌头 must lock hits to the selected enemy object'
  );
}

function makeElement(id = '') {
  return {
    id,
    style: {},
    className: '',
    innerHTML: '',
    dataset: {},
    onclick: null,
    classList: {
      _set: new Set(),
      add(...n) { n.forEach((x) => this._set.add(x)); },
      remove(...n) { n.forEach((x) => this._set.delete(x)); },
      contains(n) { return this._set.has(n); }
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 40, right: 40, bottom: 40 }),
    appendChild() {},
    remove() {},
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; }
  };
}

function loadCombat() {
  const timers = [];
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const State = {
    energy: 3,
    str: 0,
    agi: 0,
    hp: 50,
    momentum: 0,
    relics: [],
    combat: {
      inCombat: true,
      isPlayerTurn: true,
      hand: [],
      discardPile: [],
      exhaustPile: [],
      enemies: [],
      selectedTargetIndex: 0,
      player: {
        cantPlay: false,
        cantDmg: false,
        weak: 0,
        dmgDouble: false,
        turnStr: 0,
        turnDef: 0,
        turnDmgMod: 0,
        combatStr: 0,
        wStr: 0,
        block: 0
      },
      pzHistory: [],
      _momCritArmed: null,
      enemy: { hp: 0, maxHp: 0 }
    }
  };

  const context = {
    console,
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
    CardDB: {},
    EnemyArchetypes: new Proxy({}, { get: () => ({ intent: () => 'idle', name: 'stub' }) }),
    AudioSys: { playSFX() {}, playBGMTrack() {}, stopBGM() {} },
    Game: {
      showToast() {},
      updateUI() {},
      navTo() {},
      clearJourneyCheckpoint() {}
    },
    hideKeywordTooltip() {},
    Settlement: { show() {}, open() {} },
    MapSys: {},
    Fx: {}
  };

  vm.createContext(context);
  vm.runInContext(`${combatSrc}\n;this.__Combat = Combat;`, context, { filename: 'js/systems/combat.js' });
  const Combat = context.__Combat;
  // Keep dealDmg / remove-dead path; skip DOM-heavy render & victory side effects.
  Combat.renderEnemies = () => {};
  Combat.checkDeath = () => {};
  Combat.floatTextSlot = () => {};
  Combat.pulseEnemySlot = () => {};
  return { Combat, State, timers };
}

// Crit uses pre-play arming: filling attack at 势=9 must not crit.
{
  const { Combat, State } = loadCombat();
  State.momentum = 9;
  State.combat._momCritArmed = false; // playCard sets this when mom < 10
  State.combat.enemies = [{ name: 'A', hp: 40, maxHp: 40, block: 0, weak: 0, vuln: 0 }];
  Combat.dealDmg(10, true, 0);
  assert.strictEqual(State.combat.enemies[0].hp, 30, 'filling attack must not crit');
  assert.strictEqual(State.momentum, 9, 'momentum must stay until post-effect gain');
}

// Armed crit at 势=10 applies once, then is consumed for later hits.
{
  const { Combat, State } = loadCombat();
  State.momentum = 10;
  State.combat._momCritArmed = true;
  State.combat.enemies = [{ name: 'A', hp: 100, maxHp: 100, block: 0, weak: 0, vuln: 0 }];
  Combat.dealDmg(10, true, 0);
  assert.strictEqual(State.combat.enemies[0].hp, 85, 'armed crit should apply 1.5x once');
  assert.strictEqual(State.momentum, 0, 'crit must reset momentum');
  assert.strictEqual(State.combat._momCritArmed, false, 'armed crit must be consumed');
  Combat.dealDmg(10, true, 0);
  assert.strictEqual(State.combat.enemies[0].hp, 75, 'follow-up hit must not crit after consume');
}

// Multi-hit object lock: killing the target must not splash remaining hits.
{
  const { Combat, State } = loadCombat();
  const a = { name: 'A', hp: 4, maxHp: 4, block: 0, weak: 0, vuln: 0 };
  const b = { name: 'B', hp: 40, maxHp: 40, block: 0, weak: 0, vuln: 0 };
  State.combat.enemies = [a, b];
  State.combat.selectedTargetIndex = 0;
  State.combat._momCritArmed = false;

  Combat.dealDmgToEnemy(4, true, a);
  assert.strictEqual(State.combat.enemies.length, 1, 'dead target removed after first hit');
  assert.strictEqual(State.combat.enemies[0], b, 'survivor remains');
  assert.strictEqual(b.hp, 40, 'first hit must not touch the other enemy');

  Combat.dealDmgToEnemy(4, true, a);
  Combat.dealDmgToEnemy(4, true, a);
  assert.strictEqual(b.hp, 40, 'remaining locked hits must no-op after target dies');
}

console.log('combat-momentum-multihit.test.js: ok');
