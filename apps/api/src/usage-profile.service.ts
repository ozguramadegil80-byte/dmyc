import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type UsageProfileRow = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  profileType: string;
  avgDailyKm: string | null;
  avgWeeklyKm: string | null;
  cityTripRatio: string | null;
  highwayTripRatio: string | null;
  dcChargeRatio: string | null;
  homeChargeRatio: string | null;
  avgStartSoc: string | null;
  avgEndSoc: string | null;
  confidenceScore: string;
  lastCalculatedAt: Date | null;
};

@Injectable()
export class UsageProfileService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForVehicle(vehicleId: string) {
    const result = await this.db.query<UsageProfileRow>(
      `
        WITH owner_context AS (
          SELECT id AS ownership_id, user_id
          FROM vehicle_ownerships
          WHERE vehicle_id = $1
            AND ownership_status = 'active'
          ORDER BY started_at DESC
          LIMIT 1
        ),
        trip_stats AS (
          SELECT
            count(*)::int AS trip_count,
            COALESCE(sum(distance_m), 0)::numeric AS total_distance_m,
            min(started_at) AS first_trip_at,
            max(COALESCE(ended_at, started_at)) AS last_trip_at,
            count(*) FILTER (WHERE COALESCE(avg_speed_kmh, 0) < 55)::numeric AS city_trips,
            count(*) FILTER (WHERE COALESCE(avg_speed_kmh, 0) >= 55)::numeric AS highway_trips
          FROM trips
          WHERE vehicle_id = $1
            AND status = 'completed'
            AND distance_m IS NOT NULL
        ),
        charge_stats AS (
          SELECT
            count(*)::int AS charge_count,
            count(*) FILTER (
              WHERE lower(COALESCE(charge_location_type, '')) IN ('dc', 'public_dc', 'fast_dc')
                OR lower(COALESCE(connector_type, '')) LIKE '%dc%'
            )::numeric AS dc_charges,
            count(*) FILTER (WHERE lower(COALESCE(charge_location_type, '')) IN ('home', 'ev'))::numeric AS home_charges,
            avg(start_soc) AS avg_start_soc,
            avg(end_soc) AS avg_end_soc
          FROM charge_sessions
          WHERE vehicle_id = $1
        ),
        projection AS (
          SELECT
            $1::uuid AS vehicle_id,
            owner_context.ownership_id,
            owner_context.user_id,
            trip_stats.trip_count,
            charge_stats.charge_count,
            CASE
              WHEN trip_stats.trip_count = 0 THEN NULL
              ELSE round(
                (trip_stats.total_distance_m / 1000.0) /
                GREATEST(1, EXTRACT(EPOCH FROM (trip_stats.last_trip_at - trip_stats.first_trip_at)) / 86400.0),
                2
              )
            END AS avg_daily_km,
            CASE
              WHEN trip_stats.trip_count = 0 THEN NULL
              ELSE round(
                7 * (trip_stats.total_distance_m / 1000.0) /
                GREATEST(1, EXTRACT(EPOCH FROM (trip_stats.last_trip_at - trip_stats.first_trip_at)) / 86400.0),
                2
              )
            END AS avg_weekly_km,
            CASE
              WHEN trip_stats.trip_count = 0 THEN NULL
              ELSE round((trip_stats.city_trips / trip_stats.trip_count)::numeric, 4)
            END AS city_trip_ratio,
            CASE
              WHEN trip_stats.trip_count = 0 THEN NULL
              ELSE round((trip_stats.highway_trips / trip_stats.trip_count)::numeric, 4)
            END AS highway_trip_ratio,
            CASE
              WHEN charge_stats.charge_count = 0 THEN NULL
              ELSE round((charge_stats.dc_charges / charge_stats.charge_count)::numeric, 4)
            END AS dc_charge_ratio,
            CASE
              WHEN charge_stats.charge_count = 0 THEN NULL
              ELSE round((charge_stats.home_charges / charge_stats.charge_count)::numeric, 4)
            END AS home_charge_ratio,
            round(charge_stats.avg_start_soc::numeric, 2) AS avg_start_soc,
            round(charge_stats.avg_end_soc::numeric, 2) AS avg_end_soc,
            LEAST(
              0.95,
              (CASE WHEN trip_stats.trip_count > 0 THEN 0.20 ELSE 0 END) +
              LEAST(0.35, trip_stats.trip_count * 0.07) +
              (CASE WHEN charge_stats.charge_count > 0 THEN 0.15 ELSE 0 END) +
              LEAST(0.25, charge_stats.charge_count * 0.05)
            ) AS confidence_score
          FROM trip_stats
          CROSS JOIN charge_stats
          LEFT JOIN owner_context ON true
        )
        INSERT INTO usage_profiles (
          vehicle_id,
          ownership_id,
          user_id,
          profile_type,
          avg_daily_km,
          avg_weekly_km,
          city_trip_ratio,
          highway_trip_ratio,
          dc_charge_ratio,
          home_charge_ratio,
          avg_start_soc,
          avg_end_soc,
          confidence_score,
          last_calculated_at
        )
        SELECT
          vehicle_id,
          ownership_id,
          user_id,
          CASE
            WHEN trip_count = 0 AND charge_count = 0 THEN 'unknown'
            WHEN confidence_score < 0.40 THEN 'learning'
            ELSE 'observed'
          END,
          avg_daily_km,
          avg_weekly_km,
          city_trip_ratio,
          highway_trip_ratio,
          dc_charge_ratio,
          home_charge_ratio,
          avg_start_soc,
          avg_end_soc,
          confidence_score,
          now()
        FROM projection
        ON CONFLICT (vehicle_id) DO UPDATE SET
          ownership_id = EXCLUDED.ownership_id,
          user_id = EXCLUDED.user_id,
          profile_type = EXCLUDED.profile_type,
          avg_daily_km = EXCLUDED.avg_daily_km,
          avg_weekly_km = EXCLUDED.avg_weekly_km,
          city_trip_ratio = EXCLUDED.city_trip_ratio,
          highway_trip_ratio = EXCLUDED.highway_trip_ratio,
          dc_charge_ratio = EXCLUDED.dc_charge_ratio,
          home_charge_ratio = EXCLUDED.home_charge_ratio,
          avg_start_soc = EXCLUDED.avg_start_soc,
          avg_end_soc = EXCLUDED.avg_end_soc,
          confidence_score = EXCLUDED.confidence_score,
          last_calculated_at = EXCLUDED.last_calculated_at,
          updated_at = now()
        RETURNING
          id,
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          profile_type AS "profileType",
          avg_daily_km AS "avgDailyKm",
          avg_weekly_km AS "avgWeeklyKm",
          city_trip_ratio AS "cityTripRatio",
          highway_trip_ratio AS "highwayTripRatio",
          dc_charge_ratio AS "dcChargeRatio",
          home_charge_ratio AS "homeChargeRatio",
          avg_start_soc AS "avgStartSoc",
          avg_end_soc AS "avgEndSoc",
          confidence_score AS "confidenceScore",
          last_calculated_at AS "lastCalculatedAt"
      `,
      [vehicleId],
    );

