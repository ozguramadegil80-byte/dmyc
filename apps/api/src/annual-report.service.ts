import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class AnnualReportService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForVehicle(vehicleId: string, year: number) {
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
        monthly_agg AS (
          SELECT
            COALESCE(sum(trip_count), 0)::int              AS trip_count,
            COALESCE(sum(total_distance_m), 0)::int        AS total_distance_m,
            COALESCE(sum(total_duration_seconds), 0)::int  AS total_duration_seconds,
            COALESCE(sum(total_energy_kwh), 0)::numeric    AS total_energy_kwh,
            COALESCE(sum(total_cost_amount), 0)::numeric   AS total_cost_amount,
            COALESCE(sum(ac_charge_count), 0)::int         AS ac_charge_count,
            COALESCE(sum(dc_charge_count), 0)::int         AS dc_charge_count,
            COALESCE(sum(fossil_equiv_cost), 0)::numeric   AS fossil_equiv_cost,
            COALESCE(sum(estimated_savings), 0)::numeric   AS estimated_savings,
            max(confidence_score)::numeric(5,4)            AS confidence_score
          FROM monthly_reports
          WHERE vehicle_id = $1
            AND period_year = $2
        ),
        computed AS (
          SELECT
            vc.vehicle_id,
            vc.ownership_id,
            vc.user_id,
            m.trip_count,
            m.total_distance_m,
            m.total_duration_seconds,
            CASE
              WHEN m.total_duration_seconds > 0
              THEN round(
                ((m.total_distance_m / 1000.0) / (m.total_duration_seconds / 3600.0))::numeric, 2
              )
              ELSE NULL
            END AS avg_speed_kmh,
            m.total_energy_kwh,
            m.total_cost_amount,
            m.ac_charge_count,
            m.dc_charge_count,
            CASE
              WHEN m.total_distance_m > 0
              THEN round((m.total_cost_amount / (m.total_distance_m / 1000.0))::numeric, 4)
              ELSE NULL
            END AS cost_per_km,
            m.fossil_equiv_cost,
            m.estimated_savings,
            m.confidence_score
          FROM vehicle_context vc
          CROSS JOIN monthly_agg m
        )
        INSERT INTO annual_reports (
          vehicle_id, ownership_id, user_id,
          period_year,
          total_distance_m, total_duration_seconds, avg_speed_kmh,
          total_energy_kwh, total_cost_amount, currency, cost_per_km,
          ac_charge_count, dc_charge_count,
          fossil_equiv_cost, estimated_savings,
          confidence_score, last_calculated_at,
          created_at, updated_at
        )
        SELECT
          vehicle_id, ownership_id, user_id,
          $2,
          total_distance_m, total_duration_seconds, avg_speed_kmh,
          total_energy_kwh, total_cost_amount, 'TRY', cost_per_km,
          ac_charge_count, dc_charge_count,
          fossil_equiv_cost, estimated_savings,
          confidence_score, now(),
          now(), now()
        FROM computed
        ON CONFLICT (vehicle_id, period_year)
        DO UPDATE SET
          ownership_id           = EXCLUDED.ownership_id,
          user_id                = EXCLUDED.user_id,
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
      [vehicleId, year],
    );
  }

  async refreshForVehicleNow(vehicleId: string) {
    await this.refreshForVehicle(vehicleId, new Date().getFullYear());
  }

  async getLatestForVehicle(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          vehicle_id              AS "vehicleId",
          ownership_id            AS "ownershipId",
          period_year             AS "periodYear",
          total_distance_m        AS "totalDistanceM",
          total_duration_seconds  AS "totalDurationSeconds",
          avg_speed_kmh           AS "avgSpeedKmh",
          total_energy_kwh        AS "totalEnergyKwh",
          total_cost_amount       AS "totalCostAmount",
          currency,
          cost_per_km             AS "costPerKm",
          ac_charge_count         AS "acChargeCount",
          dc_charge_count         AS "dcChargeCount",
          fossil_equiv_cost       AS "fossilEquivCost",
          estimated_savings       AS "estimatedSavings",
          optional_insurance      AS "optionalInsurance",
          optional_service_cost   AS "optionalServiceCost",
          total_ownership_cost    AS "totalOwnershipCost",
          confidence_score        AS "confidenceScore",
          last_calculated_at      AS "lastCalculatedAt"
        FROM annual_reports
        WHERE vehicle_id = $1
        ORDER BY period_year DESC
        LIMIT 1
      `,
      [vehicleId],
    );

    if (!result.rows[0]) {
      return {
        vehicleId,
        periodYear: null,
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
        optionalInsurance: null,
        optionalServiceCost: null,
        totalOwnershipCost: null,
        confidenceScore: 0,
        lastCalculatedAt: null,
      };
    }

    const row = result.rows[0];
    return {
      vehicleId: row.vehicleId,
      ownershipId: row.ownershipId,
      periodYear: Number(row.periodYear),
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
      optionalInsurance: row.optionalInsurance !== null ? Number(row.optionalInsurance) : null,
      optionalServiceCost: row.optionalServiceCost !== null ? Number(row.optionalServiceCost) : null,
      totalOwnershipCost: row.totalOwnershipCost !== null ? Number(row.totalOwnershipCost) : null,
      confidenceScore: Number(row.confidenceScore),
      lastCalculatedAt: row.lastCalculatedAt,
    };
  }
}
