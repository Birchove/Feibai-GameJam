const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const eventsSrc = fs.readFileSync(path.join(root, 'js/data/events.js'), 'utf8');

// Source contract: shop offers must exclude the equipped weapon, and the buy
// path must refuse to charge when State.weapon already matches the offer key.
{
  const pickChunk = eventsSrc.slice(
    eventsSrc.indexOf('function Village_pickOffer'),
    eventsSrc.indexOf('function Village_openShopModal')
  );
  assert.ok(
    /k\s*!==\s*State\.weapon/.test(pickChunk) || /State\.weapon\s*!==\s*k/.test(pickChunk),
    'Village_pickOffer must filter out State.weapon'
  );
}

{
  const shopChunk = eventsSrc.slice(
    eventsSrc.indexOf('function Village_openShopModal'),
    eventsSrc.indexOf('function Village_postFightRewards')
  );
  assert.ok(
    /State\.weapon\s*===\s*o\.key/.test(shopChunk),
    'Village_openShopModal must guard same-weapon purchases before charging'
  );
  const sameIdx = shopChunk.indexOf('State.weapon === o.key');
  const chargeIdx = shopChunk.indexOf('State.gold -= o.price');
  assert.ok(sameIdx >= 0 && chargeIdx >= 0, 'same-weapon guard and gold charge must both exist');
  assert.ok(sameIdx < chargeIdx, 'same-weapon guard must run before gold is deducted');
}

function makeElement(id = '') {
  return {
    id,
    style: {},
    className: 'modal',
    innerHTML: '',
    innerText: '',
    onclick: null,
    classList: {
      values: new Set(),
      add(...names) { names.forEach((name) => this.values.add(name)); },
      remove(...names) { names.forEach((name) => this.values.delete(name)); },
      contains(name) { return this.values.has(name); }
    }
  };
}

const elements = new Map();
const getElement = (id) => {
  if (!elements.has(id)) elements.set(id, makeElement(id));
  return elements.get(id);
};

const State = {
  weapon: 'xiuJian',
  gold: 100,
  relics: []
};

const WeaponDB = {
  xiuJian: { id: 'xiuJian', name: '绣剑', str: 6, def: 6 },
  xuanYuan: { id: 'xuanYuan', name: '轩辕', str: 10, def: 10 }
};

const RelicDB = {
  baguaMirror: { id: 'baguaMirror', name: '【八卦护心镜】', desc: '' }
};

const toasts = [];
const Game = {
  showToast: (msg) => { toasts.push(String(msg)); },
  getWeaponLabel: (key) => (WeaponDB[key] ? WeaponDB[key].name : String(key || '')),
  tryAcquireWeapon: (nextKey, onDone) => {
    // Mirror production same-weapon path: toast + onDone(true) without changing State.
    if (State.weapon === nextKey) {
      Game.showToast(`已佩同一把神兵：${Game.getWeaponLabel(nextKey)}`);
      if (typeof onDone === 'function') onDone(true);
      return;
    }
    State.weapon = nextKey;
    if (typeof onDone === 'function') onDone(true);
  }
};

const context = {
  console,
  setTimeout() {},
  document: {
    createElement: () => makeElement(),
    body: { appendChild() {} },
    querySelectorAll(selector) {
      if (selector !== '.modal') return [];
      return Array.from(elements.values());
    }
  },
  $: getElement,
  rand: (a, b) => a, // deterministic: always pick first eligible key
  State,
  WeaponDB,
  RelicDB,
  Game,
  MapSys: { afterVillageChapter() {} },
  Combat: { heal() {} }
};

vm.createContext(context);
vm.runInContext(eventsSrc, context, { filename: 'js/data/events.js' });

const Village_pickOffer = vm.runInContext('Village_pickOffer', context);
const Village_openShopModal = vm.runInContext('Village_openShopModal', context);

// Offer must never include the equipped 绣剑 when both weapons exist.
const offer = Village_pickOffer();
const weaponOffers = offer.filter((o) => o.type === 'weapon');
assert.strictEqual(weaponOffers.length, 1, 'exactly one weapon offer expected');
assert.strictEqual(weaponOffers[0].key, 'xuanYuan', 'shop must offer the other weapon, not 绣剑');

// Defensive buy path: even if a stale same-weapon offer is clicked, gold stays put.
State.gold = 100;
State.weapon = 'xiuJian';
toasts.length = 0;
const doneFlags = [];
Village_openShopModal(() => doneFlags.push('done'));

const buyBtn = getElement('vshop-buy-0');
assert.ok(buyBtn.onclick, 'weapon buy handler must be wired');

// Simulate a stale same-weapon offer: weapon already matches the listed key.
const offeredKey = weaponOffers[0].key;
State.weapon = offeredKey;
State.gold = 100;
buyBtn.onclick({ stopPropagation() {} });
assert.strictEqual(State.gold, 100, 'must not charge gold for already-equipped weapon');
assert.strictEqual(doneFlags.length, 0, 'shop must stay open on same-weapon refusal');
assert.ok(toasts.some((t) => t.includes('同一把')), 'player must be told the weapon is already equipped');

// Legitimate purchase of a different weapon still charges and closes.
State.weapon = 'xiuJian';
State.gold = 100;
toasts.length = 0;
doneFlags.length = 0;
elements.clear();
Village_openShopModal(() => doneFlags.push('done'));
const buyOther = getElement('vshop-buy-0');
buyOther.onclick({ stopPropagation() {} });
assert.strictEqual(State.weapon, 'xuanYuan', 'buying the other weapon equips it');
assert.ok(State.gold < 100, 'legitimate purchase must deduct gold');
assert.deepStrictEqual(doneFlags, ['done'], 'shop closes after a real purchase');

console.log('village shop weapon charge tests passed');
