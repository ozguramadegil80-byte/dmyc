CREATE TABLE IF NOT EXISTS user_saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  location_kind text NOT NULL DEFAULT 'custom',
  address text,
  google_place_id text,
  location geography(Point, 4326) NOT NULL,
  source text NOT NULL DEFAULT 'mobile_pin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);

CREATE TABLE IF NOT EXISTS user_saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_location_id uuid NOT NULL REFERENCES user_saved_locations(id) ON DELETE CASCADE,
  destination_location_id uuid NOT NULL REFERENCES user_saved_locations(id) ON DELETE CASCADE,
  label text NOT NULL,
  confirmation_count integer NOT NULL DEFAULT 0,
  last_confirmed_at timestamptz,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origin_location_id, destination_location_id, label)
);

CREATE TABLE IF NOT EXISTS trip_route_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  saved_route_id uuid REFERENCES user_saved_routes(id) ON DELETE SET NULL,
  destination_location_id uuid REFERENCES user_saved_locations(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual_prompt',
  confirmation_status text NOT NULL DEFAULT 'asked',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE INDEX IF NOT EXISTS user_saved_locations_user_kind_idx
  ON user_saved_locations (user_id, location_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS user_saved_locations_location_gix
  ON user_saved_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS user_saved_routes_user_updated_idx
  ON user_saved_routes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS trip_route_intents_user_created_idx
  ON trip_route_intents (user_id, created_at DESC);
