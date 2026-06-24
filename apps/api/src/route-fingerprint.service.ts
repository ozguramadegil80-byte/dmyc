import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type RouteFingerprintRow = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  routeKey: string;
  originCell: string;
  destinationCell: string;
  normalDistanceM: number | null;
  normalDurationSeconds: number | null;
  normalAvgSpeedKmh: string | null;
  observedTripCount: number;
  confidenceScore: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

type TripRouteAssignmentRow = {
  id: string;
  tripId: string;
  routeFingerprintId: string;
  assignmentConfidence: string;
  deviationDistanceRatio: string | null;
  deviationDurationRatio: string | null;
  createdAt: Date;
  routeKey: string;
  originCell: string;
  destinationCell: string;
  observedTripCount: number;
  confidenceScore: string;
};

type RouteSummaryRow = {
  routeCount: number;
  learnedRouteCount: number;
  totalObservedTripCount: number;
  topRouteId: string | null;
  topRouteKey: string | null;
  topRouteTripCount: number | null;
  topRouteConfidenceScore: string | null;
};

@Injectable()
export class RouteFingerprintService {
  constructor(private readonly db: DatabaseService) {}

  async refreshForTrip(tripId: string) {
    const existing = await this.getTripAssignment(tripId);

    if (existing) {
      return existing;
    }

    const result = await this.db.query<TripRouteAssignmentRow>(
      `
        WITH trip_context AS (
          SELECT
            id AS trip_id,
            vehicle_id,
            ownership_id,
            user_id,
            started_at,
            ended_at,
            distance_m,
            duration_seconds,
            avg_speed_kmh,
            concat(
              round(ST_Y(start_location::geometry)::numeric, 2)::text,
              ',',
              round(ST_X(start_location::geometry)::numeric, 2)::text
            ) AS origin_cell,
            concat(
              round(ST_Y(end_location::geometry)::numeric, 2)::text,
              ',',
              round(ST_X(end_location::geometry)::numeric, 2)::text
            ) AS destination_cell,
            ST_SetSRID(
              ST_MakePoint(
                round(ST_X(start_location::geometry)::numeric, 2),
                round(ST_Y(start_location::geometry)::numeric, 2)
              ),
              4326
            )::geography AS origin_centroid,
            ST_SetSRID(
              ST_MakePoint(
                round(ST_X(end_location::geometry)::numeric, 2),
                round(ST_Y(end_location::geometry)::numeric, 2)
              ),
              4326
            )::geography AS destination_centroid,
            (round(distance_m::numeric / 1000.0) * 1000)::int AS distance_band_m
          FROM trips
          WHERE id = $1
            AND status = 'completed'
            AND start_location IS NOT NULL
            AND end_location IS NOT NULL
            AND COALESCE(distance_m, 0) >= 500
            AND COALESCE(duration_seconds, 0) >= 60
        ),
        prepared AS (
          SELECT
            *,
            concat(origin_cell, '|', destination_cell, '|', distance_band_m::text) AS route_key
          FROM trip_context
        ),
        upserted AS (
          INSERT INTO route_fingerprints (
            vehicle_id,
            ownership_id,
            user_id,
            route_key,
            origin_cell,
            destination_cell,
            origin_centroid,
            destination_centroid,
            normal_distance_m,
            normal_duration_seconds,
            normal_avg_speed_kmh,
            observed_trip_count,
            confidence_score,
            first_seen_at,
            last_seen_at
          )
          SELECT
            vehicle_id,
            ownership_id,
            user_id,
            route_key,
            origin_cell,
            destination_cell,
            origin_centroid,
            destination_centroid,
            distance_m,
            duration_seconds,
            avg_speed_kmh,
            1,
            0.15,
            started_at,
            COALESCE(ended_at, started_at)
          FROM prepared
          ON CONFLICT (vehicle_id, route_key) DO UPDATE SET
            ownership_id = COALESCE(EXCLUDED.ownership_id, route_fingerprints.ownership_id),
            user_id = COALESCE(EXCLUDED.user_id, route_fingerprints.user_id),
            normal_distance_m = round(
              ((COALESCE(route_fingerprints.normal_distance_m, 0) * route_fingerprints.observed_trip_count) + EXCLUDED.normal_distance_m)::numeric /
              GREATEST(1, route_fingerprints.observed_trip_count + 1)
            )::int,
            normal_duration_seconds = round(
              ((COALESCE(route_fingerprints.normal_duration_seconds, 0) * route_fingerprints.observed_trip_count) + EXCLUDED.normal_duration_seconds)::numeric /
              GREATEST(1, route_fingerprints.observed_trip_count + 1)
            )::int,
            normal_avg_speed_kmh = round(
              ((COALESCE(route_fingerprints.normal_avg_speed_kmh, 0) * route_fingerprints.observed_trip_count) + COALESCE(EXCLUDED.normal_avg_speed_kmh, 0))::numeric /
              GREATEST(1, route_fingerprints.observed_trip_count + 1),
              2
            ),
            observed_trip_count = route_fingerprints.observed_trip_count + 1,
            confidence_score = LEAST(0.95, 0.15 + ((route_fingerprints.observed_trip_count + 1) * 0.12)),
            last_seen_at = GREATEST(route_fingerprints.last_seen_at, EXCLUDED.last_seen_at),
            updated_at = now()
          RETURNING
            id,
            route_key,
            origin_cell,
            destination_cell,
            normal_distance_m,
            normal_duration_seconds,
            observed_trip_count,
            confidence_score
        ),
        assignment AS (
          INSERT INTO trip_route_assignments (
            trip_id,
            route_fingerprint_id,
            assignment_confidence,
            deviation_distance_ratio,
            deviation_duration_ratio
          )
          SELECT
            prepared.trip_id,
            upserted.id,
            upserted.confidence_score,
            CASE
              WHEN upserted.observed_trip_count < 2 OR COALESCE(upserted.normal_distance_m, 0) = 0 THEN NULL
              ELSE round(((prepared.distance_m - upserted.normal_distance_m)::numeric / upserted.normal_distance_m), 4)
            END,
            CASE
              WHEN upserted.observed_trip_count < 2 OR COALESCE(upserted.normal_duration_seconds, 0) = 0 THEN NULL
              ELSE round(((prepared.duration_seconds - upserted.normal_duration_seconds)::numeric / upserted.normal_duration_seconds), 4)
            END
          FROM prepared
          CROSS JOIN upserted
          ON CONFLICT (trip_id) DO UPDATE SET
            route_fingerprint_id = EXCLUDED.route_fingerprint_id,
            assignment_confidence = EXCLUDED.assignment_confidence,
            deviation_distance_ratio = EXCLUDED.deviation_distance_ratio,
            deviation_duration_ratio = EXCLUDED.deviation_duration_ratio
          RETURNING
            id,
            trip_id AS "tripId",
            route_fingerprint_id AS "routeFingerprintId",
            assignment_confidence AS "assignmentConfidence",
            deviation_distance_ratio AS "deviationDistanceRatio",
            deviation_duration_ratio AS "deviationDurationRatio",
            created_at AS "createdAt"
        )
        SELECT
          assignment.*,
          upserted.route_key AS "routeKey",
          upserted.origin_cell AS "originCell",
          upserted.destination_cell AS "destinationCell",
          upserted.observed_trip_count AS "observedTripCount",
          upserted.confidence_score AS "confidenceScore"
        FROM assignment
        CROSS JOIN upserted
      `,
      [tripId],
    );

    return result.rows[0] ? mapTripRouteAssignment(result.rows[0]) : null;
  }

