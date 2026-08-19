// backend/server.js
// ─────────────────────────────────────────────────────────────
//  Freight & RFQ Management System — Express Entry Point
//  Deployment: cPanel (public_html/Argus)
// ─────────────────────────────────────────────────────────────
const path         = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express      = require('express');
const cors         = require('cors');
const fs           = require('fs');

const authRoutes         = require('./routes/auth');
const shipmentRoutes     = require('./routes/shipments');
const dashboardRoutes    = require('./routes/dashboard');
const fileRoutes         = require('./routes/files');
const rfqRoutes          = require('./routes/rfq');
const contactRoutes      = require('./routes/contacts');
const customerRoutes     = require('./routes/customers');
const ccRecipientsRoutes = require('./routes/ccRecipients');
const compulsoryEmailsRoutes = require('./routes/compulsoryEmails');
const callEnquiryRoutes  = require('./routes/callEnquiries');
const quotationRoutes    = require('./routes/quotation');
const cxRoutes           = require('./routes/3cx');
const errorHandler       = require('./middleware/errorHandler');
const { startImapService } = require('./services/imapService');

const app  = express();
// cPanel Passenger injects PORT automatically; fall back to 3001 for local dev
const PORT = process.env.PORT || 3001;
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
global.io = io;

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`[Socket] Client ${socket.id} joined room: ${room}`);
  });
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Ensure uploads directory exists ─────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Global Middleware ────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Security Headers ─────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static File Serving (cPanel Dynamic Path Resolution) ───────
let FRONTEND_OUT = path.join(__dirname, '../frontend/out');
let LANDING_DIST = path.join(__dirname, '../dist');

// Helper to dynamically check parent paths if standard paths don't exist
const findFolder = (folderName, defaultPath) => {
  if (fs.existsSync(defaultPath)) return defaultPath;
  const siblingPath = path.join(__dirname, '../../', folderName);
  if (fs.existsSync(siblingPath)) return siblingPath;
  const rootSiblingPath = path.join(__dirname, '../', folderName);
  if (fs.existsSync(rootSiblingPath)) return rootSiblingPath;
  return defaultPath;
};

FRONTEND_OUT = findFolder('frontend/out', FRONTEND_OUT);
LANDING_DIST = findFolder('dist', LANDING_DIST);

const hasFrontend = fs.existsSync(FRONTEND_OUT);
const hasLanding = fs.existsSync(LANDING_DIST);

// Serve static assets and routes if they exist on the server (or in production)
if (process.env.NODE_ENV === 'production' || hasFrontend || hasLanding) {
  if (hasFrontend) {
    app.use(express.static(FRONTEND_OUT));
    
    // Dashboard Application Core Client routes
    const appRoutes = [
      'login', 'register', 'dashboard', 'rfq', 'confirmed',
      'customers', 'customer', 'contacts', 'quotation',
      'calling-agent', 'sales', 'settings', 'summary',
      'admin', 'calculator'
    ];
    appRoutes.forEach(route => {
      app.get(`/${route}`, (req, res) => {
        const htmlFile = path.join(FRONTEND_OUT, `${route}.html`);
        if (fs.existsSync(htmlFile)) return res.sendFile(htmlFile);
        res.sendFile(path.join(FRONTEND_OUT, 'index.html'));
      });
      app.get(`/${route}/*`, (req, res) => {
        const subPath = req.path.replace(/\/$/, '');
        const exactHtmlFile = path.join(FRONTEND_OUT, `${subPath}.html`);
        if (fs.existsSync(exactHtmlFile)) {
          return res.sendFile(exactHtmlFile);
        }

        const htmlFile = path.join(FRONTEND_OUT, `${route}.html`);
        if (fs.existsSync(htmlFile)) return res.sendFile(htmlFile);
        res.sendFile(path.join(FRONTEND_OUT, 'index.html'));
      });
    });
  }

  if (hasLanding) {
    app.use(express.static(LANDING_DIST));
    
    // Marketing Landing page routes
    const landingRoutes = ['/', '/about', '/services', '/why-us', '/team', '/contact', '/chairman-message'];
    landingRoutes.forEach(route => {
      app.get(route, (_req, res) => {
        res.sendFile(path.join(LANDING_DIST, 'index.html'));
      });
    });
  }
}

// ── Database Initialization (MySQL Standard Driver Instance) ──
const db = require('./config/db');

const addCol = async (table, column, definition) => {
  try {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') return;
    if (e.message && e.message.includes('Duplicate column')) return;
    throw e;
  }
};

const createLike = async (newTable, baseTable) => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS \`${newTable}\` LIKE \`${baseTable}\``);
  } catch (e) {
    console.error(`[DB] Error creating ${newTable}:`, e.message);
  }
};

