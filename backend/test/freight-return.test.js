const { test } = require('node:test');
const assert = require('node:assert/strict');
test('quote return path survives login and rejects external/unrelated destinations',async()=>{
  const {freightReturnPath} = await import('../../frontend/lib/freightReturn.ts');
  const origin='https://www.argusshipping.co';
  const quote='/customer/rfq/new?freight_reference=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:1&origin=Shanghai';
  assert.equal(freightReturnPath('?next='+encodeURIComponent(quote),origin),quote);
  for (const next of ['https://example.com'+quote,'//example.com'+quote,'/admin/freight-rates','javascript:alert(1)','/customer/rfq/new?freight_reference=invalid']) {
    assert.equal(freightReturnPath('?next='+encodeURIComponent(next),origin),null);
  }
});
