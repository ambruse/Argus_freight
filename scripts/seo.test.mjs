import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { canonicalUrl } from '../src/seo/urls.mjs';
import { alternatesFor, validateInternational, pageRegistry, parityChecks } from '../src/seo/international.mjs';
import { trackEvent, rememberLanding } from '../shared/analytics.mjs';
import { installAnalyticsConsent } from '../shared/analytics-consent.mjs';
const require = createRequire(import.meta.url);
const { shouldNoindex, seoHeaders } = require('../shared/seo-policy.cjs');
const fixture = () => ({
  '/example/': {entity:'example',locale:'en',status:'published-source',indexable:true,canonical:canonicalUrl('/example/')},
  '/ar/example/': {entity:'example',locale:'ar',status:'approved-translation',indexable:true,canonical:canonicalUrl('/ar/example/'),translation:{source:'/example/',reviewer:'Fixture editor',reviewedOn:'2026-10-31',parity:Object.fromEntries(parityChecks.map(key=>[key,true]))}},
});
const manifest = { '/example/':{title:'English fixture',description:'Fixture'}, '/ar/example/':{title:'Arabic fixture',description:'Fixture'} };
test('current countries are separate entities; no placeholder alternates', () => {
  assert.deepEqual(validateInternational(), []);
  for (const route of Object.keys(pageRegistry)) assert.deepEqual(alternatesFor(route), []);
  assert.notEqual(pageRegistry['/locations/qatar/'].entity, pageRegistry['/locations/uae/'].entity);
});
test('approved fixture produces exact reciprocal sets with self references', () => {
  const registry = fixture();
  assert.deepEqual(validateInternational(registry,manifest), []);
  assert.deepEqual(alternatesFor('/example/',registry), alternatesFor('/ar/example/',registry));
  assert.equal(alternatesFor('/example/',registry).length, 2);
});
test('reject invalid locale, cross-canonical, noindex, redirected, missing and unapproved alternatives', () => {
  for (const patch of [{locale:'en-UK'}, {locale:'QA'}, {locale:'zz'}, {canonical:canonicalUrl('/example/')}, {indexable:false}, {redirect:'/elsewhere'}, {status:'draft'}, {translation:null}]) {
    const registry = fixture(); Object.assign(registry['/ar/example/'],patch);
    assert(validateInternational(registry,manifest).length > 0, JSON.stringify(patch));
  }
  const registry = fixture(); registry['/ar/example/'].translation.parity.body = false;
  assert(validateInternational(registry,manifest).some(e=>e.includes('parity')));
  assert(validateInternational(fixture(), {'/example/':manifest['/example/']}).some(e=>e.includes('missing rendered')));
});
test('x-default needs one real equivalent fallback and documented purpose', () => {
  const registry = fixture(); registry['/example/'].fallback = true;
  assert(validateInternational(registry,manifest).some(e=>e.includes('fallback purpose')));
  registry['/example/'].fallbackPurpose = 'Explicit source-language fallback';
  assert.deepEqual(validateInternational(registry,manifest), []);
  assert.equal(alternatesFor('/ar/example/',registry).at(-1).url, canonicalUrl('/example/'));
});
test('canonicals retain URL policy and reject unsafe or parameter URLs', () => {
  assert.equal(canonicalUrl('/services'), 'https://www.argusshipping.co/services');
  for (const route of ['//example.com/','https://example.com/','/x?q=1','/x#y','/a/../b','/a\\b']) assert.throws(()=>canonicalUrl(route));
});
test('private/query policy preserves public routes and campaigns', () => {
  for (const url of ['/','/services','/locations/qatar/','/tracking','/?utm_source=test&gclid=test']) assert.equal(shouldNoindex(url),false,url);
  for (const url of ['/api/track/synthetic','/api/live-pricing/quotes/synthetic','/operator/live-rates','/Quotation.html','/customer/rfq/new?live_quote=synthetic','/?origin=a&destination=b','/tracking?ref=synthetic','/?utm_source=x&ref=synthetic','/?anything=value']) assert.equal(shouldNoindex(url),true,url);
});
test('response middleware works for API success and failure without altering bodies', async () => {
  const express = require('../backend/node_modules/express');
  const app=express(); app.use(seoHeaders);
  app.get('/api/track/synthetic',(_,res)=>res.json({success:false}));
  app.get('/api/live-pricing/quotes/synthetic',(_,res)=>res.status(404).json({available:false}));
  app.get('/',(_,res)=>res.send('public'));
  const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const url of ['/api/track/synthetic','/api/live-pricing/quotes/synthetic','/?ref=synthetic']) assert.equal((await fetch(base+url)).headers.get('x-robots-tag'),'noindex, nofollow');
    assert.equal((await fetch(base+'/')).headers.get('x-robots-tag'),null);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
function fakeWindow() {
  const data=new Map();
  global.window={location:{pathname:'/locations/qatar/',search:'?ref=PRIVATE'},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
  return data;
}
test('events require consent and discard arbitrary context, identifiers and private URLs', () => {
  const data=fakeWindow(); const sent=[];
  window.argusAnalytics={consent:false,sink:p=>sent.push(p)};
  assert.equal(trackEvent('quote_success'),false); assert.equal(data.size,0);
  window.argusAnalytics.consent=true; rememberLanding();
  trackEvent('quote_success',{email:'secret@example.com',reference:'PRIVATE',country:'QA',service:'air-freight',weight:'999'});
  assert.deepEqual(sent[0],{event:'quote_success',page_path:'/locations/qatar/',landing_page:'/locations/qatar/',country:'QA',service:'air-freight'});
  window.location.pathname='/private/PRIVATE'; trackEvent('rate_search',{country:'PRIVATE',service:'PRIVATE'});
  assert.equal(sent[1].page_path,'unknown'); assert.equal(sent[1].country,'unknown');
  assert(!JSON.stringify(sent).includes('PRIVATE')); assert(!JSON.stringify(sent).includes('secret'));
  window.argusAnalytics.consent=false; assert.equal(trackEvent('call_click'),false); assert.equal(data.size,0);
  window.argusAnalytics={consent:true,sink:()=>{throw Error('offline');}};
  assert.equal(trackEvent('call_click'),false);
  delete global.window;
});
test('GA loader waits for explicit opt-in; revocation disables collection', () => {
  fakeWindow(); const scripts=[];
  global.document={createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
  installAnalyticsConsent(); assert.equal(scripts.length,0);
  window.setArgusAnalyticsConsent('yes'); assert.equal(scripts.length,0);
  window.setArgusAnalyticsConsent(true); assert.equal(scripts.length,1);
  window.setArgusAnalyticsConsent(true); assert.equal(scripts.length,1);
  assert.equal(window.dataLayer.find(args=>args[0]==='config')[2].send_page_view,false);
  window.setArgusAnalyticsConsent(false); assert.equal(window['ga-disable-G-TCQ42VNDBF'],true);
  assert.equal(trackEvent('quote_submit'),false);
  delete global.window; delete global.document;
});
