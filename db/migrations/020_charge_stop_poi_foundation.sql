CREATE TABLE IF NOT EXISTS charging_station_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL DEFAULT 'TR',
  operator_name text NOT NULL,
  station_name text NOT NULL,
  address text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  max_dc_kw numeric(8,2),
  connector_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  operational_status text NOT NULL DEFAULT 'active',
  evidence_status text NOT NULL DEFAULT 'pending_review',
  source_label text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_charge_stop_poi_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  charge_stop_candidate_id uuid NOT NULL REFERENCES route_charge_stop_candidates(id) ON DELETE CASCADE,
  station_poi_id uuid NOT NULL REFERENCES charging_station_pois(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  detour_km numeric(8,2),
  match_score numeric(4,3) NOT NULL DEFAULT 0,
  recommendation_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_plan_id, charge_stop_candidate_id, station_poi_id)
);

CREATE INDEX IF NOT EXISTS charging_station_pois_market_status_idx
  ON charging_station_pois (market_code, operational_status, evidence_status);

CREATE INDEX IF NOT EXISTS charging_station_pois_operator_idx
  ON charging_station_pois (operator_name, station_name);

CREATE INDEX IF NOT EXISTS route_charge_stop_poi_candidates_plan_rank_idx
  ON route_charge_stop_poi_candidates (route_plan_id, rank ASC);

CREATE INDEX IF NOT EXISTS route_charge_stop_poi_candidates_stop_rank_idx
  ON route_charge_stop_poi_candidates (charge_stop_candidate_id, rank ASC);
