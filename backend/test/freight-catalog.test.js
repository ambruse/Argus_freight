const { test } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../../frontend/lib/data/port-catalog.json');
const source = require('../../frontend/lib/data/workbook-ports.json');

test('every workbook facility is imported once with its original name and mode', () => {
  assert.equal(catalog.ports.length,1938);
  assert.equal(catalog.ports.filter(p => p.mode === 'AIR').length,1060);
  assert.equal(catalog.ports.filter(p => p.mode === 'SEA').length,878);
  assert.equal(new Set(catalog.ports.map(p => p.id)).size,1938);
  assert.equal(catalog.sha256,source.sha256);
  for (const row of source.rows) assert.ok(catalog.ports.some(p => p.port_name === row.port && p.mode === row.mode && catalog.countries.some(c => c.code === p.country && [c.name,...c.aliases].includes(row.country))), row.port);
});
test('country choices include all ISO regions plus Kosovo and countries absent from the workbook', () => {
  assert.equal(catalog.countries.length,250);
  assert.equal(new Set(catalog.countries.map(c => c.code)).size,250);
  for (const code of ['QA','CN','US','AE','VA','LI','PS','XK','AQ']) assert.ok(catalog.countries.some(c => c.code === code));
});
test('legacy facility IDs remain stable and airport/seaport identities stay distinct', () => {
  assert.equal(catalog.ports.find(p => p.id === 'CNSHA').port_name,'Port of Shanghai');
  assert.equal(catalog.ports.find(p => p.id === 'QAHMD').port_name,'Hamad Port');
  const hamad = catalog.ports.filter(p => p.country === 'QA' && p.port_name.includes('Hamad'));
  assert.equal(hamad.length,2); assert.equal(new Set(hamad.map(p => p.mode)).size,2);
  assert.notEqual(catalog.ports.find(p => p.port_name === 'Doha Port').id,'QAHMD');
});