  async matchOrigin(vehicleId: string, lat: number, lng: number) {
    const originCell = `${(Math.round(lat * 100) / 100).toFixed(2)},${(Math.round(lng * 100) / 100).toFixed(2)}`;

    const result = await this.db.query<RouteFingerprintRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          route_key AS "routeKey",
          origin_cell AS "originCell",
          destination_cell AS "destinationCell",
          normal_distance_m AS "normalDistanceM",
          normal_duration_seconds AS "normalDurationSeconds",
          normal_avg_speed_kmh AS "normalAvgSpeedKmh",
          observed_trip_count AS "observedTripCount",
          confidence_score AS "confidenceScore",
          first_seen_at AS "firstSeenAt",
          last_seen_at AS "lastSeenAt"
        FROM route_fingerprints
        WHERE vehicle_id = $1
          AND origin_cell = $2
        ORDER BY confidence_score DESC, observed_trip_count DESC
        LIMIT 5
      `,
      [vehicleId, originCell],
    );

    return result.rows.map(mapRouteFingerprint);
  }

  async listVehicleRouteFingerprints(vehicleId: string) {
    const result = await this.db.query<RouteFingerprintRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          route_key AS "routeKey",
          origin_cell AS "originCell",
          destination_cell AS "destinationCell",
          normal_distance_m AS "normalDistanceM",
          normal_duration_seconds AS "normalDurationSeconds",
          normal_avg_speed_kmh AS "normalAvgSpeedKmh",
          observed_trip_count AS "observedTripCount",
          confidence_score AS "confidenceScore",
          first_seen_at AS "firstSeenAt",
          last_seen_at AS "lastSeenAt"
        FROM route_fingerprints
        WHERE vehicle_id = $1
        ORDER BY observed_trip_count DESC, last_seen_at DESC
        LIMIT 20
      `,
      [vehicleId],
    );

