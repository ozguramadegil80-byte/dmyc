import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type ReviewEvidenceRow = {
  id: string;
  vehicle_spec_id: string | null;
  canonical_vehicle_id: string | null;
  evidence_key: string;
  source_type: string;
  source_name: string;
  source_url: string;
  source_retrieved_at: Date;
  brand: string | null;
  model: string | null;
  variant: string | null;
  field_values: Record<string, unknown>;
  conflict_fields: string[];
  evidence_status: string;
  confidence_score: string | null;
  notes: string | null;
  raw_payload: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_variant: string | null;
  official_sales_status: string | null;
  verification_level: string | null;
};

type ReviewDecisionRow = {
  id: string;
  vehicle_spec_id: string | null;
  evidence_id: string | null;
  decision_type: string;
  decision_status: string;
  decided_by: string | null;
  decided_at: Date | null;
  field_decisions: Record<string, unknown>;
  resulting_verification_level: string | null;
  rationale: string | null;
  created_at: Date;
  updated_at: Date;
  evidence_key: string | null;
  source_name: string | null;
  source_url: string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
};

type CreateDecisionBody = {
  vehicleSpecId?: string;
  evidenceId?: string;
  decisionType: string;
  decisionStatus?: string;
  decidedBy?: string;
  fieldDecisions?: Record<string, unknown>;
  resultingVerificationLevel?: string;
  rationale?: string;
};

type UpdateEvidenceBody = {
  evidenceStatus?: string;
  notes?: string;
  confidenceScore?: number | null;
};

type UpdateDecisionBody = {
  decisionType?: string;
  decisionStatus?: string;
  decidedBy?: string;
  fieldDecisions?: Record<string, unknown>;
  resultingVerificationLevel?: string | null;
  rationale?: string | null;
};

type AdminVehicleSpecRow = {
  id: string;
  brand: string;
  model: string;
  variant: string;
  model_family: string | null;
  variant_display_name: string | null;
  year_from: number | null;
  year_to: number | null;
  official_sales_status: string | null;
  battery_gross_kwh: string | null;
  battery_net_kwh: string | null;
  wltp_range_km: number | null;
  ac_max_kw: string | null;
  dc_max_kw: string | null;
  drive_type: string | null;
  vehicle_class: string | null;
  curb_weight_kg: number | null;
  official_efficiency_wh_km: number | null;
  recommended_daily_soc_min: number | null;
  recommended_daily_soc_max: number | null;
  heat_pump_available: boolean | null;
  heat_pump_standard: boolean | null;
  battery_chemistry: string | null;
  charging_port_type: string | null;
  towing_capacity_kg: number | null;
  seats: number | null;
  source_name: string | null;
  source_url: string | null;
  image_url: string | null;
  brand_image_url: string | null;
  verification_level: string | null;
  market_code: string | null;
  local_display_name: string | null;
  local_sales_status: string | null;
  market_source_name: string | null;
  market_source_url: string | null;
  market_verification_level: string | null;
  updated_at: Date;
};

type UpdateVehicleSpecBody = Partial<Record<string, unknown>>;

type VehicleBrandAssetRow = {
  brand: string;
  image_url: string | null;
  notes: string | null;
  vehicle_count: string;
  updated_at: Date | null;
};

type UpdateVehicleBrandAssetBody = {
  imageUrl?: string | null;
  notes?: string | null;
};

