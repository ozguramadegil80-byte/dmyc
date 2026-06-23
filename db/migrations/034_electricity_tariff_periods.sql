-- EPDK electricity tariff periods — validity-range model (not monthly)
-- Each row covers a date range during which a fixed kWh price applies.
-- valid_to = NULL means currently active. When a new period is created,
-- the previous active period's valid_to is set to (new valid_from - 1 day).
CREATE TABLE IF NOT EXISTS electricity_tariff_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id       text UNIQUE NOT NULL,
  market_code     text NOT NULL DEFAULT 'TR',
  subscriber_type text NOT NULL DEFAULT 'residential',
  tariff_type     text NOT NULL DEFAULT 'single_time',
  tier            text NOT NULL DEFAULT 'standard',
  tl_per_kwh      numeric(10,6) NOT NULL,
  tax_included    boolean NOT NULL DEFAULT true,
  valid_from      date NOT NULL,
  valid_to        date,
  source          text NOT NULL DEFAULT 'EPDK',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- TR residential tariff periods (EPDK kurul kararları)
INSERT INTO electricity_tariff_periods
  (period_id, market_code, subscriber_type, tariff_type, tier, tl_per_kwh, tax_included, valid_from, valid_to, source)
VALUES
  ('TR_RESIDENTIAL_2023_04', 'TR', 'residential', 'single_time', 'low', 1.474394, true, '2023-04-01', '2024-06-30', 'EPDK'),
  ('TR_RESIDENTIAL_2024_07', 'TR', 'residential', 'single_time', 'low', 2.072342, true, '2024-07-01', '2025-04-04', 'EPDK'),
  ('TR_RESIDENTIAL_2025_04', 'TR', 'residential', 'single_time', 'low', 2.590428, true, '2025-04-05', NULL,         'EPDK')
ON CONFLICT (period_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS electricity_tariff_periods_market_sub_idx
  ON electricity_tariff_periods (market_code, subscriber_type, valid_from DESC);

CREATE INDEX IF NOT EXISTS electricity_tariff_periods_active_idx
  ON electricity_tariff_periods (market_code, subscriber_type)
  WHERE valid_to IS NULL;
