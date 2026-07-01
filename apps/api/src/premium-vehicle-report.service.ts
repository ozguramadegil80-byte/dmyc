import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ElectricityTariffService } from './electricity-tariff.service';

// balanced/watch/high_stress → harf notası
function normalizeBatteryGrade(raw: string | null | undefined): string {
  const map: Record<string, string> = {
    'balanced':    'B+',
    'watch':       'B',
    'high_stress': 'C',
    'unknown':     'unknown',
  };
  if (!raw) return 'unknown';
  const letter = map[raw];
  if (letter) return letter;
  // Zaten harf notasıysa olduğu gibi döndür
  return ['A+', 'A', 'B+', 'B', 'C', 'D'].includes(raw) ? raw : 'unknown';
}

// ─── Internal row shapes ────────────────────────────────────────────────────

type SpecRow = {
  brand: string;
  model: string;
  battery_net_kwh: string | null;
  wltp_range_km: number | null;
};

type BatteryRow = {
  total_efc: number;
  total_stress_adjusted_cycles: number;
  ac_charge_count: number;
  dc_charge_count: number;
  dc_charge_ratio: number | null;
  high_soc_charge_count: number;
  low_soc_charge_count: number;
  battery_usage_grade: string;
  confidence_score: number;
};

type AnnualRow = {
  total_energy_kwh: number;
  total_distance_m: number;
  fossil_equiv_cost: number;
  estimated_savings: number;
  total_cost_amount: number;
};

type AssessmentRow = {
  scenario_id: string;
  scenario_title: string;
  odometer_km: number;
  vehicle_age_years: number;
  annual_km: number;
  practical_range_km: number | null;
  estimated_total_full_cycles: number | null;
  city: string | null;
  city_traffic_class: string | null;
};

type PublicReportRow = {
  share_token: string;
  verification_level: string;
  created_at: string;
};

