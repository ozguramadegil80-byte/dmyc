CREATE TABLE IF NOT EXISTS monthly_reports (
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id      uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  period_year       integer NOT NULL,
  period_month      integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  trip_count        integer NOT NULL DEFAULT 0,
  total_distance_m  integer NOT NULL DEFAULT 0,
  total_duration_seconds integer NOT NULL DEFAULT 0,
  avg_speed_kmh     numeric(7,2),
  total_energy_kwh  numeric(10,3),
  total_cost_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'TRY',
  cost_per_km       numeric(10,4),
  ac_charge_count   integer NOT NULL DEFAULT 0,
  dc_charge_count   integer NOT NULL DEFAULT 0,
  fossil_equiv_cost numeric(12,2),
  estimated_savings numeric(12,2),
  confidence_score  numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vehicle_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS annual_reports (
  vehicle_id           uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id         uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  user_id              uuid REFERENCES users(id) ON DELETE SET NULL,
  period_year          integer NOT NULL,
  total_distance_m     integer NOT NULL DEFAULT 0,
  total_duration_seconds integer NOT NULL DEFAULT 0,
  avg_speed_kmh        numeric(7,2),
  total_energy_kwh     numeric(10,3),
  total_cost_amount    numeric(12,2) NOT NULL DEFAULT 0,
  currency             text NOT NULL DEFAULT 'TRY',
  cost_per_km          numeric(10,4),
  ac_charge_count      integer NOT NULL DEFAULT 0,
  dc_charge_count      integer NOT NULL DEFAULT 0,
  fossil_equiv_cost    numeric(12,2),
  estimated_savings    numeric(12,2),
  optional_insurance   numeric(12,2),
  optional_service_cost numeric(12,2),
  total_ownership_cost numeric(12,2),
  confidence_score     numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vehicle_id, period_year)
);

CREATE INDEX IF NOT EXISTS monthly_reports_vehicle_period_idx
  ON monthly_reports (vehicle_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS monthly_reports_ownership_idx
  ON monthly_reports (ownership_id, period_year DESC, period_month DESC)
  WHERE ownership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS annual_reports_vehicle_year_idx
  ON annual_reports (vehicle_id, period_year DESC);

CREATE INDEX IF NOT EXISTS annual_reports_ownership_idx
  ON annual_reports (ownership_id, period_year DESC)
  WHERE ownership_id IS NOT NULL;
