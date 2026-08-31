const db = require('../config/db');
const { query } = require('../config/dbHelper');
const nodemailer = require('nodemailer');
const { decrypt } = require('../utils/crypto');
const fs = require('fs');
const path = require('path');

const calculateCbm = (dimensionStr) => {
  if (!dimensionStr) return 0;
  const cbmMatch = dimensionStr.match(/([\d.]+)\s*CBM/i);
  if (cbmMatch) {
    return parseFloat(cbmMatch[1]) || 0;
  }
  const dimMatch = dimensionStr.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\s*(cm|m)?(?:\s*\(Qty:\s*(\d+)\))?/i);
  if (dimMatch) {
    const l = parseFloat(dimMatch[1]) || 0;
    const w = parseFloat(dimMatch[2]) || 0;
    const h = parseFloat(dimMatch[3]) || 0;
    const unit = (dimMatch[4] || 'cm').toLowerCase();
    const qty = parseInt(dimMatch[5] || '1', 10) || 1;
    if (unit === 'm') {
      return l * w * h * qty;
    } else {
      return (l * w * h * qty) / 1000000;
    }
  }
  return 0;
};

const { generateEnquiryRefNo, generateBulkRfqRefNos } = require('../utils/refGenerator');

// Helper to generate the customer's next request number: ARG-ddmmyyn
const generateCustomerRefNo = async () => {
  return await generateEnquiryRefNo();
};

// Helper to generate sequential operator RFQ reference numbers: ARG-ddmmyyn-x
const getNextOperatorRefNos = async (enquiryRef, count) => {
  const { rfqRefs } = await generateBulkRfqRefNos(enquiryRef, count);
  return rfqRefs;
};

