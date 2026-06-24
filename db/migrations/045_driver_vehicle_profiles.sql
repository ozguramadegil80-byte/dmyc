-- Per-(user, vehicle) driver profile: behavior scores and efficiency factor.
-- Global users.driver_efficiency_factor would wrongly flatten multi-vehicle behavior.
-- driver_efficiency_factor applies ONLY to WLTP/catalog range estimates;
-- when observed_wh_km is available from real trip data, use that instead (no double-penalty).

CREATE TABLE IF NOT EXISTS driver_vehicle_profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id                uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  eco_score_avg             numeric(5,2),
  driver_efficiency_factor  numeric(5,4) NOT NULL DEFAULT 1.0,
  analyzed_trip_count       integer NOT NULL DEFAULT 0,
  last_20_trip_score        numeric(5,2),
  last_analyzed_at          timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS driver_vehicle_profiles_user_idx
  ON driver_vehicle_profiles (user_id, vehicle_id);

CREATE INDEX IF NOT EXISTS driver_vehicle_profiles_vehicle_idx
  ON driver_vehicle_profiles (vehicle_id);
