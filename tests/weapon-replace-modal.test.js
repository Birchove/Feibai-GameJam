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
        if (selector === '#weapon-replace-modal-temp') {
          const out = [];
          const walk = (node) => {
            if (node.id === 'weapon-replace-modal-temp') out.push(node);
            (node.children || []).forEach(walk);
          };
          walk(body);
          return out;
        }
        return [];
      },
      querySelector(selector) {
        const all = this.querySelectorAll(selector);
        return all[0] || null;
      }
    },
    $: getEl,
    hideKeywordTooltip() {},
    WeaponDB: {
      xiuJian: { id: 'xiuJian', name: '绣剑', str: 6, def: 6 },
      xuanYuan: { id: 'xuanYuan', name: '轩辕', str: 10, def: 10 }
    },
    State: {
      _hasJourneyCheckpoint: false,
      _resumeScreenId: '',
      weapon: 'xiuJian'
    }
  };

  context.flushTimers = () => {
    while (timers.length) timers.shift().fn();
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js/systems/game.js'), 'utf8'),
    context,
    { filename: 'js/systems/game.js' }
  );
  const Game = vm.runInContext('Game', context);
  return { context, Game, body, getEl };
}

// 1) Settings/Deck must not dismiss an active weapon-replace prompt.
{
  const { Game, getEl } = setup();
  const decisions = [];
  Game.promptWeaponReplace('xiuJian', 'xuanYuan', (ok) => decisions.push(ok));
  assert.ok(Game._weaponReplaceModal && Game._weaponReplaceModal.classList.contains('active'));

  Game.toggleModal('settings-panel');
  assert.strictEqual(Game._weaponReplaceModal.classList.contains('active'), true, 'settings must not hide replace prompt');
  assert.strictEqual(getEl('settings-panel').classList.contains('active'), false);
  assert.ok(String(getEl('toast').innerText).includes('换兵'));

  Game.toggleModal('deck-panel');
  assert.strictEqual(Game._weaponReplaceModal.classList.contains('active'), true, 'deck must not hide replace prompt');
  assert.strictEqual(getEl('deck-panel').classList.contains('active'), false);
  assert.deepStrictEqual(decisions, [], 'decision must stay pending while guarded');
}

// 2) Orphaned duplicate-ID modal must not leave the visible prompt's buttons dead.
{
  const { Game, body, context } = setup();
  const orphan = context.document.createElement('div');
  orphan.id = 'weapon-replace-modal-temp';
  orphan.className = 'modal';
  orphan.classList.add('modal'); // for querySelectorAll('.modal') walks
  const orphanConfirm = makeElement('weapon-replace-confirm');
  const orphanCancel = makeElement('weapon-replace-cancel');
  let orphanClicked = false;
  orphanConfirm.onclick = () => { orphanClicked = true; };
  orphan.appendChild(orphanConfirm);
  orphan.appendChild(orphanCancel);
  body.appendChild(orphan);

  // Simulate historical bug surface: global $ would resolve to the orphan.
  const oldDollar = context.$;
  context.$ = (id) => {
    if (id === 'weapon-replace-confirm') return orphanConfirm;
    if (id === 'weapon-replace-cancel') return orphanCancel;
    if (id === 'weapon-replace-modal-temp') return orphan;
    return oldDollar(id);
  };

  const decisions = [];
  Game.promptWeaponReplace('xiuJian', 'xuanYuan', (ok) => decisions.push(ok));
  assert.strictEqual(orphan.parentNode, null, 'stale replace modal must be removed');

  const live = Game._weaponReplaceModal;
  assert.ok(live, 'new replace modal must be tracked');
  assert.ok(live.classList.contains('active'));
  const liveConfirm = live.querySelector('#weapon-replace-confirm');
  assert.ok(liveConfirm && typeof liveConfirm.onclick === 'function', 'visible confirm must be wired on the live modal');

  liveConfirm.onclick({ stopPropagation() {} });
  assert.deepStrictEqual(decisions, [true], 'confirm on the live modal must resolve the pending prompt');
  assert.strictEqual(orphanClicked, false, 'orphan button handler must not be the one that fires');
  assert.strictEqual(Game._weaponReplaceModal, null);
  assert.strictEqual(context.State.weapon, 'xiuJian', 'prompt alone must not equip; caller decides');
}

// 3) Explicit dismiss resolves false and clears pending state (menu exit path).
{
  const { Game, context } = setup();
  const decisions = [];
  Game.promptWeaponReplace('xiuJian', 'xuanYuan', (ok) => decisions.push(ok));
  Game.goMainMenuFromSettings();
  assert.deepStrictEqual(decisions, [false]);
  assert.strictEqual(Game._weaponReplaceModal, null);
  assert.strictEqual(Game._weaponReplaceOnDecision, null);
  assert.strictEqual(context.State._hasJourneyCheckpoint, false);
}

console.log('weapon-replace modal tests passed');
