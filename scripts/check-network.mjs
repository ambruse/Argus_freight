import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { metadata, schemaFor } from '../src/seo/metadata.mjs';
const require = createRequire(import.meta.url);
const express = require('../backend/node_modules/express');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_PATH).href);
const countries = ['qatar', 'uae', 'china', 'india', 'turkey', 'bahrain'];
const root = path.resolve('dist');
for (const country of countries) {
  const route = `/locations/${country}/`;
  const html = fs.readFileSync(path.join(root, route, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert(html.includes(`href="https://www.argusshipping.co${route}"`));
  const crumbs = schemaFor(route)['@graph'].find(x => x['@type'] === 'BreadcrumbList').itemListElement;
  assert.equal(crumbs[1].name, 'Global Network');
  assert.equal(crumbs[1].item, 'https://www.argusshipping.co/locations/');
  assert(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(`href="${route}"`));
}
const app = express(); app.get('/services', (req, res) => res.sendFile(path.join(root, 'services.html'))); app.use(express.static(root, { extensions: ['html'] }));
const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' }); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    const menu = page.locator('.global-network-access');
    await menu.locator('summary').focus(); await page.keyboard.press('Enter');
    for (const country of countries) assert(await menu.locator(`a[href="/locations/${country}/"]`).isVisible());
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    await page.screenshot({ path: path.join(process.env.TEMP, `argus-network-${width}.png`) });
    await page.keyboard.press('Escape'); assert(!(await menu.locator('details').evaluate(el => el.open)));
    assert(await menu.locator('summary').evaluate(el => el === document.activeElement));
    await menu.locator('summary').click(); await menu.locator('a[href="/locations/qatar/"]').click();
    await page.waitForURL('**/locations/qatar/');
    assert.equal(await page.title(), metadata['/locations/qatar/'].title);
    assert(await page.locator('.network-context a[href="/trade-lanes/china-to-qatar/"]').isVisible());
    await menu.locator('summary').click(); assert.equal(await menu.locator('a[href="/locations/qatar/"]').getAttribute('aria-current'), 'page');
  }
  for (const route of ['/locations/', ...countries.map(x => `/locations/${x}/`), '/services/air-freight/', '/services/road-freight/', '/trade-lanes/china-to-qatar/', '/trade-lanes/china-to-uae/']) {
    const response = await page.goto(base + route, { waitUntil: 'networkidle' }); assert.equal(response.status(), 200);
    const hrefs = await page.locator('.network-context a, .network-hub a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')).filter(h => h.startsWith('/')));
    for (const href of hrefs) assert.equal((await page.request.get(base + href)).status(), 200, href);
  }
  assert.deepEqual(errors, []); console.log('PASS: all six countries discoverable; menu keyboard/Escape/active states; 320–1440px layouts; hub, country, service and trade links; schema and HTML.');
} finally { await browser.close(); server.close(); }
