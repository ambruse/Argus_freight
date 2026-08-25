// backend/src/routes/tracking.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getAllSuffixes } = require('../config/dbHelper');

const STAGES = ['Confirmed', 'Scheduled', 'In Transit', 'Clearance', 'Warehouse', 'Delivered'];

function mapStatusToStageIndex(statusStr) {
  if (!statusStr) return 0;
  const s = statusStr.toLowerCase().trim();
  
  if (s === 'delivered' || s.includes('deliver') || s.includes('complete') || s.includes('close') || s.includes('signed')) return 5;
  if (s === 'warehouse' || s === 'wearhouse' || s.includes('warehous') || s.includes('wearhous') || s.includes('arrived') || s.includes('hub') || s.includes('sort') || s.includes('facility')) return 4;
  if (s === 'clearance' || s === 'clearence' || s.includes('clear') || s.includes('custom') || s.includes('inspect') || s.includes('declaration')) return 3;
  if (s === 'in transit' || s.includes('transit') || s.includes('depart') || s.includes('shipped') || s.includes('sailing') || s.includes('flight')) return 2;
  if (s === 'scheduled' || s.includes('schedul') || s.includes('assign') || s.includes('dispatch')) return 1;
  if (s === 'confirmed' || s.includes('confirm') || s.includes('booked') || s.includes('draft') || s.includes('new')) return 0;
  
  return 0;
}

function cleanSearchRef(input) {
  if (!input) return '';
  let cleaned = input.trim().toUpperCase();
  // Strip sequence suffix like -06, -01, -2
  cleaned = cleaned.replace(/-\d+$/, '');
  // Normalize leading 11 to 1 if followed by letters (e.g. 11AD08NQ26 -> 1AD08NQ26)
  if (/^11[A-Z]/.test(cleaned)) {
    cleaned = cleaned.replace(/^11/, '1');
  }
  return cleaned;
}

const parsePort = (portStr) => {
  if (!portStr) return { city: '—', country: '—' };
  const trimmed = portStr.trim();
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) {
    return { city: parts[0], country: parts[0].toUpperCase() };
  }
  if (parts.length >= 2) {
    const p0 = parts[0];
    const p1 = parts.slice(1).join(', ');

    const isP0Country = /^(Turkey|Qatar|China|USA|United States|UK|United Kingdom|UAE|United Arab Emirates|India|Saudi Arabia|Germany|Italy|France|Japan|Korea|Oman|Kuwait|Bahrain|Singapore|Malaysia|Netherlands)/i.test(p0);
    const isP1Country = /^(Qatar|China|USA|United States|UK|United Kingdom|UAE|United Arab Emirates|India|Saudi Arabia|Germany|Italy|France|Japan|Korea|Oman|Kuwait|Bahrain|Turkey|Singapore|Malaysia|Netherlands)/i.test(p1) || /\([A-Z]{3}\)$/i.test(p1);

    if (isP0Country && !isP1Country) {
      return { country: p0.toUpperCase(), city: p1 };
    } else {
      return { country: p1.toUpperCase(), city: p0 };
    }
  }
  return { city: trimmed, country: trimmed.toUpperCase() };
};

const formatDateStr = (dateVal) => {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateVal);
  }
};