// POST /api/rfq/customer-generate
const generateCustomerRfq = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only Customers can perform this action.' });
    }

    const {
      pol, pol_country, pod, commodity, term, dimension,
      container, mode, weight, pickup_address, delivery_address,
      note, operator
    } = req.body;

    // 1. Mandatory Validations
    if (!pol_country || !pol || !pod || !commodity || !term || !mode) {
      return res.status(400).json({ success: false, message: 'POL Country, POL, POD, Commodity, Term, and Mode are required fields.' });
    }

    const isContainerEmpty = !container || !container.trim();
    const isDimensionEmpty = !dimension || !dimension.trim();
    const isWeightEmpty = !weight || !weight.toString().trim();

    if (isContainerEmpty) {
      if (isDimensionEmpty) {
        return res.status(400).json({ success: false, message: 'Dimension is required when Container is empty.' });
      }
      if (isWeightEmpty) {
        return res.status(400).json({ success: false, message: 'Weight is required when Container is empty.' });
      }
    }
    if (isDimensionEmpty && isContainerEmpty) {
      return res.status(400).json({ success: false, message: 'Container is required when Dimension is empty.' });
    }

    if (term === 'EXW' && (!pickup_address || !pickup_address.trim())) {
      return res.status(400).json({ success: false, message: 'Pick-up Address is required for EXW term.' });
    }

    const cleanUsername = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

    let assignedOperator = null;

    if (operator && operator.trim()) {
      const opMatch = await db.query(
        `SELECT id, username, email_address, email_password FROM users 
         WHERE LOWER(username) = LOWER($1) AND (role = 'operator' OR role = 'admin') AND (is_deleted IS NOT TRUE)`,
        [operator.trim()]
      );
      if (opMatch.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Operator "${operator}" not found in the system. Please check the spelling.` 
        });
      }
      assignedOperator = opMatch.rows[0].username;
      assignedOperatorUser = opMatch.rows[0];
    } else {
      // 2. Round-Robin Operator Assignment
      const opRes = await db.query(
        `SELECT id, username, email_address, email_password FROM users 
         WHERE role = 'operator' 
           AND (is_deleted IS NOT TRUE)
           AND email_address IS NOT NULL AND email_address != '' 
           AND email_password IS NOT NULL AND email_password != '' 
         ORDER BY id ASC`
      );

      if (opRes.rows.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No operators with configured email credentials found. Please contact the administrator.'
        });
      }

      const lastOpRes = await db.query("SELECT value FROM app_settings WHERE `key` = 'last_assigned_operator_id'");
      let lastOpId = lastOpRes.rows[0]?.value ? parseInt(lastOpRes.rows[0].value, 10) : 0;

      let selectedOp = opRes.rows[0];
      if (lastOpId) {
        const lastIndex = opRes.rows.findIndex(op => op.id === lastOpId);
        if (lastIndex !== -1 && lastIndex + 1 < opRes.rows.length) {
          selectedOp = opRes.rows[lastIndex + 1];
        }
      }

      // Update the pointer
      await db.query(
        "INSERT INTO app_settings (`key`, value) VALUES ('last_assigned_operator_id', $1) ON CONFLICT (`key`) DO UPDATE SET value = EXCLUDED.value",
        [selectedOp.id.toString()]
      );

      assignedOperator = selectedOp.username;
    }

    // 3. Resolve Request Number: ARG-ddmmyyn
    const customerId = req.user.customer_id;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'User does not have a unique Customer ID associated.' });
    }
    const ref_no = await generateCustomerRefNo();

    // 4. Resolve Recipients from Contacts & Compulsory Emails
    const contactsRes = await db.query(
      `SELECT email, dear_who FROM contacts 
       WHERE LOWER(mode) = LOWER($1) 
         AND LOWER(country) = LOWER($2)`,
      [mode, pol_country]
    );

    const opUserRes = await db.query(
      "SELECT country FROM users WHERE LOWER(username) = LOWER($1)",
      [assignedOperator]
    );
    const operatorCountry = (opUserRes.rows[0]?.country || '').trim().toLowerCase();
    const customerCountry = (req.user?.country || '').trim().toLowerCase();
    const polCountryClean = (pol_country || '').trim().toLowerCase();

    const targetCountry = operatorCountry || customerCountry || polCountryClean;

    let compulsoryRes = { rows: [] };
    if (targetCountry) {
      compulsoryRes = await db.query(
        `SELECT email, dear_who FROM compulsory_emails 
         WHERE is_active = true 
           AND LOWER(mode) = LOWER($1)
           AND LOWER(TRIM(country)) = LOWER($2)`,
        [mode, targetCountry]
      );
    }

    const recipientsMap = new Map();
    contactsRes.rows.forEach(r => {
      if (r.email) recipientsMap.set(r.email.toLowerCase().trim(), r.dear_who || 'Sir/Madam');
    });
    compulsoryRes.rows.forEach(r => {
      if (r.email) recipientsMap.set(r.email.toLowerCase().trim(), r.dear_who || 'Sir/Madam');
    });

    const resolvedRecipients = Array.from(recipientsMap.entries()).map(([email, dear_who]) => ({
      email,
      dear_who
    }));

    if (resolvedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No shipping agents found in the system for mode "${mode}" and country "${pol_country}".`
      });
    }

    const targetPol = `${pol_country}, ${pol}`;
    const customerName = req.user.name || req.user.username;
    const customerEmail = req.user.email_address;

    // 5. Create shipment records in both Customer's and Operator's sandboxes
    const { getUserSuffix, getUserSuffixFromReq } = require('../config/dbHelper');
    const custSuffix = getUserSuffixFromReq(req);
    const cleanOperator = getUserSuffix(assignedOperator);
    const opTableName = cleanOperator === 'admin' ? 'shipments' : `shipments_${cleanOperator}`;

    // Customer Sandbox insertion: Insert ONE row representing the request
    await db.query(
      `INSERT INTO shipments_${custSuffix} (
        ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
        container, mode, weight, pickup_address, delivery_address,
        dear_who, email, status, note, customer_id, customer_name, customer_email, operator
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (ref_no) DO NOTHING`,
      [
        ref_no, ref_no, operator || null, targetPol, pod, commodity, term, dimension || null,
        container || null, mode, weight || null, pickup_address || null, delivery_address || null,
        'Multiple Agents', 'Broadcast', 'Awaiting Approval', note || null, customerId, customerName, customerEmail, assignedOperator
      ]
    );

    // Operator Sandbox insertion: Insert multiple rows (one for each recipient: ARG-ddmmyyn-1, ARG-ddmmyyn-2, ...)
    const opRefs = await getNextOperatorRefNos(ref_no, resolvedRecipients.length);

    for (let i = 0; i < resolvedRecipients.length; i++) {
      const recipient = resolvedRecipients[i];
      const opRef = opRefs[i];

      await db.query(
        `INSERT INTO ${opTableName} (
          ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
          container, mode, weight, pickup_address, delivery_address,
          dear_who, email, status, note, customer_id, customer_name, customer_email, operator
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (ref_no) DO NOTHING`,
        [
          opRef, ref_no, operator || null, targetPol, pod, commodity, term, dimension || null,
          container || null, mode, weight || null, pickup_address || null, delivery_address || null,
          recipient.dear_who, recipient.email, 'Awaiting Approval', note || null, customerId, customerName, customerEmail, assignedOperator
        ]
      );
    }

    // ── Notify assigned operator and admins via Socket.IO ─────────
    try {
      const opSocketRoom = `user_${assignedOperator.toLowerCase()}`;
      const payload = {
        type: 'customer',
        ref_no: ref_no,
        cust_req_no: ref_no,
        pol: targetPol,
        pod: pod,
        commodity: commodity,
        mode: mode,
        container: container || null,
        dimension: dimension || null,
        customer_name: customerName,
        refer_by: req.user.username,
        submitter_username: req.user.username,
        submitter_role: 'customer',
        recipients_count: resolvedRecipients.length,
      };

      if (global.io) {
        if (opSocketRoom) {
          global.io.to(opSocketRoom).emit('rfq_pending_approval', payload);
        }
        console.log(`[RFQ Approval] Customer RFQ socket emitted rfq_pending_approval to ${opSocketRoom}`);
      }
    } catch (socketErr) {
      console.error('[RFQ Approval] Customer RFQ socket emit failed:', socketErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'RFQ created and assigned successfully.',
      data: {
        ref_no,
        operator: assignedOperator,
        recipients_count: resolvedRecipients.length
      }
    });

  } catch (err) {
    next(err);
  }
};

