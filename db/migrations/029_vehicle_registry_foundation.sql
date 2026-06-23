CREATE TABLE IF NOT EXISTS vehicle_state_snapshots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id        uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  snapshot_reason     text NOT NULL DEFAULT 'manual',
  snapshot_date       date NOT NULL DEFAULT CURRENT_DATE,
  odometer_km         integer,
  trip_count          integer NOT NULL DEFAULT 0,
  total_distance_m    integer NOT NULL DEFAULT 0,
  total_energy_kwh    numeric(10,3),
  battery_usage_grade text NOT NULL DEFAULT 'unknown',
  total_efc           numeric(10,4) NOT NULL DEFAULT 0,
  confidence_score    numeric(5,4) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_drivers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  driver_label  text NOT NULL DEFAULT 'primary',
  active_since  date NOT NULL DEFAULT CURRENT_DATE,
  active_until  date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_driver_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  assignment_method text NOT NULL DEFAULT 'inferred',
  confidence_score  numeric(5,4) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE TABLE IF NOT EXISTS co_presence_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id            uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  estimated_occupancy   integer NOT NULL DEFAULT 1,
  detection_method      text NOT NULL DEFAULT 'manual',
  confidence_score      numeric(5,4) NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfer_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_ownership_id   uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  to_user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'pending',
  data_share_consent  boolean NOT NULL DEFAULT false,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_public_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  share_token         text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  verification_level  text NOT NULL DEFAULT 'basic',
  period_start        date,
  period_end          date,
  snapshot_data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  view_count          integer NOT NULL DEFAULT 0,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_state_snapshots_vehicle_date_idx
  ON vehicle_state_snapshots (vehicle_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS vehicle_state_snapshots_ownership_idx
  ON vehicle_state_snapshots (ownership_id, snapshot_date DESC)
  WHERE ownership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_drivers_vehicle_idx
  ON vehicle_drivers (vehicle_id, active_since DESC);

CREATE INDEX IF NOT EXISTS vehicle_drivers_user_idx
  ON vehicle_drivers (user_id, active_since DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS trip_driver_assignments_trip_idx
  ON trip_driver_assignments (trip_id);

CREATE INDEX IF NOT EXISTS co_presence_events_trip_idx
  ON co_presence_events (trip_id);

CREATE INDEX IF NOT EXISTS co_presence_events_vehicle_idx
  ON co_presence_events (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transfer_requests_vehicle_idx
  ON transfer_requests (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transfer_requests_to_user_idx
  ON transfer_requests (to_user_id, status)
  WHERE to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vehicle_public_reports_vehicle_idx
  ON vehicle_public_reports (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vehicle_public_reports_token_idx
  ON vehicle_public_reports (share_token);
