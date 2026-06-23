import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type BatteryLifecycleStatsRow = {
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  totalEfc: string;
  totalStressAdjustedCycles: string;
  avgChargeStartSoc: string | null;
  avgChargeEndSoc: string | null;
  acChargeCount: number;
  dcChargeCount: number;
  dcChargeRatio: string | null;
  highSocChargeCount: number;
  lowSocChargeCount: number;
  estimatedHighSocHours: string;
  estimatedLowSocEvents: number;
  avgStressMultiplier: string | null;
  batteryUsageGrade: string;
  confidenceScore: string;
  lastCalculatedAt: Date | null;
};

@Injectable()
export class BatteryLifecycleService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForChargeSession(chargeSessionId: string) {
    const eventResult = await this.db.query(
      `
        WITH session_context AS (
          SELECT
            id AS charge_session_id,
            vehicle_id,
            ownership_id,
            user_id,
            start_soc,
            end_soc,
            GREATEST(0, end_soc - start_soc) AS soc_delta,
            lower(COALESCE(charge_location_type, 'unknown')) AS charge_location_type,
            lower(COALESCE(connector_type, '')) AS connector_type,
            confidence_score
          FROM charge_sessions
          WHERE id = $1
            AND start_soc IS NOT NULL
            AND end_soc IS NOT NULL
            AND end_soc > start_soc
            AND start_soc >= 0
            AND end_soc <= 100
        ),
        prepared AS (
          SELECT
            *,
            round((soc_delta / 100.0)::numeric, 4) AS efc_value,
            CASE
              WHEN end_soc >= 90 THEN 'very_high_soc'
              WHEN end_soc >= 80 THEN 'high_soc'
              WHEN start_soc <= 15 THEN 'low_soc'
              ELSE 'normal_soc'
            END AS soc_band,
            CASE
              WHEN charge_location_type IN ('dc', 'public_dc', 'fast_dc') OR connector_type LIKE '%dc%' THEN 'dc'
              WHEN charge_location_type IN ('home', 'work', 'ac', 'public_ac') THEN 'ac'
              ELSE 'unknown'
            END AS charge_type
          FROM session_context
        ),
        scored AS (
          SELECT
            *,
            CASE
              WHEN end_soc >= 90 THEN 0.35
              WHEN end_soc >= 80 THEN 0.20
              WHEN start_soc <= 15 THEN 0.10
              ELSE 0.00
            END AS soc_stress_score,
            0.00::numeric AS temperature_stress_score,
            CASE WHEN charge_type = 'dc' THEN 0.12 ELSE 0.00 END AS charge_power_stress_score,
            CASE WHEN charge_type = 'dc' THEN 0.15 ELSE 0.00 END AS dc_stress_score
          FROM prepared
        ),
        final_event AS (
          SELECT
            *,
            LEAST(
              1.80,
              1.00 + soc_stress_score + temperature_stress_score + charge_power_stress_score + dc_stress_score
            ) AS stress_multiplier
          FROM scored
        ),
        upserted AS (
          INSERT INTO battery_cycle_events (
            vehicle_id,
            ownership_id,
            user_id,
            charge_session_id,
            start_soc,
            end_soc,
            soc_delta,
            efc_value,
            soc_band,
            charge_type,
            estimated_battery_temp_band,
            soc_stress_score,
            temperature_stress_score,
            charge_power_stress_score,
            dc_stress_score,
            stress_multiplier,
            stress_adjusted_cycle,
            confidence_score
          )
          SELECT
            vehicle_id,
            ownership_id,
            user_id,
            charge_session_id,
            start_soc,
            end_soc,
            soc_delta,
            efc_value,
            soc_band,
            charge_type,
            'unknown',
            soc_stress_score,
            temperature_stress_score,
            charge_power_stress_score,
            dc_stress_score,
            stress_multiplier,
            round((efc_value * stress_multiplier)::numeric, 4),
            LEAST(0.95, GREATEST(0.15, confidence_score + 0.20))
          FROM final_event
          ON CONFLICT (charge_session_id) DO UPDATE SET
            start_soc = EXCLUDED.start_soc,
            end_soc = EXCLUDED.end_soc,
            soc_delta = EXCLUDED.soc_delta,
            efc_value = EXCLUDED.efc_value,
            soc_band = EXCLUDED.soc_band,
            charge_type = EXCLUDED.charge_type,
            soc_stress_score = EXCLUDED.soc_stress_score,
            temperature_stress_score = EXCLUDED.temperature_stress_score,
            charge_power_stress_score = EXCLUDED.charge_power_stress_score,
            dc_stress_score = EXCLUDED.dc_stress_score,
            stress_multiplier = EXCLUDED.stress_multiplier,
            stress_adjusted_cycle = EXCLUDED.stress_adjusted_cycle,
            confidence_score = EXCLUDED.confidence_score,
            updated_at = now()
          RETURNING vehicle_id
        )
        SELECT vehicle_id AS "vehicleId"
        FROM upserted
      `,
      [chargeSessionId],
    );

