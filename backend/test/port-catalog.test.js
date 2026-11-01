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
test('facility IDs remain stable and airport/seaport identities stay distinct', () => {
  assert.equal(catalog.ports.find(p => p.id === 'CNSHA').port_name,'Port of Shanghai');
  assert.equal(catalog.ports.find(p => p.id === 'QAHMD').port_name,'Hamad Port');
  const hamad = catalog.ports.filter(p => p.country === 'QA' && p.port_name.includes('Hamad'));
  assert.equal(hamad.length,2); assert.equal(new Set(hamad.map(p => p.mode)).size,2);
  assert.notEqual(catalog.ports.find(p => p.port_name === 'Doha Port').id,'QAHMD');
});

test('all facilities have a sourced city or locality, including ports not named after their city', () => {
  const cities = require('../../frontend/lib/data/port-cities.json').locations;
  for (const port of catalog.ports) {
    assert.ok(port.city.trim(), port.port_name);
    assert.equal(port.city, cities[port.id].city, port.port_name);
    assert.ok(cities[port.id].source, port.port_name);
  }
  for (const [name, city] of [
    ['Jebel Ali Port', 'Dubai'], ['Hamad Port', 'Umm Al Houl'],
    ['King Abdulaziz Port', 'Dammam'], ['Jawaharlal Nehru Port', 'Navi Mumbai'],
    ['Indira Gandhi International Airport', 'New Delhi'], ['Heathrow Airport', 'London'],
    ['Port of Tanjung Priok', 'Jakarta'],
  ]) assert.equal(catalog.ports.find(p => p.port_name === name).city, city);
});

test('location labels expose cities for search without changing facility names or IDs', async () => {
  const { locationLabel } = await import('../../shared/locationLabel.mjs');
  const port = catalog.ports.find(p => p.id === 'AEJEA');
  assert.equal(locationLabel({ country: port.country_name, city: port.city, name: port.port_name }), 'Dubai — Jebel Ali Port, United Arab Emirates');
  assert.equal(locationLabel({ name: 'Doha', city: 'Doha', country: 'Qatar' }), 'Doha, Qatar');
  assert.equal(locationLabel({ name: 'Legacy port', country: 'Qatar' }), 'Qatar, Legacy port');
});
