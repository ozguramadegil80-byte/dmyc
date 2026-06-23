import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type CreateVisitBody = {
  ownershipId?: string | null;
  tripId?: string | null;
  servicePoiId?: string | null;
  visitDate?: string;
  visitType?: string;
  odometerKm?: number | null;
  serviceLocationName?: string | null;
  detectionMethod?: string;
  userConfirmed?: boolean;
  notes?: string | null;
  confidenceScore?: number;
};

@Injectable()
export class ServiceVisitService {
  constructor(private readonly db: DatabaseService) {}

  async detectServiceProximity(tripId: string): Promise<{
    detected: boolean;
    poiName?: string;
    poiId?: string;
  }> {
    const res = await this.db.query(
      `
        SELECT sp.id, sp.name
        FROM service_pois sp, trips t
        WHERE t.id = $1
          AND t.end_location IS NOT NULL
          AND COALESCE(t.duration_seconds, 0) >= 1800
          AND ST_DWithin(sp.location, t.end_location, 100)
        LIMIT 1
      `,
      [tripId],
    );

    if (!res.rows[0]) return { detected: false };
    return { detected: true, poiName: res.rows[0].name as string, poiId: res.rows[0].id as string };
  }

  async createVisit(vehicleId: string, body: CreateVisitBody, userId?: string | null) {
    const res = await this.db.query(
      `
        INSERT INTO service_visits (
          vehicle_id, ownership_id, user_id, trip_id, service_poi_id,
          visit_date, visit_type, odometer_km, service_location_name,
          detection_method, user_confirmed, notes, confidence_score
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10, $11, $12, $13)
        RETURNING
          id,
          vehicle_id        AS "vehicleId",
          ownership_id      AS "ownershipId",
          trip_id           AS "tripId",
          service_poi_id    AS "servicePoiId",
          visit_date        AS "visitDate",
          visit_type        AS "visitType",
          odometer_km       AS "odometerKm",
          service_location_name AS "serviceLocationName",
          detection_method  AS "detectionMethod",
          user_confirmed    AS "userConfirmed",
          notes,
          confidence_score  AS "confidenceScore",
          created_at        AS "createdAt"
      `,
      [
        vehicleId,
        body.ownershipId ?? null,
        userId ?? null,
        body.tripId ?? null,
        body.servicePoiId ?? null,
        body.visitDate ?? null,
        body.visitType ?? 'other',
        body.odometerKm ?? null,
        body.serviceLocationName ?? null,
        body.detectionMethod ?? 'manual',
        body.userConfirmed ?? false,
        body.notes ?? null,
        body.confidenceScore ?? 0,
      ],
    );

    return res.rows[0] ?? null;
  }

  async createVisitFromTripQuestion(tripId: string) {
    const tripRes = await this.db.query(
      `SELECT vehicle_id, ownership_id, user_id FROM trips WHERE id = $1`,
      [tripId],
    );
    if (!tripRes.rows[0]) return null;
    const { vehicle_id, ownership_id, user_id } = tripRes.rows[0] as {
      vehicle_id: string;
      ownership_id: string | null;
      user_id: string | null;
    };

    const qRes = await this.db.query(
      `SELECT metadata FROM trip_context_questions WHERE trip_id = $1 AND question_type = 'SERVICE_VISIT' LIMIT 1`,
      [tripId],
    );
    const meta = (qRes.rows[0]?.metadata ?? {}) as { poiName?: string; poiId?: string };

    return this.createVisit(
      vehicle_id,
      {
        ownershipId: ownership_id,
        tripId,
        servicePoiId: meta.poiId ?? null,
        visitType: 'periodic',
        detectionMethod: 'gps_proximity',
        userConfirmed: true,
        serviceLocationName: meta.poiName ?? null,
        confidenceScore: 0.7,
      },
      user_id,
    );
  }

