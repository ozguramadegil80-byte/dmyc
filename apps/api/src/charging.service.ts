import { Injectable } from '@nestjs/common';
import { AnnualReportService } from './annual-report.service';
import { BatteryLifecycleService } from './battery-lifecycle.service';
import { DatabaseService } from './database.service';
import { MonthlyReportService } from './monthly-report.service';
import { UsageProfileService } from './usage-profile.service';

type GeoPoint = {
  latitude?: number;
  longitude?: number;
};

type CreateChargeSessionBody = {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  canonicalChargingLocationId?: string;
  startedAt?: string;
  endedAt?: string;
  location?: GeoPoint;
  chargeLocationType?: string;
  connectorType?: string;
  startSoc?: number;
  endSoc?: number;
  energyKwh?: number;
  costAmount?: number;
  currency?: string;
  source?: string;
  confidenceScore?: number;
};

type CreateChargeEvidenceBody = {
  chargeSessionId: string;
  evidenceType: string;
  storageUri?: string;
  rawPayload?: Record<string, unknown>;
  extractedPayload?: Record<string, unknown>;
  confidenceScore?: number;
};

type CreateChargingDecisionEventBody = {
  vehicleId: string;
  ownershipId?: string;
  userId?: string;
  chargeSessionId?: string;
  decisionAt?: string;
  decisionLocation?: GeoPoint;
  triggerType?: string;
  perceivedNeed?: string;
  startSoc?: number;
  targetSoc?: number;
  source?: string;
  confidenceScore?: number;
  payload?: Record<string, unknown>;
};

@Injectable()
export class ChargingService {
  constructor(
    private readonly annualReports: AnnualReportService,
    private readonly db: DatabaseService,
    private readonly batteryLifecycle: BatteryLifecycleService,
    private readonly monthlyReports: MonthlyReportService,
    private readonly usageProfile: UsageProfileService,
  ) {}

  async createChargeSession(body: CreateChargeSessionBody) {
    const result = await this.db.query(
      `
        INSERT INTO charge_sessions (
          vehicle_id,
          ownership_id,
          user_id,
          canonical_charging_location_id,
          started_at,
          ended_at,
          location,
          charge_location_type,
          connector_type,
          start_soc,
          end_soc,
          energy_kwh,
          cost_amount,
          currency,
          source,
          confidence_score,
          evidence_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5::timestamptz, now()),
          $6::timestamptz,
          CASE
            WHEN $7::numeric IS NULL OR $8::numeric IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($8::numeric, $7::numeric), 4326)::geography
          END,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          'none'
        )
        RETURNING id, vehicle_id AS "vehicleId", ownership_id AS "ownershipId", user_id AS "userId", started_at AS "startedAt", ended_at AS "endedAt", charge_location_type AS "chargeLocationType", connector_type AS "connectorType", start_soc AS "startSoc", end_soc AS "endSoc", energy_kwh AS "energyKwh", cost_amount AS "costAmount", currency, source, confidence_score AS "confidenceScore", evidence_status AS "evidenceStatus", created_at AS "createdAt"
      `,
      [
        body.vehicleId,
        body.ownershipId ?? null,
        body.userId ?? null,
        body.canonicalChargingLocationId ?? null,
        body.startedAt ?? null,
        body.endedAt ?? null,
        body.location?.latitude ?? null,
        body.location?.longitude ?? null,
        body.chargeLocationType ?? 'unknown',
        body.connectorType ?? null,
        body.startSoc ?? null,
        body.endSoc ?? null,
        body.energyKwh ?? null,
        body.costAmount ?? null,
        body.currency ?? 'TRY',
        body.source ?? 'mobile_estimated',
        body.confidenceScore ?? 0,
      ],
    );

    const chargeSession = result.rows[0];

    if (chargeSession?.id) {
      await this.batteryLifecycle.refreshForChargeSession(chargeSession.id);
    }

    if (chargeSession?.vehicleId) {
      await this.usageProfile.refreshForVehicle(chargeSession.vehicleId);
      await this.monthlyReports.refreshForVehicleNow(chargeSession.vehicleId);
      await this.annualReports.refreshForVehicleNow(chargeSession.vehicleId);
    }

    return chargeSession;
  }