const vehicleSpecFieldMap: Record<string, { column: string; kind: 'text' | 'number' | 'integer' | 'boolean' }> = {
  brand: { column: 'brand', kind: 'text' },
  model: { column: 'model', kind: 'text' },
  variant: { column: 'variant', kind: 'text' },
  modelFamily: { column: 'model_family', kind: 'text' },
  variantDisplayName: { column: 'variant_display_name', kind: 'text' },
  yearFrom: { column: 'year_from', kind: 'integer' },
  yearTo: { column: 'year_to', kind: 'integer' },
  officialSalesStatus: { column: 'official_sales_status', kind: 'text' },
  batteryGrossKwh: { column: 'battery_gross_kwh', kind: 'number' },
  batteryNetKwh: { column: 'battery_net_kwh', kind: 'number' },
  wltpRangeKm: { column: 'wltp_range_km', kind: 'integer' },
  acMaxKw: { column: 'ac_max_kw', kind: 'number' },
  dcMaxKw: { column: 'dc_max_kw', kind: 'number' },
  driveType: { column: 'drive_type', kind: 'text' },
  vehicleClass: { column: 'vehicle_class', kind: 'text' },
  curbWeightKg: { column: 'curb_weight_kg', kind: 'integer' },
  officialEfficiencyWhKm: { column: 'official_efficiency_wh_km', kind: 'integer' },
  recommendedDailySocMin: { column: 'recommended_daily_soc_min', kind: 'integer' },
  recommendedDailySocMax: { column: 'recommended_daily_soc_max', kind: 'integer' },
  heatPumpAvailable: { column: 'heat_pump_available', kind: 'boolean' },
  heatPumpStandard: { column: 'heat_pump_standard', kind: 'boolean' },
  batteryChemistry: { column: 'battery_chemistry', kind: 'text' },
  chargingPortType: { column: 'charging_port_type', kind: 'text' },
  towingCapacityKg: { column: 'towing_capacity_kg', kind: 'integer' },
  seats: { column: 'seats', kind: 'integer' },
  sourceName: { column: 'source_name', kind: 'text' },
  sourceUrl: { column: 'source_url', kind: 'text' },
  imageUrl: { column: 'image_url', kind: 'text' },
  verificationLevel: { column: 'verification_level', kind: 'text' },
};

@Injectable()
export class AdminReviewService {
  constructor(private readonly db: DatabaseService) {}

  async listVehicleSpecs(q?: string, market = 'TR') {
    const normalizedMarket = normalizeMarket(market);
    const params: unknown[] = [normalizedMarket];
    let where = '';

    if (q?.trim()) {
      params.push(`%${q.trim()}%`);
      where = `
        WHERE vehicle_specs.brand ILIKE $2
          OR vehicle_specs.model ILIKE $2
          OR vehicle_specs.variant ILIKE $2
          OR vsma.local_display_name ILIKE $2
      `;
    }

    const result = await this.db.query<AdminVehicleSpecRow>(
      `
        SELECT
          vehicle_specs.id,
          vehicle_specs.brand,
          vehicle_specs.model,
          vehicle_specs.variant,
          vehicle_specs.model_family,
          vehicle_specs.variant_display_name,
          vehicle_specs.year_from,
          vehicle_specs.year_to,
          vehicle_specs.official_sales_status,
          vehicle_specs.battery_gross_kwh,
          vehicle_specs.battery_net_kwh,
          vehicle_specs.wltp_range_km,
          vehicle_specs.ac_max_kw,
          vehicle_specs.dc_max_kw,
          vehicle_specs.drive_type,
          vehicle_specs.vehicle_class,
          vehicle_specs.curb_weight_kg,
          vehicle_specs.official_efficiency_wh_km,
          vehicle_specs.recommended_daily_soc_min,
          vehicle_specs.recommended_daily_soc_max,
          vehicle_specs.heat_pump_available,
          vehicle_specs.heat_pump_standard,
          vehicle_specs.battery_chemistry,
          vehicle_specs.charging_port_type,
          vehicle_specs.towing_capacity_kg,
          vehicle_specs.seats,
          vehicle_specs.source_name,
          vehicle_specs.source_url,
          vehicle_specs.image_url,
          (
            SELECT image_url
            FROM vehicle_brand_assets vba
            WHERE vba.brand = vehicle_specs.brand
            LIMIT 1
          ) AS brand_image_url,
          vehicle_specs.verification_level,
          COALESCE(vsma.market_code, $1) AS market_code,
          vsma.local_display_name,
          vsma.local_sales_status,
          vsma.source_name AS market_source_name,
          vsma.source_url AS market_source_url,
          vsma.verification_level AS market_verification_level,
          vehicle_specs.updated_at
        FROM vehicle_specs
        LEFT JOIN vehicle_spec_market_availability vsma
          ON vsma.vehicle_spec_id = vehicle_specs.id
          AND vsma.market_code = $1
        ${where}
        ORDER BY brand, model, variant
      `,
      params,
    );

    return result.rows.map(mapAdminVehicleSpec);
  }

