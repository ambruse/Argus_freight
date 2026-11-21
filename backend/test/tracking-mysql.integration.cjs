'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

// Explicitly opt in. DB_NAME is intentionally never used. This test creates and
// deletes only a newly generated database whose name starts argus_tracking_test_.
// Example (export DB_HOST, DB_PORT, DB_USER, DB_PASSWORD separately):
// TRACKING_TEST_MYSQL=1 TRACKING_TEST_DB=argus_tracking_test_local \
//   node --test backend/test/tracking-mysql.integration.cjs
const requestedPrefix = process.env.TRACKING_TEST_DB || '';
const enabled = process.env.TRACKING_TEST_MYSQL === '1' && requestedPrefix.startsWith('argus_tracking_test_');
const skipReason = enabled ? false : 'Live MySQL integration NOT RUN. Set TRACKING_TEST_MYSQL=1 and TRACKING_TEST_DB=argus_tracking_test_<label> with isolated test-server credentials.';

test('isolated real MySQL shipment tracking integration', { skip: skipReason, timeout: 120000 }, async t => {
  assert.match(requestedPrefix, /^argus_tracking_test_[a-zA-Z0-9_]+$/, 'Use a simple test database prefix');
  const databaseName = `${requestedPrefix.slice(0, 36)}_${Date.now().toString(36)}_${randomBytes(5).toString('hex')}`;
  assert.match(databaseName, /^argus_tracking_test_[a-zA-Z0-9_]+$/);
  assert.ok(databaseName.length <= 64);

  // Dependencies remain lazy so the default skipped test requires no installed
  // backend packages and cannot accidentally connect to an application database.
  const mysql = require('mysql2/promise');
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const { BASE_FIELDS, createTrackingService } = require('../src/tracking/service');
  const { migrate, check } = require('../src/tracking/schema');
  const { createTrackingRouters } = require('../src/tracking/router');
  const { notifyTracking, trackingRoom } = require('../src/tracking/realtime');
  const connectionConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: 10000, timezone: 'Z', dateStrings: true,
  };
  let adminConnection, pool, server, created = false;
  const previousJwtSecret = process.env.JWT_SECRET;
  try {
    adminConnection = await mysql.createConnection(connectionConfig);
    await adminConnection.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    pool = mysql.createPool({ ...connectionConfig, database: databaseName, connectionLimit: 5 });
    await pool.query(`CREATE TABLE users (
      id INT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, role VARCHAR(50) NOT NULL,
      customer_id VARCHAR(5), name VARCHAR(255), email_address VARCHAR(255),
      is_deleted TINYINT NOT NULL DEFAULT 0, is_stalled TINYINT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`);
    await pool.query('CREATE TABLE customers (customer_id VARCHAR(5) PRIMARY KEY, name VARCHAR(255)) ENGINE=InnoDB');
    const columnType = field => {
      if (field === 'ref_no') return 'VARCHAR(50) NOT NULL PRIMARY KEY';
      if (field === 'status') return "VARCHAR(50) NOT NULL DEFAULT 'Pending'";
      if (['etd', 'eta'].includes(field)) return 'DATE NULL';
      if (['cost', 'profit'].includes(field)) return 'DECIMAL(15,2) NULL';
      if (['created_at', 'updated_at'].includes(field)) return 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
      return 'VARCHAR(255) NULL';
    };
    await pool.query(`CREATE TABLE shipments (${BASE_FIELDS.map(field => `\`${field}\` ${columnType(field)}`).join(',')}) ENGINE=InnoDB`);
    await pool.query('CREATE TABLE shipments_u2 LIKE shipments');
    await pool.query('CREATE TABLE shipments_u3 LIKE shipments');
    await pool.query('INSERT INTO users (id,username,role,customer_id,name) VALUES (1,?,?,NULL,?),(2,?,?,NULL,?),(3,?,?,NULL,?),(4,?,?,?,?)', [
      'admin', 'admin', 'Administrator', 'operator2', 'operator', 'Operator Two',
      'operator3', 'operator', 'Operator Three', 'customer4', 'customer', 'C0001', 'Customer Four',
    ]);
    await pool.query('INSERT INTO customers (customer_id,name) VALUES (?,?)', ['C0001', 'Customer Four']);
    const seed = async (table, ref, request, operator, carrier, bl) => pool.query(
      `INSERT INTO \`${table}\` (ref_no,cust_req_no,status,track_status,operator,customer_name,customer_email,pol,pod,commodity,mode,carrier,bl_number,etd,eta,cost,profit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ref, request, 'Confirmed', 'Confirmed', operator, `Customer ${operator}`, 'private@example.test', 'Shanghai', 'Hamad Port', 'Furniture', 'SEA', carrier, bl, '2026-11-24', '2026-12-04', 100, 20],
    );
    const ref = 'ARG-2111261-1', sibling = 'ARG-2111261-2', key = 'ARG-2111261';
    const otherRef = 'ARG-2111262-1';
    await seed('shipments', ref, key, 'operator2', 'Carrier Alpha', 'BLA12345');
    await seed('shipments_u2', sibling, key, 'operator2', 'Carrier Alpha', 'BLA12345');
    await seed('shipments', otherRef, 'ARG-2111262', 'operator3', 'Carrier Beta', 'BLB12345');
    await seed('shipments_u3', otherRef, 'ARG-2111262', 'operator3', 'Carrier Beta', 'BLB12345');
    const migrationResult = await migrate(pool);
    assert.equal(migrationResult.ready, true);
    assert.equal((await check(pool)).ready, true);
    assert.equal((await migrate(pool)).ready, true, 'Migration must be idempotent');

    const admin = { id: 1, username: 'admin', role: 'admin' };
    const operator = { id: 2, username: 'operator2', role: 'operator' };
    const notifications = [];
    const service = createTrackingService(pool, {
      now: () => new Date('2026-11-21T10:00:00Z'),
      notify: (shipmentKey, row) => notifications.push({ shipmentKey, row }),
    });
    let createdRef;

    await t.test('real SQL listing deduplicates replicas, filters, sorts and paginates', async () => {
      const first = await service.list(admin, { page: '1', pageSize: '1', sort: 'ref_no', order: 'asc' });
      const second = await service.list(admin, { page: '2', pageSize: '1', sort: 'ref_no', order: 'asc' });
      assert.equal(first.pagination.total, 2);
      assert.equal(first.summary.total, 2);
      assert.equal(first.summary.confirmed, 2);
      assert.equal(first.data.length, 1);
      assert.equal(first.data[0].ref_no, ref);
      assert.equal(second.data[0].ref_no, otherRef);
      const filtered = await service.list(admin, { carrier: 'Alpha', mode: 'SEA', etd_from: '2026-11-24', eta_to: '2026-12-04' });
      assert.equal(filtered.pagination.total, 1);
      assert.equal(filtered.data[0].ref_no, ref);
      assert.equal((await service.list(operator)).pagination.total, 1);
    });

    await t.test('existing suffix variants and BL references resolve the same canonical shipment', async () => {
      const original = await service.resolvePublic(ref);
      assert.equal(original.key, key);
      assert.equal((await service.resolvePublic(sibling)).key, key);
      assert.equal((await service.resolvePublic(' arg-2111261 ')).key, key);
      assert.equal((await service.resolvePublic('BLA12345')).key, key);
    });

    await t.test('new confirmed registration saves cargo, route and customer copies', async () => {
      const result = await service.save(operator, undefined, {
        method: 'new', customer_id: 'C0001', customer_name: 'Customer Four', customer_email: 'customer4@example.test',
        mode: 'Sea Freight', carrier: 'Carrier Gamma', house_bl_number: 'NEWBL123',
        pol_country: 'China', pol_city: 'Shanghai', pol_port: 'Port of Shanghai', pol_code: 'CNSHA',
        pod_country: 'Qatar', pod_city: 'Umm Al Houl', pod_port: 'Hamad Port', pod_code: 'QAHMD',
        commodity: 'Furniture', cargo_type: 'General cargo', package_count: 12, package_type: 'Cartons',
        gross_weight: 25.5, chargeable_weight: 40.6, weight_unit: 'KG', cargo_volume: 0.24,
        etd: '2026-11-24', eta: '2026-12-04', public_message: 'Booking registered',
      }, { isNew: true });
      createdRef = result.data.ref_no;
      assert.equal(createdRef, 'ARG-2111263-1');
      assert.equal(result.data.status, 'Confirmed');
      for (const table of ['shipments', 'shipments_u2', 'shipments_u4']) {
        const [copies] = await pool.query(`SELECT * FROM \`${table}\` WHERE ref_no=?`, [createdRef]);
        assert.equal(copies.length, 1, `Expected one copy in ${table}`);
        assert.equal(copies[0].status, 'Confirmed');
        assert.equal(copies[0].customer_id, 'C0001');
      }
      const publicResult = await service.publicLookup(createdRef);
      assert.equal(publicResult.origin.country, 'China');
      assert.equal(publicResult.destination.port, 'Hamad Port');
      assert.equal(publicResult.package_count, 12);
      assert.equal(publicResult.chargeable_weight, '40.6 KG');
      assert.equal(publicResult.events[0].event_type, 'registered');
      assert.equal((await service.list(admin)).summary.total, 3);
      assert.equal((await service.list(operator)).summary.total, 2);
      await assert.rejects(() => service.save(admin, undefined, {
        method: 'existing', ref_no: createdRef, status: 'Confirmed',
      }), /Commercial status/);
    });

    await t.test('ownership, financial authorization and safe public fields are enforced', async () => {
      await assert.rejects(() => service.detail(operator, otherRef), error => error.status === 403);
      await assert.rejects(() => service.save(operator, ref, { cost: 99 }), error => error.status === 403);
      const publicResult = await service.publicLookup(ref);
      for (const field of ['customer_name', 'customer_email', 'customer_phone', 'cost', 'profit', 'internal_notes']) {
        assert.equal(Object.hasOwn(publicResult, field), false, `Unexpected public ${field}`);
      }
      const internalResult = await service.detail(operator, ref);
      assert.equal(Object.hasOwn(internalResult.data, 'cost'), false);
      assert.equal(Object.hasOwn(internalResult.data, 'profit'), false);
    });

    await t.test('stage and schedule saves synchronize all copies and preserve private events', async () => {
      await service.save(operator, sibling, { track_status: 'In Transit', public_message: 'Departed origin', eta: '2026-12-05' });
      for (const table of ['shipments', 'shipments_u2']) {
        const [rows] = await pool.query(`SELECT status,track_status,eta FROM \`${table}\` WHERE cust_req_no=?`, [key]);
        assert.equal(rows[0].status, 'Confirmed');
        assert.equal(rows[0].track_status, 'In Transit');
        assert.equal(rows[0].eta, '2026-12-05');
      }
      await service.addEvent(operator, ref, { event_title: 'Private staff follow-up', event_description: 'INTERNAL ONLY', is_public: false });
      const all = await service.history(operator, ref);
      assert.ok(all.events.some(event => event.is_public === 0));
      const publicResult = await service.publicLookup(ref);
      assert.equal(publicResult.status, 'In Transit');
      assert.ok(publicResult.events.some(event => event.event_type === 'stage_change'));
      assert.equal(JSON.stringify(publicResult).includes('INTERNAL ONLY'), false);
      const beforeCount = publicResult.events.length;
      await service.save(operator, ref, { track_status: 'In Transit', eta: '2026-12-05' });
      assert.equal((await service.publicLookup(ref)).events.length, beforeCount);
    });

    await t.test('real trigger failure proves transaction rollback across central/profile/history writes', async () => {
      const snapshot = async () => {
        const [central] = await pool.query('SELECT * FROM shipments WHERE cust_req_no=?', [key]);
        const [copies] = await pool.query('SELECT * FROM shipments_u2 WHERE cust_req_no=?', [key]);
        const [profile] = await pool.query('SELECT * FROM tracking_profiles WHERE shipment_key=?', [key]);
        const [events] = await pool.query('SELECT * FROM shipment_tracking_events WHERE shipment_key=? ORDER BY id', [key]);
        const [audits] = await pool.query('SELECT * FROM shipment_tracking_audits WHERE shipment_key=? ORDER BY id', [key]);
        return { central, copies, profile, events, audits };
      };
      const before = await snapshot();
      const noticeCount = notifications.length;
      await pool.query("CREATE TRIGGER fail_tracking_copy BEFORE UPDATE ON shipments_u2 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected tracking replica failure'");
      try {
        await assert.rejects(() => service.save(operator, ref, { track_status: 'Warehouse', public_message: 'Must not persist' }), /Injected tracking replica failure/);
        assert.deepEqual(await snapshot(), before);
        assert.equal(notifications.length, noticeCount);
      } finally { await pool.query('DROP TRIGGER fail_tracking_copy'); }
    });

    await t.test('real Express/JWT endpoints enforce authentication and return safe public tracking', async () => {
      process.env.JWT_SECRET = randomBytes(32).toString('hex');
      const app = express();
      app.use(express.json());
      const routers = createTrackingRouters(pool, { service });
      app.use('/api/shipments', routers.internal);
      app.use('/api/track', routers.publicRouter);
      server = await new Promise((resolve, reject) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
        listener.once('error', reject);
      });
      const origin = `http://127.0.0.1:${server.address().port}`;
      const token = jwt.sign(operator, process.env.JWT_SECRET, { expiresIn: '5m' });
      const authorization = { Authorization: `Bearer ${token}` };
      assert.equal((await fetch(`${origin}/api/shipments/tracking`)).status, 401);
      const listed = await fetch(`${origin}/api/shipments/tracking?pageSize=1`, { headers: authorization });
      assert.equal(listed.status, 200);
      assert.equal((await listed.json()).pagination.total, 2);
      assert.equal((await fetch(`${origin}/api/shipments/tracking/${otherRef}`, { headers: authorization })).status, 403);
      const publicResponse = await fetch(`${origin}/api/track/${ref}`);
      assert.equal(publicResponse.status, 200);
      const data = (await publicResponse.json()).data;
      assert.equal(data.status, 'In Transit');
      assert.equal(Object.hasOwn(data, 'cost'), false);
      const rejected = await fetch(`${origin}/api/shipments/${ref}/tracking`, {
        method: 'PATCH', headers: { ...authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ profit: 999 }),
      });
      assert.equal(rejected.status, 403);
      const customerToken = jwt.sign({ id: 4, username: 'customer4', role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      assert.equal((await fetch(`${origin}/api/shipments/tracking`, { headers: { Authorization: `Bearer ${customerToken}` } })).status, 403);
    });

    await t.test('public realtime invalidation contains references only and targets one room', () => {
      const sent = [];
      const io = { to(room) { return { emit(event, payload) { sent.push({ room, event, payload }); } }; } };
      notifyTracking(io, key, { ref_no: ref, cust_req_no: key, cost: 99, customer_email: 'private@example.test' });
      assert.deepEqual(sent, [{ room: trackingRoom(key), event: 'shipment_tracking_updated', payload: { ref_no: ref, cust_req_no: key } }]);
    });
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise(resolve => server.close(resolve));
    }
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    if (pool) await pool.end();
    if (adminConnection) {
      try {
        // Never drop a configured/pre-existing database; only this test's exact
        // random name after its CREATE DATABASE statement succeeded.
        if (created) await adminConnection.query(`DROP DATABASE \`${databaseName}\``);
      } finally { await adminConnection.end(); }
    }
  }
});
