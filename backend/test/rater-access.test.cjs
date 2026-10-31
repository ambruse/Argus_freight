const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../src/middleware/auth');
const { createRouter } = require('../src/live/router');

process.env.JWT_SECRET = 'rater-permission-test-secret';
const rater = { id: 7, username: 'rate_editor', role: 'rater' };
const config = {
    origin_id: 'ORIGIN', destination_id: 'DEST', mode: 'AIR',
    carrier: 'Test carrier', service: 'General cargo', currency: 'USD',
    valid_from: '2026-01-01', valid_until: '2099-12-31', model: 'KG',
    tiers: [{ minimum: '0', price: '2' }], inclusions: ['Freight'], exclusions: [],
};

// Exercise the real router and store without connecting to a deployed database.
function database() {
    const rows = new Map([['existing', {
        id: 'existing', operator_id: 42, operator_name: 'another_operator',
        version: 1, status: 'pending', origin_id: 'ORIGIN', destination_id: 'DEST',
        mode: 'AIR', valid_until: config.valid_until, config,
    }]]);
    const events = [];
    const pool = {
        user: { ...rater }, rows, events,
        async getConnection() { return pool; },
        async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
        async query(sql, args = []) {
            if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
            if (sql.includes('information_schema.tables')) return [[{ present: 7 }]];
            if (sql.includes('RELEASE_LOCK') || sql.startsWith('INSERT IGNORE') || sql.includes('live_request_limits') && !sql.startsWith('SELECT')) return [[]];
            if (sql.startsWith('SELECT hits')) return [[{ hits: 1 }]];
            if (sql.startsWith('SELECT id,role')) return [[pool.user]];
            if (sql.startsWith('SELECT id FROM live_pricing_lock') || sql.startsWith("SELECT id,version FROM live_rates WHERE status='approved'")) return [[]];
            if (sql.startsWith('SELECT id,kind FROM live_locations')) return [[{ id: 'ORIGIN', kind: 'AIR' }, { id: 'DEST', kind: 'AIR' }]];
            if (sql.startsWith('SELECT r.*') || sql.startsWith('SELECT COUNT(*) AS total FROM live_rates')) {
                let matches = [...rows.values()];
                if (sql.includes('WHERE r.id=?')) matches = matches.filter(r => r.id === args[0]);
                if (sql.includes('r.operator_id=?')) matches = matches.filter(r => r.operator_id === args[0]);
                return sql.startsWith('SELECT COUNT') ? [[{ total: matches.length }]] : [structuredClone(matches)];
            }
            if (sql.startsWith('INSERT INTO live_rates')) {
                rows.set(args[0], { id: args[0], operator_id: args[1], version: sql.includes('?,?,1,') ? 1 : args[2], status: 'draft', config });
                return [[]];
            }
            if (sql.startsWith('INSERT INTO live_rate_versions')) {
                const row = rows.get(args[0]);
                row.config = JSON.parse(sql.includes('?,1,') ? args[1] : args[2]);
                return [[]];
            }
            if (sql.startsWith('UPDATE live_rates SET version=')) {
                Object.assign(rows.get(args[5]), { version: args[0], status: 'draft' });
                return [[]];
            }
            if (sql.startsWith('UPDATE live_rates SET status=')) {
                rows.get(args[1]).status = args[0];
                return [[]];
            }
            if (sql.startsWith('INSERT INTO live_rate_audits')) {
                events.push({ rate_id: args[0], version: args[1], actor_id: args[2], action: args[3], detail: args[4] });
                return [[]];
            }
            if (sql.startsWith('SELECT version,config')) return [[{ version: rows.get(args[0]).version, config: rows.get(args[0]).config }]];
            if (sql.startsWith('SELECT action,version')) return [events.filter(e => e.rate_id === args[0])];
            if (sql.startsWith('SELECT id,result')) return [[]];
            if (sql.startsWith('INSERT INTO live_locations')) return [[]];
            throw new Error(`Unexpected test query: ${sql}`);
        },
    };
    return pool;
}

async function serve(t, app) {
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
    return async (path, method = 'GET', body, user = rater, queryToken = false) => {
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
        return fetch(`http://127.0.0.1:${server.address().port}${path}${queryToken ? '?token=' + token : ''}`, {
            method, headers: { ...(!queryToken && { Authorization: 'Bearer ' + token }), 'Content-Type': 'application/json' },
            ...(body !== undefined && { body: JSON.stringify(body) }),
        });
    };
}

