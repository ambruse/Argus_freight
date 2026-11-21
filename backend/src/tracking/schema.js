'use strict';

// Deliberately uses the underlying mysql2 pool, not the PostgreSQL compatibility
// wrapper: DDL, named locks and transactions must stay on one physical connection.
const { createHash } = require('node:crypto');
const VERSION = '20261121_tracking_v1';
const TABLES = ['tracking_profiles', 'shipment_tracking_events', 'shipment_tracking_audits'];
const COLUMNS = {
  tracking_profiles: ['shipment_key', 'details', 'version', 'created_at', 'updated_at'],
  shipment_tracking_events: ['id', 'shipment_key', 'shipment_reference', 'event_type', 'previous_status', 'new_status', 'event_title', 'event_description', 'location_name', 'location_country', 'event_time', 'created_at', 'created_by', 'source', 'is_public', 'corrects_event_id'],
  shipment_tracking_audits: ['id', 'shipment_key', 'field_name', 'previous_value', 'new_value', 'created_by', 'created_at'],
};

function schemaError(message) {
  const error = new Error(message);
  error.code = 'TRACKING_SCHEMA_NOT_READY';
  error.status = error.statusCode = 503;
  return error;
}

async function assertCapabilities(connection) {
  try {
    await connection.query('SELECT ROW_NUMBER() OVER (ORDER BY n) AS row_num FROM (SELECT 1 AS n) AS capability');
    await connection.query('SELECT JSON_EXTRACT(?, ?) AS json_value', ['{"ready":true}', '$.ready']);
  } catch (_) {
    throw schemaError('Shipment tracking requires MySQL 8.0+ or a compatible MariaDB version with window functions and JSON support.');
  }
}

async function assertTransactionalShipmentTables(connection) {
  const [rows] = await connection.query(`
    SELECT t.TABLE_NAME AS table_name, t.ENGINE AS engine
    FROM information_schema.TABLES t
    WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
      AND (t.TABLE_NAME = 'shipments' OR t.TABLE_NAME = 'call_enquiries'
        OR LEFT(t.TABLE_NAME, 10) = 'shipments_')
      AND EXISTS (
        SELECT 1 FROM information_schema.COLUMNS c
        WHERE c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
          AND c.COLUMN_NAME = 'ref_no'
      )`);
  if (!rows.some(row => row.table_name === 'shipments')) {
    throw schemaError('The core shipments table must exist before applying the tracking migration.');
  }
  const unsupported = rows.filter(row => String(row.engine).toLowerCase() !== 'innodb');
  if (unsupported.length) {
    throw schemaError(`Tracking writes require InnoDB for atomic synchronization. Unsupported tables: ${unsupported.map(row => row.table_name).join(', ')}. No storage engines were changed.`);
  }
  return rows;
}

async function inspect(connection) {
  await assertCapabilities(connection);
  const shipments = await assertTransactionalShipmentTables(connection);
  const [tables] = await connection.query(`SELECT TABLE_NAME AS table_name, ENGINE AS engine
    FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('tracking_profiles', 'shipment_tracking_events', 'shipment_tracking_audits', 'tracking_schema_migrations')`);
  const [columns] = await connection.query(`SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('tracking_profiles', 'shipment_tracking_events', 'shipment_tracking_audits')`);
  const missing = [];
  for (const table of TABLES) {
    const actual = tables.find(row => row.table_name === table);
    if (!actual) missing.push(table);
    else {
      if (String(actual.engine).toLowerCase() !== 'innodb') missing.push(`${table}: requires InnoDB`);
      for (const column of COLUMNS[table]) {
        if (!columns.some(row => row.table_name === table && row.column_name === column)) missing.push(`${table}.${column}`);
      }
    }
  }
  let applied = false;
  if (tables.some(row => row.table_name === 'tracking_schema_migrations')) {
    const [versions] = await connection.query('SELECT version FROM tracking_schema_migrations WHERE version = ?', [VERSION]);
    applied = versions.length > 0;
  }
  return { version: VERSION, ready: applied && missing.length === 0, applied, missing, shipmentTableCount: shipments.length };
}

async function withConnection(pool, fn) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    return await fn(connection);
  } finally { connection.release(); }
}

async function withMigrationLock(pool, fn) {
  return withConnection(pool, async connection => {
    const [[{ database_name }]] = await connection.query('SELECT DATABASE() AS database_name');
    if (!database_name) throw schemaError('Select a database before applying the tracking migration.');
    const lock = 'argus_tracking_' + createHash('sha256').update(database_name).digest('hex').slice(0, 32);
    const [[result]] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', [lock]);
    if (Number(result.acquired) !== 1) throw schemaError('Another tracking schema migration is running. Retry shortly.');
    try { return await fn(connection); }
    finally { await connection.query('SELECT RELEASE_LOCK(?)', [lock]); }
  });
}

