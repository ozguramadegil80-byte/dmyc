-- Sponsor banner config: single-row, admin-managed
CREATE TABLE IF NOT EXISTS sponsor_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url   text,
  click_url  text,
  label      text,
  is_active  boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure exactly one row exists
INSERT INTO sponsor_config (is_active) VALUES (false)
ON CONFLICT DO NOTHING;
