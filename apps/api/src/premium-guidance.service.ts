import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PremiumAccessService } from './premium-access.service';
import { TripsService } from './trips.service';

type RoutePlanGuidanceRow = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  requestedDistanceKm: string;
  feasibilityStatus: string;
  confidenceScore: string;
  roadProfile: string | null;
  startSoc: number | null;
  targetArrivalSoc: number | null;
  estimatedEnergyKwh: string | null;
  usableEnergyKwh: string | null;
  energyMarginKwh: string | null;
  expectedRangeKm: string | null;
  strategyType: string | null;
  chargeNeeded: boolean | null;
  estimatedChargeStops: number | null;
  firstStopEnergyKwh: string | null;
  firstStopDcMinutes: number | null;
};

type GuidanceSessionRow = {
  id: string;
  vehicleId: string;
  routePlanId: string | null;
  tripId: string | null;
  ownershipId: string | null;
  userId: string | null;
  status: string;
  guidanceMode: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

type TripAdvisoryRow = {
  id: string;
  vehicleId: string;
  routePlanId: string | null;
  tripId: string | null;
  guidanceSessionId: string;
  advisoryType: string;
  severity: string;
  title: string;
  message: string;
  recommendedAction: string | null;
  speechText: string | null;
  triggerContext: Record<string, unknown>;
  priority: number;
  createdAt: string;
};

type AdvisoryDraft = {
  advisoryType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendedAction: string;
  speechText?: string;
  triggerContext: Record<string, unknown>;
  priority: number;
};

type MockGuidanceBody = {
  pointCount?: number;
  distanceKm?: number;
  source?: string;
};

type LiveTripProgress = NonNullable<Awaited<ReturnType<TripsService['getRouteProgress']>>>;

@Injectable()
export class PremiumGuidanceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly trips: TripsService,
  ) {}

  async createGuidance(routePlanId: string) {
    const plan = await this.getPlanContext(routePlanId);
    await this.assertPremiumAccess(plan.userId);
    const session = await this.createSession(plan);
    const drafts = buildAdvisories(plan);

    if (drafts.length === 0) {
      throw new BadRequestException('No advisories could be generated for this route plan.');
    }

    await this.insertAdvisories(plan.vehicleId, plan.id, session.id, drafts);

    return {
      session,
      advisories: await this.listSessionAdvisories(session.id),
    };
  }

  async createMockGuidance(routePlanId: string, body: MockGuidanceBody = {}) {
    const plan = await this.getPlanContext(routePlanId);
    await this.assertPremiumAccess(plan.userId);
    const session = await this.createSession(plan, {
      guidanceMode: 'mock_route_test',
      status: 'active_mock',
    });
    const drafts = buildMockAdvisories(plan, body);

    await this.insertAdvisories(plan.vehicleId, plan.id, session.id, drafts);
    await this.db.query(
      `
        UPDATE route_guidance_sessions
        SET status = 'completed_mock',
          ended_at = now()
        WHERE id = $1
      `,
      [session.id],
    );

    return {
      session: await this.getSession(session.id),
      advisories: await this.listSessionAdvisories(session.id),
    };
  }

  async getLatestVehicleAdvisories(vehicleId: string) {
    const result = await this.db.query<GuidanceSessionRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          status,
          guidance_mode AS "guidanceMode",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          created_at AS "createdAt"
        FROM route_guidance_sessions
        WHERE vehicle_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [vehicleId],
    );

    const session = result.rows[0] ?? null;

    return {
      session,
      advisories: session ? await this.listSessionAdvisories(session.id) : [],
    };
  }

  async createLiveTripGuidance(tripId: string) {
    const progress = await this.trips.getRouteProgress(tripId);

    if (!progress) {
      throw new NotFoundException('Trip not found.');
    }

    await this.assertPremiumAccess(progress.userId);

    const session = await this.getOrCreateLiveTripSession(progress);
    const drafts = buildLiveTripAdvisories(progress);

    await this.replaceLiveAdvisories(progress.vehicleId, tripId, session.id, drafts);

    return {
      session: await this.getSession(session.id),
      advisories: await this.listSessionAdvisories(session.id),
      progress,
    };
  }

  private async getPlanContext(routePlanId: string) {
    const result = await this.db.query<RoutePlanGuidanceRow>(
      `
        SELECT
          route_plans.id,
          route_plans.vehicle_id AS "vehicleId",
          route_plans.ownership_id AS "ownershipId",
          route_plans.user_id AS "userId",
          route_plans.requested_distance_km AS "requestedDistanceKm",
          route_plans.feasibility_status AS "feasibilityStatus",
          route_plans.confidence_score AS "confidenceScore",
          route_scenarios.road_profile AS "roadProfile",
          route_scenarios.start_soc AS "startSoc",
          route_scenarios.target_arrival_soc AS "targetArrivalSoc",
          route_scenarios.estimated_energy_kwh AS "estimatedEnergyKwh",
          route_scenarios.usable_energy_kwh AS "usableEnergyKwh",
          route_scenarios.energy_margin_kwh AS "energyMarginKwh",
          route_scenarios.expected_range_km AS "expectedRangeKm",
          route_strategies.strategy_type AS "strategyType",
          route_strategies.charge_needed AS "chargeNeeded",
          route_strategies.estimated_charge_stops AS "estimatedChargeStops",
          route_charge_stop_candidates.energy_needed_kwh AS "firstStopEnergyKwh",
          route_charge_stop_candidates.estimated_dc_minutes AS "firstStopDcMinutes"
        FROM route_plans
        LEFT JOIN route_scenarios ON route_scenarios.route_plan_id = route_plans.id
        LEFT JOIN route_strategies ON route_strategies.route_plan_id = route_plans.id
        LEFT JOIN route_charge_stop_candidates
          ON route_charge_stop_candidates.route_plan_id = route_plans.id
          AND route_charge_stop_candidates.sequence = 1
        WHERE route_plans.id = $1
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

  private async assertPremiumAccess(userId: string | null) {
    const access = await this.premiumAccess.getAccess(userId);

    if (!access.hasAccess) {
      throw new HttpException(
        {
          message: 'Premium guidance access is required.',
          error: 'PremiumAccessRequired',
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          premiumAccess: access,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return access;
  }

  private async createSession(
    plan: RoutePlanGuidanceRow,
    options: { guidanceMode?: string; status?: string } = {},
  ) {
    const result = await this.db.query<GuidanceSessionRow>(
      `
        INSERT INTO route_guidance_sessions (
          vehicle_id,
          route_plan_id,
          ownership_id,
          user_id,
          status,
          guidance_mode
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          status,
          guidance_mode AS "guidanceMode",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          created_at AS "createdAt"
      `,
      [
        plan.vehicleId,
        plan.id,
        plan.ownershipId,
        plan.userId,
        options.status ?? 'planned',
        options.guidanceMode ?? 'premium_foundation',
      ],
    );

    return result.rows[0];
  }

  private async getSession(sessionId: string) {
    const result = await this.db.query<GuidanceSessionRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          status,
          guidance_mode AS "guidanceMode",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          created_at AS "createdAt"
        FROM route_guidance_sessions
        WHERE id = $1
        LIMIT 1
      `,
      [sessionId],
    );

    return result.rows[0] ?? null;
  }

  private async getOrCreateLiveTripSession(progress: LiveTripProgress) {
    const existing = await this.db.query<GuidanceSessionRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          status,
          guidance_mode AS "guidanceMode",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          created_at AS "createdAt"
        FROM route_guidance_sessions
        WHERE trip_id = $1
          AND guidance_mode = 'live_route_progress'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [progress.tripId],
    );

    const nextStatus = progress.status === 'completed' ? 'completed_live' : 'active_live';

    if (existing.rows[0]) {
      await this.db.query(
        `
          UPDATE route_guidance_sessions
          SET status = $2,
            ended_at = CASE WHEN $2 = 'completed_live' THEN now() ELSE ended_at END
          WHERE id = $1
        `,
        [existing.rows[0].id, nextStatus],
      );

      return (await this.getSession(existing.rows[0].id)) as GuidanceSessionRow;
    }

    const result = await this.db.query<GuidanceSessionRow>(
      `
        INSERT INTO route_guidance_sessions (
          vehicle_id,
          route_plan_id,
          trip_id,
          ownership_id,
          user_id,
          status,
          guidance_mode
        )
        VALUES ($1, NULL, $2, NULL, $3, $4, 'live_route_progress')
        RETURNING
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          status,
          guidance_mode AS "guidanceMode",
          started_at AS "startedAt",
          ended_at AS "endedAt",
          created_at AS "createdAt"
      `,
      [progress.vehicleId, progress.tripId, progress.userId, nextStatus],
    );

    return result.rows[0];
  }

  private async insertAdvisories(
    vehicleId: string,
    routePlanId: string,
    sessionId: string,
    drafts: AdvisoryDraft[],
  ) {
    if (drafts.length === 0) {
      return;
    }

    await this.db.query(
      `
        INSERT INTO trip_advisories (
          vehicle_id,
          route_plan_id,
          guidance_session_id,
          advisory_type,
          severity,
          title,
          message,
          recommended_action,
          speech_text,
          trigger_context,
          priority
        )
        SELECT
          $1,
          $2,
          $3,
          item->>'advisoryType',
          item->>'severity',
          item->>'title',
          item->>'message',
          item->>'recommendedAction',
          COALESCE(item->>'speechText', concat_ws(' ', item->>'title', item->>'message', item->>'recommendedAction')),
          item->'triggerContext',
          (item->>'priority')::integer
        FROM jsonb_array_elements($4::jsonb) AS item
      `,
      [vehicleId, routePlanId, sessionId, JSON.stringify(drafts)],
    );
  }

  private async listSessionAdvisories(sessionId: string) {
    const result = await this.db.query<TripAdvisoryRow>(
      `
        SELECT
          id,
          vehicle_id AS "vehicleId",
          route_plan_id AS "routePlanId",
          trip_id AS "tripId",
          guidance_session_id AS "guidanceSessionId",
          advisory_type AS "advisoryType",
          severity,
          title,
          message,
          recommended_action AS "recommendedAction",
          speech_text AS "speechText",
          trigger_context AS "triggerContext",
          priority,
          created_at AS "createdAt"
        FROM trip_advisories
        WHERE guidance_session_id = $1
        ORDER BY priority ASC, created_at ASC
      `,
      [sessionId],
    );

    return result.rows;
  }

  private async replaceLiveAdvisories(
    vehicleId: string,
    tripId: string,
    sessionId: string,
    drafts: AdvisoryDraft[],
  ) {
    await this.db.query(
      `
        DELETE FROM trip_advisories
        WHERE guidance_session_id = $1
          AND advisory_type LIKE 'live_%'
      `,
      [sessionId],
    );

    if (drafts.length === 0) {
      return;
    }

    await this.db.query(
      `
        INSERT INTO trip_advisories (
          vehicle_id,
          route_plan_id,
          trip_id,
          guidance_session_id,
          advisory_type,
          severity,
          title,
          message,
          recommended_action,
          speech_text,
          trigger_context,
          priority
        )
        SELECT
          $1,
          NULL,
          $2,
          $3,
          item->>'advisoryType',
          item->>'severity',
          item->>'title',
          item->>'message',
          item->>'recommendedAction',
          COALESCE(item->>'speechText', concat_ws(' ', item->>'title', item->>'message', item->>'recommendedAction')),
          item->'triggerContext',
          (item->>'priority')::integer
        FROM jsonb_array_elements($4::jsonb) AS item
      `,
      [vehicleId, tripId, sessionId, JSON.stringify(drafts)],
    );
  }
}

