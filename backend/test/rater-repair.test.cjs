const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setRaterRole } = require('../scripts/set-rater-role');

function database(role = 'operator', count = 1, failUpdate = false) {
  const user = { id: 7, username: 'rates', role };
  const events = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    query: async (sql, args) => {
      if (sql.includes('FOR UPDATE')) { assert.deepEqual(args, ['rates']); return [Array(count).fill({ ...user })]; }
      assert.deepEqual(args, [7]);
      if (sql.startsWith('UPDATE')) { events.push('update'); if (!failUpdate) user.role = 'rater'; return [{}]; }
      return [[{ ...user }]];
    },
  };
  return { events, getConnection: async () => connection };
}

test('Repair changes and verifies only the explicitly named Operator account', async () => {
  const db = database();
  assert.deepEqual(await setRaterRole(db, 'rates'), { id: 7, username: 'rates', role: 'rater' });
  assert.deepEqual(db.events, ['begin', 'update', 'commit', 'release']);
});

test('Repair is repeatable and refuses ambiguous accounts or other roles', async () => {
  const existing = database('rater');
  await setRaterRole(existing, 'rates');
  assert.ok(!existing.events.includes('update'));
  for (const [role, count] of [['operator', 0], ['operator', 2], ['admin', 1], ['sales', 1], ['customer', 1]]) {
    const db = database(role, count);
    await assert.rejects(setRaterRole(db, 'rates'));
    assert.ok(!db.events.includes('update'));
    assert.deepEqual(db.events.slice(-2), ['rollback', 'release']);
  }
});

test('Repair rolls back if the database does not preserve the Rater role', async () => {
  const db = database('operator', 1, true);
  await assert.rejects(setRaterRole(db, 'rates'), /did not preserve/);
  assert.ok(!db.events.includes('commit'));
  assert.deepEqual(db.events.slice(-2), ['rollback', 'release']);
});
