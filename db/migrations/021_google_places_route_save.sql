ALTER TABLE route_plans
  ADD COLUMN IF NOT EXISTS saved_name text;

CREATE INDEX IF NOT EXISTS route_plans_user_saved_idx
  ON route_plans (user_id, saved_name)
  WHERE saved_name IS NOT NULL;

ALTER TABLE charging_station_pois
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'operator';

CREATE UNIQUE INDEX IF NOT EXISTS charging_station_pois_google_place_uidx
  ON charging_station_pois (google_place_id)
  WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS charging_station_pois_source_type_idx
  ON charging_station_pois (source_type, evidence_status, operational_status);
