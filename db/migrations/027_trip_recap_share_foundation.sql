CREATE TABLE IF NOT EXISTS trip_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  distance_km numeric(9,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 0,
  charge_duration_minutes integer NOT NULL DEFAULT 0,
  energy_used_kwh numeric(9,2),
  energy_cost numeric(10,2),
  arrival_soc numeric(5,2),
  passenger_count integer,
  climate_usage text,
  efficiency_rating text NOT NULL DEFAULT 'estimated',
  driving_profile text NOT NULL DEFAULT 'learning',
  trip_summary text NOT NULL,
  share_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE TABLE IF NOT EXISTS trip_share_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_recap_id uuid NOT NULL REFERENCES trip_recaps(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  card_type text NOT NULL DEFAULT 'story',
  public_token text NOT NULL UNIQUE,
  share_count integer NOT NULL DEFAULT 0,
  share_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_recaps_vehicle_created_idx
  ON trip_recaps (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_recaps_user_created_idx
  ON trip_recaps (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS trip_share_cards_trip_idx
  ON trip_share_cards (trip_id, created_at DESC);
