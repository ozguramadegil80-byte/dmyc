import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type CreateSnapshotBody = {
  vehicleId: string;
  ownershipId?: string | null;
  reason?: string;
  snapshotDate?: string;
};

type CreateDriverBody = {
  userId?: string | null;
  driverLabel?: string;
  activeSince?: string;
};

type CreateTransferBody = {
  fromOwnershipId?: string | null;
  toUserId?: string | null;
  dataShareConsent?: boolean;
};

@Injectable()
export class VehicleRegistryService {
  constructor(private readonly db: DatabaseService) {}

  async createStateSnapshot(body: CreateSnapshotBody) {
    const result = await this.db.query(
      `
        WITH agg AS (
          SELECT
            count(t.id)::int                          AS trip_count,
            COALESCE(sum(t.distance_m), 0)::int       AS total_distance_m,
            COALESCE(sum(cs.energy_kwh), 0)::numeric  AS total_energy_kwh,
            COALESCE(bls.battery_usage_grade, 'unknown') AS battery_usage_grade,
            COALESCE(bls.total_efc, 0)::numeric       AS total_efc,
            COALESCE(bls.confidence_score, 0)::numeric AS confidence_score
          FROM vehicles v
          LEFT JOIN trips t
            ON t.vehicle_id = v.id AND t.status = 'completed'
          LEFT JOIN charge_sessions cs
            ON cs.vehicle_id = v.id
          LEFT JOIN vehicle_battery_lifecycle_stats bls
            ON bls.vehicle_id = v.id
          WHERE v.id = $1
          GROUP BY bls.battery_usage_grade, bls.total_efc, bls.confidence_score
        )
        INSERT INTO vehicle_state_snapshots (
          vehicle_id, ownership_id, snapshot_reason, snapshot_date,
          trip_count, total_distance_m, total_energy_kwh,
          battery_usage_grade, total_efc, confidence_score
        )
        SELECT
          $1, $2, $3, COALESCE($4::date, CURRENT_DATE),
          COALESCE(agg.trip_count, 0),
          COALESCE(agg.total_distance_m, 0),
          agg.total_energy_kwh,
          COALESCE(agg.battery_usage_grade, 'unknown'),
          COALESCE(agg.total_efc, 0),
          COALESCE(agg.confidence_score, 0)
        FROM (SELECT 1) dummy
        LEFT JOIN agg ON true
        RETURNING
          id,
          vehicle_id        AS "vehicleId",
          ownership_id      AS "ownershipId",
          snapshot_reason   AS "snapshotReason",
          snapshot_date     AS "snapshotDate",
          trip_count        AS "tripCount",
          total_distance_m  AS "totalDistanceM",
          total_energy_kwh  AS "totalEnergyKwh",
          battery_usage_grade AS "batteryUsageGrade",
          total_efc         AS "totalEfc",
          confidence_score  AS "confidenceScore",
          created_at        AS "createdAt"
      `,
      [
        body.vehicleId,
        body.ownershipId ?? null,
        body.reason ?? 'manual',
        body.snapshotDate ?? null,
      ],
    );

    return result.rows[0];
  }

