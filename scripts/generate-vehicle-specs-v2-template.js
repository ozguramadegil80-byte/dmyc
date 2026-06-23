const fs = require('fs');
const path = require('path');
const { readVariantManifest } = require('./lib/vehicle-catalog');

const manifest = readVariantManifest();
const outputPath = path.join(__dirname, '..', 'Docs', 'vehicle_specs_master_v2.template.json');

const records = manifest.flatMap((item) =>
  item.variants.map((variant) => ({
    brand: item.brand,
    model: item.model,
    variant,
    variant_display_name: variant,
    model_family: item.model,
    year_from: null,
    year_to: null,
    official_sales_status: 'needs_review',
    battery_gross_kwh: null,
    battery_net_kwh: null,
    wltp_range_km: null,
    ac_max_kw: null,
    dc_max_kw: null,
    drive_type: null,
    vehicle_class: null,
    curb_weight_kg: null,
    official_efficiency_wh_km: null,
    recommended_daily_soc_min: 20,
    recommended_daily_soc_max: 80,
    heat_pump_available: null,
    heat_pump_standard: null,
    battery_chemistry: null,
    charging_port_type: 'CCS2',
    towing_capacity_kg: null,
    seats: null,
    source_name: null,
    source_url: null,
    verification_level: 'needs_review'
  }))
);

fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

console.log(`Generated ${records.length} variant template rows at ${path.relative(process.cwd(), outputPath)}`);