  async listVehicleBrandAssets() {
    const result = await this.db.query<VehicleBrandAssetRow>(
      `
        SELECT
          brands.brand,
          vba.image_url,
          vba.notes,
          brands.vehicle_count,
          vba.updated_at
        FROM (
          SELECT brand, count(*)::text AS vehicle_count
          FROM vehicle_specs
          WHERE official_sales_status IS DISTINCT FROM 'legacy_reference'
          GROUP BY brand
        ) brands
        LEFT JOIN vehicle_brand_assets vba ON vba.brand = brands.brand
        ORDER BY brands.brand
      `,
    );

    return result.rows.map(mapVehicleBrandAsset);
  }

  async updateVehicleBrandAsset(brand: string, body: UpdateVehicleBrandAssetBody) {
    const normalizedBrand = brand.trim();
    const result = await this.db.query<VehicleBrandAssetRow>(
      `
        WITH upserted AS (
          INSERT INTO vehicle_brand_assets (brand, image_url, notes)
          VALUES ($1, $2, $3)
          ON CONFLICT (brand) DO UPDATE SET
            image_url = EXCLUDED.image_url,
            notes = EXCLUDED.notes,
            updated_at = now()
          RETURNING brand, image_url, notes, updated_at
        )
        SELECT
          upserted.brand,
          upserted.image_url,
          upserted.notes,
          count(vs.id)::text AS vehicle_count,
          upserted.updated_at
        FROM upserted
        LEFT JOIN vehicle_specs vs ON vs.brand = upserted.brand
        GROUP BY upserted.brand, upserted.image_url, upserted.notes, upserted.updated_at
      `,
      [normalizedBrand, emptyToNull(body.imageUrl), emptyToNull(body.notes)],
    );

    return result.rows[0] ? mapVehicleBrandAsset(result.rows[0]) : null;
  }

  async updateVehicleSpec(id: string, body: UpdateVehicleSpecBody) {
    const marketCode = normalizeMarket(String(body.marketCode ?? 'TR'));
    const availabilityPatch = pickMarketAvailabilityPatch(body);
    const entries = Object.entries(body).filter(([key]) => key in vehicleSpecFieldMap);

    if (entries.length === 0 && Object.keys(availabilityPatch).length === 0) {
      const existing = await this.listVehicleSpecs(undefined, marketCode);
      return existing.find((item) => item.id === id) ?? null;
    }

    if (entries.length > 0) {
      const sets: string[] = [];
      const params: unknown[] = [id];

      entries.forEach(([key, value], index) => {
        const field = vehicleSpecFieldMap[key];
        params.push(normalizeSpecValue(value, field.kind));
        sets.push(`${field.column} = $${index + 2}`);
      });

      await this.db.query(
        `
          UPDATE vehicle_specs
          SET ${sets.join(', ')}, updated_at = now()
          WHERE id = $1
        `,
        params,
      );
    }

    if (Object.keys(availabilityPatch).length > 0) {
      await this.upsertMarketAvailability(id, marketCode, availabilityPatch);
    }

    const updated = await this.listVehicleSpecs(undefined, marketCode);
    return updated.find((item) => item.id === id) ?? null;
  }

