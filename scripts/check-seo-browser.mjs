import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { metadata } from '../src/seo/metadata.mjs';
const require = createRequire(import.meta.url);
const express = require('../backend/node_modules/express');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_PATH).href);
const app = express();
const root = path.resolve('frontend/out');
app.get('/services', (req, res) => req.path.endsWith('/') ? res.redirect(301, '/services') : res.sendFile(path.join(root, 'services.html')));
app.use(express.static(root, { extensions: ['html'] }));
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.on('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, data] of Object.entries(metadata)) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.title(), data.title, route);
      assert.equal(await page.locator('h1').count(), 1, route);
      assert(await page.locator('h1').isVisible(), route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert(!overflow, `${route}: overflow at ${width}`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://www.argusshipping.co${route}`);
    }
  }
  for (const width of [320, 375, 430, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/services/air-freight-qatar/', '/shipping/china-to-qatar/']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${route}: overflow at ${width}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('a[href="/services/air-freight-qatar/"]').first().click();
  await page.waitForURL('**/services/air-freight-qatar/');
  await page.waitForFunction(() => document.title === 'Air Freight Services in Qatar | Argus Shipping');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Freight Forwarding & Logistics Company in Qatar');
  const missing = await page.request.get(base + '/services/nonexistent-freight-qatar/');
  assert.equal(missing.status(), 404);
  const oldHub = await page.request.get(base + '/services/', { maxRedirects: 0 });
  assert.equal(oldHub.status(), 301);
  assert.equal(oldHub.headers().location, '/services');
  await page.goto(base + '/shipping/china-to-qatar/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(process.env.TEMP || '.', 'argus-seo-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/services/air-freight-qatar/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(process.env.TEMP || '.', 'argus-seo-mobile.png'), fullPage: true });
  assert.deepEqual(errors, [], 'Browser errors');
  console.log('PASS: 23 pages at desktop/mobile; new templates at 7 further widths; SPA navigation/back, canonical updates, 404, hub redirect and no page errors. Screenshots saved in TEMP.');
} finally { await browser.close(); server.close(); }