function buildAdvisories(plan: RoutePlanGuidanceRow): AdvisoryDraft[] {
  const energyMarginKwh = toNumber(plan.energyMarginKwh);
  const requestedDistanceKm = toNumber(plan.requestedDistanceKm);
  const expectedRangeKm = toNumber(plan.expectedRangeKm);
  const estimatedChargeStops = plan.estimatedChargeStops ?? 0;
  const advisories: AdvisoryDraft[] = [];

  if (plan.chargeNeeded || plan.feasibilityStatus === 'charge_required') {
    advisories.push({
      advisoryType: 'charge_stop',
      severity: 'critical',
      title: 'Charge stop required',
      message: 'This plan needs a charging stop before arrival.',
      recommendedAction: 'Add the first charging stop before starting.',
      speechText: 'Charging stop required. Add the first charging stop before starting.',
      triggerContext: {
        estimatedChargeStops,
        firstStopDcMinutes: plan.firstStopDcMinutes,
        firstStopEnergyKwh: toNumber(plan.firstStopEnergyKwh),
      },
      priority: 10,
    });
  }

  if (energyMarginKwh !== null && energyMarginKwh < 0) {
    advisories.push({
      advisoryType: 'energy_buffer',
      severity: 'warning',
      title: 'Energy buffer is negative',
      message: 'The estimated route uses more energy than the selected SOC window.',
      recommendedAction: 'Raise start SOC or lower the target arrival risk.',
      speechText: 'Energy buffer is negative. Raise the starting charge or add a charging stop.',
      triggerContext: {
        energyMarginKwh,
        requestedDistanceKm,
        expectedRangeKm,
      },
      priority: 20,
    });
  } else if (energyMarginKwh !== null && energyMarginKwh <= 5) {
    advisories.push({
      advisoryType: 'arrival_buffer',
      severity: 'warning',
      title: 'Arrival buffer is tight',
      message: 'The plan is possible, but the arrival buffer is narrow.',
      recommendedAction: 'Keep a conservative speed profile and avoid extra detours.',
      speechText: 'Arrival buffer is tight. Keep a steady speed and avoid extra detours.',
      triggerContext: {
        energyMarginKwh,
        targetArrivalSoc: plan.targetArrivalSoc,
      },
      priority: 30,
    });
  }

  if (plan.roadProfile === 'highway') {
    advisories.push({
      advisoryType: 'speed',
      severity: 'info',
      title: 'Highway speed matters',
      message: 'Highway driving can move consumption faster than city scenarios.',
      recommendedAction: 'Use a stable speed and watch the live buffer.',
      speechText: 'Highway speed affects range. Keep speed stable and watch the live buffer.',
      triggerContext: {
        roadProfile: plan.roadProfile,
      },
      priority: 40,
    });
  }

  advisories.push({
    advisoryType: 'coach',
    severity: 'info',
    title: 'Energy coach ready',
    message: 'The energy coach can track this route against the planned buffer.',
    recommendedAction: 'Start with the suggested SOC and follow buffer alerts.',
    speechText: 'Energy coach is ready. Start with the suggested charge and follow buffer alerts.',
    triggerContext: {
      confidenceScore: toNumber(plan.confidenceScore),
      feasibilityStatus: plan.feasibilityStatus,
      strategyType: plan.strategyType,
    },
    priority: 50,
  });

  return advisories;
}

