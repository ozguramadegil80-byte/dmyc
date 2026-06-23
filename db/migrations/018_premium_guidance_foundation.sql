CREATE TABLE IF NOT EXISTS route_guidance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  guidance_mode text NOT NULL DEFAULT 'premium_foundation',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_advisories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_plan_id uuid NOT NULL REFERENCES route_plans(id) ON DELETE CASCADE,
  guidance_session_id uuid NOT NULL REFERENCES route_guidance_sessions(id) ON DELETE CASCADE,
  advisory_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  recommended_action text,
  trigger_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS route_guidance_sessions_vehicle_created_idx
  ON route_guidance_sessions (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS route_guidance_sessions_plan_idx
  ON route_guidance_sessions (route_plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_advisories_vehicle_created_idx
  ON trip_advisories (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_advisories_plan_priority_idx
  ON trip_advisories (route_plan_id, priority ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS trip_advisories_session_priority_idx
  ON trip_advisories (guidance_session_id, priority ASC, created_at ASC);
