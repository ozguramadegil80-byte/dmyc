import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class ChargingIntelligenceService {
  constructor(private readonly db: DatabaseService) {}

  async refreshNeedClustersForVehicle(vehicleId: string) {
    await this.db.query(
      `
        WITH vehicle_spec AS (
          SELECT vs.id AS spec_id
          FROM vehicle_ownerships vo
          JOIN vehicles v ON v.id = vo.vehicle_id
          JOIN vehicle_specs vs ON vs.canonical_vehicle_id = v.canonical_vehicle_id
          WHERE vo.vehicle_id = $1
            AND vo.ended_at IS NULL
          ORDER BY vo.started_at DESC
          LIMIT 1
        ),
        total_events AS (
          SELECT COUNT(*) AS cnt
          FROM charging_decision_events
          WHERE vehicle_id = $1 AND start_soc IS NOT NULL
        ),
        decision_data AS (
          SELECT
            cde.start_soc,
            cde.target_soc,
            cde.decision_location,
            CASE
              WHEN cde.start_soc < 30  THEN 'low'
              WHEN cde.start_soc <= 60 THEN 'medium'
              ELSE                          'high'
            END AS soc_band,
            (
              SELECT t.distance_m
              FROM trips t
              WHERE t.vehicle_id = cde.vehicle_id
                AND t.ended_at <= cde.decision_at
              ORDER BY t.ended_at DESC
              LIMIT 1
            ) AS prior_trip_distance_m,
            CASE
              WHEN cde.decision_location IS NOT NULL AND EXISTS (
                SELECT 1 FROM route_fingerprints rf
                WHERE rf.vehicle_id = cde.vehicle_id
                  AND rf.origin_centroid IS NOT NULL
                  AND ST_DWithin(rf.origin_centroid, cde.decision_location, 500)
              ) THEN 'home_area'
              WHEN cde.decision_location IS NOT NULL AND EXISTS (
                SELECT 1 FROM route_fingerprints rf
                WHERE rf.vehicle_id = cde.vehicle_id
                  AND rf.destination_centroid IS NOT NULL
                  AND ST_DWithin(rf.destination_centroid, cde.decision_location, 500)
              ) THEN 'work_area'
              ELSE 'unknown'
            END AS location_context
          FROM charging_decision_events cde
          WHERE cde.vehicle_id = $1
            AND cde.start_soc IS NOT NULL
        ),
        clustered AS (
          SELECT
            (SELECT spec_id FROM vehicle_spec)                    AS spec_id,
            soc_band                                              AS soc_band_at_decision,
            CASE
              WHEN COALESCE(prior_trip_distance_m, 0) < 20000  THEN 'short'
              WHEN COALESCE(prior_trip_distance_m, 0) <= 80000 THEN 'medium'
              ELSE                                                   'long'
            END                                                   AS trip_distance_band,
            location_context,
            AVG(start_soc)::numeric(5,2)                         AS avg_start_soc,
            AVG(target_soc)::numeric(5,2)                        AS avg_target_soc,
            COUNT(*)::int                                         AS event_count,
            (COUNT(*)::numeric
              / GREATEST(1, (SELECT cnt FROM total_events))
            )::numeric(5,4)                                       AS confidence_score
          FROM decision_data
          GROUP BY soc_band_at_decision, trip_distance_band, location_context
        )
        INSERT INTO charging_need_clusters (
          vehicle_id, vehicle_spec_id, soc_band_at_decision, trip_distance_band,
          location_context, avg_start_soc, avg_target_soc, event_count,
          confidence_score, last_calculated_at
        )
        SELECT
          $1, spec_id, soc_band_at_decision, trip_distance_band,
          location_context, avg_start_soc, avg_target_soc, event_count,
          confidence_score, now()
        FROM clustered
        ON CONFLICT (vehicle_id, soc_band_at_decision, trip_distance_band, location_context)
        DO UPDATE SET
          vehicle_spec_id      = EXCLUDED.vehicle_spec_id,
          avg_start_soc        = EXCLUDED.avg_start_soc,
          avg_target_soc       = EXCLUDED.avg_target_soc,
          event_count          = EXCLUDED.event_count,
          confidence_score     = EXCLUDED.confidence_score,
          last_calculated_at   = now(),
          updated_at           = now()
      `,
      [vehicleId],
    );
  }

  async refreshDemandHotspots() {
    await this.db.query(
      `
        WITH grid_counts AS (
          SELECT
            CONCAT(
              ROUND(ST_Y(cde.decision_location::geometry)::numeric, 2),
              '|',
              ROUND(ST_X(cde.decision_location::geometry)::numeric, 2)
            )                                                    AS grid_cell,
            COUNT(*)::int                                        AS event_count,
            AVG(cde.start_soc)::numeric(5,2)                    AS avg_start_soc,
            jsonb_agg(DISTINCT v.canonical_vehicle_id::text)
              FILTER (WHERE v.canonical_vehicle_id IS NOT NULL) AS vehicle_spec_ids
          FROM charging_decision_events cde
          JOIN vehicles v ON v.id = cde.vehicle_id
          WHERE cde.decision_location IS NOT NULL
          GROUP BY grid_cell
        )
        INSERT INTO charging_demand_hotspots (
          grid_cell, event_count, avg_start_soc, vehicle_spec_ids, demand_level,
          last_calculated_at
        )
        SELECT
          grid_cell,
          event_count,
          avg_start_soc,
          COALESCE(vehicle_spec_ids, '[]'::jsonb),
          CASE
            WHEN event_count < 5  THEN 'low'
            WHEN event_count < 20 THEN 'medium'
            WHEN event_count < 50 THEN 'high'
            ELSE                       'very_high'
          END,
          now()
        FROM grid_counts
        ON CONFLICT (grid_cell, radius_m)
        DO UPDATE SET
          event_count          = EXCLUDED.event_count,
          avg_start_soc        = EXCLUDED.avg_start_soc,
          vehicle_spec_ids     = EXCLUDED.vehicle_spec_ids,
          demand_level         = EXCLUDED.demand_level,
          last_calculated_at   = now(),
          updated_at           = now()
      `,
      [],
    );
  }

  async getBehaviorSummary(vehicleId: string) {
    const res = await this.db.query(
      `
        SELECT
          soc_band_at_decision  AS "socBand",
          trip_distance_band    AS "distanceBand",
          location_context      AS "locationContext",
          avg_start_soc         AS "avgStartSoc",
          avg_target_soc        AS "avgTargetSoc",
          event_count           AS "eventCount",
          confidence_score      AS "confidenceScore",
          last_calculated_at    AS "lastCalculatedAt"
        FROM charging_need_clusters
        WHERE vehicle_id = $1
        ORDER BY event_count DESC
      `,
      [vehicleId],
    );

    const clusters = res.rows;
    const totalEvents = clusters.reduce((sum, c) => sum + Number(c.eventCount), 0);
    const dominant = clusters[0] ?? null;

    return {
      vehicleId,
      totalEventCount: totalEvents,
      dominantPattern: dominant
        ? {
            socBand: dominant.socBand,
            distanceBand: dominant.distanceBand,
            locationContext: dominant.locationContext,
            avgStartSoc: dominant.avgStartSoc !== null ? Number(dominant.avgStartSoc) : null,
            avgTargetSoc: dominant.avgTargetSoc !== null ? Number(dominant.avgTargetSoc) : null,
            eventCount: Number(dominant.eventCount),
          }
        : null,
      clusters: clusters.map((c) => ({
        socBand: c.socBand,
        distanceBand: c.distanceBand,
        locationContext: c.locationContext,
        avgStartSoc: c.avgStartSoc !== null ? Number(c.avgStartSoc) : null,
        avgTargetSoc: c.avgTargetSoc !== null ? Number(c.avgTargetSoc) : null,
        eventCount: Number(c.eventCount),
        confidenceScore: Number(c.confidenceScore),
        lastCalculatedAt: c.lastCalculatedAt,
      })),
    };
  }

  async listDemandHotspots() {
    const res = await this.db.query(
      `
        SELECT
          id,
          grid_cell           AS "gridCell",
          radius_m            AS "radiusM",
          demand_level        AS "demandLevel",
          event_count         AS "eventCount",
          avg_start_soc       AS "avgStartSoc",
          vehicle_spec_ids    AS "vehicleSpecIds",
          last_calculated_at  AS "lastCalculatedAt"
        FROM charging_demand_hotspots
        ORDER BY event_count DESC
        LIMIT 200
      `,
      [],
    );
    return res.rows.map((r) => ({
      ...r,
      eventCount: Number(r.eventCount),
      avgStartSoc: r.avgStartSoc !== null ? Number(r.avgStartSoc) : null,
    }));
  }
}