  private async upsertMarketAvailability(
    vehicleSpecId: string,
    marketCode: string,
    patch: {
      localDisplayName?: unknown;
      localSalesStatus?: unknown;
      marketSourceName?: unknown;
      marketSourceUrl?: unknown;
      marketVerificationLevel?: unknown;
    },
  ) {
    await this.db.query(
      `
        INSERT INTO vehicle_spec_market_availability (
          vehicle_spec_id,
          market_code,
          local_display_name,
          local_sales_status,
          source_name,
          source_url,
          verification_level
        )
        VALUES ($1, $2, $3, COALESCE($4, 'needs_review'), $5, $6, $7)
        ON CONFLICT (vehicle_spec_id, market_code) DO UPDATE SET
          local_display_name = COALESCE(EXCLUDED.local_display_name, vehicle_spec_market_availability.local_display_name),
          local_sales_status = COALESCE(EXCLUDED.local_sales_status, vehicle_spec_market_availability.local_sales_status),
          source_name = COALESCE(EXCLUDED.source_name, vehicle_spec_market_availability.source_name),
          source_url = COALESCE(EXCLUDED.source_url, vehicle_spec_market_availability.source_url),
          verification_level = COALESCE(EXCLUDED.verification_level, vehicle_spec_market_availability.verification_level),
          updated_at = now()
      `,
      [
        vehicleSpecId,
        marketCode,
        emptyToNull(patch.localDisplayName),
        emptyToNull(patch.localSalesStatus),
        emptyToNull(patch.marketSourceName),
        emptyToNull(patch.marketSourceUrl),
        emptyToNull(patch.marketVerificationLevel),
      ],
    );
  }

  async listEvidence(status?: string) {
    const params: unknown[] = [];
    let where = '';

    if (status?.trim()) {
      params.push(status.trim());
      where = 'WHERE vse.evidence_status = $1';
    }

    const result = await this.db.query<ReviewEvidenceRow>(
      `
        SELECT
          vse.id,
          vse.vehicle_spec_id,
          vse.canonical_vehicle_id,
          vse.evidence_key,
          vse.source_type,
          vse.source_name,
          vse.source_url,
          vse.source_retrieved_at,
          vse.brand,
          vse.model,
          vse.variant,
          vse.field_values,
          vse.conflict_fields,
          vse.evidence_status,
          vse.confidence_score,
          vse.notes,
          vse.raw_payload,
          vse.created_at,
          vse.updated_at,
          vs.brand AS vehicle_brand,
          vs.model AS vehicle_model,
          vs.variant AS vehicle_variant,
          vs.official_sales_status,
          vs.verification_level
        FROM vehicle_source_evidence vse
        LEFT JOIN vehicle_specs vs ON vs.id = vse.vehicle_spec_id
        ${where}
        ORDER BY vse.created_at DESC, vse.brand, vse.model
      `,
      params,
    );

    return result.rows.map(mapEvidence);
  }

  async listDecisions(status?: string) {
    const params: unknown[] = [];
    let where = '';

    if (status?.trim()) {
      params.push(status.trim());
      where = 'WHERE vsrd.decision_status = $1';
    }

    const result = await this.db.query<ReviewDecisionRow>(
      `
        SELECT
          vsrd.id,
          vsrd.vehicle_spec_id,
          vsrd.evidence_id,
          vsrd.decision_type,
          vsrd.decision_status,
          vsrd.decided_by,
          vsrd.decided_at,
          vsrd.field_decisions,
          vsrd.resulting_verification_level,
          vsrd.rationale,
          vsrd.created_at,
          vsrd.updated_at,
          vse.evidence_key,
          vse.source_name,
          vse.source_url,
          COALESCE(vse.brand, vs.brand) AS brand,
          COALESCE(vse.model, vs.model) AS model,
          COALESCE(vse.variant, vs.variant) AS variant
        FROM vehicle_spec_review_decisions vsrd
        LEFT JOIN vehicle_source_evidence vse ON vse.id = vsrd.evidence_id
        LEFT JOIN vehicle_specs vs ON vs.id = vsrd.vehicle_spec_id
        ${where}
        ORDER BY vsrd.created_at DESC
      `,
      params,
    );

    return result.rows.map(mapDecision);
  }