async function check(pool) {
  return withConnection(pool, inspect);
}

async function migrate(pool) {
  return withMigrationLock(pool, async connection => {
    await assertCapabilities(connection);
    await assertTransactionalShipmentTables(connection);
    // MySQL DDL implicitly commits. Each statement is independently idempotent;
    // the final version marker is written only after the complete schema exists.
    await connection.query(`CREATE TABLE IF NOT EXISTS tracking_schema_migrations (
      version VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS tracking_profiles (
      shipment_key VARCHAR(100) NOT NULL PRIMARY KEY,
      details JSON NOT NULL,
      version INT UNSIGNED NOT NULL DEFAULT 1,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_tracking_profiles_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS shipment_tracking_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      shipment_key VARCHAR(100) NOT NULL,
      shipment_reference VARCHAR(100) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      previous_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      event_title VARCHAR(255) NOT NULL,
      event_description TEXT NULL,
      location_name VARCHAR(255) NULL,
      location_country VARCHAR(255) NULL,
      event_time DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      created_by INT NULL,
      source VARCHAR(50) NOT NULL DEFAULT 'staff',
      is_public TINYINT(1) NOT NULL DEFAULT 1,
      corrects_event_id BIGINT UNSIGNED NULL,
      CONSTRAINT fk_tracking_event_profile FOREIGN KEY (shipment_key)
        REFERENCES tracking_profiles(shipment_key) ON DELETE RESTRICT,
      CONSTRAINT fk_tracking_event_correction FOREIGN KEY (corrects_event_id)
        REFERENCES shipment_tracking_events(id) ON DELETE RESTRICT,
      INDEX idx_tracking_events_history (shipment_key, event_time, id),
      INDEX idx_tracking_events_public (shipment_key, is_public, event_time, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS shipment_tracking_audits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      shipment_key VARCHAR(100) NOT NULL,
      field_name VARCHAR(100) NOT NULL,
      previous_value JSON NULL,
      new_value JSON NULL,
      created_by INT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_tracking_audit_profile FOREIGN KEY (shipment_key)
        REFERENCES tracking_profiles(shipment_key) ON DELETE RESTRICT,
      INDEX idx_tracking_audits_history (shipment_key, created_at, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const result = await inspect(connection);
    if (result.missing.length) throw schemaError(`Existing tracking schema is incompatible: ${result.missing.join(', ')}. No existing columns were modified.`);
    await connection.query('INSERT IGNORE INTO tracking_schema_migrations (version) VALUES (?)', [VERSION]);
    return { ...result, applied: true, ready: true };
  });
}

async function rollback(pool, { allowEmptyRollback = false } = {}) {
  if (!allowEmptyRollback) throw schemaError('Rollback requires explicit allowEmptyRollback and is allowed only before any tracking data has been stored.');
  return withMigrationLock(pool, async connection => {
    // Refuse to remove history. A populated installation can roll back application
    // code while leaving these additive tables intact.
    const [existing] = await connection.query(`SELECT TABLE_NAME AS table_name
      FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME IN ('tracking_profiles','shipment_tracking_events','shipment_tracking_audits','tracking_schema_migrations')`);
    // Acquire write locks before the emptiness check so a concurrent save cannot
    // insert between the check and DDL. Dropped tables never release a writer
    // onto a table whose checked-empty contents have changed.
    const lockTables = existing.map(row => row.table_name).filter(table => [...TABLES, 'tracking_schema_migrations'].includes(table));
    if (lockTables.length) await connection.query('LOCK TABLES ' + lockTables.map(table => `\`${table}\` WRITE`).join(', '));
    try {
      for (const table of TABLES) {
        if (existing.some(row => row.table_name === table)) {
          const [[row]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
          if (Number(row.total) > 0) throw schemaError(`Rollback refused: ${table} contains tracking data. Keep the additive tables when rolling back application code.`);
        }
      }
      for (const table of ['shipment_tracking_audits', 'shipment_tracking_events', 'tracking_profiles']) {
        await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
      if (existing.some(row => row.table_name === 'tracking_schema_migrations')) {
        await connection.query('DELETE FROM tracking_schema_migrations WHERE version=?', [VERSION]);
      }
      return { version: VERSION, rolledBack: true };
    } finally {
      if (lockTables.length) await connection.query('UNLOCK TABLES');
    }
  });
}

module.exports = { VERSION, TABLES, COLUMNS, migrate, check, rollback, assertTransactionalShipmentTables, assertCapabilities };
