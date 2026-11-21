'use strict';

// This module has no database or transport dependencies. Both public and internal
// tracking routes use these explicit contracts rather than returning DB records.
const STAGES = Object.freeze(['Confirmed', 'Scheduled', 'In Transit', 'Clearance', 'Warehouse', 'Delivered']);
const CONTAINER_TYPES = Object.freeze(['20FT', '40FT', '45FT', '40FT Reefer']);
const FINANCIAL_FIELDS = Object.freeze(['cost', 'customer_charge', 'profit', 'actual_profit']);
const FIELD_TYPES = Object.freeze({
  ...Object.fromEntries(`customer_id cust_req_no customer_name customer_email customer_phone shipment_type booking_reference carrier carrier_booking_number house_bl_number master_bl_number do_number so_number bl_number container_number box_no pol pod pol_country pol_city pol_port pol_code pod_country pod_city pod_port pod_code place_of_receipt final_delivery_location transit_country transshipment_port commodity cargo_type package_type weight_unit dimension container container_type container_size hs_code current_location current_country last_known_facility next_milestone vessel_name voyage_number flight_number vehicle_number border_crossing term weight`.split(' ').map(k => [k, 'text'])),
  ...Object.fromEntries(`transit_stops route_notes special_handling cargo_remarks tracking_remarks delay_reason internal_notes public_message`.split(' ').map(k => [k, 'longtext'])),
  ...Object.fromEntries(`etd eta actual_departure actual_arrival booking_date cargo_ready_date pickup_date customs_clearance_date warehouse_arrival_date delivery_date next_update`.split(' ').map(k => [k, 'date'])),
  ...Object.fromEntries(`gross_weight chargeable_weight cargo_volume net_weight cost customer_charge profit actual_profit`.split(' ').map(k => [k, 'decimal'])),
  package_count: 'integer', container_count: 'integer', dangerous_goods: 'boolean', mode: 'mode', track_status: 'stage', load_type: 'load_type',
});
const REQUIRED_NEW_FIELDS = Object.freeze(`mode pol_country pol_port pod_country pod_port commodity chargeable_weight etd eta`.split(' '));

