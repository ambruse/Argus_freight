// src/controllers/ccRecipientsController.js
// ─────────────────────────────────────────────────────────────
//  CRUD for the cc_recipients table.
//  GET   — any authenticated user (needed to populate RFQ chips)
//  POST  — admin only
//  PUT   — admin only
//  DELETE— admin only
// ─────────────────────────────────────────────────────────────
const db = require('../config/db');

/** GET /api/cc-recipients */
const getAll = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, multi_select FROM cc_recipients ORDER BY id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

/** POST /api/cc-recipients  (admin only) */
const create = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    const { name, email, multi_select } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
    const result = await db.query(
      'INSERT INTO cc_recipients (name, email, multi_select) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email.trim().toLowerCase(), !!multi_select]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'That email is already in the CC list.' });
    }
    next(err);
  }
};

/** PUT /api/cc-recipients/:id  (admin only) */
const update = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    const { id } = req.params;
    const { name, email, multi_select } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
    const result = await db.query(
      'UPDATE cc_recipients SET name = $1, email = $2, multi_select = $3 WHERE id = $4 RETURNING *',
      [name.trim(), email.trim().toLowerCase(), !!multi_select, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'CC recipient not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'That email is already in the CC list.' });
    }
    next(err);
  }
};

/** DELETE /api/cc-recipients/:id  (admin only) */
const remove = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM cc_recipients WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'CC recipient not found.' });
    }
    res.json({ success: true, message: 'CC recipient removed.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