    const vehicleId = eventResult.rows[0]?.vehicleId as string | undefined;

    if (!vehicleId) {
      return null;
    }

    return this.refreshStatsForVehicle(vehicleId);
  }

  async refreshStatsForVehicle(vehicleId: string) {
    const result = await this.db.query<BatteryLifecycleStatsRow>(
      `
        WITH owner_context AS (
          SELECT id AS ownership_id, user_id
          FROM vehicle_ownerships
          WHERE vehicle_id = $1
            AND ownership_status = 'active'
          ORDER BY started_at DESC
          LIMIT 1
        ),
        event_stats AS (
          SELECT
            $1::uuid AS vehicle_id,
            count(*)::int AS event_count,
            COALESCE(sum(efc_value), 0)::numeric AS total_efc,
            COALESCE(sum(stress_adjusted_cycle), 0)::numeric AS total_stress_adjusted_cycles,
            avg(start_soc) AS avg_charge_start_soc,
            avg(end_soc) AS avg_charge_end_soc,
            count(*) FILTER (WHERE charge_type = 'ac')::int AS ac_charge_count,
            count(*) FILTER (WHERE charge_type = 'dc')::int AS dc_charge_count,
            count(*) FILTER (WHERE end_soc >= 80)::int AS high_soc_charge_count,
            count(*) FILTER (WHERE start_soc <= 15)::int AS low_soc_charge_count,
            COALESCE(avg(stress_multiplier), 0)::numeric AS avg_stress_multiplier,
            COALESCE(avg(confidence_score), 0)::numeric AS avg_confidence_score
          FROM battery_cycle_events
          WHERE vehicle_id = $1
        ),
        projection AS (
          SELECT
            event_stats.vehicle_id,
            owner_context.ownership_id,
            owner_context.user_id,
            event_stats.event_count,
            round(event_stats.total_efc, 4) AS total_efc,
            round(event_stats.total_stress_adjusted_cycles, 4) AS total_stress_adjusted_cycles,
            round(event_stats.avg_charge_start_soc, 2) AS avg_charge_start_soc,
            round(event_stats.avg_charge_end_soc, 2) AS avg_charge_end_soc,
            event_stats.ac_charge_count,
            event_stats.dc_charge_count,
            CASE
              WHEN event_stats.event_count = 0 THEN NULL
              ELSE round((event_stats.dc_charge_count::numeric / event_stats.event_count), 4)
            END AS dc_charge_ratio,
            event_stats.high_soc_charge_count,
            event_stats.low_soc_charge_count,
            (event_stats.high_soc_charge_count * 4)::numeric AS estimated_high_soc_hours,
            event_stats.low_soc_charge_count AS estimated_low_soc_events,
            round(event_stats.avg_stress_multiplier, 4) AS avg_stress_multiplier,
            CASE
              WHEN event_stats.event_count = 0 THEN 'unknown'
              WHEN event_stats.avg_stress_multiplier >= 1.35 OR event_stats.dc_charge_count::numeric / GREATEST(1, event_stats.event_count) >= 0.60 THEN 'high_stress'
              WHEN event_stats.avg_stress_multiplier >= 1.15 OR event_stats.high_soc_charge_count > 0 THEN 'watch'
              ELSE 'balanced'
            END AS battery_usage_grade,
            LEAST(0.95, event_stats.avg_confidence_score + LEAST(0.30, event_stats.event_count * 0.05)) AS confidence_score
          FROM event_stats
          LEFT JOIN owner_context ON true
        )
        INSERT INTO vehicle_battery_lifecycle_stats (
          vehicle_id,
          ownership_id,
          user_id,
          total_efc,
          total_stress_adjusted_cycles,
          avg_charge_start_soc,
          avg_charge_end_soc,
          ac_charge_count,
          dc_charge_count,
          dc_charge_ratio,
          high_soc_charge_count,
          low_soc_charge_count,
          estimated_high_soc_hours,
          estimated_low_soc_events,
          avg_stress_multiplier,
          battery_usage_grade,
          confidence_score,
          last_calculated_at
        )
        SELECT
          vehicle_id,
          ownership_id,
          user_id,
          total_efc,
          total_stress_adjusted_cycles,
          avg_charge_start_soc,
          avg_charge_end_soc,
          ac_charge_count,
          dc_charge_count,
          dc_charge_ratio,
          high_soc_charge_count,
          low_soc_charge_count,
          estimated_high_soc_hours,
          estimated_low_soc_events,
          avg_stress_multiplier,
          battery_usage_grade,
          confidence_score,
          now()
        FROM projection
        ON CONFLICT (vehicle_id) DO UPDATE SET
          ownership_id = EXCLUDED.ownership_id,
          user_id = EXCLUDED.user_id,
          total_efc = EXCLUDED.total_efc,
          total_stress_adjusted_cycles = EXCLUDED.total_stress_adjusted_cycles,
          avg_charge_start_soc = EXCLUDED.avg_charge_start_soc,
          avg_charge_end_soc = EXCLUDED.avg_charge_end_soc,
          ac_charge_count = EXCLUDED.ac_charge_count,
          dc_charge_count = EXCLUDED.dc_charge_count,
          dc_charge_ratio = EXCLUDED.dc_charge_ratio,
          high_soc_charge_count = EXCLUDED.high_soc_charge_count,
          low_soc_charge_count = EXCLUDED.low_soc_charge_count,
          estimated_high_soc_hours = EXCLUDED.estimated_high_soc_hours,
          estimated_low_soc_events = EXCLUDED.estimated_low_soc_events,
          avg_stress_multiplier = EXCLUDED.avg_stress_multiplier,
          battery_usage_grade = EXCLUDED.battery_usage_grade,
          confidence_score = EXCLUDED.confidence_score,
          last_calculated_at = EXCLUDED.last_calculated_at,
          updated_at = now()
        RETURNING
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          total_efc AS "totalEfc",
          total_stress_adjusted_cycles AS "totalStressAdjustedCycles",
          avg_charge_start_soc AS "avgChargeStartSoc",
          avg_charge_end_soc AS "avgChargeEndSoc",
          ac_charge_count AS "acChargeCount",
          dc_charge_count AS "dcChargeCount",
          dc_charge_ratio AS "dcChargeRatio",
          high_soc_charge_count AS "highSocChargeCount",
          low_soc_charge_count AS "lowSocChargeCount",
          estimated_high_soc_hours AS "estimatedHighSocHours",
          estimated_low_soc_events AS "estimatedLowSocEvents",
          avg_stress_multiplier AS "avgStressMultiplier",
          battery_usage_grade AS "batteryUsageGrade",
          confidence_score AS "confidenceScore",
          last_calculated_at AS "lastCalculatedAt"
      `,
      [vehicleId],
    );

    return mapBatteryLifecycleStats(result.rows[0]);
  }

  async getByVehicle(vehicleId: string) {
    const result = await this.db.query<BatteryLifecycleStatsRow>(
      `
        SELECT
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          total_efc AS "totalEfc",
          total_stress_adjusted_cycles AS "totalStressAdjustedCycles",
          avg_charge_start_soc AS "avgChargeStartSoc",
          avg_charge_end_soc AS "avgChargeEndSoc",
          ac_charge_count AS "acChargeCount",
          dc_charge_count AS "dcChargeCount",
          dc_charge_ratio AS "dcChargeRatio",
          high_soc_charge_count AS "highSocChargeCount",
          low_soc_charge_count AS "lowSocChargeCount",
          estimated_high_soc_hours AS "estimatedHighSocHours",
          estimated_low_soc_events AS "estimatedLowSocEvents",
          avg_stress_multiplier AS "avgStressMultiplier",
          battery_usage_grade AS "batteryUsageGrade",
          confidence_score AS "confidenceScore",
          last_calculated_at AS "lastCalculatedAt"
        FROM vehicle_battery_lifecycle_stats
        WHERE vehicle_id = $1
        LIMIT 1
      `,
      [vehicleId],
    );

    return result.rows[0] ? mapBatteryLifecycleStats(result.rows[0]) : emptyBatteryLifecycleStats(vehicleId);
  }
}

