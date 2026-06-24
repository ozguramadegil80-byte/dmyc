-- Trip-level behavior analysis metadata: quality score gates route fingerprint updates.
-- Only analyses with quality >= 0.7 and route confidence >= 0.75 update route eco scores.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS behavior_analyzed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS behavior_analysis_quality numeric(5,4),
  ADD COLUMN IF NOT EXISTS behavior_eco_score        numeric(5,2),
  ADD COLUMN IF NOT EXISTS behavior_event_count      integer;
