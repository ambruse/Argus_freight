// src/config/db.js
// ─────────────────────────────────────────────────────────────
//  MySQL connection pool with PostgreSQL-compatible interface.
//  Automatically translates:
//    • $1, $2, …           → ?  (positional params)
//    • RETURNING *          → stripped + auto-refetch
//    • ON CONFLICT DO NOTHING → INSERT IGNORE
//    • ON CONFLICT (k) DO UPDATE SET x=EXCLUDED.x → ON DUPLICATE KEY UPDATE x=VALUES(x)
//    • table_schema='public' → table_schema=DATABASE()
//    • SUBSTRING(col FROM n) → SUBSTRING(col, n)
//    • CAST(x AS INTEGER)   → CAST(x AS UNSIGNED)
//    • INTERVAL 'N hours'   → INTERVAL N HOUR
// ─────────────────────────────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'freight_rfq',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  dateStrings:        true,   // return DATE/DATETIME as strings (matches pg behaviour)
  timezone:           'Z',
});

// ── SQL Transformer: PostgreSQL → MySQL ──────────────────────
const transformSQL = (text) => {
  let sql = text;

  // 1. Positional params $1, $2, … → ?
  sql = sql.replace(/\$\d+/g, '?');

  // 2. information_schema public → DATABASE()
  sql = sql.replace(/table_schema\s*=\s*'public'/gi, 'table_schema = DATABASE()');

  // 3. SUBSTRING(col FROM n) → SUBSTRING(col, n)
  sql = sql.replace(/SUBSTRING\(([^,)]+)\s+FROM\s+(\d+)\)/gi, 'SUBSTRING($1, $2)');

  // 4. CAST(x AS INTEGER) → CAST(x AS UNSIGNED)
  sql = sql.replace(/CAST\((.+?)\s+AS\s+INTEGER\)/gi, 'CAST($1 AS UNSIGNED)');

  // 5. PostgreSQL interval syntax: INTERVAL '4 hours' → INTERVAL 4 HOUR
  sql = sql.replace(
    /INTERVAL\s+'(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)'/gi,
    (_, n, unit) => `INTERVAL ${n} ${unit.replace(/s$/i, '').toUpperCase()}`
  );

  // 6. ON CONFLICT (cols) DO UPDATE SET col = EXCLUDED.col → ON DUPLICATE KEY UPDATE col = VALUES(col)
  sql = sql.replace(
    /ON CONFLICT\s*\([^)]*\)\s*DO UPDATE SET\s+([\s\S]+?)(?=\s*(?:RETURNING|WHERE|ORDER|LIMIT|;|$))/gi,
    (_, setClauses) => {
      const converted = setClauses.replace(/EXCLUDED\.(\w+)/gi, 'VALUES($1)');
      return `ON DUPLICATE KEY UPDATE ${converted.trim()}`;
    }
  );

  // 7. ON CONFLICT DO NOTHING  /  ON CONFLICT (cols) DO NOTHING  → INSERT IGNORE (handled below)
  //    Mark the INSERT first, then strip the clause
  if (/ON CONFLICT\b/i.test(sql) && /DO NOTHING/i.test(sql)) {
    sql = sql.replace(/^(\s*INSERT)\s+INTO\b/im, '$1 IGNORE INTO');
    sql = sql.replace(/\s+ON CONFLICT\b(?:\s*\([^)]*\))?\s+DO NOTHING/gi, '');
  }

  // 8. CREATE TABLE x (LIKE y INCLUDING ALL) → CREATE TABLE x LIKE y
  sql = sql.replace(
    /CREATE TABLE\s+(IF NOT EXISTS\s+)?(\S+)\s*\(\s*LIKE\s+(\S+)\s+INCLUDING ALL\s*\)/gi,
    'CREATE TABLE $1$2 LIKE $3'
  );

  // 9. ALTER TABLE x DROP CONSTRAINT IF EXISTS … → silently ignored (handled per-call)
  sql = sql.replace(
    /ALTER TABLE\s+(\S+)\s+DROP CONSTRAINT IF EXISTS\s+\S+/gi,
    '/* DROP CONSTRAINT suppressed for MySQL */'
  );

  // 10. NOW() is identical in MySQL — no change needed
  // 11. TIMESTAMPTZ → DATETIME
  sql = sql.replace(/\bTIMESTAMPTZ\b/gi, 'DATETIME');

  return sql;
};