// POST /api/rfq/customer-send-email/:ref_no
const sendCustomerRfqEmail = async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only Customers can perform this action.' });
    }

    const { ref_no } = req.params;
    const cleanUsername = req.user.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

    // 1. Fetch Shipment from Customer Sandbox
    const shipRes = await db.query(
      `SELECT * FROM shipments_${cleanUsername} WHERE ref_no = $1`,
      [ref_no]
    );

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    const customerShipment = shipRes.rows[0];

    // Block email if RFQ is awaiting operator approval
    if (customerShipment.status === 'Awaiting Approval') {
      return res.status(403).json({
        success: false,
        message: 'This RFQ is awaiting operator approval. Email will be dispatched automatically upon approval.'
      });
    }

    // 2. Fetch all attached files
    let attachedFiles = [];
    try {
      const fileRes = await db.query(
        `SELECT * FROM files_${cleanUsername} WHERE shipment_ref_no = $1 ORDER BY uploaded_at ASC`,
        [ref_no]
      );
      attachedFiles = fileRes.rows || [];
    } catch (e) {
      const fileRes = await db.query(
        `SELECT * FROM files WHERE shipment_ref_no = $1 ORDER BY uploaded_at ASC`,
        [ref_no]
      ).catch(() => ({ rows: [] }));
      attachedFiles = fileRes.rows || [];
    }

    // 3. Retrieve Assigned Operator email credentials
    const operatorName = customerShipment.operator || '';
    const userRes = await db.query(
      "SELECT id, username, email_address, email_password FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1) OR LOWER(name) = LOWER($1) ORDER BY role = 'operator' DESC, id ASC LIMIT 1",
      [operatorName]
    );

    const actualOpUsername = userRes.rows.length > 0 ? userRes.rows[0].username : operatorName;
    const cleanOperator = actualOpUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const opTableName = (!cleanOperator || cleanOperator === 'admin') ? 'shipments' : `shipments_${cleanOperator}`;

    const { ensureUserTables } = require('../config/dbHelper');
    await ensureUserTables(cleanOperator);

    let opShipmentsRes = await db.query(
      `SELECT * FROM ${opTableName} WHERE cust_req_no = $1 OR ref_no = $1`,
      [ref_no]
    ).catch(() => ({ rows: [] }));

    if (opShipmentsRes.rows.length === 0) {
      opShipmentsRes = await db.query(
        `SELECT * FROM shipments WHERE cust_req_no = $1 OR ref_no = $1`,
        [ref_no]
      ).catch(() => ({ rows: [] }));
    }

    if (opShipmentsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No recipient shipments found in operator sandbox.' });
    }

    const shipments = opShipmentsRes.rows;

    let smtpUser = userRes.rows.length > 0 ? userRes.rows[0].email_address : null;
    let smtpPass = userRes.rows.length > 0 ? decrypt(userRes.rows[0].email_password) : null;
    let operatorUserId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

    // Fall back to admin user SMTP credentials if operator password not set
    if (!smtpUser || !smtpPass) {
      try {
        const adminRes = await db.query(
          "SELECT id, email_address, email_password FROM users WHERE role = 'admin' AND email_address IS NOT NULL AND email_address != '' AND email_password IS NOT NULL AND email_password != '' ORDER BY id ASC LIMIT 1"
        );
        if (adminRes.rows.length > 0) {
          smtpUser = adminRes.rows[0].email_address;
          smtpPass = decrypt(adminRes.rows[0].email_password);
          if (!operatorUserId) operatorUserId = adminRes.rows[0].id;
        }
      } catch (adminErr) {
        console.error('Error fetching admin fallback credentials:', adminErr.message);
      }
    }

    // Fallback to global env variables if not set in DB
    if (!smtpUser) {
      smtpUser = process.env.SMTP_USER || null;
    }
    if (!smtpPass) {
      smtpPass = process.env.SMTP_PASS || null;
    }

    // Sanitize any accidental surrounding quotes
    if (smtpUser && typeof smtpUser === 'string') {
      smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    }
    if (smtpPass && typeof smtpPass === 'string') {
      smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');
    }

    if (!smtpUser || !smtpPass) {
      console.warn(`[customer-send-email] SMTP credentials for assigned operator "${operatorName}" or Admin are not configured. Skipping email dispatch.`);
      return res.json({
        success: true,
        sent: false,
        message: 'RFQ created successfully, but operator SMTP credentials are not configured so email notification was skipped.'
      });
    }

    const { getSignatureForUser } = require('../utils/signature');
    const signature = await getSignatureForUser(operatorUserId);

    // 4. Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4
    });

    // 5. Send to each recipient safely
    let sentCount = 0;
    for (const shipment of shipments) {
      if (!shipment.email) continue;
      try {
        let subject = `RFQ FROM ${shipment.pol || ''} TO ${shipment.pod || ''}`;
        if (shipment.mode) subject += `/${shipment.mode}`;
        if (shipment.container) subject += `/${shipment.container}`;
        subject += `/${shipment.ref_no}/CID : ${shipment.customer_id || ''}`;

        // Format Pick-up / Delivery address
        const formatAddress = (address) => {
          if (!address) return '';
          let result = '';
          let lineLen = 0;
          for (let i = 0; i < address.length; i++) {
            result += address[i];
            lineLen++;
            if (lineLen >= 40 && address[i] === ',') {
              result += '<br>';
              lineLen = 0;
              while (i + 1 < address.length && address[i + 1] === ' ') {
                i++;
              }
            }
          }
          return result;
        };

        const cbmVal = calculateCbm(shipment.dimension);
        const volWeight = cbmVal * 167;
        let actWeight = 0;
        if (shipment.weight) {
          const totalMatch = shipment.weight.match(/total\s*(?:KG|LB|Pound)?\s*=\s*([\d.]+)/i);
          if (totalMatch) {
            actWeight = parseFloat(totalMatch[1]) || 0;
          } else {
            actWeight = parseFloat(shipment.weight) || 0;
          }
          if (/LB|Pound/i.test(shipment.weight)) {
            actWeight = actWeight * 0.45359237;
          }
        }
        const chgWeight = Math.max(actWeight, volWeight);

        const labels = [
          ['POL', shipment.pol],
          ['POD', shipment.pod],
          ['COMMODITY', shipment.commodity],
          ['TERM', shipment.term],
          ['DIMENSION', shipment.dimension],
          ['CONTAINER', shipment.container],
          ['MODE', shipment.mode],
          ['TOTAL WEIGHT', shipment.weight ? (String(shipment.weight).toLowerCase().includes('kg') ? shipment.weight : `${shipment.weight} Kg`) : null],
          ['CHARGEABLE WEIGHT', chgWeight ? `${chgWeight.toFixed(2)} Kg` : null],
          ['PICK-UP ADDRESS', shipment.pickup_address],
          ['DELIVERY ADDRESS', shipment.delivery_address],
          ['NOTE', shipment.note]
        ];

        let htmlBody = `
          <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            Dear ${shipment.dear_who || 'Sir/Madam'},<br><br>
            Kindly provide a Quotation for the following Shipment.<br><br>
        `;

        labels.forEach(([label, value]) => {
          if (value && String(value).trim() !== '') {
            let valStr = String(value);
            if (label === 'PICK-UP ADDRESS' || label === 'DELIVERY ADDRESS') {
              valStr = formatAddress(valStr);
            }
            htmlBody += `<b>${label}:</b> ${valStr}<br>`;
          }
        });

        htmlBody += `
          <br><br>
          ${signature.html}
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"Argus Shipping " <${smtpUser}>`,
          to: shipment.email,
          subject: subject,
          html: htmlBody
        };

        if (attachedFiles.length > 0) {
          const attachments = [];
          attachedFiles.forEach(file => {
            const absPath = path.resolve(process.cwd(), file.file_path);
            if (fs.existsSync(absPath)) {
              attachments.push({
                filename: file.original_name,
                path: absPath
              });
            }
          });
          if (attachments.length > 0) {
            mailOptions.attachments = attachments;
          }
        }

        await transporter.sendMail(mailOptions);
        sentCount++;
      } catch (mailErr) {
        console.error(`[customer-send-email] Failed to send email to ${shipment.email}:`, mailErr.message);
      }
    }

    res.json({ success: true, sentCount, message: 'Emails dispatched successfully.' });

  } catch (err) {
    console.error('[customer-send-email] General error:', err);
    res.json({ success: true, sent: false, message: 'RFQ created successfully, but sending email notification encountered an issue.' });
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/rfq/customer-approve/:ref_no
//  Operator approves a customer RFQ (enquiry ref = ref_no)
// ─────────────────────────────────────────────────────────────
const approveCustomerRfq = async (req, res, next) => {
  try {
    if (req.user.role !== 'operator' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only operators and admins can approve RFQs.' });
    }

    const { ref_no } = req.params; // This is the cust_req_no / enquiry ref
    const { getAllSuffixes } = require('../config/dbHelper');

    // 1. Get all operator sub-rows for this enquiry (search main shipments table, sandbox, and all physical tables)
    let opShipmentsRes = await db.query(
      `SELECT * FROM shipments WHERE cust_req_no = $1 OR ref_no = $1`,
      [ref_no]
    ).catch(() => ({ rows: [] }));

    if (opShipmentsRes.rows.length === 0) {
      const suffixes = await getAllSuffixes();
      for (const sfx of suffixes) {
        const check = await db.query(`SELECT * FROM shipments_${sfx} WHERE cust_req_no = $1 OR ref_no = $1`, [ref_no]).catch(() => ({ rows: [] }));
        if (check.rows.length > 0) {
          opShipmentsRes = check;
          break;
        }
      }
    }

    if (opShipmentsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No RFQ shipments found for this enquiry.' });
    }

    const shipments = opShipmentsRes.rows;
    const firstShipment = shipments[0];
    const customerId = firstShipment.customer_id;
    const submitterUsername = (firstShipment.refer_by || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const actualCustReqNo = firstShipment.cust_req_no || ref_no;

    // Check if already approved or rejected
    if (firstShipment.status !== 'Awaiting Approval') {
      return res.status(400).json({
        success: false,
        message: `This Customer RFQ has already been processed (current status: ${firstShipment.status}).`
      });
    }

    // 2. Update status to 'Pending' on ALL operator sub-rows and all tables
    await db.query(
      `UPDATE shipments SET status = 'Pending', updated_at = NOW() WHERE cust_req_no = $1 OR ref_no = $1 OR cust_req_no = $2 OR ref_no = $2`,
      [ref_no, actualCustReqNo]
    ).catch(() => {});

    const suffixes = await getAllSuffixes();
    for (const sfx of suffixes) {
      await db.query(
        `UPDATE shipments_${sfx} SET status = 'Pending', updated_at = NOW() WHERE cust_req_no = $1 OR ref_no = $1 OR cust_req_no = $2 OR ref_no = $2`,
        [ref_no, actualCustReqNo]
      ).catch(() => {});
    }

    // 3. Update customer sandbox row
    if (customerId) {
      try {
        const custUserRes = await db.query(
          `SELECT id, username FROM users WHERE customer_id = $1 AND role = 'customer' AND (is_deleted IS NOT TRUE) LIMIT 1`,
          [customerId]
        );
        if (custUserRes.rows.length > 0) {
          const { getUserSuffix } = require('../config/dbHelper');
          const custSuffix = getUserSuffix(custUserRes.rows[0]);
          await db.query(
            `UPDATE shipments_${custSuffix} SET status = 'Pending', updated_at = NOW() WHERE ref_no = $1 OR cust_req_no = $1 OR ref_no = $2 OR cust_req_no = $2`,
            [ref_no, actualCustReqNo]
          ).catch(() => {});
        }
      } catch (syncErr) {
        console.error('[approveCustomerRfq] Sync to customer failed:', syncErr.message);
      }
    }

    // 4. Send the emails using existing sendCustomerRfqEmail logic
    const fakeReq = {
      ...req,
      params: { ref_no: actualCustReqNo },
      body: {}
    };
    await new Promise((resolve) => {
      const fakeRes = {
        status: (code) => ({ json: (d) => resolve() }),
        json: (d) => resolve()
      };
      sendCustomerRfqEmail(fakeReq, fakeRes, (err) => resolve());
    });

    // 5. Notify customer and broadcast dismissal to all operators & admins
    try {
      if (global.io) {
        if (submitterUsername) {
          global.io.to(`user_${submitterUsername}`).emit('rfq_approval_result', {
            ref_no: actualCustReqNo,
            outcome: 'accepted',
            message: `Your quote request ${actualCustReqNo} was approved. Agents have been notified.`
          });
        }
        // Broadcast to all operators and admins so modal immediately dismisses everywhere
        global.io.emit('rfq_approval_processed', {
          ref_no: actualCustReqNo,
          cust_req_no: actualCustReqNo,
          outcome: 'accepted',
          processed_by: req.user.username
        });
      }
    } catch (e) {}

    res.json({ success: true, ref_no: actualCustReqNo, status: 'Pending', message: 'Customer RFQ approved and emails dispatched.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/rfq/customer-reject/:ref_no
//  Operator rejects a customer RFQ (enquiry ref = ref_no)
// ─────────────────────────────────────────────────────────────
const rejectCustomerRfq = async (req, res, next) => {
  try {
    if (req.user.role !== 'operator' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only operators and admins can reject RFQs.' });
    }

    const { ref_no } = req.params;
    const { getAllSuffixes } = require('../config/dbHelper');

    // 1. Get operator sub-rows to find customer info
    let opShipmentsRes = await db.query(
      `SELECT customer_id, refer_by, cust_req_no, ref_no, status FROM shipments WHERE cust_req_no = $1 OR ref_no = $1 LIMIT 1`,
      [ref_no]
    ).catch(() => ({ rows: [] }));

    if (opShipmentsRes.rows.length === 0) {
      const suffixes = await getAllSuffixes();
      for (const sfx of suffixes) {
        const check = await db.query(`SELECT customer_id, refer_by, cust_req_no, ref_no, status FROM shipments_${sfx} WHERE cust_req_no = $1 OR ref_no = $1 LIMIT 1`, [ref_no]).catch(() => ({ rows: [] }));
        if (check.rows.length > 0) {
          opShipmentsRes = check;
          break;
        }
      }
    }

    if (opShipmentsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No RFQ shipments found for this enquiry.' });
    }

    const firstShipment = opShipmentsRes.rows[0];
    const customerId = firstShipment?.customer_id;
    const submitterUsername = (firstShipment?.refer_by || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const actualCustReqNo = firstShipment?.cust_req_no || ref_no;

    // Check if already approved or rejected
    if (firstShipment.status !== 'Awaiting Approval') {
      return res.status(400).json({
        success: false,
        message: `This Customer RFQ has already been processed (current status: ${firstShipment.status}).`
      });
    }

    // 2. Update status to 'Cancelled' on all tables
    await db.query(
      `UPDATE shipments SET status = 'Cancelled', updated_at = NOW() WHERE cust_req_no = $1 OR ref_no = $1 OR cust_req_no = $2 OR ref_no = $2`,
      [ref_no, actualCustReqNo]
    ).catch(() => {});

    const suffixes = await getAllSuffixes();
    for (const sfx of suffixes) {
      await db.query(
        `UPDATE shipments_${sfx} SET status = 'Cancelled', updated_at = NOW() WHERE cust_req_no = $1 OR ref_no = $1 OR cust_req_no = $2 OR ref_no = $2`,
        [ref_no, actualCustReqNo]
      ).catch(() => {});
    }

    // 3. Update customer sandbox
    if (customerId) {
      try {
        const custUserRes = await db.query(
          `SELECT id, username FROM users WHERE customer_id = $1 AND role = 'customer' AND (is_deleted IS NOT TRUE) LIMIT 1`,
          [customerId]
        );
        if (custUserRes.rows.length > 0) {
          const { getUserSuffix } = require('../config/dbHelper');
          const custSuffix = getUserSuffix(custUserRes.rows[0]);
          await db.query(
            `UPDATE shipments_${custSuffix} SET status = 'Cancelled', updated_at = NOW() WHERE ref_no = $1 OR cust_req_no = $1 OR ref_no = $2 OR cust_req_no = $2`,
            [ref_no, actualCustReqNo]
          ).catch(() => {});
        }
      } catch (syncErr) {
        console.error('[rejectCustomerRfq] Sync to customer failed:', syncErr.message);
      }
    }

    // 4. Notify customer and broadcast dismissal to all operators & admins
    try {
      if (global.io) {
        if (submitterUsername) {
          global.io.to(`user_${submitterUsername}`).emit('rfq_approval_result', {
            ref_no: actualCustReqNo,
            outcome: 'rejected',
            message: `Your quote request ${actualCustReqNo} was not accepted by the operator.`
          });
        }
        // Broadcast to all operators and admins so modal immediately dismisses everywhere
        global.io.emit('rfq_approval_processed', {
          ref_no: actualCustReqNo,
          cust_req_no: actualCustReqNo,
          outcome: 'rejected',
          processed_by: req.user.username
        });
      }
    } catch (e) {}

    res.json({ success: true, ref_no: actualCustReqNo, status: 'Cancelled', message: 'Customer RFQ rejected.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateCustomerRfq,
  sendCustomerRfqEmail,
  approveCustomerRfq,
  rejectCustomerRfq,
};
