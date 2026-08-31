// src/controllers/quotationController.js
// ─────────────────────────────────────────────────────────────
//  Handles generation of sequential Q.NOs, DOCX template rendering,
//  and PDF/DOCX compilation.
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');
const { query } = require('../config/dbHelper');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Format currency helper
const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '—';
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Global cached WASM converter instance to prevent loading delays
let wasmConverterPromise = null;
const getWasmConverter = () => {
  if (!wasmConverterPromise) {
    const lib = require('@matbee/libreoffice-converter');
    const wasmLoader = require('@matbee/libreoffice-converter/wasm/loader');
    wasmConverterPromise = lib.createConverter({ wasmLoader }).catch(err => {
      wasmConverterPromise = null;
      throw err;
    });
  }
  return wasmConverterPromise;
};

// ─────────────────────────────────────────────────────────────
//  POST /api/quotation/generate
//  Generates unique Q.NO, saves to DB, renders template and compiles to PDF.
// ─────────────────────────────────────────────────────────────
const generateQuotation = async (req, res, next) => {
  try {
    const {
      pol, pod, pol_pcode, pod_pcode, commodity,
      freight, zone, trans, sales_p, operator, customer_name,
      transit_time, validity, mode, carrier_name, currency,
      is_draft
    } = req.body;

    const creatorId = req.user.id;

    // 1. Generate sequential Q.NO (format: yyyymmdd001, yyyymmdd002) or static 'xxxxx' for draft
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const datePrefix = `${yyyy}${mm}${dd}`;

    let q_no = '';
    if (is_draft) {
      // Check if draft mode is globally enabled
      const draftSettingRes = await db.query("SELECT value FROM app_settings WHERE `key` = $1", ['quotation_draft_mode_enabled']);
      const isDraftGloballyEnabled = draftSettingRes.rows.length > 0 && draftSettingRes.rows[0].value === 'true';
      if (!isDraftGloballyEnabled) {
        return res.status(400).json({ success: false, message: 'Draft mode is currently disabled globally by the Admin.' });
      }
      q_no = 'xxxxx';
    } else {
      // Get the highest Q.NO created today
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
      q_no = `${datePrefix}${String(seq).padStart(3, '0')}`;
    }

    // 2. Financials and currency conversion calculations
    const freightNum = parseFloat(freight) || 0;
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

    // Date formatting (dd-mm-yyyy / DD-MM-YYYY)
    const dateStr = `${dd}-${mm}-${yyyy}`;

    // Validity formatting (default to 3 days from generating day)
    let validityStr = '';
    let validityDbDate = null;
    if (validity && validity.trim() !== '') {
      try {
        const parts = validity.split('-');
        if (parts.length === 3) {
          validityStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          validityDbDate = validity;
        } else {
          validityStr = validity;
          validityDbDate = new Date(today);
          validityDbDate.setDate(today.getDate() + 3);
        }
      } catch (e) {
        const vDate = new Date(today);
        vDate.setDate(today.getDate() + 3);
        validityDbDate = vDate;
        validityStr = `${String(vDate.getDate()).padStart(2, '0')}-${String(vDate.getMonth() + 1).padStart(2, '0')}-${vDate.getFullYear()}`;
      }
    } else {
      const vDate = new Date(today);
      vDate.setDate(today.getDate() + 3);
      validityDbDate = vDate;
      validityStr = `${String(vDate.getDate()).padStart(2, '0')}-${String(vDate.getMonth() + 1).padStart(2, '0')}-${vDate.getFullYear()}`;
    }

    // 3. Render DOCX using docxtemplater
    const assetsDir = path.resolve(__dirname, '../../../public');
    const templateFileName = is_draft ? 'Argus_Ambient_Premium_Quotation(Draft).docx' : 'Argus_Ambient_Premium_Quotation.docx';
    const templatePath = path.join(assetsDir, templateFileName);

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: `${templateFileName} template not found in assets.` });
    }

    const templateBytes = fs.readFileSync(templatePath);
    const zip = new PizZip(templateBytes);

    // Clean all XML files inside the zip to fix formatting-split placeholders (e.g. `{` and `Q_no` and `}`)
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

        // 3. Replace QAS Charges with Do Charges when mode is OCEAN or ROAD/LAND
        if (mode === 'OCEAN' || mode === 'LAND' || mode === 'ROAD') {
          content = content.replace(/QAS\s+Charges/g, 'Do Charges');
          content = content.replace(/QAS\s+charges/g, 'Do charges');
          content = content.replace(/QAS\s+CHARGES/g, 'DO CHARGES');
        }
        
        zip.file(fileName, content);
      }
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const carrierPlaceholderValue = mode === 'AIR' ? 'AIRLINE' : (mode === 'LAND' ? 'TRUCK' : 'CARRIER');

    const extractPortCode = (portStr) => {
      if (!portStr) return '';
      const match = portStr.match(/\(([^)]+)\)/);
      return match && match[1] ? match[1].trim() : portStr;
    };

    const finalPol = extractPortCode(pol);
    const finalPod = extractPortCode(pod);
    const finalPolPcode = extractPortCode(pol_pcode || pol);
    const finalPodPcode = extractPortCode(pod_pcode || pod);

    const renderVars = {
      // Direct placeholders mapped with casing fallbacks
      'Q_no': q_no,
      'q_no': q_no,
      'DATE': dateStr,
      'Date': dateStr,
      'VALIDITY': validityStr,
      'Validity': validityStr,
      'C_NAME': customer_name || '',
      'C_name': customer_name || '',
      'c_name': customer_name || '',
      'SALES_P': sales_p || '',
      'Sales_P': sales_p || '',
      'sales_p': sales_p || '',
      'OPERATOR': operator || '',
      'Operator': operator || '',
      'operator': operator || '',
      'TT': transit_time || '',
      'tt': transit_time || '',
      'POL': pol || '',
      'POD': pod || '',
      'COMMODITY': commodity || '',
      'MODE': mode || '',
      'mode': mode || '',
      'POD_PCODE': finalPodPcode || '',
      'POL_PCODE': finalPolPcode || '',
      'FREIGHT_QAR': formatCurrency(freightQar),
      'FREIGHT_USD': formatCurrency(freightUsd),
      'Zone': zone || 'Zone-1',
      'TRANS': formatCurrency(transNum),
      '400+TRANS+FREIGHT': formatCurrency(totalRate),

      // Slash-braced placeholders requested by user
      'CARRIER/AIRLINE/TRUCK': carrierPlaceholderValue,
      'CARRIER/AIRLINE/TRUCK ': carrierPlaceholderValue,
      'CARRIER_name/AIRLINE_name /TRUCK_name ': carrier_name || '',
      'CARRIER_name/AIRLINE_name/TRUCK_name ': carrier_name || '',
      'CARRIER_name/AIRLINE_name /TRUCK_name': carrier_name || '',
      'CARRIER_name/AIRLINE_name/TRUCK_name': carrier_name || '',
      
      // Individual backups
      'carrier_name': carrier_name || '',
      'airline_name': carrier_name || '',
      'truck_name': carrier_name || ''
    };

    doc.render(renderVars);
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

    // 4. Archive PDF/DOCX to disk
    const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    const targetDir = path.join(UPLOAD_DIR, 'quotations');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = Date.now();
    const pdfFileName = `${timestamp}_Quotation_${q_no}.pdf`;
    const docxFileName = `${timestamp}_Quotation_${q_no}.docx`;
    const pdfPath = path.join(targetDir, pdfFileName);
    const tempDocxPath = path.join(targetDir, docxFileName);

    // Save temporary docx
    fs.writeFileSync(tempDocxPath, docxBuffer);

    // Helper: Convert using Python script backend/scripts/generate_quotation.py
    const convertWithPython = (tPath, dPath, pPath, rVars) => {
      return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../scripts/generate_quotation.py');
        const payload = JSON.stringify({
          templatePath: path.resolve(tPath),
          tempDocxPath: path.resolve(dPath),
          pdfPath: path.resolve(pPath),
          renderVars: rVars
        });

        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        const child = exec(`${pyCmd} "${scriptPath}"`, { timeout: 20000 }, (err, stdout, stderr) => {
          if (err || (stderr && stderr.includes('Error:'))) {
            return reject(new Error(stderr || err.message));
          }
          try {
            const resStr = stdout.trim();
            const lastLine = resStr.split('\n').pop();
            const res = JSON.parse(lastLine);
            if (res.success && fs.existsSync(pPath)) {
              console.log(`✅ PDF generated via Python engine (${res.renderEngine} / ${res.converterEngine})`);
              return resolve(res);
            }
          } catch (pErr) {
            // parsing error or output PDF file missing
          }
          reject(new Error(stderr || "Python conversion produced no output PDF file."));
        });

        if (child.stdin) {
          child.stdin.write(payload);
          child.stdin.end();
        }
      });
    };

    // Convert docx to pdf function using fast libreoffice-convert package
    const convertDocxToPdf = (dPath, pPath) => {
      return new Promise((resolve, reject) => {
        const absoluteDocx = path.resolve(dPath);
        const absolutePdf = path.resolve(pPath);
        const { exec } = require('child_process');

        // 1. Try system soffice CLI
        exec(`soffice --headless --convert-to pdf --outdir "${path.dirname(absolutePdf)}" "${absoluteDocx}"`, { timeout: 10000 }, (cliErr) => {
          if (!cliErr && fs.existsSync(absolutePdf)) {
            console.log("✅ PDF converted successfully using system LibreOffice (soffice) CLI.");
            return resolve();
          }

          console.log("ℹ️ System soffice CLI not available. Trying libreoffice-convert...");

          // 2. Try native libreoffice-convert
          const libre = require('libreoffice-convert');
          const docxBuf = fs.readFileSync(absoluteDocx);
          
          libre.convert(docxBuf, '.pdf', undefined, (err, done) => {
            if (!err && done) {
              fs.writeFileSync(absolutePdf, done);
              return resolve();
            }

            console.log("ℹ️ libreoffice-convert failed. Falling back to WebAssembly converter...");

            // 3. WebAssembly fallback
            getWasmConverter()
              .then(async (converter) => {
                try {
                  const resultObj = await converter.convert(docxBuf, { outputFormat: 'pdf' });
                  fs.writeFileSync(absolutePdf, resultObj.data);
                  resolve();
                } catch (wasmErr) {
                  reject(wasmErr);
                }
              })
              .catch(reject);
          });
        });
      });
    };

    let savedPath = '';

    try {
      // 1. Primary Attempt: Python DOCX Renderer & PDF Converter Script
      try {
        console.log("▶ Attempting PDF generation via Python engine (generate_quotation.py)...");
        await convertWithPython(templatePath, tempDocxPath, pdfPath, renderVars);
      } catch (pyErr) {
        console.log("ℹ️ Python conversion attempt failed/unavailable:", pyErr.message);
        console.log("▶ Falling back to Node.js / WASM converter...");

        // Ensure temp DOCX exists for fallback renderer
        if (!fs.existsSync(tempDocxPath)) {
          fs.writeFileSync(tempDocxPath, docxBuffer);
        }
        await convertDocxToPdf(tempDocxPath, pdfPath);
      }
      
      // Append the static 2nd page PDF
      try {
        const generatedPdfBytes = fs.readFileSync(pdfPath);
        const generatedDoc = await PDFDocument.load(generatedPdfBytes);
        
        const additionalPdfPath = path.resolve(__dirname, '../../../public/Argus_Ambient_Premium_Quotation_2.pdf');
        if (fs.existsSync(additionalPdfPath)) {
          const additionalPdfBytes = fs.readFileSync(additionalPdfPath);
          const additionalDoc = await PDFDocument.load(additionalPdfBytes);
          
          const copiedPages = await generatedDoc.copyPages(additionalDoc, additionalDoc.getPageIndices());
          copiedPages.forEach((page) => generatedDoc.addPage(page));
          
          const mergedPdfBytes = await generatedDoc.save();
          fs.writeFileSync(pdfPath, mergedPdfBytes);
        } else {
          console.log("[Quotation PDF Merge] Additional PDF not found at", additionalPdfPath);
        }
      } catch (mergeErr) {
        console.error("[Quotation PDF Merge Error]:", mergeErr);
      }

      // Clean up temporary docx
      if (fs.existsSync(tempDocxPath)) {
        fs.unlinkSync(tempDocxPath);
      }
      savedPath = path.relative(process.cwd(), pdfPath).replace(/\\/g, '/');
    } catch (err) {
      console.error("[Quotation PDF Error] PDF conversion failed:", err.message);
      // Clean up temporary docx anyway
      if (fs.existsSync(tempDocxPath)) {
        fs.unlinkSync(tempDocxPath);
      }
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      return res.status(500).json({
        success: false,
        message: `PDF generation failed: ${err.message}`
      });
    }

    if (is_draft) {
      try {
        const finalPdfBytes = fs.readFileSync(pdfPath);
        // Clean up temporary PDF file on disk
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
        return res.status(200).json({
          success: true,
          isDraft: true,
          message: 'Draft Quotation PDF generated successfully.',
          pdfBase64: finalPdfBytes.toString('base64'),
          fileName: `Quotation_Draft_${Date.now()}.pdf`
        });
      } catch (readErr) {
        console.error("[Draft PDF Read Error]:", readErr);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
        return res.status(500).json({
          success: false,
          message: `Failed to read generated draft PDF: ${readErr.message}`
        });
      }
    }

    // 5. Insert record into database
    const approvalStatus = req.user.role === 'admin' ? 'Approved' : 'Pending';

    const insertRes = await db.query(
      `INSERT INTO quotations (
        q_no, pol, pod, commodity, pod_pcode, pol_pcode, freight, zone, trans, total_rate,
        sales_p, operator, customer_name, transit_time, validity, created_by, file_path,
        mode, carrier_name, currency, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        q_no, pol || null, pod || null, commodity || null, pod_pcode || null, pol_pcode || null,
        freightNum, zone || null, transNum, totalRate, sales_p || null, operator || null,
        customer_name || null, transit_time || null, validityDbDate, creatorId, savedPath,
        mode || 'OCEAN', carrier_name || null, currency || 'QAR', approvalStatus
      ]
    );

    res.status(201).json({
      success: true,
      message: approvalStatus === 'Approved' ? 'Quotation PDF generated successfully.' : 'Quotation PDF generated. Pending Admin approval.',
      data: insertRes.rows[0]
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/quotation
//  Lists all generated quotations.
// ─────────────────────────────────────────────────────────────
const getQuotations = async (req, res, next) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await db.query(
        `SELECT q.*, u.username as creator_username 
         FROM quotations q
         LEFT JOIN users u ON q.created_by = u.id
         ORDER BY q.created_at DESC`
      );
    } else {
      result = await db.query(
        `SELECT q.*, u.username as creator_username 
         FROM quotations q
         LEFT JOIN users u ON q.created_by = u.id
         WHERE q.created_by = $1
         ORDER BY q.created_at DESC`,
        [req.user.id]
      );
    }

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/quotation/download/:id
//  Downloads the quotation file.
// ─────────────────────────────────────────────────────────────
const downloadQuotation = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM quotations WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation record not found.' });
    }

    const quotation = result.rows[0];

    // Enforce creator lock: non-admins can only download their own quotations
    if (req.user.role !== 'admin' && quotation.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only download your own quotations.' });
    }

    // Enforce approval lock: only admins can download unapproved quotations
    if (req.user.role !== 'admin' && quotation.approval_status !== 'Approved') {
      return res.status(403).json({ success: false, message: 'Access denied. This quotation is pending admin approval.' });
    }
    const absPath = path.resolve(process.cwd(), quotation.file_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'Quotation file not found on disk.' });
    }

    const ext = path.extname(quotation.file_path).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="Quotation_${quotation.q_no}${ext}"`);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/quotation/approve/:id
