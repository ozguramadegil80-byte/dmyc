const fs = require('fs');
const path = require('path');
const { displayName, readVehicleBrandAssets, readVehicleSpecs, specKey } = require('./lib/vehicle-catalog');

const specs = readVehicleSpecs(process.argv[2]);
const marketCode = String(process.argv[3] ?? 'TR').trim().toUpperCase();
const brandAssets = readVehicleBrandAssets();
const outputDir = path.join(__dirname, '..', 'db', 'exports');
const outputPath = path.join(outputDir, `mobile_vehicle_catalog_${marketCode}.json`);
const legacyOutputPath = path.join(outputDir, 'mobile_vehicle_catalog.json');

const marketSpecs = marketCode === 'TR' ? specs : [];
const catalog = marketSpecs
  .filter((spec) => spec.official_sales_status !== 'legacy_reference')
  .map((spec) => ({
  id: specKey(spec),
  catalogKey: specKey(spec),
  vehicleSpecId: null,
  displayName: displayName(spec),
  brand: spec.brand,
  model: spec.model,
  variant: spec.variant,
  modelFamily: spec.model_family ?? spec.model,
  variantDisplayName: spec.variant_display_name ?? spec.variant,
  yearFrom: spec.year_from,
  yearTo: spec.year_to,
  officialSalesStatus: spec.official_sales_status,
  batteryNetKwh: spec.battery_net_kwh,
  batteryGrossKwh: spec.battery_gross_kwh,
  wltpRangeKm: spec.wltp_range_km,
  acMaxKw: spec.ac_max_kw,
  dcMaxKw: spec.dc_max_kw,
  driveType: spec.drive_type,
  vehicleClass: spec.vehicle_class,
  curbWeightKg: spec.curb_weight_kg,
  officialEfficiencyWhKm: spec.official_efficiency_wh_km,
  recommendedDailySocMin: spec.recommended_daily_soc_min,
  recommendedDailySocMax: spec.recommended_daily_soc_max,
  heatPumpAvailable: spec.heat_pump_available,
  heatPumpStandard: spec.heat_pump_standard,
  batteryChemistry: spec.battery_chemistry,
  chargingPortType: spec.charging_port_type,
  towingCapacityKg: spec.towing_capacity_kg,
  seats: spec.seats,
  sourceName: spec.source_name,
  sourceUrl: spec.source_url,
  imageUrl: spec.image_url ?? null,
  brandImageUrl: brandAssets.get(spec.brand)?.image_url ?? null,
  verificationLevel: spec.verification_level,
  marketCode,
  localDisplayName: spec.variant_display_name ?? spec.variant,
  localSalesStatus: spec.official_sales_status,
  marketSourceName: spec.source_name,
  marketSourceUrl: spec.source_url,
  marketVerificationLevel: spec.verification_level
  }));

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
if (marketCode === 'TR') {
  fs.writeFileSync(legacyOutputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}

console.log(`Exported ${catalog.length} vehicles to ${path.relative(process.cwd(), outputPath)}`);
