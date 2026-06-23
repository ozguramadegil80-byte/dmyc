import { Injectable } from '@nestjs/common';
import { CommunityBenchmarkService } from './community-benchmark.service';
import { DatabaseService } from './database.service';
import { MonthlyReportService } from './monthly-report.service';
import { AnnualReportService } from './annual-report.service';
import { RouteFingerprintService } from './route-fingerprint.service';
import { ServiceVisitService } from './service-visit.service';
import { TripContextService } from './trip-context.service';
import { UsageProfileService } from './usage-profile.service';

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type CreateTripBody = {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  startedAt?: string;
  startLocation?: GeoPoint;
  source?: string;
  plannedRouteId?: string;
  destinationLocationId?: string;
};

type TripPointInput = {
  recordedAt?: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  headingDegrees?: number;
  altitudeM?: number;
  accuracyM?: number;
  source?: string;
};

type AppendTripPointsBody = {
  points: TripPointInput[];
};

type FinishTripBody = {
  endedAt?: string;
  endLocation?: GeoPoint;
};

type TripRouteProgressRow = {
  tripId: string;
  vehicleId: string;
  userId: string | null;
  status: string;
  savedRouteId: string | null;
  savedRouteLabel: string | null;
  destinationLocationId: string | null;
  destinationLabel: string | null;
  destinationKind: string | null;
  destinationLatitude: string | null;
  destinationLongitude: string | null;
  lastLatitude: string | null;
  lastLongitude: string | null;
  lastRecordedAt: string | null;
  lastSpeedKmh: string | null;
  remainingMeters: string | null;
  pointCount: number;
};

@Injectable()
export class TripsService {
  constructor(
    private readonly communityBenchmarks: CommunityBenchmarkService,
    private readonly db: DatabaseService,
    private readonly monthlyReports: MonthlyReportService,
    private readonly annualReports: AnnualReportService,
    private readonly routeFingerprints: RouteFingerprintService,
    private readonly serviceVisit: ServiceVisitService,
    private readonly tripContext: TripContextService,
    private readonly usageProfile: UsageProfileService,
  ) {}

  async createTrip(body: CreateTripBody) {
    const result = await this.db.query(
      `
        INSERT INTO trips (
          vehicle_id,
          ownership_id,
          user_id,
          started_at,
          start_location,
          source,
          driver_assignment_status
        )
        VALUES (
          $1,
          $2,
          $3,
          COALESCE($4::timestamptz, now()),
          CASE
            WHEN $5::numeric IS NULL OR $6::numeric IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($6::numeric, $5::numeric), 4326)::geography
          END,
          $7,
          'unknown'
        )
        RETURNING id, vehicle_id AS "vehicleId", ownership_id AS "ownershipId", user_id AS "userId", started_at AS "startedAt", status, source, driver_assignment_status AS "driverAssignmentStatus", created_at AS "createdAt"
      `,
      [
        body.vehicleId,
        body.ownershipId ?? null,
        body.userId ?? null,
        body.startedAt ?? null,
        body.startLocation?.latitude ?? null,
        body.startLocation?.longitude ?? null,
        body.source ?? 'mobile_gps',
      ],
    );

    const trip = result.rows[0];

    if (trip?.id && (body.plannedRouteId || body.destinationLocationId)) {
      await this.recordTripRouteIntent(trip.id, trip.vehicleId, body);
    }

    if (trip?.vehicleId) {
      await this.usageProfile.refreshForVehicle(trip.vehicleId);
    }

    return trip;
  }

