CREATE TABLE IF NOT EXISTS put_k_sebe_reminders (
 telegram_id INTEGER PRIMARY KEY,
 enabled INTEGER NOT NULL DEFAULT 0,
 time TEXT NOT NULL DEFAULT '21:00',
 timezone TEXT NOT NULL,
 day INTEGER NOT NULL DEFAULT 3,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS put_k_sebe_deliveries (
 telegram_id INTEGER NOT NULL,
 local_date TEXT NOT NULL,
 status TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY (telegram_id, local_date)
);
