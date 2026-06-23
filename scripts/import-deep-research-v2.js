const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(process.env.USERPROFILE || '', 'Downloads', 'deep-research-report (6).md');

const outputPath = path.join(__dirname, '..', 'Docs', 'vehicle_specs_master_v2.json');

if (!fs.existsSync(sourcePath)) {
  console.error(`Deep research source not found: ${sourcePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const records = JSON.parse(raw);

if (!Array.isArray(records)) {
  console.error('Deep research source must be a JSON array.');
  process.exit(1);
}

const normalized = records.map((record) => {
  const cleanRecord = cleanValue(record);
  const variantDisplayName = cleanRecord.variant_display_name ?? cleanRecord.variant ?? cleanRecord.trim;

  return {
    brand: cleanRecord.brand,
    model: cleanRecord.model,
    variant: variantDisplayName,
    variant_display_name: variantDisplayName,
    model_family: cleanRecord.model_family ?? cleanRecord.model,
    trim: cleanRecord.trim ?? null,
    drive_type: cleanRecord.drive_type ?? null,
    range_type: cleanRecord.range_type ?? null,
    year_from: cleanRecord.year_from ?? null,
    year_to: cleanRecord.year_to ?? null,
    official_sales_status: cleanRecord.official_sales_status ?? 'needs_review',
    battery_gross_kwh: cleanRecord.battery_gross_kwh ?? null,
    battery_net_kwh: cleanRecord.battery_net_kwh ?? null,
    wltp_range_km: cleanRecord.wltp_range_km ?? null,
    ac_max_kw: cleanRecord.ac_max_kw ?? null,
    dc_max_kw: cleanRecord.dc_max_kw ?? null,
    vehicle_class: cleanRecord.vehicle_class ?? null,
    curb_weight_kg: cleanRecord.curb_weight_kg ?? null,
    official_efficiency_wh_km: cleanRecord.official_efficiency_wh_km ?? null,
    recommended_daily_soc_min: cleanRecord.recommended_daily_soc_min ?? 20,
    recommended_daily_soc_max: cleanRecord.recommended_daily_soc_max ?? 80,
    heat_pump_available: cleanRecord.heat_pump_available ?? null,
    heat_pump_standard: cleanRecord.heat_pump_standard ?? null,
    battery_chemistry: cleanRecord.battery_chemistry ?? null,
    charging_port_type: cleanRecord.charging_port_type ?? null,
    towing_capacity_kg: cleanRecord.towing_capacity_kg ?? null,
    seats: cleanRecord.seats ?? null,
    source_name: cleanRecord.source_name ?? null,
    source_url: cleanRecord.source_url ?? null,
    verification_level: cleanRecord.verification_level ?? 'needs_review',
    identity_confidence: cleanRecord.identity_confidence ?? null,
    spec_confidence: cleanRecord.spec_confidence ?? null,
    known_issues: cleanRecord.known_issues ?? []
  };
});

fs.writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

console.log(`Imported ${normalized.length} deep research rows to ${path.relative(process.cwd(), outputPath)}`);

function cleanValue(value) {
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanValue(item)]));
  }

  if (typeof value === 'string') {
    return repairMojibake(value);
  }

  return value;
}

function repairMojibake(value) {
  if (!/[\u00c3\u00c4\u00c5\u00c2\u00e2]/.test(value)) {
    return value;
  }

  try {
    return Buffer.from(value, 'latin1')
      .toString('utf8')
      .replace(/\u00e2\u20ac\u2122/g, "'")
      .replace(/\u00e2\u20ac\u0153/g, '"')
      .replace(/\u00e2\u20ac\u009d/g, '"')
      .replace(/\u00e2\u20ac\u201c/g, '-')
      .replace(/\u00e2\u20ac\u201d/g, '-')
      .replace(/\u00e2\u2030\u00a0/g, '≠')
      .replace(/\u00e2\u2020\u201c/g, '↓')
      .replace(/\u00e2\u20ac\u00b9/g, '○');
  } catch {
    return value;
  }
}
