// src/server.js
// ─────────────────────────────────────────────────────────────
//  Freight & RFQ Management System — Express Entry Point
//  Usage:
//    Development:  npm run dev   (nodemon)
//    Production:   npm start
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
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
const errorHandler       = require('./middleware/errorHandler');
const { startImapService } = require('./services/imapService');

const app  = express();
const PORT = process.env.NODE_ENV === 'production' ? 3009 : (process.env.PORT || 3001);
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Serve uploaded PDFs ──────────────────────────
//  Static uploads are disabled for security to enforce token authentication.
//  Files are served securely via GET /api/files/download/:id instead.

// ── Database Initialization ────────────────────────────────────
const db = require('./config/db');
db.query(`
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  DO $$ BEGIN
    CREATE TYPE shipment_status AS ENUM (
      'Pending',
      'Quoted',
      'Customer Review',
      'Confirmed',
      'Files Pending',
      'Completed',
      'Return Pending',
      'Cancelled'
    );
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'operator', 'calling_agent', 'sales', 'customer');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL DEFAULT 'operator',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id                SERIAL,
    ref_no            VARCHAR(50)  PRIMARY KEY,
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
    status            shipment_status NOT NULL DEFAULT 'Pending',
    last_follow_up    TIMESTAMPTZ     DEFAULT NOW(),
    do_number         VARCHAR(100),
    box_no            VARCHAR(100),
    so_number         VARCHAR(100),
    bl_number         VARCHAR(100),
    track_status      VARCHAR(255),
    carrier           VARCHAR(150),
    etd               DATE,
    eta               DATE,
    cost              NUMERIC(15, 2),
    profit            NUMERIC(15, 2),
    customer_name     VARCHAR(255),
    customer_email    VARCHAR(255),
    note              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS files (
    id              SERIAL PRIMARY KEY,
    shipment_ref_no VARCHAR(50)  NOT NULL REFERENCES shipments(ref_no) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    file_path       TEXT         NOT NULL,
    mime_type       VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    size_bytes      BIGINT,
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    dear_who    VARCHAR(255),
    pol         VARCHAR(100),
    pod         VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE shipments ALTER COLUMN weight TYPE VARCHAR(100);
  ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_email_key;
  ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mode VARCHAR(50);
  DROP INDEX IF EXISTS idx_contacts_email_pol_pod;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_pol_pod_mode 
    ON contacts (email, COALESCE(pol, ''), COALESCE(pod, ''), COALESCE(mode, ''));
  ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country VARCHAR(100);
  
  CREATE TABLE IF NOT EXISTS customers (
    id          SERIAL PRIMARY KEY,
    customer_id VARCHAR(5) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id VARCHAR(5);
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS profit NUMERIC(15, 2);
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'calling_agent') THEN
      ALTER TYPE user_role ADD VALUE 'calling_agent';
    END IF;
  END$$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'sales') THEN
      ALTER TYPE user_role ADD VALUE 'sales';
    END IF;
  END$$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'customer') THEN
      ALTER TYPE user_role ADD VALUE 'customer';
    END IF;
  END$$;

  CREATE TABLE IF NOT EXISTS call_enquiries (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    type VARCHAR(255),
    customer_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    details TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    calling_agent VARCHAR(255) NOT NULL,
    assigned_sales VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );


  DO $$ 
  BEGIN 
    ALTER TABLE shipments RENAME COLUMN price TO cost;
  EXCEPTION 
    WHEN undefined_column THEN null; 
  END $$;

  CREATE TABLE IF NOT EXISTS shipment_replies (
    id            SERIAL PRIMARY KEY,
    ref_no        VARCHAR(50) REFERENCES shipments(ref_no) ON DELETE CASCADE,
    from_email    VARCHAR(255),
    subject       TEXT,
    body_text     TEXT,
    received_at   TIMESTAMPTZ DEFAULT NOW(),
    is_read       BOOLEAN NOT NULL DEFAULT false
  );
  ALTER TABLE shipment_replies ADD COLUMN IF NOT EXISTS message_id VARCHAR(255) UNIQUE;

  CREATE TABLE IF NOT EXISTS app_settings (
    key           VARCHAR(255) PRIMARY KEY,
    value         TEXT
  );
  ALTER TABLE shipments ALTER COLUMN last_follow_up DROP NOT NULL;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_address VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_password VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_stalled BOOLEAN DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id VARCHAR(5);

  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS operator VARCHAR(100);

  CREATE TABLE IF NOT EXISTS cc_recipients (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    multi_select BOOLEAN NOT NULL DEFAULT false
  );

  ALTER TABLE cc_recipients ADD COLUMN IF NOT EXISTS multi_select BOOLEAN NOT NULL DEFAULT false;

  INSERT INTO cc_recipients (name, email, multi_select) VALUES
    ('Nafih',  'op2@argusshipping.co',     false),
    ('Jabir',  'jabir@argusshipping.co',   false),
    ('Shamil', 'op1@argusshipping.co',     false),
    ('Ganesh', 'ganesh@argusshipping.co',  true),
    ('Jemshy', 'jemshy@argusshipping.co',  true)
  ON CONFLICT (email) DO NOTHING;

  CREATE TABLE IF NOT EXISTS compulsory_emails (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    dear_who VARCHAR(255) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(email, mode)
  );

  INSERT INTO compulsory_emails (email, dear_who, mode, is_active) VALUES 
    ('reshma@aramex.com', 'Reshma', 'Air', true),
    ('MelanieR@aramex.com', 'Melanie', 'Air', true),
    ('Kumudu.Karunarathna@gwcss.qa', 'Kumudu', 'Sea', true)
  ON CONFLICT (email, mode) DO NOTHING;

  CREATE TABLE IF NOT EXISTS customer_operator_chats (
    id SERIAL PRIMARY KEY,
    cust_req_no VARCHAR(50) NOT NULL,
    sender_username VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE customer_operator_chats ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
`).then(async () => {
  // Auto-migrate credentials from app_settings to admin user if empty
  try {
    const adminCheck = await db.query("SELECT email_address FROM users WHERE LOWER(username) = 'admin'");
    if (adminCheck.rows.length > 0 && !adminCheck.rows[0].email_address) {
      const emailRes = await db.query("SELECT value FROM app_settings WHERE key = 'email_address'");
      const passRes = await db.query("SELECT value FROM app_settings WHERE key = 'email_password'");
      const emailVal = emailRes.rows[0]?.value;
      const passVal = passRes.rows[0]?.value;
      if (emailVal) {
        await db.query(
          "UPDATE users SET email_address = $1, email_password = $2 WHERE LOWER(username) = 'admin'",
          [emailVal, passVal || null]
        );
        console.log("[Migration] Successfully migrated global app_settings credentials to admin user.");
      }
    }
  } catch (migErr) {
    console.error("[Migration] Error migrating global settings to admin:", migErr.message);
  }

  // Operator and Cust_Req_No Column Migration for dynamic shipments tables and past RFQs
  try {
    const tablesRes = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name LIKE 'shipments_%'`
    );
    await db.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS operator VARCHAR(100)`);
    await db.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cust_req_no VARCHAR(50)`);

    for (const r of tablesRes.rows) {
      await db.query(`ALTER TABLE ${r.table_name} ADD COLUMN IF NOT EXISTS operator VARCHAR(100)`);
      await db.query(`ALTER TABLE ${r.table_name} ADD COLUMN IF NOT EXISTS cust_req_no VARCHAR(50)`);
    }

    // Set existing NULL operator values to 'jabir' for past RFQs
    await db.query("UPDATE shipments SET operator = 'jabir' WHERE operator IS NULL");
    for (const r of tablesRes.rows) {
      await db.query(`UPDATE ${r.table_name} SET operator = 'jabir' WHERE operator IS NULL`);
    }
    console.log("[Migration] Added operator & cust_req_no columns and set past RFQs operator to 'jabir' across all tables.");
  } catch (opMigErr) {
    console.error("[Migration] Error running operator and cust_req_no column migration:", opMigErr.message);
  }

  // Auto-register user 'admin' with default password 'Admin@1234' if not exists
  try {
    const adminCheck = await db.query("SELECT id FROM users WHERE LOWER(username) = 'admin'");
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Admin@1234', salt);
      
      await db.query(
        "INSERT INTO users (username, password_hash, role) VALUES ('admin', $1, 'admin')",
        [hash]
      );
      console.log("[Seeding] Created default admin user 'admin' (password: Admin@1234)");
    }
  } catch (err) {
    console.error("[Seeding] Error creating user 'admin':", err.message);
  }

  // Auto-register user 'jabir' with default password 'Jabir@1234' if not exists
  try {
    const userCheck = await db.query("SELECT id FROM users WHERE LOWER(username) = 'jabir'");
    if (userCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Jabir@1234', salt);
      
      await db.query(
        "INSERT INTO users (username, password_hash, role) VALUES ('jabir', $1, 'operator')",
        [hash]
      );
      console.log("[Seeding] Created default user 'jabir' (password: Jabir@1234)");

      // Initialize jabir tables
      await db.query("CREATE TABLE IF NOT EXISTS shipments_jabir (LIKE shipments INCLUDING ALL)");
      await db.query("CREATE TABLE IF NOT EXISTS files_jabir (LIKE files INCLUDING ALL)");
      await db.query("CREATE TABLE IF NOT EXISTS shipment_replies_jabir (LIKE shipment_replies INCLUDING ALL)");

      await db.query("ALTER TABLE files_jabir DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey");
      await db.query("ALTER TABLE files_jabir ADD CONSTRAINT files_jabir_shipment_ref_no_fkey FOREIGN KEY (shipment_ref_no) REFERENCES shipments_jabir(ref_no) ON DELETE CASCADE");

      await db.query("ALTER TABLE shipment_replies_jabir DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey");
      await db.query("ALTER TABLE shipment_replies_jabir ADD CONSTRAINT shipment_replies_jabir_ref_no_fkey FOREIGN KEY (ref_no) REFERENCES shipments_jabir(ref_no) ON DELETE CASCADE");

      // Seed initial data
      await db.query("INSERT INTO shipments_jabir SELECT * FROM shipments ON CONFLICT DO NOTHING");
      await db.query("INSERT INTO files_jabir SELECT * FROM files ON CONFLICT DO NOTHING");
      await db.query("INSERT INTO shipment_replies_jabir SELECT * FROM shipment_replies ON CONFLICT DO NOTHING");
      console.log("[Seeding] Duplicated base shipments/files/replies into 'shipments_jabir'");
    }
  } catch (err) {
    console.error("[Seeding] Error creating user 'jabir':", err.message);
  }
}).catch(err => console.error("DB Init Error:", err));

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health-email', async (_req, res) => {
  try {
    const nodemailer = require('nodemailer');
    let smtpHost = process.env.SMTP_HOST;
    let smtpPort = process.env.SMTP_PORT || '587';
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;

    if (smtpUser) smtpUser = smtpUser.trim().replace(/^["']|["']$/g, '');
    if (smtpPass) smtpPass = smtpPass.trim().replace(/^["']|["']$/g, '');

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    res.json({ 
      success: true, 
      message: 'SMTP connection verified successfully!',
      config: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'SMTP verification failed', 
      error: err.message,
      code: err.code,
      stack: err.stack
    });
  }
});

// ── Routes ───────────────────────────────────────────────────
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
  
  // Start IMAP service for fetching replies
  startImapService();
});

module.exports = app; // for testing
