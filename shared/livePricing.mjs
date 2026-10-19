// Fixed-point quantities and money: nine decimal places, no floating-point pricing.
const S = 1000000000n;
export class PricingError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}
export const fail = (message, status) => { throw new PricingError(message, status); };
export const text = (v, max = 200) => { if (typeof v !== 'string' || v.length > max || /[\x00-\x1f]/.test(v))
    fail('Invalid text.'); return v.trim(); };
const divRound = (a, b) => (a + b / 2n) / b;
export function decimal(v, zero = true) {
    const str = String(v ?? '');
    if (!/^\d{1,10}(\.\d{1,9})?$/.test(str))
        fail('Enter a non-negative decimal with at most nine decimal places.');
    const [a, b = ''] = str.split('.');
    const n = BigInt(a) * S + BigInt(b.padEnd(9, '0'));
    if (!zero && n === 0n)
        fail('Enter a positive amount.');
    return n;
}
const mul = (a, b) => divRound(a * b, S), divide = (a, b) => divRound(a * S, b);
const number = v => Number(v) / Number(S);
const roundUp = (v, step) => step ? ((v + step - 1n) / step) * step : v;
const money = (v, rounding = 'NEAREST') => { const cents = rounding === 'UP' ? (v + 9999999n) / 10000000n : divRound(v, 10000000n); return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`; };
const units = { mm: '0.001', cm: '0.01', m: '1', in: '0.0254', ft: '0.3048' };
const weights = { kg: '1', tonne: '1000', lb: '0.45359237' };
export const models = { AIR: ['KG'], LCL: ['CBM', 'TONNE', 'WM'], FCL: ['CONTAINER'], TRUCK: ['FIXED', 'VEHICLE', 'KG', 'CBM', 'TONNE', 'KM'] };
export const today = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export function date(v) { if (!/^20\d\d-\d\d-\d\d$/.test(v || '') || !Number.isFinite(Date.parse(v)) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v)
    fail('Enter a valid date.'); return v; }
function integer(v, max = 1000000) { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > max)
    fail('Enter a positive whole quantity.'); return n; }
function totals(cargo) {
    if (!Array.isArray(cargo) || !cargo.length || cargo.length > 100)
        fail('Enter between 1 and 100 cargo lines.');
    let cbm = 0n, kg = 0n, packages = 0;
    for (const line of cargo) {
        const qty = integer(line.quantity);
        packages += qty;
        if (packages > 1000000)
            fail('Package quantity exceeds the supported limit.');
        if (!weights[line.weight_unit] || !['LINE', 'PACKAGE'].includes(line.weight_basis))
            fail('Select weight unit and weight basis.');
        kg += mul(decimal(line.weight, false), decimal(weights[line.weight_unit])) * BigInt(line.weight_basis === 'PACKAGE' ? qty : 1);
        if (line.input === 'CBM')
            cbm += decimal(line.cbm, false); // Direct CBM is total line volume.
        else {
            if (line.input !== 'DIMENSIONS' || !units[line.unit])
                fail('Select the dimension unit.');
            const f = decimal(units[line.unit]);
            const volume = mul(mul(mul(decimal(line.length, false), f), mul(decimal(line.width, false), f)), mul(decimal(line.height, false), f));
            if (volume === 0n)
                fail('Dimensions are too small to measure reliably.');
            cbm += volume * BigInt(qty);
        }
    }
    return { cbm, kg, packages };
}
export function measure(cargo) { const v = totals(cargo); return { cbm: number(v.cbm), kg: number(v.kg), packages: v.packages }; }
export function shipment(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        fail('Enter shipment details.');
    const s = { origin_id: text(input.origin_id || '', 40), destination_id: text(input.destination_id || '', 40), mode: input.mode, subtype: input.subtype };
    if (!s.origin_id || !s.destination_id || s.origin_id === s.destination_id)
        fail('Choose distinct origin and destination locations.');
    if (!['AIR', 'SEA', 'TRUCK'].includes(s.mode))
        fail('Select AIR, SEA or TRUCK.');
    s.subtype = s.mode === 'SEA' ? s.subtype : s.mode === 'AIR' ? 'AIR' : s.subtype;
    if ((s.mode === 'SEA' && !['LCL', 'FCL'].includes(s.subtype)) || (s.mode === 'TRUCK' && !['LTL', 'FTL'].includes(s.subtype)))
        fail('Select the shipment type.');
    s.size = s.subtype === 'FCL' ? input.size : '';
    s.equipment = s.subtype === 'FCL' ? input.equipment : '';
    if (s.subtype === 'FCL' && (!['20', '40', '40HQ'].includes(s.size) || !['DRY', 'REEFER'].includes(s.equipment)))
        fail('Select a supported container size and type.');
    s.truck = s.mode === 'TRUCK' ? text(input.truck || '', 100) : '';
    s.quantity = ['FCL', 'FTL'].includes(s.subtype) ? integer(input.quantity || 1, 10000) : 1;
    s.cargo = s.subtype === 'FCL' ? (input.cargo?.length ? input.cargo : []) : input.cargo;
    s.totals = s.cargo?.length ? measure(s.cargo) : { cbm: 0, kg: 0, packages: 0 };
    if (s.subtype !== 'FCL' && !s.cargo?.length)
        fail('Enter cargo dimensions/CBM and weight.');
    // Retain only normalized shipment fields in the auditable snapshot.
    s.cargo = (s.cargo || []).map(l => ({ input: l.input, unit: l.unit || 'cm', length: String(l.length || ''), width: String(l.width || ''), height: String(l.height || ''), cbm: String(l.cbm || ''), quantity: integer(l.quantity), weight: String(l.weight), weight_unit: l.weight_unit, weight_basis: l.weight_basis }));
    return s;
}
function terms(v) { if (!Array.isArray(v) || v.length > 30)
    fail('Enter charge conditions as lists.'); return [...new Set(v.map(t => text(t, 120)).filter(Boolean))].sort(); }
export function validateRate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        fail('Enter a tariff configuration.');
    const c = {};
    for (const k of ['origin_id', 'destination_id', 'carrier', 'service']) {
        c[k] = text(input[k] || '', k.endsWith('_id') ? 40 : 120);
        if (!c[k])
            fail(`${k.replaceAll('_', ' ')} is required.`);
    }
    if (c.origin_id === c.destination_id)
        fail('Origin and destination must differ.');
    c.mode = input.mode;
    c.subtype = c.mode === 'AIR' ? 'AIR' : input.subtype;
    if (!['AIR', 'SEA', 'TRUCK'].includes(c.mode) || (c.mode === 'SEA' && !['LCL', 'FCL'].includes(c.subtype)) || (c.mode === 'TRUCK' && !['FTL', 'LTL'].includes(c.subtype)))
        fail('Select a valid mode and service type.');
    c.size = c.subtype === 'FCL' ? input.size : '';
    c.equipment = c.subtype === 'FCL' ? input.equipment : '';
    c.truck = c.mode === 'TRUCK' ? text(input.truck || '', 100) : '';
    if (c.subtype === 'FCL' && (!['20', '40', '40HQ'].includes(c.size) || !['DRY', 'REEFER'].includes(c.equipment)))
        fail('Invalid container configuration.');
    if (c.mode === 'TRUCK' && !c.truck)
        fail('Truck/load class is required.');
    c.currency = input.currency;
    if (!['USD', 'QAR'].includes(c.currency))
        fail('Choose USD or QAR.');
    c.valid_from = date(input.valid_from);
    c.valid_until = date(input.valid_until);
    if (c.valid_until < c.valid_from)
        fail('Validity end must follow its start.');
    c.model = input.model;
    if (!models[c.mode === 'SEA' ? c.subtype : c.mode]?.includes(c.model))
        fail('Invalid pricing model for this service.');
    c.inclusions = terms(input.inclusions || []);
    c.exclusions = terms(input.exclusions || []);
    if (!c.inclusions.length)
        fail('State what the customer price includes.');
    if (c.inclusions.some(t => c.exclusions.some(e => e.toLowerCase() === t.toLowerCase())))
        fail('A charge cannot be included and excluded.');
    for (const key of ['minimum_units', 'minimum_charge', 'rounding_step', 'capacity_kg', 'capacity_cbm']) {
        const n = decimal(input[key] || '0');
        c[key] = String(input[key] || '0');
        if (n > decimal('100000000'))
            fail('Pricing constraint is too large.');
    }
    c.rounding = input.rounding || 'NEAREST';
    if (!['NEAREST', 'UP'].includes(c.rounding))
        fail('Invalid monetary rounding.');
    c.divisor = c.mode === 'AIR' ? String(input.divisor || '6000') : '6000';
    if (c.mode === 'AIR' && (decimal(c.divisor) < decimal('1000') || decimal(c.divisor) > decimal('12000')))
        fail('Air divisor must be between 1000 and 12000 cm³/kg.');
    c.weight_break = c.mode === 'AIR' && input.weight_break === true;
    c.wm_cbm = String(input.wm_cbm || '1');
    c.wm_tonne = String(input.wm_tonne || '1');
    decimal(c.wm_cbm, false);
    decimal(c.wm_tonne, false);
    c.distance = c.model === 'KM' ? String(input.distance || '') : '';
    c.distance_source = c.model === 'KM' ? text(input.distance_source || '', 200) : '';
    if (c.model === 'KM' && (!c.distance_source || !decimal(c.distance, false)))
        fail('A verified route distance and source are required.');
    if (!Array.isArray(input.tiers) || !input.tiers.length)
        fail('Add at least one pricing tier.');
    c.tiers = input.tiers.map(t => { decimal(t.minimum); decimal(t.price, false); return { minimum: String(t.minimum), price: String(t.price) }; }).sort((a, b) => decimal(a.minimum) < decimal(b.minimum) ? -1 : 1);
    for (let i = 1; i < c.tiers.length; i++)
        if (decimal(c.tiers[i].minimum) === decimal(c.tiers[i - 1].minimum))
            fail('Tier thresholds must be unique.');
    if (['FIXED', 'VEHICLE', 'CONTAINER', 'KM'].includes(c.model) && (c.tiers.length !== 1 || decimal(c.tiers[0].minimum) !== 0n))
        fail('This model needs one flat price with a zero threshold.');
    if (!Array.isArray(input.charges || []))
        fail('Invalid additional charges.');
    c.charges = (input.charges || []).map(ch => { const name = text(ch.name || '', 100); const amount = decimal(ch.amount); if (!name || !['SHIPMENT', 'KG', 'CBM', 'TONNE', 'CONTAINER', 'VEHICLE', 'PERCENT'].includes(ch.basis))
        fail('Invalid additional charge.'); if (ch.basis === 'PERCENT' && amount > decimal('100'))
        fail('Percentage cannot exceed 100.'); if (ch.basis === 'CONTAINER' && c.subtype !== 'FCL')
        fail('Container charges require FCL.'); if (ch.basis === 'VEHICLE' && c.mode !== 'TRUCK')
        fail('Vehicle charges require TRUCK.'); if (c.subtype === 'FCL' && ['KG', 'CBM', 'TONNE'].includes(ch.basis))
        fail('FCL charges must be per container, shipment or percentage.'); return { name, basis: ch.basis, amount: String(ch.amount), tax: text(ch.tax || 'No additional tax', 120) }; });
    return c;
}
export function compatibleKey(c) { return JSON.stringify([c.origin_id, c.destination_id, c.mode, c.subtype, c.size || '', c.equipment || '', c.truck || '', c.service.toLowerCase(), c.inclusions.map(x => x.toLowerCase()).sort(), c.exclusions.map(x => x.toLowerCase()).sort()]); }
export function calculate(c, raw) {
    const s = shipment(raw);
    if (['origin_id', 'destination_id', 'mode', 'subtype', 'size', 'equipment', 'truck'].some(k => (c[k] || '') !== (s[k] || '')))
        return null;
    const t = s.cargo.length ? totals(s.cargo) : { cbm: 0n, kg: 0n, packages: 0 };
    const vehicles = BigInt(s.quantity);
    if ((decimal(c.capacity_kg) > 0n && t.kg > decimal(c.capacity_kg) * vehicles) || (decimal(c.capacity_cbm) > 0n && t.cbm > decimal(c.capacity_cbm) * vehicles))
        return null;
    const volumetric = c.mode === 'AIR' ? divide(t.cbm * 1000000n, decimal(c.divisor)) : 0n;
    let unitsValue = { KG: c.mode === 'AIR' ? (t.kg > volumetric ? t.kg : volumetric) : t.kg, CBM: t.cbm, TONNE: t.kg / 1000n, WM: 0n, CONTAINER: vehicles * S, VEHICLE: vehicles * S, FIXED: S, KM: c.model === 'KM' ? decimal(c.distance) : 0n }[c.model];
    if (c.model === 'WM') {
        const volume = divide(t.cbm, decimal(c.wm_cbm));
        const weight = divide(t.kg / 1000n, decimal(c.wm_tonne));
        unitsValue = volume > weight ? volume : weight;
    }
    unitsValue = roundUp(unitsValue > decimal(c.minimum_units) ? unitsValue : decimal(c.minimum_units), decimal(c.rounding_step));
    const tierFor = q => c.tiers.filter(x => decimal(x.minimum) <= q).at(-1);
    function cost(q) { const tier = tierFor(q); if (!tier)
        return null; let base = mul(q, decimal(tier.price)); if (base < decimal(c.minimum_charge))
        base = decimal(c.minimum_charge); const extras = c.charges.map(ch => { const count = { SHIPMENT: S, KG: t.kg, CBM: t.cbm, TONNE: t.kg / 1000n, CONTAINER: vehicles * S, VEHICLE: vehicles * S, PERCENT: base / 100n }[ch.basis]; return { name: ch.name, basis: ch.basis, tax: ch.tax, value: mul(decimal(ch.amount), count) }; }); return { base, extras, tier, q, total: base + extras.reduce((sum, ch) => sum + ch.value, 0n) }; }
    let selected = cost(unitsValue);
    if (c.weight_break)
        for (const tier of c.tiers) {
            if (decimal(tier.minimum) <= unitsValue)
                continue;
            const other = cost(roundUp(decimal(tier.minimum), decimal(c.rounding_step)));
            if (other && (!selected || other.total < selected.total))
                selected = other;
        }
    if (!selected)
        return null;
    const usd = v => c.currency === 'QAR' ? divRound(v * 100n, 365n) : v;
    // Round displayed lines once, then sum cents so the itemization always adds up.
    const base = money(usd(selected.base), c.rounding);
    const charges = selected.extras.map(ch => ({ name: ch.name, basis: ch.basis, tax: ch.tax, amount: money(usd(ch.value), c.rounding) }));
    const total = money(decimal(base) + charges.reduce((a, ch) => a + decimal(ch.amount), 0n));
    if (decimal(total) === 0n)
        return null;
    return { currency: 'USD', base, charges, total, basis: c.model, pricing_units: number(selected.q), tier_minimum: selected.tier.minimum, actual_kg: number(t.kg), cbm: number(t.cbm), packages: t.packages, volumetric_kg: c.mode === 'AIR' ? number(volumetric) : null, chargeable_kg: c.mode === 'AIR' ? number(unitsValue) : null, billed_kg: c.mode === 'AIR' ? number(selected.q) : null, divisor: c.mode === 'AIR' ? c.divisor : null, service: c.service, inclusions: c.inclusions, exclusions: c.exclusions, valid_from: c.valid_from, valid_until: c.valid_until, conversion: { policy: 'ARGUS-QAR-3.65', source_currency: c.currency, divisor: c.currency === 'QAR' ? '3.65' : '1' } };
}
export function cheapest(candidates, request, onDate = today()) {
    return candidates.filter(r => r.status === 'approved' && r.config.valid_from <= onDate && r.config.valid_until >= onDate).map(r => ({ rate: r, result: calculate(r.config, request) })).filter(r => r.result).sort((a, b) => { const d = decimal(a.result.total) - decimal(b.result.total); return d < 0n ? -1 : d > 0n ? 1 : `${a.rate.created_at}|${a.rate.id}`.localeCompare(`${b.rate.created_at}|${b.rate.id}`); })[0] || null;
}
export function moneyDifference(a, b) {
    const cents = (decimal(a) - decimal(b)) / 10000000n;
    return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