  async appendTripPoints(tripId: string, body: AppendTripPointsBody) {
    const points = body.points ?? [];

    if (points.length === 0) {
      return {
        tripId,
        insertedCount: 0,
      };
    }

    const values: unknown[] = [];
    const placeholders = points.map((point, index) => {
      const offset = index * 8;
      values.push(
        tripId,
        point.recordedAt ?? null,
        point.latitude,
        point.longitude,
        point.speedKmh ?? null,
        point.headingDegrees ?? null,
        point.altitudeM ?? null,
        point.accuracyM ?? null,
      );

      return `(
        $${offset + 1},
        COALESCE($${offset + 2}::timestamptz, now()),
        ST_SetSRID(ST_MakePoint($${offset + 4}::numeric, $${offset + 3}::numeric), 4326)::geography,
        $${offset + 5},
        $${offset + 6},
        $${offset + 7},
        $${offset + 8},
        'mobile_gps'
      )`;
    });

    const result = await this.db.query(
      `
        INSERT INTO trip_points (
          trip_id,
          recorded_at,
          location,
          speed_kmh,
          heading_degrees,
          altitude_m,
          accuracy_m,
          source
        )
        VALUES ${placeholders.join(',')}
        RETURNING id
      `,
      values,
    );

    await this.refreshTripDerivedFields(tripId, null, null, null);

    return {
      tripId,
      insertedCount: result.rowCount ?? 0,
    };
  }

  async finishTrip(tripId: string, body: FinishTripBody) {
    await this.refreshTripDerivedFields(
      tripId,
      body.endedAt ?? null,
      body.endLocation?.latitude ?? null,
      body.endLocation?.longitude ?? null,
    );

    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          status,
          distance_m AS "distanceM",
          duration_seconds AS "durationSeconds",
          avg_speed_kmh AS "avgSpeedKmh",
          driver_assignment_status AS "driverAssignmentStatus"
        FROM trips
        WHERE id = $1
      `,
      [tripId],
    );

    const trip = result.rows[0];


    if (trip?.vehicleId) {
      await this.communityBenchmarks.refreshForVehicle(trip.vehicleId);
      await this.usageProfile.refreshForVehicle(trip.vehicleId);
    }

    if (trip?.id) {
      await this.routeFingerprints.refreshForTrip(trip.id);
    }

    if (trip?.vehicleId) {
      await this.monthlyReports.refreshForVehicleNow(trip.vehicleId);
      await this.annualReports.refreshForVehicleNow(trip.vehicleId);
    }

    let hasPendingQuestions = false;
    if (trip?.id) {
      const contextResult = await this.tripContext.generateQuestionsForTrip(trip.id);
      hasPendingQuestions = contextResult.hasPendingQuestions;

      const serviceDetection = await this.serviceVisit.detectServiceProximity(trip.id);
      if (serviceDetection.detected) {
        await this.db.query(
          `
            INSERT INTO trip_context_questions (trip_id, vehicle_id, question_type, metadata)
            VALUES ($1, $2, 'SERVICE_VISIT', $3::jsonb)
            ON CONFLICT (trip_id, question_type) DO NOTHING
          `,
          [
            trip.id,
            trip.vehicleId,
            JSON.stringify({ poiName: serviceDetection.poiName, poiId: serviceDetection.poiId }),
          ],
        );
        hasPendingQuestions = true;
      }
    }

    return { ...trip, hasPendingQuestions };
  }

  async listVehicleTrips(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          status,
          distance_m AS "distanceM",
          duration_seconds AS "durationSeconds",
          avg_speed_kmh AS "avgSpeedKmh",
          driver_assignment_status AS "driverAssignmentStatus"
        FROM trips
        WHERE vehicle_id = $1
        ORDER BY started_at DESC
        LIMIT 50
      `,
      [vehicleId],
    );

