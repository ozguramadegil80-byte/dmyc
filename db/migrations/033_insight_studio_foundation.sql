-- Behavior-based ad segments — deterministic, anonymous, no PII
CREATE TABLE IF NOT EXISTS ad_segments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_key        text UNIQUE NOT NULL,
  label              text NOT NULL,
  description        text,
  filter_rules       jsonb NOT NULL DEFAULT '{}'::jsonb,
  vehicle_count      integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- B2B query log — stores filter params and aggregated (anonymous) result
CREATE TABLE IF NOT EXISTS insight_queries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name       text NOT NULL,
  requester_label  text,
  filter_rules     jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary   jsonb,
  vehicle_count    integer,
  trip_count       integer,
  confidence_avg   numeric(5,4),
  executed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_segments_segment_key_idx
  ON ad_segments (segment_key);

CREATE INDEX IF NOT EXISTS insight_queries_requester_idx
  ON insight_queries (requester_label, created_at DESC);

CREATE INDEX IF NOT EXISTS insight_queries_created_at_idx
  ON insight_queries (created_at DESC);
