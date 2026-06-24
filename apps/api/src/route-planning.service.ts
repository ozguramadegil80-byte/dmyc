import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';

type CreateRoutePlanBody = {
  ownershipId?: string;
  userId?: string;
  savedName?: string;
  originLabel?: string;
  destinationLabel?: string;
  distanceKm?: number;
  passengerCount?: number;
  cargoLevel?: 'light' | 'normal' | 'heavy';
  weatherProfile?: 'normal' | 'cold' | 'hot' | 'rain';
  roadProfile?: 'city' | 'mixed' | 'highway';
  startSoc?: number;
  targetArrivalSoc?: number;
};

type RoutePlanContextRow = {
  vehicleId: string;
  vehicleSpecId: string;
  ownershipId: string | null;
  userId: string | null;
  displayName: string;
  batteryNetKwh: string | null;
  batteryGrossKwh: string | null;
  wltpRangeKm: number | null;
  officialEfficiencyWhKm: number | null;
  dcMaxKw: string | null;
  avgDailyKm: string | null;
  confidenceScore: string | null;
};

type RoutePlanRow = {
  id: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  originLabel: string;
  destinationLabel: string;
  savedName: string | null;
  requestedDistanceKm: string;
  estimatedDurationMinutes: number | null;
  confidenceScore: string;
  feasibilityStatus: string;
  requestedAt: string;
  createdAt: string;
  passengerCount: number | null;
  cargoLevel: string | null;
  weatherProfile: string | null;
  roadProfile: string | null;
  startSoc: number | null;
  targetArrivalSoc: number | null;
  estimatedConsumptionWhKm: string | null;
  estimatedEnergyKwh: string | null;
  usableEnergyKwh: string | null;
  energyMarginKwh: string | null;
  expectedRangeKm: string | null;
  strategyType: string | null;
  strategySummary: string | null;
  recommendedStartSoc: number | null;
  recommendedArrivalBufferSoc: number | null;
  chargeNeeded: boolean | null;
  estimatedChargeStops: number | null;
};

type ChargeStopRow = {
  sequence: number;
  reason: string;
  energyNeededKwh: string;
  estimatedDcMinutes: number | null;
};

@Injectable()
export class RoutePlanningService {
  constructor(private readonly db: DatabaseService) {}

