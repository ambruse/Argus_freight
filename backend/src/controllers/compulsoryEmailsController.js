const db = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM compulsory_emails ORDER BY mode, country, email');
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  const { email, dear_who, mode, country, is_active } = req.body;
  if (!email || !dear_who || !mode) {
    return res.status(400).json({ success: false, message: 'Email, mode, and dear_who are required.' });
  }

  try {
    const active = typeof is_active === 'boolean' ? is_active : true;
    const finalCountry = country && country.trim() ? country.trim() : 'Qatar';
    const result = await db.query(
      `INSERT INTO compulsory_emails (email, dear_who, mode, country, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, dear_who, mode, finalCountry, active]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'This email is already added for this mode and country.' });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const { id } = req.params;
  const { email, dear_who, mode, country, is_active } = req.body;

  try {
    const result = await db.query(
      `UPDATE compulsory_emails 
       SET email = COALESCE($1, email),
           dear_who = COALESCE($2, dear_who),
           mode = COALESCE($3, mode),
           country = COALESCE($4, country),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [email, dear_who, mode, country ? country.trim() : null, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Compulsory email not found.' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'This email is already added for this mode and country.' });
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM compulsory_emails WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Compulsory email not found.' });
    }

    res.json({
      success: true,
      message: 'Compulsory email removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};
