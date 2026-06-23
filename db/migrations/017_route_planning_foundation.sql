CREATE TABLE IF NOT EXISTS route_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  origin_label text NOT NULL,
  destination_label text NOT NULL,
  requested_distance_km numeric(8,2) NOT NULL,
  estimated_duration_minutes integer,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confidence_score numeric(4,3) NOT NULL DEFAULT 0,
  feasibility_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  passenger_count integer NOT NULL DEFAULT 1,
  cargo_level text NOT NULL DEFAULT 'normal',
  weather_profile text NOT NULL DEFAULT 'normal',
  road_profile text NOT NULL DEFAULT 'mixed',
  start_soc integer NOT NULL DEFAULT 80,
  target_arrival_soc integer NOT NULL DEFAULT 15,
  estimated_consumption_wh_km numeric(8,2) NOT NULL,
  estimated_energy_kwh numeric(8,2) NOT NULL,
  usable_energy_kwh numeric(8,2) NOT NULL,
  energy_margin_kwh numeric(8,2) NOT NULL,
  expected_range_km numeric(8,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  strategy_type text NOT NULL,
  summary text NOT NULL,
  recommended_start_soc integer NOT NULL,
  recommended_arrival_buffer_soc integer NOT NULL,
  charge_needed boolean NOT NULL DEFAULT false,
  estimated_charge_stops integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_charge_stop_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  reason text NOT NULL,
  energy_needed_kwh numeric(8,2) NOT NULL,
  estimated_dc_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_plans_vehicle_created_idx
  ON route_plans (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS route_scenarios_plan_idx
  ON route_scenarios (route_plan_id);

CREATE INDEX IF NOT EXISTS route_strategies_plan_idx
  ON route_strategies (route_plan_id);

CREATE INDEX IF NOT EXISTS route_charge_stop_candidates_plan_idx
  ON route_charge_stop_candidates (route_plan_id, sequence);
