-- Additive migration. Requires the existing users table; never seeds prices or users.
CREATE TABLE IF NOT EXISTS freight_write_lock (
  id INT PRIMARY KEY
) ENGINE=InnoDB;
INSERT IGNORE INTO freight_write_lock (id) VALUES (1);

CREATE TABLE IF NOT EXISTS freight_locations (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  country CHAR(2) NOT NULL,
  aliases JSON NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_container_types (
  code VARCHAR(16) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
INSERT IGNORE INTO freight_container_types (code, label) VALUES
('20GP', '20-foot standard'), ('40GP', '40-foot standard'), ('40HQ', '40-foot high cube');
-- Stable facility identifiers: no city-to-port conflation. Admins can add verified locations.
INSERT IGNORE INTO freight_locations (id, name, country, aliases) VALUES
('CNSHA', 'Shanghai Port, China', 'CN', '["Shanghai", "Shang Hai"]'),
('QAHMD', 'Hamad Port, Qatar', 'QA', '["Hamad", "Hamad Port", "Mina Hamad"]'),
('AEJEA', 'Jebel Ali Port, UAE', 'AE', '["Jebel Ali", "Jabal Ali"]'),
('SGSIN', 'Singapore Port, Singapore', 'SG', '["Singapore"]');

CREATE TABLE IF NOT EXISTS freight_rates (
  id CHAR(36) PRIMARY KEY,
  operator_id INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status ENUM('pending','approved','rejected','withdrawn','archived') NOT NULL DEFAULT 'pending',
  markup_bps INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (operator_id) REFERENCES users(id),
  CHECK (markup_bps BETWEEN 0 AND 10000),
  INDEX freight_owner (operator_id, updated_at),
  INDEX freight_status (status, id, version)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_rate_revisions (
  rate_id CHAR(36) NOT NULL,
  version INT NOT NULL,
  origin_id VARCHAR(32) NOT NULL,
  destination_id VARCHAR(32) NOT NULL,
  container_type VARCHAR(16) NOT NULL,
  service VARCHAR(32) NOT NULL,
  basis VARCHAR(32) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  currency CHAR(3) NOT NULL,
  base_minor BIGINT NOT NULL,
  surcharge_minor BIGINT NULL,
  total_minor BIGINT NULL,
  charges_confirmed BOOLEAN NOT NULL,
  group_key CHAR(64) NOT NULL,
  details JSON NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (rate_id, version),
  FOREIGN KEY (rate_id) REFERENCES freight_rates(id),
  FOREIGN KEY (origin_id) REFERENCES freight_locations(id),
  FOREIGN KEY (destination_id) REFERENCES freight_locations(id),
  FOREIGN KEY (container_type) REFERENCES freight_container_types(code),
  FOREIGN KEY (created_by) REFERENCES users(id),
  CHECK (origin_id <> destination_id),
  CHECK (valid_until >= valid_from),
  CHECK (base_minor > 0),
  CHECK (surcharge_minor IS NULL OR surcharge_minor >= 0),
  CHECK ((charges_confirmed = 0 AND total_minor IS NULL) OR
         (charges_confirmed = 1 AND surcharge_minor IS NOT NULL AND total_minor = base_minor + surcharge_minor)),
  INDEX freight_validity (valid_until, valid_from),
  INDEX freight_comparison (group_key, currency, valid_from, valid_until),
  INDEX freight_lane (origin_id, destination_id, container_type)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_rate_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  rate_id CHAR(36) NULL,
  version INT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  details JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (rate_id) REFERENCES freight_rates(id),
  INDEX freight_audit (rate_id, id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_rate_approvals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  rate_id CHAR(36) NOT NULL,
  version INT NOT NULL,
  admin_id INT NOT NULL,
  decision VARCHAR(16) NOT NULL,
  comparison_date DATE NOT NULL,
  markup_bps INT NOT NULL DEFAULT 0,
  reason VARCHAR(500) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (rate_id, version) REFERENCES freight_rate_revisions(rate_id, version),
  FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_rate_attachments (
  id CHAR(36) PRIMARY KEY,
  rate_id CHAR(36) NOT NULL,
  version INT NOT NULL,
  filename VARCHAR(160) NOT NULL,
  content MEDIUMBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (rate_id, version) REFERENCES freight_rate_revisions(rate_id, version)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS freight_request_limits (
  bucket CHAR(64) PRIMARY KEY,
  hits INT NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX freight_limit_expiry (expires_at)
) ENGINE=InnoDB;
