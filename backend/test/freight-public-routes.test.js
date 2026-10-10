const { test } = require('node:test');
const assert = require('node:assert/strict');

test('public rows consolidate exact port pairs while retaining every comparable rate option', async () => {
  const { groupPublicRoutes } = await import('../../src/components/freightRoutes.mjs');
  const option = {origin_id:'CNSHA',destination_id:'QAHMD',origin:'China, Shanghai',destination:'Qatar, Hamad Port',reference:'a:1',container_type:'40HQ',currency:'USD',price:'1100.00',exclusions:[]};
  const differentTerms = {...option,reference:'b:1',price:'990.00',exclusions:['Destination handling']};
  const differentEquipment = {...option,reference:'c:1',container_type:'20GP',price:'800.00'};
  const differentCurrency = {...option,reference:'d:1',currency:'EUR',price:'700.00'};
  const differentPort = {...option,reference:'e:1',destination_id:'OTHER_PORT'};
  const rows = groupPublicRoutes([option,differentTerms,differentEquipment,differentCurrency,differentPort,option]);
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0].options.map(r=>r.reference),['a:1','b:1','c:1','d:1']);
  assert.equal(rows[1].options[0].reference,'e:1');
  assert.equal(groupPublicRoutes([]).length,0);
  // Pagination may add another option for an existing lane; it must not add a row.
  assert.equal(groupPublicRoutes([...rows.flatMap(r=>r.options),{...option,reference:'f:1'}]).length,2);
});
