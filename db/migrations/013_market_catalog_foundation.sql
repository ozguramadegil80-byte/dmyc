CREATE TABLE IF NOT EXISTS markets (
  code text PRIMARY KEY,
  name text NOT NULL,
  default_locale text NOT NULL DEFAULT 'tr',
  currency text NOT NULL DEFAULT 'TRY',
  distance_unit text NOT NULL DEFAULT 'km',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_spec_market_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id uuid NOT NULL REFERENCES vehicle_specs(id) ON DELETE CASCADE,
  market_code text NOT NULL REFERENCES markets(code) ON DELETE CASCADE,
  local_display_name text,
  local_sales_status text NOT NULL DEFAULT 'needs_review',
  year_from integer,
  year_to integer,
  source_name text,
  source_url text,
  verification_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_spec_id, market_code)
);

CREATE INDEX IF NOT EXISTS vehicle_spec_market_availability_market_status_idx
  ON vehicle_spec_market_availability (market_code, local_sales_status);

ALTER TABLE vehicle_source_evidence
  ADD COLUMN IF NOT EXISTS market_code text,
  ADD COLUMN IF NOT EXISTS source_country text,
  ADD COLUMN IF NOT EXISTS local_sales_status text,
  ADD COLUMN IF NOT EXISTS local_display_name text;

INSERT INTO markets (code, name, default_locale, currency, distance_unit, is_active)
VALUES
  ('TR', 'Türkiye', 'tr', 'TRY', 'km', true),
  ('GB', 'United Kingdom', 'en', 'GBP', 'mile', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  default_locale = EXCLUDED.default_locale,
  currency = EXCLUDED.currency,
  distance_unit = EXCLUDED.distance_unit,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO vehicle_spec_market_availability (
  vehicle_spec_id,
  market_code,
  local_display_name,
  local_sales_status,
  year_from,
  year_to,
  source_name,
  source_url,
  verification_level
)
SELECT
  id,
  'TR',
  COALESCE(variant_display_name, variant),
  COALESCE(official_sales_status, 'unknown'),
  year_from,
  year_to,
  source_name,
  source_url,
  verification_level
FROM vehicle_specs
ON CONFLICT (vehicle_spec_id, market_code) DO UPDATE SET
  local_display_name = EXCLUDED.local_display_name,
  local_sales_status = EXCLUDED.local_sales_status,
  year_from = EXCLUDED.year_from,
  year_to = EXCLUDED.year_to,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  verification_level = EXCLUDED.verification_level,
  updated_at = now();