  async listForVehicle(vehicleId: string) {
    const res = await this.db.query(
      `
        SELECT
          sv.id,
          sv.vehicle_id         AS "vehicleId",
          sv.ownership_id       AS "ownershipId",
          sv.trip_id            AS "tripId",
          sv.visit_date         AS "visitDate",
          sv.visit_type         AS "visitType",
          sv.odometer_km        AS "odometerKm",
          sv.service_location_name AS "serviceLocationName",
          sv.detection_method   AS "detectionMethod",
          sv.user_confirmed     AS "userConfirmed",
          sv.notes,
          sv.confidence_score   AS "confidenceScore",
          sv.created_at         AS "createdAt",
          COALESCE(
            json_agg(
              json_build_object(
                'id',              se.id,
                'evidenceType',    se.evidence_type,
                'storageUri',      se.storage_uri,
                'confidenceScore', se.confidence_score
              )
            ) FILTER (WHERE se.id IS NOT NULL),
            '[]'::json
          ) AS evidence
        FROM service_visits sv
        LEFT JOIN service_evidence se ON se.service_visit_id = sv.id
        WHERE sv.vehicle_id = $1
        GROUP BY sv.id
        ORDER BY sv.visit_date DESC
        LIMIT 50
      `,
      [vehicleId],
    );
    return res.rows;
  }

  async addEvidence(visitId: string, body: { evidenceType?: string; storageUri?: string; rawPayload?: object }) {
    const res = await this.db.query(
      `
        INSERT INTO service_evidence (service_visit_id, evidence_type, storage_uri, raw_payload)
        VALUES ($1, $2, $3, $4)
        RETURNING id, service_visit_id AS "serviceVisitId", evidence_type AS "evidenceType",
                  storage_uri AS "storageUri", created_at AS "createdAt"
      `,
      [
        visitId,
        body.evidenceType ?? 'user_confirm',
        body.storageUri ?? null,
        JSON.stringify(body.rawPayload ?? {}),
      ],
    );
    return res.rows[0] ?? null;
  }

  async calculateComplianceRate(vehicleId: string) {
    const res = await this.db.query(
      `
        WITH spec_info AS (
          SELECT COALESCE(vs.service_interval_km, 15000) AS interval_km
          FROM vehicle_ownerships vo
          JOIN vehicles v ON v.id = vo.vehicle_id
          JOIN vehicle_specs vs ON vs.canonical_vehicle_id = v.canonical_vehicle_id
          WHERE vo.vehicle_id = $1
            AND vo.ended_at IS NULL
          ORDER BY vo.started_at DESC
          LIMIT 1
        ),
        visits_ordered AS (
          SELECT
            odometer_km,
            LAG(odometer_km, 1, 0) OVER (ORDER BY visit_date) AS prev_odometer_km
          FROM service_visits
          WHERE vehicle_id = $1
            AND visit_type = 'periodic'
            AND odometer_km IS NOT NULL
            AND user_confirmed = true
          ORDER BY visit_date
        )
        SELECT
          COUNT(*)::int                                          AS total,
          SUM(CASE
            WHEN (odometer_km - prev_odometer_km) <=
                 (SELECT interval_km FROM spec_info) * 1.1
            THEN 1 ELSE 0
          END)::int                                             AS on_time,
          MAX(odometer_km)::int                                 AS last_odometer_km,
          COALESCE((SELECT interval_km FROM spec_info), 15000)::int AS interval_km
        FROM visits_ordered
      `,
      [vehicleId],
    );

    const row = res.rows[0];
    const total = Number(row?.total ?? 0);
    const onTime = Number(row?.on_time ?? 0);
    const lastOdometerKm = row?.last_odometer_km != null ? Number(row.last_odometer_km) : null;
    const intervalKm = Number(row?.interval_km ?? 15000);

    return {
      vehicleId,
      total,
      onTime,
      rate: total > 0 ? Math.round((onTime / total) * 100) : null,
      serviceIntervalKm: intervalKm,
      nextServiceKm: lastOdometerKm !== null ? lastOdometerKm + intervalKm : null,
    };
  }
}
