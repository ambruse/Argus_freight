const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { createRouter } = require('../src/live/router');
const { createStore } = require('../src/live/store');
const { createEnquiries, validateContact, recipientsFor } = require('../src/live/enquiries');

test('contact validation and country-specific/global selection', () => {
    assert.throws(() => validateContact({}), /reference/);
    const body = { id: randomUUID(), email: 'client@example.com', phone_country: 'Qatar', country_code: '+974', phone: '5555 1234', origin_id: 'CNSHA', destination_id: 'QAHMD', mode: 'SEA' };
    assert.equal(validateContact(body).phone, '+97455551234');
    assert.throws(() => validateContact({ ...body, country_code: '+91' }), /country/);
    assert.throws(() => validateContact({ ...body, email: 'a@example.com\r\nBcc:x@y.com' }), /email/);
    const config = { recipients: [{ email: 'global@example.com', country: '' }, { email: 'qa@example.com', country: 'Qatar' }] };
    assert.equal(recipientsFor(config, 'Qatar').recipients[0].email, 'qa@example.com');
    assert.equal(recipientsFor(config, 'India').recipients[0].email, 'global@example.com');
});

test('persistent routing, SMTP outcomes, idempotency, settings secrecy and admin permissions', { skip: !process.env.LIVE_TEST_DB_PASSWORD }, async () => {
    const database = 'argus_enquiry_test_' + randomUUID().replaceAll('-', '');
    const options = { host: '127.0.0.1', port: Number(process.env.LIVE_TEST_DB_PORT || 3311), user: 'root', password: process.env.LIVE_TEST_DB_PASSWORD, dateStrings: true };
    const root = await mysql.createConnection(options);
    let pool, server;
    const sent = [];
    let failure = null, pause;
    const transportFactory = () => ({ verify: async () => {}, sendMail: async message => {
        if (pause) await pause;
        if (failure) throw failure;
        sent.push(message); return { accepted: [message.to] };
    }, close() {} });
    try {
        process.env.JWT_SECRET = 'isolated-enquiry-test-' + randomUUID();
        await root.query(`CREATE DATABASE \`${database}\``);
        pool = mysql.createPool({ ...options, database });
        await pool.query('CREATE TABLE users (id INT PRIMARY KEY,username VARCHAR(80),role VARCHAR(20),is_deleted BOOLEAN DEFAULT 0,is_stalled BOOLEAN DEFAULT 0)');
        await pool.query("INSERT INTO users VALUES (1,'Admin','admin',0,0),(2,'Operator','operator',0,0)");
        await pool.query('CREATE TABLE app_settings (`key` VARCHAR(255) PRIMARY KEY,value TEXT)');
        const store = createStore(pool), service = createEnquiries(pool, store, { transportFactory });
        const defaults = await service.settings();
        assert.deepEqual(defaults.recipients.map(r => r.email), ['op2@argusshipping.co', 'cs@argusshipping.co', 'jabir@argusshipping.co']);
        assert.ok(defaults.recipients.every(r => r.country === ''));
        assert.equal(defaults.password, undefined);
        let config = await service.saveSettings({ id: 1, role: 'admin' }, { ...defaults, enabled: true, email: 'sender@example.com', password: 'test-only-secret', recipients: [{ email: 'one@example.com', country: '' }, { email: 'two@example.com', country: '' }, { email: 'three@example.com', country: '' }] });
        assert.equal(config.has_password, true);
        const [[saved]] = await pool.query("SELECT value FROM app_settings WHERE `key`='live_enquiry_email'");
        assert.ok(!saved.value.includes('test-only-secret'));
        const body = { id: randomUUID(), email: 'client@example.com', phone_country: 'Qatar', country_code: '+974', phone: '55551234', origin_id: 'CNSHA', destination_id: 'QAHMD', mode: 'SEA' };
        for (let i = 0; i < 4; i++) await service.submit({ ...body, id: randomUUID() });
        assert.deepEqual(sent.map(m => m.to), ['one@example.com','two@example.com','three@example.com','one@example.com']);
        const first = await service.submit(body);
        await service.submit(body);
        assert.equal(sent.length, 5);
        assert.equal(first.delivery, 'sent');
        assert.equal(sent.at(-1).replyTo, body.email);
        assert.ok(sent.at(-1).text.includes('Port of Shanghai'));
        await assert.rejects(service.submit({ ...body, phone: '55551235' }), /changed/);
        config = await service.saveSettings({ id: 1, role: 'admin' }, { ...config, password: '', recipients: [...config.recipients, { email: 'qatar1@example.com', country: 'Qatar' }, { email: 'qatar2@example.com', country: 'Qatar' }] });
        await service.submit({ ...body, id: randomUUID() });
        await service.submit({ ...body, id: randomUUID() });
        assert.deepEqual(sent.slice(-2).map(m => m.to), ['qatar1@example.com','qatar2@example.com']);
        // A new service instance retains the database rotation cursor.
        const restarted = createEnquiries(pool, store, { transportFactory });
        await restarted.submit({ ...body, id: randomUUID() });
        assert.equal(sent.at(-1).to, 'qatar1@example.com');
        let release;
        pause = new Promise(resolve => { release = resolve; });
        const concurrentBody = { ...body, id: randomUUID() };
        const inFlight = service.submit(concurrentBody);
        for (let i = 0; i < 100; i++) {
            const [[r]] = await pool.query('SELECT status FROM live_enquiries WHERE id=?', [concurrentBody.id]);
            if (r?.status === 'sending') break;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        await assert.rejects(service.submit(concurrentBody), /processed/);
        release(); await inFlight; pause = null;
        failure = Object.assign(new Error('test'), { code: 'ECONNREFUSED' });
        const retry = { ...body, id: randomUUID() };
        await assert.rejects(service.submit(retry), /could not send/);
        const [[before]] = await pool.query('SELECT recipient,status FROM live_enquiries WHERE id=?', [retry.id]);
        assert.equal(before.status, 'failed');
        failure = null; await service.submit(retry);
        assert.equal(sent.at(-1).to, before.recipient);
        failure = Object.assign(new Error('test'), { code: 'ETIMEDOUT' });
        const unknown = { ...body, id: randomUUID() };
        await assert.rejects(service.submit(unknown), /confirm/);
        failure = null;
        await assert.rejects(service.submit(unknown), /processed/);
        const interruptedPool = { getConnection: () => pool.getConnection(), query: (sql, args) => {
            if (sql.includes("SET status='sent'")) return Promise.reject(Object.assign(new Error('test persistence interruption'), { code: 'ECONNREFUSED' }));
            return pool.query(sql, args);
        } };
        const interrupted = createEnquiries(interruptedPool, store, { transportFactory });
        const acceptedButUnrecorded = { ...body, id: randomUUID() };
        await assert.rejects(interrupted.submit(acceptedButUnrecorded), /confirm/);
        const acceptedCount = sent.length;
        await assert.rejects(service.submit(acceptedButUnrecorded), /processed/);
        assert.equal(sent.length, acceptedCount);
        await assert.rejects(service.saveSettings({ id: 1, role: 'admin' }, { ...defaults, password: '' }), /changed/);
        const app = express(); app.use('/api/live-pricing', createRouter(pool, Promise.resolve(), { transportFactory }));
        server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
        const url = `http://127.0.0.1:${server.address().port}/api/live-pricing`;
        assert.equal((await fetch(url + '/enquiry-settings')).status, 401);
        const operatorHeaders = { Authorization: 'Bearer ' + jwt.sign({ id: 2, role: 'admin' }, process.env.JWT_SECRET) };
        assert.equal((await fetch(url + '/enquiry-settings', { headers: operatorHeaders })).status, 403);
        assert.equal((await fetch(url + '/enquiries', { headers: operatorHeaders })).status, 403);
        const adminHeaders = { Authorization: 'Bearer ' + jwt.sign({ id: 1 }, process.env.JWT_SECRET) };
        const publicSettings = await (await fetch(url + '/enquiry-settings', { headers: adminHeaders })).json();
        assert.equal(publicSettings.password, undefined);
        const log = await (await fetch(url + '/enquiries', { headers: adminHeaders })).json();
        assert.ok(log.rows.some(r => r.status === 'uncertain'));
        const crossSite = await fetch(url + '/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' }, body: JSON.stringify({ ...body, id: randomUUID() }) });
        assert.equal(crossSite.status, 403);
        for (let i = 0; i < 6; i++) {
            const result = await fetch(url + '/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            assert.equal(result.status, i < 5 ? 200 : 429);
        }
        config = await service.saveSettings({ id: 1, role: 'admin' }, { ...config, password: '', enabled: false, recipients: [] });
        await assert.rejects(service.submit({ ...body, id: randomUUID() }), /configured/);
    } finally {
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (pool) await pool.end();
        await root.query(`DROP DATABASE \`${database}\``); await root.end();
    }
});
