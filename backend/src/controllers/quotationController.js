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
      transit_time, validity
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

    // 2. Auto calculations
    const freightNum = parseFloat(freight) || 0;
    const transNum = parseFloat(trans) || 0;
    const totalRate = 400 + transNum + freightNum;

    // Date formatting
    const dateStr = `${dd}/${mm}/${yyyy}`;

    // Validity formatting (default to 3 days from generating day)
    let validityStr = '';
    let validityDbDate = null;
    if (validity && validity.trim() !== '') {
      try {
        const parts = validity.split('-');
        if (parts.length === 3) {
          validityStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
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
        validityStr = `${String(vDate.getDate()).padStart(2, '0')}/${String(vDate.getMonth() + 1).padStart(2, '0')}/${vDate.getFullYear()}`;
      }
    } else {
      const vDate = new Date(today);
      vDate.setDate(today.getDate() + 3);
      validityDbDate = vDate;
      validityStr = `${String(vDate.getDate()).padStart(2, '0')}/${String(vDate.getMonth() + 1).padStart(2, '0')}/${vDate.getFullYear()}`;
    }

    // 3. Render DOCX using docxtemplater
    const assetsDir = path.resolve(__dirname, '../../../assets');
    const templatePath = path.join(assetsDir, 'Argus_Ambient_Premium_Quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: 'Argus_Ambient_Premium_Quotation.docx template not found in assets.' });
    }

    const templateBytes = fs.readFileSync(templatePath);
    const zip = new PizZip(templateBytes);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const renderVars = {
      'POL': pol || '',
      'POD': pod || '',
      'COMMODITY': commodity || '',
      'POD_PCODE': pod_pcode || '',
      'POL_PCODE': pol_pcode || '',
      'FREIGHT': formatCurrency(freightNum),
      'Zone': zone || 'Zone-1',
      'TRANS': formatCurrency(transNum),
      '400+TRANS+FREIGHT': formatCurrency(totalRate),
      'Sales_P': sales_p || '',
      'OPERATOR': operator || '',
      'C_name': customer_name || '',
      'Q_no': q_no,
      'TT': transit_time || '',
      'Validity': validityStr,
      'Date': dateStr
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
    let isPdf = true;

    try {
      await convertDocxToPdf(tempDocxPath, pdfPath);
      // Clean up temporary docx
      fs.unlinkSync(tempDocxPath);
      savedPath = path.relative(process.cwd(), pdfPath).replace(/\\/g, '/');
    } catch (err) {
      console.error("[Quotation PDF Warning] PDF conversion failed, falling back to DOCX:", err.message);
      isPdf = false;
      savedPath = path.relative(process.cwd(), tempDocxPath).replace(/\\/g, '/');
    }

    // 5. Insert record into database
    const insertRes = await db.query(
      `INSERT INTO quotations (
        q_no, pol, pod, commodity, pod_pcode, pol_pcode, freight, zone, trans, total_rate,
        sales_p, operator, customer_name, transit_time, validity, created_by, file_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        q_no, pol || null, pod || null, commodity || null, pod_pcode || null, pol_pcode || null,
        freightNum, zone || null, transNum, totalRate, sales_p || null, operator || null,
        customer_name || null, transit_time || null, validityDbDate, creatorId, savedPath
      ]
    );

    res.status(201).json({
      success: true,
      message: isPdf ? 'Quotation PDF generated successfully.' : 'Quotation DOCX generated successfully (PDF conversion fallback).',
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
    // Admins and operators can see all quotations, sales can see all or just theirs (let's display all for operators/sales/admins to simplify collaboration)
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
    const absPath = path.resolve(process.cwd(), quotation.file_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'Quotation file not found on disk.' });
    }

    const ext = path.extname(quotation.file_path).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.setHeader('Content-Disposition', `attachment; filename="Quotation_${quotation.q_no}${ext}"`);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
};

module.exports = { generateQuotation, getQuotations, downloadQuotation };