test('Rater tokens cannot access unrelated APIs, including download query tokens', async t => {
    const app = express();
    app.use('/api', authenticateToken, (req, res) => res.json({ ok: true }));
    const request = await serve(t, app);
    for (const route of ['/dashboard', '/shipments', '/rfq', '/contacts', '/customers', '/files/12', '/quotation', '/call-enquiries', '/cc-recipients', '/compulsory-emails', '/auth/admin/users', '/auth/operators', '/auth/sales', '/auth/email-settings', '/auth/signature']) {
        for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
            assert.equal((await request('/api' + route, method)).status, 403, `${method} ${route}`);
        }
    }
    assert.equal((await request('/api/files/12', 'GET', undefined, rater, true)).status, 403);
    for (const [route, method] of [['/auth/me', 'GET'], ['/auth/profile', 'GET'], ['/auth/profile', 'POST'], ['/auth/change-password', 'POST'], ['/auth/verify-password', 'POST']]) {
        assert.equal((await request('/api' + route, method)).status, 200);
    }
    assert.equal((await request('/api/auth/profile', 'DELETE')).status, 403);
    for (const role of ['admin', 'operator', 'sales', 'customer', 'calling_agent']) {
        assert.equal((await request('/api/dashboard', 'GET', undefined, { id: 2, role })).status, 200);
    }
});

test('Rater can manage all rates, publish, compare, inspect history and add road locations', async t => {
    const pool = database(), app = express();
    app.use('/api/live-pricing', createRouter(pool));
    const send = await serve(t, app);
    const request = (path, method, body) => send('/api/live-pricing' + path, method, body);
    const list = await request('/rates');
    assert.equal(list.status, 200);
    assert.equal((await list.json()).rows[0].operator_id, 42);
    const created = await request('/rates', 'POST', { config });
    assert.equal(created.status, 201);
    assert.equal(pool.rows.get((await created.json()).id).operator_id, rater.id);
    const edited = await request('/rates/existing', 'PUT', { config, version: 1 });
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).version, 2);
    assert.equal(pool.rows.get('existing').status, 'draft');
    assert.equal((await request('/rates/existing', 'PUT', { config, version: 1 })).status, 409);
    for (const action of ['submit', 'reject', 'submit', 'approve', 'duplicate', 'inactive', 'archive']) {
        assert.equal((await request('/rates/existing/action', 'POST', { version: 2, action, reason: 'Update required' })).status, 200, action);
    }
    assert.equal(pool.rows.get('existing').status, 'archived');
    assert.ok(pool.events.some(e => e.action === 'approve' && e.actor_id === rater.id));
    const history = await request('/rates/existing/history');
    assert.equal(history.status, 200);
    assert.ok((await history.json()).events.length > 0);
    const preview = { config, shipment: { ...config, cargo: [{ input: 'CBM', cbm: '1', quantity: 1, weight: '10', weight_unit: 'kg', weight_basis: 'LINE' }] } };
    assert.equal((await request('/preview', 'POST', preview)).status, 200);
    assert.equal((await request('/comparison', 'POST', preview)).status, 200);
    assert.equal((await request('/road-locations', 'POST', { country: 'Qatar', name: 'Test terminal' })).status, 201);
    for (const path of ['/enquiry-settings', '/enquiries', '/enquiries/export.csv']) assert.equal((await request(path)).status, 403);
    assert.equal((await request('/enquiry-settings', 'PUT', {})).status, 403);
    for (const property of ['is_deleted', 'is_stalled']) {
        pool.user[property] = true;
        assert.equal((await request('/rates')).status, 403);
        delete pool.user[property];
    }
    // The stored role, rather than a stale token, controls rate permissions.
    pool.user.role = 'sales';
    assert.equal((await request('/rates')).status, 403);
});

test('Operator ownership and administrator publishing permissions remain intact', async t => {
    const pool = database(), app = express();
    app.use('/api/live-pricing', createRouter(pool));
    const request = await serve(t, app);
    pool.user = { id: 8, role: 'operator' };
    const list = await request('/api/live-pricing/rates');
    assert.equal((await list.json()).total, 0);
    assert.equal((await request('/api/live-pricing/rates/existing', 'PUT', { config, version: 1 })).status, 403);
    assert.equal((await request('/api/live-pricing/rates/existing/history')).status, 403);
    pool.user.id = 42;
    assert.equal((await request('/api/live-pricing/rates/existing/action', 'POST', { version: 1, action: 'approve' })).status, 403);
    assert.equal((await request('/api/live-pricing/comparison', 'POST', {})).status, 403);
    pool.user = { id: 1, role: 'admin' };
    assert.equal((await request('/api/live-pricing/rates/existing/action', 'POST', { version: 1, action: 'approve' })).status, 200);
});