function failure(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

function normalizeRef(input) {
  if (typeof input !== 'string') return '';
  let cleaned = input.trim().toUpperCase();
  const parts = cleaned.split('-');
  if (parts[0] === 'ARG' && parts.length > 2) return `${parts[0]}-${parts[1]}`;
  if (!cleaned.startsWith('ARG-')) {
    cleaned = cleaned.replace(/-\d+$/, '');
    if (/^11[A-Z]/.test(cleaned)) cleaned = cleaned.replace(/^11/, '1');
  }
  return cleaned;
}

function canonicalKey(row) {
  return normalizeRef(row?.cust_req_no || row?.ref_no || '');
}

function mapStatusToStageIndex(value) {
  const s = String(value || '').toLowerCase().trim();
  if (s === 'delivered' || /deliver|complete|close|\bsigned\b/.test(s)) return 5;
  if (/warehous|wearhous|arrived|hub|sort|facility/.test(s)) return 4;
  if (/clear|custom|inspect|declaration/.test(s)) return 3;
  if (/transit|depart|shipped|sailing|flight/.test(s)) return 2;
  if (/schedul|assign|dispatch/.test(s)) return 1;
  return 0;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateChanges(body, { isNew = false, canFinance = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw failure('Shipment details must be an object.');
  const changes = {};
  const observedUnits = new Set();
  for (const [key, raw] of Object.entries(body)) {
    if (key === 'method' || key === 'ref_no') continue;
    if (key === 'status') throw failure('Commercial status cannot be edited through tracking.');
    if (!Object.hasOwn(FIELD_TYPES, key)) throw failure(`Unsupported tracking field: ${key}.`);
    if (FINANCIAL_FIELDS.includes(key) && !canFinance) throw failure('Only administrators can edit financial information.', 403);
    if (raw === undefined) continue;
    if (raw === null || raw === '') {
      if (key === 'track_status' || key === 'mode') throw failure(`${key} cannot be empty.`);
      changes[key] = null;
      continue;
    }
    const type = FIELD_TYPES[key];
    if (type === 'boolean') {
      if (![true, false, 1, 0, '1', '0'].includes(raw)) throw failure(`${key} must be true or false.`);
      changes[key] = raw === true || raw === 1 || raw === '1' ? 1 : 0;
    } else if (type === 'decimal' || type === 'integer') {
      let text = String(raw).trim();
      if (['gross_weight', 'chargeable_weight'].includes(key)) {
        const unitMatch = text.match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))\s*(KG|KGS|LB|LBS)$/i);
        if (unitMatch) {
          text = unitMatch[1];
          observedUnits.add(/^KG/i.test(unitMatch[2]) ? 'KG' : 'LB');
        }
      }
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) throw failure(`${key} must be a valid decimal number.`);
      const n = Number(text);
      if (!Number.isFinite(n) || Math.abs(n) > 999999999999.99 || (!['profit', 'actual_profit'].includes(key) && n < 0)) throw failure(`${key} is outside the allowed range.`);
      if (type === 'integer' && (!Number.isSafeInteger(n) || n > 2147483647)) throw failure(`${key} must be a whole number.`);
      changes[key] = n;
    } else if (type === 'date') {
      if (!validDate(raw)) throw failure(`${key} must be a valid date in YYYY-MM-DD format.`);
      changes[key] = raw;
    } else {
      if (typeof raw !== 'string') throw failure(`${key} must be text.`);
      const value = raw.trim();
      const limit = type === 'longtext' ? 5000 : ['cust_req_no', 'customer_id'].includes(key) ? 50 : 255;
      if (value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw failure(`${key} contains invalid or excessively long text.`);
      if (type === 'stage') {
        if (!STAGES.includes(value)) throw failure('Choose a valid shipment tracking stage.');
        changes[key] = value;
      } else if (type === 'load_type') {
        if (!['FCL', 'LCL'].includes(value.toUpperCase())) throw failure('Choose FCL or LCL.');
        changes[key] = value.toUpperCase();
      } else if (type === 'mode') {
        const modes = { air: 'AIR', 'air freight': 'AIR', sea: 'SEA', 'sea freight': 'SEA', ocean: 'SEA', road: 'Road', land: 'Road', 'road freight': 'Road' };
        if (!modes[value.toLowerCase()]) throw failure('Choose Air, Sea or Road Freight.');
        changes[key] = modes[value.toLowerCase()];
      } else if (key === 'weight_unit') {
        const unit = { kg: 'KG', kgs: 'KG', lb: 'LB', lbs: 'LB' }[value.toLowerCase()];
        if (!unit) throw failure('Weight unit must be KG or LB.');
        changes[key] = unit;
      } else {
        if (key === 'customer_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw failure('Enter a valid customer email.');
        changes[key] = value || null;
      }
    }
  }
  if (changes.weight_unit) observedUnits.add(changes.weight_unit);
  if (observedUnits.size > 1) throw failure('Gross and chargeable weights must use the same weight unit.');
  if (observedUnits.size && !changes.weight_unit) changes.weight_unit = [...observedUnits][0];
  if (isNew) {
    if (['SEA', 'Road'].includes(changes.mode)) changes.load_type ||= 'LCL';
    for (const key of REQUIRED_NEW_FIELDS) {
      if (key === 'chargeable_weight' && changes.load_type === 'FCL') continue;
      if (changes[key] === undefined || changes[key] === null || changes[key] === '') throw failure(`${key} is required for a new confirmed shipment.`);
    }
    if (changes.package_count != null && changes.package_count < 1) throw failure('package_count must be at least 1.');
    changes.track_status ||= 'Confirmed';
    changes.weight_unit ||= 'KG';
    validateLoadConfiguration(changes);
  }
  if (changes.etd && changes.eta && changes.eta < changes.etd) throw failure('ETA must be on or after ETD.');
  if (changes.actual_departure && changes.actual_arrival && changes.actual_arrival < changes.actual_departure) throw failure('Actual arrival must be on or after actual departure.');
  return changes;
}

function validateLoadConfiguration(row) {
  if (!row.load_type) return; // Existing records may have no recorded load type.
  if (!['FCL', 'LCL'].includes(row.load_type)) throw failure('Choose FCL or LCL.');
  if (!/^(sea|sea freight|ocean|road|road freight|land)$/i.test(row.mode || '')) throw failure('FCL and LCL are only available for Sea and Road Freight.');
  if (row.load_type === 'FCL' && !CONTAINER_TYPES.includes(row.container_type)) throw failure('Choose a container type: 20FT, 40FT, 45FT or 40FT Reefer.');
}

function utcTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  let text = String(value);
  // MySQL DATETIME values are stored in UTC and returned without a timezone.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) text = `${text.replace(' ', 'T')}Z`;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function displayDate(value) {
  const time = utcTimestamp(value);
  return time ? new Date(time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
}

function location(row, prefix) {
  const raw = row[prefix] || null;
  return {
    city: row[`${prefix}_city`] || raw || 'Unknown',
    country: row[`${prefix}_country`] || 'Unknown',
    port: row[`${prefix}_port`] || raw || null,
    code: row[`${prefix}_code`] || null,
    name: row[`${prefix}_port`] || row[`${prefix}_city`] || raw || 'Unknown',
  };
}

function safePublic(row, events = []) {
  if (!row || String(row.status || '').trim().toLowerCase() !== 'confirmed') return null;
  const currentStageIndex = mapStatusToStageIndex(row.track_status);
  const unit = row.weight_unit || null;
  const weightDisplay = value => value === null || value === undefined || value === '' ? '—' : `${value}${unit && !/[a-z]/i.test(String(value)) ? ` ${unit}` : ''}`;
  const publicEvents = events.filter(e => e.is_public === true || Number(e.is_public) === 1).map(e => ({
    id: e.id,
    event_type: e.event_type || 'update',
    event_title: e.event_title || 'Tracking update',
    event_description: e.event_description || '',
    location_name: e.location_name || null,
    location_country: e.location_country || null,
    event_time: utcTimestamp(e.event_time),
    created_at: utcTimestamp(e.created_at),
    previous_status: STAGES.includes(e.previous_status) ? e.previous_status : null,
    new_status: STAGES.includes(e.new_status) ? e.new_status : null,
    source: e.source === 'carrier' ? 'carrier' : 'staff',
  })).sort((a, b) => String(a.event_time || '').localeCompare(String(b.event_time || '')) || Number(a.id) - Number(b.id));
  return {
    ref_no: row.ref_no,
    cust_req_no: row.cust_req_no || '',
    status: STAGES[currentStageIndex],
    track_status: STAGES[currentStageIndex],
    currentStageIndex,
    origin: location(row, 'pol'), destination: location(row, 'pod'),
    pol: row.pol || row.pol_port || '—', pod: row.pod || row.pod_port || '—',
    pol_country: row.pol_country || null, pod_country: row.pod_country || null,
    mode: row.mode || 'Unknown', carrier: row.carrier || '—',
    load_type: row.load_type || null, container_type: row.container_type || null,
    bl_do_number: row.bl_number || row.do_number || row.house_bl_number || null,
    container_no: row.bl_number || row.house_bl_number || row.do_number || row.so_number || row.box_no || '—',
    container_number: row.container_number || null,
    bl_number: row.bl_number || row.house_bl_number || null,
    commodity: row.commodity || '—', term: row.term || '—', dimension: row.dimension || '—', container: row.container || '—',
    weight: row.weight || '—', gross_weight: weightDisplay(row.gross_weight ?? row.weight), chargeable_weight: weightDisplay(row.chargeable_weight),
    weight_unit: unit, cargo_volume: row.cargo_volume ?? null,
    package_count: row.package_count ?? null, package_type: row.package_type || null,
    packages: row.package_count ?? '—',
    etd: displayDate(row.etd), eta: displayDate(row.eta),
    etd_date: row.etd ? String(row.etd).slice(0, 10) : null, eta_date: row.eta ? String(row.eta).slice(0, 10) : null,
    actual_departure: row.actual_departure || null, actual_arrival: row.actual_arrival || null,
    updated_at: utcTimestamp(row.last_tracking_update || row.updated_at),
    current_location: row.current_location || null, current_country: row.current_country || null,
    last_known_facility: row.last_known_facility || null, public_message: row.public_message || null,
    next_milestone: row.next_milestone || null, next_update: row.next_update || null,
    events: publicEvents,
    timeline: publicEvents.map(e => ({
      ...e, stage: e.new_status, label: e.event_title,
      date: displayDate(e.event_time),
      time: e.event_time ? new Date(e.event_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : 'Time not recorded',
      location: [e.location_name, e.location_country].filter(Boolean).join(', ') || 'Location not recorded',
      status: 'completed', description: e.event_description,
    })),
    history_available: publicEvents.length > 0,
  };
}

module.exports = { CONTAINER_TYPES, validateLoadConfiguration, STAGES, FINANCIAL_FIELDS, FIELD_TYPES, REQUIRED_NEW_FIELDS, normalizeRef, canonicalKey, mapStatusToStageIndex, stageIndex: mapStatusToStageIndex, validDate, validateChanges, safePublic, utcTimestamp };
