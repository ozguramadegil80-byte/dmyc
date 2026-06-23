CREATE TABLE IF NOT EXISTS battery_cycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  charge_session_id uuid NOT NULL REFERENCES charge_sessions(id) ON DELETE CASCADE,
  start_soc numeric(5,2) NOT NULL,
  end_soc numeric(5,2) NOT NULL,
  soc_delta numeric(5,2) NOT NULL,
  efc_value numeric(8,4) NOT NULL,
  soc_band text NOT NULL DEFAULT 'unknown',
  charge_type text NOT NULL DEFAULT 'unknown',
  ambient_temp_c numeric(5,2),
  estimated_battery_temp_band text NOT NULL DEFAULT 'unknown',
  soc_stress_score numeric(5,4) NOT NULL DEFAULT 0,
  temperature_stress_score numeric(5,4) NOT NULL DEFAULT 0,
  charge_power_stress_score numeric(5,4) NOT NULL DEFAULT 0,
  dc_stress_score numeric(5,4) NOT NULL DEFAULT 0,
  stress_multiplier numeric(6,4) NOT NULL DEFAULT 1,
  stress_adjusted_cycle numeric(8,4) NOT NULL,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charge_session_id)
);

CREATE TABLE IF NOT EXISTS vehicle_battery_lifecycle_stats (
  vehicle_id uuid PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id),
  user_id uuid REFERENCES users(id),
  total_efc numeric(10,4) NOT NULL DEFAULT 0,
  total_stress_adjusted_cycles numeric(10,4) NOT NULL DEFAULT 0,
  avg_charge_start_soc numeric(5,2),
  avg_charge_end_soc numeric(5,2),
  ac_charge_count integer NOT NULL DEFAULT 0,
  dc_charge_count integer NOT NULL DEFAULT 0,
  dc_charge_ratio numeric(5,4),
  high_soc_charge_count integer NOT NULL DEFAULT 0,
  low_soc_charge_count integer NOT NULL DEFAULT 0,
  estimated_high_soc_hours numeric(10,2) NOT NULL DEFAULT 0,
  estimated_low_soc_events integer NOT NULL DEFAULT 0,
  avg_stress_multiplier numeric(6,4),
  battery_usage_grade text NOT NULL DEFAULT 'unknown',
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS battery_cycle_events_vehicle_created_idx
  ON battery_cycle_events (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS battery_cycle_events_ownership_idx
  ON battery_cycle_events (ownership_id, created_at DESC);

CREATE INDEX IF NOT EXISTS battery_cycle_events_charge_type_idx
  ON battery_cycle_events (vehicle_id, charge_type);

CREATE INDEX IF NOT EXISTS vehicle_battery_lifecycle_stats_ownership_idx
  ON vehicle_battery_lifecycle_stats (ownership_id);