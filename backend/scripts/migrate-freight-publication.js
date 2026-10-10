// Explicitly requested policy change: freight publication no longer needs approval.
async function migratePublication(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS freight_operator_contacts (
    operator_id INT PRIMARY KEY, country VARCHAR(100) NOT NULL, calling_code VARCHAR(4) NOT NULL,
    national_number VARCHAR(14) NOT NULL, whatsapp_number VARCHAR(15) NOT NULL,
    updated_at DATETIME(3) NOT NULL, FOREIGN KEY (operator_id) REFERENCES users(id)
  ) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE IF NOT EXISTS freight_schema_migrations (
    name VARCHAR(100) PRIMARY KEY, applied_at DATETIME(3) NOT NULL
  ) ENGINE=InnoDB`);
  const [[column]] = await conn.query("SELECT column_type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='freight_rates' AND column_name='status'");
  if (!column.column_type.includes("'active'")) await conn.query("ALTER TABLE freight_rates MODIFY status ENUM('active','pending','approved','rejected','withdrawn','archived') NOT NULL DEFAULT 'active'");
  await conn.beginTransaction();
  try {
    await conn.query('SELECT id FROM freight_write_lock WHERE id=1 FOR UPDATE');
    const [[done]] = await conn.query("SELECT name FROM freight_schema_migrations WHERE name='automatic_publication_v1'");
    if (!done) {
      await conn.query(`INSERT INTO freight_rate_audit_logs (actor_id,action,rate_id,version,details,created_at)
        SELECT operator_id,'automatic_publication',id,version,JSON_OBJECT('previous_status',status),UTC_TIMESTAMP(3)
        FROM freight_rates WHERE status IN ('pending','approved')`);
      await conn.query("UPDATE freight_rates SET status='active',updated_at=UTC_TIMESTAMP(3) WHERE status IN ('pending','approved')");
      await conn.query("INSERT INTO freight_schema_migrations VALUES ('automatic_publication_v1',UTC_TIMESTAMP(3))");
    }
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; }
}
module.exports = { migratePublication };
