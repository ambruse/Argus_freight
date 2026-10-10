const fs = require('node:fs');
const path = require('node:path');

async function migrate(pool) {
  const conn = await pool.getConnection();
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('argus_weekly_freight_migration', 30) AS acquired");
    if (!lock.acquired) throw new Error('Another freight migration is running');
    const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261010_weekly_freight.sql'), 'utf8');
    // Statements contain no procedural bodies. DDL is idempotent because MySQL DDL auto-commits.
    for (const statement of sql.replace(/^--.*$/gm, '').split(';').filter(s => s.trim())) {
      await conn.query(statement);
    }
    await require('./import-freight-locations').importLocations(conn);
    await require('./migrate-freight-publication').migratePublication(conn);
  } finally {
    await conn.query("SELECT RELEASE_LOCK('argus_weekly_freight_migration')");
    conn.release();
  }
}
if (require.main === module) {
  const { pool } = require('../src/config/db');
  migrate(pool).then(() => console.log('Weekly freight migration applied. No prices or users seeded.'))
    .catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
}
module.exports = { migrate };
