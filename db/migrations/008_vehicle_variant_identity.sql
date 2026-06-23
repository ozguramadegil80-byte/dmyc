ALTER TABLE vehicle_specs
  ADD COLUMN IF NOT EXISTS model_family text,
  ADD COLUMN IF NOT EXISTS variant_display_name text;

UPDATE vehicle_specs
SET
  model_family = COALESCE(model_family, model),
  variant_display_name = COALESCE(variant_display_name, variant);

ALTER TABLE vehicle_specs
  DROP CONSTRAINT IF EXISTS vehicle_specs_canonical_vehicle_id_year_from_year_to_key;

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_specs_brand_model_variant_key
  ON vehicle_specs (brand, model, variant);

CREATE INDEX IF NOT EXISTS vehicle_specs_model_family_idx
  ON vehicle_specs (brand, model_family);
