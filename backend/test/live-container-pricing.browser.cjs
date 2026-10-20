// Isolated browser regression: fixture API, real pricing engine, no database writes.
// Run with LIVE_TEST_PLAYWRIGHT pointing to a Playwright installation.
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');

(async () => {
    const { chromium } = require(process.env.LIVE_TEST_PLAYWRIGHT || 'playwright');
    const { validateRate, calculate } = await import('../../shared/livePricing.mjs');
    const user = { id: 1, username: 'Container test', role: 'operator' };
    const locations = [
        { id: 'AIR1', name: 'Origin Airport', kind: 'AIR', country: 'China', aliases: [] },
        { id: 'AIR2', name: 'Destination Airport', kind: 'AIR', country: 'Qatar', aliases: [] },
        { id: 'CNSHA', name: 'Shanghai Port', kind: 'SEA', country: 'China', aliases: [] },
        { id: 'QAHMD', name: 'Hamad Port', kind: 'SEA', country: 'Qatar', aliases: [] },
    ];
    let saved;
    const app = express();
    app.use(express.json());
    app.get('/api/auth/me', (_, res) => res.json({ success: true, user }));
    app.get('/api/live-pricing/locations', (_, res) => res.json({ locations, countries: [] }));
    app.get('/api/live-pricing/rates', (_, res) => res.json({ rows: saved ? [saved] : [], total: saved ? 1 : 0 }));
    app.post('/api/live-pricing/preview', (req, res) => {
        res.json({ result: calculate(validateRate(req.body.config), req.body.shipment) });
    });
    app.post('/api/live-pricing/rates', (req, res) => {
        saved = { id: 'fixture', version: 1, status: 'draft', operator_name: user.username, config: validateRate(req.body.config) };
        res.json(saved);
    });
    app.use('/api', (_, res) => res.json({ success: true, data: [], count: 0, shipments: [] }));
    app.use(express.static(path.resolve(__dirname, '../../frontend/out'), { extensions: ['html'] }));
    app.use((err, req, res, next) => res.status(400).json({ message: err.message }));
    const server = app.listen(0, '127.0.0.1');
    let browser;
    try {
        await new Promise(resolve => server.once('listening', resolve));
        browser = await chromium.launch({
            executablePath: process.env.LIVE_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
            headless: true,
        });
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('dialog', dialog => dialog.accept());
        await page.addInitScript(user => {
            localStorage.setItem('freight_token', 'isolated-test');
            localStorage.setItem('freight_user', JSON.stringify(user));
        }, user);
        await page.goto(`http://127.0.0.1:${server.address().port}/operator/live-rates`);
        await page.getByRole('button', { name: 'Add rate' }).click();
        async function location(label, name) {
            await page.getByRole('combobox', { name: label, exact: true }).fill(name);
            await page.getByRole('option').filter({ hasText: name }).click();
        }
        await location('Origin', 'Origin Airport');
        await location('Destination', 'Destination Airport');
        await page.getByLabel('Pricing model').selectOption('CONTAINER');
        assert.equal(await page.getByLabel('Transport mode').inputValue(), 'SEA');
        assert.equal(await page.getByLabel('Shipment type').inputValue(), 'FCL');
        assert.equal(await page.getByRole('combobox', { name: 'Origin', exact: true }).inputValue(), '');
        assert.equal(await page.getByRole('heading', { name: 'Conditional pricing tiers' }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Add tier' }).count(), 0);
        assert.equal(await page.getByLabel('Minimum per container').count(), 0);
        await location('Origin', 'Shanghai Port');
        await location('Destination', 'Hamad Port');
        await page.getByLabel('Carrier / shipping line').fill('Test carrier');
        await page.getByLabel('Comparable service name').fill('Container service');
        await page.getByLabel('Valid from (Qatar)').fill('2026-10-01');
        await page.getByLabel('Valid until (Qatar)').fill('2026-12-31');
        await page.getByLabel('Tariff currency').selectOption('USD');
        await page.getByLabel('Price (USD) per container', { exact: true }).fill('100');
        await page.getByLabel('Included charges / conditions', { exact: false }).fill('Freight');
        await page.getByLabel('Container / truck quantity').fill('2');
        for (const size of ['20', '40', '40HQ']) {
            for (const equipment of ['DRY', 'REEFER']) {
                await page.getByLabel('Container size (FT)').selectOption(size);
                await page.getByLabel('Container type').selectOption(equipment);
                await page.getByRole('button', { name: 'Preview calculation' }).click();
                await page.getByText('USD 200.00', { exact: true }).waitFor();
            }
        }
        await page.getByRole('button', { name: 'Save draft', exact: true }).click();
        await page.getByText('Draft saved.', { exact: true }).waitFor();
        assert.equal(saved.config.model, 'CONTAINER');
        assert.equal(saved.config.size, '40HQ');
        assert.equal(saved.config.equipment, 'REEFER');
        assert.deepEqual(saved.config.tiers, [{ minimum: '0', price: '100' }]);
        await page.getByRole('button', { name: 'Review / Edit' }).click();
        assert.equal(await page.getByLabel('Container size (FT)').inputValue(), '40HQ');
        assert.equal(await page.getByLabel('Container type').inputValue(), 'REEFER');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => {
            const el = document.querySelector('.live-admin');
            return el && el.scrollWidth <= el.clientWidth + 1;
        }, null, { timeout: 3000 }).catch(async error => {
            console.error(await page.locator('.live-admin').evaluate(el => ({
                width: el.clientWidth, scroll: el.scrollWidth,
                overflowing: [...el.querySelectorAll('*')].filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).slice(0, 12).map(child => ({ tag: child.tagName, text: child.textContent.slice(0, 60), width: child.getBoundingClientRect().width })),
            })));
            throw error;
        });
        await page.getByLabel('Pricing model').selectOption('CBM');
        assert.equal(await page.getByLabel('Shipment type').inputValue(), 'LCL');
        assert.equal(await page.getByRole('combobox', { name: 'Origin', exact: true }).inputValue(), 'China, Shanghai Port');
        await page.getByRole('heading', { name: 'Conditional pricing tiers' }).waitFor();
        assert.equal(await page.getByLabel('Container size (FT)').count(), 0);
        assert.equal(await page.getByLabel('Minimum per CBM', { exact: true }).inputValue(), '0');
        assert.equal(await page.getByText('USD 200.00', { exact: true }).count(), 0);
        await page.getByLabel('Shipment type').selectOption('FCL');
        await page.getByRole('heading', { name: 'Container pricing' }).waitFor();
        assert.deepEqual(errors, []);
        console.log('PASS: direct Container selection, route reset, all six container configurations, quantity pricing, save/edit persistence, switching back to tiers, and mobile layout.');
    } finally {
        if (browser) await browser.close();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
