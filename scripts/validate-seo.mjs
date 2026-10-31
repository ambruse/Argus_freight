import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { metadata, breadcrumbsFor } from '../src/seo/metadata.mjs';
import { byPath, SITE, tradePages } from '../src/seo/commercial-pages.mjs';
import { canonicalUrl } from '../src/seo/urls.mjs';
import { alternatesFor, pageRegistry, locales, validateInternational } from '../src/seo/international.mjs';

const dir = path.resolve(process.argv[2] || 'dist');
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../shared/public-page-paths.json',import.meta.url),'utf8')),Object.keys(metadata).sort(),'Analytics route allowlist must match public registry');
const fileFor = route => path.join(dir, route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : `${route.slice(1)}.html`);
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const decode = text => text.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
assert.deepEqual(validateInternational(), []);
const titles = new Set(), descriptions = new Set(), incoming = new Set();
const sitemap = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(sitemapUrls.sort(), Object.keys(metadata).map(canonicalUrl).sort(), 'Sitemap must contain exactly canonical public pages once');
assert(!sitemap.includes('hreflang'), 'Use one annotation method: HTML head');
let checkedLinks = 0;
for (const [route, page] of Object.entries(metadata)) {
  const html = fs.readFileSync(fileFor(route), 'utf8');
  const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
  assert.equal(title, page.title, `${route}: title`);
  assert(title && !titles.has(title), `${route}: duplicate/empty title`); titles.add(title);
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
  assert.equal(description, page.description, `${route}: description`);
  assert(description && !descriptions.has(description), `${route}: duplicate/empty description`); descriptions.add(description);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route}: one H1`);
  if (byPath[route]) assert.equal(decode(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), byPath[route].h1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert(html.includes(`rel="canonical" href="${canonicalUrl(route)}"`), `${route}: canonical`);
  assert(!/<meta[^>]+(?:name="robots"[^>]+content="[^"]*noindex|content="[^"]*noindex[^>]+name="robots")/.test(html), `${route}: noindex`);
  const locale = locales[pageRegistry[route].locale];
  assert(html.includes(`<html lang="${locale.language}" dir="${locale.dir}"`), `${route}: language/direction`);
  const head = html.split('</head>')[0];
  const observed = [...head.matchAll(/<link\b[^>]*hreflang="[^"]*"[^>]*>/g)].map(m => ({locale: attr(m[0], 'hreflang'), url: attr(m[0], 'href')}));
  assert.deepEqual(observed, alternatesFor(route).map(({locale,url})=>({locale,url})), `${route}: exact alternate set`);
  for (const alternate of alternatesFor(route)) {
    assert(fs.existsSync(fileFor(alternate.path)), `${route}: missing alternate file`);
    if (alternate.locale !== 'x-default') assert(html.includes(`href="${alternate.path}"`), `${route}: missing crawlable language link`);
  }
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  assert.equal(schemas.length, 1, `${route}: one JSON-LD graph`);
  const data = JSON.parse(schemas[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  const graph = data['@graph'];
  assert(graph.some(item => item['@type'] === 'Organization'));
  assert.equal(graph.find(item => item['@type'] === 'WebPage').url, canonicalUrl(route));
  const expectedCrumbs = breadcrumbsFor(route);
  if (expectedCrumbs.length) {
    const crumbs = graph.find(item => item['@type'] === 'BreadcrumbList');
    assert.deepEqual(crumbs.itemListElement.map(c => ({name:c.name,item:c.item})), expectedCrumbs.map(c=>({name:c.name,item:canonicalUrl(c.path)})));
    for (const crumb of crumbs.itemListElement) assert(metadata[new URL(crumb.item).pathname], `${route}: missing breadcrumb parent`);
    assert(html.includes('aria-label="Breadcrumb"'));
  }
  for (const business of graph.filter(item=>item['@type']==='LocalBusiness')) {
    assert(business.telephone && business.address?.addressCountry && business.address.addressLocality);
    assert(html.includes(business.telephone), `${route}: invisible business telephone`);
  }
  if (['services', 'trade-lanes', 'industries'].includes(byPath[route]?.group)) assert.equal(graph.find(item=>item['@type']==='Service')?.url, canonicalUrl(route));
  for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)) {
    if (href.startsWith('//')) continue;
    if (metadata[href]) { assert(fs.existsSync(fileFor(href)), `${route}: missing ${href}`); incoming.add(href); checkedLinks++; }
    else assert(/^\/(?:login|register|customer\/rfq\/new)$/.test(href), `${route}: unknown internal anchor ${href}`);
  }
  for (const [, asset] of html.matchAll(/(?:src|href)="(\/(?:assets|images)\/[^"?]+)"/g)) assert(fs.existsSync(path.join(dir, asset)), `${route}: missing asset ${asset}`);
  for (const [img] of html.matchAll(/<img\b[^>]*>/g)) assert(attr(img, 'alt') !== undefined, `${route}: missing alt`);
  assert(!html.includes('<script async src="https://www.googletagmanager.com'), 'No unconditional analytics loader');
}
const hub = fs.readFileSync(fileFor('/trade-lanes/'), 'utf8');
assert.equal(tradePages.length, 6);
for (const page of tradePages) assert(hub.includes(`href="${page.path}"`), `Directory omits ${page.path}`);
const robots = fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8');
assert(robots.includes(`Sitemap: ${SITE}/sitemap.xml`));
assert(!/^Disallow:\s*\/$/m.test(robots));
assert(robots.includes('Disallow: /api/'));
const orphanExceptions = Object.keys(metadata).filter(p => /^\/(industries|resources|case-studies|insights)\//.test(p));
assert.deepEqual(Object.keys(metadata).filter(p => !incoming.has(p)).sort(), orphanExceptions.sort(), 'Unexpected orphan; existing content-review backlog is explicit');
for (const file of ['login.html', 'operator/live-rates.html', 'customer/rfq/new.html']) {
  const target = path.join(dir, file);
  if (fs.existsSync(target)) assert(/name="robots" content="noindex, nofollow"/.test(fs.readFileSync(target,'utf8')), `${file}: portal must remain noindex`);
}
console.log(`PASS: ${Object.keys(metadata).length} public pages; exact sitemap/canonicals, language/alternates, titles/H1, schema, assets, ${checkedLinks} internal links; all six lanes. ${orphanExceptions.length} existing content-review orphans reported, not hidden.`);
