import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

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

  private renderTemplate(scenarioId: ScenarioId, c: ComputedAssessment): { title: string; body: string } {
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

    const fill = (t: string) =>
      t.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

    if (scenarioId === 'UNDER_USED_CLEAN') {
      return {
        title: 'Değerinin altında / temiz kullanılmış',
        body: fill(
          'Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.\n' +
          'Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım\n' +
          'anlamına gelir. {city} kullanım koşulları dikkate alındığında bu değer\n' +
          'aracın yaşına göre düşük/temiz kullanım bandındadır.\n\n' +
          'Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden\n' +
          'hesaplandığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj\n' +
          'eşdeğeri kullanmış görünür. Toplam tahmini batarya döngüsü\n' +
          '{estimatedTotalFullCycles} civarındadır.\n\n' +
          'Bu tablo, aracın batarya ve genel kullanım açısından değerinin altında\n' +
          'kullanılmış olabileceğini gösterir. Yine de gerçek batarya sağlığı için\n' +
          'tam şarj sonrası menzil, servis batarya ölçümü ve hızlı şarj geçmişi\n' +
          'ayrıca kontrol edilmelidir.',
        ),
      };
    }

    if (scenarioId === 'HEAVY_USED_WORN') {
      return {
        title: 'Yüksek kullanım',
        body: fill(
          'Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.\n' +
          'Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım\n' +
          'anlamına gelir. {city} koşulları dikkate alınsa bile bu değer aracın\n' +
          'yaşına göre yüksek kullanım bandındadır.\n\n' +
          'Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden\n' +
          'hesaplandığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj\n' +
          'eşdeğeri kullanmış görünür. Toplam tahmini batarya döngüsü\n' +
          '{estimatedTotalFullCycles} civarındadır.\n\n' +
          'Bu tablo aracın yoğun kullanılmış olabileceğini gösterir. Yalnızca km\'ye\n' +
          'bakmak bu aşamada yeterli değildir; tam şarj sonrası gerçek menzil,\n' +
          'batarya sağlık raporu, hızlı şarj oranı ve servis kayıtları mutlaka\n' +
          'kontrol edilmelidir.',
        ),
      };
    }

    return {
      title: 'Orta / normal kullanım',
      body: fill(
        'Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.\n' +
        'Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım\n' +
        'anlamına gelir. {city} gibi trafik yükü yüksek bir şehir için bu kullanım\n' +
        'ortalamanın biraz üzerinde görünse de tek başına yıpratıcı kabul edilmez.\n\n' +
        'Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden\n' +
        'bakıldığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj eşdeğeri\n' +
        'kullanmış olur. Toplam tahmini batarya döngüsü {estimatedTotalFullCycles}\n' +
        'civarındadır.\n\n' +
        'Bu değerler aracın çok az kullanılmamış olduğunu, ancak batarya açısından\n' +
        'ağır yıpranmış sınıfa da girmediğini gösterir. Mevcut verilerle araç\n' +
        'orta / normal kullanım bandında değerlendirilir.',
      ),
    };
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
    const { title, body } = this.renderTemplate(scenarioId, computed);

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

  async getLatestAssessment(vehicleId: string) {
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
    return (res.rows[0] ?? null) as Record<string, unknown> | null;
  }
}
