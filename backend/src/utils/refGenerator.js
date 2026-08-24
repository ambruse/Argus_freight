// src/utils/refGenerator.js
// ─────────────────────────────────────────────────────────────
//  Generates sequential daily reference numbers with format:
//  ARG-ddmmyyn
//  • Prefix: ARG-
//  • Date: ddmmyy (e.g. 240826 for 24 Aug 2026)
//  • Sequence (n): Incremental integer starting at 1 each day (e.g. ARG-2408261, ARG-2408262)
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');

const getNextDailyRefNo = async () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const dateStr = `${dd}${mm}${yy}`; // e.g. "240826"
  const prefix = `ARG-${dateStr}`;

  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}(\\d+)(?:-\\d+)?$`, 'i');

  const processValue = (val) => {
    if (!val || typeof val !== 'string') return;
    const m = val.trim().match(regex);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  };

  // 1. Check main shipments table (always exists)
  try {
    const mainRes = await db.query(
      `SELECT ref_no, cust_req_no FROM shipments WHERE ref_no LIKE $1 OR cust_req_no LIKE $1`,
      [`${prefix}%`]
    );
    for (const r of (mainRes.rows || [])) {
      processValue(r.ref_no);
      processValue(r.cust_req_no);
    }
  } catch (err) {
    console.warn('[refGenerator] Notice on shipments scan:', err.message);
  }

  // 2. Safely scan existing physical sandbox tables from information_schema
  try {
    const schemaRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name LIKE 'shipments_%' 
         AND table_name NOT LIKE '%_replies%' AND table_name NOT LIKE '%_files%'`
    );
    const physicalTables = (schemaRes.rows || []).map(r => r.table_name || r.TABLE_NAME).filter(Boolean);
    for (const tbl of physicalTables) {
      try {
        const subRes = await db.query(
          `SELECT ref_no, cust_req_no FROM \`${tbl}\` WHERE ref_no LIKE $1 OR cust_req_no LIKE $1`,
          [`${prefix}%`]
        );
        for (const r of (subRes.rows || [])) {
          processValue(r.ref_no);
          processValue(r.cust_req_no);
        }
      } catch (e) {
        // Table scan error ignored safely
      }
    }
  } catch (err) {
    console.warn('[refGenerator] Notice on sandbox scan:', err.message);
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq}`;
};

module.exports = { getNextDailyRefNo };
