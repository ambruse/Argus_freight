'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const auto = require('../scripts/auto-prepare.cjs');
const { requiredPortalPage } = require('../backend/src/utils/requiredPortalPage');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'argus-auto-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  write(root, 'package.json', '{"name":"fixture"}');
  write(root, 'frontend/app/shipment-tracking/page.tsx', 'tracking source');
  write(root, 'frontend/out/index.html', 'original website');
  return root;
}
function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, content);
}
function fakeBuild({steps}) {
  const stage = steps[0].cwd;
  assert.ok(stage.includes('.argus-build/release-'));
  assert.ok(steps.every(step => !step.cwd.endsWith('/backend')));
  write(stage, 'frontend/out/index.html', 'new website');
  write(stage, 'frontend/out/shipment-tracking.html', 'tracking dashboard');
}
const quiet = () => {};
test('isolated preparation publishes a verified dashboard and skips unchanged revisions', async t => {
  const root=fixture(t); let builds=0, checks=0;
  write(root, 'node_modules/live.txt', 'running dependencies');
  const options={root,log:quiet,build:args=>{builds++;fakeBuild(args);},verify:out=>{checks++;assert.equal(fs.readFileSync(path.join(out,'shipment-tracking.html'),'utf8'),'tracking dashboard');}};
  assert.equal((await auto.prepare(options)).phase,'ready');
  assert.equal(fs.readFileSync(path.join(root,'frontend/out/shipment-tracking.html'),'utf8'),'tracking dashboard');
  assert.equal(fs.readFileSync(path.join(root,'node_modules/live.txt'),'utf8'),'running dependencies');
  await auto.prepare(options); assert.equal(builds,1); assert.equal(checks,1);
  write(root,'frontend/app/shipment-tracking/page.tsx','updated source');
  await auto.prepare(options); assert.equal(builds,2);
  assert.ok(!fs.readdirSync(path.join(root,'.argus-build')).some(name=>name.startsWith('release-')));
});
test('failed builds preserve live files and are rate limited before retrying', async t=>{
  const root=fixture(t);let builds=0;
  const options={root,log:quiet,build:()=>{builds++;throw new Error('npm unavailable');},verify:quiet};
  await assert.rejects(auto.prepare(options),/npm unavailable/);
  assert.equal(auto.readState(root).phase,'failed');
  assert.equal(fs.readFileSync(path.join(root,'frontend/out/index.html'),'utf8'),'original website');
  assert.equal((await auto.prepare(options)).phase,'failed');assert.equal(builds,1);
  auto.writeState(root,{...auto.readState(root),retryAfter:0,attempts:3});
  await auto.prepare(options);assert.equal(builds,1);
  write(root,'frontend/app/shipment-tracking/page.tsx','fixed source');
  assert.equal((await auto.prepare({...options,build:fakeBuild})).phase,'ready');
});
test('failed export verification does not publish generated pages',async t=>{
  const root=fixture(t);
  await assert.rejects(auto.prepare({root,log:quiet,build:fakeBuild,verify:()=>{throw new Error('missing asset');}}),/missing asset/);
  assert.equal(fs.readFileSync(path.join(root,'frontend/out/index.html'),'utf8'),'original website');
});
test('source changes during a build prevent publishing a mixed release',async t=>{
  const root=fixture(t);
  await assert.rejects(auto.prepare({root,log:quiet,verify:quiet,build:args=>{fakeBuild(args);write(root,'frontend/app/shipment-tracking/page.tsx','new upload');}}),/Source changed/);
  assert.equal(fs.readFileSync(path.join(root,'frontend/out/index.html'),'utf8'),'original website');
});
test('Passenger workers cannot prepare the same deployment concurrently', async t=>{
  const root=fixture(t), release=auto.acquireLock(root);
  assert.equal(auto.acquireLock(root),null);
  assert.equal((await auto.prepare({root,build:()=>assert.fail('duplicate build')})).phase,'busy');
  release();assert.equal(typeof auto.acquireLock(root),'function');
});
test('snapshot preserves public environment values without copying secrets or generated dependencies',t=>{
  const root=fixture(t),stage=path.join(root,'stage');
  write(root,'.env','DB_PASSWORD=private\nVITE_API_URL=https://example.test\n');
  write(root,'frontend/.env.production','NEXT_PUBLIC_API_URL=https://example.test\nSECRET_TOKEN=private');
  write(root,'frontend/node_modules/private.js','dependency');
  const before=auto.fingerprint(root);
  auto.snapshot(root,stage);
  assert.equal(fs.readFileSync(path.join(stage,'.env'),'utf8'),'VITE_API_URL=https://example.test');
  assert.equal(fs.readFileSync(path.join(stage,'frontend/.env.production'),'utf8'),'NEXT_PUBLIC_API_URL=https://example.test');
  assert.equal(fs.existsSync(path.join(stage,'frontend/out')),false);
  assert.equal(fs.existsSync(path.join(stage,'frontend/node_modules')),false);
  write(root,'frontend/out/index.html','different build');assert.equal(auto.fingerprint(root),before);
  write(root,'.env','DB_PASSWORD=changed\nVITE_API_URL=https://other.test\n');assert.notEqual(auto.fingerprint(root),before);
});
test('publication copies assets first and retains files used by existing browser sessions',t=>{
  const root=fixture(t),stage=path.join(root,'staged'),live=path.join(root,'frontend/out'),renames=[];
  write(root,'staged/index.html','new html');write(root,'staged/_next/new.js','new js');write(root,'frontend/out/_next/old.js','old js');
  auto.publish(stage,live,{rename:(from,to)=>{renames.push(path.relative(live,to));fs.renameSync(from,to);}});
  assert.deepEqual(renames,['_next/new.js','index.html']);
  assert.ok(fs.existsSync(path.join(live,'_next/old.js')));
});
test('a copy failure before publication retains the live HTML',t=>{
  const root=fixture(t),stage=path.join(root,'staged'),live=path.join(root,'frontend/out');
  write(root,'staged/index.html','new html');write(root,'staged/_next/new.js','new js');
  assert.throws(()=>auto.publish(stage,live,{copy:()=>{throw new Error('disk full');}}),/disk full/);
  assert.equal(fs.readFileSync(path.join(live,'index.html'),'utf8'),'original website');
  assert.ok(!fs.readdirSync(live).some(name=>name.endsWith('.tmp')));
});
test('temporary dashboard page refreshes only while a build is running',t=>{
  const root=fixture(t);
  for(const phase of ['building','failed']) {
    const res={setHeader(){},status(code){this.code=code;return this;},type(){return this;},send(body){this.body=body;}};
    requiredPortalPage(path.join(root,'frontend/out'),'shipment-tracking.html',{state:()=>({phase})})({},res);
    assert.equal(res.code,503);assert.equal(res.body.includes('http-equiv="refresh"'),phase==='building');
  }
});
test('development and disabled deployments never spawn build workers',t=>{
  const root=fixture(t);
  for(const env of [{NODE_ENV:'development'},{NODE_ENV:'test'},{ARGUS_AUTO_PREPARE:'0'}])auto.startAutomaticPreparation({root,env,spawnProcess:()=>assert.fail('unexpected worker')})();
});
test('startup launches one worker and records a killed build before retrying',t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date']});
  const {EventEmitter}=require('node:events');
  const root=fixture(t),workers=[];
  const stop=auto.startAutomaticPreparation({root,env:{NODE_ENV:'production'},log:quiet,spawnProcess:()=>{
    const worker=new EventEmitter();worker.pid=123456;workers.push(worker);return worker;
  }});
  t.after(stop);
  t.mock.timers.tick(1000);assert.equal(workers.length,1);
  t.mock.timers.tick(30000);assert.equal(workers.length,1);
  auto.writeState(root,{phase:'building',workerPid:123456,attempts:1,revision:'test'});
  workers[0].emit('exit',null,'SIGKILL');assert.equal(auto.readState(root).phase,'failed');
  t.mock.timers.tick(30000);assert.equal(workers.length,1);
  t.mock.timers.tick(300000);assert.equal(workers.length,2);
});
test('an abandoned lock without an owner is recovered after its grace period',t=>{
  const root=fixture(t),lock=path.join(root,'.argus-build/lock');
  fs.mkdirSync(lock,{recursive:true});
  assert.equal(auto.acquireLock(root),null);
  fs.utimesSync(lock,new Date(0),new Date(0));
  const release=auto.acquireLock(root);assert.equal(typeof release,'function');release();
});
