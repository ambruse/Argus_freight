// src/controllers/authController.js
// ─────────────────────────────────────────────────────────────
//  Handles user login and returns a signed JWT.
// ─────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { encrypt, decrypt } = require('../utils/crypto');

// Generate ephemeral 2048-bit RSA keypair for password transit encryption
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

const getPublicKey = async (req, res, next) => {
  try {
    res.json({ success: true, publicKey });
  } catch (err) {
    next(err);
  }
};

const decryptPassword = (password) => {
  if (!password) return '';
  // A 2048-bit RSA encrypted ciphertext encoded in Base64 is exactly 344 characters long.
  if (password.length !== 344) {
    return password;
  }
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(password, 'base64')
    );
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Password decryption failed, falling back to raw value:', err.message);
    return password;
  }
};


/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { success, token, user: { id, username, role } }
 */
const login = async (req, res, next) => {
  try {
    let { username, password } = req.body;
    password = decryptPassword(password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Look up user by username or email (case-insensitive)
    const result = await db.query(
      `SELECT id, username, password_hash, role, is_stalled, name, email_address, contact_number, customer_id, country 
       FROM users 
       WHERE (LOWER(username) = LOWER($1) OR LOWER(email_address) = LOWER($1)) 
         AND (is_deleted IS NOT TRUE)`,
      [username.trim()]
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
        customer_id: user.customer_id,
        country: user.country || 'Qatar'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Ensure operator sandbox tables exist on login (for users registered before sandboxing, etc.)
    const cleanUsername = user.username.toLowerCase();
    if (user.role !== 'admin' && cleanUsername !== 'admin') {
      const { ensureUserTables } = require('../config/dbHelper');
      await ensureUserTables(user);

      // Seed initial data only for the 'jabir' user if their shipments table is completely empty
      if (cleanUsername === 'jabir') {
        const checkCount = await db.query(`SELECT COUNT(*) as cnt FROM shipments_u${user.id}`);
        if (parseInt(checkCount.rows[0].cnt, 10) === 0) {
          await db.query(`INSERT INTO shipments_u${user.id} SELECT * FROM shipments ON CONFLICT DO NOTHING`);
          await db.query(`INSERT INTO files_u${user.id} SELECT * FROM files ON CONFLICT DO NOTHING`);
          await db.query(`INSERT INTO shipment_replies_u${user.id} SELECT * FROM shipment_replies ON CONFLICT DO NOTHING`);
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
        customer_id: user.customer_id,
        country: user.country || 'Qatar'
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
    let { password } = req.body;
    password = decryptPassword(password);
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
    let { currentPassword, newPassword } = req.body;
    currentPassword = decryptPassword(currentPassword);
    newPassword = decryptPassword(newPassword);
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long and contain both letters and numbers.' });
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
    const result = await db.query(
      'SELECT id, username, role, name, email_address, contact_number, customer_id, country, is_stalled FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    const dbUser = result.rows[0];
    if (dbUser.is_stalled) {
      return res.status(403).json({ success: false, message: 'Your account has been stalled/suspended.' });
    }
    res.json({ 
      success: true, 
      user: {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        name: dbUser.name,
        email_address: dbUser.email_address,
        contact_number: dbUser.contact_number,
        customer_id: dbUser.customer_id,
        country: dbUser.country
      }
    });
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
    let { newUsername, newPassword, role, name, email_address, contact_number, adminUsername, adminPassword, agent_extension, country } = req.body;
    newPassword = decryptPassword(newPassword);
    adminPassword = decryptPassword(adminPassword);

    if (!newUsername || !newPassword) {
      return res.status(400).json({ success: false, message: 'Username and Password are required.' });
    }

    if (!email_address || !email_address.trim()) {
      return res.status(400).json({ success: false, message: 'Email address (Gmail / Email) is compulsory for registration.' });
    }

    const emailTrimmed = email_address.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address format (e.g. name@gmail.com).' });
    }

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
    }

    if (role === 'customer') {
      if (!name || !contact_number) {
        return res.status(400).json({ success: false, message: 'All fields (Name, Email Address, Contact Number, Username, Password) are required for Customer registration.' });
      }
    } else {
      if (!adminUsername || !adminPassword) {
        return res.status(400).json({ success: false, message: 'Admin authorization username and password are required.' });
      }

      // 1. Authenticate the Admin
      const adminRes = await db.query(
        'SELECT password_hash, role FROM users WHERE LOWER(username) = LOWER($1) AND (is_deleted IS NOT TRUE)',
        [adminUsername.trim()]
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

    // 2. Check if new username already exists among active users (Strictly no two usernames can ever be the same)
    const existingRes = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND (is_deleted IS NOT TRUE)',
      [newUsername.trim()]
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username is already taken. No two accounts can have the same username.' });
    }

    // 3. Check if email already exists among active users
    const existingEmailRes = await db.query(
      'SELECT id FROM users WHERE LOWER(email_address) = LOWER($1) AND (is_deleted IS NOT TRUE)',
      [emailTrimmed]
    );
    if (existingEmailRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername.trim())) {
      return res.status(400).json({ success: false, message: 'Username must be alphanumeric and can only contain underscores.' });
    }

    // 3. Create new user
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const validRoles = ['admin', 'sales', 'operator', 'calling_agent', 'customer'];
    const newRole = validRoles.includes(role) ? role : 'operator';

    let finalCustomerId = null;
    if (newRole === 'customer' || newRole === 'sales') {
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

      const finalCountry = country && country.trim() ? country.trim() : 'Qatar';
      // Also insert into customers table
      await db.query(
        'INSERT INTO customers (customer_id, name, country) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET country = EXCLUDED.country',
        [finalCustomerId, name || newUsername, finalCountry]
      );
    }

    const finalCountry = country && country.trim() ? country.trim() : 'Qatar';
    const insertRes = await db.query(
      'INSERT INTO users (username, password_hash, role, name, email_address, contact_number, customer_id, agent_extension, country) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, role, customer_id, country',
      [newUsername, newHash, newRole, name || null, email_address || null, contact_number || null, finalCustomerId, agent_extension || null, finalCountry]
    );

    // 4. Create and seed user-specific tables
    const newUser = insertRes.rows[0];
    const cleanUsername = newUsername.toLowerCase();
    if (cleanUsername !== 'admin') {
      const { ensureUserTables } = require('../config/dbHelper');
      await ensureUserTables(newUser);

      // Seed initial data only for the 'jabir' user as specifically requested
      if (cleanUsername === 'jabir') {
        await db.query(`INSERT INTO shipments_u${newUser.id} SELECT * FROM shipments ON CONFLICT DO NOTHING`);
        await db.query(`INSERT INTO files_u${newUser.id} SELECT * FROM files ON CONFLICT DO NOTHING`);
        await db.query(`INSERT INTO shipment_replies_u${newUser.id} SELECT * FROM shipment_replies ON CONFLICT DO NOTHING`);
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
    if (req.user.role === 'customer' || req.user.role === 'sales') {
      return res.status(400).json({ success: false, message: 'User SMTP credentials are not needed for Customer and Sales roles.' });
    }
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
        testPass = decrypt(userRes.rows[0].email_password || '');
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
      [email_address.trim(), encrypt(testPass), req.user.id]
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
      `SELECT id, username, role, name, email_address, contact_number, country, is_stalled, agent_extension,
              (email_password IS NOT NULL AND email_password != '') as has_password
       FROM users 
       WHERE (is_deleted IS NOT TRUE)
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

    const userCheck = await db.query("SELECT username, role, email_password FROM users WHERE id = $1 AND (is_deleted IS NOT TRUE)", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userCheck.rows[0];

    if (targetUser.role === 'customer' || targetUser.role === 'sales') {
      return res.status(400).json({ success: false, message: 'User SMTP credentials are not needed for Customer and Sales roles.' });
    }

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
      testPass = decrypt(targetUser.email_password || '');
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
      [email_address.trim(), encrypt(testPass), userId]
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
      `SELECT username, email_address, country FROM users 
       WHERE role = 'operator' 
         AND (is_deleted IS NOT TRUE)
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
    let { username, password, email_address, email_password, country } = req.body;
    password = decryptPassword(password);

    if (!username || !password || !email_address || !email_password) {
      return res.status(400).json({ success: false, message: 'All fields (Username, Password, Email Address, App Password) are required.' });
    }

    const emailTrimmed = email_address.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address format (e.g. name@gmail.com).' });
    }

    // Check if username already exists among active users (Strictly no duplicate usernames)
    const existingRes = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND (is_deleted IS NOT TRUE)',
      [username.trim()]
    );
    if (existingRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username is already taken. No two accounts can have the same username.' });
    }

    // Check if email already exists among active users
    const existingEmailRes = await db.query(
      'SELECT id FROM users WHERE LOWER(email_address) = LOWER($1) AND (is_deleted IS NOT TRUE)',
      [emailTrimmed]
    );
    if (existingEmailRes.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
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
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const finalCountry = country && country.trim() ? country.trim() : 'Qatar';
    // Insert user
    const insertRes = await db.query(
      `INSERT INTO users (username, password_hash, role, email_address, email_password, country) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, role, email_address, country`,
      [username, passwordHash, 'operator', email_address.trim(), encrypt(email_password.trim()), finalCountry]
    );

    // Create sandbox tables for this new operator
    const newOp = insertRes.rows[0];
    const { ensureUserTables } = require('../config/dbHelper');
    await ensureUserTables(newOp);

    // Trigger IMAP Reconnection
    const { startImapService } = require('../services/imapService');
    try {
      startImapService();
    } catch (imapErr) {
      console.error('Error restarting IMAP after operator creation:', imapErr);
    }

    res.status(201).json({ success: true, message: 'Operator created and verified successfully.', user: newOp });
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

    const userCheck = await db.query("SELECT username FROM users WHERE id = $1 AND (is_deleted IS NOT TRUE)", [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const targetUser = userCheck.rows[0];

    // Soft delete user: preserve all historical sandbox tables & data for Admin view
    await db.query(
      "UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), username = CONCAT(username, '__deleted_', id) WHERE id = $1",
      [userId]
    );

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

const updateUserCountry = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }
    const { userId, country } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    const targetCountry = country && country.trim() ? country.trim() : 'Qatar';
    await db.query(
      "UPDATE users SET country = $1 WHERE id = $2",
      [targetCountry, userId]
    );

    // Sync with customers table if user is a customer
    const userCheck = await db.query("SELECT customer_id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].customer_id) {
      await db.query("UPDATE customers SET country = $1 WHERE customer_id = $2", [targetCountry, userCheck.rows[0].customer_id]);
    }

    res.json({ success: true, message: 'Country updated successfully.' });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email_address, contact_number, address, company, company_address, secondary_phone } = req.body;
    
    // Update users table
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
       RETURNING id, username, role, name, email_address, contact_number, customer_id, address, company, company_address, secondary_phone`,
      [
        name || null,
        email_address || null,
        contact_number || null,
        address || null,
        company || null,
        company_address || null,
        secondary_phone || null,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedUser = result.rows[0];

    // If it's a customer, we should also update the customers table
    if (updatedUser.role === 'customer' && updatedUser.customer_id) {
      await db.query(
        `UPDATE customers 
         SET name = $1 
         WHERE customer_id = $2`,
        [updatedUser.name, updatedUser.customer_id]
      );
    }

    res.json({ success: true, message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, username, role, name, email_address, contact_number, customer_id, 
              address, company, company_address, secondary_phone, created_at 
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

const getSignature = async (req, res, next) => {
  try {
    const userRes = await db.query("SELECT email_signature FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({
      success: true,
      signature: userRes.rows[0].email_signature || ""
    });
  } catch (err) {
    next(err);
  }
};

const updateSignature = async (req, res, next) => {
  try {
    const { signature } = req.body;
    await db.query("UPDATE users SET email_signature = $1 WHERE id = $2", [signature || null, req.user.id]);
    res.json({ success: true, message: 'Signature updated successfully.' });
  } catch (err) {
    next(err);
  }
};

const getSalesList = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, username, name, email_address, contact_number, customer_id FROM users 
       WHERE role = 'sales' 
         AND (is_deleted IS NOT TRUE)
       ORDER BY username`
    );
    const users = result.rows;
    for (let user of users) {
      if (!user.customer_id) {
        let uniqueCidFound = false;
        let cAttempts = 0;
        let newCid = null;
        while (!uniqueCidFound && cAttempts < 10) {
          const generatedCid = Math.floor(10000 + Math.random() * 90000).toString();
          const checkCid = await db.query('SELECT id FROM users WHERE customer_id = $1', [generatedCid]);
          const checkCustCid = await db.query('SELECT id FROM customers WHERE customer_id = $1', [generatedCid]);
          if (checkCid.rows.length === 0 && checkCustCid.rows.length === 0) {
            newCid = generatedCid;
            uniqueCidFound = true;
          } else {
            cAttempts++;
          }
        }
        if (newCid) {
          await db.query('UPDATE users SET customer_id = $1 WHERE id = $2', [newCid, user.id]);
          await db.query('INSERT INTO customers (customer_id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [newCid, user.name || user.username]);
          user.customer_id = newCid;
        }
      }
    }
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
//  Password Reset Functions with Per-Account Rate Limiting
// ─────────────────────────────────────────────────────────────

const getAppSetting = async (key) => {
  try {
    const res = await db.query("SELECT value FROM app_settings WHERE `key` = $1", [key]);
    return res.rows.length > 0 ? res.rows[0].value : null;
  } catch (e) {
    return null;
  }
};

const setAppSetting = async (key, value) => {
  const check = await db.query("SELECT `key` FROM app_settings WHERE `key` = $1", [key]);
  if (check.rows.length > 0) {
    await db.query("UPDATE app_settings SET value = $1 WHERE `key` = $2", [value, key]);
  } else {
    await db.query("INSERT INTO app_settings (`key`, value) VALUES ($1, $2)", [key, value]);
  }
};

const createPasswordResetTransporter = async () => {
  // 1. Check custom reset email settings configured by admin in app_settings
  try {
    const customEmail = await getAppSetting('reset_email_address');
    const customPassEnc = await getAppSetting('reset_email_password');
    if (customEmail && customPassEnc) {
      const customPass = decrypt(customPassEnc);
      if (customPass) {
        return {
          transporter: nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
              user: customEmail,
              pass: customPass
            },
            tls: { rejectUnauthorized: false }
          }),
          user: customEmail
        };
      }
    }
  } catch (e) {
    console.warn('[PasswordReset] Failed to load app_settings reset email:', e.message);
  }

  // 2. Fallback to admin user credentials in users table
  try {
    const adminRes = await db.query(
      `SELECT email_address, email_password FROM users WHERE role = 'admin' AND email_address IS NOT NULL AND email_password IS NOT NULL LIMIT 1`
    );
    if (adminRes.rows.length > 0 && adminRes.rows[0].email_address && adminRes.rows[0].email_password) {
      return {
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: adminRes.rows[0].email_address,
            pass: decrypt(adminRes.rows[0].email_password)
          },
          tls: { rejectUnauthorized: false }
        }),
        user: adminRes.rows[0].email_address
      };
    }
  } catch (e) {
    console.warn('[PasswordReset] Could not load admin credentials, falling back to environment:', e.message);
  }

  // 3. Fallback to environment variables
  const defaultUser = process.env.SMTP_USER || 'Argusdonotreply@gmail.com';
  return {
    transporter: nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: defaultUser,
        pass: process.env.SMTP_PASS || ''
      },
      tls: { rejectUnauthorized: false }
    }),
    user: defaultUser
  };
};

