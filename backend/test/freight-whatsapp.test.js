const {test} = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/freight/whatsapp');
test('WhatsApp country codes are checked and formatted numbers normalize safely', () => {
  assert.deepEqual(W.contact({country:'United States',calling_code:'+1',national_number:'(202) 555-0101'}),{country:'United States',calling_code:'+1',national_number:'2025550101',whatsapp_number:'12025550101'});
  assert.equal(W.contact({country:'Italy',calling_code:'+39',national_number:'0612345678'}).whatsapp_number,'390612345678');
  for (const patch of [{country:'Unknown'},{calling_code:'+44'},{national_number:'+12025550101'},{national_number:'abc'},{national_number:'0'},{national_number:'1234567890123456'}]) {
    assert.throws(()=>W.contact({country:'United States',calling_code:'+1',national_number:'2025550101',...patch}));
  }
});
test('WhatsApp message carries exactly the displayed public price and encoded route', () => {
  const url = new URL(W.quoteURL('12025550101',{origin:'China, Port of Shanghai',destination:'Qatar, Hamad Port',container_type:'40HQ',currency:'USD',customer_minor:110000}));
  assert.equal(url.origin,'https://wa.me'); assert.equal(url.pathname,'/12025550101');
  assert.equal(url.searchParams.get('text'),'I am interested in the given Quote in the Website\nPOL: China, Port of Shanghai\nPOD: Qatar, Hamad Port\nContainer: 40HQ\nRate: USD 1,100.00');
  assert.throws(()=>W.quoteURL('',{}),e=>e.status===409);
});
