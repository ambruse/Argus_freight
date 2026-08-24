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

  try {
    const { getAllSuffixes } = require('../config/dbHelper');
    const suffixes = await getAllSuffixes();
    const tables = ['shipments', ...suffixes.map(s => `shipments_${s}`)];
    const uniqueTables = Array.from(new Set(tables));

    const queries = uniqueTables.map(t =>
      `SELECT ref_no, cust_req_no FROM ${t} WHERE ref_no LIKE '${prefix}%' OR cust_req_no LIKE '${prefix}%'`
    );

    const unionSql = queries.join(' UNION ALL ');
    const res = await db.query(unionSql).catch(() => ({ rows: [] }));

    const regex = new RegExp(`^${prefix}(\\d+)(?:-\\d+)?$`, 'i');

    for (const r of (res.rows || [])) {
      if (r.ref_no) {
        const m = String(r.ref_no).trim().match(regex);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
      if (r.cust_req_no) {
        const m = String(r.cust_req_no).trim().match(regex);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    }
  } catch (err) {
    console.warn('[refGenerator] DB query notice:', err.message);
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq}`;
};

module.exports = { getNextDailyRefNo };
