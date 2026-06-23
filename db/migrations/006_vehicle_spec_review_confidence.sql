ALTER TABLE vehicle_specs
  ADD COLUMN IF NOT EXISTS review_confidence_score numeric(5,4);

CREATE INDEX IF NOT EXISTS vehicle_specs_review_confidence_score_idx
  ON vehicle_specs (review_confidence_score);
