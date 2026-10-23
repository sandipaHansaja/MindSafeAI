import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mindsafe_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

// Creates the table if missing (the database itself must already exist).
export async function initDb() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS sessions (
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
  ) ENGINE=InnoDB`);
}
