const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTrackingService, BASE_FIELDS } = require('../src/tracking/service');

const ADMIN = { id: 1, username: 'admin', role: 'admin' };
const OPERATOR = { id: 2, username: 'operator2', role: 'operator' };
const REF = 'ARG-2111261-1';
const KEY = 'ARG-2111261';
const NOW = new Date('2026-11-21T10:00:00.000Z');

// SQL-shape fake: this verifies the service's transaction boundaries and failure
// handling without pretending to validate MySQL's SQL parser or query planner.
function fixture({ failUpdateTable, failAudit = false, ownership = true, empty = false, initialDetails } = {}) {
  const base = {
    ref_no: REF, cust_req_no: KEY, shipment_key: KEY, status: 'Confirmed',
    track_status: 'Confirmed', operator: 'operator2', customer_id: null,
    customer_name: 'Example', customer_email: 'private@example.test',
    pol: 'Shanghai', pod: 'Hamad Port', eta: '2026-12-04', etd: '2026-11-24',
    cost: 100, profit: 20, mode: 'SEA', updated_at: '2026-11-21 09:00:00',
  };
  let state = {
    copies: { shipments: empty ? null : { ...base }, shipments_u2: empty ? null : { ...base } },
    profile: initialDetails ? { details: JSON.stringify(initialDetails), version: 1 } : null, events: [], audits: [],
  };
  const trace = [];
  let snapshot;
  const connection = {
    async query(sql, values = []) {
      trace.push({ sql, values });
      if (sql.startsWith('SET time_zone')) return [{ affectedRows: 0 }];
      if (sql.includes('information_schema.columns')) {
        return [Object.keys(state.copies).flatMap(table => BASE_FIELDS.map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })))];
      }
      if (sql.includes('information_schema.TABLES t')) return [Object.keys(state.copies).map(table_name => ({ table_name, engine: 'InnoDB' }))];
      if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.startsWith('SELECT id,role FROM users')) return [[]];
      if (sql.startsWith('SELECT id,username,role,customer_id FROM users')) return [[]];
      if (sql.startsWith('WITH candidates')) {
        if (sql.includes('SELECT DISTINCT customer_id FROM keyed')) return [[]];
        if (sql.includes('SELECT 1 FROM keyed s WHERE')) return [ownership ? [{ 1: 1 }] : []];
        if (sql.includes('SELECT s.* FROM chosen s WHERE')) {
          return [state.copies.shipments ? [{ ...state.copies.shipments, details: state.profile?.details || null, version: state.profile?.version || 0, tracking_updated_at: state.profile ? '2026-11-21 10:00:00' : null, __source: 'shipments', rn: 1, __priority: 0 }] : []];
        }
      }
      if (sql.startsWith('SELECT details,version FROM tracking_profiles')) return [state.profile ? [{ ...state.profile }] : []];
      if (sql.startsWith('INSERT INTO tracking_profiles')) {
        state.profile = { details: values[1], version: (state.profile?.version || 0) + 1 };
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT IGNORE INTO tracking_profiles')) {
        state.profile ||= { details: '{}', version: 1 };
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE tracking_profiles')) {
        state.profile.version += 1;
        return [{ affectedRows: 1 }];
      }
      const copyRead = sql.match(/^SELECT s\.ref_no(?:,s.customer_id)? FROM `([^`]+)`/);
      if (copyRead) return [state.copies[copyRead[1]] ? [{ ref_no: state.copies[copyRead[1]].ref_no, customer_id: null }] : []];
      const targetRead = sql.match(/^SELECT ref_no FROM `([^`]+)`/);
      if (targetRead) return [state.copies[targetRead[1]] ? [{ ref_no: state.copies[targetRead[1]].ref_no }] : []];
      const sequenceRead = sql.match(/^SELECT `([^`]+)` AS ref FROM `([^`]+)`/);
      if (sequenceRead) return [state.copies[sequenceRead[2]] ? [{ ref: state.copies[sequenceRead[2]][sequenceRead[1]] }] : []];
      const insertCopy = sql.match(/^INSERT INTO `(shipments[^`]*)` \(([^)]+)\) VALUES/);
      if (insertCopy) {
        const fields = [...insertCopy[2].matchAll(/`([^`]+)`/g)].map(match => match[1]);
        assert.equal(state.copies[insertCopy[1]], null, 'Fixture copy insert must not replace an existing row');
        state.copies[insertCopy[1]] = { ...Object.fromEntries(fields.map((field, i) => [field, values[i]])), shipment_key: KEY };
        return [{ affectedRows: 1 }];
      }
      const update = sql.match(/^UPDATE `([^`]+)` s SET (.+) WHERE /);
      if (update) {
        if (update[1] === failUpdateTable) throw new Error('Injected replica write failure');
        const fields = [...update[2].matchAll(/`([^`]+)`=\?/g)].map(match => match[1]);
        fields.forEach((field, index) => { state.copies[update[1]][field] = values[index]; });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT INTO shipment_tracking_audits')) {
        if (failAudit) throw new Error('Injected audit write failure');
        state.audits.push({ shipment_key: values[0], field_name: values[1], previous_value: values[2], new_value: values[3], created_by: values[4] });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT INTO shipment_tracking_events')) {
        const names = ['shipment_key', 'shipment_reference', 'event_type', 'previous_status', 'new_status', 'event_title', 'event_description', 'location_name', 'location_country', 'event_time', 'created_by', 'source', 'is_public', 'corrects_event_id'];
        state.events.push({ id: state.events.length + 1, ...Object.fromEntries(names.map((name, index) => [name, values[index]])) });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('SELECT e.* FROM shipment_tracking_events')) {
        return [state.events.filter(event => !sql.includes('AND e.is_public=1') || event.is_public === 1)];
      }
      throw new Error('Unmocked SQL: ' + sql);
    },
    async beginTransaction() { trace.push({ op: 'begin' }); snapshot = structuredClone(state); },
    async commit() { trace.push({ op: 'commit' }); snapshot = null; },
    async rollback() { trace.push({ op: 'rollback' }); if (snapshot) state = snapshot; snapshot = null; },
    release() { trace.push({ op: 'release' }); },
  };
  const pool = { query: connection.query.bind(connection), async getConnection() { return connection; } };
  const notifications = [];
  const service = createTrackingService(pool, { now: () => NOW, notify(key, row) { notifications.push({ key, row, lastOperation: trace.at(-1)?.op }); } });
  return { service, trace, notifications, state: () => state };
}

