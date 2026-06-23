CREATE TABLE IF NOT EXISTS canonical_charging_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text,
  location_name text NOT NULL,
  normalized_name text NOT NULL,
  location geography(Point, 4326),
  verification_level text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  canonical_charging_location_id uuid REFERENCES canonical_charging_locations(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  location geography(Point, 4326),
  charge_location_type text NOT NULL DEFAULT 'unknown',
  connector_type text,
  start_soc numeric(5,2),
  end_soc numeric(5,2),
  energy_kwh numeric(8,3),
  cost_amount numeric(10,2),
  currency text NOT NULL DEFAULT 'TRY',
  source text NOT NULL DEFAULT 'mobile_estimated',
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  evidence_status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charge_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_session_id uuid NOT NULL REFERENCES charge_sessions(id),
  evidence_type text NOT NULL,
  storage_uri text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  extracted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charging_decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  charge_session_id uuid REFERENCES charge_sessions(id),
  decision_at timestamptz NOT NULL DEFAULT now(),
  decision_location geography(Point, 4326),
  trigger_type text NOT NULL DEFAULT 'unknown',
  perceived_need text,
  start_soc numeric(5,2),
  target_soc numeric(5,2),
  source text NOT NULL DEFAULT 'mobile_estimated',
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canonical_charging_locations_location_gix
  ON canonical_charging_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS charge_sessions_vehicle_started_at_idx
  ON charge_sessions (vehicle_id, started_at DESC);

CREATE INDEX IF NOT EXISTS charge_sessions_location_gix
  ON charge_sessions USING GIST (location);

CREATE INDEX IF NOT EXISTS charge_evidence_session_id_idx
  ON charge_evidence (charge_session_id);

CREATE INDEX IF NOT EXISTS charging_decision_events_vehicle_decision_at_idx
  ON charging_decision_events (vehicle_id, decision_at DESC);

CREATE INDEX IF NOT EXISTS charging_decision_events_location_gix
  ON charging_decision_events USING GIST (decision_location);
