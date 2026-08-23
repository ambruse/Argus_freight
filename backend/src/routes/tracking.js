// backend/src/routes/tracking.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Sample mock tracking database for quick demonstration & fallback
const MOCK_SHIPMENTS = {
  'RFQ-2026-8842': {
    ref_no: 'RFQ-2026-8842',
    status: 'In Transit',
    currentStageIndex: 2, // 0: Confirmed, 1: Scheduled, 2: In Transit, 3: Clearance, 4: Warehouse, 5: Delivered
    origin: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    destination: { country: 'UNITED KINGDOM', city: 'London', code: 'LHR' },
    mode: 'Air Freight',
    carrier: 'Qatar Airways Cargo (QR 8140)',
    container_no: 'AWB-157-9948201',
    weight: '1,450 kg',
    packages: '12 Pallets',
    etd: '2026-08-20',
    eta: '2026-08-26',
    updated_at: '2026-08-23T14:30:00Z',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 18, 2026', time: '09:00 AM', location: 'Doha HQ, Qatar', status: 'completed', description: 'RFQ confirmed & booking registered.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 19, 2026', time: '02:15 PM', location: 'Hamad Int. Cargo Terminal', status: 'completed', description: 'Cargo slot reserved with carrier.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 21, 2026', time: '11:45 AM', location: 'Over Airspace (En Route to LHR)', status: 'active', description: 'Flight departed. Cargo currently in transit.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Estimated Aug 24', time: 'Pending', location: 'London Heathrow Customs', status: 'upcoming', description: 'Customs declaration & document verification.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Estimated Aug 25', time: 'Pending', location: 'Argus LHR Logistics Hub', status: 'upcoming', description: 'Arrival & deconsolidation at hub.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Estimated Aug 26', time: 'Pending', location: 'Final Consignee Address', status: 'upcoming', description: 'Final door-to-door delivery completion.' }
    ]
  },
  'RFQ-2026-9015': {
    ref_no: 'RFQ-2026-9015',
    status: 'Clearance',
    currentStageIndex: 3,
    origin: { country: 'UNITED ARAB EMIRATES', city: 'Dubai', code: 'DXB' },
    destination: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    mode: 'Sea Freight',
    carrier: 'Maersk Line (Vessel: STAR EXPRESS)',
    container_no: 'MRSK-8821049',
    weight: '18,200 kg',
    packages: '1 x 40ft High Cube Container',
    etd: '2026-08-12',
    eta: '2026-08-24',
    updated_at: '2026-08-23T16:00:00Z',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 10, 2026', time: '10:00 AM', location: 'Dubai Office, UAE', status: 'completed', description: 'Booking confirmed & container assigned.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 11, 2026', time: '04:30 PM', location: 'Jebel Ali Port, Dubai', status: 'completed', description: 'Gated in & loaded onto vessel.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 14, 2026', time: '08:00 AM', location: 'Arabian Gulf Maritime Route', status: 'completed', description: 'Ocean vessel voyage across Gulf.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Aug 23, 2026', time: '01:20 PM', location: 'Hamad Port Customs, Qatar', status: 'active', description: 'Customs inspections & duty assessment under review.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Estimated Aug 24', time: 'Pending', location: 'Argus Mesaieed Bonded Warehouse', status: 'upcoming', description: 'Offloading & staging for last-mile.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Estimated Aug 25', time: 'Pending', location: 'Doha Industrial Area', status: 'upcoming', description: 'Final consignee delivery.' }
    ]
  },
  'RFQ-2026-7410': {
    ref_no: 'RFQ-2026-7410',
    status: 'Delivered',
    currentStageIndex: 5,
    origin: { country: 'BAHRAIN', city: 'Manama', code: 'BAH' },
    destination: { country: 'SAUDI ARABIA', city: 'Riyadh', code: 'RUH' },
    mode: 'Land Freight',
    carrier: 'Argus Overland Express Fleet',
    container_no: 'TRK-GCC-5521',
    weight: '3,800 kg',
    packages: '4 Wooden Crates',
    etd: '2026-08-16',
    eta: '2026-08-19',
    updated_at: '2026-08-19T17:45:00Z',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 15, 2026', time: '08:30 AM', location: 'Manama Logistics Center', status: 'completed', description: 'RFQ confirmed.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Aug 16, 2026', time: '09:00 AM', location: 'King Fahd Causeway Border', status: 'completed', description: 'Border manifest dispatch scheduled.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Aug 17, 2026', time: '11:00 AM', location: 'Dammam Highway', status: 'completed', description: 'Overland transit across KSA network.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Aug 18, 2026', time: '02:00 PM', location: 'Riyadh Dry Port Customs', status: 'completed', description: 'Customs cleared successfully.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Aug 19, 2026', time: '09:30 AM', location: 'Argus Central Riyadh Hub', status: 'completed', description: 'Sorted & dispatched for final delivery.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Aug 19, 2026', time: '05:45 PM', location: 'Consignee Warehouse, Riyadh', status: 'completed', description: 'Signed and delivered to recipient.' }
    ]
  },
  'RFQ-2026-1102': {
    ref_no: 'RFQ-2026-1102',
    status: 'Confirmed',
    currentStageIndex: 0,
    origin: { country: 'CHINA', city: 'Shanghai', code: 'PVG' },
    destination: { country: 'QATAR', city: 'Doha', code: 'DOH' },
    mode: 'Air Freight',
    carrier: 'Argus Global Express Air',
    container_no: 'AWB-992-004812',
    weight: '620 kg',
    packages: '8 Cartons',
    etd: '2026-08-25',
    eta: '2026-08-29',
    updated_at: '2026-08-23T10:00:00Z',
    timeline: [
      { stage: 'Confirmed', label: 'Confirmed', date: 'Aug 23, 2026', time: '10:00 AM', location: 'Shanghai Cargo Hub', status: 'active', description: 'Booking confirmed, cargo received at consolidation station.' },
      { stage: 'Scheduled', label: 'Scheduled', date: 'Estimated Aug 24', time: 'Pending', location: 'PVG Airport Hub', status: 'upcoming', description: 'Flight manifest assignment in progress.' },
      { stage: 'In Transit', label: 'In Transit', date: 'Estimated Aug 25', time: 'Pending', location: 'International Flight Route', status: 'upcoming', description: 'Awaiting departure flight.' },
      { stage: 'Clearance', label: 'Clearance', date: 'Estimated Aug 27', time: 'Pending', location: 'Doha Customs Airport', status: 'upcoming', description: 'Customs clearance pending arrival.' },
      { stage: 'Warehouse', label: 'Warehouse', date: 'Estimated Aug 28', time: 'Pending', location: 'Argus Express Doha Warehouse', status: 'upcoming', description: 'Warehouse receipt & inspection.' },
      { stage: 'Delivered', label: 'Delivered', date: 'Estimated Aug 29', time: 'Pending', location: 'Doha Destination', status: 'upcoming', description: 'Scheduled door delivery.' }
    ]
  }
};

