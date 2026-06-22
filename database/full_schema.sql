-- =============================================================
--  Freight & RFQ Management System — Full PostgreSQL Schema
--  Run this ONCE on a fresh database to create everything.
--
--  Usage:
--    psql -U <user> -d <dbname> -f full_schema.sql
--
--  Default admin credentials after running:
--    Username : admin
--    Password : Admin@1234
-- =============================================================

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ─── ENUM types ───────────────────────────────────────────────
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
  CREATE TYPE user_role AS ENUM ('admin', 'operator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================
--  TABLE: users
--  Stores all accounts (admin + operators).
--  Email credentials are stored per-user for IMAP/SMTP.
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(100)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,            -- bcrypt hash (never plain text)
  role            user_role     NOT NULL DEFAULT 'operator',
  email_address   VARCHAR(255),                      -- Gmail / SMTP address used to send RFQs
  email_password  VARCHAR(255),                      -- App Password (stored as plain text - keep DB secure)
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: shipments  (base / admin table)
--  ref_no is the natural business key (e.g. ARG-1001).
--  Each operator gets a clone of this table: shipments_<username>
-- =============================================================
CREATE TABLE IF NOT EXISTS shipments (
  -- Identity
  id                SERIAL,
  ref_no            VARCHAR(50)  PRIMARY KEY,         -- e.g. ARG-1001 (unique, user or auto-generated)
  customer_id       VARCHAR(5),                       -- links to customers.customer_id
  cust_req_no       VARCHAR(50),                       -- Consolidated customer request ref_no (e.g. CID-01)
  refer_by          VARCHAR(100),                     -- referred by whom
  operator          VARCHAR(100),                     -- which operator owns this shipment
  -- Route
  pol               VARCHAR(100),                     -- Port of Loading
  pod               VARCHAR(100),                     -- Port of Discharge
  -- Cargo
  commodity         VARCHAR(255),
  term              VARCHAR(50),                      -- e.g. FOB, CIF, EXW
  dimension         VARCHAR(255),                     -- cargo dimensions (free text)
  container         VARCHAR(100),                     -- container type / size
  mode              VARCHAR(50),                      -- SEA / AIR / LAND
  weight            VARCHAR(100),                     -- allows strings like '1000 KG'
  -- Addresses
  pickup_address    TEXT,
  delivery_address  TEXT,
  -- Customer
  dear_who          VARCHAR(255),                     -- salutation / contact name
  email             VARCHAR(255),
  -- Lifecycle
  status            shipment_status NOT NULL DEFAULT 'Pending',
  last_follow_up    TIMESTAMPTZ     DEFAULT NOW(),    -- resets every status change
  -- Execution tracking (filled after confirmation)
  do_number         VARCHAR(100),                     -- Delivery Order number
  box_no            VARCHAR(100),                     -- Box / carton number
  so_number         VARCHAR(100),                     -- Shipping Order number
  bl_number         VARCHAR(100),                     -- Bill of Lading number
  track_status      VARCHAR(255),                     -- free-text tracking note
  carrier           VARCHAR(150),
  etd               DATE,                             -- Estimated Time of Departure
  eta               DATE,                             -- Estimated Time of Arrival
  cost              NUMERIC(15, 2),                   -- quoted / confirmed cost
  profit            NUMERIC(15, 2),                   -- profit amount
  customer_name     VARCHAR(255),
  customer_email    VARCHAR(255),
  note              TEXT,                             -- internal notes
  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: shipment_replies  (base / admin table)
--  Stores parsed IMAP email replies linked to a shipment.
--  Each operator gets a clone: shipment_replies_<username>
-- =============================================================
CREATE TABLE IF NOT EXISTS shipment_replies (
  id            SERIAL PRIMARY KEY,
  ref_no        VARCHAR(50) REFERENCES shipments(ref_no) ON DELETE CASCADE,
  from_email    VARCHAR(255),
  subject       TEXT,
  body_text     TEXT,
  received_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
--  TABLE: files  (base / admin table)
--  Each row represents one PDF or image attached to a shipment.
--  Each operator gets a clone: files_<username>
-- =============================================================
CREATE TABLE IF NOT EXISTS files (
  id              SERIAL PRIMARY KEY,
  shipment_ref_no VARCHAR(50)  NOT NULL
                  REFERENCES shipments(ref_no) ON DELETE CASCADE,
  filename        VARCHAR(255) NOT NULL,              -- sanitised filename on disk
  original_name   VARCHAR(255) NOT NULL,              -- original upload name shown in UI
  file_path       TEXT         NOT NULL,              -- relative path under ./uploads/
  mime_type       VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes      BIGINT,
  uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TRIGGER: auto-update updated_at on shipments
-- =============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shipments_updated_at ON shipments;
CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================
--  INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_shipments_status         ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_last_follow_up ON shipments(last_follow_up);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at     ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_ref_no             ON files(shipment_ref_no);

-- =============================================================
--  TABLE: contacts
--  Address book for auto-suggestions when creating RFQs.
-- =============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  dear_who    VARCHAR(255),
  pol         VARCHAR(100),
  pod         VARCHAR(100),
  mode        VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique combination: same email can appear with different routes/modes
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_pol_pod_mode
  ON contacts (email, COALESCE(pol, ''), COALESCE(pod, ''), COALESCE(mode, ''));

-- =============================================================
--  TABLE: customers
--  Master list of customers with unique 5-digit IDs.
-- =============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  customer_id VARCHAR(5)   NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: app_settings
--  Generic key-value store for global configuration.
-- =============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key    VARCHAR(255) PRIMARY KEY,
  value  TEXT
);

-- =============================================================
--  TABLE: cc_recipients
--  Fixed list of email addresses available as CC options
--  when sending RFQs. Managed by admin via Settings page.
-- =============================================================
CREATE TABLE IF NOT EXISTS cc_recipients (
  id     SERIAL PRIMARY KEY,
  name   VARCHAR(100) NOT NULL,
  email  VARCHAR(255) NOT NULL UNIQUE
);

-- Default CC recipients
INSERT INTO cc_recipients (name, email) VALUES
  ('Nafih',  'op2@argusshipping.co'),
  ('Jabir',  'jabir@argusshipping.co'),
  ('Shamil', 'op1@argusshipping.co')
ON CONFLICT (email) DO NOTHING;


-- =============================================================
--  OPERATOR SANDBOX TABLES
--
--  The application auto-creates these at register / first login.
--  The pattern is:
--    shipments_<username>
--    files_<username>
--    shipment_replies_<username>
--
--  Add a block below for each operator that already exists.
--  If you are setting up fresh, leave these out -- they will
--  be created automatically when operators first log in.
-- =============================================================

-- ── Operator: jabir ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments_jabir          (LIKE shipments          INCLUDING ALL);
CREATE TABLE IF NOT EXISTS files_jabir              (LIKE files              INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shipment_replies_jabir   (LIKE shipment_replies   INCLUDING ALL);

ALTER TABLE files_jabir
  DROP CONSTRAINT IF EXISTS files_jabir_shipment_ref_no_fkey,
  DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey;
ALTER TABLE files_jabir
  ADD CONSTRAINT files_jabir_shipment_ref_no_fkey
    FOREIGN KEY (shipment_ref_no) REFERENCES shipments_jabir(ref_no) ON DELETE CASCADE;

ALTER TABLE shipment_replies_jabir
  DROP CONSTRAINT IF EXISTS shipment_replies_jabir_ref_no_fkey,
  DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey;
ALTER TABLE shipment_replies_jabir
  ADD CONSTRAINT shipment_replies_jabir_ref_no_fkey
    FOREIGN KEY (ref_no) REFERENCES shipments_jabir(ref_no) ON DELETE CASCADE;

-- ── Operator: test ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments_test          (LIKE shipments          INCLUDING ALL);
CREATE TABLE IF NOT EXISTS files_test              (LIKE files              INCLUDING ALL);
CREATE TABLE IF NOT EXISTS shipment_replies_test   (LIKE shipment_replies   INCLUDING ALL);

ALTER TABLE files_test
  DROP CONSTRAINT IF EXISTS files_test_shipment_ref_no_fkey,
  DROP CONSTRAINT IF EXISTS files_shipment_ref_no_fkey;
ALTER TABLE files_test
  ADD CONSTRAINT files_test_shipment_ref_no_fkey
    FOREIGN KEY (shipment_ref_no) REFERENCES shipments_test(ref_no) ON DELETE CASCADE;

ALTER TABLE shipment_replies_test
  DROP CONSTRAINT IF EXISTS shipment_replies_test_ref_no_fkey,
  DROP CONSTRAINT IF EXISTS shipment_replies_ref_no_fkey;
ALTER TABLE shipment_replies_test
  ADD CONSTRAINT shipment_replies_test_ref_no_fkey
    FOREIGN KEY (ref_no) REFERENCES shipments_test(ref_no) ON DELETE CASCADE;

-- =============================================================
--  SEED DATA — Admin account
--  Password: Admin@1234  (bcrypt, 10 rounds)
--
--  To generate a new hash for a different password:
--    node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
-- =============================================================
INSERT INTO users (username, password_hash, role)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFQi',
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- =============================================================
--  SEED DATA — Sample contacts
-- =============================================================
INSERT INTO contacts (email, dear_who, pol, pod, mode)
VALUES
  ('chen@example.com',  'Mr. Chen',  'Shanghai',  'Rotterdam',   'SEA'),
  ('alice@example.com', 'Ms. Alice', 'Hong Kong', 'Los Angeles', 'AIR'),
  ('bob@example.com',   'Mr. Bob',   'Dubai',     'Singapore',   'SEA')
ON CONFLICT DO NOTHING;

-- =============================================================
--  HOW THE MULTI-TENANT SANDBOX WORKS (summary)
-- =============================================================
-- * admin sees ALL shipments via UNION ALL across every table.
-- * Each operator sees only their own shipments_<username> table.
-- * On register / first login the backend auto-creates the three
--   sandbox tables and re-wires the foreign keys.
-- * New operators start with EMPTY tables (clean slate).
-- * To add another operator manually, copy the "jabir" block
--   above, replacing "jabir" with the new username.
-- =============================================================
