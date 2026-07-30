const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const calls = { junxing: 0, strike: [] };
const toasts = [];

const State = {
  combat: { turn: 1, inCombat: true },
  hp: 80
};

const Combat = {
  showJunxingModal: async () => {
    calls.junxing += 1;
  },
  yanLuowangStrikeAndJunxing: async (attacker, rawDmg) => {
    calls.strike.push({ arch: attacker.arch, rawDmg, shehunBefore: attacker.shehun, strBefore: attacker.str });
  },
  takeDmg() {},
  enemyDmgAfterShushou: (e, raw) => raw
};

const Game = {
  showToast: (msg) => { toasts.push(msg); }
};

function rand() { return 0; }

const context = {
  console,
  State,
  Combat,
  Game,
  rand,
  Math,
  EnemyArchetypes: undefined,
  EncounterDB: undefined,
  WeakArchPool: undefined,
  StrongSoloPool: undefined
};

vm.createContext(context);
const enemiesSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data/enemies.js'), 'utf8');
vm.runInContext(
  `${enemiesSrc}\n;this.__EnemyArchetypes = EnemyArchetypes;`,
  context,
  { filename: 'js/data/enemies.js' }
);

const yan = context.__EnemyArchetypes.yan_luo_wang;
assert.ok(yan && typeof yan.act === 'function', 'yan_luo_wang.act must exist');

async function runPhase(turnCounter, seed = {}) {
  const e = {
    arch: 'yan_luo_wang',
    turnCounter,
    shehun: seed.shehun || 0,
    str: seed.str || 0,
    block: seed.block || 0,
    hp: seed.hp != null ? seed.hp : 444,
    maxHp: 444,
    junxing: false
  };
  await yan.act(e);
  return e;
}

(async () => {
  // Phase 1: 摄魂 +4, must open 峻刑, then apply shehun→str/block.
  calls.junxing = 0;
  calls.strike.length = 0;
  const p1 = await runPhase(1);
  assert.strictEqual(p1.shehun, 4, 'phase 1 should gain 4 摄魂');
  assert.strictEqual(calls.junxing, 1, 'phase 1 must trigger showJunxingModal');
  assert.strictEqual(calls.strike.length, 0, 'phase 1 should not strike');
  assert.strictEqual(p1.str, 4, 'phase 1 should add shehun to str after act');
  assert.strictEqual(p1.block, 8, 'phase 1 should add 2*shehun block after act');
  assert.strictEqual(p1.junxing, true);

  // Phase 2: strike+峻刑, then still apply existing shehun scaling (no early return).
  calls.junxing = 0;
  calls.strike.length = 0;
  const p2 = await runPhase(2, { shehun: 4, str: 4, block: 8 });
  assert.strictEqual(calls.strike.length, 1, 'phase 2 must call yanLuowangStrikeAndJunxing');
  assert.strictEqual(calls.strike[0].rawDmg, 48, 'phase 2 attack uses 44 + str');
  assert.strictEqual(p2.shehun, 4, 'phase 2 does not change shehun stacks');
  assert.strictEqual(p2.str, 8, 'phase 2 must still apply shehun→str after strike');
  assert.strictEqual(p2.block, 16, 'phase 2 must still apply 2*shehun block after strike');

  // Phase 3: same post-strike scaling contract.
  calls.strike.length = 0;
  const p3 = await runPhase(3, { shehun: 4, str: 8, block: 16 });
  assert.strictEqual(calls.strike.length, 1, 'phase 3 must call yanLuowangStrikeAndJunxing');
  assert.strictEqual(calls.strike[0].rawDmg, 19, 'phase 3 attack uses 11 + str');
  assert.strictEqual(p3.str, 12, 'phase 3 must still apply shehun→str after strike');
  assert.strictEqual(p3.block, 24, 'phase 3 must still apply 2*shehun block after strike');

  // Source-level guard: act must not early-return the strike promise.
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'data/enemies.js'), 'utf8');
  const actMatch = src.match(/yan_luo_wang:\s*\{[\s\S]*?act:\s*async\s*\(e\)\s*=>\s*\{[\s\S]*?\n\s*\}\n\s*\},/);
  assert.ok(actMatch, 'expected async yan_luo_wang.act');
  assert.ok(!/return\s+Combat\.yanLuowangStrikeAndJunxing/.test(actMatch[0]),
    'yan_luo_wang.act must not early-return yanLuowangStrikeAndJunxing');
  assert.ok(/await\s+Combat\.showJunxingModal/.test(actMatch[0]),
    'phase 1 must await showJunxingModal');

  console.log('yanluo act tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
