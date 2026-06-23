CREATE TABLE IF NOT EXISTS trip_contexts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id           uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  climate_usage     text,          -- 'on' | 'off' | 'unknown'
  passenger_count   text,          -- '1' | '2' | '3+'
  cargo_presence    text,          -- 'yes' | 'no' | 'unknown'
  deviation_reason  text,
  source            text NOT NULL DEFAULT 'user',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id)
);

CREATE TABLE IF NOT EXISTS trip_context_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id     uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  question_type  text NOT NULL,   -- 'CLIMATE_USAGE' | 'PASSENGER_COUNT' | 'CARGO_PRESENCE' | 'DEVIATION_REASON'
  is_silenced    boolean NOT NULL DEFAULT false,
  answered_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, question_type)
);

CREATE TABLE IF NOT EXISTS trip_behavior_signals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  signal_type   text NOT NULL,
  signal_value  text NOT NULL,
  source        text NOT NULL DEFAULT 'user_answer',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_contexts_trip_idx
  ON trip_contexts (trip_id);

CREATE INDEX IF NOT EXISTS trip_contexts_vehicle_idx
  ON trip_contexts (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_context_questions_trip_idx
  ON trip_context_questions (trip_id, answered_at);

CREATE INDEX IF NOT EXISTS trip_context_questions_vehicle_idx
  ON trip_context_questions (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_behavior_signals_trip_idx
  ON trip_behavior_signals (trip_id, signal_type);

CREATE INDEX IF NOT EXISTS trip_behavior_signals_vehicle_idx
  ON trip_behavior_signals (vehicle_id, created_at DESC);
