const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
assert(scriptMatch, 'index.html should contain an inline script');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      style: {},
      className: '',
      innerHTML: '',
      innerText: '',
      dataset: {},
      appendChild() {},
      remove() {},
      getContext: () => ({
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        clearRect() {},
        arc() {},
        fill() {},
      }),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      classList: {
        add() {},
        remove() {},
        contains: () => false,
      },
    });
  }
  return elements.get(id);
}

const context = {
  console,
  Math,
  Array,
  Object,
  document: {
    body: { appendChild() {} },
    createElement: () => element(`created-${elements.size}`),
    createElementNS: () => element(`created-ns-${elements.size}`),
    getElementById: element,
    querySelectorAll: () => [],
    querySelector: () => ({ onmouseover: null, onmouseout: null }),
    onmousemove: null,
    onmouseup: null,
    ontouchmove: null,
    ontouchend: null,
  },
  window: {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener() {},
  },
  Audio: function Audio() {
    return {
      loop: false,
      volume: 0,
      currentTime: 0,
      play: () => Promise.resolve(),
      pause() {},
    };
  },
  setTimeout: (fn) => {
    fn();
    return 0;
  },
  requestAnimationFrame() {},
};
context.global = context;

vm.createContext(context);
vm.runInContext(scriptMatch[1], context, { filename: 'index.html' });

vm.runInContext(`
  let settlementShown = false;
  AudioSys.playSFX = () => {};
  Combat.floatText = () => {};
  Combat.renderHand = () => {};
  Game.updateUI = () => {};
  Settlement.show = () => { settlementShown = true; };
  State.combat.inCombat = true;
  State.combat.enemy.id = 'e1';
  State.combat.enemy.hp = 4;
  State.combat.enemy.maxHp = 80;
  State.combat.player.cantDmg = false;
  State.combat.player.weak = 0;
  State.combat.enemy.vuln = 0;
  State.combat.player.dmgDouble = false;
  State.momentum = 0;
  State.str = 0;
  Combat.dealDmg(2, true);
  if (settlementShown) throw new Error('first hit should not end combat');
  Combat.dealDmg(2, true);
  if (!settlementShown) throw new Error('delayed lethal hit should show settlement');
  if (State.combat.inCombat) throw new Error('combat should end after delayed lethal hit');
`, context);

