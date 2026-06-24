import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import * as scenariosJson from './assessment-scenarios.json';

type ScenariosFile = {
  [locale: string]: {
    [scenarioId: string]: { title: string; body: string | string[] };
  };
};

const scenarios = scenariosJson as ScenariosFile;

type CityProfile = { trafficClass: string; usageLoadMultiplier: number };

const cityTrafficProfiles: Record<string, CityProfile> = {
  'İstanbul': { trafficClass: 'very_high', usageLoadMultiplier: 1.15 },
  'Ankara':   { trafficClass: 'high',      usageLoadMultiplier: 1.08 },
  'İzmir':    { trafficClass: 'high',      usageLoadMultiplier: 1.07 },
  'Bursa':    { trafficClass: 'high',      usageLoadMultiplier: 1.06 },
  'Antalya':  { trafficClass: 'high_hot',  usageLoadMultiplier: 1.08 },
  'default':  { trafficClass: 'medium',    usageLoadMultiplier: 1.00 },
};

export type AssessmentInput = {
  odometerKm: number;
  purchaseYear?: number | null;
  city?: string | null;
  usageType?: string | null;
  language?: string | null;
};

type ComputedAssessment = {
  vehicleAgeYears: number;
  annualKm: number;
  monthlyKm: number;
  practicalRangeKm: number | null;
  estimatedTotalFullCycles: number | null;
  estimatedMonthlyFullCycles: number | null;
  cityTrafficClass: string;
  usageLoadMultiplier: number;
  usageLoadAdjustedAnnualKm: number;
  confidence: string;
  city: string;
  odometerKm: number;
  purchaseYear: number | null;
};

type ScenarioId = 'UNDER_USED_CLEAN' | 'NORMAL_USAGE' | 'HEAVY_USED_WORN';

@Injectable()
export class EvAssessmentService {
  constructor(private readonly db: DatabaseService) {}

  private async fetchPracticalRange(vehicleId: string): Promise<number | null> {
    const res = await this.db.query<{ wltp_range_km: number | null }>(
      `SELECT vs.wltp_range_km
       FROM vehicles v
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       WHERE v.id = $1
       LIMIT 1`,
      [vehicleId],
    );
    if (!res.rows[0] || res.rows[0].wltp_range_km == null) return null;
    return Math.round(res.rows[0].wltp_range_km * 0.85);
  }

  private compute(input: AssessmentInput, practicalRangeKm: number | null): ComputedAssessment {
    const currentYear = new Date().getFullYear();
    const vehicleAgeYears = input.purchaseYear
      ? Math.max(1, currentYear - input.purchaseYear)
      : 1;

    const annualKm = Math.round(input.odometerKm / vehicleAgeYears);
    const monthlyKm = Math.round(annualKm / 12);

    const cityKey = input.city && cityTrafficProfiles[input.city] ? input.city : 'default';
    const cityProfile = cityTrafficProfiles[cityKey];

    const estimatedTotalFullCycles =
      practicalRangeKm && practicalRangeKm > 0
        ? Math.round((input.odometerKm / practicalRangeKm) * 10) / 10
        : null;

    const estimatedMonthlyFullCycles =
      practicalRangeKm && practicalRangeKm > 0
        ? Math.round((monthlyKm / practicalRangeKm) * 100) / 100
        : null;

    const usageLoadAdjustedAnnualKm = Math.round(annualKm * cityProfile.usageLoadMultiplier);
    const confidence = practicalRangeKm ? 'estimated' : 'low';
    const displayCity = cityKey === 'default' ? (input.city ?? 'Türkiye') : cityKey;

    return {
      vehicleAgeYears,
      annualKm,
      monthlyKm,
      practicalRangeKm,
      estimatedTotalFullCycles,
      estimatedMonthlyFullCycles,
      cityTrafficClass: cityProfile.trafficClass,
      usageLoadMultiplier: cityProfile.usageLoadMultiplier,
      usageLoadAdjustedAnnualKm,
      confidence,
      city: displayCity,
      odometerKm: input.odometerKm,
      purchaseYear: input.purchaseYear ?? null,
    };
  }

