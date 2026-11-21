'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createTrackingPreparation}=require('../src/tracking/prepare');
test('startup waits for core tables and shares one migration among concurrent requests',async()=>{
  let resolveCore,ready=false,checks=0,migrations=0;
  const coreReady=new Promise(resolve=>{resolveCore=resolve;});
  const prepare=createTrackingPreparation({}, {coreReady,check:async()=>{checks++;return {ready};},migrate:async()=>{migrations++;ready=true;}});
  const first=prepare(),second=prepare();assert.equal(first,second);assert.equal(checks,0);
  resolveCore();await Promise.all([first,second]);assert.equal(migrations,1);assert.equal(checks,2);
  await prepare();assert.equal(checks,2);
});
test('already migrated tracking databases do not run DDL on startup',async()=>{
  const prepare=createTrackingPreparation({}, {check:async()=>({ready:true}),migrate:()=>assert.fail('unexpected DDL')});
  assert.equal((await prepare()).ready,true);
});
test('migration failure remains unavailable and retries after cooldown',async()=>{
  let clock=0,attempts=0,ready=false;
  const prepare=createTrackingPreparation({}, {now:()=>clock,retryMs:30,check:async()=>({ready}),migrate:async()=>{if(++attempts===1)throw new Error('database offline');ready=true;}});
  await assert.rejects(prepare(),/database offline/);await assert.rejects(prepare(),/database offline/);assert.equal(attempts,1);
  clock=31;assert.equal((await prepare()).ready,true);assert.equal(attempts,2);
});
test('migration must pass schema verification before requests become ready',async()=>{
  const prepare=createTrackingPreparation({}, {check:async()=>({ready:false}),migrate:async()=>{}});
  await assert.rejects(prepare(),/verification failed/);
});
