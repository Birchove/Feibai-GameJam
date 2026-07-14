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
const junxing = getElement('junxing-modal');
const settings = getElement('settings-panel');
const pile = getElement('pile-panel');

junxing.classList.add('active');
Game.toggleModal('settings-panel');
assert.strictEqual(junxing.classList.contains('active'), true);
assert.strictEqual(settings.classList.contains('active'), false);
assert.strictEqual(getElement('toast').innerText, '请先裁定峻刑');

Game.toggleModal('pile-panel');
assert.strictEqual(junxing.classList.contains('active'), true);
assert.strictEqual(pile.classList.contains('active'), false);

junxing.classList.remove('active');
Game.toggleModal('settings-panel');
assert.strictEqual(settings.classList.contains('active'), true);

console.log('junxing modal tests passed');
