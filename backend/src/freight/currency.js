// Explicit Argus business policy: QAR / 3.65 = USD. This is not a live FX feed.
const QAR_USD_NUMERATOR = 100;
const QAR_USD_DENOMINATOR = 365;
const currencies = ['USD', 'QAR'];
function toUSDMinor(minor, currency) {
  if (minor == null || !currencies.includes(currency)) return null;
  return currency === 'QAR' ? Math.round(Number(minor) * QAR_USD_NUMERATOR / QAR_USD_DENOMINATOR) : Number(minor);
}
function usdSQL(amount) {
  return `CASE v.currency WHEN 'USD' THEN ${amount} WHEN 'QAR' THEN ROUND((${amount}) * ${QAR_USD_NUMERATOR} / ${QAR_USD_DENOMINATOR},0) ELSE NULL END`;
}
function conversion(currency, minor) {
  return { source: 'Argus fixed business policy', policy: 'usd-qar-3.65-v1',
    source_currency: currency, target_currency: 'USD', divisor: currency === 'QAR' ? '3.65' : '1',
    usd_minor: toUSDMinor(minor, currency), recorded_at: new Date().toISOString() };
}
module.exports = { currencies, toUSDMinor, usdSQL, conversion };
