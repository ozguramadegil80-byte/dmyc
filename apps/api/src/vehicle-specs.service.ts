import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { VehicleSpecDto, VehicleSpecRow } from './types';

@Injectable()
export class VehicleSpecsService {
  constructor(private readonly db: DatabaseService) {}

  async list(q?: string, market = 'TR') {
    const normalizedMarket = normalizeMarket(market);
    const params: unknown[] = [normalizedMarket];
    let where = `
      WHERE COALESCE(vsma.local_sales_status, vs.official_sales_status) IS DISTINCT FROM 'legacy_reference'
        AND (
          $1 = 'TR'
          OR vsma.local_sales_status IN ('active', 'discontinued')
        )
    `;

    if (q?.trim()) {
      params.push(`%${q.trim()}%`);
      where = `
        ${where}
          AND (
            vs.brand ILIKE $2
            OR vs.model ILIKE $2
            OR vs.variant ILIKE $2
            OR vsma.local_display_name ILIKE $2
          )
      `;
    }

    const result = await this.db.query<VehicleSpecRow>(
      `
        SELECT
          vs.id,
          vs.canonical_vehicle_id,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant,
          vs.model_family,
          vs.variant_display_name,
          vs.year_from,
          vs.year_to,
          vs.official_sales_status,
          vs.battery_gross_kwh,
          vs.battery_net_kwh,
          vs.wltp_range_km,
          vs.ac_max_kw,
          vs.dc_max_kw,
          vs.drive_type,
          vs.vehicle_class,
          vs.curb_weight_kg,
          vs.official_efficiency_wh_km,
          vs.recommended_daily_soc_min,
          vs.recommended_daily_soc_max,
          vs.heat_pump_available,
          vs.heat_pump_standard,
          vs.battery_chemistry,
          vs.charging_port_type,
          vs.towing_capacity_kg,
          vs.seats,
          vs.source_name,
          vs.source_url,
          vs.image_url,
          vba.image_url AS brand_image_url,
          vs.verification_level,
          COALESCE(vsma.market_code, $1) AS market_code,
          vsma.local_display_name,
          vsma.local_sales_status,
          vsma.source_name AS market_source_name,
          vsma.source_url AS market_source_url,
          vsma.verification_level AS market_verification_level
        FROM vehicle_specs vs
        INNER JOIN canonical_vehicles cv ON cv.id = vs.canonical_vehicle_id
        LEFT JOIN vehicle_brand_assets vba ON vba.brand = vs.brand
        INNER JOIN vehicle_spec_market_availability vsma
          ON vsma.vehicle_spec_id = vs.id
          AND vsma.market_code = $1
        ${where}
        ORDER BY vs.brand, vs.model, vs.variant
      `,
      params,
    );

    return result.rows.map(mapVehicleSpec);
  }

