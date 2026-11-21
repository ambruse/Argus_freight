const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  STAGES, normalizeRef, canonicalKey, validateChanges, safePublic,
  mapStatusToStageIndex, validDate, utcTimestamp,
} = require('../src/tracking/domain');

const newShipment = () => ({
  customer_name: 'Example Customer', mode: 'Sea Freight',
  pol_country: 'China', pol_city: 'Shanghai', pol_port: 'Port of Shanghai',
  pod_country: 'Qatar', pod_city: 'Umm Al Houl', pod_port: 'Hamad Port',
  commodity: 'Furniture', cargo_type: 'General cargo', package_count: 12,
  package_type: 'Cartons', gross_weight: '25.5', chargeable_weight: '40.6',
  weight_unit: 'KG', cargo_volume: 0.24, etd: '2026-11-24', eta: '2026-12-04',
});

test('legacy reference formats and child variants retain canonical identities', () => {
  assert.equal(normalizeRef(' arg-2408261-1 '), 'ARG-2408261');
  assert.equal(normalizeRef('ARG-2408261'), 'ARG-2408261');
  assert.equal(normalizeRef('11AD08NQ26-01'), '1AD08NQ26');
  assert.equal(canonicalKey({ ref_no: 'ARG-2408261-2' }), canonicalKey({ ref_no: 'ARG-2408261-1' }));
  assert.equal(canonicalKey({ ref_no: 'OTHER', cust_req_no: 'arg-2408261' }), 'ARG-2408261');
});

test('new shipment validation retains separate gross/chargeable values and normalizes mode', () => {
  const result = validateChanges(newShipment(), { isNew: true });
  assert.equal(result.mode, 'SEA');
  assert.equal(result.track_status, 'Confirmed');
  assert.equal(result.gross_weight, 25.5);
  assert.equal(result.chargeable_weight, 40.6);
  assert.equal(Object.hasOwn(result, 'status'), false);
});

test('new shipment requires cargo, country, schedule and weight details without invented defaults', () => {
  for (const field of ['pol_country', 'pod_port', 'commodity', 'chargeable_weight', 'eta']) {
    const body = newShipment();
    delete body[field];
    assert.throws(() => validateChanges(body, { isNew: true }), new RegExp(field));
  }
  assert.throws(() => validateChanges({ ...newShipment(), package_count: 0 }, { isNew: true }), /at least 1/);
});

test('tracking changes never accept commercial status or mass assignment', () => {
  assert.throws(() => validateChanges({ status: 'Delivered' }), /Commercial status/);
  for (const field of ['operator', 'created_by', 'updated_at', 'password_hash', 'is_admin']) {
    assert.throws(() => validateChanges({ [field]: 'x' }), /Unsupported tracking field/);
  }
  assert.deepEqual(validateChanges({ method: 'existing', ref_no: 'ARG-123-1', track_status: 'Scheduled' }), { track_status: 'Scheduled' });
});

test('financial field permissions are enforced even for null writes', () => {
  for (const field of ['cost', 'customer_charge', 'profit', 'actual_profit']) {
    assert.throws(() => validateChanges({ [field]: null }), error => error.status === 403);
  }
  assert.deepEqual(validateChanges({ cost: 5, profit: -2 }, { canFinance: true }), { cost: 5, profit: -2 });
});

test('date validation rejects impossible and timezone ambiguous input', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-13-01', '21/11/2026', '2026-11-21T00:00:00', '2026-02-30']) {
    assert.throws(() => validateChanges({ eta: date }), /valid date/);
  }
  assert.throws(() => validateChanges({ etd: '2026-11-24', eta: '2026-11-23' }), /ETA/);
  assert.throws(() => validateChanges({ actual_departure: '2026-11-24', actual_arrival: '2026-11-23' }), /Actual arrival/);
});

test('numeric validation rejects malformed, non-finite, negative and fractional counts', () => {
  for (const value of ['NaN', 'Infinity', '5x', '-1', '1e6', {}, []]) {
    assert.throws(() => validateChanges({ cargo_volume: value }));
  }
  assert.throws(() => validateChanges({ package_count: 1.5 }), /whole number/);
  assert.deepEqual(validateChanges({ cargo_volume: '.25', package_count: '2' }), { cargo_volume: 0.25, package_count: 2 });
});

