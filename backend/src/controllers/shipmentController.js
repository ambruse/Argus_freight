// src/controllers/shipmentController.js
// ─────────────────────────────────────────────────────────────
//  CRUD operations for the shipments table.
//  All queries are parameterised to prevent SQL injection.
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');
const { query } = require('../config/dbHelper');
const nodemailer = require('nodemailer');
const { PDFDocument } = require('pdf-lib');

const syncShipmentToCustomer = async (shipment) => {
  if (!shipment || !shipment.cust_req_no || !shipment.customer_id) return;
  try {
    // Find customer username
    const custUserRes = await db.query(
      `SELECT username FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1`,
      [shipment.customer_id]
    );
    if (custUserRes.rows.length === 0) return;
    const customerUsername = custUserRes.rows[0].username;
    const cleanUsername = customerUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

    // Update customer sandbox table shipments_username
    await db.query(
      `UPDATE shipments_${cleanUsername} SET
         status = $1,
         do_number = $2,
         box_no = $3,
         so_number = $4,
         bl_number = $5,
         track_status = $6,
         carrier = $7,
         etd = $8,
         eta = $9,
         cost = $10,
         profit = $11,
         last_follow_up = $12,
         updated_at = NOW()
       WHERE ref_no = $13`,
      [
        shipment.status,
        shipment.do_number,
        shipment.box_no,
        shipment.so_number,
        shipment.bl_number,
        shipment.track_status,
        shipment.carrier,
        shipment.etd,
        shipment.eta,
        shipment.cost,
        shipment.profit,
        shipment.last_follow_up,
        shipment.cust_req_no
      ]
    );
    console.log(`[Sync] Synced shipment ${shipment.ref_no} updates to customer ${cleanUsername} ref_no ${shipment.cust_req_no}`);
  } catch (err) {
    console.error(`[Sync] Failed to sync shipment ${shipment.ref_no} to customer:`, err.message);
  }
};

