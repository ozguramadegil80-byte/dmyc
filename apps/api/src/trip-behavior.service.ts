import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type TripPointRow = {
  recordedAt: Date;
  speedKmh: string | null;
  accuracyM: string | null;
  latitude: string;
  longitude: string;
};

type TripMetaRow = {
  distanceM: number | null;
  durationSeconds: number | null;
  userId: string | null;
  vehicleId: string;
};

type BehaviorEvent = {
  eventType: 'hard_brake' | 'rapid_accel';
  occurredAt: Date;
  latitude: number;
  longitude: number;
  speedKmhBefore: number;
  speedKmhAfter: number;
  deltaKmh: number;
  deltaKmhPerSecond: number;
  windowSec: number;
  severity: 'mild' | 'moderate' | 'severe';
};

const HARD_BRAKE_THRESHOLD_KMH = -20;
const RAPID_ACCEL_THRESHOLD_KMH = 20;
const MAX_WINDOW_SECONDS = 3;
const MAX_ACCURACY_M = 30;
const MIN_SPEED_FOR_EVENT_KMH = 10;
const EDGE_EXCLUSION_SECONDS = 10;
const EVENT_COOLDOWN_SECONDS = 5;
const MIN_ANALYSIS_DISTANCE_M = 500;
const MIN_ANALYSIS_DURATION_SEC = 120;
const MIN_POINT_COUNT_FOR_QUALITY = 15;

function classifySeverity(absDeltaKmh: number): 'mild' | 'moderate' | 'severe' {
  if (absDeltaKmh > 45) return 'severe';
  if (absDeltaKmh > 30) return 'moderate';
  return 'mild';
}

function computeEcoScore(events: BehaviorEvent[], distanceM: number): number {
  const distancePer10km = Math.max(1, distanceM / 10000);
  const weightedEvents = events.map((e) => ({
    ...e,
    normalizedWeight: 1 / distancePer10km,
  }));

  const deductions = {
    hard_brake: { mild: 5, moderate: 10, severe: 20 },
    rapid_accel: { mild: 3, moderate: 7, severe: 15 },
  };

  let score = 100;
  for (const e of weightedEvents) {
    score -= deductions[e.eventType][e.severity] * e.normalizedWeight;
  }
  return Math.max(0, Math.round(score * 100) / 100);
}

function computeAnalysisQuality(
  points: TripPointRow[],
  usablePoints: TripPointRow[],
  distanceM: number,
  durationSeconds: number,
): number {
  if (distanceM < MIN_ANALYSIS_DISTANCE_M || durationSeconds < MIN_ANALYSIS_DURATION_SEC) return 0;

  const coverageRatio = usablePoints.length / Math.max(1, points.length);
  const densityScore = Math.min(1, points.length / MIN_POINT_COUNT_FOR_QUALITY);

  return Math.round(coverageRatio * densityScore * 100) / 100;
}

@Injectable()
export class TripBehaviorService {
  constructor(private readonly db: DatabaseService) {}

