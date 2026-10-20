// Browser coverage with an isolated fixture API; never sends email or writes a real database.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const { validateContact, contactsCsv } = require('../src/live/enquiries');

(async () => {
    const { chromium } = require(process.env.LIVE_TEST_PLAYWRIGHT || 'playwright');
    const user = { id: 1, username: 'Contact test admin', role: 'admin' };
    const locations = [
        { id: 'CNSHA', name: 'Shanghai Port', kind: 'SEA', country: 'China', aliases: [] },
        { id: 'QAHMD', name: 'Hamad Port', kind: 'SEA', country: 'Qatar', aliases: [] },
    ];
    const records = [];
    const app = express();
    app.use(express.json());
    app.get('/api/live-pricing/catalog', (_, res) => res.json({ locations: [], groups: [] }));
    app.get('/api/live-pricing/locations', (_, res) => res.json({ locations, countries: [] }));
    app.post('/api/live-pricing/enquiries', (req, res) => {
        records.push({ id: req.body.id, contact: validateContact(req.body), route: { origin: locations[0], destination: locations[1], mode: req.body.mode }, recipient: 'operator@example.com', status: 'sent' });
        res.json({ reference: req.body.id, delivery: 'sent' });
    });
    app.get('/api/live-pricing/enquiries', (_, res) => res.json({ rows: records }));
    app.get('/api/live-pricing/enquiry-settings', (_, res) => res.json({ version: 1, enabled: false, host: 'smtp.example.com', port: 587, email: '', has_password: false, recipients: [] }));
    app.get('/api/live-pricing/enquiries/export.csv', (req, res) => {
        assert.equal(req.headers.authorization, 'Bearer isolated-contact-test');
        res.attachment('live-enquiry-contacts.csv').type('text/csv; charset=utf-8').send(contactsCsv(records.map(r => r.contact)));
    });
    app.get('/api/auth/me', (_, res) => res.json({ success: true, user }));
    app.get('/api/auth/profile', (_, res) => res.json({ user }));
    app.use('/api', (_, res) => res.json({ success: true, data: [], count: 0, shipments: [] }));
    app.use(express.static(path.resolve(__dirname, '../../dist'), { extensions: ['html'] }));
    app.use(express.static(path.resolve(__dirname, '../../frontend/out'), { extensions: ['html'] }));
    const server = app.listen(0, '127.0.0.1');
    let browser;
    try {
        await new Promise(resolve => server.once('listening', resolve));
        const url = `http://127.0.0.1:${server.address().port}`;
        browser = await chromium.launch({ executablePath: process.env.LIVE_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url);
        const calculator = page.locator('.live-calculator').first();
        async function location(label, name) {
            await calculator.getByRole('combobox', { name: label, exact: true }).fill(name);
            await calculator.getByRole('option').filter({ hasText: name }).click();
        }
        await location('POL / Origin', 'Shanghai');
        await location('POD / Destination', 'Hamad');
        await calculator.getByRole('button', { name: 'SEA', exact: true }).click();
        await calculator.getByRole('button', { name: 'Search', exact: true }).click();
        const contact = page.getByRole('dialog');
        await contact.getByRole('heading', { name: 'How can we reach you?' }).waitFor();
        await contact.getByLabel('Phone number', { exact: true }).fill('5555 1234');
        await contact.getByLabel('Email address', { exact: true }).fill('ali@example.com');
        await contact.getByRole('button', { name: 'Continue', exact: true }).click();
        assert.equal(records.length, 0);
        assert.equal(await contact.getByLabel('Name', { exact: true }).evaluate(el => el.validity.valueMissing), true);
        await contact.getByLabel('Name', { exact: true }).fill('   ');
        await contact.getByRole('button', { name: 'Continue', exact: true }).click();
        await contact.getByRole('alert').filter({ hasText: 'Enter your name.' }).waitFor();
        assert.equal(records.length, 0);
        await contact.getByLabel('Name', { exact: true }).fill('Ali, "Ahmed"');
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(await contact.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await contact.getByRole('button', { name: 'Continue', exact: true }).click();
        await contact.getByRole('heading', { name: 'Live Freight Rates', exact: true }).waitFor();
        assert.equal(records[0].contact.name, 'Ali, "Ahmed"');
        assert.equal(records[0].contact.phone, '+97455551234');
        await page.evaluate(user => {
            localStorage.setItem('freight_token', 'isolated-contact-test');
            localStorage.setItem('freight_user', JSON.stringify(user));
        }, user);
        await page.goto(url + '/settings');
        await page.getByRole('heading', { name: 'Enquiry contact records' }).waitFor();
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download contacts CSV' }).click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'live-enquiry-contacts.csv');
        const csv = await fs.readFile(await download.path(), 'utf8');
        assert.equal(csv, '\uFEFFName,Phone number,Email address\r\n"Ali, ""Ahmed""","+97455551234","ali@example.com"\r\n');
        await page.getByRole('region', { name: 'Recent enquiry deliveries' }).getByText('Ali, "Ahmed"', { exact: true }).waitFor();
        assert.deepEqual(errors, []);
        console.log('PASS: required name, blank-name validation, combined international phone, mobile contact form, admin history and exact downloaded CSV.');
    } finally {
        if (browser) await browser.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
