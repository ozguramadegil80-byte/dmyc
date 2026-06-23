import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';

type RouteGeometryPlanRow = {
  id: string;
  vehicleId: string;
  originLabel: string;
  destinationLabel: string;
  requestedDistanceKm: string;
  estimatedDurationMinutes: number | null;
  confidenceScore: string;
};

type CreateRouteGeometryBody = {
  provider?: string;
  distanceKm?: number;
  durationMinutes?: number;
  encodedPolyline?: string | null;
  bounds?: Record<string, unknown>;
  steps?: Array<Record<string, unknown>>;
};

type RouteGeometrySnapshotRow = {
  id: string;
  routePlanId: string;
  vehicleId: string;
  provider: string;
  providerRouteId: string | null;
  originLabel: string;
  destinationLabel: string;
  distanceKm: string;
  durationMinutes: number | null;
  encodedPolyline: string | null;
  bounds: Record<string, unknown>;
  steps: Array<Record<string, unknown>>;
  confidenceScore: string;
  createdAt: string;
};

@Injectable()
export class RouteGeometryService {
  constructor(private readonly db: DatabaseService) {}

  async createSnapshot(routePlanId: string, body: CreateRouteGeometryBody = {}) {
    const plan = await this.getPlan(routePlanId);
    const provider = body.provider === 'google_directions' ? 'google_directions' : 'manual_estimate';
    const confidenceScore = provider === 'manual_estimate'
      ? Math.min(0.45, Number(plan.confidenceScore) || 0.25)
      : 0.82;
    const distanceKm = body.distanceKm ?? toNumber(plan.requestedDistanceKm);
    const durationMinutes = body.durationMinutes ?? plan.estimatedDurationMinutes;
    const bounds = body.bounds ?? { source: provider, status: provider === 'google_directions' ? 'resolved' : 'geometry_not_resolved' };
    const steps = body.steps ?? [
      {
        distanceKm,
        durationMinutes,
        instructionCode: 'manual_route_estimate',
        sequence: 1,
      },
    ];

    const result = await this.db.query<{ id: string }>(
      `
        INSERT INTO route_geometry_snapshots (
          route_plan_id,
          vehicle_id,
          provider,
          provider_route_id,
          origin_label,
          destination_label,
          distance_km,
          duration_minutes,
          encoded_polyline,
          bounds,
          steps,
          confidence_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
      [
        plan.id,
        plan.vehicleId,
        provider,
        null,
        plan.originLabel,
        plan.destinationLabel,
        distanceKm,
        durationMinutes,
        body.encodedPolyline ?? null,
        JSON.stringify(bounds),
        JSON.stringify(steps),
        confidenceScore,
      ],
    );

    return this.getSnapshot(result.rows[0].id);
  }

  async getLatestSnapshot(routePlanId: string) {
    const result = await this.db.query<{ id: string }>(
      `
        SELECT id
        FROM route_geometry_snapshots
        WHERE route_plan_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [routePlanId],
    );

    return result.rows[0] ? this.getSnapshot(result.rows[0].id) : null;
  }

  private async getPlan(routePlanId: string) {
    const result = await this.db.query<RouteGeometryPlanRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          origin_label AS "originLabel",
          destination_label AS "destinationLabel",
          requested_distance_km AS "requestedDistanceKm",
          estimated_duration_minutes AS "estimatedDurationMinutes",
          confidence_score AS "confidenceScore"
        FROM route_plans
        WHERE id = $1
        LIMIT 1
      `,
      [routePlanId],
    );

    const plan = result.rows[0];

    if (!plan) {
      throw new NotFoundException('Route plan not found.');
    }

    return plan;
  }

  private async getSnapshot(snapshotId: string) {
    const result = await this.db.query<RouteGeometrySnapshotRow>(
      `
        SELECT
          id,
          route_plan_id AS "routePlanId",
          vehicle_id AS "vehicleId",
          provider,
          provider_route_id AS "providerRouteId",
          origin_label AS "originLabel",
          destination_label AS "destinationLabel",
          distance_km AS "distanceKm",
          duration_minutes AS "durationMinutes",
          encoded_polyline AS "encodedPolyline",
          bounds,
          steps,
          confidence_score AS "confidenceScore",
          created_at AS "createdAt"
        FROM route_geometry_snapshots
        WHERE id = $1
        LIMIT 1
      `,
      [snapshotId],
    );

    const snapshot = result.rows[0];

    return snapshot
      ? {
          ...snapshot,
          confidenceScore: toNumber(snapshot.confidenceScore),
          distanceKm: toNumber(snapshot.distanceKm),
        }
      : null;
  }
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
