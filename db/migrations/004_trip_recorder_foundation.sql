CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  start_location geography(Point, 4326),
  end_location geography(Point, 4326),
  distance_m integer,
  duration_seconds integer,
  avg_speed_kmh numeric(7,2),
  source text NOT NULL DEFAULT 'mobile_gps',
  driver_assignment_status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  location geography(Point, 4326) NOT NULL,
  speed_kmh numeric(7,2),
  heading_degrees numeric(6,2),
  altitude_m numeric(8,2),
  accuracy_m numeric(8,2),
  source text NOT NULL DEFAULT 'mobile_gps',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  driver_role text NOT NULL DEFAULT 'unknown',
  source text NOT NULL DEFAULT 'unknown',
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_vehicle_started_at_idx
  ON trips (vehicle_id, started_at DESC);

CREATE INDEX IF NOT EXISTS trips_start_location_gix
  ON trips USING GIST (start_location);

CREATE INDEX IF NOT EXISTS trips_end_location_gix
  ON trips USING GIST (end_location);

CREATE INDEX IF NOT EXISTS trip_points_trip_id_recorded_at_idx
  ON trip_points (trip_id, recorded_at);

CREATE INDEX IF NOT EXISTS trip_points_location_gix
  ON trip_points USING GIST (location);

CREATE INDEX IF NOT EXISTS trip_driver_assignments_trip_id_idx
  ON trip_driver_assignments (trip_id);
