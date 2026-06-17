const db = require('../config/db');

// GET /api/customers
const getAllCustomers = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCustomers };
