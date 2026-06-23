CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id uuid REFERENCES vehicle_specs(id),
  canonical_vehicle_id uuid REFERENCES canonical_vehicles(id),
  vin text UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_ownerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  user_id uuid NOT NULL REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  start_odometer_km integer,
  end_odometer_km integer,
  ownership_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  signal_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'mobile_local',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  profile_type text NOT NULL DEFAULT 'unknown',
  avg_daily_km numeric(8,2),
  avg_weekly_km numeric(8,2),
  city_trip_ratio numeric(5,4),
  highway_trip_ratio numeric(5,4),
  dc_charge_ratio numeric(5,4),
  home_charge_ratio numeric(5,4),
  avg_passenger_count numeric(4,2),
  avg_start_soc numeric(5,2),
  avg_end_soc numeric(5,2),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicles_vehicle_spec_id_idx
  ON vehicles (vehicle_spec_id);

CREATE INDEX IF NOT EXISTS vehicle_ownerships_vehicle_id_idx
  ON vehicle_ownerships (vehicle_id);

CREATE INDEX IF NOT EXISTS vehicle_ownerships_user_id_idx
  ON vehicle_ownerships (user_id);

CREATE INDEX IF NOT EXISTS usage_signals_vehicle_id_created_at_idx
  ON usage_signals (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS usage_profiles_vehicle_id_idx
  ON usage_profiles (vehicle_id);
