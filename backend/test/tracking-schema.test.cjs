'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { migrate, check, rollback, COLUMNS, TABLES, VERSION } = require('../src/tracking/schema');

function database({ engine = 'InnoDB', unavailableCapability = false, lock = 1 } = {}) {
  const statements = [], present = new Set(), versions = new Set(), counts = {};
  let releases = 0;
  const connection = {
    release() { releases++; },
    async query(sql, args = []) {
      statements.push({ sql, args });
      if (sql.startsWith('SET time_zone')) return [[]];
      if (sql.includes('ROW_NUMBER()')) {
        if (unavailableCapability) throw new Error('syntax');
        return [[{ row_num: 1 }]];
      }
      if (sql.startsWith('SELECT JSON_EXTRACT')) return [[{ json_value: true }]];
      if (sql === 'SELECT DATABASE() AS database_name') return [[{ database_name: 'test_db' }]];
      if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: lock }]];
      if (sql.startsWith('SELECT RELEASE_LOCK')) return [[]];
      if (sql.includes('information_schema.TABLES t')) return [[{ table_name: 'shipments', engine }, { table_name: 'shipments_u2', engine }]];
      if (sql.includes('information_schema.TABLES')) return [[...present].map(table_name => ({ table_name, engine: 'InnoDB' }))];
      if (sql.includes('information_schema.COLUMNS')) return [[...present].flatMap(table => (COLUMNS[table] || []).map(column => ({ table_name: table, column_name: column })))];
      if (sql.startsWith('CREATE TABLE IF NOT EXISTS')) {
        present.add(sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]);
        return [[]];
      }
      if (sql.startsWith('SELECT version FROM')) return [[...versions].filter(version => version === args[0]).map(version => ({ version }))];
      if (sql.startsWith('INSERT IGNORE INTO tracking_schema_migrations')) { versions.add(args[0]); return [[]]; }
      if (sql.startsWith('LOCK TABLES') || sql === 'UNLOCK TABLES') return [[]];
      if (sql.startsWith('SELECT COUNT(*)')) {
        const table = sql.match(/FROM `(\w+)`/)[1];
        return [[{ total: counts[table] || 0 }]];
      }
      if (sql.startsWith('DROP TABLE')) { present.delete(sql.match(/`(\w+)`/)[1]); return [[]]; }
      if (sql.startsWith('DELETE FROM tracking_schema_migrations')) { versions.delete(args[0]); return [[]]; }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  return { statements, present, versions, counts, get releases() { return releases; }, async getConnection() { return connection; } };
}

test('read-only readiness check identifies missing migration without DDL', async () => {
  const pool = database();
  const result = await check(pool);
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, TABLES);
  assert.equal(pool.statements.some(item => /CREATE|DROP|INSERT|UPDATE|DELETE/.test(item.sql)), false);
  assert.equal(pool.releases, 1);
});

test('idempotent additive migration records completion after schema validation', async () => {
  const pool = database();
  for (let i = 0; i < 2; i++) assert.equal((await migrate(pool)).ready, true);
  assert.equal((await check(pool)).ready, true);
  assert.deepEqual([...pool.versions], [VERSION]);
  assert.equal(pool.statements.some(item => /ALTER TABLE|DROP TABLE|TRUNCATE/.test(item.sql)), false);
  assert.ok(pool.statements.find(item => item.sql.includes('FOREIGN KEY (shipment_key)')));
  assert.ok(pool.statements.find(item => item.sql.includes('idx_tracking_events_history')));
  assert.equal(pool.releases, 3);
});

test('migration rejects nontransactional shipment copies before writing schema', async () => {
  const pool = database({ engine: 'MyISAM' });
  await assert.rejects(migrate(pool), /require InnoDB/);
  assert.equal(pool.statements.some(item => item.sql.startsWith('CREATE')), false);
  assert.ok(pool.statements.some(item => item.sql.startsWith('SELECT RELEASE_LOCK')));
  assert.equal(pool.releases, 1);
});

test('unsupported database features and concurrent migration lock failures are explicit', async () => {
  await assert.rejects(migrate(database({ unavailableCapability: true })), /MySQL 8/);
  const pool = database({ lock: 0 });
  await assert.rejects(migrate(pool), /Another tracking schema migration/);
  assert.equal(pool.statements.some(item => item.sql.startsWith('CREATE')), false);
  assert.equal(pool.releases, 1);
});

test('rollback requires explicit option and never deletes populated history', async () => {
  const pool = database();
  await assert.rejects(rollback(pool), /explicit allowEmptyRollback/);
  assert.equal(pool.statements.length, 0);
  await migrate(pool);
  pool.counts.shipment_tracking_events = 1;
  await assert.rejects(rollback(pool, { allowEmptyRollback: true }), /contains tracking data/);
  assert.equal(pool.statements.some(item => item.sql.startsWith('DROP')), false);
  assert.ok(pool.statements.some(item => item.sql === 'UNLOCK TABLES'));
  assert.equal(pool.present.has('shipment_tracking_events'), true);
});

test('empty rollback locks tables before checking and drops only new feature tables in dependency order', async () => {
  const pool = database();
  await migrate(pool);
  assert.equal((await rollback(pool, { allowEmptyRollback: true })).rolledBack, true);
  const sql = pool.statements.map(item => item.sql);
  assert.ok(sql.findIndex(item => item.startsWith('LOCK TABLES')) < sql.findIndex(item => item.startsWith('SELECT COUNT(*)')));
  assert.deepEqual(sql.filter(item => item.startsWith('DROP')), [
    'DROP TABLE IF EXISTS `shipment_tracking_audits`',
    'DROP TABLE IF EXISTS `shipment_tracking_events`',
    'DROP TABLE IF EXISTS `tracking_profiles`',
  ]);
  assert.equal(pool.versions.size, 0);
  assert.equal((await check(pool)).ready, false);
});
