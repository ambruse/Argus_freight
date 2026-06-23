const db = require('../config/db');
const { query } = require('../config/dbHelper');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Helper to generate the customer's next request number
const generateCustomerRefNo = async (req, customerId, cleanUsername) => {
  // Query customer's own sandbox shipments table
  const result = await db.query(
    `SELECT ref_no FROM shipments_${cleanUsername} 
     WHERE ref_no LIKE $1 
     ORDER BY CAST(SUBSTRING(ref_no FROM POSITION('-' IN ref_no) + 1) AS INTEGER) DESC 
     LIMIT 1`,
    [`${customerId}-%`]
  );
  
  if (result.rows.length === 0) {
    return `${customerId}-01`;
  }
  
  const lastRef = result.rows[0].ref_no; // e.g. "12345-02"
  const parts = lastRef.split('-');
  const lastNum = parseInt(parts[parts.length - 1], 10);
  const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
  const paddedNum = nextNum.toString().padStart(2, '0');
  return `${customerId}-${paddedNum}`;
};

// Helper to generate sequential operator reference numbers (e.g. ARG-1001)
const getNextOperatorRefNos = async (cleanOperator, count) => {
  const opTableName = cleanOperator === 'admin' ? 'shipments' : `shipments_${cleanOperator}`;
  const result = await db.query(
    `SELECT ref_no FROM ${opTableName}
     WHERE ref_no ~ '^ARG-[0-9]+$'
     ORDER BY CAST(SUBSTRING(ref_no FROM 5) AS INTEGER) DESC
     LIMIT 1`
  );

  let startNum = 1001;
  if (result.rows.length > 0) {
    const last = result.rows[0].ref_no;
    const num = parseInt(last.split('-')[1], 10);
    if (!isNaN(num)) {
      startNum = num + 1;
    }
  }

  const refs = [];
  for (let i = 0; i < count; i++) {
    refs.push(`ARG-${startNum + i}`);
  }
  return refs;
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
      note, refer_by
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

    // 2. Round-Robin Operator Assignment
    const opRes = await db.query(
      `SELECT id, username, email_address, email_password FROM users 
       WHERE role = 'operator' 
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

    const lastOpRes = await db.query("SELECT value FROM app_settings WHERE key = 'last_assigned_operator_id'");
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
      "INSERT INTO app_settings (key, value) VALUES ('last_assigned_operator_id', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [selectedOp.id.toString()]
    );

    const assignedOperator = selectedOp.username;

    // 3. Resolve Request Number
    const customerId = req.user.customer_id;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'User does not have a unique Customer ID associated.' });
    }
    const ref_no = await generateCustomerRefNo(req, customerId, cleanUsername);

    // 4. Resolve Recipients from Contacts & Compulsory Emails
    const contactsRes = await db.query(
      `SELECT email, dear_who FROM contacts 
       WHERE LOWER(mode) = LOWER($1) 
         AND LOWER(country) = LOWER($2)`,
      [mode, pol_country]
    );

    const compulsoryRes = await db.query(
      `SELECT email, dear_who FROM compulsory_emails 
       WHERE is_active = true 
         AND LOWER(mode) = LOWER($1)`,
      [mode]
    );

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
    const cleanOperator = assignedOperator.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const opTableName = cleanOperator === 'admin' ? 'shipments' : `shipments_${cleanOperator}`;

    // Customer Sandbox insertion: Insert ONE row representing the request
    await db.query(
      `INSERT INTO shipments_${cleanUsername} (
        ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
        container, mode, weight, pickup_address, delivery_address,
        dear_who, email, status, note, customer_id, customer_name, customer_email, operator
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (ref_no) DO NOTHING`,
      [
        ref_no, ref_no, refer_by || null, targetPol, pod, commodity, term, dimension || null,
        container || null, mode, weight || null, pickup_address || null, delivery_address || null,
        'Multiple Agents', 'Broadcast', 'Pending', note || null, customerId, customerName, customerEmail, assignedOperator
      ]
    );

    // Operator Sandbox insertion: Insert multiple rows (one for each recipient)
    const opRefs = await getNextOperatorRefNos(cleanOperator, resolvedRecipients.length);

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
          opRef, ref_no, refer_by || null, targetPol, pod, commodity, term, dimension || null,
          container || null, mode, weight || null, pickup_address || null, delivery_address || null,
          recipient.dear_who, recipient.email, 'Pending', note || null, customerId, customerName, customerEmail, assignedOperator
        ]
      );
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

    // 2. Fetch all attached files
    const fileRes = await db.query(
      `SELECT * FROM files_${cleanUsername} WHERE shipment_ref_no = $1 ORDER BY uploaded_at ASC`,
      [ref_no]
    );
    const attachedFiles = fileRes.rows;

    // 3. Retrieve Assigned Operator email credentials
    const operatorName = customerShipment.operator;
    const cleanOperator = operatorName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    const opTableName = cleanOperator === 'admin' ? 'shipments' : `shipments_${cleanOperator}`;

    const opShipmentsRes = await db.query(
      `SELECT * FROM ${opTableName} WHERE cust_req_no = $1`,
      [ref_no]
    );

    if (opShipmentsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No recipient shipments found in operator sandbox.' });
    }

    const shipments = opShipmentsRes.rows;

    const userRes = await db.query(
      "SELECT email_address, email_password FROM users WHERE LOWER(username) = LOWER($1) ORDER BY role = 'operator' DESC, id ASC LIMIT 1",
      [operatorName]
    );

    let smtpUser = userRes.rows.length > 0 ? userRes.rows[0].email_address : null;
    let smtpPass = userRes.rows.length > 0 ? userRes.rows[0].email_password : null;

    // Fallback to global env variables if not set in DB
    if (!smtpUser) {
      smtpUser = process.env.SMTP_USER || null;
    }
    if (!smtpPass) {
      smtpPass = process.env.SMTP_PASS || null;
    }

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({
        success: false,
        message: 'SMTP credentials for the assigned operator are not configured.'
      });
    }

    // Sanitize any accidental surrounding quotes
    if (smtpUser) {
      smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    }
    if (smtpPass) {
      smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');
    }

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
      }
    });

    // 5. Send to each recipient
    for (const shipment of shipments) {
      if (!shipment.email) continue;

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

      const labels = [
        ['POL', shipment.pol],
        ['POD', shipment.pod],
        ['COMMODITY', shipment.commodity],
        ['TERM', shipment.term],
        ['DIMENSION', shipment.dimension],
        ['CONTAINER', shipment.container],
        ['MODE', shipment.mode],
        ['TOTAL WEIGHT', shipment.weight],
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
        <p>Best regards,</p>
        <p style="color:#3b78c8;">
        <b>Muhammed Jabir</b><br>
        PRICING AND OPERATION<br>
        ARGUS SHIPPING
        </p>
        <p>📞 +974 30512233</p>
        <p>📧 <a href="mailto:jabir@argusshipping.co">jabir@argusshipping.co</a></p>
        <p>🌐 <a href="https://www.argusshipping.co">www.argusshipping.co</a></p>
        <br>
        <p style="background-color:yellow;color:red;padding:8px;">
        Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
        </p>
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
    }

    res.json({ success: true, message: 'Emails dispatched successfully.' });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateCustomerRfq,
  sendCustomerRfqEmail
};
