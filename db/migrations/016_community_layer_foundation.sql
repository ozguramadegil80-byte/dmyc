CREATE TABLE IF NOT EXISTS similar_trip_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id uuid REFERENCES vehicle_specs(id),
  route_cluster_key text NOT NULL,
  passenger_bucket text NOT NULL DEFAULT 'unknown',
  cargo_bucket text NOT NULL DEFAULT 'unknown',
  climate_bucket text NOT NULL DEFAULT 'unknown',
  speed_profile_bucket text NOT NULL DEFAULT 'unknown',
  temperature_bucket text NOT NULL DEFAULT 'unknown',
  trip_count integer NOT NULL DEFAULT 0,
  avg_distance_m integer,
  avg_duration_seconds integer,
  avg_consumption_kwh_100km numeric(8,3),
  avg_soc_drop numeric(6,3),
  avg_arrival_soc numeric(6,3),
  avg_speed_kmh numeric(7,2),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    vehicle_spec_id,
    route_cluster_key,
    passenger_bucket,
    cargo_bucket,
    climate_bucket,
    speed_profile_bucket,
    temperature_bucket
  )
);

CREATE TABLE IF NOT EXISTS route_community_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_fingerprint_id uuid NOT NULL REFERENCES route_fingerprints(id) ON DELETE CASCADE,
  similar_trip_cluster_id uuid REFERENCES similar_trip_clusters(id) ON DELETE SET NULL,
  matched_trip_count integer NOT NULL DEFAULT 0,
  match_quality_score numeric(5,4) NOT NULL DEFAULT 0,
  community_avg_distance_m integer,
  community_avg_duration_seconds integer,
  community_avg_speed_kmh numeric(7,2),
  community_avg_consumption_kwh_100km numeric(8,3),
  community_warning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, route_fingerprint_id)
);

CREATE INDEX IF NOT EXISTS similar_trip_clusters_vehicle_route_idx
  ON similar_trip_clusters (vehicle_spec_id, route_cluster_key);

CREATE INDEX IF NOT EXISTS similar_trip_clusters_sample_idx
  ON similar_trip_clusters (trip_count DESC, last_calculated_at DESC);

CREATE INDEX IF NOT EXISTS route_community_benchmarks_vehicle_idx
  ON route_community_benchmarks (vehicle_id, matched_trip_count DESC);

CREATE INDEX IF NOT EXISTS route_community_benchmarks_route_idx
  ON route_community_benchmarks (route_fingerprint_id);