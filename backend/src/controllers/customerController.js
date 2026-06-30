// src/controllers/customerController.js
const db = require('../config/db');

// ── GET /api/customers ───────────────────────────────────────
// Returns all users who are customers, along with their details
const getAllCustomers = async (req, res, next) => {
  try {
    // Only allow admin, operator, sales to access
    if (!['admin', 'operator', 'sales'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }

    const result = await db.query(
      `SELECT id, username, name, email_address, contact_number, customer_id, 
              address, company, company_address, secondary_phone, created_at 
       FROM users 
       WHERE role = 'customer' 
       ORDER BY created_at DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/customers/:id ───────────────────────────────────
// Updates a customer's details (Admin only)
const updateCustomerByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email_address, contact_number, address, company, company_address, secondary_phone } = req.body;

    // Check if the user exists and is a customer
    const userCheck = await db.query('SELECT role, customer_id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (userCheck.rows[0].role !== 'customer') {
      return res.status(400).json({ success: false, message: 'User is not a customer.' });
    }

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email_address = COALESCE($2, email_address),
           contact_number = COALESCE($3, contact_number),
           address = $4,
           company = $5,
           company_address = $6,
           secondary_phone = $7
       WHERE id = $8
       RETURNING id, username, name, email_address, contact_number, customer_id, 
                 address, company, company_address, secondary_phone, created_at`,
      [
        name || null,
        email_address || null,
        contact_number || null,
        address || null,
        company || null,
        company_address || null,
        secondary_phone || null,
        id
      ]
    );

    const updatedUser = result.rows[0];

    // Keep name synced in customers table
    if (updatedUser.customer_id) {
      await db.query(
        `UPDATE customers 
         SET name = $1 
         WHERE customer_id = $2`,
        [updatedUser.name, updatedUser.customer_id]
      );
    }

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/customers/:id ────────────────────────────────
// Deletes a customer's user account and customer record (Admin only)
const deleteCustomerByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get customer_id first to delete from customers table too
    const userCheck = await db.query('SELECT customer_id, username FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const { customer_id, username } = userCheck.rows[0];

    // Delete user
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Delete customer
    if (customer_id) {
      await db.query('DELETE FROM customers WHERE customer_id = $1', [customer_id]);
    }

    // Drop sandbox tables if they exist
    const suffix = username.toLowerCase();
    await db.query(`DROP TABLE IF EXISTS shipment_replies_${suffix}`);
    await db.query(`DROP TABLE IF EXISTS files_${suffix}`);
    await db.query(`DROP TABLE IF EXISTS shipments_${suffix}`);

    res.json({ success: true, message: 'Customer account deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCustomers, updateCustomerByAdmin, deleteCustomerByAdmin };
