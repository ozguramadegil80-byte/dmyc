const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, '..', '..', 'Docs', 'vehicle_specs_master.json');
const VARIANT_MANIFEST_PATH = path.join(__dirname, '..', '..', 'Docs', 'vehicle_variant_manifest.json');
const BRAND_ASSETS_PATH = path.join(__dirname, '..', '..', 'Docs', 'vehicle_brand_assets.json');

function readVehicleSpecs(sourcePath = SOURCE_PATH) {
  return JSON.parse(fs.readFileSync(sourcePath, 'utf8')).map(applyVehicleSpecDefaults);
}

function applyVehicleSpecDefaults(spec) {
  const withDefaults = {
    ...spec,
    recommended_daily_soc_min: spec.recommended_daily_soc_min ?? 20,
    recommended_daily_soc_max: spec.recommended_daily_soc_max ?? 80
  };

  return applyToggLegacyDefaults(withDefaults);
}

function applyToggLegacyDefaults(spec) {
  if (spec.brand !== 'Togg') {
    return spec;
  }

  const key = [
    spec.model,
    spec.range_type,
    String(spec.drive_type || '').toUpperCase(),
    String(spec.trim || '').toLowerCase().includes('4more') ? '4more' : ''
  ].join('|');
  const defaults = toggLegacyDefaults[key];

  if (!defaults) {
    return spec;
  }

  return Object.fromEntries(
    Object.entries({ ...defaults, ...spec }).map(([field, value]) => [
      field,
      value ?? defaults[field]
    ])
  );
}

const toggLegacyDefaults = {
  'T10F|standard_range|RWD|': {
    year_from: 2025,
    battery_gross_kwh: 52.4,
    battery_net_kwh: 47.5,
    wltp_range_km: 350,
    ac_max_kw: 11,
    dc_max_kw: 150,
    heat_pump_available: true,
    heat_pump_standard: false,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  },
  'T10F|long_range|RWD|': {
    year_from: 2025,
    battery_gross_kwh: 88.5,
    battery_net_kwh: 83,
    wltp_range_km: 600,
    ac_max_kw: 22,
    dc_max_kw: 150,
    heat_pump_available: true,
    heat_pump_standard: true,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  },
  'T10F||AWD|4more': {
    year_from: 2025,
    battery_gross_kwh: 88.5,
    battery_net_kwh: 83,
    ac_max_kw: 22,
    dc_max_kw: 180,
    heat_pump_available: true,
    heat_pump_standard: true,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  },
  'T10X|standard_range|RWD|': {
    year_from: 2023,
    battery_gross_kwh: 52.4,
    battery_net_kwh: 47.5,
    wltp_range_km: 314,
    ac_max_kw: 22,
    dc_max_kw: 180,
    curb_weight_kg: 1949,
    official_efficiency_wh_km: 195,
    heat_pump_available: true,
    heat_pump_standard: false,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  },
  'T10X|long_range|RWD|': {
    year_from: 2023,
    battery_gross_kwh: 88.5,
    battery_net_kwh: 83,
    wltp_range_km: 523,
    ac_max_kw: 22,
    dc_max_kw: 180,
    curb_weight_kg: 2126,
    official_efficiency_wh_km: 191,
    heat_pump_available: true,
    heat_pump_standard: true,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  },
  'T10X||AWD|4more': {
    year_from: 2025,
    battery_gross_kwh: 88.5,
    battery_net_kwh: 83,
    wltp_range_km: 468,
    ac_max_kw: 22,
    dc_max_kw: 180,
    curb_weight_kg: 2133,
    official_efficiency_wh_km: 219,
    heat_pump_available: true,
    heat_pump_standard: true,
    battery_chemistry: 'NMC',
    charging_port_type: 'CCS2',
    seats: 5
  }
};

function readVariantManifest() {
  return JSON.parse(fs.readFileSync(VARIANT_MANIFEST_PATH, 'utf8'));
}

function readVehicleBrandAssets(sourcePath = BRAND_ASSETS_PATH) {
  if (!fs.existsSync(sourcePath)) {
    return new Map();
  }

  const assets = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  return new Map(
    assets
      .filter((asset) => asset?.brand)
      .map((asset) => [asset.brand, asset])
  );
}

function canonicalKey(spec) {
  return [spec.brand, spec.model]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('|');
}

function specKey(spec) {
  return [spec.brand, spec.model, spec.variant]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('|');
}

function displayName(spec) {
  const variantName = spec.variant_display_name ?? spec.variant;
  const model = String(spec.model || '').trim().toLowerCase();
  const variant = String(variantName || '').trim().toLowerCase();
  const nameParts = model && variant.includes(model) ? [spec.brand, variantName] : [spec.brand, spec.model, variantName];

  return nameParts
    .filter(Boolean)
    .join(' ');
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

module.exports = {
  applyVehicleSpecDefaults,
  canonicalKey,
  displayName,
  jsonLiteral,
  readVariantManifest,
  readVehicleBrandAssets,
  readVehicleSpecs,
  specKey,
  sqlLiteral
};
