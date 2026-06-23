CREATE TABLE IF NOT EXISTS route_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  route_key text NOT NULL,
  origin_cell text NOT NULL,
  destination_cell text NOT NULL,
  origin_centroid geography(Point, 4326),
  destination_centroid geography(Point, 4326),
  normal_distance_m integer,
  normal_duration_seconds integer,
  normal_avg_speed_kmh numeric(7,2),
  observed_trip_count integer NOT NULL DEFAULT 1,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0.15,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, route_key)
);

CREATE TABLE IF NOT EXISTS trip_route_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  route_fingerprint_id uuid NOT NULL REFERENCES route_fingerprints(id) ON DELETE CASCADE,
  assignment_confidence numeric(5,4) NOT NULL DEFAULT 0.15,
  deviation_distance_ratio numeric(7,4),
  deviation_duration_ratio numeric(7,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS route_fingerprints_vehicle_last_seen_idx
  ON route_fingerprints (vehicle_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS route_fingerprints_user_vehicle_idx
  ON route_fingerprints (user_id, vehicle_id);

CREATE INDEX IF NOT EXISTS route_fingerprints_origin_gix
  ON route_fingerprints USING GIST (origin_centroid);

CREATE INDEX IF NOT EXISTS route_fingerprints_destination_gix
  ON route_fingerprints USING GIST (destination_centroid);

CREATE INDEX IF NOT EXISTS trip_route_assignments_route_idx
  ON trip_route_assignments (route_fingerprint_id, created_at DESC);