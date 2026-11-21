'use strict';
const { normalizeRef } = require('./domain');

function requestDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date).replaceAll('/', '');
}
function nextRequestNumber(date, existing) {
  const suffix = requestDate(date);
  const pattern = new RegExp('^([1-9][0-9]{0,2})' + suffix + '$');
  let maximum = 0;
  for (const value of existing) {
    const match = normalizeRef(String(value || '')).match(pattern);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  }
  if (maximum >= 999) throw Object.assign(new Error('The 999 customer request numbers for today have been used. Please create the shipment on the next Qatar calendar day.'), {status:409,statusCode:409});
  return String(maximum + 1) + suffix;
}
module.exports = { requestDate, nextRequestNumber };