  async createPlan(vehicleId: string, body: CreateRoutePlanBody) {
    const context = await this.getContext(vehicleId);
    const input = normalizeRoutePlanInput(body);
    const batteryKwh = resolveBatteryKwh(context);
    const baseConsumptionWhKm = resolveBaseConsumptionWhKm(context, batteryKwh);
    const multiplier = consumptionMultiplier(input);

    // Apply driver efficiency factor when user has enough analyzed trips.
    // Only applied to WLTP-based estimates — no double-penalty when real consumption is used.
    const driverFactor = body.userId ? await this.resolveDriverFactor(body.userId, vehicleId) : 1.0;
    const estimatedConsumptionWhKm = round((baseConsumptionWhKm * multiplier) / driverFactor, 2);
    const estimatedEnergyKwh = round((input.distanceKm * estimatedConsumptionWhKm) / 1000, 2);
    const usableEnergyKwh = round(batteryKwh * ((input.startSoc - input.targetArrivalSoc) / 100), 2);
    const energyMarginKwh = round(usableEnergyKwh - estimatedEnergyKwh, 2);
    const expectedRangeKm = round((usableEnergyKwh * 1000) / estimatedConsumptionWhKm, 2);
    const estimatedDurationMinutes = estimateDurationMinutes(input.distanceKm, input.roadProfile);
    const feasibilityStatus = feasibility(energyMarginKwh, estimatedEnergyKwh);
    const confidenceScore = confidence(context, input);
    const chargeShortfallKwh = Math.max(0, round(Math.abs(Math.min(0, energyMarginKwh)) + batteryKwh * 0.08, 2));
    const estimatedChargeStops = chargeShortfallKwh > 0 ? Math.max(1, Math.ceil(chargeShortfallKwh / Math.max(18, batteryKwh * 0.45))) : 0;
    const strategy = strategyFor(feasibilityStatus, input.startSoc, input.targetArrivalSoc, estimatedChargeStops);
    const dcMaxKw = toNumber(context.dcMaxKw);
    const estimatedDcMinutes = chargeShortfallKwh > 0 && dcMaxKw
      ? Math.max(8, Math.ceil((chargeShortfallKwh / Math.max(20, dcMaxKw * 0.62)) * 60))
      : null;

    const result = await this.db.query<{ id: string }>(
      `
        WITH inserted_plan AS (
          INSERT INTO route_plans (
            vehicle_id,
            ownership_id,
            user_id,
            origin_label,
            destination_label,
            saved_name,
            requested_distance_km,
            estimated_duration_minutes,
            confidence_score,
            feasibility_status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        ), inserted_scenario AS (
          INSERT INTO route_scenarios (
            route_plan_id,
            passenger_count,
            cargo_level,
            weather_profile,
            road_profile,
            start_soc,
            target_arrival_soc,
            estimated_consumption_wh_km,
            estimated_energy_kwh,
            usable_energy_kwh,
            energy_margin_kwh,
            expected_range_km
          )
          SELECT id, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          FROM inserted_plan
        ), inserted_strategy AS (
          INSERT INTO route_strategies (
            route_plan_id,
            strategy_type,
            summary,
            recommended_start_soc,
            recommended_arrival_buffer_soc,
            charge_needed,
            estimated_charge_stops
          )
          SELECT id, $22, $23, $24, $25, $26, $27
          FROM inserted_plan
        )
        SELECT id FROM inserted_plan
      `,
      [
        vehicleId,
        body.ownershipId ?? context.ownershipId,
        body.userId ?? context.userId,
        input.originLabel,
        input.destinationLabel,
        input.savedName,
        input.distanceKm,
        estimatedDurationMinutes,
        confidenceScore,
        feasibilityStatus,
        input.passengerCount,
        input.cargoLevel,
        input.weatherProfile,
        input.roadProfile,
        input.startSoc,
        input.targetArrivalSoc,
        estimatedConsumptionWhKm,
        estimatedEnergyKwh,
        usableEnergyKwh,
        energyMarginKwh,
        expectedRangeKm,
        strategy.type,
        strategy.summary,
        strategy.recommendedStartSoc,
        strategy.recommendedArrivalBufferSoc,
        strategy.chargeNeeded,
        estimatedChargeStops,
      ],
    );

    const planId = result.rows[0]?.id;

    if (!planId) {
      throw new BadRequestException('Route plan could not be created.');
    }

    if (chargeShortfallKwh > 0) {
      await this.db.query(
        `
          INSERT INTO route_charge_stop_candidates (
            route_plan_id,
            sequence,
            reason,
            energy_needed_kwh,
            estimated_dc_minutes
          )
          VALUES ($1, 1, $2, $3, $4)
        `,
        [planId, 'energy_shortfall_buffer', chargeShortfallKwh, estimatedDcMinutes],
      );
    }

    return this.getPlan(planId);
  }

