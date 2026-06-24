import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type TripPointRow = {
  recordedAt: Date;
  speedKmh: string | null;
  accuracyM: string | null;
  latitude: string;
  longitude: string;
};

type BehaviorEvent = {
  eventType: 'hard_brake' | 'rapid_accel';
  occurredAt: Date;
  latitude: number;
  longitude: number;
  speedKmhBefore: number;
  speedKmhAfter: number;
  deltaKmhPerSecond: number;
  severity: 'mild' | 'moderate' | 'severe';
};

const HARD_BRAKE_THRESHOLD_KMH = -20;
const RAPID_ACCEL_THRESHOLD_KMH = 20;
const MAX_WINDOW_SECONDS = 3;
const MAX_ACCURACY_M = 30;

function severity(absDeltaKmh: number): 'mild' | 'moderate' | 'severe' {
  if (absDeltaKmh > 45) return 'severe';
  if (absDeltaKmh > 30) return 'moderate';
  return 'mild';
}

function ecoScore(events: BehaviorEvent[]): number {
  const weights = {
    hard_brake: { mild: 5, moderate: 10, severe: 20 },
    rapid_accel: { mild: 3, moderate: 7, severe: 15 },
  };
  let score = 100;
  for (const e of events) score -= weights[e.eventType][e.severity];
  return Math.max(0, score);
}

@Injectable()
export class TripBehaviorService {
  constructor(private readonly db: DatabaseService) {}

  async analyzeTrip(tripId: string): Promise<{ ecoScore: number; eventCount: number }> {
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

    const points = pointsResult.rows;
    const events: BehaviorEvent[] = [];

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const prevSpeed = Number(prev.speedKmh);
      const currSpeed = Number(curr.speedKmh);

      if (!Number.isFinite(prevSpeed) || !Number.isFinite(currSpeed)) continue;

      const dtSeconds = (new Date(curr.recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 1000;
      if (dtSeconds <= 0 || dtSeconds > MAX_WINDOW_SECONDS) continue;

      const deltaKmh = currSpeed - prevSpeed;

      if (deltaKmh <= HARD_BRAKE_THRESHOLD_KMH) {
        events.push({
          eventType: 'hard_brake',
          occurredAt: new Date(curr.recordedAt),
          latitude: Number(curr.latitude),
          longitude: Number(curr.longitude),
          speedKmhBefore: prevSpeed,
          speedKmhAfter: currSpeed,
          deltaKmhPerSecond: deltaKmh / dtSeconds,
          severity: severity(Math.abs(deltaKmh)),
        });
      } else if (deltaKmh >= RAPID_ACCEL_THRESHOLD_KMH) {
        events.push({
          eventType: 'rapid_accel',
          occurredAt: new Date(curr.recordedAt),
          latitude: Number(curr.latitude),
          longitude: Number(curr.longitude),
          speedKmhBefore: prevSpeed,
          speedKmhAfter: currSpeed,
          deltaKmhPerSecond: deltaKmh / dtSeconds,
          severity: severity(Math.abs(deltaKmh)),
        });
      }
    }

    const assignmentResult = await this.db.query<{ fingerprintId: string }>(
      `SELECT route_fingerprint_id AS "fingerprintId" FROM trip_route_assignments WHERE trip_id = $1 LIMIT 1`,
      [tripId],
    );
    const fingerprintId = assignmentResult.rows[0]?.fingerprintId ?? null;

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
        `
          INSERT INTO trip_behavior_events (
            trip_id, route_fingerprint_id, event_type, occurred_at,
            location, speed_kmh_before, speed_kmh_after, delta_kmh_per_second, severity
          )
          VALUES ${placeholders.join(',')}
        `,
        values,
      );
    }

    const score = ecoScore(events);

    if (fingerprintId) {
      await this.db.query(
        `
          UPDATE route_fingerprints SET
            behavior_eco_score = CASE
              WHEN behavior_eco_score IS NULL THEN $2::numeric
              ELSE round(behavior_eco_score * 0.7 + $2::numeric * 0.3, 2)
            END,
            behavior_trip_count = behavior_trip_count + 1,
            updated_at = now()
          WHERE id = $1
        `,
        [fingerprintId, score],
      );
    }

    return { ecoScore: score, eventCount: events.length };
  }

  async getTripBehaviorSummary(tripId: string) {
    const result = await this.db.query<{ eventType: string; severity: string; count: string }>(
      `
        SELECT
          event_type AS "eventType",
          severity,
          count(*)::text AS count
        FROM trip_behavior_events
        WHERE trip_id = $1
        GROUP BY event_type, severity
        ORDER BY event_type, severity
      `,
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

    return {
      tripId,
      hardBrakeCount,
      rapidAccelCount,
      totalEventCount: hardBrakeCount + rapidAccelCount,
      breakdown,
    };
  }

  async getRouteBehaviorSummary(fingerprintId: string) {
    const fpResult = await this.db.query<{
      behaviorEcoScore: string | null;
      behaviorTripCount: number;
    }>(
      `
        SELECT
          behavior_eco_score AS "behaviorEcoScore",
          behavior_trip_count AS "behaviorTripCount"
        FROM route_fingerprints
        WHERE id = $1
      `,
      [fingerprintId],
    );

    const fp = fpResult.rows[0];
    const minTrips = 3;
    const hasEnoughData = fp && Number(fp.behaviorTripCount) >= minTrips;

    return {
      fingerprintId,
      behaviorEcoScore: hasEnoughData ? Number(fp.behaviorEcoScore) : null,
      behaviorTripCount: fp ? Number(fp.behaviorTripCount) : 0,
      hasEnoughData: !!hasEnoughData,
    };
  }
}
