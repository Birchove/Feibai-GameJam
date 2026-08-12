const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const settlementSrc = fs.readFileSync(path.join(root, 'js/systems/settlement.js'), 'utf8');

// Source contract: Settlement.show must grant qibu poetry into State.poetry before render/nav,
// so leaving without clicking 领取犒赏 cannot drop the guaranteed 七步成诗 reward.
{
  const showChunk = settlementSrc.slice(
    settlementSrc.indexOf('show: (rewardTier)'),
    settlementSrc.indexOf('render: ()')
  );
  const clearIdx = showChunk.indexOf('State._qibuPoetryReward = null');
  const grantIdx = showChunk.indexOf('State.poetry.push(pid)');
  const renderIdx = showChunk.indexOf('Settlement.render()');
  assert.ok(clearIdx >= 0, 'show must clear _qibuPoetryReward after reading');
  assert.ok(grantIdx >= 0, 'show must push qibu poetry into State.poetry');
  assert.ok(renderIdx >= 0 && grantIdx < renderIdx, 'qibu grant must happen before Settlement.render()');
}

// Source contract: qibu reward box is display-only (alreadyClaimed), not claim-gated.
{
  assert.ok(
    /createBox\(\s*'qibu'[\s\S]*alreadyClaimed\s*:\s*!!r\.qibuPoetry/.test(settlementSrc),
    'qibu createBox must use alreadyClaimed when poetry exists'
  );
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
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function loadSettlement() {
  const elements = new Map();
  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  // Minimal reward box DOM expected by createBox / render
  [
    'reward-gold-box', 'reward-gold-content',
    'reward-wuxing-box', 'reward-wuxing-content',
    'reward-card-box', 'reward-card-content', 'reward-card-title',
    'reward-weapon-box', 'reward-weapon-content',
    'reward-relic-box', 'reward-relic-content',
    'reward-poetry-box', 'reward-poetry-content',
    'reward-qibu-box', 'reward-qibu-content',
    'screen-settlement', 'screen-map', 'map-return-btn'
  ].forEach(getEl);

  const State = {
    gold: 0,
    wuxing: 2.5,
    poetry: ['wuGouShuangXueMing'],
    relics: [],
    deck: [],
    weapon: '',
    _qibuPoetryReward: 'ganShi',
    combat: { encounterKey: 'enc_fight1' },
    isViewingMap: false
  };

  const PoetryDB = {
    wuGouShuangXueMing: { id: 'wuGouShuangXueMing', text: '无垢霜雪明' },
    ganShi: { id: 'ganShi', text: '感时花溅泪' }
  };

  const CardDB = {
    c1: { id: 'c1', name: '填充', rarity: 'low', type: '平', typeClass: 'type-ping', desc: '', cardType: '功卡', cost: 1 }
  };

  const Items = {
    randomWeapon: () => null,
    randomRelic: () => null,
    randomPoetry: () => null
  };

  const ItemPools = { eliteRelics: [], poetry: ['ganShi', 'wuGouShuangXueMing'] };

  const context = {
    console,
    Math,
    Array,
    Object,
    Set,
    Map,
    document: {
      createElement: () => makeElement(),
      body: makeElement('body')
    },
    $: getEl,
    State,
    PoetryDB,
    CardDB,
    Items,
    ItemPools,
    Game: {
      showToast() {},
      updateInfoPanel() {},
      navTo() {},
      createCardDOM() { return makeElement('card'); },
      tryAcquireWeapon(_k, done) { if (typeof done === 'function') done(true); }
    },
    MapSys: { renderMap() {} },
    rand: (a, b) => a,
    Village_postFightRewards() {}
  };

  vm.runInNewContext(settlementSrc + '\nthis.Settlement = Settlement;', context);
  return { Settlement: context.Settlement, State, getEl };
}

{
  const { Settlement, State, getEl } = loadSettlement();
  Settlement.show('normal');

  assert.ok(State.poetry.includes('ganShi'), 'qibu poetry must be in State.poetry after Settlement.show');
  assert.strictEqual(State._qibuPoetryReward, null, '_qibuPoetryReward must be cleared');

  const qibuBox = getEl('reward-qibu-box');
  assert.ok(qibuBox.classList.contains('claimed'), 'qibu box should be marked claimed (no claim required)');

  // Leaving without claiming must not drop the poem.
  Settlement.leave();
  assert.ok(State.poetry.includes('ganShi'), 'leave without claim must retain qibu poetry');
}

console.log('settlement-qibu-poetry.test.js: ok');
