-- Gün 0 Değerlendirme Motoru — DB foundation
-- Adds purchase_year + odometer_km to vehicle_ownerships for Day 0 input.
-- vehicle_assessments stores the deterministic scenario output.

ALTER TABLE vehicle_ownerships
  ADD COLUMN IF NOT EXISTS purchase_year integer,
  ADD COLUMN IF NOT EXISTS odometer_km   integer;

CREATE TABLE IF NOT EXISTS vehicle_assessments (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id                    uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,

  purchase_year                   integer,
  odometer_km                     integer NOT NULL,
  city                            text,
  usage_type                      text,

  vehicle_age_years               integer NOT NULL,
  annual_km                       integer NOT NULL,
  monthly_km                      integer NOT NULL,
  practical_range_km              integer,
  estimated_total_full_cycles     numeric(8,1),
  estimated_monthly_full_cycles   numeric(6,2),
  city_traffic_class              text,
  usage_load_multiplier           numeric(5,3),
  usage_load_adjusted_annual_km   integer,

  scenario_id                     text NOT NULL,
  scenario_title                  text NOT NULL,
  scenario_body                   text NOT NULL,
  confidence                      text NOT NULL DEFAULT 'estimated',

  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_assessments_vehicle_idx
  ON vehicle_assessments (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vehicle_assessments_ownership_idx
  ON vehicle_assessments (ownership_id, created_at DESC)
  WHERE ownership_id IS NOT NULL;