  async createChargeEvidence(body: CreateChargeEvidenceBody) {
    const result = await this.db.query(
      `
        INSERT INTO charge_evidence (
          charge_session_id,
          evidence_type,
          storage_uri,
          raw_payload,
          extracted_payload,
          confidence_score
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
        RETURNING id, charge_session_id AS "chargeSessionId", evidence_type AS "evidenceType", storage_uri AS "storageUri", raw_payload AS "rawPayload", extracted_payload AS "extractedPayload", confidence_score AS "confidenceScore", created_at AS "createdAt"
      `,
      [
        body.chargeSessionId,
        body.evidenceType,
        body.storageUri ?? null,
        JSON.stringify(body.rawPayload ?? {}),
        JSON.stringify(body.extractedPayload ?? {}),
        body.confidenceScore ?? 0,
      ],
    );

    await this.db.query(
      `
        UPDATE charge_sessions
        SET evidence_status = 'has_evidence', updated_at = now()
        WHERE id = $1
      `,
      [body.chargeSessionId],
    );

    return result.rows[0];
  }

  async createChargingDecisionEvent(body: CreateChargingDecisionEventBody) {
    const result = await this.db.query(
      `
        INSERT INTO charging_decision_events (
          vehicle_id,
          ownership_id,
          user_id,
          charge_session_id,
          decision_at,
          decision_location,
          trigger_type,
          perceived_need,
          start_soc,
          target_soc,
          source,
          confidence_score,
          payload
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE($5::timestamptz, now()),
          CASE
            WHEN $6::numeric IS NULL OR $7::numeric IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($7::numeric, $6::numeric), 4326)::geography
          END,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb
        )
        RETURNING id, vehicle_id AS "vehicleId", ownership_id AS "ownershipId", user_id AS "userId", charge_session_id AS "chargeSessionId", decision_at AS "decisionAt", trigger_type AS "triggerType", perceived_need AS "perceivedNeed", start_soc AS "startSoc", target_soc AS "targetSoc", source, confidence_score AS "confidenceScore", payload, created_at AS "createdAt"
      `,
      [
        body.vehicleId,
        body.ownershipId ?? null,
        body.userId ?? null,
        body.chargeSessionId ?? null,
        body.decisionAt ?? null,
        body.decisionLocation?.latitude ?? null,
        body.decisionLocation?.longitude ?? null,
        body.triggerType ?? 'unknown',
        body.perceivedNeed ?? null,
        body.startSoc ?? null,
        body.targetSoc ?? null,
        body.source ?? 'mobile_estimated',
        body.confidenceScore ?? 0,
        JSON.stringify(body.payload ?? {}),
      ],
    );

    return result.rows[0];
  }

  async getChargeSummary(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          count(*)::int AS "chargeSessionCount",
          COALESCE(sum(energy_kwh), 0)::numeric(10,3) AS "totalEnergyKwh",
          COALESCE(sum(cost_amount), 0)::numeric(10,2) AS "totalCostAmount",
          COALESCE(avg(confidence_score), 0)::numeric(5,4) AS "avgConfidenceScore"
        FROM charge_sessions
        WHERE vehicle_id = $1
      `,
      [vehicleId],
    );

    const summary = result.rows[0];

    return {
      vehicleId,
      chargeSessionCount: Number(summary.chargeSessionCount),
      totalEnergyKwh: Number(summary.totalEnergyKwh),
      totalCostAmount: Number(summary.totalCostAmount),
      avgConfidenceScore: Number(summary.avgConfidenceScore),
      estimationContinuesWithoutManualData: Number(summary.chargeSessionCount) === 0,
    };
  }
}