test('successful tracking save atomically synchronizes every copy, audit and event before notifying', async () => {
  const f = fixture();
  const result = await f.service.save(ADMIN, REF, { track_status: 'In Transit', public_message: 'Departed origin' });
  assert.equal(result.success, true);
  assert.equal(f.state().copies.shipments.track_status, 'In Transit');
  assert.equal(f.state().copies.shipments_u2.track_status, 'In Transit');
  assert.equal(f.state().copies.shipments.status, 'Confirmed');
  assert.equal(f.state().events.length, 1);
  assert.equal(f.state().events[0].previous_status, 'Confirmed');
  assert.equal(f.state().events[0].new_status, 'In Transit');
  assert.equal(f.state().events[0].event_description, 'Departed origin');
  assert.equal(f.state().audits.length, 2);
  assert.equal(f.notifications.length, 1);
  assert.equal(f.notifications[0].lastOperation, 'release');
  assert.deepEqual(f.trace.filter(item => item.op).map(item => item.op), ['begin', 'commit', 'release']);
});

test('a failed replica update rolls back the central copy, profile, audit and event and emits nothing', async () => {
  const f = fixture({ failUpdateTable: 'shipments_u2' });
  await assert.rejects(() => f.service.save(ADMIN, REF, { track_status: 'Scheduled' }), /replica write failure/);
  assert.equal(f.state().copies.shipments.track_status, 'Confirmed');
  assert.equal(f.state().copies.shipments_u2.track_status, 'Confirmed');
  assert.equal(f.state().profile, null);
  assert.equal(f.state().events.length, 0);
  assert.equal(f.state().audits.length, 0);
  assert.equal(f.notifications.length, 0);
  assert.deepEqual(f.trace.filter(item => item.op).map(item => item.op), ['begin', 'rollback', 'release']);
});

test('audit persistence failure rolls back shipment writes and prevents false success', async () => {
  const f = fixture({ failAudit: true });
  await assert.rejects(() => f.service.save(ADMIN, REF, { track_status: 'Scheduled' }), /audit write failure/);
  assert.equal(f.state().copies.shipments.track_status, 'Confirmed');
  assert.equal(f.state().copies.shipments_u2.track_status, 'Confirmed');
  assert.equal(f.notifications.length, 0);
});

test('unchanged saves preserve event history, profile version and notification silence', async () => {
  const f = fixture();
  await f.service.save(ADMIN, REF, { track_status: 'Confirmed' });
  assert.equal(f.state().profile, null);
  assert.equal(f.state().audits.length, 0);
  assert.equal(f.state().events.length, 0);
  assert.equal(f.notifications.length, 0);
});

test('operator access is checked before the transaction and denies unassigned shipments', async () => {
  const f = fixture({ ownership: false });
  await assert.rejects(() => f.service.save(OPERATOR, REF, { track_status: 'Scheduled' }), error => error.status === 403);
  assert.equal(f.trace.some(item => item.op === 'begin'), false);
  assert.equal(f.state().profile, null);
});

