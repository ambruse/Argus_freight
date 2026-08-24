// src/controllers/rfqController.js
// ─────────────────────────────────────────────────────────────
//  Handles generation of RFQ codes, database insertion with
//  collision retries, and sending emails via nodemailer.
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');
const { query, ensureUserTables } = require('../config/dbHelper');
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

const { generateEnquiryRefNo, generateRfqRefNo } = require('../utils/refGenerator');

// ─────────────────────────────────────────────────────────────
//  POST /api/rfq/generate
//  Generates unique RFQ Ref No (ARG-ddmmyyn-x), saves to DB with 'Pending' status.
// ─────────────────────────────────────────────────────────────
const generateRfq = async (req, res, next) => {
  try {
    const {
      refer_by, pol, pod, commodity, term, dimension,
      container, mode, weight, pickup_address, delivery_address,
      dear_who, email, note, customer_name, customer_email, operator,
      pol_country, cust_req_no
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
      // Check if exists
      const existing = await db.query('SELECT customer_id FROM customers WHERE name = $1', [cName]);
      if (existing.rows.length > 0) {
        finalCustomerId = existing.rows[0].customer_id;
      } else {
        // Generate new 5-digit ID
        let uniqueCidFound = false;
        let cAttempts = 0;
        while (!uniqueCidFound && cAttempts < 10) {
          const newCid = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit
          try {
            await db.query('INSERT INTO customers (customer_id, name) VALUES ($1, $2)', [newCid, cName]);
            finalCustomerId = newCid;
            uniqueCidFound = true;
          } catch (e) {
            if (e.code !== '23505') throw e; // if not unique violation, throw
            cAttempts++;
          }
        }
      }
    }
    // ── Resolve Operator Username (if sent by sales) ──────────
    let targetOpUser = null;
    if (req.user.role === 'sales' && operator) {
      const opCheck = await db.query(
        "SELECT id, username FROM users WHERE (LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1) OR LOWER(name) = LOWER($1)) AND (is_deleted IS NOT TRUE) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
        [operator]
      );
      if (opCheck.rows.length > 0) {
        targetOpUser = opCheck.rows[0];
      }
    }

    ref_no = req.body.ref_no;
    let finalCustReqNo = cust_req_no || null;

    while (!isLogged && attempts < maxAttempts) {
      if (!ref_no) {
        if (!finalCustReqNo) {
          finalCustReqNo = await generateEnquiryRefNo(); // ARG-ddmmyyn
        }
        ref_no = await generateRfqRefNo(finalCustReqNo); // ARG-ddmmyyn-x
      } else {
        if (!finalCustReqNo) {
          finalCustReqNo = ref_no.replace(/-\d+$/, '');
        }
      }

      try {
        const { getUserSuffix, getUserSuffixFromReq, ensureUserTables } = require('../config/dbHelper');
        const targetOpName = targetOpUser ? targetOpUser.username : (operator || req.user.username);
        const finalReferBy = (refer_by && String(refer_by).trim() !== '')
          ? String(refer_by).trim()
          : (req.user ? (req.user.name || req.user.username) : null);

        const result = await query(req,
          `INSERT INTO shipments (
            ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
            container, mode, weight, pickup_address, delivery_address,
            dear_who, email, status, note, customer_id, customer_name, customer_email, operator
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
          ) RETURNING ref_no, cust_req_no, refer_by, pol, pod, commodity, term, dimension,
                     container, mode, weight, pickup_address, delivery_address,
                     dear_who, email, status, note, customer_id, customer_name, customer_email, operator, created_at`,
          [
            ref_no, finalCustReqNo, finalReferBy, pol, pod, commodity, term, dimension,
            container, mode, weight || null, pickup_address, delivery_address,
            dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
            targetOpName
          ]
        );
        isLogged = true;
        shipmentData = result.rows[0];

        // ── Clone shipment to sales sandbox, operator sandbox & main shipments table ──────────
        const cleanOp = targetOpUser ? getUserSuffix(targetOpUser) : getUserSuffix(operator || req.user.username);
        const cleanUser = getUserSuffixFromReq(req);

        await ensureUserTables(cleanOp);
        await ensureUserTables(cleanUser);

        if (cleanOp && cleanOp !== 'admin') {
          await db.query(
            `INSERT INTO shipments_${cleanOp} (
              ref_no, refer_by, pol, pod, commodity, term, dimension,
              container, mode, weight, pickup_address, delivery_address,
              dear_who, email, status, note, customer_id, customer_name, customer_email, operator
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
             ON CONFLICT (ref_no) DO NOTHING`,
            [
              ref_no, finalReferBy, pol, pod, commodity, term, dimension,
              container, mode, weight || null, pickup_address, delivery_address,
              dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
              targetOpName
            ]
          );
        }

        if (cleanUser && cleanUser !== cleanOp && cleanUser !== 'admin') {
          await db.query(
            `INSERT INTO shipments_${cleanUser} (
              ref_no, refer_by, pol, pod, commodity, term, dimension,
              container, mode, weight, pickup_address, delivery_address,
              dear_who, email, status, note, customer_id, customer_name, customer_email, operator
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
             ON CONFLICT (ref_no) DO NOTHING`,
            [
              ref_no, finalReferBy, pol, pod, commodity, term, dimension,
              container, mode, weight || null, pickup_address, delivery_address,
              dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
              targetOpName
            ]
          );
        }

        // Also ensure main shipments table has a copy if query mapped to user sandbox
        await db.query(
          `INSERT INTO shipments (
            ref_no, refer_by, pol, pod, commodity, term, dimension,
            container, mode, weight, pickup_address, delivery_address,
            dear_who, email, status, note, customer_id, customer_name, customer_email, operator
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           ON CONFLICT (ref_no) DO NOTHING`,
          [
            ref_no, finalReferBy, pol, pod, commodity, term, dimension,
            container, mode, weight || null, pickup_address, delivery_address,
            dear_who, email, 'Pending', note, finalCustomerId, customer_name || null, customer_email || null,
            targetOpName
          ]
        );

        // ── Auto-save contact to Address Book ──────────
        if (email) {
          try {
            // 1. Check if email is in compulsory_emails
            const compEmailRes = await db.query(
              'SELECT id FROM compulsory_emails WHERE LOWER(email) = LOWER($1)',
              [email]
            );

            if (compEmailRes.rows.length === 0) {
              // Resolve country: use pol_country or parse from pol string if not provided (defensive check)
              let resolvedCountry = pol_country || '';
              if (!resolvedCountry && pol) {
                const match = pol.match(/,\s*([^,\(]+)\s*\([A-Z]{3,5}\)/);
                if (match) {
                  resolvedCountry = match[1].trim();
                }
              }

              // 2. Check if contact (email + POL_Country) already exists in contacts
              const existingContact = await db.query(`
                SELECT id FROM contacts 
                WHERE LOWER(email) = LOWER($1) 
                  AND (LOWER(country) = LOWER($2) OR (country IS NULL AND $2 = '') OR (country = '' AND $2 = ''))
              `, [email, resolvedCountry]);

              if (existingContact.rows.length === 0) {
                // 3. Insert new contact
                await db.query(`
                  INSERT INTO contacts (email, dear_who, pol, pod, mode, country)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  ON DUPLICATE KEY UPDATE
                    dear_who = VALUES(dear_who),
                    country = VALUES(country)
                `, [email, dear_who || null, pol || '', pod || '', mode || '', resolvedCountry || null]);
              }
            }
          } catch (contactErr) {
            console.error("Failed to auto-save contact:", contactErr);
            // Non-fatal, continue with RFQ generation
          }
        }
      } catch (err) {
        console.error("Error inserting RFQ:", err);
        if (req.body.ref_no) {
          if (err.code === '23505') {
            // If custom reference number failed, return error immediately
            return res.status(409).json({ success: false, message: `Reference number ${ref_no} already exists.` });
          } else {
            throw err;
          }
        }
        // 23505 is PostgreSQL unique violation code
        if (err.code === '23505') {
          ref_no = '';
          attempts++;
        } else {
          throw err;
        }
      }
    }

    if (!isLogged) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate a unique RFQ code after multiple attempts. Please try again.' 
      });
    }

    res.status(201).json({ success: true, data: shipmentData });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/rfq/:ref_no/send-email
