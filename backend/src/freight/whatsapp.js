const codes = require('../../../frontend/lib/data/phone-codes.json');
const D = require('./domain');
function contact(input) {
  const country = D.text(input.country,100);
  const calling_code = D.text(input.calling_code,4);
  if (!Object.hasOwn(codes,country) || codes[country] !== calling_code) D.fail('Select a valid country and calling code.');
  const raw = D.text(input.national_number,30);
  if (!/^[0-9 ()-]+$/.test(raw)) D.fail('Enter the WhatsApp number without the country code.');
  const national_number = raw.replace(/[ ()-]/g,'');
  const whatsapp_number = calling_code.slice(1) + national_number;
  if (!/^\d{5,14}$/.test(national_number) || !/^[1-9]\d{6,14}$/.test(whatsapp_number) || /^0+$/.test(national_number)) D.fail('Enter a valid international WhatsApp number (7–15 digits including country code).');
  return { country,calling_code,national_number,whatsapp_number };
}
function quoteURL(number, rate) {
  if (!/^[1-9]\d{6,14}$/.test(number || '')) D.fail('This operator has not added a WhatsApp number yet.',409);
  const price = Number(rate.customer_minor / 100).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  const message = `I am interested in the given Quote in the Website\nPOL: ${rate.origin}\nPOD: ${rate.destination}\nContainer: ${rate.container_type}\nRate: ${rate.currency} ${price}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
module.exports = { contact,quoteURL };