test('legacy unit-bearing weights normalize without guessing conversions', () => {
  assert.deepEqual(validateChanges({ gross_weight: '20 KG', chargeable_weight: '30.5 kgs' }), { gross_weight: 20, chargeable_weight: 30.5, weight_unit: 'KG' });
  assert.throws(() => validateChanges({ gross_weight: '20 KG', chargeable_weight: '30 LB' }), /same weight unit/);
  assert.throws(() => validateChanges({ gross_weight: '20 KG', weight_unit: 'LB' }), /same weight unit/);
  assert.throws(() => validateChanges({ gross_weight: 'Twenty KG' }), /decimal/);
});

test('only supported modes, stages, units and booleans are accepted', () => {
  assert.deepEqual(validateChanges({ mode: 'road freight', dangerous_goods: false }), { mode: 'Road', dangerous_goods: 0 });
  for (const track_status of STAGES) assert.equal(validateChanges({ track_status }).track_status, track_status);
  assert.throws(() => validateChanges({ track_status: 'Lost' }));
  assert.throws(() => validateChanges({ mode: 'Teleport' }));
  assert.throws(() => validateChanges({ weight_unit: 'TONS' }));
  assert.throws(() => validateChanges({ dangerous_goods: 'false' }));
});

test('legacy free-text stages map to the existing six-stage model', () => {
  assert.equal(mapStatusToStageIndex('signed'), 5);
  assert.equal(mapStatusToStageIndex('wearhouse'), 4);
  assert.equal(mapStatusToStageIndex('Customs inspection'), 3);
  assert.equal(mapStatusToStageIndex('Flight departed'), 2);
  assert.equal(mapStatusToStageIndex('Carrier assigned'), 1);
  assert.equal(mapStatusToStageIndex(null), 0);
});

test('partial updates do not clear unspecified fields', () => {
  assert.deepEqual(validateChanges({ eta: '2026-12-05' }), { eta: '2026-12-05' });
  assert.deepEqual(validateChanges({ carrier: '' }), { carrier: null });
});

test('public serializer rejects every non-confirmed commercial status', () => {
  for (const status of ['Pending', 'Cancelled', 'Delivered', '', null]) {
    assert.equal(safePublic({ status, track_status: 'Delivered' }), null);
  }
  assert.equal(safePublic({ status: 'Confirmed', track_status: 'Delivered' }).status, 'Delivered');
});

test('public serializer allowlist excludes financial, contact and internal data including nested events', () => {
  const output = safePublic({
    status: 'Confirmed', ref_no: 'ARG-2111261-1', cost: 99, customer_charge: 199,
    profit: 100, actual_profit: 90, customer_name: 'PRIVATE_NAME', customer_email: 'PRIVATE_EMAIL',
    customer_phone: 'PRIVATE_PHONE', internal_notes: 'PRIVATE_NOTES', tracking_remarks: 'PRIVATE_REMARKS',
    operator: 'PRIVATE_OPERATOR', public_message: 'Cargo is being prepared',
  }, [{ id: 1, is_public: 1, event_title: 'Confirmed', event_time: '2026-11-21 10:00:00', created_by: 'PRIVATE_AUTHOR', internal_notes: 'PRIVATE_EVENT' }]);
  assert.equal(JSON.stringify(output).includes('PRIVATE'), false);
  for (const field of ['cost', 'profit', 'customer_charge', 'actual_profit', 'customer_email', 'customer_name', 'internal_notes', 'operator']) assert.equal(Object.hasOwn(output, field), false);
  assert.equal(output.public_message, 'Cargo is being prepared');
});

test('real event history is filtered and chronological without fabricating missing event times', () => {
  const output = safePublic({ status: 'Confirmed', track_status: 'Warehouse' }, [
    { id: 3, is_public: 1, event_time: '2026-11-23 12:00:00', event_title: 'Warehouse', new_status: 'Warehouse' },
    { id: 2, is_public: 0, event_time: '2026-11-22 12:00:00', event_title: 'Internal issue' },
    { id: 1, is_public: 1, event_time: '2026-11-21 12:00:00', event_title: 'Booking' },
  ]);
  assert.deepEqual(output.events.map(e => e.id), [1, 3]);
  assert.equal(output.events[0].event_time, '2026-11-21T12:00:00.000Z');
  assert.equal(output.timeline[0].location, 'Location not recorded');
  assert.equal(output.currentStageIndex, 4);
  assert.equal(output.events[0].created_at, null);
});

