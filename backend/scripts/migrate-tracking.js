#!/usr/bin/env node
'use strict';

// Explicit migration runner. Importing the schema module never connects to the
// database or alters it. --check is read-only; writes require --up/--down.
const path = require('node:path');
const mysql = require('mysql2/promise');
const { migrate, check, rollback } = require('../src/tracking/schema');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const modes = args.filter(arg => ['--check', '--up', '--down'].includes(arg));
  if (modes.length !== 1 || args.some(arg => !['--check', '--up', '--down', '--allow-empty-rollback'].includes(arg))) {
    throw new Error('Usage: node backend/scripts/migrate-tracking.js --check | --up | --down --allow-empty-rollback');
  }
  if (modes[0] === '--down' && !args.includes('--allow-empty-rollback')) {
    throw new Error('Empty-only rollback requires --allow-empty-rollback. Populated tracking tables are never dropped.');
  }
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'freight_rfq',
    timezone: 'Z', dateStrings: true, connectionLimit: 1, connectTimeout: 10000,
  });
  try {
    const result = modes[0] === '--up' ? await migrate(pool)
      : modes[0] === '--down' ? await rollback(pool, { allowEmptyRollback: true })
        : await check(pool);
    console.log(JSON.stringify(result, null, 2));
    if (modes[0] === '--check' && !result.ready) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    // Do not print connection strings or driver errors containing credentials.
    const message = error.code && !['TRACKING_SCHEMA_NOT_READY'].includes(error.code)
      ? `Database operation failed (${error.code}). Check connectivity and database permissions.`
      : error.message;
    console.error(message);
    process.exitCode = 1;
  });
}
module.exports = { main };
