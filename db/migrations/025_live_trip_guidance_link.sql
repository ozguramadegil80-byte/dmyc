ALTER TABLE route_guidance_sessions
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ALTER COLUMN route_plan_id DROP NOT NULL;

ALTER TABLE trip_advisories
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ALTER COLUMN route_plan_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS route_guidance_sessions_trip_idx
  ON route_guidance_sessions (trip_id, created_at DESC)
  WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS trip_advisories_trip_created_idx
  ON trip_advisories (trip_id, created_at DESC)
  WHERE trip_id IS NOT NULL;
