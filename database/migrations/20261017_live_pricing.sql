CREATE TABLE IF NOT EXISTS live_pricing_lock (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO live_pricing_lock VALUES (1);
CREATE TABLE IF NOT EXISTS live_locations (
 id VARCHAR(40) PRIMARY KEY, name VARCHAR(240) NOT NULL, country VARCHAR(100) NOT NULL,
 kind VARCHAR(8) NOT NULL, aliases JSON NOT NULL, active BOOLEAN NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_rates (
 id CHAR(36) PRIMARY KEY, operator_id INT NOT NULL, version INT NOT NULL,
 status VARCHAR(16) NOT NULL, origin_id VARCHAR(40) NOT NULL, destination_id VARCHAR(40) NOT NULL,
 mode VARCHAR(8) NOT NULL, valid_until DATE NOT NULL, created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
 FOREIGN KEY(operator_id) REFERENCES users(id), FOREIGN KEY(origin_id) REFERENCES live_locations(id), FOREIGN KEY(destination_id) REFERENCES live_locations(id),
 INDEX live_lane(status,origin_id,destination_id,mode,valid_until), INDEX live_owner(operator_id,updated_at),
 CHECK(origin_id<>destination_id), CHECK(version>0),
 CHECK(status IN ('draft','pending','approved','rejected','inactive','expired','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_rate_versions (
 rate_id CHAR(36) NOT NULL, version INT NOT NULL, config JSON NOT NULL, created_by INT NOT NULL, created_at DATETIME(3) NOT NULL,
 PRIMARY KEY(rate_id,version), FOREIGN KEY(rate_id) REFERENCES live_rates(id), FOREIGN KEY(created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_rate_audits (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, rate_id CHAR(36), version INT, actor_id INT, action VARCHAR(40) NOT NULL,
 detail JSON NOT NULL, created_at DATETIME(3) NOT NULL, INDEX live_audit(rate_id,id), FOREIGN KEY(rate_id) REFERENCES live_rates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_estimates (
 id CHAR(36) PRIMARY KEY, rate_id CHAR(36), rate_version INT, shipment JSON NOT NULL, result JSON NOT NULL,
 created_at DATETIME(3) NOT NULL, expires_at DATETIME(3) NOT NULL, INDEX live_quote_rate(rate_id,rate_version),
 FOREIGN KEY(rate_id,rate_version) REFERENCES live_rate_versions(rate_id,version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_request_limits (
 bucket CHAR(64) PRIMARY KEY, hits INT NOT NULL, expires_at DATETIME NOT NULL, INDEX live_expiry(expires_at)
) ENGINE=InnoDB;
