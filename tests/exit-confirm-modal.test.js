const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function makeElement(id = '') {
  const classSet = new Set();
  const el = {
    id,
    style: {},
    innerHTML: '',
    innerText: '',
    children: [],
    parentNode: null,
    onclick: null,
    classList: {
      add(...names) { names.forEach((n) => classSet.add(n)); },
      remove(...names) { names.forEach((n) => classSet.delete(n)); },
      contains(name) { return classSet.has(name); }
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      child.parentNode = null;
    },
    querySelector(sel) {
      if (!sel || sel[0] !== '#') return null;
      const want = sel.slice(1);
      const stack = [...this.children];
      while (stack.length) {
        const node = stack.shift();
        if (node.id === want) return node;
        if (node.children && node.children.length) stack.push(...node.children);
      }
      // Fallback: parse ids from innerHTML for browser-like create+innerHTML flows
      if (typeof this.innerHTML === 'string' && this.innerHTML.includes(`id="${want}"`)) {
        const btn = makeElement(want);
        btn.className = 'btn-g';
        this.appendChild(btn);
        return btn;
      }
      return null;
    },
    querySelectorAll() { return []; }
  };
  Object.defineProperty(el, 'className', {
    get() { return [...classSet].join(' '); },
    set(v) {
      classSet.clear();
      String(v || '').split(/\s+/).filter(Boolean).forEach((n) => classSet.add(n));
    }
  });
  return el;
}

function setup() {
  const elements = new Map();
  const body = makeElement('body');
  const timers = [];

  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };

  const context = {
    console,
    setTimeout(fn, delay) {
      timers.push({ fn, delay: delay || 0 });
      return timers.length;
    },
    document: {
      body,
      createElement: (tag) => makeElement(tag || ''),
      querySelectorAll(selector) {
        if (selector === '.modal') {
          const out = [];
          const walk = (node) => {
            if (node.classList && node.classList.contains('modal')) out.push(node);
            (node.children || []).forEach(walk);
          };
          walk(body);
          for (const el of elements.values()) {
            if (el.classList && el.classList.contains('modal') && !out.includes(el)) out.push(el);
          }
          return out;
        }
        if (selector === '#exit-to-main-confirm') {
          const out = [];
          const walk = (node) => {
            if (node.id === 'exit-to-main-confirm') out.push(node);
            (node.children || []).forEach(walk);
          };
          walk(body);
          return out;
        }
        if (selector === '.screen') return [];
        return [];
      },
      querySelector(selector) {
        if (selector === '.screen.active') return getEl('screen-map');
        const all = this.querySelectorAll(selector);
        return all[0] || null;
      }
    },
    $: getEl,
    hideKeywordTooltip() {},
    AudioSys: { stopBGM() {} },
    State: {
      _hasJourneyCheckpoint: false,
      _resumeScreenId: ''
    }
  };

  // Seed elements used by Game.navTo / toggleModal / exit confirm
  getEl('screen-main');
  getEl('screen-map').id = 'screen-map';
  getEl('abar');
  getEl('settings-panel').classList.add('modal');
  getEl('toast');
  getEl('pv-overlay');
  const video = getEl('pv-video');
  video.pause = () => {};
  video.currentTime = 0;
  video.onended = null;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js/systems/game.js'), 'utf8'),
    context,
    { filename: 'js/systems/game.js' }
  );
  const Game = vm.runInContext('Game', context);
  return { context, Game, body, getEl };
}

// 1) Opening Settings while exit-confirm is active must remove it (not leave an orphan).
{
  const { Game, body, getEl } = setup();
  Game.confirmExitToMainMenu();
  assert.ok(Game._exitConfirmModal && Game._exitConfirmModal.classList.contains('active'));
  assert.strictEqual(body.children.filter((c) => c.id === 'exit-to-main-confirm').length, 1);

  Game.toggleModal('settings-panel');
  assert.strictEqual(Game._exitConfirmModal, null, 'exit confirm must be dismissed when opening settings');
  assert.strictEqual(
    body.children.filter((c) => c.id === 'exit-to-main-confirm').length,
    0,
    'exit confirm node must be removed from DOM'
  );
  assert.ok(getEl('settings-panel').classList.contains('active'));
}