  private selectScenario(c: ComputedAssessment): ScenarioId {
    if (
      c.annualKm > 30000 ||
      (c.estimatedTotalFullCycles !== null && c.estimatedTotalFullCycles > 350)
    ) {
      return 'HEAVY_USED_WORN';
    }
    if (
      c.annualKm < 12000 &&
      (c.estimatedTotalFullCycles === null || c.estimatedTotalFullCycles < 120)
    ) {
      return 'UNDER_USED_CLEAN';
    }
    return 'NORMAL_USAGE';
  }

  private renderTemplate(scenarioId: ScenarioId, c: ComputedAssessment, language = 'tr'): { title: string; body: string } {
    const locale = language.startsWith('en') ? 'en' : 'tr';
    const localeScenarios = scenarios[locale] ?? scenarios['tr'];
    const template = localeScenarios[scenarioId] ?? scenarios['tr'][scenarioId];

    const vars: Record<string, string> = {
      vehicleAgeYears: String(c.vehicleAgeYears),
      odometer_km: c.odometerKm.toLocaleString('tr-TR'),
      annualKm: c.annualKm.toLocaleString('tr-TR'),
      monthlyKm: c.monthlyKm.toLocaleString('tr-TR'),
      city: c.city,
      practicalRangeKm: c.practicalRangeKm ? String(c.practicalRangeKm) : '—',
      estimatedMonthlyFullCycles:
        c.estimatedMonthlyFullCycles !== null ? String(c.estimatedMonthlyFullCycles) : '—',
      estimatedTotalFullCycles:
        c.estimatedTotalFullCycles !== null ? String(c.estimatedTotalFullCycles) : '—',
    };

    const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

    const rawBody = Array.isArray(template.body) ? template.body.join('\n\n') : template.body;
    return { title: template.title, body: fill(rawBody) };
  }

  async createAssessment(vehicleId: string, ownershipId: string | null, input: AssessmentInput) {
    if (input.odometerKm < 0 || input.odometerKm > 500000) {
      throw new Error('odometerKm must be between 0 and 500000');
    }
    const currentYear = new Date().getFullYear();
    if (input.purchaseYear && input.purchaseYear > currentYear) {
      throw new Error('purchaseYear cannot be in the future');
    }

    const practicalRangeKm = await this.fetchPracticalRange(vehicleId);
    const computed = this.compute(input, practicalRangeKm);
    const scenarioId = this.selectScenario(computed);
    const { title, body } = this.renderTemplate(scenarioId, computed, input.language ?? 'tr');

    const res = await this.db.query(
      `INSERT INTO vehicle_assessments (
        vehicle_id, ownership_id, purchase_year, odometer_km, city, usage_type,
        vehicle_age_years, annual_km, monthly_km, practical_range_km,
        estimated_total_full_cycles, estimated_monthly_full_cycles,
        city_traffic_class, usage_load_multiplier, usage_load_adjusted_annual_km,
        scenario_id, scenario_title, scenario_body, confidence
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING
        id,
        vehicle_id                    AS "vehicleId",
        ownership_id                  AS "ownershipId",
        purchase_year                 AS "purchaseYear",
        odometer_km                   AS "odometerKm",
        city,
        vehicle_age_years             AS "vehicleAgeYears",
        annual_km                     AS "annualKm",
        monthly_km                    AS "monthlyKm",
        practical_range_km            AS "practicalRangeKm",
        estimated_total_full_cycles   AS "estimatedTotalFullCycles",
        estimated_monthly_full_cycles AS "estimatedMonthlyFullCycles",
        city_traffic_class            AS "cityTrafficClass",
        usage_load_multiplier         AS "usageLoadMultiplier",
        usage_load_adjusted_annual_km AS "usageLoadAdjustedAnnualKm",
        scenario_id                   AS "scenarioId",
        scenario_title                AS "scenarioTitle",
        scenario_body                 AS "scenarioBody",
        confidence,
        created_at                    AS "createdAt"`,
      [
        vehicleId,
        ownershipId ?? null,
        input.purchaseYear ?? null,
        input.odometerKm,
        computed.city,
        input.usageType ?? null,
        computed.vehicleAgeYears,
        computed.annualKm,
        computed.monthlyKm,
        computed.practicalRangeKm ?? null,
        computed.estimatedTotalFullCycles ?? null,
        computed.estimatedMonthlyFullCycles ?? null,
        computed.cityTrafficClass,
        computed.usageLoadMultiplier,
        computed.usageLoadAdjustedAnnualKm,
        scenarioId,
        title,
        body,
        computed.confidence,
      ],
    );

    return res.rows[0];
  }

