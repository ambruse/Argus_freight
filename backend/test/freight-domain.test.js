const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/freight/domain');
const input = overrides => ({ origin_id:'CNSHA',destination_id:'QAHMD',container_type:'40HQ',service:'FCL',basis:'PORT_TO_PORT',currency:'USD',valid_from:'2026-10-10',valid_until:'2026-10-17',price:'1100',surcharge:'0',charges_confirmed:true,inclusions:['Ocean freight'],exclusions:[],...overrides });
const rate = (id, overrides = {}) => ({ ...D.validate(input(overrides)),id,status:'active',created_at:'2026-10-01 00:00:00',...overrides });
test('same lane selects 1100 over 1250', () => assert.equal(D.selectBest([rate('one',{price:'1250'}),rate('two')],'2026-10-10')[0].id,'two'));
test('equipment, facility, service, basis and terms define separate comparison groups', () => {
  for (const diff of [{container_type:'20GP'},{destination_id:'AEJEA'},{origin_id:'SGSIN'},{service:'REEFER'},{basis:'DOOR_TO_DOOR'},{exclusions:['customs']}]) {
    assert.equal(D.selectBest([rate('a'),rate('b',diff)],'2026-10-10').length,2);
  }
});
test('expired and future cheaper offers excluded; both validity boundaries inclusive', () => {
  const offers = [rate('expired',{price:'900',valid_from:'2026-10-01',valid_until:'2026-10-09'}),rate('future',{price:'800',valid_from:'2026-10-11'}),rate('valid')];
  assert.equal(D.selectBest(offers,'2026-10-10')[0].id,'valid');
  assert.equal(D.selectBest([rate('valid')],'2026-10-17').length,1);
  assert.equal(D.selectBest([rate('valid')],'2026-10-18').length,0);
});
test('new cheaper offer is public immediately without approval', () => {
  const offers = [rate('original'),rate('new',{price:'950'})];
  assert.equal(D.selectBest(offers,'2026-10-10')[0].id,'new');
  assert.equal(D.selectBest(offers,'2026-10-10',true)[0].id,'new');
});

test('mandatory charge totals and unknown surcharges prevent misleading comparisons', () => {
  const offers = [rate('base',{price:'900',surcharge:'300',surcharge_details:'terminal charges'}),rate('total'),rate('unknown',{price:'700',charges_confirmed:false,surcharge:''})];
  assert.equal(D.selectBest(offers,'2026-10-10')[0].id,'total');
  assert.throws(() => D.validate(input({surcharge:''})),/surcharges/);
});
test('currencies never ranked together without verified conversion', () => assert.equal(D.selectBest([rate('usd'),rate('eur',{currency:'EUR'})],'2026-10-10').length,2));
test('operator cannot manage another user submission', () => {
  assert.equal(D.canManage({id:1,role:'operator'},{operator_id:2}),false);
  assert.equal(D.canManage({id:2,role:'operator'},{operator_id:2}),true);
  assert.equal(D.canManage({id:1,role:'customer'},{operator_id:1}),false);
});
test('weekly date selection changes winners with automatic publication', () => {
  const offers = [rate('mon',{valid_from:'2026-10-05',valid_until:'2026-10-07',status:'active'}),rate('thu',{valid_from:'2026-10-08',status:'active'})];
  assert.equal(D.selectBest(offers,'2026-10-06',true)[0].id,'mon');
  assert.equal(D.selectBest(offers,'2026-10-09',true)[0].id,'thu');
});
test('Qatar midnight, Sunday and Monday boundaries', () => {
  assert.equal(D.qatarToday(new Date('2026-10-11T21:00:00Z')),'2026-10-12');
  assert.deepEqual(D.week('2026-10-11'),{start:'2026-10-05',end:'2026-10-11'});
  assert.deepEqual(D.week('2026-10-12'),{start:'2026-10-12',end:'2026-10-18'});
});
test('tie resolution is deterministic and input order independent', () => {
  assert.equal(D.selectBest([rate('b'),rate('a')],'2026-10-10')[0].id,'a');
  assert.equal(D.selectBest([rate('a'),rate('b',{created_at:'2026-09-01'})],'2026-10-10')[0].id,'b');
});
test('money and date validation reject malformed records', () => {
  for (const price of ['0','-1','NaN','1e3','1.111','100,000','100000000']) assert.throws(() => D.validate(input({price})));
  for (const value of ['2026-02-30','2026-13-01','10/10/2026']) assert.throws(() => D.date(value));
  assert.throws(() => D.validate(input({origin_id:'QAHMD'})));
  assert.throws(() => D.validate(input({valid_until:'2026-10-09'})));
  assert.throws(() => D.validate(input({inclusions:['freight'],exclusions:['freight']})));
  assert.equal(D.money('0.29'),29);
});
test('published customer price includes explicit markup, rounded up to cents', () => {
  const offers = [rate('marked',{status:'active',price:'1000.01',markup_bps:2000}),rate('plain',{status:'active'})];
  assert.equal(D.selectBest(offers,'2026-10-10',true)[0].id,'plain');
});
test('withdrawn/rejected/archived offers cannot win', () => {
  for (const status of ['withdrawn','rejected','archived']) assert.equal(D.selectBest([rate('a',{status})],'2026-10-10').length,0);
});
