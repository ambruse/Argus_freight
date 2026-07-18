module.paths.push('c:/Users/WORK/Documents/ARGUS-s/backend/node_modules');
require('dotenv').config({ path: 'c:/Users/WORK/Documents/ARGUS-s/backend/.env' });
const pool = require('c:/Users/WORK/Documents/ARGUS-s/backend/src/config/db');
const { query } = require('c:/Users/WORK/Documents/ARGUS-s/backend/src/config/dbHelper');

// Mock request / response / next
function createMockReq(user, body) {
  return {
    user: user,
    body: body,
    params: {},
    query: {}
  };
}

function createMockRes() {
  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

// We will copy the generateRfq logic but log the actual error inside the catch block!
const generateRfqSimulated = async (req, res, next) => {
  try {
    const {
      refer_by, pol, pod, commodity, term, dimension,
      container, mode, weight, pickup_address, delivery_address,
      dear_who, email, note, customer_name, customer_email, operator,
      pol_country
    } = req.body;

    let isLogged = false;
    let attempts = 0;
    const maxAttempts = 5;
    let ref_no = '';
    let shipmentData = null;
    let finalCustomerId = null;

    // ── Resolve Customer ID ─────────────────────────────────────
    if (customer_name && customer_name.trim() !== '') {
      const cName = customer_name.trim();
      const existing = await pool.query('SELECT customer_id FROM customers WHERE name = $1', [cName]);
      if (existing.rows.length > 0) {
        finalCustomerId = existing.rows[0].customer_id;
      } else {
        let uniqueCidFound = false;
        let cAttempts = 0;
        while (!uniqueCidFound && cAttempts < 10) {
          const newCid = Math.floor(10000 + Math.random() * 90000).toString();
          try {
            await pool.query('INSERT INTO customers (customer_id, name) VALUES ($1, $2)', [newCid, cName]);
            finalCustomerId = newCid;
            uniqueCidFound = true;
          } catch (e) {
            if (e.code !== '23505') throw e;
            cAttempts++;
          }
        }
      }
    }

    // ── Resolve Operator Username (if sent by sales) ──────────
    let opUsername = null;
    if (req.user.role === 'sales' && operator) {
      const opByUsername = await pool.query(
        "SELECT username FROM users WHERE LOWER(username) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
        [operator]
      );
      if (opByUsername.rows.length > 0) {
        opUsername = opByUsername.rows[0].username.toLowerCase();
      } else {
        const opUserCheck = await pool.query(
          "SELECT username FROM users WHERE LOWER(email_address) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
          [operator]
        );
        if (opUserCheck.rows.length > 0) {
          opUsername = opUserCheck.rows[0].username.toLowerCase();
        }
      }
    }

    ref_no = req.body.ref_no;

    while (!isLogged && attempts < maxAttempts) {
      if (!ref_no) {
        const baseRfq = 'AUTO_GEN_ID';
        ref_no = attempts > 0 ? `${baseRfq}_${attempts}` : baseRfq;
      }

      try {
        const result = await query(req,
          `INSERT INTO shipments (
            ref_no, refer_by, pol, pod, commodity, term, dimension,
            container, mode, weight, pickup_address, delivery_address,
            dear_who, email, status, note, customer_id, customer_name, customer_email, operator
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
          ) RETURNING *`,
          [
            ref_no, refer_by, pol, pod, commodity, term, dimension,
            container, mode, weight || null, pickup_address, delivery_address,
            dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
            (req.user.role === 'sales' && operator) ? (opUsername || operator) : req.user.username
          ]
        );
        isLogged = true;
        shipmentData = result.rows[0];

        // ── Clone shipment to respective operator sandbox ──────────
        if (opUsername && opUsername !== req.user.username.toLowerCase()) {
          const opTableName = opUsername === 'admin' ? 'shipments' : `shipments_${opUsername}`;
          await pool.query(
            `INSERT INTO ${opTableName} (
              ref_no, refer_by, pol, pod, commodity, term, dimension,
              container, mode, weight, pickup_address, delivery_address,
              dear_who, email, status, note, customer_id, customer_name, customer_email, operator
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
             ON CONFLICT (ref_no) DO NOTHING`,
            [
              ref_no, refer_by, pol, pod, commodity, term, dimension,
              container, mode, weight || null, pickup_address, delivery_address,
              dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
              opUsername || operator
            ]
          );
        }

      } catch (err) {
        console.error('--- ACTUAL ERROR INSIDE CATCH BLOCK ---');
        console.error(err);
        if (req.body.ref_no) {
          return res.status(409).json({ success: false, message: `Reference number ${ref_no} already exists.` });
        }
        if (err.code === '23505') {
          ref_no = '';
          attempts++;
        } else {
          throw err;
        }
      }
    }

    if (!isLogged) {
      return res.status(500).json({ success: false, message: 'Failed' });
    }
    return res.status(201).json({ success: true, data: shipmentData });
  } catch (err) {
    next(err);
  }
};

async function runSimulations() {
  // Test case 1: Sales user (Aysha) sending an RFQ to operator (jabir)
  console.log('=== TEST 1: Sales user sending RFQ ===');
  const userSales = { username: 'Aysha', role: 'sales' };
  const bodySales = {
    refer_by: 'Test Refer',
    pol: 'Port A',
    pod: 'Port B',
    commodity: 'Test Comm',
    term: 'FOB',
    dimension: '10x10',
    container: '40ft',
    mode: 'SEA',
    weight: '1000',
    pickup_address: 'Pickup A',
    delivery_address: 'Delivery B',
    dear_who: 'Dear Receiver',
    email: 'receiver@test.com',
    note: 'Some note',
    customer_name: 'Adhila-Fantech', // existing customer
    operator: 'jabir',
    ref_no: '12EF07GN26-01'
  };

  const req = createMockReq(userSales, bodySales);
  const res = createMockRes();
  await generateRfqSimulated(req, res, (err) => {
    console.error('Next called with error:', err);
  });
  console.log('Response Status:', res.statusCode);
  console.log('Response JSON:', res.jsonData);

  // Clean up if it succeeded
  if (res.statusCode === 201) {
    await pool.query('DELETE FROM shipments WHERE ref_no = $1', [bodySales.ref_no]);
    await pool.query('DELETE FROM shipments_jabir WHERE ref_no = $1', [bodySales.ref_no]);
    console.log('Test 1 cleanup done');
  }

  await pool.end();
}

runSimulations();