  async getLatestAssessment(vehicleId: string, language = 'tr') {
    const res = await this.db.query(
      `SELECT
        id,
        vehicle_id                    AS "vehicleId",
        ownership_id                  AS "ownershipId",
        purchase_year                 AS "purchaseYear",
        odometer_km                   AS "odometerKm",
        city,
        vehicle_age_years             AS "vehicleAgeYears",
        annual_km                     AS "annualKm",
        monthly_km                    AS "monthlyKm",
        practical_range_km            AS "practicalRangeKm",
        estimated_total_full_cycles   AS "estimatedTotalFullCycles",
        estimated_monthly_full_cycles AS "estimatedMonthlyFullCycles",
        city_traffic_class            AS "cityTrafficClass",
        usage_load_multiplier         AS "usageLoadMultiplier",
        usage_load_adjusted_annual_km AS "usageLoadAdjustedAnnualKm",
        scenario_id                   AS "scenarioId",
        scenario_title                AS "scenarioTitle",
        scenario_body                 AS "scenarioBody",
        confidence,
        created_at                    AS "createdAt"
       FROM vehicle_assessments
       WHERE vehicle_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [vehicleId],
    );

    const row = res.rows[0] ?? null;
    if (!row) return null;

    // Always re-render from JSON so edits to assessment-scenarios.json take effect immediately.
    const scenarioId = row['scenarioId'] as ScenarioId;
    if (scenarioId) {
      const computed: ComputedAssessment = {
        vehicleAgeYears:              Number(row['vehicleAgeYears'])              || 0,
        annualKm:                     Number(row['annualKm'])                     || 0,
        monthlyKm:                    Number(row['monthlyKm'])                    || 0,
        practicalRangeKm:             row['practicalRangeKm'] != null ? Number(row['practicalRangeKm']) : null,
        estimatedTotalFullCycles:     row['estimatedTotalFullCycles'] != null ? Number(row['estimatedTotalFullCycles']) : null,
        estimatedMonthlyFullCycles:   row['estimatedMonthlyFullCycles'] != null ? Number(row['estimatedMonthlyFullCycles']) : null,
        cityTrafficClass:             String(row['cityTrafficClass'] ?? ''),
        usageLoadMultiplier:          Number(row['usageLoadMultiplier']) || 1,
        usageLoadAdjustedAnnualKm:    Number(row['usageLoadAdjustedAnnualKm']) || 0,
        confidence:                   String(row['confidence'] ?? ''),
        city:                         String(row['city'] ?? ''),
        odometerKm:                   Number(row['odometerKm'])                   || 0,
        purchaseYear:                 row['purchaseYear'] != null ? Number(row['purchaseYear']) : null,
      };
      const { title, body } = this.renderTemplate(scenarioId, computed, language);
      row['scenarioTitle'] = title;
      row['scenarioBody']  = body;
    }

    return row as Record<string, unknown>;
  }
}