// ── Detect RETURNING clause ──────────────────────────────────
const stripReturning = (text) => {
  const match = text.match(/\s+RETURNING\s+([\s\S]+?)(\s*;?\s*)$/i);
  if (!match) return { sql: text, hasReturning: false };
  const sql = text.slice(0, text.length - match[0].length).trim();
  return { sql, hasReturning: true };
};

// ── Detect DML operation and extract table name ───────────────
const parseOperation = (sql) => {
  const ins = sql.match(/INSERT\s+(?:IGNORE\s+)?INTO\s+`?(\w+)`?/i);
  if (ins) return { op: 'INSERT', table: ins[1] };

  const upd = sql.match(/UPDATE\s+`?(\w+)`?\s+SET\b/i);
  if (upd) {
    // Extract WHERE clause params count
    const whereMatch = sql.match(/\bWHERE\b([\s\S]+?)(?:\s*;?\s*)$/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : null;
    const wherePlaceholders = whereClause ? (whereClause.match(/\?/g) || []).length : 0;
    return { op: 'UPDATE', table: upd[1], whereClause, wherePlaceholders };
  }

  const del = sql.match(/DELETE\s+FROM\s+`?(\w+)`?/i);
  if (del) return { op: 'DELETE', table: del[1] };

  return { op: 'SELECT', table: null };
};

const query = async (text, params = []) => {
  // Strip RETURNING clause before transforming
  const { sql: rawSQL, hasReturning } = stripReturning(text);

  // Apply SQL transformations
  const mysqlSQL = transformSQL(rawSQL);

  const opInfo = parseOperation(mysqlSQL);

  // Map parameters to match positional placeholders if rawSQL uses $1, $2 etc.
  let cleanParams;
  if (/\$\d+/.test(rawSQL)) {
    const matches = rawSQL.match(/\$\d+/g) || [];
    cleanParams = matches.map(placeholder => {
      const idx = parseInt(placeholder.slice(1)) - 1;
      const val = params[idx];
      return val === undefined ? null : val;
    });
  } else {
    cleanParams = (params || []).map(p => p === undefined ? null : p);
  }

  try {
    const [result] = await pool.execute(mysqlSQL, cleanParams);

    if (!hasReturning) {
      return { rows: Array.isArray(result) ? result : [] };
    }

    // ── Handle RETURNING * ─────────────────────────────────
    if (opInfo.op === 'INSERT' && result.insertId && opInfo.table) {
      // Fetch the newly inserted row by primary key
      const [rows] = await pool.execute(
        `SELECT * FROM \`${opInfo.table}\` WHERE id = ?`,
        [result.insertId]
      );
      return { rows };
    }

    if (opInfo.op === 'UPDATE' && opInfo.table && opInfo.whereClause) {
      // Re-fetch using the same WHERE clause (params for WHERE are the last N params)
      const whereParams = cleanParams.slice(-opInfo.wherePlaceholders);
      const [rows] = await pool.execute(
        `SELECT * FROM \`${opInfo.table}\` WHERE ${opInfo.whereClause}`,
        whereParams
      );
      return { rows };
    }

    if (opInfo.op === 'DELETE') {
      // Row is gone — return empty rows
      return { rows: [] };
    }

    // Fallback: return raw result rows
    return { rows: Array.isArray(result) ? result : [] };

  } catch (err) {
    console.error('[DB] Query error:', err.message);
    console.error('[DB] Original SQL:', text.slice(0, 300));
    console.error('[DB] Transformed SQL:', mysqlSQL.slice(0, 300));
    throw err;
  }
};

// ── Test connectivity on startup ─────────────────────────────
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  Unable to connect to MySQL:', err.message);
  }
})();

// Export pg-compatible interface
module.exports = { query, pool };