//  Approves a quotation, sends email if pending, files PDF, and updates status.
// ─────────────────────────────────────────────────────────────
const approveQuotation = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { id } = req.params;
    const quotRes = await db.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const quotation = quotRes.rows[0];

    // If it has a pending email payload, send the email and save it to files table
    if (quotation.email_payload) {
      const payload = JSON.parse(quotation.email_payload);
      
      let smtpUser = payload.smtpUser;
      let smtpPass = payload.smtpPass;

      if (!smtpUser || !smtpPass) {
        // Try to load the approving admin's SMTP credentials
        const { decrypt } = require('../utils/crypto');
        try {
          const adminRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
          if (adminRes.rows.length > 0) {
            smtpUser = adminRes.rows[0].email_address;
            smtpPass = decrypt(adminRes.rows[0].email_password);
          }
        } catch (dbErr) {
          console.error('Error loading admin credentials from DB:', dbErr.message);
        }
      }

      // Fallback to global env variables
      if (!smtpUser) {
        smtpUser = process.env.SMTP_USER || null;
      }
      if (!smtpPass) {
        smtpPass = process.env.SMTP_PASS || null;
      }

      // Sanitize
      if (smtpUser && typeof smtpUser === 'string') smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
      if (smtpPass && typeof smtpPass === 'string') smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');

      if (!smtpUser || !smtpPass) {
        return res.status(400).json({ 
          success: false, 
          message: 'Admin SMTP credentials are not configured. Please configure your email address and app password in Settings to approve this quotation.' 
        });
      }

      const nodemailer = require('nodemailer');
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

      await transporter.sendMail({
        from: `ARGUS SHIPPING <${smtpUser}>`,
        to: payload.recipientEmail,
        subject: payload.subject,
        text: payload.messageText,
        html: payload.htmlBody,
        attachments: [
          {
            filename: payload.originalName,
            path: path.resolve(process.cwd(), payload.file_path)
          }
        ]
      });

      await db.query(
        `INSERT INTO files (shipment_ref_no, filename, original_name, file_path, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [quotation.shipment_ref, payload.fileName, payload.originalName, payload.file_path, 'application/pdf', payload.sizeBytes]
      );

      // If it's linked to an RFQ/shipment, update shipment and replies log
      if (quotation.shipment_ref) {
        // Save to shipment_replies DB (marked as read since it is an outgoing email)
        await db.query(
          `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text, is_read)
           VALUES ($1, $2, $3, $4, true)`,
          [quotation.shipment_ref, payload.smtpUser, payload.subject, payload.messageText]
        );

        // Update main shipments table
        const updateRes = await db.query(
          `UPDATE shipments SET last_follow_up = NOW(), cost = 0, profit = $1 WHERE ref_no = $2 RETURNING *`,
          [quotation.total_rate, quotation.shipment_ref]
        );
        
        if (updateRes.rows.length > 0) {
          const updatedShipment = updateRes.rows[0];
          // Try to sync to customer sandbox table if customer_id exists
          if (updatedShipment.customer_id) {
            try {
              const custUserRes = await db.query(
                `SELECT id, username FROM users WHERE customer_id = $1 AND role = 'customer' AND (is_deleted IS NOT TRUE) LIMIT 1`,
                [updatedShipment.customer_id]
              );
              if (custUserRes.rows.length > 0) {
                const { getUserSuffix } = require('../config/dbHelper');
                const custSuffix = getUserSuffix(custUserRes.rows[0]);
                
                await db.query(
                  `UPDATE shipments_${custSuffix} SET
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
                    updatedShipment.status,
                    updatedShipment.do_number,
                    updatedShipment.box_no,
                    updatedShipment.so_number,
                    updatedShipment.bl_number,
                    updatedShipment.track_status,
                    updatedShipment.carrier,
                    updatedShipment.etd,
                    updatedShipment.eta,
                    updatedShipment.cost,
                    updatedShipment.profit,
                    updatedShipment.last_follow_up,
                    updatedShipment.ref_no
                  ]
                );
              }
            } catch (syncErr) {
              console.error('[Quotation Sync Error] Failed to sync shipment status to customer sandbox:', syncErr.message);
            }
          }
        }
      }
    }

    await db.query(
      `UPDATE quotations SET approval_status = 'Approved', email_payload = NULL WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Quotation approved and sent successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/quotation/disapprove/:id
//  Disapproves a quotation and updates status.
// ─────────────────────────────────────────────────────────────
const disapproveQuotation = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { id } = req.params;
    
    await db.query(
      `UPDATE quotations SET approval_status = 'Disapproved', email_payload = NULL WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Quotation disapproved successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/quotation/draft-settings
//  Retrieves global Draft Mode status.
// ─────────────────────────────────────────────────────────────
const getDraftSettings = async (req, res, next) => {
  try {
    const result = await db.query("SELECT value FROM app_settings WHERE `key` = $1", ['quotation_draft_mode_enabled']);
    let enabled = false;
    if (result.rows.length > 0) {
      enabled = result.rows[0].value === 'true';
    }
    res.json({ success: true, enabled });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/quotation/draft-settings
//  Updates global Draft Mode status (Admin only).
// ─────────────────────────────────────────────────────────────
const updateDraftSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
    const { enabled } = req.body;
    const val = enabled === true || enabled === 'true' ? 'true' : 'false';
    await db.query(
      `INSERT INTO app_settings (\`key\`, value) 
       VALUES ('quotation_draft_mode_enabled', $1) 
       ON CONFLICT (\`key\`) 
       DO UPDATE SET value = EXCLUDED.value`,
      [val]
    );
    res.json({ success: true, message: 'Draft mode setting updated successfully.', enabled: val === 'true' });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  generateQuotation, 
  getQuotations, 
  downloadQuotation,
  approveQuotation,
  disapproveQuotation,
  getDraftSettings,
  updateDraftSettings
};
