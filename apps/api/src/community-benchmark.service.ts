import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type CommunityBenchmarkRow = {
  vehicleId: string;
  benchmarkCount: number;
  readyBenchmarkCount: number;
  totalMatchedTripCount: number;
  topMatchedTripCount: number | null;
  topMatchQualityScore: string | null;
  topCommunityAvgDistanceM: number | null;
  topCommunityAvgDurationSeconds: number | null;
  topCommunityAvgSpeedKmh: string | null;
  topCommunityAvgConsumptionKwh100Km: string | null;
  topCommunityWarning: string | null;
};

@Injectable()
export class CommunityBenchmarkService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForVehicle(vehicleId: string) {
    await this.refreshSimilarTripClusters();
    await this.refreshRouteCommunityBenchmarks(vehicleId);
    return this.getVehicleCommunityBenchmark(vehicleId);
  }

  async getVehicleCommunityBenchmark(vehicleId: string) {
    const result = await this.db.query<CommunityBenchmarkRow>(
      `
        WITH benchmark_stats AS (
          SELECT
            count(*)::int AS benchmark_count,
            count(*) FILTER (WHERE matched_trip_count >= 3)::int AS ready_benchmark_count,
            COALESCE(sum(matched_trip_count), 0)::int AS total_matched_trip_count
          FROM route_community_benchmarks
          WHERE vehicle_id = $1
        ),
        top_benchmark AS (
          SELECT
            matched_trip_count,
            match_quality_score,
            community_avg_distance_m,
            community_avg_duration_seconds,
            community_avg_speed_kmh,
            community_avg_consumption_kwh_100km,
            community_warning
          FROM route_community_benchmarks
          WHERE vehicle_id = $1
          ORDER BY matched_trip_count DESC, updated_at DESC
          LIMIT 1
        )
        SELECT
          $1::uuid AS "vehicleId",
          benchmark_stats.benchmark_count AS "benchmarkCount",
          benchmark_stats.ready_benchmark_count AS "readyBenchmarkCount",
          benchmark_stats.total_matched_trip_count AS "totalMatchedTripCount",
          top_benchmark.matched_trip_count AS "topMatchedTripCount",
          top_benchmark.match_quality_score AS "topMatchQualityScore",
          top_benchmark.community_avg_distance_m AS "topCommunityAvgDistanceM",
          top_benchmark.community_avg_duration_seconds AS "topCommunityAvgDurationSeconds",
          top_benchmark.community_avg_speed_kmh AS "topCommunityAvgSpeedKmh",
          top_benchmark.community_avg_consumption_kwh_100km AS "topCommunityAvgConsumptionKwh100Km",
          top_benchmark.community_warning AS "topCommunityWarning"
        FROM benchmark_stats
        LEFT JOIN top_benchmark ON true
      `,
      [vehicleId],
    );

    return mapCommunityBenchmark(result.rows[0], vehicleId);
  }

  private async refreshSimilarTripClusters() {
    await this.db.query(
      `
        WITH trip_source AS (
          SELECT
            vehicles.vehicle_spec_id,
            route_fingerprints.route_key AS route_cluster_key,
            CASE
              WHEN COALESCE(trips.avg_speed_kmh, 0) < 45 THEN 'eco'
              WHEN COALESCE(trips.avg_speed_kmh, 0) >= 90 THEN 'fast'
              ELSE 'normal'
            END AS speed_profile_bucket,
            trips.distance_m,
            trips.duration_seconds,
            trips.avg_speed_kmh,
            vehicle_specs.official_efficiency_wh_km
          FROM trips
          JOIN vehicles ON vehicles.id = trips.vehicle_id
          JOIN trip_route_assignments ON trip_route_assignments.trip_id = trips.id
          JOIN route_fingerprints ON route_fingerprints.id = trip_route_assignments.route_fingerprint_id
          LEFT JOIN vehicle_specs ON vehicle_specs.id = vehicles.vehicle_spec_id
          WHERE trips.status = 'completed'
            AND vehicles.vehicle_spec_id IS NOT NULL
            AND trips.distance_m IS NOT NULL
            AND trips.duration_seconds IS NOT NULL
        ),
        aggregate_source AS (
          SELECT
            vehicle_spec_id,
            route_cluster_key,
            'unknown'::text AS passenger_bucket,
            'unknown'::text AS cargo_bucket,
            'unknown'::text AS climate_bucket,
            speed_profile_bucket,
            'unknown'::text AS temperature_bucket,
            count(*)::int AS trip_count,
            round(avg(distance_m))::int AS avg_distance_m,
            round(avg(duration_seconds))::int AS avg_duration_seconds,
            round(avg(avg_speed_kmh)::numeric, 2) AS avg_speed_kmh,
            round((avg(official_efficiency_wh_km)::numeric / 1000.0), 3) AS avg_consumption_kwh_100km,
            LEAST(0.95, 0.15 + count(*) * 0.10) AS confidence_score
          FROM trip_source
          GROUP BY vehicle_spec_id, route_cluster_key, speed_profile_bucket
        )
        INSERT INTO similar_trip_clusters (
          vehicle_spec_id,
          route_cluster_key,
          passenger_bucket,
          cargo_bucket,
          climate_bucket,
          speed_profile_bucket,
          temperature_bucket,
          trip_count,
          avg_distance_m,
          avg_duration_seconds,
          avg_speed_kmh,
          avg_consumption_kwh_100km,
          confidence_score,
          last_calculated_at
        )
        SELECT
          vehicle_spec_id,
          route_cluster_key,
          passenger_bucket,
          cargo_bucket,
          climate_bucket,
          speed_profile_bucket,
          temperature_bucket,
          trip_count,
          avg_distance_m,
          avg_duration_seconds,
          avg_speed_kmh,
          avg_consumption_kwh_100km,
          confidence_score,
          now()
        FROM aggregate_source
        ON CONFLICT (
          vehicle_spec_id,
          route_cluster_key,
          passenger_bucket,
          cargo_bucket,
          climate_bucket,
          speed_profile_bucket,
          temperature_bucket
        ) DO UPDATE SET
          trip_count = EXCLUDED.trip_count,
          avg_distance_m = EXCLUDED.avg_distance_m,
          avg_duration_seconds = EXCLUDED.avg_duration_seconds,
          avg_speed_kmh = EXCLUDED.avg_speed_kmh,
          avg_consumption_kwh_100km = EXCLUDED.avg_consumption_kwh_100km,
          confidence_score = EXCLUDED.confidence_score,
          last_calculated_at = EXCLUDED.last_calculated_at,
          updated_at = now()
      `,
    );
  }

  private async refreshRouteCommunityBenchmarks(vehicleId: string) {
    await this.db.query(
      `
        WITH vehicle_context AS (
          SELECT id AS vehicle_id, vehicle_spec_id
          FROM vehicles
          WHERE id = $1
            AND vehicle_spec_id IS NOT NULL
        ),
        route_context AS (
          SELECT
            route_fingerprints.id AS route_fingerprint_id,
            route_fingerprints.route_key,
            route_fingerprints.normal_distance_m,
            route_fingerprints.normal_duration_seconds,
            route_fingerprints.normal_avg_speed_kmh,
            vehicle_context.vehicle_id,
            vehicle_context.vehicle_spec_id
          FROM route_fingerprints
          JOIN vehicle_context ON vehicle_context.vehicle_id = route_fingerprints.vehicle_id
        ),
        matched AS (
          SELECT DISTINCT ON (route_context.route_fingerprint_id)
            route_context.vehicle_id,
            route_context.route_fingerprint_id,
            similar_trip_clusters.id AS similar_trip_cluster_id,
            similar_trip_clusters.trip_count AS matched_trip_count,
            CASE
              WHEN similar_trip_clusters.trip_count >= 3 THEN LEAST(0.95, similar_trip_clusters.confidence_score)
              ELSE LEAST(0.45, similar_trip_clusters.confidence_score)
            END AS match_quality_score,
            similar_trip_clusters.avg_distance_m AS community_avg_distance_m,
            similar_trip_clusters.avg_duration_seconds AS community_avg_duration_seconds,
            similar_trip_clusters.avg_speed_kmh AS community_avg_speed_kmh,
            similar_trip_clusters.avg_consumption_kwh_100km AS community_avg_consumption_kwh_100km,
            CASE
              WHEN similar_trip_clusters.trip_count < 3 THEN 'learning_sample'
              WHEN route_context.normal_avg_speed_kmh IS NOT NULL
                AND similar_trip_clusters.avg_speed_kmh IS NOT NULL
                AND route_context.normal_avg_speed_kmh > similar_trip_clusters.avg_speed_kmh * 1.15 THEN 'higher_than_community_speed'
              ELSE NULL
            END AS community_warning
          FROM route_context
          JOIN similar_trip_clusters
            ON similar_trip_clusters.vehicle_spec_id = route_context.vehicle_spec_id
            AND similar_trip_clusters.route_cluster_key = route_context.route_key
          ORDER BY route_context.route_fingerprint_id, similar_trip_clusters.trip_count DESC, similar_trip_clusters.confidence_score DESC
        )
        INSERT INTO route_community_benchmarks (
          vehicle_id,
          route_fingerprint_id,
          similar_trip_cluster_id,
          matched_trip_count,
          match_quality_score,
          community_avg_distance_m,
          community_avg_duration_seconds,
          community_avg_speed_kmh,
          community_avg_consumption_kwh_100km,
          community_warning
        )
        SELECT
          vehicle_id,
          route_fingerprint_id,
          similar_trip_cluster_id,
          matched_trip_count,
          match_quality_score,
          community_avg_distance_m,
          community_avg_duration_seconds,
          community_avg_speed_kmh,
          community_avg_consumption_kwh_100km,
          community_warning
        FROM matched
        ON CONFLICT (vehicle_id, route_fingerprint_id) DO UPDATE SET
          similar_trip_cluster_id = EXCLUDED.similar_trip_cluster_id,
          matched_trip_count = EXCLUDED.matched_trip_count,
          match_quality_score = EXCLUDED.match_quality_score,
          community_avg_distance_m = EXCLUDED.community_avg_distance_m,
          community_avg_duration_seconds = EXCLUDED.community_avg_duration_seconds,
          community_avg_speed_kmh = EXCLUDED.community_avg_speed_kmh,
          community_avg_consumption_kwh_100km = EXCLUDED.community_avg_consumption_kwh_100km,
          community_warning = EXCLUDED.community_warning,
          updated_at = now()
      `,
      [vehicleId],
    );
  }
}

