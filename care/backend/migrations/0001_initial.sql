CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  invoice_payload TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL CHECK (currency = 'XTR'),
  amount_stars INTEGER NOT NULL CHECK (amount_stars > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
  telegram_payment_charge_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS purchases_user_paid_idx
  ON purchases (telegram_user_id, status);

CREATE TABLE IF NOT EXISTS progress (
  telegram_user_id TEXT PRIMARY KEY,
  progress_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
