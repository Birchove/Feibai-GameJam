const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeElement(id = '') {
  return {
    id,
    style: {},
    innerText: '',
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

const context = {
  console,
  setTimeout() {},
  document: {
    querySelectorAll(selector) {
      if (selector !== '.modal') return [];
      return Array.from(elements.values());
    }
  },
  $: getElement,
  hideKeywordTooltip() {}
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'systems', 'game.js'), 'utf8'),
  context,
  { filename: 'js/systems/game.js' }
);

const Game = vm.runInContext('Game', context);
const shop = getElement('village-shop-modal');
const settings = getElement('settings-panel');
const deck = getElement('deck-panel');
const info = getElement('info-panel');
const toast = getElement('toast');

shop.classList.add('active');
Game.toggleModal('settings-panel');
assert.strictEqual(shop.classList.contains('active'), true, 'settings must not dismiss village shop');
assert.strictEqual(settings.classList.contains('active'), false);
assert.ok(String(toast.innerText).includes('货摊'), 'toast should ask player to resolve shop');

Game.toggleModal('deck-panel');
assert.strictEqual(shop.classList.contains('active'), true, 'deck panel must not dismiss village shop');
assert.strictEqual(deck.classList.contains('active'), false);

Game.toggleModal('info-panel');
assert.strictEqual(shop.classList.contains('active'), true, 'info panel must not dismiss village shop');
assert.strictEqual(info.classList.contains('active'), false);

shop.classList.remove('active');
Game.toggleModal('settings-panel');
assert.strictEqual(settings.classList.contains('active'), true, 'settings works once shop is closed');

console.log('village shop modal tests passed');
