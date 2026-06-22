// src/controllers/fileController.js
// ─────────────────────────────────────────────────────────────
//  Manages PDF file records in the DB and on disk.
//  Multer handles the actual upload; this controller records
//  metadata and handles delete / serve operations.
// ─────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const { query } = require('../config/dbHelper');
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  POST /api/files/:ref_no
//  Multer has already saved the file before this runs.
//  We record the metadata in the DB.
// ─────────────────────────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { ref_no } = req.params;
    const { originalname, filename, path: filePath, mimetype, size } = req.file;

    // Verify the shipment exists and fetch the operator
    const ship = await query(req, 'SELECT ref_no, operator FROM shipments WHERE ref_no = $1', [ref_no]);
    if (ship.rows.length === 0) {
      // Remove orphaned file from disk
      fs.unlinkSync(filePath);
      return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    // Store relative path for portability
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    const result = await query(req,
      `INSERT INTO files (shipment_ref_no, filename, original_name, file_path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ref_no, filename, originalname, relativePath, mimetype, size]
    );

    // ── Clone file metadata to respective operator sandbox ──────────
    let opUsername = null;
    const operator = ship.rows[0].operator;
    if (operator) {
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

    if (opUsername && opUsername !== req.user.username.toLowerCase()) {
      const opFilesTable = opUsername === 'admin' ? 'files' : `files_${opUsername}`;
      const opShipmentsTable = opUsername === 'admin' ? 'shipments' : `shipments_${opUsername}`;

      // Query operator shipments table to see if we have individual recipient shipments for this cust_req_no
      const opShipmentsRes = await db.query(
        `SELECT ref_no FROM ${opShipmentsTable} WHERE cust_req_no = $1`,
        [ref_no]
      );

      if (opShipmentsRes.rows.length > 0) {
        for (const opShipment of opShipmentsRes.rows) {
          await db.query(
            `INSERT INTO ${opFilesTable} (shipment_ref_no, filename, original_name, file_path, mime_type, size_bytes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [opShipment.ref_no, filename, originalname, relativePath, mimetype, size]
          );
        }
      } else {
        // Fallback to inserting with original ref_no if no sub-shipments found
        await db.query(
          `INSERT INTO ${opFilesTable} (shipment_ref_no, filename, original_name, file_path, mime_type, size_bytes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [ref_no, filename, originalname, relativePath, mimetype, size]
        );
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/files/:ref_no
//  Lists all files attached to a shipment.
// ─────────────────────────────────────────────────────────────
const getFilesByRef = async (req, res, next) => {
  try {
    const result = await query(req,
      `SELECT id, shipment_ref_no, original_name, filename, file_path, mime_type, size_bytes, uploaded_at
       FROM files
       WHERE shipment_ref_no = $1
       ORDER BY uploaded_at DESC`,
      [req.params.ref_no]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/files/download/:id
//  Streams the file to the browser for inline viewing.
// ─────────────────────────────────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {
    const result = await query(req,
      'SELECT * FROM files WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file      = result.rows[0];
    const absPath   = path.resolve(process.cwd(), file.file_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk.' });
    }

    // inline = opens in browser; attachment = forces download
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/files/:id
//  Removes the DB record and the file from disk.
// ─────────────────────────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const result = await query(req,
      'DELETE FROM files WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file    = result.rows[0];
    const absPath = path.resolve(process.cwd(), file.file_path);

    // Best-effort disk cleanup
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    res.json({ success: true, message: 'File deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFile, getFilesByRef, downloadFile, deleteFile };