function mapBatteryLifecycleStats(row: BatteryLifecycleStatsRow) {
  return {
    vehicleId: row.vehicleId,
    ownershipId: row.ownershipId,
    userId: row.userId,
    totalEfc: Number(row.totalEfc),
    totalStressAdjustedCycles: Number(row.totalStressAdjustedCycles),
    avgChargeStartSoc: toNumber(row.avgChargeStartSoc),
    avgChargeEndSoc: toNumber(row.avgChargeEndSoc),
    acChargeCount: Number(row.acChargeCount),
    dcChargeCount: Number(row.dcChargeCount),
    dcChargeRatio: toNumber(row.dcChargeRatio),
    highSocChargeCount: Number(row.highSocChargeCount),
    lowSocChargeCount: Number(row.lowSocChargeCount),
    estimatedHighSocHours: Number(row.estimatedHighSocHours),
    estimatedLowSocEvents: Number(row.estimatedLowSocEvents),
    avgStressMultiplier: toNumber(row.avgStressMultiplier),
    batteryUsageGrade: row.batteryUsageGrade,
    confidenceScore: Number(row.confidenceScore),
    lastCalculatedAt: row.lastCalculatedAt,
  };
}

function emptyBatteryLifecycleStats(vehicleId: string) {
  return {
    vehicleId,
    ownershipId: null,
    userId: null,
    totalEfc: 0,
    totalStressAdjustedCycles: 0,
    avgChargeStartSoc: null,
    avgChargeEndSoc: null,
    acChargeCount: 0,
    dcChargeCount: 0,
    dcChargeRatio: null,
    highSocChargeCount: 0,
    lowSocChargeCount: 0,
    estimatedHighSocHours: 0,
    estimatedLowSocEvents: 0,
    avgStressMultiplier: null,
    batteryUsageGrade: 'unknown',
    confidenceScore: 0,
    lastCalculatedAt: null,
  };
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}