router.get('/:ref', async (req, res) => {
  try {
    const rawRef = req.params.ref ? req.params.ref.trim() : '';
    if (!rawRef) {
      return res.json({ success: false, message: 'No tracking information found' });
    }

    const refUpper = rawRef.toUpperCase();
    const refCleaned = cleanSearchRef(rawRef);

    let dbShipment = null;

    // 1. Check central shipments table
    if (db && db.query) {
      try {
        const queryRes = await db.query(
          `SELECT * FROM shipments 
           WHERE UPPER(ref_no) = $1 
              OR UPPER(cust_req_no) = $1 
              OR UPPER(bl_number) = $1
              OR UPPER(ref_no) = $2 
              OR UPPER(cust_req_no) = $2 
              OR UPPER(bl_number) = $2
              OR UPPER(ref_no) LIKE $3
              OR UPPER(cust_req_no) LIKE $3
              OR UPPER(ref_no) LIKE $4
              OR UPPER(cust_req_no) LIKE $4
              OR UPPER(ref_no) LIKE $5
              OR UPPER(cust_req_no) LIKE $5
           ORDER BY 
             CASE 
               WHEN LOWER(status) IN ('confirmed', 'completed', 'in transit', 'delivered', 'scheduled', 'clearance', 'warehouse', 'files pending') THEN 1
               ELSE 2
             END ASC,
             CASE 
               WHEN UPPER(ref_no) = $1 THEN 1
               WHEN UPPER(cust_req_no) = $1 THEN 2
               WHEN UPPER(ref_no) = $2 THEN 3
               WHEN UPPER(cust_req_no) = $2 THEN 4
               WHEN UPPER(ref_no) LIKE $3 THEN 5
               WHEN UPPER(cust_req_no) LIKE $3 THEN 6
               WHEN UPPER(ref_no) LIKE $4 THEN 7
               WHEN UPPER(cust_req_no) LIKE $4 THEN 8
               ELSE 9
             END ASC,
             updated_at DESC, id DESC
           LIMIT 1`,
          [
            refUpper,
            refCleaned,
            `${refUpper}%`,
            `${refCleaned}%`,
            `%${refCleaned}%`
          ]
        );
        if (queryRes.rows && queryRes.rows.length > 0) {
          dbShipment = queryRes.rows[0];
        }
      } catch (err) {
        console.warn('[Tracking API] Central DB query notice:', err.message);
      }
    }

    // 2. If not found in central table, query sandbox tables
    if (!dbShipment) {
      try {
        const suffixes = await getAllSuffixes();
        for (const suffix of suffixes) {
          if (!suffix || suffix === 'admin') continue;
          const sRes = await db.query(
            `SELECT * FROM shipments_${suffix}
             WHERE UPPER(ref_no) = $1 
                OR UPPER(cust_req_no) = $1 
                OR UPPER(bl_number) = $1
                OR UPPER(ref_no) = $2 
                OR UPPER(cust_req_no) = $2 
                OR UPPER(bl_number) = $2
                OR UPPER(ref_no) LIKE $3
                OR UPPER(cust_req_no) LIKE $3
                OR UPPER(ref_no) LIKE $4
                OR UPPER(cust_req_no) LIKE $4
                OR UPPER(ref_no) LIKE $5
                OR UPPER(cust_req_no) LIKE $5
             ORDER BY 
               CASE 
                 WHEN LOWER(status) IN ('confirmed', 'completed', 'in transit', 'delivered', 'scheduled', 'clearance', 'warehouse', 'files pending') THEN 1
                 ELSE 2
               END ASC,
               CASE 
                 WHEN UPPER(ref_no) = $1 THEN 1
                 WHEN UPPER(cust_req_no) = $1 THEN 2
                 WHEN UPPER(ref_no) = $2 THEN 3
                 WHEN UPPER(cust_req_no) = $2 THEN 4
                 WHEN UPPER(ref_no) LIKE $3 THEN 5
                 WHEN UPPER(cust_req_no) LIKE $3 THEN 6
                 WHEN UPPER(ref_no) LIKE $4 THEN 7
                 WHEN UPPER(cust_req_no) LIKE $4 THEN 8
                 ELSE 9
               END ASC,
               updated_at DESC, id DESC
             LIMIT 1`,
            [
              refUpper,
              refCleaned,
              `${refUpper}%`,
              `${refCleaned}%`,
              `%${refCleaned}%`
            ]
          ).catch(() => ({ rows: [] }));

          if (sRes.rows && sRes.rows.length > 0) {
            dbShipment = sRes.rows[0];
            break;
          }
        }
      } catch (err) {
        console.warn('[Tracking API] Sandbox DB query notice:', err.message);
      }
    }

    // 3. If still not found, check call_enquiries
    if (!dbShipment) {
      try {
        const callRes = await db.query(
          `SELECT * FROM call_enquiries 
           WHERE UPPER(ref_no) = $1 OR UPPER(ref_no) = $2 
           ORDER BY updated_at DESC LIMIT 1`,
          [refUpper, refCleaned]
        ).catch(() => ({ rows: [] }));

        if (callRes.rows && callRes.rows.length > 0) {
          const cRow = callRes.rows[0];
          dbShipment = {
            ref_no: cRow.ref_no,
            cust_req_no: cRow.ref_no,
            pol: cRow.pol,
            pod: cRow.pod,
            mode: cRow.mode || 'Air',
            commodity: cRow.commodity,
            status: cRow.status || 'Confirmed',
            track_status: cRow.track_status || 'Confirmed',
            created_at: cRow.created_at,
            updated_at: cRow.updated_at
          };
        }
      } catch (e) {}
    }

    if (!dbShipment) {
      return res.json({
        success: false,
        message: 'No tracking information found'
      });
    }

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

    // ── Smart Origin & Destination Parsing ───────────────────
    const polRaw = dbShipment.pol || '';
    const podRaw = dbShipment.pod || '';
    const originParsed = parsePort(polRaw);
    const destParsed = parsePort(podRaw);

    // ── Gross Weight & Chargeable Weight Calculations ────────
    const rawWeight = parseFloat(String(dbShipment.weight || '0').replace(/[^\d.]/g, '')) || 0;
    const dimStr = dbShipment.dimension || '';
    let volumetricKg = 0;
    const cbmMatch = dimStr.match(/([\d.]+)\s*CBM/i);
    if (cbmMatch) {
      volumetricKg = (parseFloat(cbmMatch[1]) || 0) * 167;
    } else {
      const dimRegex = /([\d.]+)\s*[xX*]\s*([\d.]+)\s*[xX*]\s*([\d.]+)(?:[^\d]*Qty:\s*(\d+))?/gi;
      let m;
      let totalCbm = 0;
      while ((m = dimRegex.exec(dimStr)) !== null) {
        const l = parseFloat(m[1]) || 0;
        const w = parseFloat(m[2]) || 0;
        const h = parseFloat(m[3]) || 0;
        const qty = parseInt(m[4] || '1', 10) || 1;
        totalCbm += ((l * w * h) / 1000000) * qty;
      }
      volumetricKg = totalCbm * 167;
    }

    const chargeableNum = Math.max(rawWeight, volumetricKg);
    const weightUnit = String(dbShipment.weight || '').replace(/[\d.,\s]/g, '').trim().toUpperCase() || 'KG';

    const grossWeightDisplay = dbShipment.gross_weight
      ? String(dbShipment.gross_weight)
      : (rawWeight > 0 ? `${rawWeight.toFixed(2)} ${weightUnit}` : (dbShipment.weight || '—'));

    const chargeableWeightDisplay = dbShipment.chargeable_weight
      ? String(dbShipment.chargeable_weight)
      : (chargeableNum > 0 ? `${parseFloat(chargeableNum.toFixed(2))} ${weightUnit}` : grossWeightDisplay);

    // ── Format ETD / ETA / Dates ─────────────────────────────
    const etdFormatted = formatDateStr(dbShipment.etd) || '—';
    const etaFormatted = formatDateStr(dbShipment.eta) || '—';
    const updatedFormatted = formatDateStr(dbShipment.updated_at) || 'Recent';

    // ── 6-Stage Timeline Log ─────────────────────────────────
    const timeline = STAGES.map((stageName, idx) => {
      let status = 'upcoming';
      if (idx < activeIdx) status = 'completed';
      else if (idx === activeIdx) status = 'active';

      let dateDisplay = 'Pending';
      let timeDisplay = 'Pending';

      if (idx < activeIdx) {
        dateDisplay = etdFormatted !== '—' ? etdFormatted : updatedFormatted;
        timeDisplay = 'Completed';
      } else if (idx === activeIdx) {
        dateDisplay = updatedFormatted;
        timeDisplay = 'In Progress';
      } else if (idx === 5) {
        dateDisplay = etaFormatted !== '—' ? `Est. ${etaFormatted}` : 'Pending';
      }

      return {
        stage: stageName,
        label: stageName,
        date: dateDisplay,
        time: timeDisplay,
        location: idx === 0 ? (polRaw || originParsed.city) : idx === 5 ? (podRaw || destParsed.city) : `Logistics Transit Point #${idx + 1}`,
        status: status,
        description: `Stage ${idx + 1}: ${stageName} — Shipment status ${currentTrackStatus}`
      };
    });

    const modeStr = dbShipment.mode || 'Air';
    const docNumber = dbShipment.bl_number || dbShipment.do_number || dbShipment.so_number || dbShipment.box_no || '—';
    const custReqNoVal = dbShipment.cust_req_no || (refUpper.startsWith('ARG-') && !refUpper.slice(4).includes('-') ? refUpper : '');

    return res.json({
      success: true,
      data: {
        ref_no: dbShipment.ref_no || refUpper,
        cust_req_no: custReqNoVal,
        search_ref: rawRef,
        status: STAGES[activeIdx] || currentTrackStatus,
        currentStageIndex: activeIdx,
        origin: originParsed,
        destination: destParsed,
        mode: modeStr,
        carrier: dbShipment.carrier || '—',
        container_no: docNumber,
        commodity: dbShipment.commodity || '—',
        term: dbShipment.term || '—',
        dimension: dbShipment.dimension || '—',
        container: dbShipment.container || '—',
        weight: dbShipment.weight || '—',
        gross_weight: grossWeightDisplay,
        chargeable_weight: chargeableWeightDisplay,
        packages: dbShipment.container || dbShipment.commodity || 'General Cargo',
        etd: etdFormatted,
        eta: etaFormatted,
        updated_at: dbShipment.updated_at || new Date().toISOString(),
        timeline
      }
    });

  } catch (error) {
    console.error('[Tracking API Error]', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve shipment tracking details.' });
  }
});

module.exports = router;