//  Constructs email from DB shipment data & latest file.
// ─────────────────────────────────────────────────────────────
const sendRfqEmail = async (req, res, next) => {
  try {
    const { ref_no } = req.params;
    const { cc } = req.body;  // optional CC addresses (comma-separated string)

    // 1. Fetch Shipment
    const shipRes = await query(req, 'SELECT * FROM shipments WHERE ref_no = $1', [ref_no]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }
    const shipment = shipRes.rows[0];

    // Ensure we have an email
    if (!shipment.email) {
      return res.status(400).json({ success: false, message: 'No recipient email found for this shipment.' });
    }

    // 2. Fetch all attached files
    const fileRes = await query(req,
      'SELECT * FROM files WHERE shipment_ref_no = $1 ORDER BY uploaded_at ASC',
      [ref_no]
    );
    const attachedFiles = fileRes.rows;

    // 3. Resolve Dynamic Email Credentials
    let smtpUser = null;
    let smtpPass = null;
    let targetUserId = req.user.id;
    try {
      if (req.user.role === 'sales') {
        // Sales sends through the selected operator's email address or username
        const userRes = await db.query(
          "SELECT id, email_address, email_password FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1) OR LOWER(name) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
          [shipment.operator]
        );
        if (userRes.rows.length > 0) {
          smtpUser = userRes.rows[0].email_address;
          smtpPass = decrypt(userRes.rows[0].email_password);
          targetUserId = userRes.rows[0].id;
        }
      } else {
        // Admin/Operator sends through their own credentials
        const userRes = await db.query("SELECT id, email_address, email_password FROM users WHERE id = $1", [req.user.id]);
        if (userRes.rows.length > 0) {
          smtpUser = userRes.rows[0].email_address;
          smtpPass = decrypt(userRes.rows[0].email_password);
          targetUserId = userRes.rows[0].id;
        }
      }
    } catch (dbErr) {
      console.error('Error loading credentials from DB:', dbErr.message);
    }

    const { getSignatureForUser } = require('../utils/signature');
    const signature = await getSignatureForUser(targetUserId);

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
      return res.status(400).json({ 
        success: false, 
        message: req.user.role === 'sales'
          ? 'Email credentials for the selected Operator are not configured. Please ask the Admin to configure the Operator email and app password in Settings.'
          : 'Your email settings are not configured. Please configure your email address and app password in Settings.' 
      });
    }

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

    // 4. Construct Subject
    // Format: RFQ FROM [POL] TO [POD]/[MODE]/[CONTAINER]/[RFQ NO]/CID : [CUSTOMER ID]
    let subject = `RFQ FROM ${shipment.pol || ''} TO ${shipment.pod || ''}`;
    if (shipment.mode) subject += `/${shipment.mode}`;
    if (shipment.container) subject += `/${shipment.container}`;
    subject += `/${shipment.ref_no}/CID : ${shipment.customer_id || ''}`;

    // 5. Construct HTML Body
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
          // Skip leading spaces on the new line
          while (i + 1 < address.length && address[i + 1] === ' ') {
            i++;
          }
        }
      }
      return result;
    };

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

    // Signature
    htmlBody += `
      <br><br>
      ${signature.html}
      </body>
      </html>
    `;

    // Construct plain-text messageText for saving in replies (chat history view)
    let messageText = `Dear ${shipment.dear_who || 'Sir/Madam'},\n\nKindly provide a Quotation for the following Shipment.\n\n`;
    labels.forEach(([label, value]) => {
      if (value && String(value).trim() !== '') {
        messageText += `${label}: ${value}\n`;
      }
    });
    messageText += `\n\n${signature.text}`;

    // 6. Setup Mail Options
    const mailOptions = {
      from: `"Argus Shipping " <${smtpUser}>`,
      to: shipment.email,
      subject: subject,
      html: htmlBody,
    };

    // Add CC if provided
    if (cc && cc.trim()) {
      mailOptions.cc = cc.trim();
    }

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

    // 7. Send
    const info = await transporter.sendMail(mailOptions);
    const sentMessageId = info.messageId || null;

    // 8. Save to shipment_replies DB (marked as read since it is an outgoing email)
    await query(req, 
      `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text, to_emails, cc_emails, message_id, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [ref_no, smtpUser, subject, messageText, shipment.email, cc || '', sentMessageId]
    );

    res.json({ success: true, message: `Email sent successfully to ${shipment.email}` });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateRfq, sendRfqEmail };
