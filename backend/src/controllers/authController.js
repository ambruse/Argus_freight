// src/controllers/authController.js
// ─────────────────────────────────────────────────────────────
//  Handles user login and returns a signed JWT.
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { success, token, user: { id, username, role } }
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Look up user by username (case-insensitive)
    const result = await db.query(
      'SELECT id, username, password_hash, role, is_stalled, name, email_address, contact_number, customer_id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    // Compare provided password with stored bcrypt hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check if user account is stalled
    if (user.is_stalled) {
      return res.status(403).json({ success: false, message: 'Your account is stalled. Please contact ARGUS Shipping or Admin.' });
    }

    // Sign JWT — expires per .env (default 8h)
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name,
        email_address: user.email_address,
        contact_number: user.contact_number,
        customer_id: user.customer_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Ensure operator sandbox tables exist on login (for users registered before sandboxing, etc.)
    const cleanUsername = user.username.toLowerCase();
    if (user.role !== 'admin' && cleanUsername !== 'admin') {
      const suffix = cleanUsername;
      await db.query(`CREATE TABLE IF NOT EXISTS shipments_${suffix} (LIKE shipments INCLUDING ALL)`);
      await db.query(`CREATE TABLE IF NOT EXISTS files_${suffix} (LIKE files INCLUDING ALL)`);
      await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${suffix} (LIKE shipment_replies INCLUDING ALL)`);

      await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_${suffix}_shipment_ref_no_fkey`);
      await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey`);
      await db.query(`ALTER TABLE files_${suffix} ADD CONSTRAINT files_${suffix}_shipment_ref_no_fkey FOREIGN KEY (shipment_ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

      await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_${suffix}_ref_no_fkey`);
      await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey`);
      await db.query(`ALTER TABLE shipment_replies_${suffix} ADD CONSTRAINT shipment_replies_${suffix}_ref_no_fkey FOREIGN KEY (ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

      // Seed initial data only for the 'jabir' user if their shipments table is completely empty
      if (cleanUsername === 'jabir') {
        const checkCount = await db.query(`SELECT COUNT(*) FROM shipments_${suffix}`);
        if (parseInt(checkCount.rows[0].count, 10) === 0) {
          await db.query(`INSERT INTO shipments_${suffix} SELECT * FROM shipments ON CONFLICT DO NOTHING`);
          await db.query(`INSERT INTO files_${suffix} SELECT * FROM files ON CONFLICT DO NOTHING`);
          await db.query(`INSERT INTO shipment_replies_${suffix} SELECT * FROM shipment_replies ON CONFLICT DO NOTHING`);
        }
      }
    }

    res.json({
      success: true,
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        name: user.name,
        email_address: user.email_address,
        contact_number: user.contact_number,
        customer_id: user.customer_id
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-password
 * Body: { password }
 * Requires Token
 */
const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const isValid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    res.json({ success: true, message: 'Password verified.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Requires Token
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Incorrect current password.' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns current user info from token (no DB round-trip needed).
 */
const me = async (req, res, next) => {
  try {
    const result = await db.query('SELECT is_stalled FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length > 0 && result.rows[0].is_stalled) {
      return res.status(403).json({ success: false, message: 'Your account has been stalled/suspended.' });
    }
    res.json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register
 * Body: { newUsername, newPassword, role, adminUsername, adminPassword }
 * Public endpoint (creates new user if authorized by an admin)
 */
const register = async (req, res, next) => {
  try {
    const { newUsername, newPassword, role, name, email_address, contact_number, adminUsername, adminPassword, agent_extension } = req.body;

    if (role === 'customer') {
      if (!newUsername || !newPassword || !name || !email_address || !contact_number) {
        return res.status(400).json({ success: false, message: 'All fields (Name, Mail Address, Contact Number, Username, Password) are required for Customer registration.' });
      }
    } else {
      if (!newUsername || !newPassword || !adminUsername || !adminPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      // 1. Authenticate the Admin
      const adminRes = await db.query(
        'SELECT password_hash, role FROM users WHERE LOWER(username) = LOWER($1)',
        [adminUsername]
      );

      if (adminRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Admin authorization failed. Admin not found.' });
      }

      const adminUser = adminRes.rows[0];
      if (adminUser.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Authorization failed. User is not an admin.' });
      }

      const isAdminValid = await bcrypt.compare(adminPassword, adminUser.password_hash);
      if (!isAdminValid) {
        return res.status(401).json({ success: false, message: 'Admin authorization failed. Incorrect password.' });
      }
    }

    // 2. Check if new username already exists
    const existingRes = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [newUsername]
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return res.status(400).json({ success: false, message: 'Username must be alphanumeric and can only contain underscores.' });
    }

    // 3. Create new user
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const validRoles = ['admin', 'sales', 'operator', 'calling_agent', 'customer'];
    const newRole = validRoles.includes(role) ? role : 'operator';

    let finalCustomerId = null;
    if (newRole === 'customer') {
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

      // Also insert into customers table
      await db.query(
        'INSERT INTO customers (customer_id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [finalCustomerId, name]
      );
    }

    const insertRes = await db.query(
      'INSERT INTO users (username, password_hash, role, name, email_address, contact_number, customer_id, agent_extension) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, role, customer_id',
      [newUsername, newHash, newRole, name || null, email_address || null, contact_number || null, finalCustomerId, agent_extension || null]
    );

    // 4. Create and seed user-specific tables
    const cleanUsername = newUsername.toLowerCase();
    if (cleanUsername !== 'admin') {
      const suffix = cleanUsername;
      
      // Create tables
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

      // Seed initial data only for the 'jabir' user as specifically requested
      if (cleanUsername === 'jabir') {
        await db.query(`INSERT INTO shipments_${suffix} SELECT * FROM shipments ON CONFLICT DO NOTHING`);
        await db.query(`INSERT INTO files_${suffix} SELECT * FROM files ON CONFLICT DO NOTHING`);
        await db.query(`INSERT INTO shipment_replies_${suffix} SELECT * FROM shipment_replies ON CONFLICT DO NOTHING`);
      }
    }

    res.status(201).json({ success: true, message: 'Account created successfully.', user: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/email-settings
 * Requires Token
 */
const getEmailSettings = async (req, res, next) => {
  try {
    const userRes = await db.query("SELECT email_address, email_password FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRes.rows[0];

    res.json({
      success: true,
      data: {
        email_address: user.email_address || "",
        has_password: !!user.email_password
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/email-settings
 * Requires Token
 */
const updateEmailSettings = async (req, res, next) => {
  try {
    const { email_address, email_password } = req.body;

    if (!email_address || email_address.trim() === '') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    // Resolve credentials to test connection
    const host = process.env.IMAP_HOST || 'imap.gmail.com';
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const testUser = email_address.trim();
    let testPass = email_password ? email_password.trim() : '';

    if (!testPass) {
      // Fetch existing password from database
      const userRes = await db.query("SELECT email_password FROM users WHERE id = $1", [req.user.id]);
      if (userRes.rows.length > 0) {
        testPass = userRes.rows[0].email_password || '';
      }
    }

    if (!testPass) {
      return res.status(400).json({ success: false, message: 'App password is required.' });
    }

    // Test connection using ImapFlow
    const { ImapFlow } = require('imapflow');
    const testClient = new ImapFlow({
      host,
      port,
      secure: true,
      auth: {
        user: testUser,
        pass: testPass,
      },
      logger: false,
    });

    try {
      await testClient.connect();
      await testClient.logout();
    } catch (connErr) {
      console.error('[Email Settings Verification] Test connection failed:', connErr.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to connect to the email server. Please check that your email address and app password are correct.'
      });
    }

    // Save verified credentials to users table
    await db.query(
      `UPDATE users SET email_address = $1, email_password = $2 WHERE id = $3`,
      [email_address.trim(), testPass, req.user.id]
    );

    // Trigger IMAP Reconnection
    const { startImapService } = require('../services/imapService');
    try {
      startImapService();
    } catch (imapErr) {
      console.error('Error restarting IMAP after credentials change:', imapErr);
    }

    res.json({ success: true, message: 'Email credentials verified and updated successfully.' });
  } catch (err) {
    next(err);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const result = await db.query(
      `SELECT id, username, role, email_address, is_stalled, agent_extension,
              (email_password IS NOT NULL AND email_password != '') as has_password
       FROM users 
       ORDER BY role, username`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const updateAdminUserEmail = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { userId, email_address, email_password, action } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const userCheck = await db.query("SELECT username, email_password FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userCheck.rows[0];

    if (action === 'remove') {
      await db.query(
        `UPDATE users SET email_address = NULL, email_password = NULL WHERE id = $1`,
        [userId]
      );
      // Trigger IMAP Reconnection
      const { startImapService } = require('../services/imapService');
      try {
        startImapService();
      } catch (imapErr) {
        console.error('Error restarting IMAP after credentials removal:', imapErr);
      }
      return res.json({ success: true, message: `Email credentials for user ${targetUser.username} removed successfully.` });
    }

    if (!email_address || email_address.trim() === '') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    let testPass = email_password ? email_password.trim() : '';
    if (!testPass) {
      testPass = targetUser.email_password || '';
    }

    if (!testPass) {
      return res.status(400).json({ success: false, message: 'App password is required.' });
    }

    const host = process.env.IMAP_HOST || 'imap.gmail.com';
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const { ImapFlow } = require('imapflow');
    const testClient = new ImapFlow({
      host,
      port,
      secure: true,
      auth: {
        user: email_address.trim(),
        pass: testPass,
      },
      logger: false,
    });

    try {
      await testClient.connect();
      await testClient.logout();
    } catch (connErr) {
      console.error('[Admin Email Settings Verification] Test connection failed:', connErr.message);
      return res.status(400).json({
        success: false,
        message: `Failed to connect to the email server for user ${targetUser.username}. Please check that the email address and app password are correct.`
      });
    }

    await db.query(
      `UPDATE users SET email_address = $1, email_password = $2 WHERE id = $3`,
      [email_address.trim(), testPass, userId]
    );

    const { startImapService } = require('../services/imapService');
    try {
      startImapService();
    } catch (imapErr) {
      console.error('Error restarting IMAP after admin credentials update:', imapErr);
    }

    res.json({ success: true, message: `Email credentials for user ${targetUser.username} verified and updated successfully.` });
  } catch (err) {
    next(err);
  }
};

const getOperatorsList = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT username, email_address FROM users 
       WHERE role = 'operator' 
         AND email_address IS NOT NULL 
         AND email_address != ''
       ORDER BY username`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

const createAdminOperator = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { username, password, email_address, email_password } = req.body;

    if (!username || !password || !email_address || !email_password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if username already exists
    const existingRes = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ success: false, message: 'Username must be alphanumeric and can only contain underscores.' });
    }

    // Test connection using ImapFlow
    const host = process.env.IMAP_HOST || 'imap.gmail.com';
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const { ImapFlow } = require('imapflow');
    const testClient = new ImapFlow({
      host,
      port,
      secure: true,
      auth: {
        user: email_address.trim(),
        pass: email_password.trim(),
      },
      logger: false,
    });

    try {
      await testClient.connect();
      await testClient.logout();
    } catch (connErr) {
      console.error('[Admin Operator Creation Email Verification] Test connection failed:', connErr.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to connect to the email server. Please check that the email address and app password are correct.'
      });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertRes = await db.query(
      `INSERT INTO users (username, password_hash, role, email_address, email_password) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, role, email_address`,
      [username, passwordHash, 'operator', email_address.trim(), email_password.trim()]
    );

    // Create sandbox tables for this new operator
    const cleanUsername = username.toLowerCase();
    const suffix = cleanUsername;
    await db.query(`CREATE TABLE IF NOT EXISTS shipments_${suffix} (LIKE shipments INCLUDING ALL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS files_${suffix} (LIKE files INCLUDING ALL)`);
    await db.query(`CREATE TABLE IF NOT EXISTS shipment_replies_${suffix} (LIKE shipment_replies INCLUDING ALL)`);

    await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_${suffix}_shipment_ref_no_fkey`);
    await db.query(`ALTER TABLE files_${suffix} DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey`);
    await db.query(`ALTER TABLE files_${suffix} ADD CONSTRAINT files_${suffix}_shipment_ref_no_fkey FOREIGN KEY (shipment_ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

    await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_${suffix}_ref_no_fkey`);
    await db.query(`ALTER TABLE shipment_replies_${suffix} DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey`);
    await db.query(`ALTER TABLE shipment_replies_${suffix} ADD CONSTRAINT shipment_replies_${suffix}_ref_no_fkey FOREIGN KEY (ref_no) REFERENCES shipments_${suffix}(ref_no) ON DELETE CASCADE`);

    // Trigger IMAP Reconnection
    const { startImapService } = require('../services/imapService');
    try {
      startImapService();
    } catch (imapErr) {
      console.error('Error restarting IMAP after operator creation:', imapErr);
    }

    res.status(201).json({ success: true, message: 'Operator created and verified successfully.', user: insertRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteAdminUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const userCheck = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userCheck.rows[0];

    // Delete user
    await db.query("DELETE FROM users WHERE id = $1", [userId]);

    res.json({ success: true, message: `User ${targetUser.username} removed successfully.` });
  } catch (err) {
    next(err);
  }
};

const toggleStallUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    if (req.user.id === parseInt(userId, 10)) {
      return res.status(400).json({ success: false, message: 'You cannot stall your own account.' });
    }

    const userCheck = await db.query("SELECT username, is_stalled FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userCheck.rows[0];
    const newStalledState = !targetUser.is_stalled;

    await db.query("UPDATE users SET is_stalled = $1 WHERE id = $2", [newStalledState, userId]);

    res.json({ 
      success: true, 
      message: `User ${targetUser.username} has been ${newStalledState ? 'stalled' : 'activated'} successfully.`,
      is_stalled: newStalledState 
    });
  } catch (err) {
    next(err);
  }
};

const updateUserExtension = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { userId, agent_extension } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    await db.query(
      "UPDATE users SET agent_extension = $1 WHERE id = $2",
      [agent_extension ? agent_extension.trim() : null, userId]
    );
    res.json({ success: true, message: 'Agent extension updated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  login, me, verifyPassword, changePassword, register, getEmailSettings, updateEmailSettings,
  getAdminUsers, updateAdminUserEmail, getOperatorsList, createAdminOperator, deleteAdminUser, toggleStallUser,
  updateUserExtension
};