type DrivingStyleResult = {
  score: number | null;
  label: string;
  consumptionDeviationPercent: number | null;
  confidence: 'low' | 'medium' | 'high';
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PremiumVehicleReportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly electricityTariff: ElectricityTariffService,
  ) {}

  private async fetchSpecs(vehicleId: string): Promise<SpecRow | null> {
    const res = await this.db.query<SpecRow>(
      `SELECT vs.brand, vs.model, vs.battery_net_kwh, vs.wltp_range_km
       FROM vehicles v
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       WHERE v.id = $1 LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  private async fetchBattery(vehicleId: string): Promise<BatteryRow | null> {
    const res = await this.db.query<BatteryRow>(
      `SELECT total_efc, total_stress_adjusted_cycles,
              ac_charge_count, dc_charge_count, dc_charge_ratio,
              high_soc_charge_count, low_soc_charge_count,
              battery_usage_grade, confidence_score
       FROM vehicle_battery_lifecycle_stats
       WHERE vehicle_id = $1 LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  private async fetchAnnual(vehicleId: string): Promise<AnnualRow | null> {
    const res = await this.db.query<AnnualRow>(
      `SELECT total_energy_kwh, total_distance_m, fossil_equiv_cost,
              estimated_savings, total_cost_amount
       FROM annual_reports
       WHERE vehicle_id = $1
       ORDER BY period_year DESC NULLS LAST
       LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  private async fetchAssessment(vehicleId: string): Promise<AssessmentRow | null> {
    const res = await this.db.query<AssessmentRow>(
      `SELECT scenario_id, scenario_title, odometer_km, vehicle_age_years,
              annual_km, practical_range_km, estimated_total_full_cycles,
              city, city_traffic_class
       FROM vehicle_assessments
       WHERE vehicle_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  private async fetchPublicReport(vehicleId: string): Promise<PublicReportRow | null> {
    const res = await this.db.query<PublicReportRow>(
      `SELECT share_token, verification_level, created_at
       FROM vehicle_public_reports
       WHERE vehicle_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  // ── Driving style scoring (deterministic, 3-component) ───────────────────

  private computeDrivingStyle(
    bls: BatteryRow | null,
    annual: AnnualRow | null,
    specRefKwh: number | null,
  ): DrivingStyleResult {
    const totalCharges = (bls?.ac_charge_count ?? 0) + (bls?.dc_charge_count ?? 0);

    if (!bls || totalCharges < 5 || !annual?.total_energy_kwh || !annual?.total_distance_m) {
      return { score: null, label: 'Belirsiz / veri yetersiz', consumptionDeviationPercent: null, confidence: 'low' };
    }

    // Component 1 — Consumption deviation (40%)
    let consumptionScore = 100;
    let consumptionDeviationPercent: number | null = null;

    const distanceKm = annual.total_distance_m / 1000;
    if (distanceKm > 0 && specRefKwh && specRefKwh > 0) {
      const actualKwhPer100 = (Number(annual.total_energy_kwh) / distanceKm) * 100;
      const rawDev = ((actualKwhPer100 - specRefKwh) / specRefKwh) * 100;
      consumptionDeviationPercent = Math.round(rawDev * 10) / 10;
      const dev = Math.max(0, rawDev);
      consumptionScore = Math.max(0, 100 - dev * 2.5);
    }

    // Component 2 — DC fast-charge ratio (30%)
    const dcRatio = Number(bls.dc_charge_ratio ?? 0);
    const dcScore = Math.max(0, 100 - dcRatio * 125); // 80% DC → 0

    // Component 3 — Stress cycle ratio (30%)
    const efc = Number(bls.total_efc);
    const stressRatio = efc > 0 ? Number(bls.total_stress_adjusted_cycles) / efc : 1.0;
    const stressScore = Math.max(0, Math.min(100, 100 - (stressRatio - 1.0) * 200));

    const overall = Math.round(consumptionScore * 0.40 + dcScore * 0.30 + stressScore * 0.30);

    let label: string;
    if (overall >= 85) label = 'Sakin kullanım';
    else if (overall >= 70) label = 'Dengeli kullanım';
    else if (overall >= 50) label = 'Hafif agresif kullanım';
    else if (overall >= 30) label = 'Agresif kullanım';
    else label = 'Belirsiz / veri yetersiz';

    return { score: overall, label, consumptionDeviationPercent, confidence: 'medium' };
  }

  private chargingStyleLabel(bls: BatteryRow): string {
    const dcRatio = Number(bls.dc_charge_ratio ?? 0);
    if (dcRatio > 0.5) return 'Yoğun hızlı şarj';
    if (bls.high_soc_charge_count > 3) return 'Yüksek SOC takibi';
    if (dcRatio < 0.1 && bls.high_soc_charge_count <= 1) return 'Dikkatli şarj';
    return 'Normal takip';
  }

  private renderDriverSummary(
    style: DrivingStyleResult,
    chargingLabel: string,
    specRefKwh: number | null,
  ): string {
    if (style.confidence === 'low') {
      return 'Sürüş ve şarj davranışını değerlendirmek için yeterli veri henüz toplanmamıştır. Araç daha fazla kullandıkça bu özet güncellenecektir.';
    }

    const devStr =
      style.consumptionDeviationPercent !== null
        ? style.consumptionDeviationPercent > 0
          ? `%${style.consumptionDeviationPercent} üzerinde`
          : style.consumptionDeviationPercent < 0
          ? `%${Math.abs(style.consumptionDeviationPercent)} altında`
          : 'fabrika referansına yakın'
        : null;

    const refPart = specRefKwh && devStr
      ? `Fabrika referans tüketimine göre kayıtlı tüketim ${devStr} seyretmiştir. `
      : '';

    return (
      `Araç kullanım verileri, sürüş tarzının "${style.label}" bandında olduğunu göstermektedir. ` +
      refPart +
      `Şarj alışkanlığı "${chargingLabel}" olarak sınıflanmıştır. ` +
      `Bu değerlendirme ekspertiz veya resmi batarya sağlık raporu değildir; ` +
      `sisteme yüklenen kullanım verilerinden deterministik olarak türetilmiştir.`
    );
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async buildReport(vehicleId: string) {
    const [specs, bls, annual, assessment, publicRpt, activeTariff, extReports] = await Promise.all([
      this.fetchSpecs(vehicleId),
      this.fetchBattery(vehicleId),
      this.fetchAnnual(vehicleId),
      this.fetchAssessment(vehicleId),
      this.fetchPublicReport(vehicleId),
      this.electricityTariff.getActiveTariff(),
      this.fetchExternalReports(vehicleId),
    ]);

    // Factory reference consumption: battery_net_kwh / wltp_range_km * 100
    const specRefKwh =
      specs?.battery_net_kwh && specs?.wltp_range_km
        ? (parseFloat(specs.battery_net_kwh) / specs.wltp_range_km) * 100
        : null;

    const drivingStyle = this.computeDrivingStyle(bls, annual, specRefKwh);
    const chargingLabel = bls ? this.chargingStyleLabel(bls) : 'Veri yok';

    const totalKwh = Number(annual?.total_energy_kwh ?? 0);
    const fossilEquivCost = Number(annual?.fossil_equiv_cost ?? 0);
    const estimatedSavings = Number(annual?.estimated_savings ?? 0);
    const currentTariffCost =
      annual?.total_cost_amount != null && Number(annual.total_cost_amount) > 0
        ? Math.round(Number(annual.total_cost_amount))
        : activeTariff && totalKwh > 0
          ? Math.round(totalKwh * activeTariff.tlPerKwh)
          : null;

    return {
      vehicleSummary: assessment
        ? {
            scenarioId: assessment.scenario_id,
            scenarioTitle: assessment.scenario_title,
            odometerKm: assessment.odometer_km,
            vehicleAgeYears: assessment.vehicle_age_years,
            annualKm: assessment.annual_km,
            practicalRangeKm: assessment.practical_range_km ?? null,
            estimatedTotalFullCycles: assessment.estimated_total_full_cycles
              ? Number(assessment.estimated_total_full_cycles)
              : null,
            city: assessment.city ?? null,
            cityTrafficClass: assessment.city_traffic_class ?? null,
          }
        : null,

      driverUsageProfile: {
        included: bls !== null,
        dataSource: 'vehicle_data',
        confidence: drivingStyle.confidence,
        drivingStyle: {
          label: drivingStyle.label,
          score: drivingStyle.score,
          signals: {
            factoryReferenceConsumptionKwhPer100Km: specRefKwh
              ? Math.round(specRefKwh * 10) / 10
              : null,
            consumptionDeviationPercent: drivingStyle.consumptionDeviationPercent,
            dcFastChargeRatio: bls ? Math.round(Number(bls.dc_charge_ratio ?? 0) * 100) : null,
            highSocChargeCount: bls?.high_soc_charge_count ?? null,
            lowSocChargeCount: bls?.low_soc_charge_count ?? null,
            totalChargeCount: bls
              ? bls.ac_charge_count + bls.dc_charge_count
              : null,
            batteryUsageGrade: normalizeBatteryGrade(bls?.battery_usage_grade),
          },
        },
        chargingStyle: {
          label: chargingLabel,
          dcFastChargeRatio: bls ? Math.round(Number(bls.dc_charge_ratio ?? 0) * 100) : null,
          highSocWaitingRisk:
            bls
              ? bls.high_soc_charge_count > 3
                ? 'high'
                : bls.high_soc_charge_count > 0
                ? 'medium'
                : 'low'
              : 'unknown',
          lowSocUsageRisk:
            bls
              ? bls.low_soc_charge_count > 3
                ? 'high'
                : bls.low_soc_charge_count > 0
                ? 'medium'
                : 'low'
              : 'unknown',
        },
        summary: this.renderDriverSummary(drivingStyle, chargingLabel, specRefKwh),
      },

      economicSummary: {
        totalKwh: totalKwh || null,
        currentTariffCost,
        activeTariffTlPerKwh: activeTariff?.tlPerKwh ?? null,
        fossilEquivCost: fossilEquivCost || null,
        estimatedSavingsTl: estimatedSavings || null,
        currency: 'TRY',
      },

      verificationSummary: publicRpt
        ? {
            shareToken: publicRpt.share_token,
            verificationLevel: publicRpt.verification_level,
            generatedAt: publicRpt.created_at,
          }
        : null,

      externalBatteryReports: extReports,
      generatedAt: new Date().toISOString(),
    };
  }

  async createReport(vehicleId: string, ownershipId: string | null) {
    // Stale ownershipId gelirse null'a düşür — FK ihlalini önler
    if (ownershipId) {
      const check = await this.db.query(
        `SELECT id FROM vehicle_ownerships WHERE id = $1 LIMIT 1`,
        [ownershipId],
      );
      if (check.rows.length === 0) ownershipId = null;
    }

    const data = await this.buildReport(vehicleId);
    const ds = data.driverUsageProfile.drivingStyle;

    const res = await this.db.query(
      `INSERT INTO premium_vehicle_reports
         (vehicle_id, ownership_id, report_data, driving_style_label,
          driving_style_score, consumption_deviation_percent,
          total_kwh, estimated_savings_tl, confidence)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
       RETURNING
         id,
         vehicle_id                    AS "vehicleId",
         ownership_id                  AS "ownershipId",
         report_data                   AS "reportData",
         driving_style_label           AS "drivingStyleLabel",
         driving_style_score           AS "drivingStyleScore",
         consumption_deviation_percent AS "consumptionDeviationPercent",
         total_kwh                     AS "totalKwh",
         estimated_savings_tl          AS "estimatedSavingsTl",
         confidence,
         created_at                    AS "createdAt"`,
      [
        vehicleId,
        ownershipId ?? null,
        JSON.stringify(data),
        ds.label,
        ds.score ?? null,
        ds.signals.consumptionDeviationPercent ?? null,
        data.economicSummary.totalKwh ?? null,
        data.economicSummary.estimatedSavingsTl ?? null,
        data.driverUsageProfile.confidence,
      ],
    );

    const report = res.rows[0];

    // Kaynak anlık görüntüsünü immutable olarak kaydet
    void this.saveSourceSnapshot(report.id, vehicleId, data).catch(() => {});

    return report;
  }

  private async saveSourceSnapshot(
    reportId: string,
    vehicleId: string,
    data: Awaited<ReturnType<typeof this.buildReport>>,
  ) {
    const bls = data.driverUsageProfile.drivingStyle.signals;
    const totalCharges = (bls.totalChargeCount ?? 0);

    await this.db.query(
      `INSERT INTO report_source_snapshots
         (report_id, vehicle_id,
          usage_confidence, usage_data_source,
          battery_grade, battery_confidence_score,
          total_charge_sessions, assessment_included,
          verification_level, external_reports_count,
          sources_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (report_id) DO NOTHING`,
      [
        reportId,
        vehicleId,
        data.driverUsageProfile.confidence,
        data.driverUsageProfile.dataSource,
        bls.batteryUsageGrade ?? null,
        null, // confidence_score batarya tablosundan gelmez; buildReport dışına çıkarmak gerekir
        totalCharges,
        data.vehicleSummary !== null,
        data.verificationSummary?.verificationLevel ?? null,
        data.externalBatteryReports.length,
        JSON.stringify({
          drivingStyleLabel: data.driverUsageProfile.drivingStyle.label,
          consumptionDeviationPercent: bls.consumptionDeviationPercent,
          dcFastChargeRatio: bls.dcFastChargeRatio,
          chargingStyle: data.driverUsageProfile.chargingStyle.label,
          economicTotalKwh: data.economicSummary.totalKwh,
          externalReportProviders: (data.externalBatteryReports as { provider?: unknown }[]).map(r => r.provider),
        }),
      ],
    );
  }

  async getLatestReport(vehicleId: string) {
    const res = await this.db.query(
      `SELECT
         id,
         vehicle_id                    AS "vehicleId",
         ownership_id                  AS "ownershipId",
         report_data                   AS "reportData",
         driving_style_label           AS "drivingStyleLabel",
         driving_style_score           AS "drivingStyleScore",
         consumption_deviation_percent AS "consumptionDeviationPercent",
         total_kwh                     AS "totalKwh",
         estimated_savings_tl          AS "estimatedSavingsTl",
         confidence,
         created_at                    AS "createdAt"
       FROM premium_vehicle_reports
       WHERE vehicle_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  async getReportById(reportId: string) {
    const res = await this.db.query(
      `SELECT
         pvr.id,
         pvr.vehicle_id                    AS "vehicleId",
         pvr.report_data                   AS "reportData",
         pvr.driving_style_label           AS "drivingStyleLabel",
         pvr.driving_style_score           AS "drivingStyleScore",
         pvr.consumption_deviation_percent AS "consumptionDeviationPercent",
         pvr.total_kwh                     AS "totalKwh",
         pvr.estimated_savings_tl          AS "estimatedSavingsTl",
         pvr.confidence,
         pvr.created_at                    AS "createdAt",
         vs.brand,
         vs.model,
         vs.variant,
         COALESCE(vs.variant_display_name, vs.variant) AS "variantDisplayName",
         vs.image_url                      AS "imageUrl",
         vs.wltp_range_km                  AS "wltpRangeKm",
         cv.display_name                   AS "vehicleDisplayName",
         v.vin_last5                       AS "vinLast5",
         CASE WHEN v.vin_last5 IS NOT NULL THEN 'verified' ELSE 'unverified' END AS "identityLevel",
         vir.next_inspection_date          AS "nextInspectionDate",
         vir.last_inspection_date          AS "lastInspectionDate",
         vse.odometer_km                   AS "lastServiceKm",
         vse.service_date                  AS "lastServiceDate"
       FROM premium_vehicle_reports pvr
       JOIN vehicles v ON v.id = pvr.vehicle_id
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       JOIN canonical_vehicles cv ON cv.id = vs.canonical_vehicle_id
       LEFT JOIN vehicle_inspection_records vir
              ON vir.vehicle_id = v.id AND vir.is_current = TRUE
       LEFT JOIN LATERAL (
         SELECT odometer_km, service_date
         FROM vehicle_service_events
         WHERE vehicle_id = v.id AND is_current = TRUE
         ORDER BY odometer_km DESC LIMIT 1
       ) vse ON TRUE
       WHERE pvr.id = $1`,
      [reportId],
    );
    return res.rows[0] ?? null;
  }

  async fetchExternalReports(vehicleId: string) {
    const res = await this.db.query(
      `SELECT
         id,
         vehicle_id    AS "vehicleId",
         provider,
         report_type   AS "reportType",
         report_url    AS "reportUrl",
         report_date   AS "reportDate",
         soh_percent   AS "sohPercent",
         source_type   AS "sourceType",
         status,
         notes,
         created_at    AS "createdAt"
       FROM external_battery_reports
       WHERE vehicle_id = $1
       ORDER BY report_date DESC NULLS LAST`,
      [vehicleId],
    );
    return res.rows;
  }

  async addExternalReport(
    vehicleId: string,
    body: {
      provider: string;
      reportType?: string | null;
      reportUrl?: string | null;
      reportDate?: string | null;
      sohPercent?: number | null;
      sourceType?: string | null;
      notes?: string | null;
      ownershipId?: string | null;
    },
  ) {
    const res = await this.db.query(
      `INSERT INTO external_battery_reports
         (vehicle_id, ownership_id, provider, report_type, report_url,
          report_date, soh_percent, source_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)
       RETURNING
         id,
         vehicle_id    AS "vehicleId",
         provider,
         report_type   AS "reportType",
         report_url    AS "reportUrl",
         report_date   AS "reportDate",
         soh_percent   AS "sohPercent",
         source_type   AS "sourceType",
         status,
         notes,
         created_at    AS "createdAt"`,
      [
        vehicleId,
        body.ownershipId ?? null,
        body.provider,
        body.reportType ?? null,
        body.reportUrl ?? null,
        body.reportDate ?? null,
        body.sohPercent ?? null,
        body.sourceType ?? 'external_certified_report',
        body.notes ?? null,
      ],
    );
    return res.rows[0];
  }
}
