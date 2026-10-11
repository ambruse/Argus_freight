const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createInitializer } = require('../src/freight/initialize');
const { createRouter } = require('../src/routes/freightRates');
const logger = { info() {}, error() {} };

test('initialization waits for users schema and shares one migration across concurrent requests', async () => {
  let release, calls = 0;
  const core = new Promise(resolve => { release = resolve; });
  const initializer = createInitializer({}, { before: () => core, migrateSchema: async () => { calls++; }, logger });
  const first = initializer.ensure(), second = initializer.ensure();
  assert.equal(first, second);
  await Promise.resolve(); assert.equal(calls, 0);
  assert.equal(initializer.status(), 'initializing');
  release(); await Promise.all([first, second]);
  await initializer.ensure();
  assert.equal(calls, 1); assert.equal(initializer.status(), 'ready');
});

test('failed initialization returns a safe retryable error and recovers after backoff', async () => {
  let clock = 1000, calls = 0;
  const initializer = createInitializer({}, { now: () => clock, retryMs: 30000, logger,
    migrateSchema: async () => { if (++calls === 1) throw Object.assign(new Error('private database detail'), { code: 'ER_DBACCESS_DENIED_ERROR' }); } });
  await assert.rejects(initializer.ensure(), error => error.status === 503 && error.retryAfter === 30 && !error.message.includes('private'));
  await assert.rejects(initializer.ensure(), error => error.status === 503);
  assert.equal(calls, 1); assert.equal(initializer.status(), 'failed');
  clock += 30000; await initializer.ensure();
  assert.equal(calls, 2); assert.equal(initializer.status(), 'ready');
});

test('readiness failure precedes the database-backed limiter and responds with Retry-After', async () => {
  let queries = 0;
  const app = express();
  app.use('/api/freight-rates', createRouter({ query: async () => { queries++; throw Error('unexpected query'); } }, {
    ready: async () => { throw Object.assign(new Error('Freight database setup is not ready.'), { status: 503, retryAfter: 30 }); },
  }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/freight-rates/catalog`);
    assert.equal(response.status, 503); assert.equal(response.headers.get('retry-after'), '30');
    assert.equal(queries, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
