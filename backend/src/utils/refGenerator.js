// backend/src/utils/refGenerator.js
// ─────────────────────────────────────────────────────────────
//  Reference Number Generator Utility:
//  1. Customer Enquiry Ref No: ARG-ddmmyyn (e.g. ARG-2408261)
//  2. RFQ Ref No: ARG-ddmmyyn-x (e.g. ARG-2408261-1, ARG-2408261-2)
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');

/**
 * Returns current date in ddmmyy format (e.g. 240826 for 24 Aug 2026).
 */
function getTodayDateCode(date = new Date()) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  return `${d}${m}${y}`;
}

/**
 * Generates Customer Enquiry Ref No: ARG-ddmmyyn
 * Increments n starting at 1 for each day (e.g., ARG-2408261, ARG-2408262).
 */
async function generateEnquiryRefNo() {
  const dateCode = getTodayDateCode();
  const prefix = `ARG-${dateCode}`;

  let maxSeq = 0;
  try {
    const result = await db.query(
      `SELECT ref_no, cust_req_no FROM shipments 
       WHERE ref_no LIKE $1 OR cust_req_no LIKE $1`,
      [`${prefix}%`]
    );

    const regex = new RegExp(`^ARG-${dateCode}(\\d+)(?:-\\d+)?$`, 'i');

    for (const row of result.rows) {
      for (const val of [row.ref_no, row.cust_req_no]) {
        if (val) {
          const match = String(val).trim().match(regex);
          if (match && match[1]) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxSeq) {
              maxSeq = n;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[RefGenerator] Error querying max enquiry seq:', err.message);
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq}`; // e.g. "ARG-2408261"
}

/**
 * Generates RFQ Ref No: ARG-ddmmyyn-x
 * Suffix -x tracks how many RFQs have been issued for that specific enquiry (starts at 1).
 */
async function generateRfqRefNo(enquiryRef) {
  let baseRef = enquiryRef ? enquiryRef.trim() : '';
  if (!baseRef) {
    baseRef = await generateEnquiryRefNo();
  } else {
    // If baseRef already contains a revision suffix like ARG-2408261-1, strip the -x to get base
    baseRef = baseRef.replace(/-\d+$/, '');
  }

  let maxSuffix = 0;
  try {
    const result = await db.query(
      `SELECT ref_no FROM shipments 
       WHERE cust_req_no = $1 OR ref_no LIKE $2`,
      [baseRef, `${baseRef}-%`]
    );

    const regex = new RegExp(`^${baseRef}-(\\d+)$`, 'i');
    for (const row of result.rows) {
      if (row.ref_no) {
        const match = String(row.ref_no).trim().match(regex);
        if (match && match[1]) {
          const s = parseInt(match[1], 10);
          if (!isNaN(s) && s > maxSuffix) {
            maxSuffix = s;
          }
        }
      }
    }
  } catch (err) {
    console.error('[RefGenerator] Error querying max RFQ suffix:', err.message);
  }

  const nextSuffix = maxSuffix + 1;
  return `${baseRef}-${nextSuffix}`;
}

/**
 * Generates an array of sequential RFQ numbers for a given enquiry:
 * e.g. for count = 3: [ARG-2408261-1, ARG-2408261-2, ARG-2408261-3]
 */
async function generateBulkRfqRefNos(enquiryRef, count = 1) {
  let baseRef = enquiryRef ? enquiryRef.trim() : '';
  if (!baseRef) {
    baseRef = await generateEnquiryRefNo();
  } else {
    baseRef = baseRef.replace(/-\d+$/, '');
  }

  let maxSuffix = 0;
  try {
    const result = await db.query(
      `SELECT ref_no FROM shipments 
       WHERE cust_req_no = $1 OR ref_no LIKE $2`,
      [baseRef, `${baseRef}-%`]
    );

    const regex = new RegExp(`^${baseRef}-(\\d+)$`, 'i');
    for (const row of result.rows) {
      if (row.ref_no) {
        const match = String(row.ref_no).trim().match(regex);
        if (match && match[1]) {
          const s = parseInt(match[1], 10);
          if (!isNaN(s) && s > maxSuffix) {
            maxSuffix = s;
          }
        }
      }
    }
  } catch (err) {
    console.error('[RefGenerator] Error querying bulk RFQ suffix:', err.message);
  }

  const refs = [];
  for (let i = 1; i <= count; i++) {
    refs.push(`${baseRef}-${maxSuffix + i}`);
  }
  return { baseRef, rfqRefs: refs };
}

module.exports = {
  getTodayDateCode,
  generateEnquiryRefNo,
  generateRfqRefNo,
  generateBulkRfqRefNos
};
