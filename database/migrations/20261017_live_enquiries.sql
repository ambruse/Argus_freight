CREATE TABLE IF NOT EXISTS live_enquiry_rotation (
 scope VARCHAR(100) PRIMARY KEY, next_index BIGINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS live_enquiries (
 id CHAR(36) PRIMARY KEY, payload_hash CHAR(64) NOT NULL,
 contact JSON NOT NULL, route JSON NOT NULL, recipient VARCHAR(254) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
 error_code VARCHAR(40), created_at DATETIME(3) NOT NULL,
 updated_at DATETIME(3) NOT NULL, sent_at DATETIME(3),
 INDEX live_enquiry_status(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
