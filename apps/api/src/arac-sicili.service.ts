import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InspectionUpsertBody = {
  firstRegistrationDate?: string | null;  // ISO date: YYYY-MM-DD
  firstRegistrationYear?: number | null;
  lastInspectionDate?: string | null;
  result?: 'passed' | 'failed' | 'unknown';
  reportNumberMasked?: string | null;
  sourceType?: 'user_input' | 'document_ocr' | 'edevlet_screenshot';
  confidence?: 'user_declared' | 'document_seen';
  notes?: string | null;
};

export type ServiceEventBody = {
  serviceDate?: string | null;  // ISO date
  odometerKm: number;
  serviceType?: 'periodic' | 'item_specific' | 'user_reported' | 'authorized_service' | 'unknown';
  itemCodes?: string[];
  sourceType?: 'user_input' | 'document_seen' | 'authorized_service_record';
  notes?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Kasko yaş-amortisman tablosu — Türkiye EV ikinci el piyasası gözlemi
const AGE_DEPRECIATION: Record<number, number> = {
  0: 1.00, 1: 0.82, 2: 0.72, 3: 0.63,
  4: 0.57, 5: 0.52, 6: 0.47, 7: 0.43, 8: 0.40,
};

function kaskoAgeFactor(ageYears: number): number {
  const capped = Math.min(Math.max(ageYears, 0), 8);
  const lo = Math.floor(capped);
  const hi = Math.ceil(capped);
  if (lo === hi) return AGE_DEPRECIATION[lo] ?? 0.40;
  const t = capped - lo;
  return (AGE_DEPRECIATION[lo] ?? 0.40) * (1 - t) + (AGE_DEPRECIATION[hi] ?? 0.40) * t;
}

const BATTERY_GRADE_FACTOR: Record<string, number> = {
  'A+': 1.00, 'A': 0.97, 'B+': 0.94, 'B': 0.89,
  'C': 0.80, 'D': 0.68, 'unknown': 0.92,
};

function kaskoBatteryFactor(grade: string): number {
  return BATTERY_GRADE_FACTOR[grade] ?? 0.92;
}

// Baz: 15.000 km/yıl = 1.0
function kaskoKmFactor(annualKm: number): number {
  const diff = annualKm - 15000;
  if (diff > 0) return Math.max(0.72, 1.0 - (diff / 5000) * 0.02);
  return Math.min(1.12, 1.0 + (Math.abs(diff) / 5000) * 0.015);
}

// battery_usage_grade text değerlerini (balanced/watch/high_stress) harf notasına çevirir
function normalizeBatteryGrade(raw: string): string {
  const map: Record<string, string> = {
    'balanced':   'B+',
    'watch':      'B',
    'high_stress':'C',
    'unknown':    'unknown',
  };
  return map[raw] ?? (raw in { 'A+':1,'A':1,'B+':1,'B':1,'C':1,'D':1 } ? raw : 'unknown');
}

// EV Kondisyon Skoru: batarya notu + DC sarj orani + EFC
function kaskoKondisyonSkoru(grade: string, dcPct: number, efc: number): number {
  const baseScore: Record<string, number> = {
    'A+': 96, 'A': 88, 'B+': 78, 'B': 65, 'C': 50, 'D': 35, 'unknown': 72,
  };
  let score = baseScore[grade] ?? 72;
  // DC şarj cezası: >20% üzeri her 10 puan → -1.5 puan
  const dcPenalty = Math.max(0, (dcPct - 20) / 10) * 1.5;
  // EFC cezası: >150 üzeri her 100 döngü → -1 puan
  const efcPenalty = Math.max(0, (efc - 150) / 100) * 1.0;
  score = score - dcPenalty - efcPenalty;
  return Math.round(Math.min(100, Math.max(0, score)));
}

function computeNextInspectionDate(
  lastInspectionDate: string | null,
  firstRegistrationYear: number | null,
  firstRegistrationDate: string | null,
): string | null {
  if (lastInspectionDate) {
    const d = new Date(lastInspectionDate);
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  }
  if (firstRegistrationDate) {
    const d = new Date(firstRegistrationDate);
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  }
  if (firstRegistrationYear) {
    return `${firstRegistrationYear + 3}-01-01`;
  }
  return null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AracSiciliService {
  constructor(private readonly db: DatabaseService) {}

  // ── Muayene ──────────────────────────────────────────────────────────────

  async getInspection(vehicleId: string) {
    const res = await this.db.query(
      `SELECT * FROM vehicle_inspection_records
       WHERE vehicle_id = $1 AND is_current = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  async upsertInspection(vehicleId: string, body: InspectionUpsertBody) {
    const nextDate = computeNextInspectionDate(
      body.lastInspectionDate ?? null,
      body.firstRegistrationYear ?? null,
      body.firstRegistrationDate ?? null,
    );

    await this.db.query(
      `UPDATE vehicle_inspection_records SET is_current = FALSE WHERE vehicle_id = $1`,
      [vehicleId],
    );

    const res = await this.db.query(
      `INSERT INTO vehicle_inspection_records
         (vehicle_id, first_registration_date, first_registration_year,
          last_inspection_date, next_inspection_date, result,
          report_number_masked, source_type, confidence, is_current, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)
       RETURNING *`,
      [
        vehicleId,
        body.firstRegistrationDate ?? null,
        body.firstRegistrationYear ?? null,
        body.lastInspectionDate ?? null,
        nextDate,
        body.result ?? 'unknown',
        body.reportNumberMasked ?? null,
        body.sourceType ?? 'user_input',
        body.confidence ?? 'user_declared',
        body.notes ?? null,
      ],
    );
    return res.rows[0];
  }

  // ── Bakım Servis Olayları ─────────────────────────────────────────────────

  async getLatestServiceEvent(vehicleId: string) {
    const res = await this.db.query(
      `SELECT * FROM vehicle_service_events
       WHERE vehicle_id = $1 AND is_current = TRUE
       ORDER BY odometer_km DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  async addServiceEvent(vehicleId: string, body: ServiceEventBody) {
    if (!body.odometerKm || body.odometerKm < 0) {
      throw new BadRequestException('Geçerli bir kilometre değeri gerekiyor.');
    }

    await this.db.query(
      `UPDATE vehicle_service_events SET is_current = FALSE WHERE vehicle_id = $1`,
      [vehicleId],
    );

    const res = await this.db.query(
      `INSERT INTO vehicle_service_events
         (vehicle_id, service_date, odometer_km, service_type, item_codes,
          source_type, is_current, notes)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)
       RETURNING *`,
      [
        vehicleId,
        body.serviceDate ?? null,
        body.odometerKm,
        body.serviceType ?? 'periodic',
        body.itemCodes ?? [],
        body.sourceType ?? 'user_input',
        body.notes ?? null,
      ],
    );
    return res.rows[0];
  }

  // ── Bakım Kalan KM Hesabı ─────────────────────────────────────────────────
  // maintenance_rules'dan kural alır, odometer ile kalan km hesaplar.
  // Kural yoksa hasVerifiedRules: false döner.

  async getMaintenanceStatus(vehicleId: string) {
    const specRes = await this.db.query(
      `SELECT v.vehicle_spec_id, v.canonical_vehicle_id
       FROM vehicles v WHERE v.id = $1 LIMIT 1`,
      [vehicleId],
    );
    const spec = specRes.rows[0];
    if (!spec) throw new NotFoundException('Araç bulunamadı.');

    const rulesRes = await this.db.query(
      `SELECT * FROM maintenance_rules
       WHERE vehicle_spec_id = $1 OR canonical_vehicle_id = $2
       ORDER BY rule_type, item_code`,
      [spec.vehicle_spec_id, spec.canonical_vehicle_id],
    );

    const hasVerifiedRules = rulesRes.rows.length > 0;
    if (!hasVerifiedRules) {
      return { hasVerifiedRules: false, rules: [], nextServiceKmRemaining: null };
    }

    const lastEvent = await this.getLatestServiceEvent(vehicleId);

    const odometerRes = await this.db.query(
      `SELECT odometer_km FROM vehicle_assessments
       WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    const currentKm: number = odometerRes.rows[0]?.odometer_km ?? 0;
    const lastServiceKm: number = lastEvent?.odometer_km ?? 0;

    const rules = rulesRes.rows.map((rule: Record<string, unknown>) => {
      let kmRemaining: number | null = null;

      if (rule.rule_type === 'periodic_visit' || rule.rule_type === 'item_schedule') {
        const firstDue = (rule.first_due_km as number | null) ?? null;
        const interval = (rule.interval_km as number | null) ?? null;

        if (firstDue && currentKm < firstDue) {
          kmRemaining = firstDue - currentKm;
        } else if (interval) {
          const base = lastServiceKm > 0 ? lastServiceKm : (firstDue ?? 0);
          const nextKm = base + interval;
          kmRemaining = nextKm - currentKm;
        }
      }

      return {
        ruleType: rule.rule_type,
        itemCode: rule.item_code ?? null,
        intervalKm: rule.interval_km ?? null,
        intervalMonths: rule.interval_months ?? null,
        firstDueKm: rule.first_due_km ?? null,
        sourceConfidence: rule.source_confidence,
        kmRemaining,
      };
    });

    const periodicRule = rules.find((r) => r.ruleType === 'periodic_visit' && r.kmRemaining !== null);

    return {
      hasVerifiedRules: true,
      currentKm,
      lastServiceKm: lastServiceKm > 0 ? lastServiceKm : null,
      nextServiceKmRemaining: periodicRule?.kmRemaining ?? null,
      rules,
    };
  }

  // ── Kasko Değer Snapshot ──────────────────────────────────────────────────

  async getValuationSnapshot(vehicleId: string) {
    const res = await this.db.query(
      `SELECT * FROM vehicle_valuation_snapshots
       WHERE vehicle_id = $1 AND is_current = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  }

  // ── Araç Sicili Özeti (premium rapor + kasko talebi için) ─────────────────

  async getRegistrySnapshot(vehicleId: string) {
    const [inspection, latestService, valuation, maintenanceStatus] = await Promise.all([
      this.getInspection(vehicleId),
      this.getLatestServiceEvent(vehicleId),
      this.getValuationSnapshot(vehicleId),
      this.getMaintenanceStatus(vehicleId),
    ]);

    return {
      inspection: inspection
        ? {
            nextInspectionDate: inspection.next_inspection_date,
            lastInspectionDate: inspection.last_inspection_date,
            confidence: inspection.confidence,
            result: inspection.result,
          }
        : null,
      latestServiceKm: latestService?.odometer_km ?? null,
      valuation: valuation
        ? {
            valueTry: Number(valuation.value_try),
            valuationMonth: valuation.valuation_month,
            confidence: valuation.confidence,
          }
        : null,
      maintenance: {
        hasVerifiedRules: maintenanceStatus.hasVerifiedRules,
        nextServiceKmRemaining: maintenanceStatus.nextServiceKmRemaining,
      },
    };
  }

  // ── Kasko Tahminli Değer Hesabı ──────────────────────────────────────────
  // Formül: liste_fiyatı × yaş_katsayısı × batarya_katsayısı × km_katsayısı
  // Sonuç: %10 alt–üst bant (±10%)

  async getKaskoEstimate(vehicleId: string) {
    const res = await this.db.query(
      `SELECT
         vs.list_price_try,
         vs.list_price_year,
         vs.year_from        AS spec_year_from,
         vir.first_registration_date,
         vir.first_registration_year,
         va.odometer_km,
         va.vehicle_age_years,
         va.annual_km,
         COALESCE(bl.battery_usage_grade, 'unknown') AS battery_usage_grade
       FROM vehicles v
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       LEFT JOIN vehicle_inspection_records vir
              ON vir.vehicle_id = v.id AND vir.is_current = TRUE
       LEFT JOIN LATERAL (
         SELECT odometer_km, vehicle_age_years, annual_km
         FROM vehicle_assessments
         WHERE vehicle_id = v.id
         ORDER BY created_at DESC LIMIT 1
       ) va ON TRUE
       LEFT JOIN vehicle_battery_lifecycle_stats bl ON bl.vehicle_id = v.id
       WHERE v.id = $1`,
      [vehicleId],
    );

    const row = res.rows[0];
    if (!row) throw new NotFoundException('Araç bulunamadı.');

    const listPrice: number | null = row.list_price_try ? Number(row.list_price_try) : null;
    if (!listPrice) {
      return { available: false, reason: 'Liste fiyatı tanımlanmamış.' };
    }

    // Yaş hesabı: registration_date > registration_year > assessment > spec_year_from
    const currentYear = new Date().getFullYear();
    let ageYears: number;
    if (row.first_registration_date) {
      const regYear = new Date(row.first_registration_date).getFullYear();
      ageYears = currentYear - regYear;
    } else if (row.first_registration_year) {
      ageYears = currentYear - Number(row.first_registration_year);
    } else if (row.vehicle_age_years != null) {
      ageYears = Number(row.vehicle_age_years);
    } else {
      ageYears = currentYear - (Number(row.spec_year_from) || currentYear);
    }
    ageYears = Math.max(0, ageYears);

    const batteryGradeNorm = normalizeBatteryGrade(row.battery_usage_grade ?? 'unknown');
    const ageFactor = kaskoAgeFactor(ageYears);
    const batteryFactor = kaskoBatteryFactor(batteryGradeNorm);
    const annualKm: number = row.annual_km ? Number(row.annual_km) : 15000;
    const kmFactor = kaskoKmFactor(annualKm);

    const pointEstimate = listPrice * ageFactor * batteryFactor * kmFactor;
    const estimatedMin = Math.round((pointEstimate * 0.90) / 1000) * 1000;
    const estimatedMax = Math.round((pointEstimate * 1.10) / 1000) * 1000;

    return {
      available: true,
      listPriceTry: listPrice,
      listPriceYear: row.list_price_year ? Number(row.list_price_year) : null,
      ageYears,
      ageFactor: Math.round(ageFactor * 1000) / 1000,
      batteryGrade: batteryGradeNorm,
      batteryFactor: Math.round(batteryFactor * 1000) / 1000,
      annualKm,
      kmFactor: Math.round(kmFactor * 1000) / 1000,
      estimatedMin,
      estimatedMax,
      calculatedAt: new Date().toISOString(),
      disclaimer:
        'Tahmini değer; sıfır araç liste fiyatı, araç yaşı, EFC batarya notu ve yıllık km üzerinden hesaplanmıştır. ' +
        'TSB resmî kasko bedeli değildir.',
    };
  }

  // ── Kasko Değer Karnesi — Public Rapor ───────────────────────────────────
  // vehicle_insurance_value_requests kaydından tam rapor veri seti üretir.
  // Auth gerektirmez; ID URL parametresini paylaşarak ulaşılabilir.

  async getKaskoReportById(requestId: string) {
    const res = await this.db.query(
      `SELECT
         ivr.id,
         ivr.vehicle_id              AS "vehicleId",
         ivr.created_at              AS "createdAt",
         vs.brand,
         vs.model,
         vs.variant,
         COALESCE(vs.variant_display_name, vs.variant) AS "variantDisplayName",
         vs.image_url                AS "imageUrl",
         vs.year_from                AS "yearFrom",
         vs.wltp_range_km            AS "wltpRangeKm",
         vs.list_price_try           AS "listPriceTry",
         vs.list_price_year          AS "listPriceYear",
         v.vin_last5                 AS "vinLast5",
         CASE WHEN v.vin_last5 IS NOT NULL THEN 'verified' ELSE 'unverified' END AS "identityLevel",
         va.odometer_km              AS "odometerKm",
         va.vehicle_age_years        AS "vehicleAgeYears",
         va.annual_km                AS "annualKm",
         va.monthly_km               AS "monthlyKm",
         va.city,
         va.city_traffic_class       AS "cityTrafficClass",
         bl.total_efc                AS "totalEfc",
         bl.dc_charge_ratio          AS "dcChargeRatio",
         bl.battery_usage_grade      AS "batteryUsageGrade",
         bl.ac_charge_count          AS "acChargeCount",
         bl.dc_charge_count          AS "dcChargeCount",
         bl.high_soc_charge_count    AS "highSocChargeCount",
         bl.low_soc_charge_count     AS "lowSocChargeCount",
         vir.next_inspection_date    AS "nextInspectionDate",
         vir.last_inspection_date    AS "lastInspectionDate",
         vir.result                  AS "inspectionResult",
         vse.odometer_km             AS "lastServiceKm",
         vse.service_date            AS "lastServiceDate",
         (SELECT COUNT(*)::int FROM vehicle_service_events WHERE vehicle_id = v.id) AS "serviceEventCount",
         ivr.vehicle_photo_urls  AS "vehiclePhotoUrls"
       FROM vehicle_insurance_value_requests ivr
       JOIN vehicles v ON v.id = ivr.vehicle_id
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       LEFT JOIN LATERAL (
         SELECT odometer_km, vehicle_age_years, annual_km, monthly_km, city, city_traffic_class
         FROM vehicle_assessments WHERE vehicle_id = v.id
         ORDER BY created_at DESC LIMIT 1
       ) va ON TRUE
       LEFT JOIN vehicle_battery_lifecycle_stats bl ON bl.vehicle_id = v.id
       LEFT JOIN vehicle_inspection_records vir
              ON vir.vehicle_id = v.id AND vir.is_current = TRUE
       LEFT JOIN LATERAL (
         SELECT odometer_km, service_date
         FROM vehicle_service_events WHERE vehicle_id = v.id AND is_current = TRUE
         ORDER BY odometer_km DESC LIMIT 1
       ) vse ON TRUE
       WHERE ivr.id = $1`,
      [requestId],
    );

    const row = res.rows[0];
    if (!row) return null;

    // Kondüsyon skoru (deterministik)
    const grade: string = normalizeBatteryGrade(row.batteryUsageGrade ?? 'unknown');
    const efc: number   = row.totalEfc ? Number(row.totalEfc) : 0;
    const dcPct: number = row.dcChargeRatio ? Math.round(Number(row.dcChargeRatio) * 100) : 0;
    const kondisyon = kaskoKondisyonSkoru(grade, dcPct, efc);

    // Kasko değer tahmini
    const listPrice: number | null = row.listPriceTry ? Number(row.listPriceTry) : null;
    let estimate: null | {
      estimatedMin: number; estimatedMax: number;
      ageFactor: number; batteryFactor: number; kmFactor: number;
    } = null;

    if (listPrice) {
      const currentYear = new Date().getFullYear();
      const ageYears = Math.max(
        0,
        row.vehicleAgeYears != null
          ? Number(row.vehicleAgeYears)
          : currentYear - (Number(row.yearFrom) || currentYear),
      );
      const ageFactor     = kaskoAgeFactor(ageYears);
      const batteryFactor = kaskoBatteryFactor(grade);
      const annualKm      = row.annualKm ? Number(row.annualKm) : 15000;
      const kmFactor      = kaskoKmFactor(annualKm);
      const point         = listPrice * ageFactor * batteryFactor * kmFactor;
      estimate = {
        estimatedMin:  Math.round((point * 0.90) / 1000) * 1000,
        estimatedMax:  Math.round((point * 1.10) / 1000) * 1000,
        ageFactor:     Math.round(ageFactor * 1000) / 1000,
        batteryFactor: Math.round(batteryFactor * 1000) / 1000,
        kmFactor:      Math.round(kmFactor * 1000) / 1000,
      };
    }

    return { ...row, batteryUsageGrade: grade, kondisyon, estimate };
  }

  // ── Admin: Bakım Adayları ─────────────────────────────────────────────────

  async listMaintenanceCandidates(status?: string) {
    const where = status ? `WHERE admin_status = $1` : `WHERE admin_status = 'pending'`;
    const params = status ? [status] : [];
    const res = await this.db.query(
      `SELECT mrc.*,
              vs.display_name AS spec_display_name,
              cv.display_name AS canonical_display_name
       FROM maintenance_rule_candidates mrc
       LEFT JOIN vehicle_specs vs ON vs.id = mrc.matched_vehicle_spec_id
       LEFT JOIN canonical_vehicles cv ON cv.id = mrc.matched_canonical_vehicle_id
       ${where}
       ORDER BY mrc.created_at DESC`,
      params,
    );
    return res.rows;
  }

  async updateCandidateStatus(
    id: string,
    body: {
      adminStatus: 'approved' | 'rejected' | 'needs_source';
      adminNote?: string;
    },
  ) {
    const res = await this.db.query(
      `UPDATE maintenance_rule_candidates
       SET admin_status = $2, admin_note = $3, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, body.adminStatus, body.adminNote ?? null],
    );
    if (!res.rows[0]) throw new NotFoundException('Aday bulunamadı.');

    if (body.adminStatus === 'approved') {
      await this.promoteToMaintenanceRule(res.rows[0]);
    }

    return res.rows[0];
  }

  private async promoteToMaintenanceRule(candidate: Record<string, unknown>) {
    if (!candidate.matched_vehicle_spec_id && !candidate.matched_canonical_vehicle_id) return;
    if (!candidate.source_url) return;

    await this.db.query(
      `INSERT INTO maintenance_rules
         (vehicle_spec_id, canonical_vehicle_id, rule_type, item_code,
          interval_km, interval_months, first_due_km, first_due_months,
          source_name, source_url, source_confidence, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [
        candidate.matched_vehicle_spec_id ?? null,
        candidate.matched_canonical_vehicle_id ?? null,
        candidate.rule_type,
        candidate.item_code ?? null,
        candidate.interval_km ?? null,
        candidate.interval_months ?? null,
        candidate.first_due_km ?? null,
        candidate.first_due_months ?? null,
        candidate.source_name ?? 'DMyC Admin',
        candidate.source_url,
        candidate.source_confidence ?? 'community_unverified',
        candidate.warnings ? JSON.stringify(candidate.warnings) : null,
      ],
    );
  }

  // ── Kasko/Sigorta Değer Talebi ────────────────────────────────────────────

  async getLatestInsuranceValueRequest(vehicleId: string) {
    const snapshot = await this.getRegistrySnapshot(vehicleId);
    const res = await this.db.query(
      `SELECT * FROM vehicle_insurance_value_requests
       WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [vehicleId],
    );
    if (!res.rows[0]) return null;
    return { ...res.rows[0], registrySnapshot: snapshot };
  }

  async createInsuranceValueRequest(vehicleId: string, reportId?: string, vehiclePhotoUrls?: string[]) {
    const snapshot = await this.getRegistrySnapshot(vehicleId);
    const photoUrls = vehiclePhotoUrls ?? [];

    const res = await this.db.query(
      `INSERT INTO vehicle_insurance_value_requests
         (vehicle_id, report_id, request_type, status, source_type, payload_snapshot, vehicle_photo_urls)
       VALUES ($1,$2,'casco_value','generated','user_download',$3,$4)
       RETURNING *`,
      [vehicleId, reportId ?? null, JSON.stringify(snapshot), photoUrls],
    );
    return { ...res.rows[0], registrySnapshot: snapshot };
  }
}
