const { createHash } = require('node:crypto');
class FreightError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (message, status) => { throw new FreightError(message, status); };
const currencies = ['USD', 'QAR', 'EUR'];
const services = ['FCL', 'REEFER', 'SPECIAL_EQUIPMENT'];
const bases = ['PORT_TO_PORT', 'DOOR_TO_PORT', 'PORT_TO_DOOR', 'DOOR_TO_DOOR'];
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      value < '2000-01-01' || value > '2199-12-31' ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Use a valid YYYY-MM-DD date.');
  return value;
}
function qatarToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function week(today = qatarToday()) {
  const start = new Date(`${date(today)}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
function money(value, allowZero = false) {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(String(value))) fail('Amounts must have at most two decimal places and be below 100,000,000.');
  const [whole, fraction = ''] = String(value).split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!allowZero && minor === 0) fail('Rate must be positive.');
  return minor;
}
function text(value, max = 500) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`Text must be at most ${max} characters.`);
  return value.trim();
}
function terms(value) {
  if (!Array.isArray(value) || value.length > 30) fail('Provide included and excluded charges as lists.');
  return [...new Set(value.map(v => text(v, 100).toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].sort();
}
function groupKey(rate) {
  return createHash('sha256').update(JSON.stringify([rate.origin_id, rate.destination_id, rate.container_type,
    rate.service, rate.basis, rate.details.inclusions, rate.details.exclusions])).digest('hex');
}
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Provide a rate object.');
  const rate = {};
  for (const key of ['origin_id', 'destination_id', 'container_type']) {
    rate[key] = text(input[key], 32);
    if (!/^[A-Z0-9_-]+$/.test(rate[key])) fail(`Select a valid ${key}.`);
  }
  if (rate.origin_id === rate.destination_id) fail('Origin and destination must be distinct.');
  rate.service = input.service; rate.basis = input.basis; rate.currency = input.currency;
  if (!services.includes(rate.service) || !bases.includes(rate.basis) || !currencies.includes(rate.currency)) fail('Select service, shipment basis and currency.');
  rate.valid_from = date(input.valid_from); rate.valid_until = date(input.valid_until);
  if (rate.valid_until < rate.valid_from) fail('Valid Until cannot precede Valid From.');
  rate.base_minor = money(input.price);
  if (typeof input.charges_confirmed !== 'boolean') fail('Confirm whether all mandatory charges are known.');
  rate.charges_confirmed = input.charges_confirmed;
  rate.surcharge_minor = input.surcharge === '' || input.surcharge == null ? null : money(input.surcharge, true);
  if (rate.charges_confirmed && rate.surcharge_minor === null) fail('Enter mandatory surcharges explicitly, including 0 when none apply.');
  rate.total_minor = rate.charges_confirmed ? rate.base_minor + rate.surcharge_minor : null;
  rate.details = { inclusions: terms(input.inclusions), exclusions: terms(input.exclusions) };
  if (!rate.details.inclusions.length) fail('Specify what the price includes.');
  if (rate.details.inclusions.some(t => rate.details.exclusions.includes(t))) fail('A charge cannot be both included and excluded.');
  for (const key of ['carrier', 'transit_time', 'remarks', 'quotation_reference', 'surcharge_details']) rate.details[key] = text(input[key]);
  if (rate.surcharge_minor > 0 && !rate.details.surcharge_details) fail('Describe the mandatory surcharges.');
  rate.group_key = groupKey(rate);
  return rate;
}
function eligible(rate, onDate) {
  return rate.status === 'active' && rate.total_minor != null &&
    rate.valid_from <= onDate && rate.valid_until >= onDate;
}
function selectBest(rates, onDate, published = false) {
  date(onDate);
  const groups = new Map();
  for (const rate of rates) {
    if (!eligible(rate, onDate)) continue;
    const key = `${rate.group_key}:${rate.currency}`;
    const cost = published ? Math.ceil(Number(rate.total_minor) * (10000 + Number(rate.markup_bps || 0)) / 10000) : Number(rate.total_minor);
    const old = groups.get(key);
    if (!old || cost < old.cost || (cost === old.cost && `${rate.created_at}|${rate.id}` < `${old.rate.created_at}|${old.rate.id}`)) groups.set(key, { rate, cost });
  }
  return [...groups.values()].map(x => x.rate);
}
function canManage(user, rate) { return user.role === 'admin' || (user.role === 'operator' && Number(user.id) === Number(rate.operator_id)); }
module.exports = { FreightError, fail, date, qatarToday, week, money, text, validate, selectBest, canManage, currencies, services, bases };