  async analyzeTrip(
    tripId: string,
  ): Promise<{ ecoScore: number | null; eventCount: number; analysisQuality: number }> {
    const metaResult = await this.db.query<TripMetaRow>(
      `SELECT distance_m AS "distanceM", duration_seconds AS "durationSeconds",
              user_id AS "userId", vehicle_id AS "vehicleId"
       FROM trips WHERE id = $1`,
      [tripId],
    );
    const meta = metaResult.rows[0];

    const distanceM = meta?.distanceM ?? 0;
    const durationSeconds = meta?.durationSeconds ?? 0;

    if (distanceM < MIN_ANALYSIS_DISTANCE_M || durationSeconds < MIN_ANALYSIS_DURATION_SEC) {
      return { ecoScore: null, eventCount: 0, analysisQuality: 0 };
    }

    const pointsResult = await this.db.query<TripPointRow>(
      `
        SELECT
          recorded_at AS "recordedAt",
          speed_kmh AS "speedKmh",
          accuracy_m AS "accuracyM",
          ST_Y(location::geometry)::text AS latitude,
          ST_X(location::geometry)::text AS longitude
        FROM trip_points
        WHERE trip_id = $1
          AND speed_kmh IS NOT NULL
          AND COALESCE(accuracy_m, 100) <= $2
        ORDER BY recorded_at ASC
      `,
      [tripId, MAX_ACCURACY_M],
    );

    const allPoints = pointsResult.rows;

    if (allPoints.length < 3) {
      return { ecoScore: null, eventCount: 0, analysisQuality: 0 };
    }

    const firstTime = new Date(allPoints[0].recordedAt).getTime();
    const lastTime = new Date(allPoints[allPoints.length - 1].recordedAt).getTime();
    const edgeMs = EDGE_EXCLUSION_SECONDS * 1000;

    const points = allPoints.filter((p) => {
      const t = new Date(p.recordedAt).getTime();
      return t >= firstTime + edgeMs && t <= lastTime - edgeMs;
    });

    const events: BehaviorEvent[] = [];
    let lastEventTime = -Infinity;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const prevSpeed = Number(prev.speedKmh);
      const currSpeed = Number(curr.speedKmh);

      if (!Number.isFinite(prevSpeed) || !Number.isFinite(currSpeed)) continue;
      if (prevSpeed < MIN_SPEED_FOR_EVENT_KMH && currSpeed < MIN_SPEED_FOR_EVENT_KMH) continue;

      const prevTime = new Date(prev.recordedAt).getTime();
      const currTime = new Date(curr.recordedAt).getTime();
      const dtSeconds = (currTime - prevTime) / 1000;

      if (dtSeconds <= 0 || dtSeconds > MAX_WINDOW_SECONDS) continue;
      if ((currTime - lastEventTime) / 1000 < EVENT_COOLDOWN_SECONDS) continue;

      const deltaKmh = currSpeed - prevSpeed;

      if (deltaKmh <= HARD_BRAKE_THRESHOLD_KMH) {
        events.push({
          eventType: 'hard_brake',
          occurredAt: new Date(curr.recordedAt),
          latitude: Number(curr.latitude),
          longitude: Number(curr.longitude),
          speedKmhBefore: prevSpeed,
          speedKmhAfter: currSpeed,
          deltaKmh,
          deltaKmhPerSecond: deltaKmh / dtSeconds,
          windowSec: dtSeconds,
          severity: classifySeverity(Math.abs(deltaKmh)),
        });
        lastEventTime = currTime;
      } else if (deltaKmh >= RAPID_ACCEL_THRESHOLD_KMH) {
        events.push({
          eventType: 'rapid_accel',
          occurredAt: new Date(curr.recordedAt),
          latitude: Number(curr.latitude),
          longitude: Number(curr.longitude),
          speedKmhBefore: prevSpeed,
          speedKmhAfter: currSpeed,
          deltaKmh,
          deltaKmhPerSecond: deltaKmh / dtSeconds,
          windowSec: dtSeconds,
          severity: classifySeverity(Math.abs(deltaKmh)),
        });
        lastEventTime = currTime;
      }
    }

    const analysisQuality = computeAnalysisQuality(allPoints, points, distanceM, durationSeconds);
    const score = computeEcoScore(events, distanceM);

    const assignmentResult = await this.db.query<{
      fingerprintId: string;
      assignmentConfidence: string;
    }>(
      `SELECT route_fingerprint_id AS "fingerprintId", assignment_confidence AS "assignmentConfidence"
       FROM trip_route_assignments WHERE trip_id = $1 LIMIT 1`,
      [tripId],
    );
    const assignment = assignmentResult.rows[0] ?? null;
    const fingerprintId = assignment?.fingerprintId ?? null;

