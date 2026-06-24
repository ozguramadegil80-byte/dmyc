-- Trip-level driving behavior events: hard braking, rapid acceleration, over-speed.
-- Events are written after each trip closes; route_fingerprint aggregates are updated in the same pass.

CREATE TABLE IF NOT EXISTS trip_behavior_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  route_fingerprint_id   uuid REFERENCES route_fingerprints(id) ON DELETE SET NULL,
  event_type             text NOT NULL CHECK (event_type IN ('hard_brake', 'rapid_accel', 'over_speed')),
  occurred_at            timestamptz NOT NULL,
  location               geography(Point, 4326),
  speed_kmh_before       numeric(7,2),
  speed_kmh_after        numeric(7,2),
  delta_kmh_per_second   numeric(8,4),
  severity               text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_behavior_events_trip_idx
  ON trip_behavior_events (trip_id, occurred_at);

CREATE INDEX IF NOT EXISTS trip_behavior_events_fingerprint_idx
  ON trip_behavior_events (route_fingerprint_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS trip_behavior_events_location_gix
  ON trip_behavior_events USING GIST (location);

-- Behavior aggregates on route fingerprints (rolling averages, updated per trip).
ALTER TABLE route_fingerprints
  ADD COLUMN IF NOT EXISTS avg_hard_brake_count   numeric(7,2),
  ADD COLUMN IF NOT EXISTS avg_rapid_accel_count  numeric(7,2),
  ADD COLUMN IF NOT EXISTS avg_over_speed_seconds integer,
  ADD COLUMN IF NOT EXISTS behavior_eco_score     numeric(5,2),
  ADD COLUMN IF NOT EXISTS behavior_trip_count    integer NOT NULL DEFAULT 0;
