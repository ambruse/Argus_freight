// src/controllers/contactController.js
const db = require('../config/db');

// ── GET /api/contacts ────────────────────────────────────────
const getAllContacts = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contacts ───────────────────────────────────────
const createContact = async (req, res, next) => {
  try {
    const { email, dear_who, pol, pod, mode, country } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const result = await db.query(
      `INSERT INTO contacts (email, dear_who, pol, pod, mode, country) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (email, COALESCE(pol, ''), COALESCE(pod, ''), COALESCE(mode, '')) DO UPDATE SET
         dear_who = EXCLUDED.dear_who,
         country = EXCLUDED.country
       RETURNING *`,
      [email, dear_who || null, pol || null, pod || null, mode || null, country || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/contacts/:id ─────────────────────────────────
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    res.json({ success: true, message: 'Contact deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllContacts, createContact, deleteContact };