function mapCommunityBenchmark(row: CommunityBenchmarkRow | undefined, vehicleId: string) {
  const readyBenchmarkCount = Number(row?.readyBenchmarkCount ?? 0);
  const topMatchedTripCount = row?.topMatchedTripCount === null || row?.topMatchedTripCount === undefined
    ? null
    : Number(row.topMatchedTripCount);

  return {
    vehicleId,
    benchmarkCount: Number(row?.benchmarkCount ?? 0),
    readyBenchmarkCount,
    totalMatchedTripCount: Number(row?.totalMatchedTripCount ?? 0),
    topBenchmark: topMatchedTripCount
      ? {
          matchedTripCount: topMatchedTripCount,
          matchQualityScore: toNumber(row?.topMatchQualityScore ?? null),
          communityAvgDistanceM: row?.topCommunityAvgDistanceM ?? null,
          communityAvgDurationSeconds: row?.topCommunityAvgDurationSeconds ?? null,
          communityAvgSpeedKmh: toNumber(row?.topCommunityAvgSpeedKmh ?? null),
          communityAvgConsumptionKwh100Km: toNumber(row?.topCommunityAvgConsumptionKwh100Km ?? null),
          communityWarning: row?.topCommunityWarning ?? null,
        }
      : null,
    status: readyBenchmarkCount > 0 ? 'ready' : 'learning',
  };
}

function toNumber(value: string | null) {
  return value === null ? null : Number(value);
}