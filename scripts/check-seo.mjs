import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { metadata } from '../src/seo/metadata.mjs';
import { byPath, SITE } from '../src/seo/commercial-pages.mjs';
const dir = path.resolve(process.argv[2] || 'dist');
const fileFor = route => path.join(dir, route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : `${route.slice(1)}.html`);
const titles = new Set();
const descriptions = new Set();
const sitemap = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
const decode = text => text.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
let checkedLinks = 0;
for (const [route, page] of Object.entries(metadata)) {
  const html = fs.readFileSync(fileFor(route), 'utf8');
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
  assert.equal(title, page.title, `${route}: title mismatch`);
  assert(!titles.has(title), `${route}: duplicate title`); titles.add(title);
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
  assert.equal(description, page.description, `${route}: description mismatch`);
  assert(!descriptions.has(description), `${route}: duplicate description`); descriptions.add(description);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route}: needs one visible H1`);
  if (byPath[route]) assert.equal(decode(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), byPath[route].h1);
  assert(html.includes(`rel="canonical" href="${SITE}${route}"`), `${route}: canonical`);
  assert(!/<meta[^>]+(?:name="robots"[^>]+content="[^"]*noindex|content="[^"]*noindex[^>]+name="robots")/.test(html), `${route}: noindex`);
  assert(sitemap.includes(`<loc>${SITE}${route}</loc>`), `${route}: sitemap`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  assert.equal(schemas.length, 1, `${route}: schema count`);
  const graph = JSON.parse(schemas[0][1])['@graph'];
  if (byPath[route]) {
    const crumbs = graph.find(item => item['@type'] === 'BreadcrumbList');
    assert.equal(crumbs.itemListElement.at(-1).item, SITE + route);
    assert.equal(graph.find(item => item['@type'] === 'Service').url, SITE + route);
    assert(html.includes('aria-label="Breadcrumb"'));
  }
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    if (href.startsWith('//')) continue;
    if (metadata[href]) { assert(fs.existsSync(fileFor(href)), `${route}: missing linked page ${href}`); checkedLinks++; }
    else if (href.startsWith('/services/') || href.startsWith('/shipping/')) assert.fail(`${route}: unknown commercial link ${href}`);
  }
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)) assert(fs.existsSync(path.join(dir, asset)), `${route}: missing asset ${asset}`);
}
assert(fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8').includes(`Sitemap: ${SITE}/sitemap.xml`));
const homepage = fs.readFileSync(fileFor('/'), 'utf8');
assert(homepage.includes('Freight Forwarding &amp; Logistics Company in Qatar'));
assert(homepage.includes('home-slider-air.png') && homepage.includes('freight-slider'), 'Current slider missing from build');
console.log(`PASS: ${Object.keys(metadata).length} pages; unique metadata, one H1, canonicals, schema, sitemap, assets and ${checkedLinks} internal links. Current slider included.`);
