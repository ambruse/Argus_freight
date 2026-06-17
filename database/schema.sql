-- =============================================================
--  Freight & RFQ Management System — PostgreSQL Schema
--  Run this script once to initialise the database.
--  psql -U <user> -d <dbname> -f schema.sql
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
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  -- bcrypt hash stored here (never plain text)
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'operator',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: shipments
--  ref_no is the natural business key (e.g. ARG-1001).
--  It acts as the primary key and foreign key target.
-- =============================================================
CREATE TABLE IF NOT EXISTS shipments (
  -- ── Identity ──────────────────────────────────────────────
  id                SERIAL,
  ref_no            VARCHAR(50)  PRIMARY KEY,   -- e.g. ARG-1001 (unique, user or auto-generated)
  customer_id       VARCHAR(5),                 -- Links to customers.customer_id
  refer_by          VARCHAR(100),               -- referred by whom
  -- ── Route ─────────────────────────────────────────────────
  pol               VARCHAR(100),               -- Port of Loading
  pod               VARCHAR(100),               -- Port of Discharge
  -- ── Cargo ─────────────────────────────────────────────────
  commodity         VARCHAR(255),
  term              VARCHAR(50),                -- e.g. FOB, CIF, EXW
  dimension         VARCHAR(255),               -- cargo dimensions (free text)
  container         VARCHAR(100),               -- container type / size
  mode              VARCHAR(50),                -- SEA / AIR / LAND
  weight            VARCHAR(100),               -- originally NUMERIC, now allows strings like '1000 KG'
  -- ── Addresses ─────────────────────────────────────────────
  pickup_address    TEXT,
  delivery_address  TEXT,
  -- ── Customer ──────────────────────────────────────────────
  dear_who          VARCHAR(255),               -- salutation / contact name
  email             VARCHAR(255),
  -- ── Lifecycle ─────────────────────────────────────────────
  status            shipment_status NOT NULL DEFAULT 'Pending',
  last_follow_up    TIMESTAMPTZ     DEFAULT NOW(),  -- resets every status change
  -- ── Execution tracking (filled after confirmation) ────────
  do_number         VARCHAR(100),               -- Delivery Order number
  box_no            VARCHAR(100),               -- Box / carton number
  so_number         VARCHAR(100),               -- Shipping Order number
  bl_number         VARCHAR(100),               -- Bill of Lading number
  track_status      VARCHAR(255),               -- free-text tracking note
  carrier           VARCHAR(150),
  etd               DATE,                       -- Estimated Time of Departure
  eta               DATE,                       -- Estimated Time of Arrival
  cost              NUMERIC(15, 2),             -- quoted / confirmed cost
  profit            NUMERIC(15, 2),             -- profit amount
  customer_name     VARCHAR(255),
  customer_email    VARCHAR(255),
  note              TEXT,                       -- internal notes; "Direct Booking" = exclude from RFQ list
  -- ── Audit ─────────────────────────────────────────────────
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: shipment_replies
--  Stores parsed email replies linked to a shipment via ref_no
-- =============================================================
CREATE TABLE IF NOT EXISTS shipment_replies (
  id            SERIAL PRIMARY KEY,
  ref_no        VARCHAR(50) REFERENCES shipments(ref_no) ON DELETE CASCADE,
  from_email    VARCHAR(255),
  subject       TEXT,
  body_text     TEXT,
  received_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every row change
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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shipments_status         ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_last_follow_up ON shipments(last_follow_up);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at     ON shipments(created_at DESC);

-- =============================================================
--  TABLE: files
--  Each row represents one PDF attached to a shipment.
-- =============================================================
CREATE TABLE IF NOT EXISTS files (
  id              SERIAL PRIMARY KEY,
  shipment_ref_no VARCHAR(50)  NOT NULL
                  REFERENCES shipments(ref_no) ON DELETE CASCADE,
  filename        VARCHAR(255) NOT NULL,        -- sanitised filename on disk
  original_name   VARCHAR(255) NOT NULL,        -- original upload name shown in UI
  file_path       TEXT         NOT NULL,        -- absolute/relative path on server
  mime_type       VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  size_bytes      BIGINT,
  uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_ref_no ON files(shipment_ref_no);

-- =============================================================
--  SEED DATA
--  Default admin — password: Admin@1234  (bcrypt, 10 rounds)
--  Generate a fresh hash with: node -e "require('bcryptjs').hash('Admin@1234',10).then(console.log)"
-- =============================================================
INSERT INTO users (username, password_hash, role)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFQi',  -- Admin@1234
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- ── Sample shipments for development ──────────────────────────
INSERT INTO shipments (ref_no, refer_by, pol, pod, commodity, term, mode, weight, status, carrier, etd, eta, price, note, dear_who, email, container, last_follow_up)
VALUES
  ('ARG-1001', 'John Smith', 'Shanghai', 'Rotterdam', 'Electronics', 'FOB', 'SEA', 5200.000, 'Pending',          NULL,       NULL,         NULL,    NULL,            'Mr. Chen', 'chen@example.com', '20ft GP', NOW() - INTERVAL '5 hours'),
  ('ARG-1002', 'Alice Wong',  'Hong Kong', 'Los Angeles', 'Textiles', 'CIF', 'SEA', 12000.000,'Quoted',           NULL,       NULL,         3800.00, NULL,            'Ms. Alice','alice@example.com','40ft HC', NOW() - INTERVAL '2 hours'),
  ('ARG-1003', 'Bob Lee',    'Dubai',    'Singapore', 'Machinery',   'EXW', 'SEA', 8500.000, 'Customer Review',  NULL,       NULL,         7200.00, NULL,            'Mr. Bob',  'bob@example.com',  '40ft GP', NOW() - INTERVAL '6 hours'),
  ('ARG-1004', 'Carol Tan',  'Guangzhou', 'Sydney',   'Furniture',   'FOB', 'SEA', 3100.000, 'Confirmed',        'MSC',      '2026-07-10', 5100.00, NULL,            'Ms. Carol','carol@example.com','20ft GP', NOW()),
  ('ARG-1005', 'David Kim',  'Busan',    'Hamburg',   'Auto Parts',  'CIF', 'SEA', 9800.000, 'Files Pending',    'Maersk',   '2026-07-15', 9200.00, NULL,            'Mr. David','david@example.com','40ft HC', NOW()),
  ('ARG-1006', 'Eve Park',   'Tokyo',    'Vancouver', 'Food Prod.',  'FOB', 'AIR', 450.000,  'Completed',        'ANA Cargo','2026-06-20', 1800.00, NULL,            'Ms. Eve',  'eve@example.com',  NULL,      NOW()),
  ('ARG-1007', 'Frank Ng',   'Taipei',   'London',    'Samples',     'EXW', 'AIR', 120.000,  'Cancelled',        NULL,       NULL,         NULL,    NULL,            'Mr. Frank','frank@example.com',NULL,      NOW()),
  ('ARG-1008', 'Grace Ho',   'Shenzhen', 'Dubai',     'Cables',      'FOB', 'SEA', 6200.000, 'Pending',          NULL,       NULL,         NULL,    'Direct Booking','Ms. Grace','grace@example.com','20ft GP', NOW() - INTERVAL '5 hours'),
  ('ARG-1009', 'Henry Liu',  'Beijing',  'New York',  'Clothing',    'CIF', 'SEA', 4300.000, 'Return Pending',   'COSCO',    '2026-06-01', 3600.00, NULL,            'Mr. Henry','henry@example.com','40ft GP', NOW()),
  ('ARG-1010', 'Iris Lim',   'Kaohsiung','Auckland',  'Plastics',    'FOB', 'SEA', 2900.000, 'Quoted',           NULL,       NULL,         2400.00, NULL,            'Ms. Iris', 'iris@example.com', '20ft GP', NOW() - INTERVAL '8 hours')
ON CONFLICT (ref_no) DO NOTHING;

-- =============================================================
--  TABLE: contacts
--  Address book for auto-suggestions in RFQ generation
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

-- Ensure an email can have multiple routes/modes but not duplicate routes/modes
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_pol_pod_mode 
ON contacts (email, COALESCE(pol, ''), COALESCE(pod, ''), COALESCE(mode, ''));

-- Seed some contacts based on shipments
INSERT INTO contacts (email, dear_who, pol, pod, mode)
VALUES
  ('chen@example.com', 'Mr. Chen', 'Shanghai', 'Rotterdam', 'SEA'),
  ('alice@example.com', 'Ms. Alice', 'Hong Kong', 'Los Angeles', 'AIR'),
  ('bob@example.com', 'Mr. Bob', 'Dubai', 'Singapore', 'SEA')
ON CONFLICT DO NOTHING;

-- =============================================================
--  TABLE: customers
--  Unique 5-digit ID grouping
-- =============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  customer_id VARCHAR(5) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
--  TABLE: app_settings
--  Stores key-value configurations like credentials dynamically
-- =============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key           VARCHAR(255) PRIMARY KEY,
  value         TEXT
);