  async createDecision(body: CreateDecisionBody) {
    const result = await this.db.query<ReviewDecisionRow>(
      `
        INSERT INTO vehicle_spec_review_decisions (
          vehicle_spec_id,
          evidence_id,
          decision_type,
          decision_status,
          decided_by,
          decided_at,
          field_decisions,
          resulting_verification_level,
          rationale
        )
        VALUES ($1, $2, $3, COALESCE($4, 'pending'), $5, now(), $6::jsonb, $7, $8)
        RETURNING
          id,
          vehicle_spec_id,
          evidence_id,
          decision_type,
          decision_status,
          decided_by,
          decided_at,
          field_decisions,
          resulting_verification_level,
          rationale,
          created_at,
          updated_at,
          NULL::text AS evidence_key,
          NULL::text AS source_name,
          NULL::text AS source_url,
          NULL::text AS brand,
          NULL::text AS model,
          NULL::text AS variant
      `,
      [
        body.vehicleSpecId ?? null,
        body.evidenceId ?? null,
        body.decisionType,
        body.decisionStatus ?? null,
        body.decidedBy ?? null,
        JSON.stringify(body.fieldDecisions ?? {}),
        body.resultingVerificationLevel ?? null,
        body.rationale ?? null,
      ],
    );

    return mapDecision(result.rows[0]);
  }

  async updateEvidence(id: string, body: UpdateEvidenceBody) {
    const result = await this.db.query<ReviewEvidenceRow>(
      `
        UPDATE vehicle_source_evidence
        SET
          evidence_status = COALESCE($2, evidence_status),
          notes = COALESCE($3, notes),
          confidence_score = COALESCE($4::numeric, confidence_score),
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          vehicle_spec_id,
          canonical_vehicle_id,
          evidence_key,
          source_type,
          source_name,
          source_url,
          source_retrieved_at,
          brand,
          model,
          variant,
          field_values,
          conflict_fields,
          evidence_status,
          confidence_score,
          notes,
          raw_payload,
          created_at,
          updated_at,
          NULL::text AS vehicle_brand,
          NULL::text AS vehicle_model,
          NULL::text AS vehicle_variant,
          NULL::text AS official_sales_status,
          NULL::text AS verification_level
      `,
      [id, body.evidenceStatus ?? null, body.notes ?? null, body.confidenceScore ?? null],
    );

    return result.rows[0] ? mapEvidence(result.rows[0]) : null;
  }

  async deleteEvidence(id: string) {
    await this.db.query('DELETE FROM vehicle_spec_review_decisions WHERE evidence_id = $1', [id]);
    const result = await this.db.query<{ id: string }>(
      'DELETE FROM vehicle_source_evidence WHERE id = $1 RETURNING id',
      [id],
    );

    return {
      deleted: result.rowCount ?? 0,
      id,
    };
  }

  async updateDecision(id: string, body: UpdateDecisionBody) {
    const result = await this.db.query<ReviewDecisionRow>(
      `
        UPDATE vehicle_spec_review_decisions
        SET
          decision_type = COALESCE($2, decision_type),
          decision_status = COALESCE($3, decision_status),
          decided_by = COALESCE($4, decided_by),
          decided_at = now(),
          field_decisions = COALESCE($5::jsonb, field_decisions),
          resulting_verification_level = COALESCE($6, resulting_verification_level),
          rationale = COALESCE($7, rationale),
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          vehicle_spec_id,
          evidence_id,
          decision_type,
          decision_status,
          decided_by,
          decided_at,
          field_decisions,
          resulting_verification_level,
          rationale,
          created_at,
          updated_at,
          NULL::text AS evidence_key,
          NULL::text AS source_name,
          NULL::text AS source_url,
          NULL::text AS brand,
          NULL::text AS model,
          NULL::text AS variant
      `,
      [
        id,
        body.decisionType ?? null,
        body.decisionStatus ?? null,
        body.decidedBy ?? null,
        body.fieldDecisions === undefined ? null : JSON.stringify(body.fieldDecisions),
        body.resultingVerificationLevel ?? null,
        body.rationale ?? null,
      ],
    );

    return result.rows[0] ? mapDecision(result.rows[0]) : null;
  }

  async deleteDecision(id: string) {
    const result = await this.db.query<{ id: string }>(
      'DELETE FROM vehicle_spec_review_decisions WHERE id = $1 RETURNING id',
      [id],
    );

    return {
      deleted: result.rowCount ?? 0,
      id,
    };
  }
}

