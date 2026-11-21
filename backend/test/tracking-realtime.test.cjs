const { test } = require('node:test');
const assert = require('node:assert/strict');
const { installTrackingRealtime, notifyTracking, trackingRoom, validReference } = require('../src/tracking/realtime');

process.env.JWT_SECRET = 'tracking-realtime-isolated-test-key';

// This suite tests room authorization and subscription control flow, not JWT
// cryptography. Production verification remains jsonwebtoken.verify.
const testTokens = new Map();
function tokenFor(user, expiresInSeconds = 3600) {
  const token = `isolated-room-test-token-${testTokens.size + 1}`;
  testTokens.set(token, { ...user, exp: Math.floor(Date.now() / 1000) + expiresInSeconds });
  return token;
}
function verifyTestToken(token) {
  const decoded = testTokens.get(token);
  if (!decoded || decoded.exp <= Math.floor(Date.now() / 1000)) throw new Error('Invalid test token');
  return decoded;
}

function fixture(overrides = {}) {
  let connection;
  const emitted = [];
  const io = {
    on(event, fn) { assert.equal(event, 'connection'); connection = fn; },
    to(room) { return { emit(event, payload) { emitted.push({ room, event, payload }); } }; },
  };
  const service = {
    async resolvePublic(ref) { return { key: ref.toUpperCase(), row: { ref_no: ref } }; },
    async userForToken(decoded) { return decoded; },
    async canAccessReference(user, ref) { return user.id === 7 && ref === 'ARG-OWN1'; },
    ...overrides,
  };
  installTrackingRealtime(io, service, { verifyToken: verifyTestToken });
  function socket({ token, ip = '127.0.0.1' } = {}) {
    const handlers = new Map();
    const client = {
      handshake: { address: ip, auth: { token } }, rooms: new Set(['socket-id']),
      on(event, handler) { handlers.set(event, handler); },
      async join(room) { client.rooms.add(room); },
      async leave(room) { client.rooms.delete(room); },
      disconnect() { handlers.get('disconnect')(); client.rooms.clear(); },
      async send(event, input) {
        let response;
        await handlers.get(event)(input, value => { response = value; });
        return response;
      },
    };
    connection(client);
    return client;
  }
  return { io, emitted, socket };
}

test('public subscription validates reference and permits only one resolved shipment room', async () => {
  const f = fixture();
  const client = f.socket();
  assert.equal((await client.send('tracking:subscribe', { ref: 'ARG-ONE1' })).success, true);
  assert.ok(client.rooms.has(trackingRoom('ARG-ONE1')));
  await client.send('tracking:subscribe', { ref: 'ARG-TWO2' });
  assert.equal(client.rooms.has(trackingRoom('ARG-ONE1')), false);
  assert.ok(client.rooms.has(trackingRoom('ARG-TWO2')));
  assert.equal(client.rooms.size, 2);
  await client.send('tracking:unsubscribe');
  assert.deepEqual([...client.rooms], ['socket-id']);
  for (const ref of ['', 'ABC', '%', 'ARG_%', 'ARG-ONE1%', 'x'.repeat(101), null, 123]) {
    assert.equal(validReference(ref), false);
    assert.equal((await client.send('tracking:subscribe', { ref })).success, false);
  }
});

test('room invalidations contain only references and never raw records', () => {
  const f = fixture();
  notifyTracking(f.io, 'ARG-ONE1', {
    ref_no: 'ARG-ONE1-1', cust_req_no: 'ARG-ONE1', cost: 9999, profit: 111,
    customer_email: 'private@example.com', internal_notes: 'Sensitive',
  });
  assert.deepEqual(f.emitted, [{
    room: trackingRoom('ARG-ONE1'), event: 'shipment_tracking_updated',
    payload: { ref_no: 'ARG-ONE1-1', cust_req_no: 'ARG-ONE1' },
  }]);
});

test('unmatched, ambiguous and failed lookups do not join rooms or reveal database errors', async () => {
  const f = fixture({ async resolvePublic(ref) {
    if (ref === 'ARG-FAIL') throw new Error('Sensitive database details');
    return null;
  } });
  const client = f.socket();
  const missing = await client.send('tracking:subscribe', { ref: 'ARG-NONE' });
  const failed = await client.send('tracking:subscribe', { ref: 'ARG-FAIL' });
  assert.deepEqual(failed, missing);
  assert.equal(failed.success, false);
  assert.equal(client.rooms.size, 1);
});

