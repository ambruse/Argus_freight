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

// ─────────────────────────────────────────────────────────────
//  POST /api/quotation/generate
//  Generates unique Q.NO, saves to DB, renders template and compiles to PDF.
// ─────────────────────────────────────────────────────────────
const generateQuotation = async (req, res, next) => {
  try {
    const {
      pol, pod, pol_pcode, pod_pcode, commodity,
      freight, zone, trans, sales_p, operator, customer_name,
      transit_time, validity, mode, carrier_name, currency
    } = req.body;

    const creatorId = req.user.id;

    // 1. Generate sequential Q.NO (format: yyyymmdd001, yyyymmdd002)
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const datePrefix = `${yyyy}${mm}${dd}`;

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
    const q_no = `${datePrefix}${String(seq).padStart(3, '0')}`;

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
    const templatePath = path.join(assetsDir, 'Argus_Ambient_Premium_Quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: 'Argus_Ambient_Premium_Quotation.docx template not found in assets.' });
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
    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
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

    // Convert docx to pdf function
    const convertDocxToPdf = (dPath, pPath) => {
      return new Promise((resolve, reject) => {
        const absoluteDocx = path.resolve(dPath);
        const absolutePdf = path.resolve(pPath);

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
          // Linux / Render fallback using soffice / headless LibreOffice
          exec(`soffice --headless --convert-to pdf --outdir "${path.dirname(absolutePdf)}" "${absoluteDocx}"`, (err, stdout, stderr) => {
            if (err) {
              return reject(new Error(err.message));
            }
            const generatedPdfName = path.basename(absoluteDocx).replace(/\.docx$/, '.pdf');
            const generatedPdfPath = path.join(path.dirname(absolutePdf), generatedPdfName);
            if (generatedPdfPath !== absolutePdf && fs.existsSync(generatedPdfPath)) {
              fs.renameSync(generatedPdfPath, absolutePdf);
            }
            resolve();
          });
        }
      });
    };

    let savedPath = '';

    try {
      await convertDocxToPdf(tempDocxPath, pdfPath);
      
      // Append the static 2nd page PDF
      try {
        const generatedPdfBytes = fs.readFileSync(pdfPath);
        const generatedDoc = await PDFDocument.load(generatedPdfBytes);
        
        const additionalPdfPath = 'C:\\Users\\WORK\\OneDrive\\Documents\\ARGUS\\public\\Argus_Ambient_Premium_Quotation_2.pdf';
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
      return res.status(500).json({
        success: false,
        message: `PDF generation failed: ${err.message}`
      });
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
    const result = await db.query(
      `SELECT q.*, u.username as creator_username 
       FROM quotations q
       LEFT JOIN users u ON q.created_by = u.id
       ORDER BY q.created_at DESC`
    );

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
      
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: payload.smtpUser,
          pass: payload.smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        },
        family: 4
      });

      await transporter.sendMail({
        from: `ARGUS SHIPPING <${payload.smtpUser}>`,
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
        // Save to shipment_replies DB
        await db.query(
          `INSERT INTO shipment_replies (ref_no, from_email, subject, body_text)
           VALUES ($1, $2, $3, $4)`,
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
                `SELECT username FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1`,
                [updatedShipment.customer_id]
              );
              if (custUserRes.rows.length > 0) {
                const customerUsername = custUserRes.rows[0].username;
                const cleanUsername = customerUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                
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

module.exports = { 
  generateQuotation, 
  getQuotations, 
  downloadQuotation,
  approveQuotation,
  disapproveQuotation
};
