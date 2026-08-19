const db = require('../src/config/db');
const { query } = require('../src/config/dbHelper');

async function testQuery() {
  try {
    const mockReq = {
      user: {
        id: 'test-id',
        user_id: 'test-uuid',
        username: 'jabir',
        role: 'operator',
        name: 'Muhammed Jabir',
        email_address: 'jabir@argusshipping.co'
      },
      query: {
        exclude_direct: 'true'
      }
    };

    const myEmail = 'ops@argusshipping.co';
    const myUsername = 'jabir';
    const conditions = ["(note IS NULL OR note != 'Direct Booking')"];
    const params = [myEmail, myUsername];
    const where = 'WHERE ' + conditions.join(' AND ');

    console.log('[Test] Running getAllShipments query for operator...');
    const result = await query(mockReq,
      `SELECT s.ref_no, s.cust_req_no, s.refer_by, s.pol, s.pod, s.commodity, s.term, s.dimension,
              s.container, s.mode, s.weight, s.pickup_address, s.delivery_address,
              s.dear_who, s.email, s.status, s.note, s.customer_id, s.customer_name, s.customer_email,
              s.created_at, s.last_follow_up, s.do_number, s.box_no, s.so_number, s.bl_number,
              s.track_status, s.carrier, s.etd, s.eta, s.cost, s.profit,
              COALESCE(
                (SELECT username FROM users WHERE LOWER(email_address) = LOWER(s.operator) OR LOWER(username) = LOWER(s.operator) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1),
                s.operator
              ) AS operator,
              (SELECT COUNT(*) FROM shipment_replies r WHERE r.ref_no = s.ref_no) AS replies_count,
              (SELECT COUNT(*) FROM shipment_replies r WHERE r.ref_no = s.ref_no AND (r.is_read = false OR r.is_read = 0 OR r.is_read IS NULL) AND LOWER(r.from_email) != LOWER($1)) AS unread_replies_count,
              (SELECT COUNT(*) FROM customer_operator_chats c WHERE (c.cust_req_no = s.cust_req_no OR c.cust_req_no = s.ref_no) AND c.is_read = false AND LOWER(c.sender_username) != LOWER($2)) AS unread_chat_count
       FROM shipments s ${where} ORDER BY s.created_at DESC`,
      params
    );

    console.log('[Test] Query SUCCESS! Rows returned:', result.rows.length);
  } catch (err) {
    console.error('[Test] Query FAILED with error:', err);
  } finally {
    process.exit(0);
  }
}

testQuery();
