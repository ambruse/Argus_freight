const {test}=require('node:test');
const assert=require('node:assert/strict');
const {nextRequestNumber,requestDate}=require('../src/tracking/requestNumber');
const date=new Date('2026-11-21T10:00:00Z');
test('request numbers use unpadded 1–999 followed by ddmmyyyy',()=>{
  assert.equal(nextRequestNumber(date,[]),'121112026');
  assert.equal(nextRequestNumber(date,['121112026','921112026']),'1021112026');
  assert.equal(nextRequestNumber(date,['99821112026']),'99921112026');
});
test('copies, suffix variants and retained identifiers prevent sequence reuse',()=>{
  assert.equal(nextRequestNumber(date,['121112026','121112026','221112026-1','ARG-2111269','99920112026']),'321112026');
});
test('sequence resets at Qatar midnight, not UTC midnight',()=>{
  assert.equal(requestDate(new Date('2026-11-21T21:00:00Z')),'22112026');
  assert.equal(nextRequestNumber(new Date('2026-11-21T21:00:00Z'),['99921112026']),'122112026');
});
test('daily limit rejects creation rather than duplicating or exceeding 999',()=>{
  assert.throws(()=>nextRequestNumber(date,['99921112026']),error=>error.status===409 && /999/.test(error.message));
});