test('legacy records have an empty history and unknown location instead of invented milestones', () => {
  const output = safePublic({ status: 'Confirmed', track_status: 'In Transit', pol: 'Shanghai', weight: '100 KG', etd: '2026-11-21' });
  assert.deepEqual(output.events, []);
  assert.deepEqual(output.timeline, []);
  assert.equal(output.history_available, false);
  assert.equal(output.current_location, null);
  assert.equal(output.origin.country, 'Unknown');
  assert.equal(output.updated_at, null);
  assert.equal(output.chargeable_weight, '—');
  assert.equal(output.packages, '—');
});

test('structured locations and explicit zero weights survive public serialization', () => {
  const output = safePublic({ status: 'Confirmed', pol: 'China, Shanghai', pol_country: 'China', pol_city: 'Shanghai', pol_port: 'Port of Shanghai', pol_code: 'CNSHA', gross_weight: 0, chargeable_weight: 0, weight_unit: 'KG' });
  assert.equal(output.origin.city, 'Shanghai');
  assert.equal(output.origin.country, 'China');
  assert.equal(output.origin.code, 'CNSHA');
  assert.equal(output.gross_weight, '0 KG');
  assert.equal(output.chargeable_weight, '0 KG');
  assert.equal(Object.hasOwn(output.origin, 'lat'), false);
});

test('timestamps are normalized consistently to UTC', () => {
  assert.equal(utcTimestamp('2026-11-21 12:30:00'), '2026-11-21T12:30:00.000Z');
  assert.equal(utcTimestamp('2026-11-21T15:30:00+03:00'), '2026-11-21T12:30:00.000Z');
  assert.equal(utcTimestamp('invalid'), null);
});

test('the compact nine-field form is sufficient without fabricating other cargo details',()=>{
  const result=validateChanges({mode:'Sea Freight',pol_country:'China',pol_port:'Shanghai',pod_country:'Qatar',pod_port:'Hamad Port',commodity:'Furniture',chargeable_weight:'0.5',eta:'2026-12-04',etd:'2026-11-24'},{isNew:true});
  assert.equal(result.chargeable_weight,0.5);
  assert.equal(result.weight_unit,'KG');
  for(const key of ['customer_name','dimension','gross_weight','package_count','cargo_volume','cargo_type'])assert.equal(Object.hasOwn(result,key),false);
});

test('Sea and Road FCL creation requires a supported container, not weight or CBM', () => {
  for (const mode of ['SEA', 'Road']) for (const container_type of ['20FT', '40FT', '45FT', '40FT Reefer']) {
    const body = { ...newShipment(), mode, load_type: 'FCL', container_type };
    delete body.chargeable_weight; delete body.cargo_volume;
    const result = validateChanges(body, { isNew: true });
    assert.equal(result.container_type, container_type);
    assert.equal(result.load_type, 'FCL');
    assert.equal(result.chargeable_weight, undefined);
    assert.equal(result.cargo_volume, undefined);
  }
  assert.throws(() => validateChanges({ ...newShipment(), load_type: 'FCL' }, { isNew: true }), /container type/);
  assert.throws(() => validateChanges({ ...newShipment(), load_type: 'FCL', container_type: '99FT' }, { isNew: true }), /container type/);
  assert.throws(() => validateChanges({ ...newShipment(), mode: 'AIR', load_type: 'FCL', container_type: '20FT' }, { isNew: true }), /only available/);
  assert.throws(() => validateChanges({ load_type: 'INVALID' }), /FCL or LCL/);
});

test('LCL keeps weight validation and public tracking exposes operational container and document fields', () => {
  const body = { ...newShipment(), load_type: 'LCL' }; delete body.chargeable_weight;
  assert.throws(() => validateChanges(body, { isNew: true }), /chargeable_weight/);
  const output = safePublic({ status: 'Confirmed', mode: 'Road', load_type: 'FCL', container_type: '40FT Reefer', carrier: 'Example carrier', do_number: 'DO-123' });
  assert.equal(output.load_type, 'FCL'); assert.equal(output.container_type, '40FT Reefer');
  assert.equal(output.carrier, 'Example carrier'); assert.equal(output.bl_do_number, 'DO-123');
});
