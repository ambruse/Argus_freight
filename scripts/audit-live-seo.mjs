import fs from 'node:fs';
import { metadata } from '../src/seo/metadata.mjs';
import { SITE } from '../src/seo/commercial-pages.mjs';

// Public GETs only; never request real shipment records or submit enquiries.
const output = process.argv[2] || 'docs/seo/evidence/live-http.json';
const urls = [...Object.keys(metadata).map(p => SITE + p),
  ...['/robots.txt', '/sitemap.xml', '/services/', '/services.html', '/locations',
    '/shipping/china-to-qatar/', '/services/air-freight-qatar/', '/seo-missing-page-check/',
    '/?origin=seo-test&destination=seo-test', '/tracking?ref=seo-test', '/login',
    '/operator/live-rates'].map(p => SITE + p),
  'https://argusshipping.co/', 'http://argusshipping.co/', 'http://www.argusshipping.co/'];
const rows = [];
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null;
async function inspect(url) {
  let target = url;
  const hops = [];
  try {
    for (let n = 0; n < 8; n++) {
      const response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      hops.push({ url: target, status: response.status, location: response.headers.get('location'), robots: response.headers.get('x-robots-tag') });
      if (response.status >= 300 && response.status < 400 && response.headers.has('location')) {
        await response.body?.cancel();
        target = new URL(response.headers.get('location'), target).href;
        continue;
      }
      const html = await response.text();
      const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
      const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
      const schemas = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      const schemaErrors = []; const schemaTypes = [];
      for (const [, value] of schemas) { try { const parsed = JSON.parse(value); schemaTypes.push(...(parsed['@graph'] || [parsed]).map(v => v['@type'])); } catch (e) { schemaErrors.push(e.message); } }
      rows.push({ url, finalUrl: target, hops, status: response.status,
        title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null,
        description: attr(metas.find(t => attr(t, 'name') === 'description') || '', 'content'),
        canonical: attr(links.find(t => attr(t, 'rel') === 'canonical') || '', 'href'),
        robots: attr(metas.find(t => attr(t, 'name') === 'robots') || '', 'content'),
        lang: attr(html.match(/<html\b[^>]*>/i)?.[0] || '', 'lang'),
        h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]*>/g, '')),
        h2Count: (html.match(/<h2\b/gi) || []).length,
        alternates: links.filter(t => attr(t, 'hreflang')).map(t => ({ locale: attr(t, 'hreflang'), url: attr(t, 'href') })),
        internalLinks: [...new Set([...html.matchAll(/<a\b[^>]*href=["'](\/[^"']*)["']/gi)].map(m => m[1]))],
        images: [...html.matchAll(/<img\b[^>]*>/gi)].map(m => ({src: attr(m[0], 'src'), alt: attr(m[0], 'alt'), width: attr(m[0], 'width'), height: attr(m[0], 'height'), loading: attr(m[0], 'loading')})),
        schemaTypes, schemaErrors, bytes: Buffer.byteLength(html),
        ...(target.endsWith('/robots.txt') || target.endsWith('/sitemap.xml') ? { body: html } : {}) });
      return;
    }
    rows.push({ url, hops, error: 'Redirect limit exceeded' });
  } catch (e) { rows.push({ url, hops, error: e.message, cause: e.cause?.code }); }
}
const queue = [...new Set(urls)];
await Promise.all(Array.from({length: 4}, async () => { while (queue.length) await inspect(queue.shift()); }));
fs.mkdirSync(new URL('../docs/seo/evidence/', import.meta.url), {recursive: true});
fs.writeFileSync(output, JSON.stringify({capturedAt: new Date().toISOString(), scope: 'Public source HTML and HTTP; no authenticated data or field metrics', pages: rows.sort((a,b)=>a.url.localeCompare(b.url))}, null, 2) + '\n');
console.log(JSON.stringify({output, checked: rows.length, failures: rows.filter(r => r.error), statusCounts: rows.reduce((counts,r)=>(counts[r.status || 'error']=(counts[r.status || 'error']||0)+1,counts),{})}));
