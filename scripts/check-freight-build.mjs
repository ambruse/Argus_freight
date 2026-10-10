import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { metadata } from '../src/seo/metadata.mjs';
const directory = path.resolve(process.argv[2] || 'dist');
const internalDirectory = process.argv[3] && path.resolve(process.argv[3]);
const file = route => route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : `${route.slice(1)}.html`;
const read = route => fs.readFileSync(path.join(directory,file(route)),'utf8');
const capture = (html,regex) => html.match(regex)?.[1];
const invariants = [/<title>(.*?)<\/title>/s, /<meta name="description" content="([^"]*)"/, /<link rel="canonical" href="([^"]*)"/, /<h1\b[^>]*>(.*?)<\/h1>/s];
for (const route of Object.keys(metadata)) {
  const html = read(route);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${route} must have one H1`);
  for (const [,asset] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)) assert.ok(fs.existsSync(path.join(directory,asset)),`Missing asset ${asset}`);
  if (route !== '/freight-rates') {
    const original = execFileSync('git',['show',`HEAD:dist/${file(route)}`],{encoding:'utf8',maxBuffer:4*1024*1024});
    for (const regex of invariants) assert.equal(capture(html,regex),capture(original,regex),`${route}: existing SEO/H1 changed`);
  }
}
assert.ok(read('/').includes('THIS WEEK&#x27;S FREIGHT RATES'));
assert.ok(read('/freight-rates').includes('https://www.argusshipping.co/freight-rates'));
assert.ok(fs.readFileSync(path.join(directory,'sitemap.xml'),'utf8').includes('/freight-rates</loc>'));
if (internalDirectory) {
  for (const route of ['operator/freight-rates','admin/freight-rates']) {
    const html = fs.readFileSync(path.join(internalDirectory,`${route}.html`),'utf8');
    assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
    assert.ok(!html.includes('sample_operator'));
  }
}
console.log(`PASS: ${Object.keys(metadata).length} public pages; existing titles, descriptions, H1s and canonicals unchanged; new freight page, homepage section and assets verified${internalDirectory ? '; private dashboard exports noindex' : ''}.`);