// ── Helper: generate next auto REF NO ────────────────────────
//  Pattern: ARG-XXXX  (e.g. ARG-1001)
//  Finds the highest existing numeric suffix and increments it.
const generateRefNo = async (req) => {
  const result = await query(req,
    `SELECT ref_no FROM shipments
     WHERE ref_no ~ '^ARG-[0-9]+$'
     ORDER BY CAST(SUBSTRING(ref_no FROM 5) AS INTEGER) DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) return 'ARG-1001';

  const last = result.rows[0].ref_no; // e.g. ARG-1005
  const num  = parseInt(last.split('-')[1], 10);
  return `ARG-${num + 1}`;
};



//  GET /api/shipments
//  Query params:
//    ?exclude_direct=true  → exclude rows where note = 'Direct Booking'  (RFQ page)
//    ?status=Confirmed      → filter by status
// ─────────────────────────────────────────────────────────────
const getAllShipments = async (req, res, next) => {
  try {
    const { exclude_direct, status } = req.query;
    const myEmail = process.env.SMTP_USER || '';
    const myUsername = req.user.username;
    const conditions = [];
    const params     = [myEmail, myUsername];

    if (exclude_direct === 'true') {
      conditions.push(`(note IS NULL OR note != 'Direct Booking')`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(req, 
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
              (SELECT COUNT(*) FROM shipment_replies r WHERE r.ref_no = s.ref_no AND r.is_read = false AND LOWER(r.from_email) != LOWER($1)) AS unread_replies_count,
              (SELECT COUNT(*)::int FROM customer_operator_chats c WHERE (c.cust_req_no = s.cust_req_no OR c.cust_req_no = s.ref_no) AND c.is_read = false AND LOWER(c.sender_username) != LOWER($2)) AS unread_chat_count
       FROM shipments s ${where} ORDER BY s.created_at DESC`,
      params
    );

    let rows = result.rows;
    if (req.user && req.user.role === 'customer') {
      rows = rows.map(r => ({
        ...r,
        email: 'Hidden',
        dear_who: 'Agent',
        cost: null
      }));
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/shipments/:ref_no
// ─────────────────────────────────────────────────────────────
const getShipmentByRef = async (req, res, next) => {
  try {
    const result = await query(req, 
      `SELECT s.ref_no, s.cust_req_no, s.refer_by, s.pol, s.pod, s.commodity, s.term, s.dimension,
              s.container, s.mode, s.weight, s.pickup_address, s.delivery_address,
              s.dear_who, s.email, s.status, s.note, s.customer_id, s.customer_name, s.customer_email,
              s.created_at, s.last_follow_up, s.do_number, s.box_no, s.so_number, s.bl_number,
              s.track_status, s.carrier, s.etd, s.eta, s.cost, s.profit,
              COALESCE(
                (SELECT username FROM users WHERE LOWER(email_address) = LOWER(s.operator) OR LOWER(username) = LOWER(s.operator) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1),
                s.operator
              ) AS operator
       FROM shipments s WHERE s.ref_no = $1`,
      [req.params.ref_no]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    let data = result.rows[0];
    if (req.user && req.user.role === 'customer') {
      data = {
        ...data,
        email: 'Hidden',
        dear_who: 'Agent',
        cost: null
      };
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/shipments
//  If ref_no is blank, auto-generates ARG-XXXX.
// ─────────────────────────────────────────────────────────────
const createShipment = async (req, res, next) => {
  try {
    let {
      ref_no, refer_by, pol, pod, commodity, term, dimension,
      container, mode, weight, pickup_address, delivery_address,
      dear_who, email, status, do_number, box_no, so_number,
      bl_number, track_status, carrier, etd, eta, cost, profit, note,
    } = req.body;

    // Auto-generate if blank
    if (!ref_no || ref_no.trim() === '') {
      ref_no = await generateRefNo(req);
    }

    const result = await query(req, 
      `INSERT INTO shipments (
        ref_no, refer_by, pol, pod, commodity, term, dimension,
        container, mode, weight, pickup_address, delivery_address,
        dear_who, email, status, do_number, box_no, so_number,
        bl_number, track_status, carrier, etd, eta, cost, profit, note, operator
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
      ) RETURNING *`,
      [
        ref_no, refer_by, pol, pod, commodity, term, dimension,
        container, mode, weight || null, pickup_address, delivery_address,
        dear_who, email, status || 'Pending',
        do_number, box_no, so_number, bl_number,
        track_status, carrier, etd || null, eta || null,
        cost || null, profit || null, note,
        req.user.username,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/shipments/:ref_no
//  Full update — replaces all editable fields.
// ─────────────────────────────────────────────────────────────
const updateShipment = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const {
      refer_by, pol, pod, commodity, term, dimension,
      container, mode, weight, pickup_address, delivery_address,
      dear_who, email, status, do_number, box_no, so_number,
      bl_number, track_status, carrier, etd, eta, cost, profit, note,
      customer_name, customer_email,
    } = req.body;

    const result = await query(req, 
      `UPDATE shipments SET
        refer_by=$1, pol=$2, pod=$3, commodity=$4, term=$5, dimension=$6,
        container=$7, mode=$8, weight=$9, pickup_address=$10, delivery_address=$11,
        dear_who=$12, email=$13, status=$14, do_number=$15, box_no=$16,
        so_number=$17, bl_number=$18, track_status=$19, carrier=$20,
        etd=$21, eta=$22, cost=$23, profit=$24, note=$25,
        customer_name=$26, customer_email=$27
      WHERE ref_no=$28
      RETURNING *`,
      [
        refer_by, pol, pod, commodity, term, dimension,
        container, mode, weight || null, pickup_address, delivery_address,
        dear_who, email, status,
        do_number, box_no, so_number, bl_number, track_status, carrier,
        etd || null, eta || null, cost || null, profit || null, note,
        customer_name || null, customer_email || null,
        ref_no,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    await syncShipmentToCustomer(result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  PATCH /api/shipments/:ref_no/status
//  Updates status AND resets last_follow_up to NOW().
//  Used by the RFQ modal "Edit Status" dropdown.
// ─────────────────────────────────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const { status, cost, profit } = req.body;

    const result = await query(req, 
      `UPDATE shipments SET 
         status = COALESCE($1, status),
         cost = COALESCE($2, cost),
         profit = COALESCE($3, profit),
         last_follow_up = CASE WHEN COALESCE($1, status) = 'Cancelled' THEN NULL ELSE NOW() END
       WHERE ref_no = $4
       RETURNING *`,
      [status, cost, profit, ref_no]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    await syncShipmentToCustomer(result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  PATCH /api/shipments/:ref_no/tracking
//  Updates only the tracking/execution fields.
// ─────────────────────────────────────────────────────────────
const updateTracking = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const {
      do_number, box_no, so_number, bl_number, track_status, carrier,
      etd, eta, cost, profit, customer_name, customer_email
    } = req.body;

    const result = await query(req, 
      `UPDATE shipments
       SET do_number=$1, box_no=$2, so_number=$3, bl_number=$4,
           track_status=$5, carrier=$6, etd=$7, eta=$8, cost=$9, profit=$10,
           customer_name=$11, customer_email=$12
       WHERE ref_no=$13
       RETURNING *`,
      [
        do_number, box_no, so_number, bl_number, track_status, carrier,
        etd || null, eta || null, cost || null, profit || null,
        customer_name || null, customer_email || null,
        ref_no
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    await syncShipmentToCustomer(result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/shipments/:ref_no
// ─────────────────────────────────────────────────────────────
const deleteShipment = async (req, res, next) => {
  try {
    const result = await query(req, 
      'DELETE FROM shipments WHERE ref_no = $1 RETURNING ref_no',
      [req.params.ref_no]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    res.json({ success: true, message: `Shipment ${req.params.ref_no} deleted.` });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
const maskEmails = (text, allowedEmails = []) => {
  if (!text) return text;
  // Regex to find email addresses
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  return text.replace(emailRegex, (match) => {
    const isAllowed = allowedEmails.some(email => email && email.toLowerCase() === match.toLowerCase());
    return isAllowed ? match : '[Email Hidden]';
  });
};

// ─────────────────────────────────────────────────────────────
const getReplies = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    
    // Resolve myEmail dynamically
    let myEmail = '';
    try {
      const emailRes = await db.query("SELECT email_address FROM users WHERE id = $1", [req.user.id]);
      if (emailRes.rows.length > 0 && emailRes.rows[0].email_address) {
        myEmail = emailRes.rows[0].email_address.toLowerCase().trim();
      }
    } catch (dbErr) {}

    if (req.user && req.user.role === 'customer') {
      const cleanUsername = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const shipRes = await db.query(`SELECT operator FROM shipments_${cleanUsername} WHERE ref_no = $1 LIMIT 1`, [ref_no]);
      if (shipRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Shipment not found.' });
      }

      const operatorName = shipRes.rows[0].operator;
      const cleanOperator = operatorName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const opTableName = cleanOperator === 'admin' ? 'shipments' : `shipments_${cleanOperator}`;
      const opRepliesTable = cleanOperator === 'admin' ? 'shipment_replies' : `shipment_replies_${cleanOperator}`;

      let operatorEmail = '';
      const opEmailRes = await db.query(
        "SELECT email_address FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1) LIMIT 1",
        [operatorName]
      );
      if (opEmailRes.rows.length > 0) {
        operatorEmail = opEmailRes.rows[0].email_address || '';
      }

      // Mark incoming replies as read in operator replies table
      await db.query(
        `UPDATE ${opRepliesTable} SET is_read = true 
         WHERE ref_no IN (SELECT ref_no FROM ${opTableName} WHERE cust_req_no = $1)
           AND LOWER(from_email) != LOWER($2)`,
        [ref_no, myEmail]
      );

      // Fetch replies from operator replies table
      const result = await db.query(
        `SELECT * FROM ${opRepliesTable} 
         WHERE ref_no IN (SELECT ref_no FROM ${opTableName} WHERE cust_req_no = $1)
         ORDER BY received_at ASC`,
        [ref_no]
      );

      const customerEmail = req.user.email_address || '';
      const allowedEmails = [customerEmail, operatorEmail];
      
      const formatted = result.rows.map(row => {
        const isFromOperator = operatorEmail && (row.from_email || '').toLowerCase().trim() === operatorEmail.toLowerCase().trim();
        const isFromCustomer = customerEmail && (row.from_email || '').toLowerCase().trim() === customerEmail.toLowerCase().trim();
        
        let maskedFrom = 'Agent';
        if (isFromOperator) maskedFrom = 'Operator';
        if (isFromCustomer) maskedFrom = 'Me';

        return {
          ...row,
          from_email: maskedFrom,
          subject: maskEmails(row.subject, allowedEmails),
          body_text: maskEmails(row.body_text, allowedEmails),
          is_outgoing: isFromOperator || isFromCustomer
        };
      });
      return res.json({ success: true, data: formatted });
    }

    // Mark incoming replies as read (Standard User/Operator/Admin)
    await query(req, 
      `UPDATE shipment_replies SET is_read = true 
       WHERE ref_no = $1 AND LOWER(from_email) != LOWER($2)`,
      [ref_no, myEmail]
    );

    const result = await query(req, 
      `SELECT * FROM shipment_replies WHERE ref_no = $1 ORDER BY received_at ASC`,
      [ref_no]
    );

    const formatted = result.rows.map(row => ({
      ...row,
      is_outgoing: (row.from_email || '').toLowerCase().trim() === myEmail
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/shipments/:ref_no/replies
//  Sends an email reply and saves it to shipment_replies
// ─────────────────────────────────────────────────────────────
const sendReply = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    // Resolve Dynamic Email Credentials from logged-in user
    let smtpUser = null;
    let smtpPass = null;
    try {
      const userRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
      if (userRes.rows.length > 0) {
        smtpUser = userRes.rows[0].email_address;
        smtpPass = userRes.rows[0].email_password;
      }
    } catch (dbErr) {
      console.error('Error loading credentials from DB:', dbErr.message);
    }

    // Fallback to global env variables if not set in DB
    if (!smtpUser) {
      smtpUser = process.env.SMTP_USER || null;
    }
    if (!smtpPass) {
      smtpPass = process.env.SMTP_PASS || null;
    }

    // Sanitize any accidental surrounding quotes
    if (smtpUser) {
      smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    }
    if (smtpPass) {
      smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');
    }

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your email settings are not configured. Please configure your email address and app password in Settings.' 
      });
    }

    // 1. Fetch Shipment
    const shipRes = await query(req, 'SELECT * FROM shipments WHERE ref_no = $1', [ref_no]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    const shipment = shipRes.rows[0];

    // 2. Find Recipient Email
    let recipientEmail = shipment.email;

    // Look for the latest incoming reply (not from ourselves) to reply to
    const myEmail = process.env.SMTP_USER;
    const latestReplyRes = await query(req, 
      `SELECT from_email FROM shipment_replies 
       WHERE ref_no = $1 AND from_email != $2 
       ORDER BY received_at DESC LIMIT 1`,
      [ref_no, myEmail]
    );

    if (latestReplyRes.rows.length > 0) {
      recipientEmail = latestReplyRes.rows[0].from_email;
    }

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email address available.' });
    }

    // 3. SMTP Credentials already resolved at top

    // 4. Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', 
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4
    });

    // 5. Construct Subject
    let subject = `Re: RFQ FROM ${shipment.pol || ''} TO ${shipment.pod || ''}`;
    if (shipment.mode) subject += `/${shipment.mode}`;
    if (shipment.container) subject += `/${shipment.container}`;
    subject += `/${shipment.ref_no}/CID : ${shipment.customer_id || ''}`;

    // 6. Construct Email Text & HTML
    const salutation = shipment.dear_who ? `Dear ${shipment.dear_who},` : 'Dear Sir/Madam,';
    const messageText = `${salutation}\n\n${message.trim()}\n\nBest regards,\n\nMuhammed Jabir\nPRICING AND OPERATION\nARGUS SHIPPING\n\n📞 +974 30512233\n\n📧 jabir@argusshipping.co\n\n🌐 www.argusshipping.co`;

    const formattedInput = message.trim().replace(/\n/g, '<br>');
    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${salutation}<br><br>
        ${formattedInput}<br><br>
        Best regards,<br><br>
        <b>Muhammed Jabir</b><br>
        PRICING AND OPERATION<br>
        ARGUS SHIPPING<br><br>
        📞 +974 30512233<br><br>
        📧 <a href="mailto:jabir@argusshipping.co">jabir@argusshipping.co</a><br><br>
        🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a>
      </body>
      </html>
    `;

    // 7. Setup Mail Options
    const mailOptions = {
      from: `"FreightOS" <${smtpUser}>`,
      to: recipientEmail,
      subject: subject,
      text: messageText,
      html: htmlBody,
    };

    // 8. Send Email
    await transporter.sendMail(mailOptions);

    // 9. Save to shipment_replies DB
    const insertRes = await query(req, 
      `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ref_no, smtpUser, subject, messageText]
    );

    // 8. Update last_follow_up
    const updateRes = await query(req, `UPDATE shipments SET last_follow_up = NOW() WHERE ref_no = $1 RETURNING *`, [ref_no]);
    if (updateRes.rows.length > 0) {
      await syncShipmentToCustomer(updateRes.rows[0]);
    }

    res.json({ 
      success: true, 
      data: { ...insertRes.rows[0], is_outgoing: true }, 
      message: 'Reply sent successfully.' 
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/shipments/:ref_no/follow-up
//  Sends a standardized follow-up email and updates follow-up time
// ─────────────────────────────────────────────────────────────
const sendFollowUp = async (req, res, next) => {
  try {
    const { ref_no } = req.params;

    // Resolve Dynamic Email Credentials from logged-in user
    let smtpUser = null;
    let smtpPass = null;
    try {
      const userRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
      if (userRes.rows.length > 0) {
        smtpUser = userRes.rows[0].email_address;
        smtpPass = userRes.rows[0].email_password;
      }
    } catch (dbErr) {
      console.error('Error loading credentials from DB:', dbErr.message);
    }

    // Fallback to global env variables if not set in DB
    if (!smtpUser) {
      smtpUser = process.env.SMTP_USER || null;
    }
    if (!smtpPass) {
      smtpPass = process.env.SMTP_PASS || null;
    }

    // Sanitize any accidental surrounding quotes
    if (smtpUser) {
      smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    }
    if (smtpPass) {
      smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');
    }

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your email settings are not configured. Please configure your email address and app password in Settings.' 
      });
    }

    // 1. Fetch Shipment
    const shipRes = await query(req, 'SELECT * FROM shipments WHERE ref_no = $1', [ref_no]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    const shipment = shipRes.rows[0];

    // 2. Find Recipient Email
    let recipientEmail = shipment.email;

    // Look for the latest incoming reply (not from ourselves) to reply to
    const myEmail = process.env.SMTP_USER;
    const latestReplyRes = await query(req, 
      `SELECT from_email FROM shipment_replies 
       WHERE ref_no = $1 AND from_email != $2 
       ORDER BY received_at DESC LIMIT 1`,
      [ref_no, myEmail]
    );

    if (latestReplyRes.rows.length > 0) {
      recipientEmail = latestReplyRes.rows[0].from_email;
    }

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'No recipient email address available.' });
    }

    // 3. SMTP Credentials already resolved at top

    // 4. Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', 
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4
    });

    // 5. Construct Subject
    let subject = `Re: RFQ FROM ${shipment.pol || ''} TO ${shipment.pod || ''}`;
    if (shipment.mode) subject += `/${shipment.mode}`;
    if (shipment.container) subject += `/${shipment.container}`;
    subject += `/${shipment.ref_no}/CID : ${shipment.customer_id || ''}`;

    // 6. Construct Email Text & HTML
    const salutation = shipment.dear_who ? `Dear ${shipment.dear_who},` : 'Dear Sir/Madam,';
    const messageText = `${salutation}\n\nI hope this email finds you well.\n\nI am writing to gently follow up on my previous message regarding the pending shipment. Could you please provide an update on its current status at your earliest convenience?\n\nBest regards,\n\nMuhammed Jabir\nPRICING AND OPERATION\nARGUS SHIPPING\n\n📞 +974 30512233\n\n📧 jabir@argusshipping.co\n\n🌐 www.argusshipping.co`;

    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${salutation}<br><br>
        I hope this email finds you well.<br><br>
        I am writing to gently follow up on my previous message regarding the pending shipment. Could you please provide an update on its current status at your earliest convenience?<br><br>
        Best regards,<br><br>
        <b>Muhammed Jabir</b><br>
        PRICING AND OPERATION<br>
        ARGUS SHIPPING<br><br>
        📞 +974 30512233<br><br>
        📧 <a href="mailto:jabir@argusshipping.co">jabir@argusshipping.co</a><br><br>
        🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a>
      </body>
      </html>
    `;

    // 7. Setup Mail Options
    const mailOptions = {
      from: `"FreightOS" <${smtpUser}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    };

    // 8. Send Email
    await transporter.sendMail(mailOptions);

    // 9. Save to shipment_replies DB
    const insertRes = await query(req, 
      `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ref_no, smtpUser, subject, messageText]
    );

    // 9. Update last_follow_up
    const updatedShipment = await query(req, 
      `UPDATE shipments SET last_follow_up = NOW() WHERE ref_no = $1 RETURNING *`,
      [ref_no]
    );
    if (updatedShipment.rows.length > 0) {
      await syncShipmentToCustomer(updatedShipment.rows[0]);
    }

    res.json({
      success: true,
      data: { ...insertRes.rows[0], is_outgoing: true },
      last_follow_up: updatedShipment.rows[0].last_follow_up,
      message: 'Follow-up email sent successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/shipments/:ref_no/send-quotation
//  Sends a custom quotation email to the customer
// ─────────────────────────────────────────────────────────────
const sendQuotation = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const { 
      freightRate, 
      trans, 
      zone, 
      validityDate, 
      currency, 
      carrier_name, 
      transit_time, 
      warTime, 
      note 
    } = req.body;

    // Resolve Dynamic Email Credentials from logged-in user
    let smtpUser = null;
    let smtpPass = null;
    try {
      const userRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
      if (userRes.rows.length > 0) {
        smtpUser = userRes.rows[0].email_address;
        smtpPass = userRes.rows[0].email_password;
      }
    } catch (dbErr) {
      console.error('Error loading credentials from DB:', dbErr.message);
    }

    // Fallback to global env variables if not set in DB
    if (!smtpUser) {
      smtpUser = process.env.SMTP_USER || null;
    }
    if (!smtpPass) {
      smtpPass = process.env.SMTP_PASS || null;
    }

    // Sanitize any accidental surrounding quotes
    if (smtpUser) {
      smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    }
    if (smtpPass) {
      smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');
    }

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ 
        success: false, 
        message: 'Your email settings are not configured. Please configure your email address and app password in Settings.' 
      });
    }

    // 1. Fetch Shipment
    const shipRes = await query(req, 'SELECT * FROM shipments WHERE ref_no = $1', [ref_no]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    const shipment = shipRes.rows[0];

    // 2. Validate Customer Email
    const recipientEmail = shipment.customer_email || shipment.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Customer email address is not configured for this shipment.' });
    }

    // 3. Generate PDF Attachment via DOCX template rendering and Word COM conversion
    const PizZip = require('pizzip');
    const Docxtemplater = require('docxtemplater');
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    const assetsDir = path.resolve(__dirname, '../../../public');
    const templatePath = path.join(assetsDir, 'Argus_Ambient_Premium_Quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: 'Argus_Ambient_Premium_Quotation.docx template not found in assets.' });
    }

    // Date formatting (dd-mm-yyyy)
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    // Format validity date based on input
    let validityStr = '';
    let validityDbDate = null;
    if (validityDate && validityDate.trim() !== '') {
      try {
        const parts = validityDate.split('-');
        if (parts.length === 3) {
          validityStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          validityDbDate = validityDate;
        } else {
          validityStr = validityDate;
          validityDbDate = new Date(today);
          validityDbDate.setDate(today.getDate() + 3);
        }
      } catch (e) {
        const validityDateDefault = new Date(today);
        validityDateDefault.setDate(today.getDate() + 3);
        validityDbDate = validityDateDefault;
        validityStr = `${String(validityDateDefault.getDate()).padStart(2, '0')}-${String(validityDateDefault.getMonth() + 1).padStart(2, '0')}-${validityDateDefault.getFullYear()}`;
      }
    } else {
      const validityDateDefault = new Date(today);
      validityDateDefault.setDate(today.getDate() + 3);
      validityDbDate = validityDateDefault;
      validityStr = `${String(validityDateDefault.getDate()).padStart(2, '0')}-${String(validityDateDefault.getMonth() + 1).padStart(2, '0')}-${validityDateDefault.getFullYear()}`;
    }

    const formatCurrency = (val) => {
      if (val === undefined || val === null || val === '') return '—';
      const num = Number(val);
      return isNaN(num) ? val : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Financials and currency calculations
    const freightNum = parseFloat(freightRate) || 0;
    const transNum = parseFloat(trans) || 0;
    const isUsd = (currency || 'QAR').toUpperCase() === 'USD';

    let freightQar = 0;
    let freightUsd = 0;

    if (isUsd) {
      freightUsd = freightNum;
      freightQar = freightNum * 3.65;
    } else {
      freightQar = freightNum;
      freightUsd = freightNum / 3.65;
    }

    const totalRate = 400 + transNum + freightQar;

    // Load the DOCX template
    const templateBytes = fs.readFileSync(templatePath);
    const zip = new PizZip(templateBytes);

    // Clean all XML files inside the zip
    Object.keys(zip.files).forEach(fileName => {
      if (fileName.endsWith('.xml')) {
        let content = zip.files[fileName].asText();
        content = content.replace(/\{[^{}]+\}/g, (match) => {
          return match.replace(/<[^>]+>/g, '');
        });
        
        // 1. Mark {CARRIER/AIRLINE/TRUCK} font color to white (FFFFFF)
        content = content.replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[^])*?CARRIER\/AIRLINE\/TRUCK(?:(?!<\/w:r>)[^])*?<\/w:r>/gi, (match) => {
          return match.replace(/FF0000/gi, 'FFFFFF');
        });

        // 2. Replace all remaining red color hexadecimal values (FF0000) with black (000000)
        content = content.replace(/FF0000/gi, '000000');
        
        zip.file(fileName, content);
      }
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Resolve mode and placeholders
    const upperShipmentMode = (shipment.mode || 'SEA').toUpperCase();
    let modeForTemplate = 'OCEAN';
    if (upperShipmentMode === 'AIR') {
      modeForTemplate = 'AIR';
    } else if (upperShipmentMode === 'ROAD' || upperShipmentMode === 'LAND') {
      modeForTemplate = 'LAND';
    }

    const finalZone = zone && zone.trim() !== '' ? zone.trim() : 'Zone-1';

    // Extract Port Codes helper
    const extractPortCode = (portStr) => {
      if (!portStr) return '';
      const match = portStr.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        return match[1].trim();
      }
      return portStr;
    };

    const polCode = extractPortCode(shipment.pol);
    const podCode = extractPortCode(shipment.pod);

    const carrierPlaceholderValue = modeForTemplate === 'AIR' ? 'AIRLINE' : (modeForTemplate === 'LAND' ? 'TRUCK' : 'CARRIER');

    // 1. Generate sequential Q.NO (format: yyyymmdd001, yyyymmdd002)
    const datePrefix = `${yyyy}${mm}${dd}`;
    const highestQuotRes = await db.query(
      `SELECT q_no FROM quotations WHERE q_no LIKE $1 ORDER BY q_no DESC LIMIT 1`,
      [`${datePrefix}%`]
    );

    let seq = 1;
    if (highestQuotRes.rows.length > 0) {
      const highestQNo = highestQuotRes.rows[0].q_no;
      const seqStr = highestQNo.substring(8);
      const parsedSeq = parseInt(seqStr, 10);
      if (!isNaN(parsedSeq)) {
        seq = parsedSeq + 1;
      }
    }
    const q_no = `${datePrefix}${String(seq).padStart(3, '0')}`;

    // Set variables for template
    const renderVars = {
      'Q_no': q_no,
      'q_no': q_no,
      'DATE': dateStr,
      'Date': dateStr,
      'VALIDITY': validityStr,
      'Validity': validityStr,
      'C_NAME': shipment.customer_name || '',
      'C_name': shipment.customer_name || '',
      'c_name': shipment.customer_name || '',
      'SALES_P': shipment.sales_p || shipment.refer_by || '',
      'Sales_P': shipment.sales_p || shipment.refer_by || '',
      'sales_p': shipment.sales_p || shipment.refer_by || '',
      'OPERATOR': shipment.operator || '',
      'Operator': shipment.operator || '',
      'operator': shipment.operator || '',
      'TT': transit_time || '',
      'tt': transit_time || '',
      'POL': shipment.pol || '',
      'POD': shipment.pod || '',
      'COMMODITY': shipment.commodity || '',
      'MODE': modeForTemplate || '',
      'mode': modeForTemplate || '',
      'POD_PCODE': podCode || '',
      'POL_PCODE': polCode || '',
      'FREIGHT_QAR': formatCurrency(freightQar),
      'FREIGHT_USD': formatCurrency(freightUsd),
      'Zone': finalZone,
      'TRANS': formatCurrency(transNum),
      '400+TRANS+FREIGHT': formatCurrency(totalRate),

      'CARRIER/AIRLINE/TRUCK': carrierPlaceholderValue,
      'CARRIER/AIRLINE/TRUCK ': carrierPlaceholderValue,
      'CARRIER_name/AIRLINE_name /TRUCK_name ': carrier_name || '',
      'CARRIER_name/AIRLINE_name/TRUCK_name ': carrier_name || '',
      'CARRIER_name/AIRLINE_name /TRUCK_name': carrier_name || '',
      'CARRIER_name/AIRLINE_name/TRUCK_name': carrier_name || '',
      
      'carrier_name': carrier_name || '',
      'airline_name': carrier_name || '',
      'truck_name': carrier_name || ''
    };

    doc.render(renderVars);
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // 4. Archive PDF to disk
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
    const refNoClean = ref_no.replace(/[^a-zA-Z0-9\-]/g, '_');
    const targetDir = path.join(UPLOAD_DIR, refNoClean);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const timestamp = Date.now();
    const cid = shipment.customer_id || 'UNKNOWN';
    const originalName = `Quotation-${cid}.pdf`;
    const fileName = `${timestamp}_${originalName}`;
    const filePath = path.join(targetDir, fileName);

    const tempDocxFileName = `${timestamp}_Quotation-${cid}.docx`;
    const tempDocxPath = path.join(targetDir, tempDocxFileName);

    // Write temp docx
    fs.writeFileSync(tempDocxPath, docxBuffer);

    // Convert docx to pdf
    const convertDocxToPdf = (docxPath, pdfPath) => {
      return new Promise((resolve, reject) => {
        const absoluteDocx = path.resolve(docxPath);
        const absolutePdf = path.resolve(pdfPath);

        if (process.platform === 'win32') {
          const escapedDocx = absoluteDocx.replace(/\\/g, '/').replace(/'/g, "''");
          const escapedPdf = absolutePdf.replace(/\\/g, '/').replace(/'/g, "''");
          const psCommand = `$word = New-Object -ComObject Word.Application; $word.Visible = $false; $doc = $word.Documents.Open('${escapedDocx}'); $doc.SaveAs('${escapedPdf}', 17); $doc.Close(); $word.Quit();`;
          
          exec(`powershell -NoProfile -Command "${psCommand}"`, (err, stdout, stderr) => {
            if (err) {
              return reject(new Error(stderr || err.message));
            }
            resolve();
          });
        } else {
          // Linux / Render conversion using libreoffice-convert
          const libre = require('libreoffice-convert');
          const convertToPdfAsync = require('util').promisify(libre.convert);
          
          try {
            const docxFileToConvert = fs.readFileSync(absoluteDocx);
            convertToPdfAsync(docxFileToConvert, '.pdf', undefined)
              .then(pdfBuffer => {
                fs.writeFileSync(absolutePdf, pdfBuffer);
                resolve();
              })
              .catch(err => {
                reject(err);
              });
          } catch (readErr) {
            reject(readErr);
          }
        }
      });
    };

    await convertDocxToPdf(tempDocxPath, filePath);

    // Append the static 2nd page PDF
    try {
      const generatedPdfBytes = fs.readFileSync(filePath);
      const generatedDoc = await PDFDocument.load(generatedPdfBytes);
      
      const additionalPdfPath = path.resolve(__dirname, '../../../public/Argus_Ambient_Premium_Quotation_2.pdf');
      if (fs.existsSync(additionalPdfPath)) {
        const additionalPdfBytes = fs.readFileSync(additionalPdfPath);
        const additionalDoc = await PDFDocument.load(additionalPdfBytes);
        
        const copiedPages = await generatedDoc.copyPages(additionalDoc, additionalDoc.getPageIndices());
        copiedPages.forEach((page) => generatedDoc.addPage(page));
        
        const mergedPdfBytes = await generatedDoc.save();
        fs.writeFileSync(filePath, mergedPdfBytes);
      } else {
        console.log("[Shipment PDF Merge] Additional PDF not found at", additionalPdfPath);
      }
    } catch (mergeErr) {
      console.error("[Shipment PDF Merge Error]:", mergeErr);
    }

    // Clean up temporary docx
    try {
      if (fs.existsSync(tempDocxPath)) {
        fs.unlinkSync(tempDocxPath);
      }
    } catch (e) {
      console.error("Failed to delete temporary docx:", e);
    }

    const pdfBytes = fs.readFileSync(filePath);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    // Email content setup
    let subject = `Quotation for Shipment - Ref: ${shipment.ref_no}`;
    if (shipment.pol && shipment.pod) {
      subject += ` (POL: ${shipment.pol} - POD: ${shipment.pod})`;
    }

    const salutation = shipment.customer_name ? `Dear ${shipment.customer_name},` : (shipment.dear_who ? `Dear ${shipment.dear_who},` : 'Dear Sir/Madam,');
    
    let emailBodyText = `Find the Quotation given.`;
    if (note && note.trim()) {
      emailBodyText += `\n\n${note.trim()}`;
    }
    
    if (upperShipmentMode === 'SEA' && warTime) {
      emailBodyText += `\n\nShipping line charges, port charges, and customs duties will be charged at actuals.\n` +
        `* War risk surcharge (WRS) and any emergency surcharges are excluded.\n` +
        `* Cargo may be rerouted by the carrier due to the ongoing regional crisis.\n` +
        `* The above rates are subject to the availability of space and equipment.\n` +
        `* Transit times are for indicative purposes only; the carrier will confirm the exact transit time at departure.\n` +
        `* In case of end-voyage or discharge at a contingency/alternate port, the consignee will be liable for all additional costs arising.`;
    }

    const messageText = `${salutation}\n\n${emailBodyText}\n\nBest regards,\n\nMuhammed Jabir\nPRICING AND OPERATION\nARGUS SHIPPING\n\n📞 +974 30512233\n\n📧 jabir@argusshipping.co\n\n🌐 www.argusshipping.co`;

    const htmlContent = emailBodyText.replace(/\n/g, '<br>');
    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${salutation}<br><br>
        ${htmlContent}<br><br>
        Best regards,<br><br>
        <b>Muhammed Jabir</b><br>
        PRICING AND OPERATION<br>
        ARGUS SHIPPING<br><br>
        📞 +974 30512233<br><br>
        📧 <a href="mailto:jabir@argusshipping.co">jabir@argusshipping.co</a><br><br>
        🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a>
      </body>
      </html>
    `;

    const emailPayload = {
      smtpUser,
      smtpPass,
      recipientEmail,
      subject,
      messageText,
      htmlBody,
      fileName,
      originalName,
      file_path: relativePath,
      sizeBytes: pdfBytes.length,
      finalProfit: totalRate
    };

    // If role is NOT admin, insert as Pending and return
    if (req.user.role !== 'admin') {
      await db.query(
        `INSERT INTO quotations (
          q_no, pol, pod, commodity, pod_pcode, pol_pcode, freight, zone, trans, total_rate,
          sales_p, operator, customer_name, transit_time, validity, created_by, file_path,
          mode, carrier_name, currency, approval_status, shipment_ref, email_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [
          q_no, shipment.pol || null, shipment.pod || null, shipment.commodity || null,
          podCode, polCode,
          freightNum, finalZone, transNum, totalRate,
          shipment.sales_p || shipment.refer_by || null, shipment.operator || null,
          shipment.customer_name || null, transit_time || null, validityDbDate,
          req.user.id, relativePath, upperShipmentMode, carrier_name || null, currency || 'QAR',
          'Pending', ref_no, JSON.stringify(emailPayload)
        ]
      );

      return res.json({
        success: true,
        pendingApproval: true,
        message: 'Quotation generated successfully. Pending Admin approval to send email.'
      });
    }

    // Admin flow: Send immediately and save as Approved
    // Save to quotations table
    await db.query(
      `INSERT INTO quotations (
        q_no, pol, pod, commodity, pod_pcode, pol_pcode, freight, zone, trans, total_rate,
        sales_p, operator, customer_name, transit_time, validity, created_by, file_path,
        mode, carrier_name, currency, approval_status, shipment_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        q_no, shipment.pol || null, shipment.pod || null, shipment.commodity || null,
        podCode, polCode,
        freightNum, finalZone, transNum, totalRate,
        shipment.sales_p || shipment.refer_by || null, shipment.operator || null,
        shipment.customer_name || null, transit_time || null, validityDbDate,
        req.user.id, relativePath, upperShipmentMode, carrier_name || null, currency || 'QAR',
        'Approved', ref_no
      ]
    );

    // Clean up old files
    try {
      const oldQuots = await query(req, 
        `SELECT id, file_path FROM files 
         WHERE shipment_ref_no = $1 AND original_name LIKE 'Quotation-%.pdf'`,
        [ref_no]
      );
      for (const oldFile of oldQuots.rows) {
        const oldAbsPath = path.resolve(process.cwd(), oldFile.file_path);
        if (fs.existsSync(oldAbsPath)) {
          fs.unlinkSync(oldAbsPath);
        }
        await query(req, 'DELETE FROM files WHERE id = $1', [oldFile.id]);
      }
    } catch (err) {
      console.error('[Quotation Cleanup] Failed to clean up old quotation files:', err);
    }

    // Save to files table
    await query(req, 
      `INSERT INTO files (shipment_ref_no, filename, original_name, file_path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ref_no, fileName, originalName, relativePath, 'application/pdf', pdfBytes.length]
    );

    // Setup Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4
    });

    const mailOptions = {
      from: `ARGUS SHIPPING <${smtpUser}>`,
      to: recipientEmail,
      subject: subject,
      text: messageText,
      html: htmlBody,
      attachments: [
        {
          filename: originalName,
          content: pdfBytes,
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    // Save to shipment_replies DB
    const insertRes = await query(req, 
      `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ref_no, smtpUser, subject, messageText]
    );

    // Update shipment last_follow_up, cost and profit
    const updatedShipment = await query(req, 
      `UPDATE shipments SET last_follow_up = NOW(), cost = 0, profit = $1 WHERE ref_no = $2 RETURNING last_follow_up, cost, profit`,
      [totalRate, ref_no]
    );

    // Sync to customer sandbox
    await syncShipmentToCustomer({
      ...shipment,
      last_follow_up: updatedShipment.rows[0].last_follow_up,
      cost: 0,
      profit: totalRate
    });

    res.json({
      success: true,
      data: { ...insertRes.rows[0], is_outgoing: true },
      last_follow_up: updatedShipment.rows[0].last_follow_up,
      cost: updatedShipment.rows[0].cost,
      profit: updatedShipment.rows[0].profit,
      message: 'Quotation sent successfully.'
    });
  } catch (err) {
    if (typeof tempDocxPath !== 'undefined' && fs.existsSync(tempDocxPath)) {
      try {
        fs.unlinkSync(tempDocxPath);
      } catch (e) {
        console.error("Failed to delete temporary docx in catch:", e);
      }
    }
    next(err);
  }
};

const getChatMessages = async (req, res, next) => {
  try {
    const { cust_req_no } = req.params;
    const username = req.user.username;
    
    // Mark messages sent by others as read
    await db.query(
      `UPDATE customer_operator_chats 
       SET is_read = true 
       WHERE cust_req_no = $1 AND LOWER(sender_username) != LOWER($2)`,
      [cust_req_no, username]
    );

    const result = await db.query(
      `SELECT * FROM customer_operator_chats 
       WHERE cust_req_no = $1 
       ORDER BY created_at ASC`,
      [cust_req_no]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const sendChatMessage = async (req, res, next) => {
  try {
    const { cust_req_no } = req.params;
    const { message } = req.body;
    const sender = req.user.username;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const result = await db.query(
      `INSERT INTO customer_operator_chats (cust_req_no, sender_username, message) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [cust_req_no, sender, message]
    );

    if (global.io) {
      global.io.to(`room_${cust_req_no}`).emit('newMessage', result.rows[0]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/shipments/replies/mark-all-read
//  Marks all unread email replies as read for the logged-in user/operator.
// ─────────────────────────────────────────────────────────────
const markAllRepliesAsRead = async (req, res, next) => {
  try {
    const role = req.user.role;
    const username = req.user.username;
    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    
    const myEmail = process.env.SMTP_USER || '';

    if (role === 'admin' || role === 'sales') {
      // Mark standard replies as read
      await db.query(
        `UPDATE shipment_replies SET is_read = true WHERE is_read = false AND LOWER(from_email) != LOWER($1)`,
        [myEmail]
      );
      
      // If admin, we also mark all operator replies as read
      if (role === 'admin') {
        const { getOperatorSuffixes } = require('../config/dbHelper');
        const suffixes = await getOperatorSuffixes();
        for (const suffix of suffixes) {
          await db.query(
            `UPDATE shipment_replies_${suffix} SET is_read = true WHERE is_read = false AND LOWER(from_email) != LOWER($1)`,
            [myEmail]
          );
        }
      }
    } else if (role === 'operator') {
      // Mark operator replies as read
      await db.query(
        `UPDATE shipment_replies_${cleanUsername} SET is_read = true WHERE is_read = false AND LOWER(from_email) != LOWER($1)`,
        [myEmail]
      );
    }

    res.json({ success: true, message: 'All replies marked as read.' });
  } catch (err) {
    next(err);
  }
};

const getFollowUpOverdue = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'customer') {
      return res.json({ success: true, data: [] });
    }

    const result = await query(req,
      `SELECT s.ref_no, s.cust_req_no, s.customer_name, s.status, s.last_follow_up, s.created_at, s.pol, s.pod, s.commodity
       FROM shipments s
       WHERE s.status IN ('Pending', 'Customer Review', 'Quoted', 'Cancelled')
         AND (s.last_follow_up < NOW() - INTERVAL '15 days' OR (s.last_follow_up IS NULL AND s.created_at < NOW() - INTERVAL '15 days'))
       ORDER BY COALESCE(s.last_follow_up, s.created_at) ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const snoozeFollowUp = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    
    // We update last_follow_up to 14 days ago, so it reappears tomorrow (after 1 day)
    const result = await query(req,
      `UPDATE shipments 
       SET last_follow_up = NOW() - INTERVAL '14 days' 
       WHERE ref_no = $1 
       RETURNING ref_no, last_follow_up`,
      [ref_no]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    res.json({ success: true, message: `Shipment ${ref_no} follow-up snoozed until tomorrow.`, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllShipments,
  getShipmentByRef,
  createShipment,
  updateShipment,
  updateStatus,
  updateTracking,
  deleteShipment,
  getReplies,
  sendReply,
  sendFollowUp,
  sendQuotation,
  getChatMessages,
  sendChatMessage,
  markAllRepliesAsRead,
  getFollowUpOverdue,
  snoozeFollowUp,
};
