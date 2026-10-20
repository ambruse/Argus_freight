// Optional real-browser smoke test. Uses only a disposable loopback database.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), os = require('os');
const mysql = require('mysql2/promise'), express = require('express'), jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { createRouter } = require('../src/live/router');
const { createStore } = require('../src/live/store');
const { createEnquiries } = require('../src/live/enquiries');
(async () => {
    if (!process.env.LIVE_TEST_DB_PASSWORD || !process.env.LIVE_TEST_PLAYWRIGHT || !process.env.LIVE_TEST_EXPORT)
        throw Error('Set LIVE_TEST_DB_PASSWORD, LIVE_TEST_PLAYWRIGHT and LIVE_TEST_EXPORT.');
    const { chromium } = require(process.env.LIVE_TEST_PLAYWRIGHT);
    const rootDir = path.resolve(__dirname, '../..'), database = 'argus_live_browser_' + randomUUID().replaceAll('-', '');
    const connection = { host: '127.0.0.1', port: Number(process.env.LIVE_TEST_DB_PORT || 3309), user: 'root', password: process.env.LIVE_TEST_DB_PASSWORD, dateStrings: true, timezone: 'Z' };
    const root = await mysql.createConnection(connection);
    let pool, server, browser;
    try {
        await root.query(`CREATE DATABASE \`${database}\``);
        pool = mysql.createPool({ ...connection, database });
        await pool.query('CREATE TABLE users (id INT PRIMARY KEY,username VARCHAR(80),role VARCHAR(20),is_deleted BOOLEAN DEFAULT 0,is_stalled BOOLEAN DEFAULT 0)');
        await pool.query("INSERT INTO users(id,username,role) VALUES (1,'Browser operator','operator'),(2,'Browser admin','admin')");
        await pool.query('CREATE TABLE app_settings (`key` VARCHAR(255) PRIMARY KEY,value TEXT)');
        process.env.JWT_SECRET = randomUUID();
        const token = id => jwt.sign({ id }, process.env.JWT_SECRET);
        const store = createStore(pool);
        await store.ready();
        const sentEnquiries = [];
        let failEmail = false;
        const enquiryOptions = { transportFactory: () => ({ verify: async () => {}, sendMail: async message => { if (failEmail) throw Object.assign(new Error('Test connection failure'), { code: 'ECONNREFUSED' }); sentEnquiries.push(message); return { accepted: [message.to] }; }, close() {} }) };
        const enquiryService = createEnquiries(pool, store, enquiryOptions);
        const enquirySettings = await enquiryService.settings();
        await enquiryService.saveSettings({ id: 2, role: 'admin' }, { ...enquirySettings, enabled: true, email: 'sender@example.com', password: 'browser-fixture-only', recipients: [{ email: 'one@example.com', country: '' }, { email: 'two@example.com', country: '' }] });
        const engine = await import('../../shared/livePricing.mjs');
        const day = engine.today();
        const base = { origin_id: 'AIR_AF18BA28993F9D2C6F85', destination_id: 'AIR_016AED1CA67AF616E11B', mode: 'AIR', carrier: 'Browser fixture', service: 'General', currency: 'USD', valid_from: day, valid_until: day, model: 'KG', tiers: [{ minimum: 0, price: 2 }], inclusions: ['Freight'], exclusions: ['At actuals'] };
        const op = { id: 1, role: 'operator' }, admin = { id: 2, role: 'admin' };
        async function published(config) { const r = await store.save(op, { config }); await store.action(op, r.id, { version: 1, action: 'submit' }); await store.action(admin, r.id, { version: 1, action: 'approve' }); }
        await published(base);
        for (const size of ['20', '40', '40HQ'])
            for (const equipment of ['DRY', 'REEFER'])
                await published({ ...base, origin_id: 'CNSHA', destination_id: 'QAHMD', mode: 'SEA', subtype: 'FCL', size, equipment, model: 'CONTAINER', tiers: [{ minimum: 0, price: 100 }] });
        await published({ ...base, origin_id: 'CNSHA', destination_id: 'QAHMD', mode: 'SEA', subtype: 'LCL', model: 'WM', tiers: [{ minimum: 0, price: 10 }] });
        const road1 = await store.road(op, { country: 'Qatar', name: 'Doha test depot' }), road2 = await store.road(op, { country: 'Saudi Arabia', name: 'Riyadh test depot' });
        await published({ ...base, origin_id: road1.id, destination_id: road2.id, mode: 'TRUCK', subtype: 'LTL', truck: 'Box', model: 'CBM', tiers: [{ minimum: 0, price: 10 }] });
        const app = express();
        app.use('/api/live-pricing', createRouter(pool, Promise.resolve(), enquiryOptions));
        app.get('/api/auth/me', (req, res) => { const user = jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET); res.json({ success: true, user: { id: user.id, username: user.id === 1 ? 'Browser operator' : 'Browser admin', role: user.id === 1 ? 'operator' : 'admin' } }); });
        app.use('/api', (req, res) => res.json({ success: true, data: [], count: 0, shipments: [] }));
        app.use(express.static(path.join(rootDir, 'dist'), { extensions: ['html'] }));
        app.use(express.static(process.env.LIVE_TEST_EXPORT, { extensions: ['html'] }));
        server = app.listen(0, '127.0.0.1');
        await new Promise(r => server.once('listening', r));
        const url = `http://127.0.0.1:${server.address().port}`;
        browser = await chromium.launch({ executablePath: process.env.LIVE_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        await page.addInitScript(() => localStorage.setItem('theme', 'light'));
        async function location(label, query, name) { const input = page.getByRole('combobox', { name: label, exact: true }); await input.fill(query); await page.getByRole('option').filter({ hasText: name }).first().click(); }
        await page.goto(url);
        const calc = page.locator('.live-calculator').last();
        async function contactStep() {
            assert.equal(await calc.locator('.live-cargo').count(), 0);
            await calc.getByLabel('Name', { exact: true }).fill('Browser Customer');
            await calc.getByLabel('Phone number', { exact: true }).fill('55551234');
            await calc.getByLabel('Email address', { exact: true }).fill('visitor@example.com');
            await calc.getByRole('button', { name: 'Continue', exact: true }).click();
            await calc.getByRole('heading', { name: 'Live Freight Rates', exact: true }).waitFor();
        }
        await location('POL / Origin', 'Pudong', 'Shanghai Pudong');
        await location('POD / Destination', 'Hamad', 'Hamad International');
        await calc.getByRole('button', { name: 'AIR', exact: true }).click();
        await calc.getByRole('button', { name: 'Search', exact: true }).click();
        await contactStep();
        await calc.getByLabel('Length', { exact: true }).fill('10');
        await calc.getByLabel('Width', { exact: true }).fill('10');
        await calc.getByLabel('Height', { exact: true }).fill('10');
        await calc.getByLabel('Total line weight', { exact: true }).fill('10');
        await calc.getByRole('button', { name: 'Add More Cargo' }).click();
        assert.equal(await calc.locator('fieldset').count(), 2);
        await calc.getByRole('button', { name: 'Remove cargo 2' }).click();
        await calc.getByRole('button', { name: 'Check Price', exact: true }).click();
        await calc.getByText('USD 20.00', { exact: true }).first().waitFor();
        const booking = await calc.getByRole('link', { name: 'Request Booking' }).getAttribute('href');
        assert.ok(booking.includes('live_quote='));
        const shots = path.join(os.tmpdir(), 'argus-live-browser-evidence');
        fs.mkdirSync(shots, { recursive: true });
        await calc.screenshot({ path: path.join(shots, 'air-desktop.png') });
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            assert.ok(await calc.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
            await calc.screenshot({ path: path.join(shots, `air-mobile-${width}.png`) });
        }
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.goto(url);
        await location('POL / Origin', 'Shanghai', 'Port of Shanghai');
        await location('POD / Destination', 'Hamad', 'Hamad Port');
        await calc.getByRole('button', { name: 'SEA', exact: true }).click();
        await calc.getByRole('button', { name: 'Search', exact: true }).click();
        await contactStep();
        await calc.getByRole('button', { name: 'FCL Full container load' }).click();
        await calc.getByLabel('Container size').selectOption('40HQ');
        await calc.getByLabel('Container type').selectOption('REEFER');
        await calc.getByLabel('Number of containers').fill('2');
        assert.equal(await calc.locator('.live-cargo').count(), 0);
        await calc.getByRole('button', { name: 'Check Price', exact: true }).click();
        await calc.getByText('USD 200.00', { exact: true }).first().waitFor();
        await calc.getByRole('button', { name: 'LCL Less than container load' }).click();
        await calc.getByLabel('Volume entry').selectOption('CBM');
        await calc.getByLabel('Total line volume (m³)').fill('2');
        await calc.getByLabel('Total line weight', { exact: true }).fill('500');
        await calc.getByRole('button', { name: 'Check Price', exact: true }).click();
        await calc.getByText('USD 20.00', { exact: true }).first().waitFor();
        await page.goto(url);
        await location('POL / Origin', 'Doha test', 'Doha test depot');
        await location('POD / Destination', 'Riyadh test', 'Riyadh test depot');
        await calc.getByRole('button', { name: 'TRUCK', exact: true }).click();
        await calc.getByRole('button', { name: 'Search', exact: true }).click();
        await contactStep();
        await calc.getByLabel('Truck / load class').selectOption('Box');
        await calc.getByLabel('Volume entry').selectOption('CBM');
        await calc.getByLabel('Total line volume (m³)').fill('3');
        await calc.getByLabel('Total line weight', { exact: true }).fill('100');
        await calc.getByRole('button', { name: 'Check Price', exact: true }).click();
        await calc.getByText('USD 30.00', { exact: true }).first().waitFor();
        await page.evaluate(t => { localStorage.setItem('freight_token', t); localStorage.setItem('freight_user', JSON.stringify({ id: 1, username: 'Browser operator', role: 'operator' })); }, token(1));
        await page.goto(url + '/operator/live-rates');
        await page.getByRole('button', { name: 'Add rate', exact: false }).click();
        await location('Origin', 'Pudong', 'Shanghai Pudong');
        await location('Destination', 'Hamad', 'Hamad International');
        await page.getByLabel('Carrier / shipping line').fill('Browser-created tariff');
        await page.getByLabel('Comparable service name').fill('General');
        await page.getByLabel('Valid from (Qatar)').fill(day);
        await page.getByLabel('Valid until (Qatar)').fill(day);
        await page.getByLabel('Price (QAR) per kg', { exact: true }).fill('3.65');
        await page.getByLabel('Included charges / conditions (one per line)').fill('Freight');
        await page.getByLabel('Excluded charges / conditions (one per line)').fill('At actuals');
        await page.getByLabel('Total cargo CBM').fill('0.001');
        await page.getByLabel('Total actual kg').fill('10');
        await page.getByRole('button', { name: 'Preview calculation', exact: true }).click();
        await page.getByText('USD 10.00', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Save & submit for approval' }).click();
        await page.getByText('Submitted for administrator approval.').waitFor();
        assert.ok((await store.list(op, {})).rows.some(r => r.config.carrier === 'Browser-created tariff' && r.status === 'pending'));
        await page.evaluate(t => { localStorage.setItem('freight_token', t); localStorage.setItem('freight_user', JSON.stringify({ id: 2, username: 'Browser admin', role: 'admin' })); }, token(2));
        await page.reload();
        const article = page.locator('article').filter({ hasText: 'Browser-created tariff' });
        await article.getByRole('button', { name: 'Approve & publish' }).click();
        await article.getByText('APPROVED', { exact: false }).waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        await article.getByRole('button', { name: 'Review / Edit' }).click();
        assert.ok(await page.locator('.live-admin').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({ path: path.join(shots, 'operator-mobile.png'), fullPage: true });
        await page.goto(url + booking);
        await page.getByLabel('Additional Notes', { exact: false }).count().catch(() => { });
        await page.waitForFunction(() => Array.from(document.querySelectorAll('input,textarea')).some(x => x.value.includes('Live freight enquiry')));
        assert.ok(await page.locator('input,textarea').evaluateAll(items => items.some(x => x.value.includes('USD 20.00'))));
        const guest = await browser.newContext();
        const guestPage = await guest.newPage();
        await guestPage.goto(url + booking);
        await guestPage.waitForURL('**/login');
        assert.ok(await guestPage.evaluate(()=>sessionStorage.getItem('argus_live_enquiry')));
        await guestPage.evaluate(t=>{
            localStorage.setItem('freight_token',t);
            localStorage.setItem('freight_user',JSON.stringify({id:1,username:'Browser operator',role:'operator'}));
        },token(1));
        await guestPage.reload();
        await guestPage.waitForURL('**/customer/rfq/new');
        await guestPage.waitForFunction(()=>document.querySelector('input[name="note"]')?.value.includes('Live freight enquiry'));
        await guest.close();
        const existing=(await store.list(admin,{})).rows;
        for(const r of existing)if(r.status==='approved')await store.action(admin,r.id,{version:r.version,action:'inactive'});
        await page.goto(url);
        await location('POL / Origin','Pudong','Shanghai Pudong');
        await location('POD / Destination','Hamad','Hamad International');
        await calc.getByRole('button',{name:'AIR',exact:true}).click();
        await calc.getByRole('button',{name:'Search',exact:true}).click();
        await contactStep();
        await calc.getByLabel('Volume entry').selectOption('CBM');
        await calc.getByLabel('Total line volume (m³)').fill('1');
        await calc.getByLabel('Total line weight',{exact:true}).fill('100');
        await calc.getByRole('button',{name:'Check Price',exact:true}).click();
        await calc.getByText('Live pricing is currently unavailable for this shipment. Request a custom quotation.').waitFor();
        assert.equal(await calc.locator('.live-amount').count(),0);
        assert.equal(sentEnquiries.length, 4);
        assert.deepEqual(sentEnquiries.map(m => m.to), ['one@example.com','two@example.com','one@example.com','two@example.com']);
        await pool.query('DELETE FROM live_request_limits');
        await calc.getByRole('button', { name: 'Close calculator' }).click();
        await calc.getByRole('button', { name: 'Search', exact: true }).click();
        await calc.getByLabel('Email address', { exact: true }).fill('retry@example.com');
        await page.setViewportSize({ width: 320, height: 844 });
        assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({ path: path.join(shots, 'contact-mobile.png') });
        failEmail = true;
        await calc.getByRole('button', { name: 'Continue', exact: true }).click();
        await calc.getByRole('alert').waitFor();
        assert.equal(await calc.locator('.live-cargo').count(), 0);
        failEmail = false;
        await calc.getByRole('button', { name: 'Continue', exact: true }).click();
        await calc.getByRole('heading', { name: 'Live Freight Rates', exact: true }).waitFor();
        assert.equal(sentEnquiries.length, 5);
        await calc.getByRole('button', { name: 'Close calculator' }).click();
        await calc.getByRole('button', { name: 'Search', exact: true }).click();
        await calc.getByRole('button', { name: 'Continue', exact: true }).click();
        await calc.getByRole('heading', { name: 'Live Freight Rates', exact: true }).waitFor();
        assert.equal(sentEnquiries.length, 5);
        await page.setViewportSize({ width: 1440, height: 1050 });
        await page.goto(url + '/settings');
        const enquiryCard = page.getByRole('region', { name: 'Live Calculator — Enquiry Email' });
        await enquiryCard.getByLabel('Sender / SMTP email').waitFor();
        assert.equal(await enquiryCard.getByLabel('Sender / SMTP email').inputValue(), 'sender@example.com');
        assert.equal(await enquiryCard.getByLabel('SMTP password / app password').inputValue(), '');
        await enquiryCard.getByRole('button', { name: 'Add operator email' }).click();
        await enquiryCard.getByLabel('Operator email 3').fill('country@example.com');
        await enquiryCard.getByLabel('Country 3').selectOption('Qatar');
        await enquiryCard.getByRole('button', { name: 'Save enquiry settings' }).click();
        await enquiryCard.getByRole('status').waitFor();
        assert.equal((await enquiryService.settings()).recipients[2].country, 'Qatar');
        await enquiryCard.getByRole('button', { name: 'Remove recipient 3' }).click();
        await enquiryCard.getByRole('button', { name: 'Save enquiry settings' }).click();
        await enquiryCard.getByRole('status').waitFor();
        assert.equal((await enquiryService.settings()).recipients.length, 2);
        await enquiryCard.screenshot({ path: path.join(shots, 'enquiry-settings.png') });
        assert.ok(sentEnquiries.every(message => message.text.includes('Name: Browser Customer')));
        assert.deepEqual(errors, []);
        console.log('Browser checks passed: AIR, LCL, FCL, TRUCK, 320/390px, operator submission, admin approval, RFQ prefill across login, unavailable prices. Screenshots: ' + shots);
    }
    catch (error) {
        if (browser) {
            const p = browser.contexts()[0]?.pages()[0];
            if (p) {
                await p.screenshot({ path: path.join(os.tmpdir(), 'argus-live-browser-failure.png'), fullPage: true });
                console.error((await p.locator('body').innerText()).slice(-5000));
            }
        }
        throw error;
    }
    finally {
        if (browser)
            await browser.close();
        if (server) {
            server.closeAllConnections();
            await new Promise(r => server.close(r));
        }
        if (pool)
            await pool.end();
        try {
            await root.query(`DROP DATABASE \`${database}\``);
        }
        finally {
            await root.end();
        }
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