    if (events.length > 0) {
      const values: unknown[] = [];
      const placeholders = events.map((event, index) => {
        const o = index * 10;
        values.push(
          tripId,
          fingerprintId,
          event.eventType,
          event.occurredAt.toISOString(),
          event.latitude,
          event.longitude,
          event.speedKmhBefore,
          event.speedKmhAfter,
          event.deltaKmhPerSecond,
          event.severity,
        );
        return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}::timestamptz, ST_SetSRID(ST_MakePoint($${o + 6}::numeric, $${o + 5}::numeric), 4326)::geography, $${o + 7}, $${o + 8}, $${o + 9}, $${o + 10})`;
      });

      await this.db.query(
        `INSERT INTO trip_behavior_events (
           trip_id, route_fingerprint_id, event_type, occurred_at,
           location, speed_kmh_before, speed_kmh_after, delta_kmh_per_second, severity
         ) VALUES ${placeholders.join(',')}`,
        values,
      );
    }

    await this.db.query(
      `UPDATE trips SET
         behavior_analyzed_at = now(),
         behavior_analysis_quality = $2,
         behavior_eco_score = $3,
         behavior_event_count = $4
       WHERE id = $1`,
      [tripId, analysisQuality, score, events.length],
    );

    const routeConfidence = assignment ? Number(assignment.assignmentConfidence) : 0;
    const qualityGoodEnough = analysisQuality >= 0.7 && routeConfidence >= 0.75;

    if (fingerprintId && qualityGoodEnough) {
      await this.db.query(
        `UPDATE route_fingerprints SET
           behavior_eco_score = CASE
             WHEN behavior_eco_score IS NULL THEN $2::numeric
             ELSE round(behavior_eco_score * 0.7 + $2::numeric * 0.3, 2)
           END,
           behavior_trip_count = behavior_trip_count + 1,
           updated_at = now()
         WHERE id = $1`,
        [fingerprintId, score],
      );

      if (meta?.userId && meta?.vehicleId) {
        await this.updateDriverVehicleProfile(meta.userId, meta.vehicleId, score);
      }
    }

    return { ecoScore: score, eventCount: events.length, analysisQuality };
  }

  private async updateDriverVehicleProfile(userId: string, vehicleId: string, tripScore: number) {
    const factor = Math.min(1.0, Math.max(0.75, 0.60 + tripScore / 250));

    await this.db.query(
      `
        INSERT INTO driver_vehicle_profiles (user_id, vehicle_id, eco_score_avg, driver_efficiency_factor, analyzed_trip_count, last_analyzed_at)
        VALUES ($1, $2, $3, $4, 1, now())
        ON CONFLICT (user_id, vehicle_id) DO UPDATE SET
          eco_score_avg = round(
            COALESCE(driver_vehicle_profiles.eco_score_avg, $3::numeric) * 0.7 + $3::numeric * 0.3,
            2
          ),
          driver_efficiency_factor = $4,
          analyzed_trip_count = driver_vehicle_profiles.analyzed_trip_count + 1,
          last_analyzed_at = now(),
          updated_at = now()
      `,
      [userId, vehicleId, tripScore, factor],
    );
  }

  async getDriverProfile(userId: string, vehicleId: string) {
    const result = await this.db.query<{
      ecoScoreAvg: string | null;
      driverEfficiencyFactor: string;
      analyzedTripCount: number;
      lastAnalyzedAt: Date | null;
    }>(
      `SELECT
         eco_score_avg AS "ecoScoreAvg",
         driver_efficiency_factor AS "driverEfficiencyFactor",
         analyzed_trip_count AS "analyzedTripCount",
         last_analyzed_at AS "lastAnalyzedAt"
       FROM driver_vehicle_profiles
       WHERE user_id = $1 AND vehicle_id = $2`,
      [userId, vehicleId],
    );

    const row = result.rows[0];
    const analyzedTripCount = row ? Number(row.analyzedTripCount) : 0;
    const hasEnoughData = analyzedTripCount >= 3;

    return {
      userId,
      vehicleId,
      ecoScoreAvg: hasEnoughData && row?.ecoScoreAvg != null ? Number(row.ecoScoreAvg) : null,
      driverEfficiencyFactor: row ? Number(row.driverEfficiencyFactor) : 1.0,
      analyzedTripCount,
      hasEnoughData,
      lastAnalyzedAt: row?.lastAnalyzedAt ?? null,
    };
  }

  async getTripBehaviorSummary(tripId: string) {
    const result = await this.db.query<{ eventType: string; severity: string; count: string }>(
      `SELECT event_type AS "eventType", severity, count(*)::text AS count
       FROM trip_behavior_events
       WHERE trip_id = $1
       GROUP BY event_type, severity
       ORDER BY event_type, severity`,
      [tripId],
    );

    let hardBrakeCount = 0;
    let rapidAccelCount = 0;
    const breakdown: Record<string, number> = {};

    for (const row of result.rows) {
      const n = Number(row.count);
      breakdown[`${row.eventType}_${row.severity}`] = n;
      if (row.eventType === 'hard_brake') hardBrakeCount += n;
      else if (row.eventType === 'rapid_accel') rapidAccelCount += n;
    }

    const tripMeta = await this.db.query<{
      ecoScore: string | null;
      analysisQuality: string | null;
      distanceM: number | null;
    }>(
      `SELECT behavior_eco_score AS "ecoScore", behavior_analysis_quality AS "analysisQuality",
              distance_m AS "distanceM"
       FROM trips WHERE id = $1`,
      [tripId],
    );

    const t = tripMeta.rows[0];
    const distanceM = t?.distanceM ?? 0;

    return {
      tripId,
      hardBrakeCount,
      rapidAccelCount,
      totalEventCount: hardBrakeCount + rapidAccelCount,
      hardBrakePer10km: distanceM > 0 ? Math.round((hardBrakeCount / distanceM) * 10000 * 10) / 10 : null,
      rapidAccelPer10km: distanceM > 0 ? Math.round((rapidAccelCount / distanceM) * 10000 * 10) / 10 : null,
      ecoScore: t?.ecoScore != null ? Number(t.ecoScore) : null,
      analysisQuality: t?.analysisQuality != null ? Number(t.analysisQuality) : null,
      breakdown,
    };
  }

  async getRouteBehaviorSummary(fingerprintId: string) {
    const fpResult = await this.db.query<{
      behaviorEcoScore: string | null;
      behaviorTripCount: number;
    }>(
      `SELECT behavior_eco_score AS "behaviorEcoScore", behavior_trip_count AS "behaviorTripCount"
       FROM route_fingerprints WHERE id = $1`,
      [fingerprintId],
    );

    const fp = fpResult.rows[0];
    const hasEnoughData = fp && Number(fp.behaviorTripCount) >= 3;

    return {
      fingerprintId,
      behaviorEcoScore: hasEnoughData ? Number(fp.behaviorEcoScore) : null,
      behaviorTripCount: fp ? Number(fp.behaviorTripCount) : 0,
      hasEnoughData: !!hasEnoughData,
    };
  }
}