  async listStateSnapshots(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id        AS "vehicleId",
          ownership_id      AS "ownershipId",
          snapshot_reason   AS "snapshotReason",
          snapshot_date     AS "snapshotDate",
          trip_count        AS "tripCount",
          total_distance_m  AS "totalDistanceM",
          total_energy_kwh  AS "totalEnergyKwh",
          battery_usage_grade AS "batteryUsageGrade",
          total_efc         AS "totalEfc",
          confidence_score  AS "confidenceScore",
          created_at        AS "createdAt"
        FROM vehicle_state_snapshots
        WHERE vehicle_id = $1
        ORDER BY snapshot_date DESC
        LIMIT 20
      `,
      [vehicleId],
    );
    return result.rows;
  }

  async getRegistrySummary(vehicleId: string) {
    const [ownershipsRes, snapshotsRes, driversRes, transfersRes] = await Promise.all([
      this.db.query(
        `
          SELECT
            id,
            user_id         AS "userId",
            started_at      AS "startedAt",
            ended_at        AS "endedAt",
            ownership_status AS "ownershipStatus"
          FROM vehicle_ownerships
          WHERE vehicle_id = $1
          ORDER BY started_at DESC
        `,
        [vehicleId],
      ),
      this.db.query(
        `
          SELECT
            id,
            snapshot_reason   AS "snapshotReason",
            snapshot_date     AS "snapshotDate",
            trip_count        AS "tripCount",
            total_distance_m  AS "totalDistanceM",
            battery_usage_grade AS "batteryUsageGrade",
            total_efc         AS "totalEfc",
            confidence_score  AS "confidenceScore"
          FROM vehicle_state_snapshots
          WHERE vehicle_id = $1
          ORDER BY snapshot_date DESC
          LIMIT 10
        `,
        [vehicleId],
      ),
      this.db.query(
        `
          SELECT
            id,
            user_id       AS "userId",
            driver_label  AS "driverLabel",
            active_since  AS "activeSince",
            active_until  AS "activeUntil"
          FROM vehicle_drivers
          WHERE vehicle_id = $1
          ORDER BY active_since DESC
        `,
        [vehicleId],
      ),
      this.db.query(
        `
          SELECT
            id,
            status,
            data_share_consent  AS "dataShareConsent",
            requested_at        AS "requestedAt",
            resolved_at         AS "resolvedAt"
          FROM transfer_requests
          WHERE vehicle_id = $1
          ORDER BY requested_at DESC
          LIMIT 5
        `,
        [vehicleId],
      ),
    ]);

    return {
      vehicleId,
      ownerships: ownershipsRes.rows,
      snapshots: snapshotsRes.rows,
      drivers: driversRes.rows,
      recentTransfers: transfersRes.rows,
    };
  }

  async addDriver(vehicleId: string, body: CreateDriverBody) {
    const result = await this.db.query(
      `
        INSERT INTO vehicle_drivers (vehicle_id, user_id, driver_label, active_since)
        VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE))
        RETURNING
          id,
          vehicle_id    AS "vehicleId",
          user_id       AS "userId",
          driver_label  AS "driverLabel",
          active_since  AS "activeSince",
          active_until  AS "activeUntil",
          created_at    AS "createdAt"
      `,
      [
        vehicleId,
        body.userId ?? null,
        body.driverLabel ?? 'primary',
        body.activeSince ?? null,
      ],
    );
    return result.rows[0];
  }

  async listDrivers(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id    AS "vehicleId",
          user_id       AS "userId",
          driver_label  AS "driverLabel",
          active_since  AS "activeSince",
          active_until  AS "activeUntil",
          created_at    AS "createdAt"
        FROM vehicle_drivers
        WHERE vehicle_id = $1
        ORDER BY active_since DESC
      `,
      [vehicleId],
    );
    return result.rows;
  }

  async createTransferRequest(vehicleId: string, body: CreateTransferBody) {
    const result = await this.db.query(
      `
        INSERT INTO transfer_requests (
          vehicle_id, from_ownership_id, to_user_id, data_share_consent
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          vehicle_id          AS "vehicleId",
          from_ownership_id   AS "fromOwnershipId",
          to_user_id          AS "toUserId",
          status,
          data_share_consent  AS "dataShareConsent",
          requested_at        AS "requestedAt",
          created_at          AS "createdAt"
      `,
      [
        vehicleId,
        body.fromOwnershipId ?? null,
        body.toUserId ?? null,
        body.dataShareConsent ?? false,
      ],
    );
    return result.rows[0];
  }

  async listTransferRequests(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id          AS "vehicleId",
          from_ownership_id   AS "fromOwnershipId",
          to_user_id          AS "toUserId",
          status,
          data_share_consent  AS "dataShareConsent",
          requested_at        AS "requestedAt",
          resolved_at         AS "resolvedAt",
          created_at          AS "createdAt"
        FROM transfer_requests
        WHERE vehicle_id = $1
        ORDER BY requested_at DESC
      `,
      [vehicleId],
    );
    return result.rows;
  }

  async resolveTransferRequest(transferId: string, status: 'accepted' | 'cancelled') {
    const result = await this.db.query(
      `
        UPDATE transfer_requests
        SET
          status       = $2,
          resolved_at  = now(),
          updated_at   = now()
        WHERE id = $1
        RETURNING
          id,
          vehicle_id  AS "vehicleId",
          status,
          resolved_at AS "resolvedAt"
      `,
      [transferId, status],
    );
    return result.rows[0];
  }

  async generatePublicReport(vehicleId: string) {
    // Doğrulama seviyesini deterministik hesapla
    const checkRes = await this.db.query(
      `
        SELECT
          (SELECT count(*) FROM trips WHERE vehicle_id = $1 AND status = 'completed')::int AS trip_count,
          (SELECT count(*) FROM charge_sessions WHERE vehicle_id = $1)::int AS charge_count,
          (SELECT count(*) FROM route_fingerprints WHERE vehicle_id = $1 AND observed_trip_count >= 2)::int AS learned_routes,
          (SELECT battery_usage_grade FROM vehicle_battery_lifecycle_stats WHERE vehicle_id = $1) AS battery_grade,
          (SELECT total_efc FROM vehicle_battery_lifecycle_stats WHERE vehicle_id = $1) AS total_efc,
          (SELECT min(snapshot_date) FROM vehicle_state_snapshots WHERE vehicle_id = $1) AS first_snapshot,
          (SELECT min(started_at)::date FROM trips WHERE vehicle_id = $1) AS first_trip_date
      `,
      [vehicleId],
    );

    const check = checkRes.rows[0];
    const tripCount = Number(check.trip_count ?? 0);
    const chargeCount = Number(check.charge_count ?? 0);
    const learnedRoutes = Number(check.learned_routes ?? 0);

    let verificationLevel = 'basic';
    if (tripCount >= 1) verificationLevel = 'basic';
    if (chargeCount >= 3 && learnedRoutes >= 1) verificationLevel = 'confirmed';

    // Toplam mesafe bandı (gizlilik: kesin değer değil)
    const distRes = await this.db.query(
      `SELECT COALESCE(sum(distance_m), 0)::int AS total_m FROM trips WHERE vehicle_id = $1 AND status = 'completed'`,
      [vehicleId],
    );
    const totalM = Number(distRes.rows[0]?.total_m ?? 0);
    const distanceBand = distanceToBand(totalM);

    const snapshotData = {
      tripCount,
      chargeCount,
      learnedRoutes,
      distanceBand,
      batteryUsageGrade: check.battery_grade ?? 'unknown',
      totalEfc: check.total_efc !== null ? Number(check.total_efc) : null,
      usageSinceDate: check.first_trip_date ?? null,
      verificationLevel,
      generatedAt: new Date().toISOString(),
    };

    const result = await this.db.query(
      `
        INSERT INTO vehicle_public_reports (
          vehicle_id, verification_level, period_start, snapshot_data, expires_at
        )
        VALUES (
          $1, $2, $3, $4::jsonb,
          now() + interval '1 year'
        )
        ON CONFLICT (vehicle_id)
        DO UPDATE SET
          verification_level = EXCLUDED.verification_level,
          period_start       = EXCLUDED.period_start,
          snapshot_data      = EXCLUDED.snapshot_data,
          expires_at         = EXCLUDED.expires_at,
          updated_at         = now()
        RETURNING
          id,
          vehicle_id          AS "vehicleId",
          share_token         AS "shareToken",
          verification_level  AS "verificationLevel",
          snapshot_data       AS "snapshotData",
          view_count          AS "viewCount",
          expires_at          AS "expiresAt",
          created_at          AS "createdAt"
      `,
      [
        vehicleId,
        verificationLevel,
        check.first_trip_date ?? null,
        JSON.stringify(snapshotData),
      ],
    );

    return result.rows[0];
  }

  async getPublicReport(vehicleId: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          vehicle_id          AS "vehicleId",
          share_token         AS "shareToken",
          verification_level  AS "verificationLevel",
          snapshot_data       AS "snapshotData",
          view_count          AS "viewCount",
          expires_at          AS "expiresAt",
          created_at          AS "createdAt"
        FROM vehicle_public_reports
        WHERE vehicle_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [vehicleId],
    );
    return result.rows[0] ?? null;
  }

  async getPublicReportByToken(token: string) {
    const result = await this.db.query(
      `
        SELECT
          id,
          share_token         AS "shareToken",
          verification_level  AS "verificationLevel",
          snapshot_data       AS "snapshotData",
          view_count          AS "viewCount",
          expires_at          AS "expiresAt",
          created_at          AS "createdAt"
        FROM vehicle_public_reports
        WHERE share_token = $1
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1
      `,
      [token],
    );

    if (!result.rows[0]) return null;

    await this.db.query(
      `UPDATE vehicle_public_reports SET view_count = view_count + 1, updated_at = now() WHERE share_token = $1`,
      [token],
    );

    return result.rows[0];
  }
}

function distanceToBand(totalM: number): string {
  const km = Math.round(totalM / 1000);
  if (km < 1000) return '0–1.000 km';
  if (km < 5000) return '1.000–5.000 km';
  if (km < 10000) return '5.000–10.000 km';
  if (km < 20000) return '10.000–20.000 km';
  if (km < 50000) return '20.000–50.000 km';
  if (km < 100000) return '50.000–100.000 km';
  return '100.000+ km';
}
