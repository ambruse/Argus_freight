// Runs only against an explicitly supplied disposable local database server.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { createRouter } = require('../src/live/router');
test('database persistence, approvals, ownership, expiry, quotes and currency selection', { skip: !process.env.LIVE_TEST_DB_PASSWORD }, async () => {
    const database = 'argus_live_test_' + randomUUID().replaceAll('-', '');
    const options = { host: '127.0.0.1', port: Number(process.env.LIVE_TEST_DB_PORT || 3308), user: 'root', password: process.env.LIVE_TEST_DB_PASSWORD, dateStrings: true, timezone: 'Z' };
    const root = await mysql.createConnection(options);
    let pool, server;
    try {
        await root.query(`CREATE DATABASE \`${database}\``);
        pool = mysql.createPool({ ...options, database });
        await pool.query('CREATE TABLE users (id INT PRIMARY KEY,username VARCHAR(80),role VARCHAR(20),is_deleted BOOLEAN DEFAULT 0,is_stalled BOOLEAN DEFAULT 0)');
        await pool.query("INSERT INTO users(id,username,role) VALUES (1,'Operator A','operator'),(2,'Operator B','operator'),(3,'Admin','admin'),(4,'Customer','customer')");
        process.env.JWT_SECRET = 'isolated-test-' + randomUUID();
        const app = express();
        app.use('/api/live-pricing', createRouter(pool));
        server = app.listen(0, '127.0.0.1');
        await new Promise(r => server.once('listening', r));
        const url = `http://127.0.0.1:${server.address().port}/api/live-pricing`;
        const call = async (path, method = 'GET', body, user) => { const response = await fetch(url + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + jwt.sign({ id: user, role: 'admin' }, process.env.JWT_SECRET) } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, data: await response.json() }; };
        const e = await import('../../shared/livePricing.mjs');
        const date = e.today();
        const dir = await call('/locations');
        assert.equal(dir.status, 200);
        assert.ok(dir.data.locations.length > 1900);
        const [a, b] = dir.data.locations.filter(x => x.kind === 'AIR');
        const config = { origin_id: a.id, destination_id: b.id, mode: 'AIR', carrier: 'Isolated fixture', service: 'General', currency: 'USD', valid_from: date, valid_until: date, model: 'KG', tiers: [{ minimum: '0', price: '2' }], inclusions: ['Freight'], exclusions: ['At actuals'] };
        assert.equal((await call('/rates')).status, 401);
        assert.equal((await call('/rates', 'POST', { config }, 4)).status, 403);
        const created = await call('/rates', 'POST', { config }, 1);
        assert.equal(created.status, 201, JSON.stringify(created));
        const id = created.data.id;
        assert.equal((await call('/rates/' + id, 'PUT', { config, version: 1 }, 2)).status, 403);
        assert.equal((await call('/rates/' + id + '/history', 'GET', null, 2)).status, 403);
        assert.equal((await call('/rates', 'GET', null, 2)).data.total, 0);
        assert.equal((await call('/catalog')).data.groups.length, 0);
        assert.equal((await call('/rates/' + id + '/action', 'POST', { version: 1, action: 'submit' }, 1)).status, 200);
        assert.equal((await call('/rates/' + id + '/action', 'POST', { version: 1, action: 'approve' }, 1)).status, 403);
        assert.equal((await call('/rates/' + id + '/action', 'POST', { version: 1, action: 'approve' }, 3)).status, 200);
        const cat = (await call('/catalog')).data;
        assert.equal(cat.groups.length, 1);
        assert.ok(!JSON.stringify(cat).includes('operator_name'));
        assert.ok(!JSON.stringify(cat).includes('tiers'));
        const shipment = { origin_id: a.id, destination_id: b.id, mode: 'AIR', cargo: [{ input: 'CBM', cbm: '0.001', weight: '10', weight_unit: 'kg', weight_basis: 'LINE', quantity: 1 }] };
        const quote = (await call('/quotes', 'POST', { group: cat.groups[0].id, shipment })).data;
        assert.equal(quote.estimate.total, '20.00');
        assert.ok(!JSON.stringify(quote).includes('operator_id'));
        const other = await call('/rates', 'POST', { config: { ...config, currency: 'QAR', tiers: [{ minimum: 0, price: '3.65' }] } }, 2);
        await call('/rates/' + other.data.id + '/action', 'POST', { version: 1, action: 'submit' }, 2);
        assert.equal((await call('/quotes', 'POST', { group: cat.groups[0].id, shipment })).data.estimate.total, '20.00');
        await call('/rates/' + other.data.id + '/action', 'POST', { version: 1, action: 'approve' }, 3);
        assert.equal((await call('/quotes', 'POST', { group: cat.groups[0].id, shipment })).data.estimate.total, '10.00');
        const edited = await call('/rates/' + id, 'PUT', { config: { ...config, tiers: [{ minimum: 0, price: 1 }] }, version: 1 }, 1);
        assert.equal(edited.data.version, 2);
        assert.equal((await call('/quotes/' + quote.reference)).data.estimate, null);
        assert.equal((await call('/rates/' + id, 'PUT', { config, version: 1 }, 1)).status, 409);
        const history = (await call('/rates/' + id + '/history', 'GET', null, 1)).data;
        assert.equal(history.versions.length, 2);
        assert.equal(history.quotes[0].result.estimate.total, '20.00');
        await call('/rates/' + other.data.id + '/action', 'POST', { version: 1, action: 'inactive' }, 2);
        const unavailable = (await call('/quotes', 'POST', { group: cat.groups[0].id, shipment })).data;
        assert.equal(unavailable.available, false);
        assert.equal(unavailable.estimate, null);
        const bad = await call('/quotes', 'POST', { shipment: { ...shipment, destination_id: a.id } });
        assert.equal(bad.status, 400);
        const pending = await call('/rates/' + id + '/action', 'POST', { version: 2, action: 'submit' }, 1);
        assert.equal(pending.status, 200);
        const race = await Promise.all([call('/rates/' + id + '/action', 'POST', { version: 2, action: 'approve' }, 3), call('/rates/' + id + '/action', 'POST', { version: 2, action: 'approve' }, 3)]);
        assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
        await pool.query("UPDATE live_rates SET valid_until='2020-01-01' WHERE id=?", [id]);
        assert.equal((await call('/catalog')).data.groups.length, 0);
        assert.equal((await call('/rates/' + id + '/history', 'GET', null, 1)).data.events[0].action, 'expired');
        await pool.query('UPDATE users SET is_stalled=1 WHERE id=1');
        assert.equal((await call('/rates', 'GET', null, 1)).status, 403);
        const [[count]] = await pool.query('SELECT COUNT(*) AS n FROM live_estimates');
        assert.ok(count.n >= 4);
    }
    catch (error) {
        console.error(error);
        throw error;
    }
    finally {
        if (server) {
            server.closeAllConnections();
            await new Promise(r => server.close(r));
        }
        if (pool)
            await pool.end();
        await root.query(`DROP DATABASE \`${database}\``);
        await root.end();
    }
});