function mapEvidence(row: ReviewEvidenceRow) {
  return {
    id: row.id,
    vehicleSpecId: row.vehicle_spec_id,
    canonicalVehicleId: row.canonical_vehicle_id,
    evidenceKey: row.evidence_key,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceRetrievedAt: row.source_retrieved_at,
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    fieldValues: row.field_values,
    conflictFields: row.conflict_fields,
    evidenceStatus: row.evidence_status,
    confidenceScore: row.confidence_score === null ? null : Number(row.confidence_score),
    notes: row.notes,
    rawPayload: row.raw_payload,
    vehicle: row.vehicle_spec_id
      ? {
          brand: row.vehicle_brand,
          model: row.vehicle_model,
          variant: row.vehicle_variant,
          officialSalesStatus: row.official_sales_status,
          verificationLevel: row.verification_level,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdminVehicleSpec(row: AdminVehicleSpecRow) {
  return {
    id: row.id,
    displayName: displayName(row),
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    modelFamily: row.model_family,
    variantDisplayName: row.variant_display_name,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    officialSalesStatus: row.official_sales_status,
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
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    imageUrl: row.image_url,
    brandImageUrl: row.brand_image_url,
    verificationLevel: row.verification_level,
    marketCode: row.market_code ?? 'TR',
    localDisplayName: row.local_display_name,
    localSalesStatus: row.local_sales_status,
    marketSourceName: row.market_source_name,
    marketSourceUrl: row.market_source_url,
    marketVerificationLevel: row.market_verification_level,
    updatedAt: row.updated_at,
  };
}

function mapVehicleBrandAsset(row: VehicleBrandAssetRow) {
  return {
    brand: row.brand,
    imageUrl: row.image_url,
    notes: row.notes,
    vehicleCount: Number(row.vehicle_count),
    updatedAt: row.updated_at,
  };
}

function emptyToNull(value: unknown) {
  if (value === '' || value === undefined) {
    return null;
  }

  return value;
}

function normalizeMarket(value: string | undefined | null) {
  return value?.trim().toUpperCase() || 'TR';
}

function pickMarketAvailabilityPatch(body: UpdateVehicleSpecBody) {
  const patch: {
    localDisplayName?: unknown;
    localSalesStatus?: unknown;
    marketSourceName?: unknown;
    marketSourceUrl?: unknown;
    marketVerificationLevel?: unknown;
  } = {};

  for (const key of [
    'localDisplayName',
    'localSalesStatus',
    'marketSourceName',
    'marketSourceUrl',
    'marketVerificationLevel',
  ] as const) {
    if (key in body) {
      patch[key] = body[key];
    }
  }

  return patch;
}

function mapDecision(row: ReviewDecisionRow) {
  return {
    id: row.id,
    vehicleSpecId: row.vehicle_spec_id,
    evidenceId: row.evidence_id,
    decisionType: row.decision_type,
    decisionStatus: row.decision_status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    fieldDecisions: row.field_decisions,
    resultingVerificationLevel: row.resulting_verification_level,
    rationale: row.rationale,
    evidenceKey: row.evidence_key,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSpecValue(value: unknown, kind: 'text' | 'number' | 'integer' | 'boolean') {
  if (value === '' || value === undefined) {
    return null;
  }

  if (kind === 'boolean') {
    if (value === null) return null;
    if (typeof value === 'boolean') return value;
    if (String(value).toLowerCase() === 'true') return true;
    if (String(value).toLowerCase() === 'false') return false;
    return null;
  }

  if (kind === 'number' || kind === 'integer') {
    if (value === null) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return kind === 'integer' ? Math.round(parsed) : parsed;
  }

  return value === null ? null : String(value);
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function displayName(row: Pick<AdminVehicleSpecRow, 'brand' | 'model' | 'variant' | 'variant_display_name' | 'local_display_name'>) {
  const variantName = row.local_display_name ?? row.variant_display_name ?? row.variant;
  const model = String(row.model || '').trim().toLowerCase();
  const variant = String(variantName || '').trim().toLowerCase();
  const nameParts = model && variant.includes(model) ? [row.brand, variantName] : [row.brand, row.model, variantName];

  return nameParts.filter(Boolean).join(' ');
}
