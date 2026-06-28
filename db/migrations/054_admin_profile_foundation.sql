CREATE TABLE IF NOT EXISTS admin_profiles (
  id TEXT PRIMARY KEY DEFAULT 'default',
  username TEXT NOT NULL DEFAULT 'admin',
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Panel Yöneticisi',
  avatar_url TEXT,
  password_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO admin_profiles (id, username, full_name)
VALUES ('default', 'admin', 'Panel Yöneticisi')
ON CONFLICT (id) DO NOTHING;