    return mapUsageProfile(result.rows[0]);
  }

  async getByVehicle(vehicleId: string) {
    const result = await this.db.query<UsageProfileRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          profile_type AS "profileType",
          avg_daily_km AS "avgDailyKm",
          avg_weekly_km AS "avgWeeklyKm",
          city_trip_ratio AS "cityTripRatio",
          highway_trip_ratio AS "highwayTripRatio",
          dc_charge_ratio AS "dcChargeRatio",
          home_charge_ratio AS "homeChargeRatio",
          avg_start_soc AS "avgStartSoc",
          avg_end_soc AS "avgEndSoc",
          confidence_score AS "confidenceScore",
          last_calculated_at AS "lastCalculatedAt"
        FROM usage_profiles
        WHERE vehicle_id = $1
        ORDER BY last_calculated_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `,
      [vehicleId],
    );

    return result.rows[0] ? mapUsageProfile(result.rows[0]) : emptyProfile(vehicleId);
  }
}

function mapUsageProfile(row: UsageProfileRow) {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    ownershipId: row.ownershipId,
    userId: row.userId,
    profileType: row.profileType,
    avgDailyKm: toNumber(row.avgDailyKm),
    avgWeeklyKm: toNumber(row.avgWeeklyKm),
    cityTripRatio: toNumber(row.cityTripRatio),
    highwayTripRatio: toNumber(row.highwayTripRatio),
    dcChargeRatio: toNumber(row.dcChargeRatio),
    homeChargeRatio: toNumber(row.homeChargeRatio),
    avgStartSoc: toNumber(row.avgStartSoc),
    avgEndSoc: toNumber(row.avgEndSoc),
    confidenceScore: Number(row.confidenceScore),
    lastCalculatedAt: row.lastCalculatedAt,
  };
}

function emptyProfile(vehicleId: string) {
  return {
    vehicleId,
    profileType: 'unknown',
    avgDailyKm: null,
    avgWeeklyKm: null,
    cityTripRatio: null,
    highwayTripRatio: null,
    dcChargeRatio: null,
    homeChargeRatio: null,
    avgStartSoc: null,
    avgEndSoc: null,
    confidenceScore: 0,
    lastCalculatedAt: null,
  };
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}
