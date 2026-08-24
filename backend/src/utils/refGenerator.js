// backend/src/utils/refGenerator.js
// ─────────────────────────────────────────────────────────────
//  Atomic generator for Reference Numbers:
//  • Enquiry Ref: ARG-ddmmyyn  (e.g., ARG-2408261)
//  • RFQ Ref:     ARG-ddmmyyn-x (e.g., ARG-2408261-1, ARG-2408261-2)
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');

/**
 * Returns current date stamp formatted as ddmmyy (e.g. 240826 for 24 Aug 2026)
 */
function getTodayDateStamp(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/**
 * Ensures the daily_sequences table exists
 */
let ensuredSequenceTable = false;
async function ensureSequenceTable() {
  if (ensuredSequenceTable) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_sequences (
        date_stamp  VARCHAR(10) PRIMARY KEY,
        current_seq INT NOT NULL DEFAULT 0,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    ensuredSequenceTable = true;
  } catch (err) {
    console.warn('[refGenerator] ensureSequenceTable notice:', err.message);
  }
}

/**
 * Atomically increments the daily sequence counter and returns a new Enquiry Reference.
 * Format: ARG-ddmmyyn (e.g., ARG-2408261)
 *
 * @returns {Promise<{ refNo: string, dateStamp: string, sequence: number }>}
 */
async function generateEnquiryRef() {
  await ensureSequenceTable();
  const dateStamp = getTodayDateStamp();

  // Atomically insert or increment counter for dateStamp
  await db.query(
    `INSERT INTO daily_sequences (date_stamp, current_seq)
     VALUES ($1, 1)
     ON CONFLICT (date_stamp) DO UPDATE SET current_seq = daily_sequences.current_seq + 1`,
    [dateStamp]
  );

  const res = await db.query(
    `SELECT current_seq FROM daily_sequences WHERE date_stamp = $1`,
    [dateStamp]
  );

  const sequence = (res.rows && res.rows[0]) ? parseInt(res.rows[0].current_seq, 10) : 1;
  const refNo = `ARG-${dateStamp}${sequence}`;

  return { refNo, dateStamp, sequence };
}

/**
 * Generates batch of RFQ revision reference numbers for a given enquiry reference.
 * Format: ARG-ddmmyyn-x (e.g. ARG-2408261-1, ARG-2408261-2)
 *
 * @param {string} enquiryRef - e.g. "ARG-2408261"
 * @param {number} count - number of RFQ sub-references to generate
 * @returns {Promise<string[]>}
 */
async function generateRfqRefBatch(enquiryRef, count = 1) {
  if (!enquiryRef) {
    const enq = await generateEnquiryRef();
    enquiryRef = enq.refNo;
  }

  // Count existing RFQs linked to this enquiry across shipments
  let existingCount = 0;
  try {
    const countRes = await db.query(
      `SELECT COUNT(*) as cnt FROM shipments WHERE cust_req_no = $1 OR ref_no LIKE $2`,
      [enquiryRef, `${enquiryRef}-%`]
    );
    if (countRes.rows && countRes.rows[0]) {
      existingCount = parseInt(countRes.rows[0].cnt || '0', 10);
    }
  } catch (err) {
    console.warn('[refGenerator] generateRfqRefBatch count error:', err.message);
  }

  const startSeq = existingCount + 1;
  const refs = [];
  for (let i = 0; i < count; i++) {
    refs.push(`${enquiryRef}-${startSeq + i}`);
  }
  return refs;
}

module.exports = {
  getTodayDateStamp,
  generateEnquiryRef,
  generateRfqRefBatch
};
