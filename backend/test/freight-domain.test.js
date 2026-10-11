const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/freight/domain');
const input = overrides => ({ origin_id:'CNSHA',destination_id:'QAHMD',container_type:'40HQ',service:'FCL',basis:'PORT_TO_PORT',currency:'USD',valid_from:'2026-10-10',valid_until:'2026-10-17',price:'1100',carrier:'Test carrier',surcharge:'0',charges_confirmed:true,inclusions:['Ocean freight'],exclusions:[],...overrides });
const rate = (id, overrides = {}) => ({ ...D.validate(input(overrides)),id,status:'active',created_at:'2026-10-01 00:00:00',...overrides });
test('same lane selects 1100 over 1250', () => assert.equal(D.selectBest([rate('one',{price:'1250'}),rate('two')],'2026-10-10')[0].id,'two'));
test('equipment, facility, service, basis and terms define separate comparison groups', () => {
  for (const diff of [{container_type:'20GP'},{destination_id:'AEJEA'},{origin_id:'SGSIN'},{service:'REEFER'},{basis:'DOOR_TO_DOOR'},{inclusions:['customs']}]) {
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

test('simplified form fixes exclusions and excludes deprecated inputs from the quoted price', () => {
  const value = D.validate(input({price:'900',surcharge:'300',charges_confirmed:false,exclusions:['customs'],remarks:'private',transit_time:'7 days',quotation_reference:'old',surcharge_details:'old'}));
  assert.equal(value.total_minor,90000); assert.equal(value.surcharge_minor,0);
  assert.deepEqual(value.details.exclusions,['AT Actuals']);
  assert.equal(value.details.pricing_mode,'FREIGHT_ONLY_ACTUALS');
  for (const key of ['remarks','transit_time','quotation_reference','surcharge_details']) assert.equal(value.details[key],undefined);
  assert.equal(D.selectBest([rate('unknown',{total_minor:null})],'2026-10-10').length,0);
});
test('USD and QAR compare using the fixed QAR / 3.65 policy', () => {
  assert.equal(D.selectBest([rate('usd'),rate('qar',{currency:'QAR',price:'3650'})],'2026-10-10')[0].id,'qar');
  assert.throws(()=>D.validate(input({currency:'EUR'})),/currency/);
  const value = D.validate(input({currency:'QAR',price:'3650'}));
  assert.equal(value.details.currency_conversion.usd_minor,100000);
  assert.equal(value.details.currency_conversion.divisor,'3.65');
  assert.equal(value.currency,'QAR'); assert.equal(value.base_minor,365000);
});
test('USD conversion rounds to two decimals and never publishes a rounded zero', () => {
  const {toUSDMinor} = require('../src/freight/currency');
  assert.equal(toUSDMinor(10000,'QAR'),2740);
  assert.equal(toUSDMinor(365000,'QAR'),100000);
  assert.equal(toUSDMinor(9999999999,'QAR'),2739726027);
  assert.equal(toUSDMinor(100,'EUR'),null);
  assert.throws(()=>D.validate(input({currency:'QAR',price:'.01'})));
  assert.throws(()=>D.validate(input({currency:'QAR',price:'0.01'})),/USD 0.01/);
});
test('carrier is mandatory after trimming', () => {
  for (const carrier of ['', '   ', undefined]) assert.throws(()=>D.validate(input({carrier})),/Carrier/);
});
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
  assert.throws(() => D.validate(input({inclusions:['AT Actuals']})));
  assert.equal(D.money('0.29'),29);
});
test('published customer price includes explicit markup, rounded up to cents', () => {
  const offers = [rate('marked',{status:'active',price:'1000.01',markup_bps:2000}),rate('plain',{status:'active'})];
  assert.equal(D.selectBest(offers,'2026-10-10',true)[0].id,'plain');
});
test('withdrawn/rejected/archived offers cannot win', () => {
  for (const status of ['withdrawn','rejected','archived']) assert.equal(D.selectBest([rate('a',{status})],'2026-10-10').length,0);
});
