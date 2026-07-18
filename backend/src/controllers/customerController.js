// src/controllers/customerController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


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
           email_address = $2,
           contact_number = $3,
           address = $4,
           company = $5,
           company_address = $6,
           secondary_phone = $7
       WHERE id = $8
       RETURNING id, username, name, email_address, contact_number, customer_id, 
                 address, company, company_address, secondary_phone, created_at`,
      [
        name || null,
        email_address ? email_address.trim() : null,
        contact_number ? contact_number.trim() : null,
        address ? address.trim() : null,
        company ? company.trim() : null,
        company_address ? company_address.trim() : null,
        secondary_phone ? secondary_phone.trim() : null,
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

// ── POST /api/customers ──────────────────────────────────────
// Creates a new customer (Admin, Operator, Sales)
const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      email_address,
      contact_number,
      address,
      company,
      company_address,
      secondary_phone,
      create_account,
      username,
      password
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }

    // Check if customer with the same name already exists
    const nameCheck = await db.query(
      'SELECT id FROM customers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A customer with this name already exists.' });
    }

    let finalCustomerId = null;
    let uniqueCidFound = false;
    let cAttempts = 0;
    while (!uniqueCidFound && cAttempts < 10) {
      const newCid = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit
      const checkCid = await db.query('SELECT id FROM users WHERE customer_id = $1', [newCid]);
      const checkCustCid = await db.query('SELECT id FROM customers WHERE customer_id = $1', [newCid]);
      if (checkCid.rows.length === 0 && checkCustCid.rows.length === 0) {
        finalCustomerId = newCid;
        uniqueCidFound = true;
      } else {
        cAttempts++;
      }
    }

    if (!finalCustomerId) {
      return res.status(500).json({ success: false, message: 'Failed to generate a unique Customer ID. Please try again.' });
    }

    let finalUsername;
    let finalHash;

    if (create_account) {
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required when creating an account.' });
      }

      // Check if username is already taken
      const checkUser = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
      if (checkUser.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }

      finalUsername = username.trim();
      finalHash = await bcrypt.hash(password, 10);
    } else {
      // Create a dummy unique username and a random password hash
      finalUsername = `cust_${finalCustomerId}`;
      const randomPassword = crypto.randomBytes(32).toString('hex');
      finalHash = await bcrypt.hash(randomPassword, 10);
    }

    // Insert into customers table
    await db.query(
      'INSERT INTO customers (customer_id, name) VALUES ($1, $2)',
      [finalCustomerId, name.trim()]
    );

    // Insert into users table
    const result = await db.query(
      `INSERT INTO users (
        username, password_hash, role, name, email_address, contact_number, 
        customer_id, address, company, company_address, secondary_phone
      ) VALUES ($1, $2, 'customer', $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id, username, name, email_address, contact_number, customer_id, 
                address, company, company_address, secondary_phone, created_at`,
      [
        finalUsername,
        finalHash,
        name.trim(),
        email_address ? email_address.trim() : null,
        contact_number ? contact_number.trim() : null,
        finalCustomerId,
        address ? address.trim() : null,
        company ? company.trim() : null,
        company_address ? company_address.trim() : null,
        secondary_phone ? secondary_phone.trim() : null
      ]
    );

    const newCustomer = result.rows[0];

    // Create user-specific sandbox tables
    const suffix = finalUsername.toLowerCase();
    await db.query(`CREATE TABLE IF NOT EXISTS shipments_${suffix} (LIKE shipments INCLUDING ALL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS files_${suffix} (LIKE files INCLUDING ALL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${suffix} (LIKE shipment_replies INCLUDING ALL)`);

    // Recreate foreign keys
    await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_${suffix}_shipment_ref_no_fkey`);
    await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey`);
    await db.query(`ALTER TABLE files_${suffix} ADD CONSTRAINT files_${suffix}_shipment_ref_no_fkey FOREIGN KEY (shipment_ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

    await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_${suffix}_ref_no_fkey`);
    await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey`);
    await db.query(`ALTER TABLE shipment_replies_${suffix} ADD CONSTRAINT shipment_replies_${suffix}_ref_no_fkey FOREIGN KEY (ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

    res.status(201).json({ success: true, data: newCustomer });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCustomers, updateCustomerByAdmin, deleteCustomerByAdmin, createCustomer };
