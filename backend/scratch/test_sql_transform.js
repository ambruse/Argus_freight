const { transformSQL } = require('../src/config/db');

// Simulate the replaceTableWithUnion function logic from dbHelper.js
const S_COLS = `ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension, container, mode, weight, pickup_address, delivery_address, dear_who, email, status, note, last_follow_up, do_number, box_no, so_number, bl_number, track_status, carrier, etd, eta, cost, profit, customer_id, customer_name, customer_email, operator, created_at`;

const safeUser = 'jabir';
const userFilter = `(LOWER(operator) = LOWER('jabir') OR operator_user_id = 'test-uuid')`;

let sUnion = `SELECT 2 as __p, ${S_COLS} FROM \`shipments\` WHERE ${userFilter}`;
sUnion += ` UNION ALL SELECT 3 as __p, ${S_COLS} FROM \`shipments_${safeUser}\` WHERE ${userFilter}`;

const shipmentsUnion = `(SELECT * FROM (SELECT *, ROW_NUMBER() OVER (
   PARTITION BY COALESCE(NULLIF(cust_req_no, ''), ref_no) 
   ORDER BY __p DESC
) AS _rn FROM (${sUnion}) _s) _ranked WHERE _rn = 1)`;

const replaceTableWithUnion = (rawSql, tableName, unionSql, defaultAlias) => {
   const keywords = new Set([
     'WHERE', 'ORDER', 'GROUP', 'LIMIT', 'JOIN', 'SET', 'USING', 'ON', 'UNION',
     'SELECT', 'HAVING', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'STRAIGHT_JOIN', 'NATURAL',
     'AND', 'OR', 'NOT', 'AS', 'END', 'THEN', 'ELSE', 'WHEN', 'CASE', 'IN'
   ]);

   const regex = new RegExp(`\\b(FROM|JOIN)\\s+${tableName}\\b(?:\\s+(?:AS\\s+)?([a-zA-Z0-9_]+))?`, 'gi');

   return rawSql.replace(regex, (match, prefix, alias) => {
     if (alias && keywords.has(alias.toUpperCase())) {
       return `${prefix} ${unionSql} ${defaultAlias} ${alias}`;
     }
     const finalAlias = alias || defaultAlias;
     return `${prefix} ${unionSql} ${finalAlias}`;
   });
};

const originalSql = `SELECT s.ref_no, s.cust_req_no, s.status, s.note
FROM shipments s WHERE (note IS NULL OR note != 'Direct Booking') ORDER BY s.created_at DESC`;

let modifiedSql = replaceTableWithUnion(originalSql, 'shipments', shipmentsUnion, '_u_s');

console.log('[Test] Transformed SQL Output:');
console.log(modifiedSql);
