const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkDeployment } = require('../scripts/check-deployment.cjs');
const { requiredPortalPage } = require('../backend/src/utils/requiredPortalPage');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'argus-tracking-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const file of ['index.html','login.html','settings.html','rfq/new.html','customer/rfq/new.html','operator/live-rates.html']) {
    fs.mkdirSync(path.dirname(path.join(directory,file)), {recursive:true});
    fs.writeFileSync(path.join(directory,file), '<html>Existing page</html>');
  }
  return directory;
}
function response() {
  return { headers: {}, code:200, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;}, type(type){this.contentType=type;return this;}, send(body){this.body=body;}, sendFile(file){this.file=file;} };
}

test('deployment refuses a stale export without the tracking management page', t => {
  const directory=fixture(t);
  assert.throws(()=>checkDeployment(directory), /shipment-tracking.html is missing/);
});
test('tracking export must contain all referenced dashboard assets', t => {
  const directory=fixture(t);
  const asset='_next/static/chunks/app/shipment-tracking/page-test.js';
  fs.writeFileSync(path.join(directory,'shipment-tracking.html'),`<script src="/${asset}"></script>`);
  assert.throws(()=>checkDeployment(directory), /references missing/);
  fs.mkdirSync(path.dirname(path.join(directory,asset)), {recursive:true});
  fs.writeFileSync(path.join(directory,asset),'');
  assert.doesNotThrow(()=>checkDeployment(directory));
});
test('missing tracking HTML returns 503 and never sends the homepage', t => {
  const directory=fixture(t),res=response();
  requiredPortalPage(directory,'shipment-tracking.html')({},res);
  assert.equal(res.code,503);assert.equal(res.file,undefined);
  assert.match(res.body,/dashboard build/);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('a rebuilt export is served without restarting the route handler', t => {
  const directory=fixture(t),handler=requiredPortalPage(directory,'shipment-tracking.html');
  const missing=response();handler({},missing);assert.equal(missing.code,503);
  const file=path.join(directory,'shipment-tracking.html');fs.writeFileSync(file,'<html>Tracking</html>');
  const ready=response();handler({},ready);assert.equal(ready.code,200);assert.equal(ready.file,file);
});
