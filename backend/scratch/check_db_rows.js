const db = require('../src/config/db');
const { query } = require('../src/config/dbHelper');

async function inspectDb() {
  try {
    const res = await db.query("SELECT ref_no, cust_req_no, status, note, operator, refer_by FROM shipments");
    console.log("=== RAW SHIPMENTS IN MAIN TABLE ===");
    console.log("Count:", res.rows.length);
    console.table(res.rows);

    const tables = await db.query("SHOW TABLES LIKE 'shipments_%'");
    console.log("\n=== USER SHIPMENT TABLES ===");
    for (const t of tables.rows) {
      const tableName = Object.values(t)[0];
      const uRes = await db.query(`SELECT ref_no, cust_req_no, status, note, operator FROM ${tableName}`);
      console.log(`\nTable ${tableName} (${uRes.rows.length} rows):`);
      console.table(uRes.rows);
    }
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    process.exit(0);
  }
}

inspectDb();
