CREATE TABLE IF NOT EXISTS mama_users (
  telegram_id TEXT PRIMARY KEY,
  chat_id TEXT,
  started_at TEXT,
  blocked INTEGER NOT NULL DEFAULT 0,
  notifications_enabled INTEGER NOT NULL DEFAULT 0,
  notification_time TEXT NOT NULL DEFAULT '09:00',
  timezone TEXT NOT NULL DEFAULT '',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  birthday TEXT NOT NULL DEFAULT '',
  special_dates TEXT NOT NULL DEFAULT '',
  important_dates TEXT NOT NULL DEFAULT '[]',
  opened TEXT NOT NULL DEFAULT '[]',
  favorites TEXT NOT NULL DEFAULT '[]',
  first_launch TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_test_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS mama_deliveries (
  telegram_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  lease_until INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  message_id INTEGER,
  error_code INTEGER,
  sent_at TEXT,
  PRIMARY KEY (telegram_id, local_date, kind)
);
CREATE TABLE IF NOT EXISTS mama_runtime (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