(async () => {
  try {
    // MySQL Normalized Tables Schema Execution
    try {
      await db.query('ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    } catch (dbColErr) {
      console.warn('[DB] Warning: Could not alter database collation:', dbColErr.message);
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username         VARCHAR(100) NOT NULL UNIQUE,
        password_hash    VARCHAR(255) NOT NULL,
        role             VARCHAR(50) NOT NULL DEFAULT 'operator',
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id                INT NOT NULL AUTO_INCREMENT,
        ref_no            VARCHAR(50) PRIMARY KEY,
        customer_id       VARCHAR(5),
        cust_req_no       VARCHAR(50),
        refer_by          VARCHAR(100),
        pol               VARCHAR(100),
        pod               VARCHAR(100),
        commodity         VARCHAR(255),
        term              VARCHAR(50),
        dimension         VARCHAR(255),
        container         VARCHAR(100),
        mode              VARCHAR(50),
        weight            VARCHAR(100),
        pickup_address    TEXT,
        delivery_address  TEXT,
        dear_who          VARCHAR(255),
        email             VARCHAR(255),
        status            VARCHAR(50) NOT NULL DEFAULT 'Pending',
        last_follow_up    DATETIME DEFAULT CURRENT_TIMESTAMP,
        do_number         VARCHAR(100),
        box_no            VARCHAR(100),
        so_number         VARCHAR(100),
        bl_number         VARCHAR(100),
        track_status      VARCHAR(255),
        carrier           VARCHAR(150),
        etd               DATE,
        eta               DATE,
        cost              DECIMAL(15,2),
        profit            DECIMAL(15,2),
        customer_name     VARCHAR(255),
        customer_email    VARCHAR(255),
        note              TEXT,
        operator          VARCHAR(100),
        created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        shipment_ref_no VARCHAR(50) NOT NULL,
        filename        VARCHAR(255) NOT NULL,
        original_name   VARCHAR(255) NOT NULL,
        file_path       TEXT NOT NULL,
        mime_type       VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
        size_bytes      BIGINT,
        uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_ref_no) REFERENCES shipments(ref_no) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email       VARCHAR(255) NOT NULL,
        dear_who    VARCHAR(255),
        pol         VARCHAR(100) NOT NULL DEFAULT '',
        pod         VARCHAR(100) NOT NULL DEFAULT '',
        mode        VARCHAR(50)  NOT NULL DEFAULT '',
        country     VARCHAR(100),
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_contacts_email_pol_pod_mode (email, pol, pod, mode)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(5) NOT NULL UNIQUE,
        name        VARCHAR(255) NOT NULL UNIQUE,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value   TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS call_enquiries (
        id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        customer_name    VARCHAR(255) NOT NULL,
        company          VARCHAR(255),
        type             VARCHAR(255),
        customer_number  VARCHAR(100) NOT NULL,
        customer_email   VARCHAR(255),
        customer_address TEXT,
        details          TEXT NOT NULL,
        status           VARCHAR(50) NOT NULL,
        calling_agent    VARCHAR(255) NOT NULL,
        assigned_sales   VARCHAR(255),
        call_duration    INT,
        is_lead          TINYINT(1) DEFAULT 0,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS shipment_replies (
        id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ref_no      VARCHAR(50),
        from_email  VARCHAR(255),
        subject     TEXT,
        body_text   TEXT,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read     TINYINT(1) NOT NULL DEFAULT 0,
        message_id  VARCHAR(255) UNIQUE,
        to_emails   TEXT,
        cc_emails   TEXT,
        FOREIGN KEY (ref_no) REFERENCES shipments(ref_no) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cc_recipients (
        id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name         VARCHAR(100) NOT NULL,
        email        VARCHAR(255) NOT NULL UNIQUE,
        multi_select TINYINT(1) NOT NULL DEFAULT 0
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS compulsory_emails (
        id        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email     VARCHAR(255) NOT NULL,
        dear_who  VARCHAR(255) NOT NULL,
        mode      VARCHAR(50) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        UNIQUE KEY unique_email_mode (email, mode)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_operator_chats (
        id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        cust_req_no      VARCHAR(50) NOT NULL,
        sender_username  VARCHAR(100) NOT NULL,
        message          TEXT NOT NULL,
        is_read          TINYINT(1) NOT NULL DEFAULT 0,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        q_no            VARCHAR(50) NOT NULL UNIQUE,
        pol             VARCHAR(255),
        pod             VARCHAR(255),
        commodity       VARCHAR(255),
        pod_pcode       VARCHAR(255),
        pol_pcode       VARCHAR(255),
        freight         DECIMAL(15,2),
        zone            VARCHAR(255),
        trans           DECIMAL(15,2),
        total_rate      DECIMAL(15,2),
        sales_p         VARCHAR(100),
        operator        VARCHAR(100),
        customer_name   VARCHAR(255),
        transit_time    VARCHAR(100),
        validity        DATE,
        created_date    DATE,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by      INT,
        file_path       VARCHAR(512),
        mode            VARCHAR(255),
        carrier_name    VARCHAR(255),
        currency        VARCHAR(10),
        approval_status VARCHAR(255) DEFAULT 'Pending',
        shipment_ref    VARCHAR(255),
        email_payload   TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // ── Column migrations ─────────────────────────────────────
    await addCol('users', 'email_address', 'VARCHAR(255)');
    await addCol('users', 'email_password', 'VARCHAR(255)');
    await addCol('users', 'is_stalled', 'TINYINT(1) DEFAULT 0');
    await addCol('users', 'name', 'VARCHAR(255)');
    await addCol('users', 'contact_number', 'VARCHAR(100)');
    await addCol('users', 'customer_id', 'VARCHAR(5)');
    await addCol('users', 'address', 'TEXT');
    await addCol('users', 'company', 'VARCHAR(255)');
    await addCol('users', 'company_address', 'TEXT');
    await addCol('users', 'secondary_phone', 'VARCHAR(100)');
    await addCol('users', 'email_signature', 'TEXT');
    await addCol('users', 'agent_extension', 'VARCHAR(50)');
    await addCol('users', 'country', "VARCHAR(100) DEFAULT 'Qatar'");
    await addCol('users', 'is_deleted', 'TINYINT(1) DEFAULT 0');
    await addCol('users', 'deleted_at', 'DATETIME');
    await addCol('customers', 'country', "VARCHAR(100) DEFAULT 'Qatar'");
    await addCol('compulsory_emails', 'country', "VARCHAR(100) DEFAULT 'Qatar'");
    try { await db.query("UPDATE users SET country = 'Qatar' WHERE country IS NULL OR country = ''"); } catch(e){}
    try { await db.query("UPDATE customers SET country = 'Qatar' WHERE country IS NULL OR country = ''"); } catch(e){}
    try { await db.query("UPDATE compulsory_emails SET country = 'Qatar' WHERE country IS NULL OR country = ''"); } catch(e){}
    await addCol('shipments', 'customer_id', 'VARCHAR(5)');
    await addCol('shipments', 'profit', 'DECIMAL(15,2)');
    await addCol('shipments', 'customer_name', 'VARCHAR(255)');
    await addCol('shipments', 'customer_email', 'VARCHAR(255)');
    await addCol('shipments', 'operator', 'VARCHAR(100)');
    await addCol('shipments', 'cust_req_no', 'VARCHAR(50)');
    await addCol('shipment_replies', 'is_read', 'TINYINT(1) NOT NULL DEFAULT 0');
    try { await db.query("UPDATE shipment_replies SET is_read = true WHERE is_read IS NULL OR is_read = false OR is_read = 0"); } catch(e){}
    await addCol('shipment_replies', 'message_id', 'VARCHAR(255)');
    await addCol('shipment_replies', 'to_emails', 'TEXT');
    await addCol('shipment_replies', 'cc_emails', 'TEXT');
    await addCol('cc_recipients', 'multi_select', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addCol('call_enquiries', 'call_duration', 'INT');
    await addCol('call_enquiries', 'is_lead', 'TINYINT(1) DEFAULT 0');
    await addCol('quotations', 'mode', 'VARCHAR(255)');
    await addCol('quotations', 'carrier_name', 'VARCHAR(255)');
    await addCol('quotations', 'currency', 'VARCHAR(10)');
    await addCol('quotations', 'approval_status', "VARCHAR(255) DEFAULT 'Pending'");
    await addCol('quotations', 'shipment_ref', 'VARCHAR(255)');
    await addCol('quotations', 'email_payload', 'TEXT');


    // ── Credentials Migration ──────────────────────────────────
    try {
      const adminCheck = await db.query("SELECT email_address FROM users WHERE LOWER(username) = 'admin'");
      if (adminCheck && adminCheck.length > 0 && !adminCheck[0].email_address) {
        const emailRes = await db.query("SELECT value FROM app_settings WHERE `key` = 'email_address'");
        const passRes  = await db.query("SELECT value FROM app_settings WHERE `key` = 'email_password'");
        const emailVal = emailRes[0]?.value;
        const passVal  = passRes[0]?.value;
        if (emailVal) {
          await db.query(
            "UPDATE users SET email_address = ?, email_password = ? WHERE LOWER(username) = 'admin'",
            [emailVal, passVal || null]
          );
          console.log('[Migration] Migrated global app_settings credentials to admin user.');
        }
      }
    } catch (migErr) {
      console.error('[Migration] Error migrating credentials:', migErr.message);
    }

    // ── Operator Table Sandboxes Migration ────────────────────
    try {
      const tablesRes = await db.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name LIKE 'shipments_%'`
      );
      await addCol('shipments', 'operator', 'VARCHAR(100)');
      if (tablesRes && tablesRes.length > 0) {
        for (const r of tablesRes) {
          await addCol(r.table_name, 'operator', 'VARCHAR(100)');
          await addCol(r.table_name, 'cust_req_no', 'VARCHAR(50)');
        }
      }
      await db.query("UPDATE shipments SET operator = 'jabir' WHERE operator IS NULL");
      console.log('[Migration] Operator & cust_req_no columns updated.');
    } catch (opMigErr) {
      console.error('[Migration] Operator migration error:', opMigErr.message);
    }

    // ── Encrypt plain-text passwords ──────────────────────────
    try {
      const { encrypt } = require('./utils/crypto');
      const usersRes = await db.query("SELECT id, email_password FROM users WHERE email_password IS NOT NULL AND email_password != ''");
      if (usersRes && usersRes.length > 0) {
        for (const u of usersRes) {
          if (!u.email_password.includes(':')) {
            const encrypted = encrypt(u.email_password);
            await db.query('UPDATE users SET email_password = ? WHERE id = ?', [encrypted, u.id]);
            console.log(`[Migration] Encrypted password for user ID ${u.id}`);
          }
        }
      }
    } catch (encErr) {
      console.error('[Migration] Encrypt passwords error:', encErr.message);
    }

    // ── Auto-seed admin user ───────────────────────────────────
    try {
      const adminCheck = await db.query("SELECT id FROM users WHERE LOWER(username) = 'admin'");
      if (!adminCheck || adminCheck.length === 0) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('Admin@1234', 10);
        await db.query(
          "INSERT IGNORE INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')",
          [hash]
        );
        console.log("[Seeding] Created default admin user (password: Admin@1234)");
      }
    } catch (err) {
      console.error('[Seeding] Error creating admin:', err.message);
    }

    // ── Auto-seed jabir operator user ─────────────────────────
    try {
      const userCheck = await db.query("SELECT id FROM users WHERE LOWER(username) = 'jabir'");
      if (!userCheck || userCheck.length === 0) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('Jabir@1234', 10);
        await db.query(
          "INSERT IGNORE INTO users (username, password_hash, role) VALUES ('jabir', ?, 'operator')",
          [hash]
        );
        console.log("[Seeding] Created default jabir user (password: Jabir@1234)");

        await createLike('shipments_jabir', 'shipments');
        await createLike('files_jabir', 'files');
        await createLike('shipment_replies_jabir', 'shipment_replies');
        console.log('[Seeding] Jabir sandbox tables seeded.');
      }
    } catch (err) {
      console.error('[Seeding] Error creating jabir:', err.message);
    }

    console.log('[DB] MySQL schema initialisation complete.');
  } catch (initErr) {
    console.error('[DB] Fatal DB init error:', initErr);
  }
})();

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health-email', async (_req, res) => {
  const net = require('net');
  const dns = require('dns');

  const testSocket = (host, port) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();
      socket.setTimeout(5000);

      socket.on('connect', () => {
        const duration = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, message: `TCP Handshake successful in ${duration}ms` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timed out (5s)' });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });

      socket.connect(port, host);
    });
  };

  try {
    const host = 'smtp.gmail.com';
    const result587 = await testSocket(host, 587);
    const result465 = await testSocket(host, 465);

    let dnsIps = [];
    try {
      dnsIps = await new Promise((resIp, rejIp) => {
        dns.resolve4(host, (err, addresses) => {
          if (err) rejIp(err);
          else resIp(addresses);
        });
      });
    } catch (e) {
      dnsIps = [e.message];
    }

    res.json({
      success: true,
      diagnostics: {
        targetHost: host,
        resolvedIps: dnsIps,
        port587Status: result587,
        port465Status: result465
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: err.stack
    });
  }
});

// ── Routes Mounting ──────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/shipments',      shipmentRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/files',          fileRoutes);
app.use('/api/rfq',            rfqRoutes);
app.use('/api/contacts',       contactRoutes);
app.use('/api/customers',      customerRoutes);
app.use('/api/cc-recipients',  ccRecipientsRoutes);
app.use('/api/compulsory-emails', compulsoryEmailsRoutes);
app.use('/api/call-enquiries', callEnquiryRoutes);
app.use('/api/quotation', quotationRoutes);
app.use('/api/3cx', cxRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🚀 FreightOS Backend running on port ${PORT}`);
  console.log(`===========================================\n`);
  
  startImapService();
});

module.exports = app;