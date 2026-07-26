const { query } = require('../src/config/dbHelper');

const mockDb = {
  query: async (sql, params) => {
    console.log('\n--- EXECUTED QUERY ---');
    console.log(sql);
    return { rows: [] };
  }
};

const sql1 = "SELECT s.ref_no, s.pol, (SELECT COUNT(*) FROM shipment_replies r WHERE r.ref_no = s.ref_no) AS replies_count FROM shipments s WHERE (note IS NULL OR note != 'Direct Booking') ORDER BY s.created_at DESC";
const sql2 = "SELECT SUM(CASE WHEN note IS NULL THEN 1 ELSE 0 END) AS total_rfqs FROM shipments";

async function testAll() {
  const roles = [
    { username: 'admin', role: 'admin' },
    { username: 'Jabir', role: 'operator' },
    { username: 'Aysha', role: 'sales', customer_id: '56088' },
    { username: 'cust_42721', role: 'customer', customer_id: '42721', name: 'Ganesh' }
  ];

  for (const user of roles) {
    console.log('\n=======================================');
    console.log('TESTING ROLE:', user.role, 'User:', user.username);
    console.log('=======================================');
    const req = { user };
    try {
      await query(req, sql1);
      await query(req, sql2);
    } catch (e) {
      console.error('ERROR for', user.role, e);
    }
  }
}
testAll();
