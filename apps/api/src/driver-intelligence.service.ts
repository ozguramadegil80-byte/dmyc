import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ElectricityTariffService } from './electricity-tariff.service';

// Eco-score at which behavior is considered "good but achievable" for the recovery target.
const ECO_SCORE_TARGET = 85;
// driver_efficiency_factor = min(1.0, max(0.75, 0.60 + score/250))
const ECO_FACTOR_TARGET = Math.min(1.0, Math.max(0.75, 0.60 + ECO_SCORE_TARGET / 250)); // 0.94
// Minimum SOC delta to consider a charge window reliable (avoids noise on tiny drives).
const MIN_SOC_DELTA_PCT = 3;

function ecoFactorFromScore(score: number): number {
  return Math.min(1.0, Math.max(0.75, 0.60 + score / 250));
}

function dominantIssue(
  hardBrake: number,
  rapidAccel: number,
): 'hard_brake' | 'rapid_accel' | 'mixed' | 'none' {
  if (hardBrake === 0 && rapidAccel === 0) return 'none';
  const ratio = hardBrake / (hardBrake + rapidAccel);
  if (ratio > 0.6) return 'hard_brake';
  if (ratio < 0.4) return 'rapid_accel';
  return 'mixed';
}

@Injectable()
export class DriverIntelligenceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly electricityTariff: ElectricityTariffService,
  ) {}

  // Called after every charge session is created. Attributes energy to trips in
  // the window between the previous charge and this one, then refreshes snapshots.
  async refreshForChargeSession(chargeSessionId: string): Promise<void> {
    const sessionResult = await this.db.query<{
      vehicleId: string;
      userId: string | null;
      startedAt: Date;
      startSoc: string | null;
    }>(
      `SELECT vehicle_id AS "vehicleId", user_id AS "userId",
              started_at AS "startedAt", start_soc AS "startSoc"
       FROM charge_sessions WHERE id = $1`,
      [chargeSessionId],
    );

    const session = sessionResult.rows[0];
    if (!session?.startSoc) return;

    const startSoc = Number(session.startSoc);
    if (!Number.isFinite(startSoc)) return;

    await this.attributeEnergyToTrips(
      chargeSessionId,
      session.vehicleId,
      session.startedAt,
      startSoc,
    );

    if (session.userId) {
      await this.refreshWeeklySnapshots(session.userId, session.vehicleId);
    }
  }

  private async attributeEnergyToTrips(
    chargeSessionId: string,
    vehicleId: string,
    chargeStartedAt: Date,
    currentStartSoc: number,
  ): Promise<void> {
    const specResult = await this.db.query<{ batteryNetKwh: string | null }>(
      `SELECT vs.battery_net_kwh AS "batteryNetKwh"
       FROM vehicles v
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       WHERE v.id = $1`,
      [vehicleId],
    );
    const batteryNetKwh = Number(specResult.rows[0]?.batteryNetKwh ?? 0);
    if (batteryNetKwh <= 0) return;

    // Previous charge session must have ended and its end_soc must be recorded.
    const prevResult = await this.db.query<{ endedAt: Date; endSoc: string }>(
      `SELECT ended_at AS "endedAt", end_soc AS "endSoc"
       FROM charge_sessions
       WHERE vehicle_id = $1
         AND id != $2
         AND ended_at IS NOT NULL
         AND end_soc IS NOT NULL
         AND ended_at < $3
       ORDER BY ended_at DESC
       LIMIT 1`,
      [vehicleId, chargeSessionId, chargeStartedAt.toISOString()],
    );

    const prev = prevResult.rows[0];
    if (!prev) return;

    const prevEndSoc = Number(prev.endSoc);
    const socDelta = prevEndSoc - currentStartSoc;
    if (socDelta < MIN_SOC_DELTA_PCT) return;

    const windowEnergyKwh = (socDelta / 100) * batteryNetKwh;

    const tripsResult = await this.db.query<{ id: string; distanceM: string }>(
      `SELECT id, distance_m AS "distanceM"
       FROM trips
       WHERE vehicle_id = $1
         AND status = 'completed'
         AND distance_m > 0
         AND started_at >= $2::timestamptz
         AND started_at < $3::timestamptz
       ORDER BY started_at ASC`,
      [vehicleId, prev.endedAt.toISOString(), chargeStartedAt.toISOString()],
    );

    const trips = tripsResult.rows;
    if (trips.length === 0) return;

    const totalDistanceM = trips.reduce((sum, t) => sum + Number(t.distanceM), 0);
    if (totalDistanceM <= 0) return;

    for (const trip of trips) {
      const distanceM = Number(trip.distanceM);
      const tripEnergyKwh = windowEnergyKwh * (distanceM / totalDistanceM);
      const distanceKm = distanceM / 1000;
      const actualWhPerKm =
        distanceKm > 0 ? Math.round(((tripEnergyKwh * 1000) / distanceKm) * 100) / 100 : null;

      await this.db.query(
        `UPDATE trips SET
           estimated_energy_kwh = $2,
           actual_wh_per_km     = $3,
           energy_source        = 'charge_window'
         WHERE id = $1`,
        [trip.id, Math.round(tripEnergyKwh * 1000) / 1000, actualWhPerKm],
      );
    }
  }

  // Upserts weekly snapshots for all recognized routes driven in the last 12 weeks.
  async refreshWeeklySnapshots(userId: string, vehicleId: string): Promise<void> {
    const specResult = await this.db.query<{
      officialEfficiencyWhKm: number | null;
    }>(
      `SELECT vs.official_efficiency_wh_km AS "officialEfficiencyWhKm"
       FROM vehicles v
       JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
       WHERE v.id = $1`,
      [vehicleId],
    );
    const wltpWhPerKm = Number(specResult.rows[0]?.officialEfficiencyWhKm ?? 0);
    if (wltpWhPerKm <= 0) return;

    const profileResult = await this.db.query<{
      ecoScoreAvg: string | null;
      driverEfficiencyFactor: string;
    }>(
      `SELECT eco_score_avg AS "ecoScoreAvg", driver_efficiency_factor AS "driverEfficiencyFactor"
       FROM driver_vehicle_profiles
       WHERE user_id = $1 AND vehicle_id = $2`,
      [userId, vehicleId],
    );
    const driverFactor = Number(profileResult.rows[0]?.driverEfficiencyFactor ?? 1.0);
    const globalEcoScore = profileResult.rows[0]?.ecoScoreAvg
      ? Number(profileResult.rows[0].ecoScoreAvg)
      : null;

    const tariff = await this.electricityTariff.getActiveTariff('residential', 'TR');
    const tlPerKwh = tariff?.tlPerKwh ?? null;

    const snapResult = await this.db.query<{
      routeFingerprintId: string;
      weekStart: string;
      tripCount: number;
      totalDistanceKm: string;
      chargeWindowEnergyKwh: string | null;
      hasChargeWindow: boolean;
      ecoScoreAvg: string | null;
      hardBrakeCount: number;
      rapidAccelCount: number;
    }>(
      `
      WITH trip_agg AS (
        SELECT
          t.user_id,
          t.vehicle_id,
          tra.route_fingerprint_id,
          date_trunc('week', t.started_at)::date AS week_start,
          count(t.id)::int AS trip_count,
          round(sum(t.distance_m) / 1000.0, 2) AS total_distance_km,
          sum(CASE WHEN t.energy_source = 'charge_window' THEN t.estimated_energy_kwh END) AS charge_window_energy_kwh,
          bool_or(t.energy_source = 'charge_window') AS has_charge_window,
          round(avg(t.behavior_eco_score)::numeric, 2) AS eco_score_avg
        FROM trips t
        JOIN trip_route_assignments tra ON tra.trip_id = t.id
        WHERE t.user_id = $1
          AND t.vehicle_id = $2
          AND t.status = 'completed'
          AND t.distance_m >= 500
          AND t.started_at >= date_trunc('week', (now() - interval '11 weeks')::date)
          AND tra.assignment_confidence >= 0.3
          AND tra.route_fingerprint_id IS NOT NULL
        GROUP BY t.user_id, t.vehicle_id, tra.route_fingerprint_id, week_start
      ),
      behavior_agg AS (
        SELECT
          tra.route_fingerprint_id,
          date_trunc('week', t.started_at)::date AS week_start,
          sum(CASE WHEN tbe.event_type = 'hard_brake' THEN 1 ELSE 0 END)::int AS hard_brake_count,
          sum(CASE WHEN tbe.event_type = 'rapid_accel' THEN 1 ELSE 0 END)::int AS rapid_accel_count
        FROM trips t
        JOIN trip_route_assignments tra ON tra.trip_id = t.id
        JOIN trip_behavior_events tbe ON tbe.trip_id = t.id
        WHERE t.user_id = $1
          AND t.vehicle_id = $2
          AND t.status = 'completed'
          AND t.started_at >= date_trunc('week', (now() - interval '11 weeks')::date)
          AND tra.assignment_confidence >= 0.3
          AND tra.route_fingerprint_id IS NOT NULL
        GROUP BY tra.route_fingerprint_id, week_start
      )
      SELECT
        ta.route_fingerprint_id AS "routeFingerprintId",
        ta.week_start           AS "weekStart",
        ta.trip_count           AS "tripCount",
        ta.total_distance_km    AS "totalDistanceKm",
        ta.charge_window_energy_kwh AS "chargeWindowEnergyKwh",
        ta.has_charge_window    AS "hasChargeWindow",
        ta.eco_score_avg        AS "ecoScoreAvg",
        COALESCE(ba.hard_brake_count, 0)  AS "hardBrakeCount",
        COALESCE(ba.rapid_accel_count, 0) AS "rapidAccelCount"
      FROM trip_agg ta
      LEFT JOIN behavior_agg ba
        ON ba.route_fingerprint_id = ta.route_fingerprint_id
       AND ba.week_start = ta.week_start
      ORDER BY ta.week_start DESC, ta.total_distance_km DESC
      `,
      [userId, vehicleId],
    );

    for (const row of snapResult.rows) {
      const totalDistanceKm = Number(row.totalDistanceKm);
      if (totalDistanceKm <= 0) continue;

      const weekEcoScore =
        row.ecoScoreAvg != null ? Number(row.ecoScoreAvg) : (globalEcoScore ?? 75);
      const ecoFactorCurrent = ecoFactorFromScore(weekEcoScore);

      let actualWhPerKm: number;
      let actualEnergyKwh: number;
      let energySource: 'charge_window' | 'wltp_estimate';

      if (row.hasChargeWindow && row.chargeWindowEnergyKwh != null) {
        actualEnergyKwh = Math.round(Number(row.chargeWindowEnergyKwh) * 1000) / 1000;
        actualWhPerKm =
          Math.round(((actualEnergyKwh * 1000) / totalDistanceKm) * 100) / 100;
        energySource = 'charge_window';
      } else {
        actualWhPerKm = Math.round((wltpWhPerKm / ecoFactorCurrent) * 100) / 100;
        actualEnergyKwh = Math.round(((actualWhPerKm * totalDistanceKm) / 1000) * 1000) / 1000;
        energySource = 'wltp_estimate';
      }

      // Fraction of energy attributable to behavior below the target score.
      const behaviorOverheadRatio = Math.max(0, 1 - ecoFactorCurrent / ECO_FACTOR_TARGET);
      const recoverableWhPerKm = actualWhPerKm * behaviorOverheadRatio;
      const recoverableEnergyKwh =
        Math.round(((recoverableWhPerKm * totalDistanceKm) / 1000) * 1000) / 1000;
      const recoverableRangeKm =
        Math.round(((recoverableEnergyKwh * 1000) / wltpWhPerKm) * 10) / 10;
      const recoverableCostTry =
        tlPerKwh != null
          ? Math.round(recoverableEnergyKwh * tlPerKwh * 100) / 100
          : null;

      const issue = dominantIssue(Number(row.hardBrakeCount), Number(row.rapidAccelCount));

      await this.db.query(
        `INSERT INTO weekly_route_driver_snapshots (
           user_id, vehicle_id, route_fingerprint_id, week_start,
           trip_count, total_distance_km, actual_energy_kwh, actual_wh_per_km,
           wltp_wh_per_km, eco_score_avg, driver_efficiency_factor,
           recoverable_energy_kwh, recoverable_range_km, recoverable_cost_try,
           electricity_rate_try_per_kwh, dominant_behavior_issue, energy_source
         ) VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (user_id, vehicle_id, route_fingerprint_id, week_start) DO UPDATE SET
           trip_count                   = EXCLUDED.trip_count,
           total_distance_km            = EXCLUDED.total_distance_km,
           actual_energy_kwh            = EXCLUDED.actual_energy_kwh,
           actual_wh_per_km             = EXCLUDED.actual_wh_per_km,
           wltp_wh_per_km               = EXCLUDED.wltp_wh_per_km,
           eco_score_avg                = EXCLUDED.eco_score_avg,
           driver_efficiency_factor     = EXCLUDED.driver_efficiency_factor,
           recoverable_energy_kwh       = EXCLUDED.recoverable_energy_kwh,
           recoverable_range_km         = EXCLUDED.recoverable_range_km,
           recoverable_cost_try         = EXCLUDED.recoverable_cost_try,
           electricity_rate_try_per_kwh = EXCLUDED.electricity_rate_try_per_kwh,
           dominant_behavior_issue      = EXCLUDED.dominant_behavior_issue,
           energy_source                = EXCLUDED.energy_source,
           updated_at                   = now()`,
        [
          userId, vehicleId, row.routeFingerprintId, row.weekStart,
          row.tripCount, totalDistanceKm, actualEnergyKwh, actualWhPerKm,
          wltpWhPerKm, weekEcoScore, driverFactor,
          recoverableEnergyKwh, recoverableRangeKm, recoverableCostTry,
          tlPerKwh, issue, energySource,
        ],
      );
    }
  }

  async getIntelligence(userId: string, vehicleId: string) {
    const profileResult = await this.db.query<{
      ecoScoreAvg: string | null;
      driverEfficiencyFactor: string;
      analyzedTripCount: number;
      last20TripScore: string | null;
      lastAnalyzedAt: Date | null;
    }>(
      `SELECT eco_score_avg AS "ecoScoreAvg",
              driver_efficiency_factor AS "driverEfficiencyFactor",
              analyzed_trip_count AS "analyzedTripCount",
              last_20_trip_score AS "last20TripScore",
              last_analyzed_at AS "lastAnalyzedAt"
       FROM driver_vehicle_profiles
       WHERE user_id = $1 AND vehicle_id = $2`,
      [userId, vehicleId],
    );

    const profile = profileResult.rows[0] ?? null;

    const snapshotsResult = await this.db.query<{
      routeFingerprintId: string;
      weekStart: string;
      tripCount: number;
      totalDistanceKm: string;
      actualEnergyKwh: string | null;
      actualWhPerKm: string | null;
      wltpWhPerKm: string;
      ecoScoreAvg: string | null;
      recoverableEnergyKwh: string | null;
      recoverableRangeKm: string | null;
      recoverableCostTry: string | null;
      electricityRateTryPerKwh: string | null;
      dominantBehaviorIssue: string | null;
      energySource: string;
    }>(
      `SELECT
         route_fingerprint_id         AS "routeFingerprintId",
         week_start                   AS "weekStart",
         trip_count                   AS "tripCount",
         total_distance_km            AS "totalDistanceKm",
         actual_energy_kwh            AS "actualEnergyKwh",
         actual_wh_per_km             AS "actualWhPerKm",
         wltp_wh_per_km               AS "wltpWhPerKm",
         eco_score_avg                AS "ecoScoreAvg",
         recoverable_energy_kwh       AS "recoverableEnergyKwh",
         recoverable_range_km         AS "recoverableRangeKm",
         recoverable_cost_try         AS "recoverableCostTry",
         electricity_rate_try_per_kwh AS "electricityRateTryPerKwh",
         dominant_behavior_issue      AS "dominantBehaviorIssue",
         energy_source                AS "energySource"
       FROM weekly_route_driver_snapshots
       WHERE user_id = $1 AND vehicle_id = $2
       ORDER BY week_start DESC, recoverable_energy_kwh DESC NULLS LAST
       LIMIT 40`,
      [userId, vehicleId],
    );

    return {
      userId,
      vehicleId,
      driverProfile: profile
        ? {
            ecoScoreAvg:
              profile.ecoScoreAvg != null ? Number(profile.ecoScoreAvg) : null,
            driverEfficiencyFactor: Number(profile.driverEfficiencyFactor),
            analyzedTripCount: Number(profile.analyzedTripCount),
            last20TripScore:
              profile.last20TripScore != null ? Number(profile.last20TripScore) : null,
            lastAnalyzedAt: profile.lastAnalyzedAt,
          }
        : null,
      weeklySnapshots: snapshotsResult.rows.map((r) => ({
        routeFingerprintId: r.routeFingerprintId,
        weekStart: r.weekStart,
        tripCount: Number(r.tripCount),
        totalDistanceKm: Number(r.totalDistanceKm),
        actualEnergyKwh: r.actualEnergyKwh != null ? Number(r.actualEnergyKwh) : null,
        actualWhPerKm: r.actualWhPerKm != null ? Number(r.actualWhPerKm) : null,
        wltpWhPerKm: Number(r.wltpWhPerKm),
        ecoScoreAvg: r.ecoScoreAvg != null ? Number(r.ecoScoreAvg) : null,
        recoverableEnergyKwh:
          r.recoverableEnergyKwh != null ? Number(r.recoverableEnergyKwh) : null,
        recoverableRangeKm:
          r.recoverableRangeKm != null ? Number(r.recoverableRangeKm) : null,
        recoverableCostTry:
          r.recoverableCostTry != null ? Number(r.recoverableCostTry) : null,
        electricityRateTryPerKwh:
          r.electricityRateTryPerKwh != null ? Number(r.electricityRateTryPerKwh) : null,
        dominantBehaviorIssue: r.dominantBehaviorIssue,
        energySource: r.energySource,
      })),
    };
  }
}