    return result.rows;
  }

  async getTripSummary(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          count(*)::int AS "tripCount",
          COALESCE(sum(distance_m), 0)::int AS "totalDistanceM",
          COALESCE(sum(duration_seconds), 0)::int AS "totalDurationSeconds",
          COALESCE(avg(avg_speed_kmh), 0)::numeric(7,2) AS "avgSpeedKmh",
          count(*) FILTER (WHERE driver_assignment_status = 'unknown')::int AS "unknownDriverTripCount"
        FROM trips
        WHERE vehicle_id = $1
      `,
      [vehicleId],
    );

    const summary = result.rows[0];

    return {
      vehicleId,
      tripCount: Number(summary.tripCount),
      totalDistanceM: Number(summary.totalDistanceM),
      totalDurationSeconds: Number(summary.totalDurationSeconds),
      avgSpeedKmh: Number(summary.avgSpeedKmh),
      unknownDriverTripCount: Number(summary.unknownDriverTripCount),
    };
  }

  async getRouteProgress(tripId: string) {
    const result = await this.db.query<TripRouteProgressRow>(
      `
        WITH latest_point AS (
          SELECT DISTINCT ON (trip_id)
            trip_id,
            location,
            recorded_at,
            speed_kmh
          FROM trip_points
          WHERE trip_id = $1
          ORDER BY trip_id, recorded_at DESC
        ), point_counts AS (
          SELECT trip_id, count(*)::int AS point_count
          FROM trip_points
          WHERE trip_id = $1
          GROUP BY trip_id
        )
        SELECT
          trips.id AS "tripId",
          trips.vehicle_id AS "vehicleId",
          trips.user_id AS "userId",
          trips.status,
          trip_route_intents.saved_route_id AS "savedRouteId",
          user_saved_routes.label AS "savedRouteLabel",
          COALESCE(
            trip_route_intents.destination_location_id,
            user_saved_routes.destination_location_id
          ) AS "destinationLocationId",
          destination.label AS "destinationLabel",
          destination.location_kind AS "destinationKind",
          ST_Y(destination.location::geometry)::text AS "destinationLatitude",
          ST_X(destination.location::geometry)::text AS "destinationLongitude",
          ST_Y(COALESCE(latest_point.location, trips.start_location)::geometry)::text AS "lastLatitude",
          ST_X(COALESCE(latest_point.location, trips.start_location)::geometry)::text AS "lastLongitude",
          latest_point.recorded_at AS "lastRecordedAt",
          latest_point.speed_kmh AS "lastSpeedKmh",
          CASE
            WHEN destination.location IS NULL OR COALESCE(latest_point.location, trips.start_location) IS NULL THEN NULL
            ELSE ST_Distance(COALESCE(latest_point.location, trips.start_location), destination.location)::text
          END AS "remainingMeters",
          COALESCE(point_counts.point_count, 0) AS "pointCount"
        FROM trips
        LEFT JOIN trip_route_intents ON trip_route_intents.trip_id = trips.id
        LEFT JOIN user_saved_routes ON user_saved_routes.id = trip_route_intents.saved_route_id
        LEFT JOIN user_saved_locations destination
          ON destination.id = COALESCE(
            trip_route_intents.destination_location_id,
            user_saved_routes.destination_location_id
          )
        LEFT JOIN latest_point ON latest_point.trip_id = trips.id
        LEFT JOIN point_counts ON point_counts.trip_id = trips.id
        WHERE trips.id = $1
        LIMIT 1
      `,
      [tripId],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const remainingMeters = toNumber(row.remainingMeters);
    const lastSpeedKmh = toNumber(row.lastSpeedKmh);

    return {
      tripId: row.tripId,
      vehicleId: row.vehicleId,
      userId: row.userId,
      status: row.status,
      savedRouteId: row.savedRouteId,
      savedRouteLabel: row.savedRouteLabel,
      destinationLocationId: row.destinationLocationId,
      destinationLabel: row.destinationLabel,
      destinationKind: row.destinationKind,
      destinationLatitude: toNumber(row.destinationLatitude),
      destinationLongitude: toNumber(row.destinationLongitude),
      lastLatitude: toNumber(row.lastLatitude),
      lastLongitude: toNumber(row.lastLongitude),
      lastRecordedAt: row.lastRecordedAt,
      lastSpeedKmh,
      pointCount: Number(row.pointCount ?? 0),
      remainingMeters,
      remainingKm: remainingMeters === null ? null : round(remainingMeters / 1000, 2),
      nearDestination: remainingMeters !== null && remainingMeters <= 250,
      stoppedNearDestination:
        remainingMeters !== null &&
        remainingMeters <= 250 &&
        (lastSpeedKmh === null || lastSpeedKmh < 2),
    };
  }

  private async refreshTripDerivedFields(
    tripId: string,
    endedAt: string | null,
    endLatitude: number | null,
    endLongitude: number | null,
  ) {
    await this.db.query(
      `
        WITH point_stats AS (
          SELECT
            trip_id,
            (array_agg(location ORDER BY recorded_at ASC))[1] AS first_location,
            (array_agg(location ORDER BY recorded_at DESC))[1] AS last_location,
            min(recorded_at) AS first_recorded_at,
            max(recorded_at) AS last_recorded_at,
            CASE
              WHEN count(*) > 1 THEN
                ST_Length(ST_MakeLine(location::geometry ORDER BY recorded_at)::geography)
              ELSE 0
            END AS distance_m
          FROM trip_points
          WHERE trip_id = $1
          GROUP BY trip_id
        )
        UPDATE trips
        SET
          start_location = COALESCE(trips.start_location, point_stats.first_location),
          end_location = CASE
            WHEN $3::numeric IS NOT NULL AND $4::numeric IS NOT NULL THEN
              ST_SetSRID(ST_MakePoint($4::numeric, $3::numeric), 4326)::geography
            ELSE point_stats.last_location
          END,
          ended_at = COALESCE($2::timestamptz, trips.ended_at, point_stats.last_recorded_at),
          status = CASE WHEN $2::timestamptz IS NULL THEN trips.status ELSE 'completed' END,
          distance_m = round(point_stats.distance_m)::int,
          duration_seconds = GREATEST(
            0,
            EXTRACT(EPOCH FROM (COALESCE($2::timestamptz, trips.ended_at, point_stats.last_recorded_at) - trips.started_at))::int
          ),
          avg_speed_kmh = CASE
            WHEN EXTRACT(EPOCH FROM (COALESCE($2::timestamptz, trips.ended_at, point_stats.last_recorded_at) - trips.started_at)) > 0 THEN
              round(((point_stats.distance_m / 1000.0) / (EXTRACT(EPOCH FROM (COALESCE($2::timestamptz, trips.ended_at, point_stats.last_recorded_at) - trips.started_at)) / 3600.0))::numeric, 2)
            ELSE NULL
          END,
          updated_at = now()
        FROM point_stats
        WHERE trips.id = point_stats.trip_id
      `,
      [tripId, endedAt, endLatitude, endLongitude],
    );
  }

  private async recordTripRouteIntent(tripId: string, vehicleId: string, body: CreateTripBody) {
    await this.db.query(
      `
        INSERT INTO trip_route_intents (
          trip_id,
          user_id,
          vehicle_id,
          saved_route_id,
          destination_location_id,
          source,
          confirmation_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'asked')
        ON CONFLICT (trip_id)
        DO UPDATE SET
          saved_route_id = EXCLUDED.saved_route_id,
          destination_location_id = EXCLUDED.destination_location_id,
          source = EXCLUDED.source
      `,
      [
        tripId,
        body.userId ?? null,
        vehicleId,
        body.plannedRouteId ?? null,
        body.destinationLocationId ?? null,
        body.source === 'mobile_auto_gps' ? 'auto_inferred' : 'manual_prompt',
      ],
    );

    if (body.plannedRouteId) {
      await this.db.query(
        `
          UPDATE user_saved_routes
          SET
            confirmation_count = confirmation_count + 1,
            confidence_score = LEAST(1, confidence_score + 0.08),
            last_confirmed_at = now(),
            updated_at = now()
          WHERE id = $1
        `,
        [body.plannedRouteId],
      );
    }
  }
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