  async getLatestPlan(vehicleId: string) {
    const result = await this.db.query<{ id: string }>(
      `
        SELECT id
        FROM route_plans
        WHERE vehicle_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [vehicleId],
    );

    return result.rows[0] ? this.getPlan(result.rows[0].id) : null;
  }

  private async resolveDriverFactor(userId: string, vehicleId: string): Promise<number> {
    const result = await this.db.query<{ factor: string; count: number }>(
      `SELECT driver_efficiency_factor AS factor, analyzed_trip_count AS count
       FROM driver_vehicle_profiles
       WHERE user_id = $1 AND vehicle_id = $2`,
      [userId, vehicleId],
    );
    const row = result.rows[0];
    if (!row || Number(row.count) < 3) return 1.0;
    return Math.min(1.0, Math.max(0.75, Number(row.factor)));
  }

  private async getContext(vehicleId: string) {
    const result = await this.db.query<RoutePlanContextRow>(
      `
        SELECT
          vehicles.id AS "vehicleId",
          vehicles.vehicle_spec_id AS "vehicleSpecId",
          vehicle_ownerships.id AS "ownershipId",
          vehicle_ownerships.user_id AS "userId",
          vehicles.display_name AS "displayName",
          vehicle_specs.battery_net_kwh AS "batteryNetKwh",
          vehicle_specs.battery_gross_kwh AS "batteryGrossKwh",
          vehicle_specs.wltp_range_km AS "wltpRangeKm",
          vehicle_specs.official_efficiency_wh_km AS "officialEfficiencyWhKm",
          vehicle_specs.dc_max_kw AS "dcMaxKw",
          usage_profiles.avg_daily_km AS "avgDailyKm",
          usage_profiles.confidence_score AS "confidenceScore"
        FROM vehicles
        JOIN vehicle_specs ON vehicle_specs.id = vehicles.vehicle_spec_id
        LEFT JOIN vehicle_ownerships
          ON vehicle_ownerships.vehicle_id = vehicles.id
          AND vehicle_ownerships.ownership_status = 'active'
        LEFT JOIN usage_profiles ON usage_profiles.vehicle_id = vehicles.id
        WHERE vehicles.id = $1
        ORDER BY vehicle_ownerships.started_at DESC NULLS LAST
        LIMIT 1
      `,
      [vehicleId],
    );

    const context = result.rows[0];

    if (!context) {
      throw new NotFoundException('Vehicle not found.');
    }

    return context;
  }

  private async getPlan(planId: string) {
    const result = await this.db.query<RoutePlanRow>(
      `
        SELECT
          route_plans.id,
          route_plans.vehicle_id AS "vehicleId",
          route_plans.ownership_id AS "ownershipId",
          route_plans.user_id AS "userId",
          route_plans.origin_label AS "originLabel",
          route_plans.destination_label AS "destinationLabel",
          route_plans.saved_name AS "savedName",
          route_plans.requested_distance_km AS "requestedDistanceKm",
          route_plans.estimated_duration_minutes AS "estimatedDurationMinutes",
          route_plans.confidence_score AS "confidenceScore",
          route_plans.feasibility_status AS "feasibilityStatus",
          route_plans.requested_at AS "requestedAt",
          route_plans.created_at AS "createdAt",
          route_scenarios.passenger_count AS "passengerCount",
          route_scenarios.cargo_level AS "cargoLevel",
          route_scenarios.weather_profile AS "weatherProfile",
          route_scenarios.road_profile AS "roadProfile",
          route_scenarios.start_soc AS "startSoc",
          route_scenarios.target_arrival_soc AS "targetArrivalSoc",
          route_scenarios.estimated_consumption_wh_km AS "estimatedConsumptionWhKm",
          route_scenarios.estimated_energy_kwh AS "estimatedEnergyKwh",
          route_scenarios.usable_energy_kwh AS "usableEnergyKwh",
          route_scenarios.energy_margin_kwh AS "energyMarginKwh",
          route_scenarios.expected_range_km AS "expectedRangeKm",
          route_strategies.strategy_type AS "strategyType",
          route_strategies.summary AS "strategySummary",
          route_strategies.recommended_start_soc AS "recommendedStartSoc",
          route_strategies.recommended_arrival_buffer_soc AS "recommendedArrivalBufferSoc",
          route_strategies.charge_needed AS "chargeNeeded",
          route_strategies.estimated_charge_stops AS "estimatedChargeStops"
        FROM route_plans
        LEFT JOIN route_scenarios ON route_scenarios.route_plan_id = route_plans.id
        LEFT JOIN route_strategies ON route_strategies.route_plan_id = route_plans.id
        WHERE route_plans.id = $1
        LIMIT 1
      `,
      [planId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException('Route plan not found.');
    }

    const stops = await this.db.query<ChargeStopRow>(
      `
        SELECT
          sequence,
          reason,
          energy_needed_kwh AS "energyNeededKwh",
          estimated_dc_minutes AS "estimatedDcMinutes"
        FROM route_charge_stop_candidates
        WHERE route_plan_id = $1
        ORDER BY sequence ASC
      `,
      [planId],
    );

    return {
      id: row.id,
      vehicleId: row.vehicleId,
      ownershipId: row.ownershipId,
      userId: row.userId,
      originLabel: row.originLabel,
      destinationLabel: row.destinationLabel,
      savedName: row.savedName,
      requestedDistanceKm: toNumber(row.requestedDistanceKm),
      estimatedDurationMinutes: row.estimatedDurationMinutes,
      confidenceScore: toNumber(row.confidenceScore),
      feasibilityStatus: row.feasibilityStatus,
      requestedAt: row.requestedAt,
      createdAt: row.createdAt,
      scenario: {
        passengerCount: row.passengerCount ?? 1,
        cargoLevel: row.cargoLevel ?? 'normal',
        weatherProfile: row.weatherProfile ?? 'normal',
        roadProfile: row.roadProfile ?? 'mixed',
        startSoc: row.startSoc ?? 80,
        targetArrivalSoc: row.targetArrivalSoc ?? 15,
        estimatedConsumptionWhKm: toNumber(row.estimatedConsumptionWhKm),
        estimatedEnergyKwh: toNumber(row.estimatedEnergyKwh),
        usableEnergyKwh: toNumber(row.usableEnergyKwh),
        energyMarginKwh: toNumber(row.energyMarginKwh),
        expectedRangeKm: toNumber(row.expectedRangeKm),
      },
      strategy: {
        type: row.strategyType ?? 'learning',
        summary: row.strategySummary ?? 'Plan öğrenme aşamasında.',
        recommendedStartSoc: row.recommendedStartSoc ?? 80,
        recommendedArrivalBufferSoc: row.recommendedArrivalBufferSoc ?? 15,
        chargeNeeded: Boolean(row.chargeNeeded),
        estimatedChargeStops: row.estimatedChargeStops ?? 0,
      },
      chargeStopCandidates: stops.rows.map((stop) => ({
        sequence: stop.sequence,
        reason: stop.reason,
        energyNeededKwh: toNumber(stop.energyNeededKwh),
        estimatedDcMinutes: stop.estimatedDcMinutes,
      })),
    };
  }
}

function normalizeRoutePlanInput(body: CreateRoutePlanBody) {
  const originLabel = body.originLabel?.trim() || 'Başlangıç';
  const destinationLabel = body.destinationLabel?.trim() || 'Varış';
  const savedName = normalizeSavedName(body.savedName);
  const distanceKm = Number(body.distanceKm);
  const passengerCount = clampInt(body.passengerCount ?? 1, 1, 7);
  const cargoLevel = normalizeOption(body.cargoLevel, ['light', 'normal', 'heavy'], 'normal');
  const weatherProfile = normalizeOption(body.weatherProfile, ['normal', 'cold', 'hot', 'rain'], 'normal');
  const roadProfile = normalizeOption(body.roadProfile, ['city', 'mixed', 'highway'], 'mixed');
  const startSoc = clampInt(body.startSoc ?? 80, 5, 100);
  const targetArrivalSoc = clampInt(body.targetArrivalSoc ?? 15, 5, 50);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 2000) {
    throw new BadRequestException('Distance must be between 1 and 2000 km.');
  }

  if (startSoc <= targetArrivalSoc) {
    throw new BadRequestException('Start SOC must be greater than target arrival SOC.');
  }

  return {
    originLabel,
    destinationLabel,
    savedName,
    distanceKm: round(distanceKm, 2),
    passengerCount,
    cargoLevel,
    weatherProfile,
    roadProfile,
    startSoc,
    targetArrivalSoc,
  };
}

function normalizeSavedName(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, 80) : null;
}

function resolveBatteryKwh(context: RoutePlanContextRow) {
  return toNumber(context.batteryNetKwh) ?? toNumber(context.batteryGrossKwh) ?? 60;
}

function resolveBaseConsumptionWhKm(context: RoutePlanContextRow, batteryKwh: number) {
  if (context.officialEfficiencyWhKm && context.officialEfficiencyWhKm > 0) {
    return context.officialEfficiencyWhKm;
  }

  if (context.wltpRangeKm && context.wltpRangeKm > 0) {
    return round((batteryKwh * 1000) / context.wltpRangeKm, 2);
  }

  return 175;
}

function consumptionMultiplier(input: ReturnType<typeof normalizeRoutePlanInput>) {
  const passengerMultiplier = 1 + Math.max(0, input.passengerCount - 1) * 0.025;
  const cargoMultiplier = input.cargoLevel === 'heavy' ? 1.08 : input.cargoLevel === 'light' ? 0.98 : 1;
  const weatherMultiplier = input.weatherProfile === 'cold' ? 1.16 : input.weatherProfile === 'hot' ? 1.07 : input.weatherProfile === 'rain' ? 1.08 : 1;
  const roadMultiplier = input.roadProfile === 'highway' ? 1.11 : input.roadProfile === 'city' ? 0.96 : 1.03;

  return passengerMultiplier * cargoMultiplier * weatherMultiplier * roadMultiplier;
}

function confidence(context: RoutePlanContextRow, input: ReturnType<typeof normalizeRoutePlanInput>) {
  const profileConfidence = toNumber(context.confidenceScore) ?? 0;
  const specConfidence = context.officialEfficiencyWhKm || context.wltpRangeKm ? 0.35 : 0.15;
  const scenarioConfidence = input.originLabel && input.destinationLabel && input.distanceKm > 0 ? 0.2 : 0.1;
  return round(Math.min(0.95, specConfidence + scenarioConfidence + profileConfidence * 0.35), 3);
}

function feasibility(energyMarginKwh: number, estimatedEnergyKwh: number) {
  if (energyMarginKwh >= Math.max(4, estimatedEnergyKwh * 0.12)) {
    return 'safe';
  }

  if (energyMarginKwh >= 0) {
    return 'tight';
  }

  return 'charge_required';
}

function strategyFor(status: string, startSoc: number, targetArrivalSoc: number, estimatedChargeStops: number) {
  if (status === 'safe') {
    return {
      type: 'go_with_buffer',
      summary: 'Bu rota mevcut senaryoda güvenli tamponla yapılabilir.',
      recommendedStartSoc: startSoc,
      recommendedArrivalBufferSoc: targetArrivalSoc,
      chargeNeeded: false,
    };
  }

  if (status === 'tight') {
    return {
      type: 'increase_start_soc',
      summary: 'Rota yapılabilir görünüyor ama tampon düşük. Başlangıç SOC değerini artırmak mantıklı.',
      recommendedStartSoc: Math.min(100, Math.max(startSoc, 90)),
      recommendedArrivalBufferSoc: Math.max(targetArrivalSoc, 18),
      chargeNeeded: false,
    };
  }

  return {
    type: 'plan_charge_stop',
    summary: 'Bu rota için şarj molası planlanmalı.',
    recommendedStartSoc: Math.min(100, Math.max(startSoc, 90)),
    recommendedArrivalBufferSoc: Math.max(targetArrivalSoc, 20),
    chargeNeeded: true,
  };
}

function estimateDurationMinutes(distanceKm: number, roadProfile: string) {
  const speed = roadProfile === 'highway' ? 88 : roadProfile === 'city' ? 32 : 62;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

function normalizeOption<T extends string>(value: string | undefined, allowed: T[], fallback: T) {
  return allowed.includes(value as T) ? value as T : fallback;
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

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
