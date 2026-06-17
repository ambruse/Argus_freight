// src/middleware/upload.js
// ─────────────────────────────────────────────────────────────
//  Multer configuration for PDF uploads.
//  Files are stored at: ./uploads/<ref_no>/<timestamp>_<original>.pdf
//  Only PDF MIME type is accepted.
// ─────────────────────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
const BASE_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

/** Ensure a directory exists (create recursively if not). */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// ── Disk Storage Engine ─────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Organise uploads by shipment ref_no (sanitised for filesystem safety)
    const refNo  = (req.params.ref_no || 'unknown').replace(/[^a-zA-Z0-9\-]/g, '_');
    const dir    = path.join(BASE_UPLOAD_DIR, refNo);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Prefix with timestamp to avoid collisions
    const timestamp = Date.now();
    const safe      = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safe}`);
  },
});

// ── MIME Filter ─────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF and image files (PNG, JPG, JPEG, GIF, WEBP) are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

module.exports = { upload, BASE_UPLOAD_DIR };
