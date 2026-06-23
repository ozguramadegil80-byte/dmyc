const fs = require('fs');
const path = require('path');
const { readVariantManifest, specKey } = require('./lib/vehicle-catalog');

const seedPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'Docs', 'vehicle_specs_master_v2.json');

if (!fs.existsSync(seedPath)) {
  console.error(`Seed file not found: ${path.relative(process.cwd(), seedPath)}`);
  console.error('Pass a file path or create Docs/vehicle_specs_master_v2.json.');
  process.exit(1);
}

const manifest = readVariantManifest();
const specs = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const manifestEntries = manifest.flatMap((item) =>
  item.variants.map((variant) => ({
    brand: item.brand,
    model: item.model,
    variant
  }))
);

const manifestKeys = new Set(manifestEntries.map((entry) => specKey(entry)));
const specKeys = new Set(specs.map((spec) => specKey(spec)));

const report = {
  seedPath: path.relative(process.cwd(), seedPath),
  generatedAt: new Date().toISOString(),
  manifestVariantCount: manifestEntries.length,
  seedSpecCount: specs.length,
  missingInSeed: manifestEntries.filter((entry) => !specKeys.has(specKey(entry))),
  extraInSeed: specs
    .filter((spec) => !manifestKeys.has(specKey(spec)))
    .map((spec) => pickIdentity(spec)),
  schemaIssues: validateSpecs(specs)
};

const reportDir = path.join(__dirname, '..', 'db', 'reports');
const reportPath = path.join(reportDir, 'vehicle_specs_master_v2_validation.json');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Seed specs: ${report.seedSpecCount}`);
console.log(`Manifest variants: ${report.manifestVariantCount}`);
console.log(`Missing in seed: ${report.missingInSeed.length}`);
console.log(`Extra in seed: ${report.extraInSeed.length}`);
console.log(`Schema issues: ${report.schemaIssues.length}`);
console.log(`Report written to ${path.relative(process.cwd(), reportPath)}`);

if (report.schemaIssues.length > 0 || report.missingInSeed.length > 0 || report.extraInSeed.length > 0) {
  process.exitCode = 1;
}

function validateSpecs(items) {
  const issues = [];
  const seen = new Set();

  if (!Array.isArray(items)) {
    return [{ issue: 'seed_must_be_array' }];
  }

  items.forEach((spec, index) => {
    for (const field of ['brand', 'model', 'variant']) {
      if (!spec[field] || typeof spec[field] !== 'string') {
        issues.push({ index, issue: 'required_string_missing', field, spec: pickIdentity(spec) });
      }
    }

    const key = specKey(spec);
    if (seen.has(key)) {
      issues.push({ index, issue: 'duplicate_seed_variant', spec: pickIdentity(spec) });
    }
    seen.add(key);

    if (spec.variant_display_name !== undefined && spec.variant_display_name !== null && typeof spec.variant_display_name !== 'string') {
      issues.push({ index, issue: 'variant_display_name_must_be_string_or_null', spec: pickIdentity(spec) });
    }

    if (spec.model_family !== undefined && spec.model_family !== null && typeof spec.model_family !== 'string') {
      issues.push({ index, issue: 'model_family_must_be_string_or_null', spec: pickIdentity(spec) });
    }

    for (const field of numericFields()) {
      if (spec[field] !== undefined && spec[field] !== null && typeof spec[field] !== 'number') {
        issues.push({ index, issue: 'numeric_field_must_be_number_or_null', field, spec: pickIdentity(spec) });
      }
    }

    for (const field of booleanFields()) {
      if (spec[field] !== undefined && spec[field] !== null && typeof spec[field] !== 'boolean') {
        issues.push({ index, issue: 'boolean_field_must_be_boolean_or_null', field, spec: pickIdentity(spec) });
      }
    }
  });

  return issues;
}

function numericFields() {
  return [
    'year_from',
    'year_to',
    'battery_gross_kwh',
    'battery_net_kwh',
    'wltp_range_km',
    'ac_max_kw',
    'dc_max_kw',
    'curb_weight_kg',
    'official_efficiency_wh_km',
    'recommended_daily_soc_min',
    'recommended_daily_soc_max',
    'towing_capacity_kg',
    'seats'
  ];
}

function booleanFields() {
  return ['heat_pump_available', 'heat_pump_standard'];
}

function pickIdentity(spec) {
  return {
    brand: spec?.brand ?? null,
    model: spec?.model ?? null,
    variant: spec?.variant ?? null,
    variant_display_name: spec?.variant_display_name ?? null,
    model_family: spec?.model_family ?? null
  };
}