function mapStatusToStageIndex(statusStr) {
  if (!statusStr) return 2;
  const s = statusStr.toLowerCase();
  if (s.includes('confirm') || s.includes('new') || s.includes('draft') || s.includes('booked')) return 0;
  if (s.includes('schedul') || s.includes('assign') || s.includes('dispatch')) return 1;
  if (s.includes('transit') || s.includes('depart') || s.includes('shipped') || s.includes('sailing')) return 2;
  if (s.includes('clear') || s.includes('custom') || s.includes('inspect')) return 3;
  if (s.includes('warehous') || s.includes('arrived') || s.includes('hub') || s.includes('sort')) return 4;
  if (s.includes('deliver') || s.includes('complete') || s.includes('close')) return 5;
  return 2;
}

const STAGES = ['Confirmed', 'Scheduled', 'In Transit', 'Clearance', 'Warehouse', 'Delivered'];

function cleanSearchRef(input) {
  if (!input) return '';
  let cleaned = input.trim().toUpperCase();
  // Strip sequence suffix like -06, -01
  cleaned = cleaned.replace(/-\d+$/, '');
  // Normalize leading 11 to 1 if followed by letters (e.g. 11AD08NQ26 -> 1AD08NQ26)
  if (/^11[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/^11/, '1');
  }
  return cleaned;
}