function buildMockAdvisories(plan: RoutePlanGuidanceRow, body: MockGuidanceBody): AdvisoryDraft[] {
  const requestedDistanceKm = toNumber(plan.requestedDistanceKm);
  const energyMarginKwh = toNumber(plan.energyMarginKwh);
  const pointCount = clampInt(body.pointCount ?? 0, 0, 200);
  const distanceKm = toNumber(body.distanceKm) ?? requestedDistanceKm;
  const advisories: AdvisoryDraft[] = [
    {
      advisoryType: 'mock_guidance_started',
      severity: 'info',
      title: 'Mock route guidance started',
      message: 'The simulated live route session started with mock GPS points.',
      recommendedAction: 'Use this to validate live guidance without moving.',
      speechText: 'Mock route guidance started. Simulated GPS points are now feeding the live coach.',
      triggerContext: {
        distanceKm,
        pointCount,
        source: body.source ?? 'mock_route_test_mode',
      },
      priority: 5,
    },
    {
      advisoryType: 'mock_route_progress',
      severity: 'info',
      title: 'Route progress simulated',
      message: 'Mock GPS points stayed on the planned route envelope.',
      recommendedAction: 'Keep observing buffer and charge-stop recommendations.',
      speechText: 'Route progress looks normal in the simulation. Keep watching the energy buffer.',
      triggerContext: {
        progressRatio: 0.62,
        requestedDistanceKm,
        routeStatus: 'on_route_mock',
      },
      priority: 15,
    },
  ];

  if (plan.chargeNeeded || plan.feasibilityStatus === 'charge_required') {
    advisories.push({
      advisoryType: 'mock_charge_stop_approaching',
      severity: 'warning',
      title: 'Charging stop approaching',
      message: 'The mock session reached the first charging decision window.',
      recommendedAction: 'Confirm the suggested charging stop before continuing.',
      speechText: 'Charging stop is approaching in the simulation. Confirm the suggested stop before continuing.',
      triggerContext: {
        firstStopDcMinutes: plan.firstStopDcMinutes,
        firstStopEnergyKwh: toNumber(plan.firstStopEnergyKwh),
      },
      priority: 25,
    });
  }

  if (energyMarginKwh !== null && energyMarginKwh <= 5) {
    advisories.push({
      advisoryType: 'mock_buffer_watch',
      severity: energyMarginKwh < 0 ? 'critical' : 'warning',
      title: 'Live buffer watch',
      message: 'The mock live buffer is narrow against the planned SOC window.',
      recommendedAction: 'Reduce speed or add a charging stop in the plan.',
      speechText: 'Live buffer is narrow. Reduce speed or add a charging stop to the plan.',
      triggerContext: {
        energyMarginKwh,
        targetArrivalSoc: plan.targetArrivalSoc,
      },
      priority: 35,
    });
  }

  advisories.push({
    advisoryType: 'mock_guidance_completed',
    severity: 'info',
    title: 'Mock route guidance completed',
    message: 'The simulated guidance session finished and saved its live advisories.',
    recommendedAction: 'Review the generated advisories on the range screen.',
    speechText: 'Mock route guidance completed. Review the generated live advisories on the range screen.',
    triggerContext: {
      guidanceMode: 'mock_route_test',
      completed: true,
    },
    priority: 90,
  });

  return advisories;
}