  async getById(id: string) {
    const result = await this.db.query<VehicleSpecRow>(
      `
        SELECT
          vs.id,
          vs.canonical_vehicle_id,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant,
          vs.model_family,
          vs.variant_display_name,
          vs.year_from,
          vs.year_to,
          vs.official_sales_status,
          vs.battery_gross_kwh,
          vs.battery_net_kwh,
          vs.wltp_range_km,
          vs.ac_max_kw,
          vs.dc_max_kw,
          vs.drive_type,
          vs.vehicle_class,
          vs.curb_weight_kg,
          vs.official_efficiency_wh_km,
          vs.recommended_daily_soc_min,
          vs.recommended_daily_soc_max,
          vs.heat_pump_available,
          vs.heat_pump_standard,
          vs.battery_chemistry,
          vs.charging_port_type,
          vs.towing_capacity_kg,
          vs.seats,
          vs.source_name,
          vs.source_url,
          vs.image_url,
          vba.image_url AS brand_image_url,
          vs.verification_level,
          'TR'::text AS market_code,
          NULL::text AS local_display_name,
          NULL::text AS local_sales_status,
          NULL::text AS market_source_name,
          NULL::text AS market_source_url,
          NULL::text AS market_verification_level
        FROM vehicle_specs vs
        INNER JOIN canonical_vehicles cv ON cv.id = vs.canonical_vehicle_id
        LEFT JOIN vehicle_brand_assets vba ON vba.brand = vs.brand
        WHERE vs.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ? mapVehicleSpec(result.rows[0]) : null;
  }

  async getByCatalogKey(catalogKey: string) {
    const result = await this.db.query<VehicleSpecRow>(
      `
        SELECT
          vs.id,
          vs.canonical_vehicle_id,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant,
          vs.model_family,
          vs.variant_display_name,
          vs.year_from,
          vs.year_to,
          vs.official_sales_status,
          vs.battery_gross_kwh,
          vs.battery_net_kwh,
          vs.wltp_range_km,
          vs.ac_max_kw,
          vs.dc_max_kw,
          vs.drive_type,
          vs.vehicle_class,
          vs.curb_weight_kg,
          vs.official_efficiency_wh_km,
          vs.recommended_daily_soc_min,
          vs.recommended_daily_soc_max,
          vs.heat_pump_available,
          vs.heat_pump_standard,
          vs.battery_chemistry,
          vs.charging_port_type,
          vs.towing_capacity_kg,
          vs.seats,
          vs.source_name,
          vs.source_url,
          vs.image_url,
          vba.image_url AS brand_image_url,
          vs.verification_level,
          'TR'::text AS market_code,
          NULL::text AS local_display_name,
          NULL::text AS local_sales_status,
          NULL::text AS market_source_name,
          NULL::text AS market_source_url,
          NULL::text AS market_verification_level
        FROM vehicle_specs vs
        INNER JOIN canonical_vehicles cv ON cv.id = vs.canonical_vehicle_id
        LEFT JOIN vehicle_brand_assets vba ON vba.brand = vs.brand
        WHERE lower(trim(vs.brand)) || '|' || lower(trim(vs.model)) || '|' || lower(trim(vs.variant)) = $1
        LIMIT 1
      `,
      [catalogKey],
    );

    return result.rows[0] ? mapVehicleSpec(result.rows[0]) : null;
  }
}

export function mapVehicleSpec(row: VehicleSpecRow): VehicleSpecDto {
  return {
    id: specKey(row),
    catalogKey: specKey(row),
    vehicleSpecId: row.id,
    canonicalVehicleId: row.canonical_vehicle_id,
    displayName: displayName(row),
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    modelFamily: row.model_family,
    variantDisplayName: row.local_display_name ?? row.variant_display_name,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    officialSalesStatus: row.local_sales_status ?? row.official_sales_status,
    batteryGrossKwh: toNumber(row.battery_gross_kwh),
    batteryNetKwh: toNumber(row.battery_net_kwh),
    wltpRangeKm: row.wltp_range_km,
    acMaxKw: toNumber(row.ac_max_kw),
    dcMaxKw: toNumber(row.dc_max_kw),
    driveType: row.drive_type,
    vehicleClass: row.vehicle_class,
    curbWeightKg: row.curb_weight_kg,
    officialEfficiencyWhKm: row.official_efficiency_wh_km,
    recommendedDailySocMin: row.recommended_daily_soc_min,
    recommendedDailySocMax: row.recommended_daily_soc_max,
    heatPumpAvailable: row.heat_pump_available,
    heatPumpStandard: row.heat_pump_standard,
    batteryChemistry: row.battery_chemistry,
    chargingPortType: row.charging_port_type,
    towingCapacityKg: row.towing_capacity_kg,
    seats: row.seats,
    sourceName: row.market_source_name ?? row.source_name,
    sourceUrl: row.market_source_url ?? row.source_url,
    imageUrl: row.image_url,
    brandImageUrl: row.brand_image_url,
    verificationLevel: row.market_verification_level ?? row.verification_level,
    marketCode: row.market_code ?? 'TR',
    localDisplayName: row.local_display_name,
    localSalesStatus: row.local_sales_status,
    marketSourceName: row.market_source_name,
    marketSourceUrl: row.market_source_url,
    marketVerificationLevel: row.market_verification_level,
  };
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function specKey(row: Pick<VehicleSpecRow, 'brand' | 'model' | 'variant'>) {
  return [row.brand, row.model, row.variant]
    .map((part) => String(part || '').trim().toLowerCase())
    .join('|');
}

function normalizeMarket(value: string | undefined | null) {
  return value?.trim().toUpperCase() || 'TR';
}

function displayName(row: Pick<VehicleSpecRow, 'brand' | 'model' | 'variant' | 'variant_display_name' | 'local_display_name'>) {
  const variantName = row.local_display_name ?? row.variant_display_name ?? row.variant;
  const model = String(row.model || '').trim().toLowerCase();
  const variant = String(variantName || '').trim().toLowerCase();
  const nameParts = model && variant.includes(model) ? [row.brand, variantName] : [row.brand, row.model, variantName];

  return nameParts.filter(Boolean).join(' ');
}
