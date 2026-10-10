const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const express = require('express');
const jwt = require('jsonwebtoken');
const { migrate } = require('../scripts/migrate-freight');
const { createService } = require('../src/freight/service');
const { createRouter } = require('../src/routes/freightRates');
const D = require('../src/freight/domain');

test('database persistence, API security, automatic publication and concurrent workflows', { skip: !process.env.FREIGHT_TEST_DB_URL }, async t => {
  const url = new URL(process.env.FREIGHT_TEST_DB_URL);
  if (!['127.0.0.1','localhost'].includes(url.hostname)) throw new Error('Integration tests require an isolated localhost database server.');
  const settings = { host:url.hostname,port:Number(url.port || 3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),dateStrings:true,timezone:'Z' };
  const root = await mysql.createConnection(settings);
  const database = `argus_freight_test_${process.pid}_${Date.now()}`;
  assert.match(database,/^argus_freight_test_\d+_\d+$/);
  await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  const pool = mysql.createPool({ ...settings,database,connectionLimit:8 });
  let server;
  try {
    await pool.query(`CREATE TABLE users (id INT PRIMARY KEY,username VARCHAR(100),role VARCHAR(50),is_deleted BOOLEAN DEFAULT 0,is_stalled BOOLEAN DEFAULT 0) ENGINE=InnoDB`);
    await pool.query("INSERT INTO users (id,username,role) VALUES (1,'operator1','operator'),(2,'operator2','operator'),(3,'operator3','operator'),(4,'admin','admin'),(5,'customer','customer')");
    await migrate(pool); await migrate(pool);
    const service = createService(pool), admin = {id:4,role:'admin'}, op1={id:1,role:'operator'},op2={id:2,role:'operator'},op3={id:3,role:'operator'};
    const date = D.qatarToday(), bounds = D.week(date);
    const body = overrides => ({ origin_id:'CNSHA',destination_id:'QAHMD',container_type:'40HQ',service:'FCL',basis:'PORT_TO_PORT',currency:'USD',valid_from:bounds.start,valid_until:bounds.end,price:'1100',surcharge:'0',charges_confirmed:true,inclusions:['Ocean freight'],exclusions:[],...overrides });
    await t.test('workbook locations persist, countries are normalized, and airports cannot receive container rates', async () => {
      const catalog = await service.catalogs();
      assert.equal(catalog.locations.length,1938);
      assert.equal(catalog.locations.find(l => l.id === 'QAHMD').name,'Qatar, Hamad Port');
      const airport = catalog.locations.find(l => l.port_name === 'Hamad International Airport');
      await assert.rejects(() => service.save(op1,body({destination_id:airport.id})),e => e.status === 400);
      const doha = catalog.locations.find(l => l.port_name === 'Doha Port' && l.country === 'QA');
      assert.notEqual(doha.id,'QAHMD');
      const rate = await service.save(op1,body({destination_id:doha.id}));
      assert.equal((await service.publicRates({date,destination:'Qatar, Doha Port'})).rates.length,1);
      await service.decide(op1,rate.id,{action:'withdraw',version:1});
    });
    const a = await service.save(op1,body({price:'1250'}));
    const b = await service.save(op2,body({price:'1100'}));
    await t.test('1 same route: internal lowest belongs to operator 2', async () => {
      const list = await service.list(admin,{date}); assert.equal(list.rates.find(r=>Number(r.position)===1).id,b.id);
      assert.equal((await service.publicRates({date})).rates.length,1);
      await assert.rejects(()=>service.decide(admin,a.id,{action:'approve',version:1}),e=>e.status===403);
      assert.equal((await service.publicRates({date})).rates[0].price,'1100.00');
      assert.equal((await service.publicRates({date})).rates[0].origin,'China, Port of Shanghai');
      assert.equal((await service.publicRates({date})).rates[0].destination,'Qatar, Hamad Port');
      assert.equal((await service.publicRates({date,origin:'China',destination:'Qatar'})).rates.length,1);
      await assert.rejects(()=>service.decide(op2,b.id,{action:'markup',version:1,markup_bps:500}),e=>e.status===403);
    });
    await t.test('2 different equipment and 3 expired/future cheap prices', async () => {
      const small = await service.save(op1,body({container_type:'20GP',price:'800'}));
      await service.save(op1,body({price:'900',valid_from:'2020-01-01',valid_until:'2020-01-07'}));
      await service.save(op1,body({price:'600',valid_from:'2099-01-01',valid_until:'2099-01-07'}));
      assert.equal((await service.list(admin,{date,container:'40HQ'})).rates.find(r=>Number(r.position)===1).id,b.id);
      assert.equal((await service.publicRates({date})).rates.length,2);
    });
    let c;
    await t.test('4 later lower submission immediately replaces the public winner', async () => {
      c = await service.save(op3,body({price:'950'}));
      assert.equal((await service.list(admin,{date,container:'40HQ'})).rates.find(r=>Number(r.position)===1).id,c.id);
      assert.equal((await service.publicRates({date,container:'40HQ'})).rates[0].price,'950.00');
    });
    await t.test('5 unauthorized edit/history/withdraw denied', async () => {
      await assert.rejects(()=>service.save(op1,body({version:1}),b.id),e=>e.status===404);
      await assert.rejects(()=>service.history(op1,b.id),e=>e.status===404);
      await assert.rejects(()=>service.decide(op1,b.id,{version:1,action:'withdraw'}),e=>e.status===404);
      const list = await service.list(op1,{}); assert.ok(list.rates.every(r=>r.operator_id===1 && r.best_minor===undefined));
    });
    await t.test('6 case insensitive combined search and aliases', async () => {
      const matches = await service.publicRates({date,origin:'sHaNg',destination:'mina hamad'});
      assert.equal(matches.rates.length,2);
      assert.equal((await service.publicRates({date,origin:'Singapore'})).rates.length,0);
      assert.equal((await service.publicRates({date,origin:'%'})).rates.length,0);
    });
    await t.test('8 incompatible inclusions, unknown charges and currencies stay separate', async () => {
      await service.save(op1,body({price:'700',charges_confirmed:false,surcharge:''}));
      const other = await service.save(op2,body({price:'900',exclusions:['destination handling']}));
      const eur = await service.save(op2,body({price:'500',currency:'EUR'}));
      assert.equal((await service.publicRates({date,container:'40HQ'})).rates.length,3);
      const { groupPublicRoutes } = await import('../../src/components/freightRoutes.mjs');
      const display = groupPublicRoutes((await service.publicRates({date,container:'40HQ'})).rates);
      assert.equal(display.length,1);
      assert.equal(display[0].options.length,3);
      assert.equal(display[0].options[0].origin_id,'CNSHA');
      assert.equal(display[0].options[0].destination_id,'QAHMD');
      const unknown = (await service.list(admin,{})).rates.find(r=>r.total_minor===null);
      assert.ok(!(await service.publicRates({date})).rates.some(r=>r.reference.startsWith(unknown.id)));
    });
    await t.test('9 different dates in one week select applicable active rates', async () => {
      const first = await service.save(op1,body({container_type:'40GP',valid_until:bounds.start,price:'500'}));
      const last = await service.save(op1,body({container_type:'40GP',valid_from:bounds.end,price:'600'}));
      assert.equal((await service.publicRates({date:bounds.start,container:'40GP'})).rates[0].price,'500.00');
      assert.equal((await service.publicRates({date:bounds.end,container:'40GP'})).rates[0].price,'600.00');
      await assert.rejects(()=>service.publicRates({date:'2020-01-01'}),e=>e.status===400);
    });
    await t.test('withdrawal automatically falls back to the next active offer', async () => {
      await service.decide(op3,c.id,{action:'withdraw',version:1});
      const offers = (await service.publicRates({date,container:'40HQ'})).rates;
      assert.ok(offers.some(r=>r.price==='1100.00')); assert.ok(!offers.some(r=>r.price==='950.00'));
    });
    await t.test('revisions preserve history, update publication and reject stale saves', async () => {
      const revised = await service.save(op2,body({price:'990',version:1}),b.id);
      assert.equal(revised.version,2);
      await assert.rejects(()=>service.decide(admin,b.id,{action:'markup',version:1,markup_bps:0}),e=>e.status===409);
      await assert.rejects(()=>service.save(op2,body({version:1}),b.id),e=>e.status===409);
      const history = await service.history(op2,b.id); assert.equal(history.revisions.length,2);
      assert.equal(Number(history.revisions[1].base_minor),110000);
      assert.equal((await service.list(op2,{date})).rates.find(r=>r.id===b.id).status,'active'); b.version=2;
    });
    await t.test('PDF content, size, ownership and revision checks', async () => {
      const pending = await service.save(op1,body({price:'2000'}));
      const buffer = Buffer.from('%PDF-1.4\nprivate supplier quotation');
      const attachment = await service.attach(op1,pending.id,1,{buffer,size:buffer.length,originalname:'quote.pdf'});
      assert.equal((await service.download(op1,attachment.id)).content.toString(),buffer.toString());
      await assert.rejects(()=>service.download(op2,attachment.id),e=>e.status===404);
      await assert.rejects(()=>service.attach(op1,pending.id,1,{buffer:Buffer.from('<html>'),size:6,originalname:'bad.pdf'}));
      await assert.rejects(()=>service.attach(op2,b.id,1,{buffer,size:buffer.length,originalname:'quote.pdf'}),e=>e.status===409);
    });
    await t.test('concurrent revisions serialize; exactly one succeeds', async () => {
      const replies = await Promise.allSettled([service.save(op2,body({price:'980',version:2}),b.id),service.save(op2,body({price:'970',version:2}),b.id)]);
      assert.equal(replies.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(replies.filter(r=>r.status==='rejected' && r.reason.status===409).length,1);
    });
    await t.test('concurrent submissions publish the cheapest and withdrawal falls back immediately', async () => {
      const [target,newer] = await Promise.all([service.save(op1,body({container_type:'20GP',price:'650'})),service.save(op2,body({container_type:'20GP',price:'600'}))]);
      assert.equal((await service.publicRates({date,container:'20GP'})).rates[0].price,'600.00');
      await service.decide(op2,newer.id,{action:'withdraw',version:1});
      assert.equal((await service.publicRates({date,container:'20GP'})).rates[0].reference,`${target.id}:1`);
    });
    await t.test('7 more than five published routes are persisted and returned', async () => {
      for (let i=0;i<20;i++) {
        await service.configure(admin,'locations',{id:`TEST${i}`,name:`Test port ${i}`,country:'QA',aliases:[],active:true});
        const r = await service.save(op1,body({destination_id:`TEST${i}`}));
      }
      assert.equal((await service.publicRates({date,destination:'Test port'})).rates.length,20);
    });
    await t.test('public allowlist has no confidential fields and explicit markup is exact', async () => {
      const r = await service.save(op1,body({container_type:'20GP',price:'599.99'})); await service.decide(admin,r.id,{action:'markup',version:1,markup_bps:125});
      const output = await service.publicRates({date,container:'20GP'});
      assert.equal(output.rates[0].price,'607.49');
      const publicJSON = JSON.stringify(output);
      for (const field of ['operator','carrier','quotation_reference','base_minor','surcharge_minor','markup','remarks']) assert.ok(!publicJSON.includes(field));
    });
    await t.test('archived records retained; disabled catalog immediately hides publication', async () => {
      await service.configure(admin,'containers',{code:'20GP',label:'20-foot standard',active:false});
      assert.equal((await service.publicRates({date,container:'20GP'})).rates.length,0);
      await service.decide(admin,a.id,{action:'archive',version:1,reason:'Inaccurate quotation'});
      assert.equal((await service.history(admin,a.id)).revisions.length,1);
      await assert.rejects(()=>service.save(op1,body({version:1}),a.id),e=>e.status===409);
    });
    process.env.JWT_SECRET='isolated-freight-integration-test-secret';
    const app = express(); app.use(express.json()); app.use('/api/freight-rates',createRouter(pool));
    server = await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base = `http://127.0.0.1:${server.address().port}/api/freight-rates`;
    const token = (id,role) => jwt.sign({id,role},process.env.JWT_SECRET,{expiresIn:'10m'});
    await t.test('WhatsApp settings are private, self-owned and persistent; public links route to the rate owner', async () => {
      assert.equal((await fetch(base+'/contact-settings')).status,401);
      assert.equal((await fetch(base+'/contact-settings',{headers:{Authorization:`Bearer ${token(5,'customer')}`}})).status,403);
      const update = await fetch(base+'/contact-settings',{method:'PUT',headers:{Authorization:`Bearer ${token(1,'operator')}`,'Content-Type':'application/json'},body:JSON.stringify({operator_id:2,country:'United States',calling_code:'+1',national_number:'2025550101'})});
      assert.equal(update.status,200);
      assert.equal((await createService(pool).contact(op1)).national_number,'2025550101');
      assert.equal((await service.contact(op2)).national_number,'');
      const enquiryRate = await service.save(op1,body({container_type:'40GP',price:'1234.56',inclusions:['WhatsApp test']}));
      const params = new URLSearchParams({date,version:'1',price:'1234.56'});
      const response = await fetch(`${base}/quote/${enquiryRate.id}?${params}`,{redirect:'manual'});
      assert.equal(response.status,303);
      const link = new URL(response.headers.get('location'));
      assert.equal(link.origin,'https://wa.me'); assert.equal(link.pathname,'/12025550101');
      assert.match(link.searchParams.get('text'),/Rate: USD 1,234.56/);
      assert.equal((await fetch(`${base}/quote/${enquiryRate.id}?${params}&unused=1`,{redirect:'manual'})).status,303);
      await assert.rejects(()=>service.quote(enquiryRate.id,{date,version:1,price:'1.00'}),e=>e.status===409);
      await assert.rejects(()=>service.quote(enquiryRate.id,{date,version:'NaN',price:'1234.56'}),e=>e.status===400);
      const lower = await service.save(op2,body({container_type:'40GP',price:'1000',inclusions:['WhatsApp test']}));
      await assert.rejects(()=>service.quote(enquiryRate.id,{date,version:1,price:'1234.56'}),e=>e.status===409);
      await assert.rejects(()=>service.quote(lower.id,{date,version:1,price:'1000.00'}),e=>e.status===409);
      await service.saveContact(op2,{country:'United States',calling_code:'+1',national_number:'2025550102'});
      const output = (await service.publicRates({date})).rates.find(r=>r.reference===`${lower.id}:1`);
      assert.equal(output.whatsapp_available,true);
      assert.ok(!JSON.stringify(output).includes('2025550102'));
      assert.equal(new URL(await service.quote(lower.id,{date,version:1,price:'1000.00'})).pathname,'/12025550102');
      await service.decide(op2,lower.id,{action:'withdraw',version:1});
      const unavailable = await fetch(`${base}/quote/${lower.id}?date=${date}&version=1&price=1000.00`,{redirect:'manual'});
      assert.equal(unavailable.status,409); assert.match(await unavailable.text(),/Return to this week/);
    });
    await t.test('HTTP denies anonymous, customer, query token, stale role and stalled users', async () => {
      assert.equal((await fetch(base)).status,401);
      assert.equal((await fetch(base+'?token='+token(4,'admin'))).status,401);
      assert.equal((await fetch(base,{headers:{Authorization:`Bearer ${token(5,'admin')}`}})).status,403);
      await pool.query('UPDATE users SET is_stalled=1 WHERE id=3');
      assert.equal((await fetch(base,{headers:{Authorization:`Bearer ${token(3,'operator')}`}})).status,403);
      const own = await fetch(base,{headers:{Authorization:`Bearer ${token(1,'admin')}`}});
      assert.equal(own.status,200); assert.ok((await own.json()).rates.every(r=>r.operator_id===1));
      const denial = await fetch(`${base}/${b.id}`,{method:'PUT',headers:{Authorization:`Bearer ${token(1,'operator')}`,'Content-Type':'application/json'},body:JSON.stringify(body({version:3}))});
      assert.equal(denial.status,404);
      assert.equal((await fetch(base+'/public')).headers.get('cache-control'),'no-store');
    });
    await t.test('persistent throttling enforces a limit across service instances', async () => {
      await service.throttle('test',2); await createService(pool).throttle('test',2);
      await assert.rejects(()=>service.throttle('test',2),e=>e.status===429);
    });
    await t.test('reimport preserves approvals, revisions, custom locations and disabled facilities', async () => {
      const before = await service.history(op2,b.id);
      const location = (await service.catalogs()).locations.find(l => l.id === 'QAHMD');
      await service.configure(admin,'locations',{...location,active:false});
      await migrate(pool);
      const after = await service.history(op2,b.id);
      assert.deepEqual(after,before);
      const locations = (await service.catalogs()).locations;
      assert.equal(locations.length,1958);
      assert.equal(Number(locations.find(l => l.id === 'QAHMD').active),0);
      assert.equal((await service.publicRates({date,destination:'Hamad Port'})).rates.length,0);
      await service.configure(admin,'locations',{...location,active:true});
      assert.ok((await service.publicRates({date,destination:'Hamad Port'})).rates.length > 0);
    });
    await t.test('policy upgrade activates legacy pending/approved rates once without reviving withdrawn/rejected/archived records', async () => {
      const legacy = [];
      for (const status of ['pending','approved','rejected','withdrawn','archived']) {
        const r = await service.save(op1,body({inclusions:[`Legacy ${status}`]}));
        await pool.query('UPDATE freight_rates SET status=? WHERE id=?',[status,r.id]); legacy.push({...r,status});
      }
      await pool.query("INSERT INTO freight_rate_approvals (rate_id,version,admin_id,decision,comparison_date,markup_bps,reason) VALUES (?,1,4,'approve',?,0,'Legacy decision')",[legacy[1].id,date]);
      // This is only the uniquely named disposable integration DB, simulating a pre-upgrade installation.
      await pool.query("DELETE FROM freight_schema_migrations WHERE name='automatic_publication_v1'");
      await migrate(pool); await migrate(pool);
      for (const r of legacy) {
        const [[stored]] = await pool.query('SELECT status FROM freight_rates WHERE id=?',[r.id]);
        assert.equal(stored.status,['pending','approved'].includes(r.status) ? 'active' : r.status);
        const history = await service.history(op1,r.id);
        assert.equal(history.revisions.length,1);
        assert.equal(history.audits.filter(a=>a.action==='automatic_publication').length,['pending','approved'].includes(r.status) ? 1 : 0);
      }
      assert.equal((await service.history(op1,legacy[1].id)).approvals.length,1);
    });
  } finally {
    if (server) await new Promise(resolve=>server.close(resolve));
    await pool.end();
    // Only the uniquely named database created by this test is removed.
    await root.query(`DROP DATABASE \`${database}\``); await root.end();
  }
});
