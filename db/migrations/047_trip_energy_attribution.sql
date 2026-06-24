-- Real energy attribution from SOC-delta charge windows to individual trips.
-- actual_wh_per_km is derived from (prev_charge.end_soc - this_charge.start_soc) × battery_net_kwh,
-- distributed proportionally by distance across trips in the window.
-- energy_source distinguishes real charge-window measurements from WLTP-based estimates.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS estimated_energy_kwh numeric(8,3),
  ADD COLUMN IF NOT EXISTS actual_wh_per_km     numeric(8,2),
  ADD COLUMN IF NOT EXISTS energy_source         text
    CHECK (energy_source IN ('charge_window', 'wltp_estimate'));

-- Weekly aggregations: recoverable energy/range/cost per (user, vehicle, route, week).
-- Populated only for trips assigned to a known route fingerprint (observed >= 2x).
CREATE TABLE IF NOT EXISTS weekly_route_driver_snapshots (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id                   uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_fingerprint_id         uuid NOT NULL REFERENCES route_fingerprints(id) ON DELETE CASCADE,
  week_start                   date NOT NULL,
  trip_count                   integer NOT NULL DEFAULT 0,
  total_distance_km            numeric(10,2),
  actual_energy_kwh            numeric(10,3),
  actual_wh_per_km             numeric(8,2),
  wltp_wh_per_km               numeric(8,2),
  eco_score_avg                numeric(5,2),
  driver_efficiency_factor     numeric(5,4),
  recoverable_energy_kwh       numeric(8,3),
  recoverable_range_km         numeric(8,2),
  recoverable_cost_try         numeric(10,2),
  electricity_rate_try_per_kwh numeric(8,4),
  dominant_behavior_issue      text CHECK (dominant_behavior_issue IN ('rapid_accel', 'hard_brake', 'mixed', 'none')),
  energy_source                text CHECK (energy_source IN ('charge_window', 'wltp_estimate')),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id, route_fingerprint_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_snapshots_user_vehicle_week_idx
  ON weekly_route_driver_snapshots (user_id, vehicle_id, week_start DESC);

CREATE INDEX IF NOT EXISTS weekly_snapshots_fingerprint_week_idx
  ON weekly_route_driver_snapshots (route_fingerprint_id, week_start DESC);
