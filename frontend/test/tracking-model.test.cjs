const test = require('node:test');
const assert = require('node:assert/strict');
const { csvCell, displayDate, isOverdue, missingFields, trackingUrl } = require('../components/tracking/model.ts');

test('CSV export neutralizes spreadsheet formulas and escapes quoted cargo text', () => {
  for (const value of ['=HYPERLINK("https://example.com")', '+1+1', '-10+20', '@SUM(1,1)', '\t=1+1', '\r=1+1']) {
    assert.ok(csvCell(value).startsWith('"\''));
  }
  assert.equal(csvCell('Boxes, "fragile"'), '"Boxes, ""fragile"""');
  assert.equal(csvCell(null), '""');
});

test('an absent ETA or delivered shipment never becomes overdue', () => {
  assert.equal(isOverdue({ ref_no: 'ARG-TEST', track_status: 'In Transit' }), false);
  assert.equal(isOverdue({ ref_no: 'ARG-TEST', track_status: 'Delivered', eta: '2000-01-01' }), false);
  assert.equal(isOverdue({ ref_no: 'ARG-TEST', track_status: 'In Transit', eta: '2000-01-01' }), true);
});

test('server overdue calculation remains authoritative across browser timezones', () => {
  assert.equal(isOverdue({ ref_no: 'ARG-TEST', track_status: 'In Transit', eta: '2000-01-01', overdue: false }), false);
  assert.equal(isOverdue({ ref_no: 'ARG-TEST', track_status: 'In Transit', overdue: true }), true);
});

test('schedule dates remain stable and event timestamps render in UTC', () => {
  assert.equal(displayDate('2026-11-21'), '21 Nov 2026');
  assert.equal(displayDate('2026-11-21T03:00:00+03:00', true), '21 Nov 2026, 00:00');
  assert.equal(displayDate(null), '—');
});

test('data quality flags missing operational fields without guessing countries', () => {
  const missing = missingFields({ ref_no: 'ARG-TEST', pol: 'Shanghai', pod: 'Doha', commodity: 'Textiles', etd: '2026-11-21', eta: '2026-12-01', carrier: 'Carrier', track_status: 'Scheduled' });
  assert.deepEqual(missing, ['pol_country', 'pod_country']);
});

test('public links encode references and honor configured site origin', () => {
  const prior = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://argus.example/';
  try { assert.equal(trackingUrl('ARG-TEST/1 &2'), 'https://argus.example/tracking?ref=ARG-TEST%2F1%20%262'); }
  finally { if (prior === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = prior; }
});