test('sales and customer roles cannot write or inspect internal tracking details', async () => {
  for (const role of ['sales', 'customer', 'rater']) {
    const f = fixture();
    await assert.rejects(() => f.service.detail({ ...OPERATOR, role }, REF), error => error.status === 403);
    await assert.rejects(() => f.service.save({ ...OPERATOR, role }, REF, { track_status: 'Scheduled' }), error => error.status === 403);
    assert.equal(f.trace.length, 0);
  }
});

test('operators cannot submit financial fields and internal reads hide them', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.save(OPERATOR, REF, { cost: 10 }), error => error.status === 403);
  const detail = await f.service.detail(OPERATOR, REF);
  assert.equal(Object.hasOwn(detail.data, 'cost'), false);
  assert.equal(Object.hasOwn(detail.data, 'profit'), false);
});

test('private event creation persists its visibility and public lookup excludes it', async () => {
  const f = fixture();
  await f.service.addEvent(ADMIN, REF, { event_title: 'Internal carrier follow-up', event_description: 'PRIVATE_OPERATIONAL_NOTE', is_public: false });
  assert.equal(f.state().events.length, 1);
  assert.equal(f.state().events[0].is_public, 0);
  assert.equal(f.state().events[0].event_time, '2026-11-21 10:00:00.000');
  const result = await f.service.publicLookup(REF);
  assert.deepEqual(result.events, []);
  assert.equal(JSON.stringify(result).includes('PRIVATE_OPERATIONAL_NOTE'), false);
  assert.equal(JSON.stringify(result).includes('private@example.test'), false);
});

test('ETA-only edits are checked against the saved departure date', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.save(ADMIN, REF, { eta: '2026-11-23' }), /ETA/);
  assert.equal(f.state().copies.shipments.eta, '2026-12-04');
  assert.equal(f.notifications.length, 0);
});

test('canonical customer identity cannot be reassigned through tracking edits', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.save(ADMIN, REF, { cust_req_no: 'ARG-OTHER1' }), /cannot be reassigned/);
  assert.equal(f.trace.some(item => item.op === 'begin'), false);
});

test('partial actual-arrival changes are compared with the saved actual departure', async () => {
  const f = fixture({ initialDetails: { actual_departure: '2026-11-20' } });
  await assert.rejects(() => f.service.save(ADMIN, REF, { actual_arrival: '2026-11-19' }), /Actual arrival/);
  assert.equal(f.state().profile.version, 1);
  assert.equal(f.notifications.length, 0);
});

test('impossible event calendar dates roll back profile creation and do not notify', async () => {
  const f = fixture();
  await assert.rejects(() => f.service.addEvent(ADMIN, REF, {
    event_title: 'Bad occurrence date', event_time: '2026-02-30T10:00:00Z', is_public: true,
  }), /date is invalid/);
  assert.equal(f.state().profile, null);
  assert.equal(f.state().events.length, 0);
  assert.equal(f.notifications.length, 0);
  assert.deepEqual(f.trace.filter(item => item.op).map(item => item.op), ['begin', 'rollback', 'release']);
});

test('new confirmed shipment uses generated reference, persists required data and is publicly discoverable', async () => {
  const f = fixture({ empty: true });
  const result = await f.service.save(ADMIN, undefined, {
    method: 'new', customer_name: 'New customer', mode: 'Sea Freight',
    pol_country: 'China', pol_city: 'Shanghai', pol_port: 'Port of Shanghai',
    pod_country: 'Qatar', pod_city: 'Umm Al Houl', pod_port: 'Hamad Port',
    commodity: 'Furniture', cargo_type: 'General cargo', package_count: 12,
    package_type: 'Cartons', gross_weight: 25.5, chargeable_weight: 40.6,
    weight_unit: 'KG', cargo_volume: 0.24, etd: '2026-11-24', eta: '2026-12-04',
  }, { isNew: true });
  assert.equal(result.data.ref_no, REF);
  assert.equal(result.data.status, 'Confirmed');
  assert.equal(result.data.track_status, 'Confirmed');
  assert.equal(f.state().copies.shipments.ref_no, REF);
  assert.equal(f.state().copies.shipments.status, 'Confirmed');
  assert.equal(f.state().copies.shipments.gross_weight, 25.5);
  assert.equal(f.state().copies.shipments.chargeable_weight, 40.6);
  assert.equal(f.state().copies.shipments_u2, null, 'Unassigned operator must not receive a new shipment copy');
  const publicResult = await f.service.publicLookup(REF);
  assert.equal(publicResult.origin.country, 'China');
  assert.equal(publicResult.destination.country, 'Qatar');
  assert.equal(publicResult.package_count, 12);
  assert.equal(publicResult.events[0].event_type, 'registered');
  assert.equal(f.notifications.length, 1);
});
