const {
  jsonLiteral,
  readVehicleSpecs,
  readVehicleBrandAssets,
  canonicalKey,
  sqlLiteral
} = require('./lib/vehicle-catalog');
const { runPsql } = require('./lib/docker-psql');

const specs = readVehicleSpecs(process.argv[2]);
const brandAssets = readVehicleBrandAssets();

const statements = [
  'BEGIN;',
  'TRUNCATE TABLE vehicle_specs, canonical_vehicles RESTART IDENTITY CASCADE;'
];

for (const spec of specs) {
  const key = canonicalKey(spec);
  const modelFamily = spec.model_family ?? spec.model;
  const variantDisplayName = spec.variant_display_name ?? spec.variant;

  statements.push(`
WITH canonical AS (
  INSERT INTO canonical_vehicles (canonical_key, brand, model, variant, display_name)
  VALUES (${sqlLiteral(key)}, ${sqlLiteral(spec.brand)}, ${sqlLiteral(spec.model)}, ${sqlLiteral(modelFamily)}, ${sqlLiteral([spec.brand, spec.model].filter(Boolean).join(' '))})
  ON CONFLICT (canonical_key) DO UPDATE SET
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    variant = EXCLUDED.variant,
    display_name = EXCLUDED.display_name,
    updated_at = now()
  RETURNING id
)
INSERT INTO vehicle_specs (
  canonical_vehicle_id,
  brand,
  model,
  variant,
  model_family,
  variant_display_name,
  year_from,
  year_to,
  official_sales_status,
  battery_gross_kwh,
  battery_net_kwh,
  wltp_range_km,
  ac_max_kw,
  dc_max_kw,
  drive_type,
  vehicle_class,
  curb_weight_kg,
  official_efficiency_wh_km,
  recommended_daily_soc_min,
  recommended_daily_soc_max,
  heat_pump_available,
  heat_pump_standard,
  battery_chemistry,
  charging_port_type,
  towing_capacity_kg,
  seats,
  source_name,
  source_url,
  image_url,
  verification_level,
  raw_source
)
SELECT
  canonical.id,
  ${sqlLiteral(spec.brand)},
  ${sqlLiteral(spec.model)},
  ${sqlLiteral(spec.variant)},
  ${sqlLiteral(modelFamily)},
  ${sqlLiteral(variantDisplayName)},
  ${sqlLiteral(spec.year_from)},
  ${sqlLiteral(spec.year_to)},
  ${sqlLiteral(spec.official_sales_status)},
  ${sqlLiteral(spec.battery_gross_kwh)},
  ${sqlLiteral(spec.battery_net_kwh)},
  ${sqlLiteral(spec.wltp_range_km)},
  ${sqlLiteral(spec.ac_max_kw)},
  ${sqlLiteral(spec.dc_max_kw)},
  ${sqlLiteral(spec.drive_type)},
  ${sqlLiteral(spec.vehicle_class)},
  ${sqlLiteral(spec.curb_weight_kg)},
  ${sqlLiteral(spec.official_efficiency_wh_km)},
  ${sqlLiteral(spec.recommended_daily_soc_min)},
  ${sqlLiteral(spec.recommended_daily_soc_max)},
  ${sqlLiteral(spec.heat_pump_available)},
  ${sqlLiteral(spec.heat_pump_standard)},
  ${sqlLiteral(spec.battery_chemistry)},
  ${sqlLiteral(spec.charging_port_type)},
  ${sqlLiteral(spec.towing_capacity_kg)},
  ${sqlLiteral(spec.seats)},
  ${sqlLiteral(spec.source_name)},
  ${sqlLiteral(spec.source_url)},
  ${sqlLiteral(spec.image_url)},
  ${sqlLiteral(spec.verification_level)},
  ${jsonLiteral(spec)}
FROM canonical;
`);
}

for (const asset of brandAssets.values()) {
  statements.push(`
INSERT INTO vehicle_brand_assets (brand, image_url, notes)
VALUES (${sqlLiteral(asset.brand)}, ${sqlLiteral(asset.image_url)}, ${sqlLiteral(asset.notes)})
ON CONFLICT (brand) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  notes = EXCLUDED.notes,
  updated_at = now();
`);
}

statements.push(`
INSERT INTO markets (code, name, default_locale, currency, distance_unit, is_active)
VALUES
  ('TR', 'Türkiye', 'tr', 'TRY', 'km', true),
  ('GB', 'United Kingdom', 'en', 'GBP', 'mile', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  default_locale = EXCLUDED.default_locale,
  currency = EXCLUDED.currency,
  distance_unit = EXCLUDED.distance_unit,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO vehicle_spec_market_availability (
  vehicle_spec_id,
  market_code,
  local_display_name,
  local_sales_status,
  year_from,
  year_to,
  source_name,
  source_url,
  verification_level
)
SELECT
  id,
  'TR',
  COALESCE(variant_display_name, variant),
  COALESCE(official_sales_status, 'unknown'),
  year_from,
  year_to,
  source_name,
  source_url,
  verification_level
FROM vehicle_specs
ON CONFLICT (vehicle_spec_id, market_code) DO UPDATE SET
  local_display_name = EXCLUDED.local_display_name,
  local_sales_status = EXCLUDED.local_sales_status,
  year_from = EXCLUDED.year_from,
  year_to = EXCLUDED.year_to,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  verification_level = EXCLUDED.verification_level,
  updated_at = now();
`);

statements.push('COMMIT;');
statements.push("SELECT 'vehicle_specs_count' AS metric, count(*) AS value FROM vehicle_specs;");
statements.push("SELECT 'canonical_vehicles_count' AS metric, count(*) AS value FROM canonical_vehicles;");

runPsql(statements.join('\n'));
