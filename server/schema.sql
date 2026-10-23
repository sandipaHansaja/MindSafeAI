CREATE DATABASE IF NOT EXISTS mindsafe_db CHARACTER SET utf8mb4;
USE mindsafe_db;
-- Privacy by design: no user id, no IP, and NO journal text is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  sentiment_label VARCHAR(16) NOT NULL,
  sentiment_score DECIMAL(4,3) NOT NULL,
  stress_level TINYINT UNSIGNED NOT NULL,
  risk_level VARCHAR(16) NOT NULL,
  emotions JSON NULL,
  text_length INT UNSIGNED NOT NULL,
  country CHAR(5) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB;
