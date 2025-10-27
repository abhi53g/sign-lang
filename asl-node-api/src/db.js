const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createDb(dbFile) {
  ensureDirFor(dbFile);
  const db = new Database(dbFile);
  db.pragma('journal_mode = WAL');

  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      active INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_activity_at TEXT
    )
  `).run();

  // Prediction logs table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS prediction_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      timestamp TEXT NOT NULL,
      label TEXT,
      confidence REAL,
      latency_ms REAL,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      client_ip TEXT,
      top_predictions TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // Indices for faster filters
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_prediction_logs_timestamp ON prediction_logs(timestamp)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_prediction_logs_user ON prediction_logs(user_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_prediction_logs_label ON prediction_logs(label)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_prediction_logs_success ON prediction_logs(success)`).run();

  return db;
}

module.exports = { createDb };
