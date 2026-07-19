-- =============================================================
--  ARGUS Freight Management System — MySQL Schema
--  Run once to initialise the database:
--    mysql -u root -p freight_rfq < database/mysql_schema.sql
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
--  TABLE: users
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(100) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             VARCHAR(50) NOT NULL DEFAULT 'operator',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_address    VARCHAR(255),
  email_password   VARCHAR(255),
  is_stalled       TINYINT(1) DEFAULT 0,
  name             VARCHAR(255),
  contact_number   VARCHAR(100),
  customer_id      VARCHAR(5),
  address          TEXT,
  company          VARCHAR(255),
  company_address  TEXT,
  secondary_phone  VARCHAR(100),
  email_signature  TEXT,
  agent_extension  VARCHAR(50)
);

-- =============================================================
--  TABLE: shipments
--  ref_no is the primary business key (e.g. ARG-1001)
-- =============================================================
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
  cost              DECIMAL(15, 2),
  profit            DECIMAL(15, 2),
  customer_name     VARCHAR(255),
  customer_email    VARCHAR(255),
  note              TEXT,
  operator          VARCHAR(100),
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_status         ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_last_follow_up ON shipments(last_follow_up);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at     ON shipments(created_at);

-- =============================================================
--  TABLE: shipment_replies
-- =============================================================
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
);

-- =============================================================
--  TABLE: files
-- =============================================================
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
);

CREATE INDEX IF NOT EXISTS idx_files_ref_no ON files(shipment_ref_no);

-- =============================================================
--  TABLE: contacts
-- =============================================================
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
);

-- =============================================================
--  TABLE: customers
-- =============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(5)   NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
--  TABLE: app_settings
-- =============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  `key`  VARCHAR(255) PRIMARY KEY,
  value  TEXT
);

-- =============================================================
--  TABLE: call_enquiries
-- =============================================================
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
);

-- =============================================================
--  TABLE: cc_recipients
-- =============================================================
CREATE TABLE IF NOT EXISTS cc_recipients (
  id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  multi_select TINYINT(1) NOT NULL DEFAULT 0
);

-- =============================================================
--  TABLE: compulsory_emails
-- =============================================================
CREATE TABLE IF NOT EXISTS compulsory_emails (
  id        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(255) NOT NULL,
  dear_who  VARCHAR(255) NOT NULL,
  mode      VARCHAR(50) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  UNIQUE KEY unique_email_mode (email, mode)
);

-- =============================================================
--  TABLE: customer_operator_chats
-- =============================================================
CREATE TABLE IF NOT EXISTS customer_operator_chats (
  id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cust_req_no      VARCHAR(50) NOT NULL,
  sender_username  VARCHAR(100) NOT NULL,
  message          TEXT NOT NULL,
  is_read          TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
--  TABLE: quotations
-- =============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  q_no            VARCHAR(50) NOT NULL UNIQUE,
  pol             VARCHAR(255),
  pod             VARCHAR(255),
  commodity       VARCHAR(255),
  pod_pcode       VARCHAR(255),
  pol_pcode       VARCHAR(255),
  freight         DECIMAL(15, 2),
  zone            VARCHAR(255),
  trans           DECIMAL(15, 2),
  total_rate      DECIMAL(15, 2),
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
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
--  SEED DATA
--  Default admin — password: Admin@1234  (bcrypt, 10 rounds)
-- =============================================================
INSERT IGNORE INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFQi', 'admin');

-- CC recipients
INSERT IGNORE INTO cc_recipients (name, email, multi_select) VALUES
  ('Nafih',  'op2@argusshipping.co',    0),
  ('Jabir',  'jabir@argusshipping.co',  0),
  ('Shamil', 'op1@argusshipping.co',    0),
  ('Ganesh', 'ganesh@argusshipping.co', 1),
  ('Jemshy', 'jemshy@argusshipping.co', 1);

-- Compulsory emails
INSERT IGNORE INTO compulsory_emails (email, dear_who, mode, is_active) VALUES
  ('reshma@aramex.com',               'Reshma',  'Air', 1),
  ('MelanieR@aramex.com',             'Melanie', 'Air', 1),
  ('Kumudu.Karunarathna@gwcss.qa',    'Kumudu',  'Sea', 1);
