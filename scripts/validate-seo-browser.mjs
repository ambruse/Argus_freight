import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { metadata } from '../src/seo/metadata.mjs';
import { SITE, tradePages } from '../src/seo/commercial-pages.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '../.seo-audit-sandbox/node_modules/playwright');
const express = require('../backend/node_modules/express');
const {seoHeaders}=require('../shared/seo-policy.cjs');
const app=express(); app.use(seoHeaders); app.use(express.json());
const root=path.resolve(process.argv[2] || 'frontend/out');
let enquiries=0, searches=0, failEnquiry=false;
const locations=[{id:'TEST_CN',name:'Synthetic origin',country:'China',kind:'AIR',aliases:[]},{id:'TEST_QA',name:'Synthetic destination',country:'Qatar',kind:'AIR',aliases:[]}];
app.get('/api/live-pricing/catalog',(_,res)=>res.json({locations,groups:[]}));
app.get('/api/live-pricing/locations',(_,res)=>res.json({locations}));
app.post('/api/live-pricing/enquiries',(_,res)=>{enquiries++; return failEnquiry ? res.status(503).json({message:'Synthetic delivery failure'}) : res.json({delivery:'sent'});});
app.post('/api/live-pricing/quotes',(_,res)=>{searches++;res.json({available:false,origin:'Synthetic origin',destination:'Synthetic destination',reference:'SYNTHETIC-ONLY',expires_at:new Date(Date.now()+60000).toISOString()});});
app.get('/api/track/:ref',(req,res)=>res.json(req.params.ref==='SYNTHETIC-ONLY' ? {success:true,data:{ref_no:'SYNTHETIC-ONLY',origin:{country:'China',city:'Guangzhou'},destination:{country:'Qatar',city:'Doha'},mode:'AIR',currentStageIndex:2,timeline:[],eta:'Synthetic test',carrier:'Test fixture'}} : {success:false,message:'No tracking information found.'}));
app.get('/services',(req,res)=>req.path.endsWith('/')?res.redirect(301,'/services'):res.sendFile(path.join(root,'services.html')));
app.use(express.static(root,{extensions:['html']}));
const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[], results=[], live=[];
fs.mkdirSync('.seo-audit-sandbox/screenshots',{recursive:true});
try {
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route(/google-analytics\.com|googletagmanager\.com/,route=>route.abort());
  const page=await context.newPage();
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  const xml=await page.evaluate(source=>{const doc=new DOMParser().parseFromString(source,'application/xml');return {errors:doc.querySelectorAll('parsererror').length,root:doc.documentElement.localName,urls:doc.querySelectorAll('loc').length};},sitemap);
  assert.deepEqual(xml,{errors:0,root:'urlset',urls:Object.keys(metadata).length});
  page.on('pageerror',error=>errors.push(error.message));
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    for(const [route,data] of Object.entries(metadata)) {
      const response=await page.goto(base+route,{waitUntil:'load'});
      assert.equal(response.status(),200,route);
      await page.waitForFunction(expected=>document.title===expected,data.title);
      assert.equal(await page.locator('h1').count(),1,route);
      assert(await page.locator('h1').isVisible(),route);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),SITE+route);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert(!overflow,`${route}: overflow at ${width}`);
      assert.equal(await page.locator('link[hreflang]').count(),0);
      results.push({route,width,status:response.status(),visibleH1:true,overflow});
    }
    console.log(`Rendered ${Object.keys(metadata).length} local pages at ${width}px.`);
    await page.goto(base+'/',{waitUntil:'load'});
    await page.screenshot({path:`.seo-audit-sandbox/screenshots/local-home-${width}.png`});
  }
  await page.goto(base+'/trade-lanes/',{waitUntil:'load'});
  for(const lane of tradePages) assert(await page.locator(`a[href="${lane.path}"]`).count()>0,lane.path);
  await page.goto(base+'/about',{waitUntil:'load'});
  await page.locator('a[href="/chairman-message"]').click();
  await page.waitForFunction(()=>document.title.includes('Chairman'));
  await page.goBack(); await page.waitForFunction(()=>document.title.includes('About Argus'));
  assert.equal((await page.request.get(base+'/seo-missing-page-check/')).status(),404);
  assert.equal((await page.request.get(base+'/tracking?ref=synthetic')).headers()['x-robots-tag'],'noindex, nofollow');
  // All writes below hit ONLY this loopback fixture. No email/DB/real shipment access.
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/',{waitUntil:'load'});
  await page.evaluate(()=>{window.testEvents=[];window.argusAnalytics={consent:true,sink:e=>window.testEvents.push(e)};});
  await page.getByRole('button',{name:'AIR',exact:true}).first().click();
  await page.getByRole('combobox',{name:'POL / Origin'}).fill('Synthetic origin');
  await page.getByRole('option').click();
  await page.getByRole('combobox',{name:'POD / Destination'}).fill('Synthetic destination');
  await page.getByRole('option').click();
  await page.getByRole('button',{name:'Search',exact:true}).click();
  const dialog=page.locator('dialog');
  await dialog.getByLabel('Name',{exact:true}).fill('Synthetic Test');
  await dialog.getByLabel('Phone number').fill('55550000');
  await dialog.getByLabel('Email address').fill('seo-test@example.invalid');
  failEnquiry=true;
  await dialog.getByRole('button',{name:'Continue',exact:true}).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.testEvents.filter(e=>e.event==='quote_success').length),0);
  failEnquiry=false;
  await dialog.getByRole('button',{name:'Continue',exact:true}).click();
  await dialog.getByRole('heading',{name:'Live Freight Rates'}).waitFor();
  assert.equal(await page.evaluate(()=>window.testEvents.filter(e=>e.event==='quote_success').length),1);
  // Fill only the ordinary numeric cargo fields; submit uses the existing form.
  for(const input of await dialog.locator('input[type="number"]').all()) await input.fill('10');
  await dialog.locator('button[type="submit"]').click();
  await dialog.getByRole('heading',{name:'Custom quotation',exact:true}).waitFor();
  assert.equal(searches,1); assert.equal(enquiries,2);
  const payloads=await page.evaluate(()=>window.testEvents);
  assert(payloads.some(e=>e.event==='rate_search'));
  assert(!JSON.stringify(payloads).includes('55550000')&&!JSON.stringify(payloads).includes('example.invalid')&&!JSON.stringify(payloads).includes('SYNTHETIC-ONLY'));
  await dialog.getByRole('button',{name:'Close calculator'}).click();
  await page.locator('.argus-tracker-input').fill('SYNTHETIC-ONLY');
  await page.getByRole('button',{name:'Track Shipment'}).click();
  await page.locator('.argus-detail-value').filter({hasText:'SYNTHETIC-ONLY'}).waitFor();
  await page.locator('.argus-tracker-input').fill('SYNTHETIC-MISSING');
  await page.getByRole('button',{name:'Track Shipment'}).click();
  await page.getByText('No tracking information found.',{exact:true}).waitFor();
  assert.deepEqual(errors,[],'Local browser exceptions');
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const raw=await noJS.newPage();
  for(const route of ['/','/services/air-freight/','/locations/qatar/','/trade-lanes/china-to-uae/']) {
    await raw.goto(base+route); assert(await raw.locator('h1').isVisible());
  }
  await noJS.close();
  // Read-only rendered production sample; public catalog GETs only, no submissions.
  if(process.env.SEO_LIVE_BROWSER==='1') {
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      for(const route of ['/','/locations/qatar/','/trade-lanes/china-to-uae/']) {
        try {
          const response=await page.goto(SITE+route,{waitUntil:'load',timeout:30000});
          live.push({route,width,status:response.status(),title:await page.title(),visibleH1:await page.locator('h1').isVisible(),canonical:await page.locator('link[rel="canonical"]').getAttribute('href')});
          if(route==='/') await page.screenshot({path:`.seo-audit-sandbox/screenshots/live-home-${width}.png`});
        } catch(error){live.push({route,width,error:error.message});}
      }
    }
  }
  fs.writeFileSync('docs/seo/evidence/browser.json',JSON.stringify({capturedAt:new Date().toISOString(),local:results,fixtures:{enquiries,searches,tracking:'success and missing',analytics:'consent and no sensitive fields; no success on failed dispatch'},noJavaScript:4,live,localExceptions:[]},null,2)+'\n');
  console.log('PASS: local rendered routes, responsive widths, navigation, no-JS content, fixture rate/enquiry/tracking flows and private analytics payloads.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
