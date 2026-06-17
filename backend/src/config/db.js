// src/config/db.js
// ─────────────────────────────────────────────────────────────
//  PostgreSQL connection pool.
//  All queries should use parameterised statements ($1, $2 …)
//  to prevent SQL injection.
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'freight_rfq',
  // Keep a healthy pool under load
  max:              10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connectivity on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Unable to connect to PostgreSQL:', err.message);
  } else {
    console.log('✅  PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;