test('newer subscription and unsubscribe supersede pending lookup without leaking a stale room', async () => {
  let resolveFirst;
  const f = fixture({ async resolvePublic(ref) {
    if (ref === 'ARG-FIRST') await new Promise(resolve => { resolveFirst = resolve; });
    return { key: ref, row: { ref_no: ref } };
  } });
  const client = f.socket();
  const first = client.send('tracking:subscribe', { ref: 'ARG-FIRST' });
  while (!resolveFirst) await new Promise(resolve => setImmediate(resolve));
  const second = client.send('tracking:subscribe', { ref: 'ARG-SECOND' });
  resolveFirst();
  await Promise.all([first, second]);
  assert.equal(client.rooms.has(trackingRoom('ARG-FIRST')), false);
  assert.ok(client.rooms.has(trackingRoom('ARG-SECOND')));
  const pending = client.send('tracking:subscribe', { ref: 'ARG-THIRD' });
  const leave = client.send('tracking:unsubscribe');
  await Promise.all([pending, leave]);
  assert.equal(client.rooms.size, 1);
});

test('subscription rate limit is shared across connections from the same IP', async () => {
  let lookups = 0;
  const f = fixture({ async resolvePublic(ref) { lookups++; return { key: ref, row: { ref_no: ref } }; } });
  const first = f.socket(), second = f.socket();
  for (let i = 0; i < 60; i++) assert.equal((await first.send('tracking:subscribe', { ref: 'ARG-ONE1' })).success, true);
  assert.equal((await second.send('tracking:subscribe', { ref: 'ARG-ONE1' })).success, false);
  assert.equal(lookups, 60);
  const otherIp = f.socket({ ip: '127.0.0.2' });
  assert.equal((await otherIp.send('tracking:subscribe', { ref: 'ARG-ONE1' })).success, true);
});

test('legacy rooms require a valid token and current user ownership', async t => {
  const f = fixture();
  const anonymous = f.socket();
  for (const room of ['role_admin', 'user_alice', 'room_ARG-OWN1', trackingRoom('ARG-OWN1')]) {
    assert.equal((await anonymous.send('joinRoom', room)).success, false);
  }
  const user = { id: 7, username: 'alice', role: 'operator' };
  const client = f.socket({ token: tokenFor(user) });
  t.after(() => client.disconnect());
  for (const room of ['user_alice', 'user_7', 'user_u7', 'role_operator', 'room_ARG-OWN1']) {
    assert.equal((await client.send('joinRoom', room)).success, true, room);
  }
  for (const room of ['role_admin', 'user_bob', 'room_ARG-OTHER', trackingRoom('ARG-OWN1')]) {
    assert.equal((await client.send('joinRoom', room)).success, false, room);
  }
});

test('fresh stored role and disabled account state supersede stale JWT permissions', async t => {
  let current = { id: 7, username: 'alice', role: 'operator', is_deleted: '0', is_stalled: '0' };
  const f = fixture({ async userForToken() { return current; } });
  const client = f.socket({ token: tokenFor({ id: 7, username: 'alice', role: 'admin' }) });
  t.after(() => client.disconnect());
  assert.equal((await client.send('joinRoom', 'role_admin')).success, false);
  assert.equal((await client.send('joinRoom', 'role_operator')).success, true);
  current = { ...current, is_stalled: 1 };
  assert.equal((await client.send('joinRoom', 'user_alice')).success, false);
  const expired = f.socket({ token: tokenFor({ id: 7 }, -1) });
  assert.equal((await expired.send('joinRoom', 'user_alice')).success, false);
});

test('invalid tokens cannot join private rooms and remain eligible for public tracking', async () => {
  let userLookups = 0;
  const f = fixture({ async userForToken(decoded) { userLookups++; return decoded; } });
  const client = f.socket({ token: 'invalid-unregistered-token' });
  assert.equal((await client.send('joinRoom', 'role_admin')).success, false);
  assert.equal((await client.send('joinRoom', 'user_alice')).success, false);
  assert.equal(userLookups, 0);
  assert.equal(client.rooms.size, 1);
  assert.equal((await client.send('tracking:subscribe', { ref: 'ARG-PUBLIC' })).success, true);
  assert.ok(client.rooms.has(trackingRoom('ARG-PUBLIC')));
});
