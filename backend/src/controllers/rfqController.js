// src/controllers/rfqController.js
// ─────────────────────────────────────────────────────────────
//  Handles generation of RFQ codes, database insertion with
//  collision retries, and sending emails via nodemailer.
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');
const { query } = require('../config/dbHelper');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ── ID Generator ─────────────────────────────────────────────
// Pattern: xxyyxyxx (x = digit, y = letter)
const generateId = () => {
  const rD = () => Math.floor(Math.random() * 10).toString();
  const rL = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `${rD()}${rD()}${rL()}${rL()}${rD()}${rL()}${rD()}${rD()}`;
};

// ─────────────────────────────────────────────────────────────
//  POST /api/rfq/generate
//  Generates unique ID, saves to DB with 'Pending' status.
// ─────────────────────────────────────────────────────────────
const generateRfq = async (req, res, next) => {
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
    let opUsername = null;
    if (req.user.role === 'sales' && operator) {
      const opByUsername = await db.query(
        "SELECT username FROM users WHERE LOWER(username) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
        [operator]
      );
      if (opByUsername.rows.length > 0) {
        opUsername = opByUsername.rows[0].username.toLowerCase();
      } else {
        const opUserCheck = await db.query(
          "SELECT username FROM users WHERE LOWER(email_address) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
          [operator]
        );
        if (opUserCheck.rows.length > 0) {
          opUsername = opUserCheck.rows[0].username.toLowerCase();
        }
      }
    }

    while (!isLogged && attempts < maxAttempts) {
      const baseRfq = generateId();
      
      // Fallback for collision (mimicking Python logic)
      ref_no = attempts > 0 ? `${baseRfq}_${attempts}` : baseRfq;

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
          await db.query(
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
                  ON CONFLICT (email, COALESCE(pol, ''), COALESCE(pod, ''), COALESCE(mode, '')) 
                  DO UPDATE SET dear_who = EXCLUDED.dear_who, country = EXCLUDED.country
                `, [email, dear_who || null, pol || null, pod || null, mode || null, resolvedCountry || null]);
              }
            }
          } catch (contactErr) {
            console.error("Failed to auto-save contact:", contactErr);
            // Non-fatal, continue with RFQ generation
          }
        }
      } catch (err) {
        // 23505 is PostgreSQL unique violation code
        if (err.code === '23505') {
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
    try {
      if (req.user.role === 'sales') {
        // Sales sends through the selected operator's email address or username
        const userRes = await db.query(
          "SELECT email_address, email_password FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1) ORDER BY (role = 'operator') DESC, id ASC LIMIT 1",
          [shipment.operator]
        );
        if (userRes.rows.length > 0) {
          smtpUser = userRes.rows[0].email_address;
          smtpPass = userRes.rows[0].email_password;
        }
      } else {
        // Admin/Operator sends through their own credentials
        const userRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
        if (userRes.rows.length > 0) {
          smtpUser = userRes.rows[0].email_address;
          smtpPass = userRes.rows[0].email_password;
        }
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
    });

    // 4. Construct Subject
    // Format: RFQ FROM [POL] TO [POD]/[MODE]/[CONTAINER]/[RFQ NO]/CID : [CUSTOMER ID]
    let subject = `RFQ FROM ${shipment.pol || ''} TO ${shipment.pod || ''}`;
    if (shipment.mode) subject += `/${shipment.mode}`;
    if (shipment.container) subject += `/${shipment.container}`;
    subject += `/${shipment.ref_no}/CID : ${shipment.customer_id || ''}`;

    // 5. Construct HTML Body
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
      <p>Best regards,</p>

      <p style="color:#3b78c8;">
      <b>Muhammed Jabir</b><br>
      PRICING AND OPERATION<br>
      ARGUS SHIPPING
      </p>

      <p>📞 +974 30512233</p>

      <p>
      📧 <a href="mailto:jabir@argusshipping.co">
      jabir@argusshipping.co
      </a>
      </p>

      <p>
      🌐 <a href="https://www.argusshipping.co">
      www.argusshipping.co
      </a>
      </p>
      <br>

      <p style="background-color:yellow;color:red;padding:8px;">
      Confidentiality Notice: This email and any attachments are confidential and may contain legally privileged information intended solely for the named recipient(s). Any unauthorized review, use, disclosure, copying, or distribution is strictly prohibited. If received in error, please notify the sender immediately and permanently delete the message.
      </p>
      </body>
      </html>
    `;

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
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: `Email sent successfully to ${shipment.email}` });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateRfq, sendRfqEmail };
