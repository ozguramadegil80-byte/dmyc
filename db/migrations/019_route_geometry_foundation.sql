CREATE TABLE IF NOT EXISTS route_geometry_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'manual_estimate',
  provider_route_id text,
  origin_label text NOT NULL,
  destination_label text NOT NULL,
  distance_km numeric(8,2) NOT NULL,
  duration_minutes integer,
  encoded_polyline text,
  bounds jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0.25,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_geometry_snapshots_plan_created_idx
  ON route_geometry_snapshots (route_plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS route_geometry_snapshots_vehicle_created_idx
  ON route_geometry_snapshots (vehicle_id, created_at DESC);
