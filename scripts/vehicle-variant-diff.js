const fs = require('fs');
const path = require('path');
const seedPath = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const { readVariantManifest, readVehicleSpecs, specKey } = require('./lib/vehicle-catalog');

const manifest = readVariantManifest();
const specs = readVehicleSpecs(seedPath);

const reportDir = path.join(__dirname, '..', 'db', 'reports');
const reportPath = path.join(reportDir, 'vehicle_variant_manifest_diff.json');

const manifestIssues = validateManifest(manifest);
const specIssues = validateSpecs(specs);
const manifestEntries = flattenManifest(manifest);
const manifestKeys = new Set(manifestEntries.map((entry) => specKey(entry)));
const specKeys = new Set(specs.map((spec) => specKey(spec)));

const missingInSeed = manifestEntries.filter((entry) => !specKeys.has(specKey(entry)));
const extraInSeed = specs
  .filter((spec) => !manifestKeys.has(specKey(spec)))
  .map((spec) => ({
    brand: spec.brand,
    model: spec.model,
    variant: spec.variant,
    official_sales_status: spec.official_sales_status ?? null,
    verification_level: spec.verification_level ?? null
  }));

const report = {
  generatedAt: new Date().toISOString(),
  seedPath: seedPath ? path.relative(process.cwd(), seedPath) : 'Docs/vehicle_specs_master.json',
  manifestModelCount: manifest.length,
  manifestVariantCount: manifestEntries.length,
  seedSpecCount: specs.length,
  matchedVariantCount: manifestEntries.length - missingInSeed.length,
  missingInSeed,
  extraInSeed,
  manifestIssues,
  specIssues
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Manifest variants: ${report.manifestVariantCount}`);
console.log(`Seed specs: ${report.seedSpecCount}`);
console.log(`Matched variants: ${report.matchedVariantCount}`);
console.log(`Missing in seed: ${report.missingInSeed.length}`);
console.log(`Extra in seed: ${report.extraInSeed.length}`);
console.log(`Manifest issues: ${report.manifestIssues.length}`);
console.log(`Spec issues: ${report.specIssues.length}`);
console.log(`Report written to ${path.relative(process.cwd(), reportPath)}`);

function flattenManifest(items) {
  return items.flatMap((item) =>
    item.variants.map((variant) => ({
      brand: item.brand,
      model: item.model,
      variant
    }))
  );
}

function validateManifest(items) {
  const issues = [];
  const seen = new Set();

  items.forEach((item, index) => {
    if (!item.brand || !item.model || !Array.isArray(item.variants)) {
      issues.push({ index, issue: 'brand_model_variants_required', item });
      return;
    }

    item.variants.forEach((variant) => {
      const entry = { brand: item.brand, model: item.model, variant };
      const key = specKey(entry);

      if (!variant) {
        issues.push({ index, issue: 'empty_variant', brand: item.brand, model: item.model });
      }

      if (seen.has(key)) {
        issues.push({ index, issue: 'duplicate_manifest_variant', brand: item.brand, model: item.model, variant });
      }

      seen.add(key);
    });
  });

  return issues;
}

function validateSpecs(items) {
  const issues = [];
  const seen = new Set();

  items.forEach((spec, index) => {
    for (const field of ['brand', 'model', 'variant']) {
      if (!spec[field]) {
        issues.push({ index, issue: 'required_field_missing', field, spec });
      }
    }

    const key = specKey(spec);

    if (seen.has(key)) {
      issues.push({ index, issue: 'duplicate_seed_variant', brand: spec.brand, model: spec.model, variant: spec.variant });
    }

    seen.add(key);
  });

  return issues;
}