// 2) Orphaned duplicate-ID modal must not leave the visible Confirm/Cancel buttons dead.
{
  const { Game, body, context } = setup();
  const orphan = context.document.createElement('div');
  orphan.id = 'exit-to-main-confirm';
  orphan.className = 'modal';
  orphan.classList.add('modal');
  const orphanYes = makeElement('exit-main-yes');
  const orphanNo = makeElement('exit-main-no');
  let orphanClicked = false;
  orphanYes.onclick = () => { orphanClicked = true; };
  orphan.appendChild(orphanYes);
  orphan.appendChild(orphanNo);
  body.appendChild(orphan);

  // Simulate historical bug surface: global $ would resolve to the orphan.
  const oldDollar = context.$;
  context.$ = (id) => {
    if (id === 'exit-main-yes') return orphanYes;
    if (id === 'exit-main-no') return orphanNo;
    if (id === 'exit-to-main-confirm') return orphan;
    return oldDollar(id);
  };

  Game.confirmExitToMainMenu();
  assert.strictEqual(orphan.parentNode, null, 'stale exit modal must be removed');

  const live = Game._exitConfirmModal;
  assert.ok(live, 'new exit modal must be tracked');
  assert.ok(live.classList.contains('active'));
  const liveYes = live.querySelector('#exit-main-yes');
  const liveNo = live.querySelector('#exit-main-no');
  assert.ok(liveYes && typeof liveYes.onclick === 'function', 'visible confirm must be wired on the live modal');
  assert.ok(liveNo && typeof liveNo.onclick === 'function', 'visible cancel must be wired on the live modal');

  liveNo.onclick({ stopPropagation() {} });
  assert.strictEqual(orphanClicked, false, 'orphan button handler must not fire');
  assert.strictEqual(Game._exitConfirmModal, null);
  assert.strictEqual(
    body.children.filter((c) => c.id === 'exit-to-main-confirm').length,
    0,
    'cancel must fully remove the live modal'
  );
}

// 3) Main-menu path clears any pending exit overlay (settings → 主菜单 after orphaning).
{
  const { Game, body, getEl } = setup();
  Game.confirmExitToMainMenu();
  // Simulate toggleModal's old behavior: strip .active without removing the node.
  Game._exitConfirmModal.classList.remove('active');
  Game._exitConfirmModal = null;
  assert.strictEqual(body.children.filter((c) => c.id === 'exit-to-main-confirm').length, 1);

  getEl('settings-panel').classList.add('active');
  Game.goMainMenuFromSettings();
  assert.strictEqual(
    body.children.filter((c) => c.id === 'exit-to-main-confirm').length,
    0,
    'goMainMenuFromSettings must sweep orphaned exit confirms'
  );
  assert.strictEqual(Game._exitConfirmModal, null);
  assert.strictEqual(getEl('screen-main').classList.contains('active'), true);
}

// 4) Confirm on the live modal still navigates to main and clears checkpoint.
{
  const { Game, context, getEl } = setup();
  context.State._hasJourneyCheckpoint = true;
  context.State._resumeScreenId = 'screen-map';
  Game.confirmExitToMainMenu();
  const liveYes = Game._exitConfirmModal.querySelector('#exit-main-yes');
  liveYes.onclick({ stopPropagation() {} });
  assert.strictEqual(context.State._hasJourneyCheckpoint, false);
  assert.strictEqual(context.State._resumeScreenId, '');
  assert.strictEqual(getEl('screen-main').classList.contains('active'), true);
  assert.strictEqual(Game._exitConfirmModal, null);
}

console.log('exit-confirm modal tests passed');
