CREATE TABLE IF NOT EXISTS vehicle_source_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id uuid REFERENCES vehicle_specs(id) ON DELETE SET NULL,
  canonical_vehicle_id uuid REFERENCES canonical_vehicles(id) ON DELETE SET NULL,
  evidence_key text NOT NULL UNIQUE,
  source_type text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_retrieved_at timestamptz NOT NULL DEFAULT now(),
  brand text,
  model text,
  variant text,
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflict_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_status text NOT NULL DEFAULT 'pending_review',
  confidence_score numeric(5,4),
  notes text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_source_evidence_vehicle_spec_id_idx
  ON vehicle_source_evidence (vehicle_spec_id);

CREATE INDEX IF NOT EXISTS vehicle_source_evidence_brand_model_idx
  ON vehicle_source_evidence (brand, model);

CREATE INDEX IF NOT EXISTS vehicle_source_evidence_status_idx
  ON vehicle_source_evidence (evidence_status);

CREATE TABLE IF NOT EXISTS vehicle_spec_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_spec_id uuid REFERENCES vehicle_specs(id) ON DELETE SET NULL,
  evidence_id uuid REFERENCES vehicle_source_evidence(id) ON DELETE SET NULL,
  decision_type text NOT NULL,
  decision_status text NOT NULL DEFAULT 'pending',
  decided_by text,
  decided_at timestamptz,
  field_decisions jsonb NOT NULL DEFAULT '{}'::jsonb,
  resulting_verification_level text,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_spec_review_decisions_vehicle_spec_id_idx
  ON vehicle_spec_review_decisions (vehicle_spec_id);

CREATE INDEX IF NOT EXISTS vehicle_spec_review_decisions_evidence_id_idx
  ON vehicle_spec_review_decisions (evidence_id);

CREATE INDEX IF NOT EXISTS vehicle_spec_review_decisions_status_idx
  ON vehicle_spec_review_decisions (decision_status);
