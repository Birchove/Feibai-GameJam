const assert = require('assert');
const fs = require('fs');
const path = require('path');

const combatSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'systems', 'combat.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'state.js'), 'utf8');

assert.ok(
  /State\.combat\.isPlayerTurn\s*=\s*false/.test(combatSrc),
  'Combat.start must clear isPlayerTurn before the delayed first startTurn'
);

const startFn = combatSrc.match(/start:\s*\(encounterId\)\s*=>\s*\{[\s\S]*?setTimeout\(Combat\.startTurn,\s*1000\);\s*\}/);
assert.ok(startFn, 'expected Combat.start implementation');
assert.ok(
  startFn[0].includes('State.combat.isPlayerTurn = false'),
  'isPlayerTurn=false must happen inside Combat.start before scheduling startTurn'
);
assert.ok(
  /end-turn-btn[\s\S]*战端初起/.test(startFn[0]) || /战端初起[\s\S]*end-turn-btn/.test(startFn[0]) || startFn[0].includes('战端初起'),
  'Combat.start should reset end-turn button until the first player turn begins'
);

assert.ok(
  /isPlayerTurn:\s*true/.test(stateSrc),
  'precondition: default State still boots with isPlayerTurn true (regression hinge)'
);

const endTurn = combatSrc.match(/endTurn:\s*\(\)\s*=>\s*\{[\s\S]*?setTimeout\(Combat\.enemyTurn,\s*1000\);\s*\}/);
assert.ok(endTurn, 'expected Combat.endTurn implementation');
assert.ok(
  /if\s*\(\s*!State\.combat\.isPlayerTurn\s*\)\s*return;/.test(endTurn[0]),
  'endTurn must early-return when it is not the player turn'
);

console.log('combat start turn gate tests passed');