function buildLiveTripAdvisories(progress: LiveTripProgress): AdvisoryDraft[] {
  const destinationLabel = progress.destinationLabel ?? 'destination';
  const remainingKm = progress.remainingKm;

  if (!destinationLabel || progress.remainingMeters === null) {
    return [
      {
        advisoryType: 'live_route_learning',
        severity: 'info',
        title: 'Live route learning',
        message: 'This trip has no selected destination, but route learning is still active.',
        recommendedAction: 'Keep the trip recorder active so repeated behavior can be learned.',
        speechText: 'Route learning is active. Keep the trip recorder running.',
        triggerContext: {
          pointCount: progress.pointCount,
          tripId: progress.tripId,
        },
        priority: 20,
      },
    ];
  }

  if (progress.stoppedNearDestination) {
    return [
      {
        advisoryType: 'live_arrival_confirm',
        severity: 'info',
        title: 'Arrival confirmation',
        message: `The vehicle appears stopped near ${destinationLabel}.`,
        recommendedAction: 'Confirm whether this was the intended destination.',
        speechText: `You appear to have arrived near ${destinationLabel}. Please confirm the destination.`,
        triggerContext: {
          destinationLabel,
          remainingKm,
          remainingMeters: progress.remainingMeters,
          savedRouteLabel: progress.savedRouteLabel,
          speedKmh: progress.lastSpeedKmh,
        },
        priority: 10,
      },
    ];
  }

  if (progress.nearDestination) {
    return [
      {
        advisoryType: 'live_destination_near',
        severity: 'info',
        title: 'Destination nearby',
        message: `${destinationLabel} is nearby.`,
        recommendedAction: 'Prepare to finish the trip after parking.',
        speechText: `${destinationLabel} is nearby. Prepare to finish the trip after parking.`,
        triggerContext: {
          destinationLabel,
          remainingKm,
          savedRouteLabel: progress.savedRouteLabel,
        },
        priority: 15,
      },
    ];
  }

  return [
    {
      advisoryType: 'live_route_progress',
      severity: 'info',
      title: 'Live route progress',
      message: remainingKm === null
        ? `Tracking progress toward ${destinationLabel}.`
        : `${remainingKm} km remains to ${destinationLabel}.`,
      recommendedAction: 'Keep following the selected route and watch route/energy updates.',
      speechText: remainingKm === null
        ? `Tracking progress toward ${destinationLabel}.`
        : `${remainingKm} kilometers remain to ${destinationLabel}.`,
      triggerContext: {
        destinationLabel,
        pointCount: progress.pointCount,
        remainingKm,
        savedRouteLabel: progress.savedRouteLabel,
        speedKmh: progress.lastSpeedKmh,
      },
      priority: 20,
    },
  ];
}

function clampInt(value: number, min: number, max: number) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.max(min, Math.min(max, parsed));
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