router.get('/:ref', async (req, res) => {
  try {
    const rawRef = req.params.ref ? req.params.ref.trim() : '';
    const refUpper = rawRef.toUpperCase();
    const refCleaned = cleanSearchRef(rawRef);

    const lookupKey = MOCK_SHIPMENTS[refCleaned] ? refCleaned : refUpper;
    if (MOCK_SHIPMENTS[lookupKey]) {
      return res.json({
        success: true,
        data: MOCK_SHIPMENTS[lookupKey]
      });
    }

    let dbShipment = null;
    try {
      if (db && db.query) {
        const queryRes = await db.query(
          `SELECT * FROM shipments 
           WHERE UPPER(ref_no) = $1 OR UPPER(cust_req_no) = $1 OR UPPER(bl_number) = $1
              OR UPPER(ref_no) = $2 OR UPPER(cust_req_no) = $2 OR UPPER(bl_number) = $2
              OR UPPER(ref_no) LIKE $3 OR UPPER(cust_req_no) LIKE $3
           LIMIT 1`,
          [refUpper, refCleaned, `%${refCleaned}%`]
        );
        if (queryRes.rows && queryRes.rows.length > 0) {
          dbShipment = queryRes.rows[0];
        }
      }
    } catch (err) {
      console.warn('[Tracking API] DB query notice:', err.message);
    }

    if (dbShipment) {
      const mainStatus = (dbShipment.status || '').toLowerCase();
      const isConfirmedOrActive = [
        'confirmed', 'completed', 'in scheduled', 'in transit', 'clearance', 'warehouse', 'delivered', 'files pending'
      ].includes(mainStatus);

      if (!isConfirmedOrActive) {
        return res.json({
          success: false,
          message: 'No tracking information found'
        });
      }

      const currentTrackStatus = dbShipment.track_status || dbShipment.status || 'Confirmed';
      const activeIdx = mapStatusToStageIndex(currentTrackStatus);
      const originCountry = dbShipment.origin_country || 'QATAR';
      const originCity = dbShipment.origin_city || 'Doha';
      const destCountry = dbShipment.dest_country || 'UNITED KINGDOM';
      const destCity = dbShipment.dest_city || 'London';

      const timeline = STAGES.map((stageName, idx) => {
        let status = 'upcoming';
        if (idx < activeIdx) status = 'completed';
        else if (idx === activeIdx) status = 'active';

        return {
          stage: stageName,
          label: stageName,
          date: idx <= activeIdx ? (dbShipment.updated_at ? new Date(dbShipment.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent') : 'Pending',
          time: idx <= activeIdx ? 'Completed' : 'Pending',
          location: idx === 0 ? `${originCity}, ${originCountry}` : idx === 5 ? `${destCity}, ${destCountry}` : `Logistics Checkpoint #${idx + 1}`,
          status: status,
          description: `Stage ${idx + 1}: ${stageName} status logged.`
        };
      });

      return res.json({
        success: true,
        data: {
          ref_no: dbShipment.ref_no || refCleaned || refUpper,
          status: STAGES[activeIdx],
          currentStageIndex: activeIdx,
          origin: { country: originCountry.toUpperCase(), city: originCity },
          destination: { country: destCountry.toUpperCase(), city: destCity },
          mode: dbShipment.freight_type || 'Cargo Freight',
          carrier: dbShipment.carrier || 'Argus Shipping Fleet',
          container_no: dbShipment.bl_number || dbShipment.box_no || `CNTR-${refCleaned}`,
          weight: dbShipment.weight || 'Standard Weight',
          gross_weight: dbShipment.gross_weight || dbShipment.weight || 'Standard Weight',
          chargeable_weight: dbShipment.chargeable_weight || dbShipment.weight || 'Standard Weight',
          packages: dbShipment.cargo_description || 'General Cargo',
          etd: dbShipment.etd || 'N/A',
          eta: dbShipment.eta || 'N/A',
          updated_at: dbShipment.updated_at || new Date().toISOString(),
          timeline
        }
      });
    }

    // If RFQ is not in DB or mock data, return No tracking information found
    return res.json({
      success: false,
      message: 'No tracking information found'
    });

  } catch (error) {
    console.error('[Tracking API Error]', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve shipment tracking details.' });
  }
});

module.exports = router;