    return result.rows.map(mapRouteFingerprint);
  }

  async getVehicleRouteSummary(vehicleId: string) {
    const result = await this.db.query<RouteSummaryRow>(
      `
        WITH route_stats AS (
          SELECT
            count(*)::int AS route_count,
            count(*) FILTER (WHERE observed_trip_count >= 2)::int AS learned_route_count,
            COALESCE(sum(observed_trip_count), 0)::int AS total_observed_trip_count
          FROM route_fingerprints
          WHERE vehicle_id = $1
        ),
        top_route AS (
          SELECT
            id,
            route_key,
            observed_trip_count,
            confidence_score
          FROM route_fingerprints
          WHERE vehicle_id = $1
          ORDER BY observed_trip_count DESC, last_seen_at DESC
          LIMIT 1
        )
        SELECT
          route_stats.route_count AS "routeCount",
          route_stats.learned_route_count AS "learnedRouteCount",
          route_stats.total_observed_trip_count AS "totalObservedTripCount",
          top_route.id AS "topRouteId",
          top_route.route_key AS "topRouteKey",
          top_route.observed_trip_count AS "topRouteTripCount",
          top_route.confidence_score AS "topRouteConfidenceScore"
        FROM route_stats
        LEFT JOIN top_route ON true
      `,
      [vehicleId],
    );

    const row = result.rows[0];

    return {
      vehicleId,
      routeCount: Number(row?.routeCount ?? 0),
      learnedRouteCount: Number(row?.learnedRouteCount ?? 0),
      totalObservedTripCount: Number(row?.totalObservedTripCount ?? 0),
      topRoute: row?.topRouteId
        ? {
            id: row.topRouteId,
            routeKey: row.topRouteKey,
            observedTripCount: Number(row.topRouteTripCount),
            confidenceScore: toNumber(row.topRouteConfidenceScore),
          }
        : null,
      status: row && Number(row.learnedRouteCount) > 0 ? 'observed' : 'learning',
    };
  }

  private async getTripAssignment(tripId: string) {
    const result = await this.db.query<TripRouteAssignmentRow>(
      `
        SELECT
          trip_route_assignments.id,
          trip_route_assignments.trip_id AS "tripId",
          trip_route_assignments.route_fingerprint_id AS "routeFingerprintId",
          trip_route_assignments.assignment_confidence AS "assignmentConfidence",
          trip_route_assignments.deviation_distance_ratio AS "deviationDistanceRatio",
          trip_route_assignments.deviation_duration_ratio AS "deviationDurationRatio",
          trip_route_assignments.created_at AS "createdAt",
          route_fingerprints.route_key AS "routeKey",
          route_fingerprints.origin_cell AS "originCell",
          route_fingerprints.destination_cell AS "destinationCell",
          route_fingerprints.observed_trip_count AS "observedTripCount",
          route_fingerprints.confidence_score AS "confidenceScore"
        FROM trip_route_assignments
        JOIN route_fingerprints ON route_fingerprints.id = trip_route_assignments.route_fingerprint_id
        WHERE trip_route_assignments.trip_id = $1
        LIMIT 1
      `,
      [tripId],
    );

    return result.rows[0] ? mapTripRouteAssignment(result.rows[0]) : null;
  }
}

function mapRouteFingerprint(row: RouteFingerprintRow) {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    ownershipId: row.ownershipId,
    userId: row.userId,
    routeKey: row.routeKey,
    originCell: row.originCell,
    destinationCell: row.destinationCell,
    normalDistanceM: row.normalDistanceM,
    normalDurationSeconds: row.normalDurationSeconds,
    normalAvgSpeedKmh: toNumber(row.normalAvgSpeedKmh),
    observedTripCount: Number(row.observedTripCount),
    confidenceScore: toNumber(row.confidenceScore),
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
  };
}

function mapTripRouteAssignment(row: TripRouteAssignmentRow) {
  return {
    id: row.id,
    tripId: row.tripId,
    routeFingerprintId: row.routeFingerprintId,
    assignmentConfidence: toNumber(row.assignmentConfidence),
    deviationDistanceRatio: toNumber(row.deviationDistanceRatio),
    deviationDurationRatio: toNumber(row.deviationDurationRatio),
    routeKey: row.routeKey,
    originCell: row.originCell,
    destinationCell: row.destinationCell,
    observedTripCount: Number(row.observedTripCount),
    confidenceScore: toNumber(row.confidenceScore),
    createdAt: row.createdAt,
  };
}

function toNumber(value: string | number | null) {
  return value === null ? null : Number(value);
}