/**
 * GET /api/auth/admin/reset-email-settings
 * Admin only — get configured reset email address & presence of password
 */
const getAdminResetEmailSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const emailVal = await getAppSetting('reset_email_address');
    const passVal = await getAppSetting('reset_email_password');

    res.json({
      success: true,
      data: {
        email_address: emailVal || 'Argusdonotreply@gmail.com',
        has_password: !!passVal
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/admin/reset-email-settings
 * Admin only — verify & update reset email sender address and App Password
 */
const updateAdminResetEmailSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const { email_address, email_password } = req.body;
    if (!email_address || !email_address.trim()) {
      return res.status(400).json({ success: false, message: 'Reset sender email address is required.' });
    }

    const cleanEmail = email_address.trim().toLowerCase();
    let passToTest = email_password ? email_password.trim() : '';

    if (!passToTest) {
      // If not passed, use existing saved encrypted password
      const existingEnc = await getAppSetting('reset_email_password');
      if (existingEnc) {
        passToTest = decrypt(existingEnc);
      }
    }

    if (!passToTest) {
      return res.status(400).json({ success: false, message: 'App password is required.' });
    }

    // Verify SMTP connection via Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: cleanEmail,
        pass: passToTest
      },
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter.verify();
    } catch (smtpErr) {
      console.error('[Reset Email Settings] SMTP verification failed:', smtpErr.message);
      return res.status(400).json({
        success: false,
        message: 'SMTP authentication failed. Please verify that the email address and Google App Password are correct.'
      });
    }

    // Save to app_settings
    await setAppSetting('reset_email_address', cleanEmail);
    await setAppSetting('reset_email_password', encrypt(passToTest));

    res.json({
      success: true,
      message: 'Reset email sender credentials verified and saved successfully.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Implements per-email rate limiting (max 5/hr, max 20/day) & user enumeration prevention
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

    // Rate Limiting: Max 5 requests per hour for this email
    const hourCheck = await db.query(
      `SELECT COUNT(*) AS cnt FROM password_reset_tokens 
       WHERE LOWER(email) = LOWER($1) AND created_at >= NOW() - INTERVAL 1 HOUR`,
      [cleanEmail]
    );
    const countHour = parseInt(hourCheck.rows[0]?.cnt || 0, 10);
    if (countHour >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset requests for this email address. Please wait an hour before trying again.'
      });
    }

    // Rate Limiting: Max 20 requests per day for this email
    const dayCheck = await db.query(
      `SELECT COUNT(*) AS cnt FROM password_reset_tokens 
       WHERE LOWER(email) = LOWER($1) AND created_at >= NOW() - INTERVAL 24 HOUR`,
      [cleanEmail]
    );
    const countDay = parseInt(dayCheck.rows[0]?.cnt || 0, 10);
    if (countDay >= 20) {
      return res.status(429).json({
        success: false,
        message: 'Daily password reset request limit reached for this email address. Please try again tomorrow.'
      });
    }

    // Account Verification: Look up user in DB
    const userRes = await db.query(
      `SELECT id, username, email_address, name, role, is_stalled 
       FROM users 
       WHERE (LOWER(email_address) = LOWER($1) OR LOWER(username) = LOWER($1))
         AND (is_deleted IS NOT TRUE)
       LIMIT 1`,
      [cleanEmail]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      const targetEmail = user.email_address || (emailRegex.test(user.username) ? user.username : cleanEmail);

      // Generate cryptographically secure 32-byte reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Insert token into database with 30 minute expiration
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, email, token_hash, expires_at, ip_address)
         VALUES ($1, $2, $3, NOW() + INTERVAL 30 MINUTE, $4)`,
        [user.id, cleanEmail, tokenHash, ip]
      );

      // Construct Reset URL with domain argusshipping.co
      const clientBase = process.env.RESET_PASSWORD_BASE_URL || 'https://argusshipping.co';
      const resetUrl = `${clientBase.replace(/\/$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

      // Dispatch professional transactional HTML email
      try {
        const { transporter, user: senderEmail } = await createPasswordResetTransporter();
        const mailOptions = {
          from: `"ARGUS Shipping" <${senderEmail || 'Argusdonotreply@gmail.com'}>`,
          to: targetEmail,
          subject: 'ARGUS Shipping — Password Reset Request',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 0; }
                .container { max-width: 560px; margin: 40px auto; background: #131b2e; border: 1px solid rgba(245,176,55,0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
                .header { background: #0f172a; padding: 32px 40px; text-align: center; border-bottom: 1px solid rgba(245,176,55,0.2); }
                .header h1 { margin: 0; font-size: 24px; color: #F5B037; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; }
                .content { padding: 40px; color: #cbd5e1; font-size: 15px; line-height: 1.6; }
                .btn { display: inline-block; background: linear-gradient(135deg, #F5B037 0%, #D4831A 100%); color: #0b0f19 !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin: 24px 0; text-align: center; }
                .token-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 13px; color: #F5B037; word-break: break-all; margin: 12px 0 20px; }
                .footer { padding: 24px 40px; background: #0b0f19; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>ARGUS SHIPPING</h1>
                  <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 1px;">CARGO & FREIGHT MANAGEMENT</p>
                </div>
                <div class="content">
                  <p style="font-size: 17px; font-weight: 600; color: #f8fafc; margin-top: 0;">Hello ${user.name || user.username},</p>
                  <p>We received a request to reset the password for your ARGUS account associated with <strong>${cleanEmail}</strong>.</p>
                  <p>Click the button below to choose a new password. This reset link is valid for <strong>30 minutes</strong>.</p>
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
                  </div>
                  <p style="font-size: 13px; color: #94a3b8;">If the button above does not work, copy and paste this link into your browser:</p>
                  <div class="token-box">${resetUrl}</div>
                  <p style="font-size: 13px; color: #94a3b8;">Alternatively, you can manually enter your reset token on the reset page:</p>
                  <div class="token-box">${rawToken}</div>
                  <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">If you did not request this password reset, please ignore this email or contact support. Your password will remain unchanged.</p>
                </div>
                <div class="footer">
                  © ${new Date().getFullYear()} ARGUS Shipping · All rights reserved.<br />
                  This is an automated transactional security notification.
                </div>
              </div>
            </body>
            </html>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[PasswordReset] Reset email dispatched to ${targetEmail}`);
      } catch (mailErr) {
        console.error('[PasswordReset] Failed to deliver email:', mailErr.message);
      }
    } else {
      // Simulate constant execution delay to mitigate user enumeration timing attacks
      await new Promise(r => setTimeout(r, 150));
    }

    // Always respond with generic feedback to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link and token have been sent.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-reset-token
 * Body: { token }
 * Checks if a token is valid and not yet expired/used
 */
const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, valid: false, message: 'Password reset token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const tokenRes = await db.query(
      `SELECT t.id, t.user_id, t.email, t.expires_at, t.used_at, u.username
       FROM password_reset_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW()
       ORDER BY t.id DESC LIMIT 1`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    res.json({
      success: true,
      valid: true,
      email: tokenRes.rows[0].email,
      username: tokenRes.rows[0].username
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword, confirmPassword }
 * Updates password upon valid token verification and invalidates all user tokens
 */
const resetPassword = async (req, res, next) => {
  try {
    let { token, newPassword, confirmPassword } = req.body;
    newPassword = decryptPassword(newPassword);

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Password reset token is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    if (confirmPassword) {
      const decryptedConfirm = decryptPassword(confirmPassword);
      if (newPassword !== decryptedConfirm) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
      }
    }

    // Validate Password Complexity (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one uppercase letter.' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one lowercase letter.' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must contain at least one number.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Verify token validity
    const tokenRes = await db.query(
      `SELECT t.id, t.user_id, t.email, t.expires_at, t.used_at 
       FROM password_reset_tokens t
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > NOW()
       ORDER BY t.id DESC LIMIT 1`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This reset token is invalid or has expired. Please request a new password reset.'
      });
    }

    const resetRecord = tokenRes.rows[0];

    // Securely hash new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, resetRecord.user_id]
    );

    // Clear / invalidate all active reset tokens for this user
    await db.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1`,
      [resetRecord.user_id]
    );

    res.json({
      success: true,
      message: 'Your password has been successfully reset. Please sign in with your new password.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  login, me, verifyPassword, changePassword, register, getEmailSettings, updateEmailSettings,
  getAdminUsers, updateAdminUserEmail, getOperatorsList, getSalesList, createAdminOperator, deleteAdminUser, toggleStallUser,
  updateUserExtension, updateUserCountry, updateProfile, getProfile, getPublicKey, getSignature, updateSignature,
  forgotPassword, verifyResetToken, resetPassword,
  getAdminResetEmailSettings, updateAdminResetEmailSettings
};
