import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

// Benzinli eşdeğer sabit referans değerleri
const FOSSIL_L_PER_100KM = 8.0;
const FOSSIL_PRICE_PER_L_TRY = 45.0;

@Injectable()
export class MonthlyReportService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForVehicle(vehicleId: string, year: number, month: number) {
    await this.db.query(
      `
        WITH vehicle_context AS (
          SELECT
            v.id AS vehicle_id,
            vo.id AS ownership_id,
            vo.user_id
          FROM vehicles v
          LEFT JOIN vehicle_ownerships vo
            ON vo.vehicle_id = v.id
            AND vo.started_at <= now()
            AND (vo.ended_at IS NULL OR vo.ended_at > now())
          WHERE v.id = $1
          LIMIT 1
        ),
        trip_stats AS (
          SELECT
            count(*)::int                                    AS trip_count,
            COALESCE(sum(distance_m), 0)::int               AS total_distance_m,
            COALESCE(sum(duration_seconds), 0)::int         AS total_duration_seconds,
            CASE
              WHEN sum(duration_seconds) > 0
              THEN round(
                ((sum(distance_m) / 1000.0) / (sum(duration_seconds) / 3600.0))::numeric, 2
              )
              ELSE NULL
            END                                              AS avg_speed_kmh
          FROM trips
          WHERE vehicle_id = $1
            AND status = 'completed'
            AND EXTRACT(YEAR FROM started_at)  = $2
            AND EXTRACT(MONTH FROM started_at) = $3
        ),
        charge_stats AS (
          SELECT
            COALESCE(sum(energy_kwh), 0)::numeric(10,3)       AS total_energy_kwh,
            COALESCE(sum(cost_amount), 0)::numeric(12,2)      AS total_cost_amount,
            count(*) FILTER (
              WHERE charge_location_type NOT IN ('dc','public_dc','fast_dc')
                AND (connector_type IS NULL OR connector_type NOT ILIKE '%dc%')
            )::int                                             AS ac_charge_count,
            count(*) FILTER (
              WHERE charge_location_type IN ('dc','public_dc','fast_dc')
                OR connector_type ILIKE '%dc%'
            )::int                                             AS dc_charge_count
          FROM charge_sessions
          WHERE vehicle_id = $1
            AND EXTRACT(YEAR FROM started_at)  = $2
            AND EXTRACT(MONTH FROM started_at) = $3
        ),
        computed AS (
          SELECT
            vc.vehicle_id,
            vc.ownership_id,
            vc.user_id,
            t.trip_count,
            t.total_distance_m,
            t.total_duration_seconds,
            t.avg_speed_kmh,
            c.total_energy_kwh,
            c.total_cost_amount,
            c.ac_charge_count,
            c.dc_charge_count,
            CASE
              WHEN t.total_distance_m > 0
              THEN round((c.total_cost_amount / (t.total_distance_m / 1000.0))::numeric, 4)
              ELSE NULL
            END AS cost_per_km,
            round(
              (t.total_distance_m / 1000.0 * $4 / 100.0 * $5)::numeric, 2
            )                                                  AS fossil_equiv_cost,
            LEAST(0.95,
              0.10
              + LEAST(0.40, t.trip_count * 0.04)
              + LEAST(0.25, (c.ac_charge_count + c.dc_charge_count) * 0.05)
              + CASE WHEN c.total_energy_kwh > 0 THEN 0.20 ELSE 0 END
            )::numeric(5,4)                                    AS confidence_score
          FROM vehicle_context vc
          CROSS JOIN trip_stats t
          CROSS JOIN charge_stats c
        )
        INSERT INTO monthly_reports (
          vehicle_id, ownership_id, user_id,
          period_year, period_month,
          trip_count, total_distance_m, total_duration_seconds, avg_speed_kmh,
          total_energy_kwh, total_cost_amount, currency, cost_per_km,
          ac_charge_count, dc_charge_count,
          fossil_equiv_cost, estimated_savings,
          confidence_score, last_calculated_at,
          created_at, updated_at
        )
        SELECT
          vehicle_id, ownership_id, user_id,
          $2, $3,
          trip_count, total_distance_m, total_duration_seconds, avg_speed_kmh,
          total_energy_kwh, total_cost_amount, 'TRY', cost_per_km,
          ac_charge_count, dc_charge_count,
          fossil_equiv_cost,
          CASE
            WHEN fossil_equiv_cost IS NOT NULL
            THEN fossil_equiv_cost - total_cost_amount
            ELSE NULL
          END,
          confidence_score, now(),
          now(), now()
        FROM computed
        ON CONFLICT (vehicle_id, period_year, period_month)
        DO UPDATE SET
          ownership_id           = EXCLUDED.ownership_id,
          user_id                = EXCLUDED.user_id,
          trip_count             = EXCLUDED.trip_count,
          total_distance_m       = EXCLUDED.total_distance_m,
          total_duration_seconds = EXCLUDED.total_duration_seconds,
          avg_speed_kmh          = EXCLUDED.avg_speed_kmh,
          total_energy_kwh       = EXCLUDED.total_energy_kwh,
          total_cost_amount      = EXCLUDED.total_cost_amount,
          cost_per_km            = EXCLUDED.cost_per_km,
          ac_charge_count        = EXCLUDED.ac_charge_count,
          dc_charge_count        = EXCLUDED.dc_charge_count,
          fossil_equiv_cost      = EXCLUDED.fossil_equiv_cost,
          estimated_savings      = EXCLUDED.estimated_savings,
          confidence_score       = EXCLUDED.confidence_score,
          last_calculated_at     = now(),
          updated_at             = now()
      `,
      [vehicleId, year, month, FOSSIL_L_PER_100KM, FOSSIL_PRICE_PER_L_TRY],
    );
  }

  async refreshForVehicleNow(vehicleId: string) {
    const now = new Date();
    await this.refreshForVehicle(vehicleId, now.getFullYear(), now.getMonth() + 1);
  }

  async getLatestForVehicle(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          vehicle_id        AS "vehicleId",
          ownership_id      AS "ownershipId",
          period_year       AS "periodYear",
          period_month      AS "periodMonth",
          trip_count        AS "tripCount",
          total_distance_m  AS "totalDistanceM",
          total_duration_seconds AS "totalDurationSeconds",
          avg_speed_kmh     AS "avgSpeedKmh",
          total_energy_kwh  AS "totalEnergyKwh",
          total_cost_amount AS "totalCostAmount",
          currency,
          cost_per_km       AS "costPerKm",
          ac_charge_count   AS "acChargeCount",
          dc_charge_count   AS "dcChargeCount",
          fossil_equiv_cost AS "fossilEquivCost",
          estimated_savings AS "estimatedSavings",
          confidence_score  AS "confidenceScore",
          last_calculated_at AS "lastCalculatedAt"
        FROM monthly_reports
        WHERE vehicle_id = $1
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      `,
      [vehicleId],
    );

    if (!result.rows[0]) {
      return {
        vehicleId,
        periodYear: null,
        periodMonth: null,
        tripCount: 0,
        totalDistanceM: 0,
        totalDurationSeconds: 0,
        avgSpeedKmh: null,
        totalEnergyKwh: null,
        totalCostAmount: 0,
        currency: 'TRY',
        costPerKm: null,
        acChargeCount: 0,
        dcChargeCount: 0,
        fossilEquivCost: null,
        estimatedSavings: null,
        confidenceScore: 0,
        lastCalculatedAt: null,
      };
    }

    const row = result.rows[0];
    return {
      vehicleId: row.vehicleId,
      ownershipId: row.ownershipId,
      periodYear: Number(row.periodYear),
      periodMonth: Number(row.periodMonth),
      tripCount: Number(row.tripCount),
      totalDistanceM: Number(row.totalDistanceM),
      totalDurationSeconds: Number(row.totalDurationSeconds),
      avgSpeedKmh: row.avgSpeedKmh !== null ? Number(row.avgSpeedKmh) : null,
      totalEnergyKwh: row.totalEnergyKwh !== null ? Number(row.totalEnergyKwh) : null,
      totalCostAmount: Number(row.totalCostAmount),
      currency: row.currency,
      costPerKm: row.costPerKm !== null ? Number(row.costPerKm) : null,
      acChargeCount: Number(row.acChargeCount),
      dcChargeCount: Number(row.dcChargeCount),
      fossilEquivCost: row.fossilEquivCost !== null ? Number(row.fossilEquivCost) : null,
      estimatedSavings: row.estimatedSavings !== null ? Number(row.estimatedSavings) : null,
      confidenceScore: Number(row.confidenceScore),
      lastCalculatedAt: row.lastCalculatedAt,
    };
  }
}
