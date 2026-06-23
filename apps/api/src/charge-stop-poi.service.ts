import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { GoogleMapsService } from './google-maps.service';

type RoutePlanPoiRow = {
  id: string;
  vehicleId: string;
};

type ChargeStopCandidateRow = {
  id: string;
  routePlanId: string;
  sequence: number;
  energyNeededKwh: string;
  estimatedDcMinutes: number | null;
};

type StationPoiRow = {
  id: string;
  marketCode: string;
  googlePlaceId: string | null;
  sourceType: string;
  operatorName: string;
  stationName: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  maxDcKw: string | null;
  connectorTypes: string[];
  operationalStatus: string;
  evidenceStatus: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
};

type RouteChargeStopPoiCandidateRow = {
  id: string;
  routePlanId: string;
  chargeStopCandidateId: string;
  stationPoiId: string;
  rank: number;
  detourKm: string | null;
  distanceFromOriginKm: string | null;
  remainingToDestinationKm: string | null;
  matchScore: string;
  recommendationReason: string;
  createdAt: string;
  station: StationPoiRow;
};

type RouteGeometryPoiRow = {
  encodedPolyline: string | null;
  distanceKm: string | null;
};

type RouteSearchPoint = {
  latitude: number;
  longitude: number;
  distanceFromOriginKm: number | null;
  remainingToDestinationKm: number | null;
  ratio: number;
};

type GoogleStationCandidate = Awaited<ReturnType<GoogleMapsService['searchEvChargingStations']>>['stations'][number];

@Injectable()
export class ChargeStopPoiService {
  constructor(
    private readonly db: DatabaseService,
    private readonly googleMaps: GoogleMapsService,
  ) {}

  async createCandidates(routePlanId: string) {
    await this.ensureRoutePlan(routePlanId);
    const chargeStops = await this.listChargeStops(routePlanId);

    await this.db.query('DELETE FROM route_charge_stop_poi_candidates WHERE route_plan_id = $1', [
      routePlanId,
    ]);

    if (chargeStops.length === 0) {
      return {
        routePlanId,
        status: 'not_required',
        candidates: [],
      };
    }

    const routeSearchPoint = await this.resolveRouteSearchPoint(routePlanId);
    let stations = await this.listCandidateStations('verified');

    if (stations.length === 0) {
      await this.importGoogleStationsForRoute(routePlanId);
      stations = await this.listCandidateStations('google_place');

      if (stations.length === 0) {
        return {
          routePlanId,
          status: 'no_station_poi',
          candidates: [],
        };
      }
    }

    const firstStop = chargeStops[0];
    const rankedStations = rankStationsForRoute(stations, routeSearchPoint).slice(0, 5);

    for (const [index, rankedStation] of rankedStations.entries()) {
      const { navigationMetrics, station } = rankedStation;

      await this.db.query(
        `
          INSERT INTO route_charge_stop_poi_candidates (
            route_plan_id,
            charge_stop_candidate_id,
            station_poi_id,
            rank,
            detour_km,
            distance_from_origin_km,
            remaining_to_destination_km,
            match_score,
            recommendation_reason
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (route_plan_id, charge_stop_candidate_id, station_poi_id)
          DO UPDATE SET
            rank = EXCLUDED.rank,
            detour_km = EXCLUDED.detour_km,
            distance_from_origin_km = EXCLUDED.distance_from_origin_km,
            remaining_to_destination_km = EXCLUDED.remaining_to_destination_km,
            match_score = EXCLUDED.match_score,
            recommendation_reason = EXCLUDED.recommendation_reason
        `,
        [
          routePlanId,
          firstStop.id,
          station.id,
          index + 1,
          navigationMetrics.detourKm,
          navigationMetrics.distanceFromOriginKm,
          navigationMetrics.remainingToDestinationKm,
          stationScore(station, firstStop),
          recommendationReason(station, firstStop),
        ],
      );
    }

    return this.listCandidates(routePlanId);
  }

  async listCandidates(routePlanId: string) {
    await this.ensureRoutePlan(routePlanId);

    const result = await this.db.query<RouteChargeStopPoiCandidateRow>(
      `
        SELECT
          route_charge_stop_poi_candidates.id,
          route_charge_stop_poi_candidates.route_plan_id AS "routePlanId",
          route_charge_stop_poi_candidates.charge_stop_candidate_id AS "chargeStopCandidateId",
          route_charge_stop_poi_candidates.station_poi_id AS "stationPoiId",
          route_charge_stop_poi_candidates.rank,
          route_charge_stop_poi_candidates.detour_km AS "detourKm",
          route_charge_stop_poi_candidates.distance_from_origin_km AS "distanceFromOriginKm",
          route_charge_stop_poi_candidates.remaining_to_destination_km AS "remainingToDestinationKm",
          route_charge_stop_poi_candidates.match_score AS "matchScore",
          route_charge_stop_poi_candidates.recommendation_reason AS "recommendationReason",
          route_charge_stop_poi_candidates.created_at AS "createdAt",
          jsonb_build_object(
            'id', charging_station_pois.id,
            'marketCode', charging_station_pois.market_code,
            'googlePlaceId', charging_station_pois.google_place_id,
            'sourceType', charging_station_pois.source_type,
            'operatorName', charging_station_pois.operator_name,
            'stationName', charging_station_pois.station_name,
            'address', charging_station_pois.address,
            'latitude', charging_station_pois.latitude,
            'longitude', charging_station_pois.longitude,
            'maxDcKw', charging_station_pois.max_dc_kw,
            'connectorTypes', charging_station_pois.connector_types,
            'operationalStatus', charging_station_pois.operational_status,
            'evidenceStatus', charging_station_pois.evidence_status,
            'sourceLabel', charging_station_pois.source_label,
            'sourceUrl', charging_station_pois.source_url
          ) AS station
        FROM route_charge_stop_poi_candidates
        JOIN charging_station_pois ON charging_station_pois.id = route_charge_stop_poi_candidates.station_poi_id
        WHERE route_charge_stop_poi_candidates.route_plan_id = $1
        ORDER BY route_charge_stop_poi_candidates.rank ASC, route_charge_stop_poi_candidates.created_at ASC
      `,
      [routePlanId],
    );

    return {
      routePlanId,
      status: poiResultStatus(result.rows),
      candidates: result.rows.map(normalizeCandidate),
    };
  }

  private async ensureRoutePlan(routePlanId: string) {
    const result = await this.db.query<RoutePlanPoiRow>(
      `
        SELECT id, vehicle_id AS "vehicleId"
        FROM route_plans
        WHERE id = $1
        LIMIT 1
      `,
      [routePlanId],
    );

    const routePlan = result.rows[0];

    if (!routePlan) {
      throw new NotFoundException('Route plan not found.');
    }

    return routePlan;
  }

  private async listChargeStops(routePlanId: string) {
    const result = await this.db.query<ChargeStopCandidateRow>(
      `
        SELECT
          id,
          route_plan_id AS "routePlanId",
          sequence,
          energy_needed_kwh AS "energyNeededKwh",
          estimated_dc_minutes AS "estimatedDcMinutes"
        FROM route_charge_stop_candidates
        WHERE route_plan_id = $1
        ORDER BY sequence ASC
      `,
      [routePlanId],
    );

    return result.rows;
  }

  private async listCandidateStations(evidenceStatus: 'verified' | 'google_place') {
    const result = await this.db.query<StationPoiRow>(
      `
        SELECT
          id,
          market_code AS "marketCode",
          google_place_id AS "googlePlaceId",
          source_type AS "sourceType",
          operator_name AS "operatorName",
          station_name AS "stationName",
          address,
          latitude,
          longitude,
          max_dc_kw AS "maxDcKw",
          connector_types AS "connectorTypes",
          operational_status AS "operationalStatus",
          evidence_status AS "evidenceStatus",
          source_label AS "sourceLabel",
          source_url AS "sourceUrl"
        FROM charging_station_pois
        WHERE operational_status = 'active'
          AND evidence_status = $1
        ORDER BY updated_at DESC, max_dc_kw DESC NULLS LAST, operator_name ASC, station_name ASC
        LIMIT 80
      `,
      [evidenceStatus],
    );

    return result.rows;
  }

  private async importGoogleStationsForRoute(routePlanId: string) {
    const searchPoint = await this.resolveRouteSearchPoint(routePlanId);

    if (!searchPoint) {
      return;
    }

    const result = await this.googleMaps.searchEvChargingStations(searchPoint.latitude, searchPoint.longitude, 'tr');

    if (result.status !== 'OK') {
      return;
    }

    for (const station of result.stations.slice(0, 8)) {
      await this.upsertGoogleStation(station);
    }
  }

  private async upsertGoogleStation(station: GoogleStationCandidate) {
    if (!station.googlePlaceId || station.latitude === null || station.longitude === null) {
      return;
    }

    await this.db.query(
      `
        INSERT INTO charging_station_pois (
          market_code,
          google_place_id,
          source_type,
          operator_name,
          station_name,
          address,
          latitude,
          longitude,
          max_dc_kw,
          connector_types,
          operational_status,
          evidence_status,
          source_label,
          source_url
        )
        VALUES ('TR', $1, 'google_places', 'Google Maps', $2, $3, $4, $5, $6, $7, $8, 'google_place', 'Google Places', $9)
        ON CONFLICT (google_place_id) WHERE google_place_id IS NOT NULL
        DO UPDATE SET
          station_name = EXCLUDED.station_name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          max_dc_kw = COALESCE(EXCLUDED.max_dc_kw, charging_station_pois.max_dc_kw),
          connector_types = EXCLUDED.connector_types,
          operational_status = EXCLUDED.operational_status,
          source_type = 'google_places',
          evidence_status = CASE
            WHEN charging_station_pois.evidence_status = 'verified' THEN charging_station_pois.evidence_status
            ELSE 'google_place'
          END,
          source_label = 'Google Places',
          source_url = EXCLUDED.source_url,
          updated_at = now()
      `,
      [
        station.googlePlaceId,
        station.stationName,
        station.address,
        station.latitude,
        station.longitude,
        station.maxDcKw,
        JSON.stringify(station.connectorTypes),
        station.operationalStatus,
        station.sourceUrl,
      ],
    );
  }

  private async resolveRouteSearchPoint(routePlanId: string): Promise<RouteSearchPoint | null> {
    const result = await this.db.query<RouteGeometryPoiRow>(
      `
        SELECT encoded_polyline AS "encodedPolyline", distance_km AS "distanceKm"
        FROM route_geometry_snapshots
        WHERE route_plan_id = $1
          AND encoded_polyline IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [routePlanId],
    );
    const geometry = result.rows[0];
    const points = decodePolyline(geometry?.encodedPolyline);

    if (!geometry || points.length === 0) {
      return null;
    }

    const distanceKm = toNumber(geometry.distanceKm) ?? 0;
    const ratio = distanceKm > 320 ? 0.58 : 0.5;
    const point = points[Math.min(points.length - 1, Math.max(0, Math.floor(points.length * ratio)))];
    const distanceFromOriginKm = distanceKm > 0 ? round(distanceKm * ratio, 2) : null;
    const remainingToDestinationKm = distanceKm > 0 && distanceFromOriginKm !== null
      ? round(Math.max(0, distanceKm - distanceFromOriginKm), 2)
      : null;

    return {
      ...point,
      distanceFromOriginKm,
      remainingToDestinationKm,
      ratio,
    };
  }
}

function normalizeCandidate(row: RouteChargeStopPoiCandidateRow) {
  return {
    ...row,
    detourKm: toNumber(row.detourKm),
    distanceFromOriginKm: toNumber(row.distanceFromOriginKm),
    remainingToDestinationKm: toNumber(row.remainingToDestinationKm),
    matchScore: toNumber(row.matchScore),
    station: {
      ...row.station,
      latitude: toNumber(row.station.latitude),
      longitude: toNumber(row.station.longitude),
      maxDcKw: toNumber(row.station.maxDcKw),
    },
  };
}

function stationScore(station: StationPoiRow, stop: ChargeStopCandidateRow) {
  const maxDcKw = toNumber(station.maxDcKw);
  const energyNeededKwh = toNumber(stop.energyNeededKwh) ?? 0;
  const speedScore = maxDcKw ? Math.min(0.35, maxDcKw / 1000) : 0.08;
  const evidenceScore = station.evidenceStatus === 'verified' ? 0.35 : 0.15;
  const connectorScore = station.connectorTypes.length > 0 ? 0.2 : 0.05;
  const needScore = energyNeededKwh > 0 ? 0.1 : 0.02;

  return round(Math.min(0.98, speedScore + evidenceScore + connectorScore + needScore), 3);
}

function recommendationReason(station: StationPoiRow, stop: ChargeStopCandidateRow) {
  const maxDcKw = toNumber(station.maxDcKw);
  const energyNeededKwh = toNumber(stop.energyNeededKwh);

  if (maxDcKw && energyNeededKwh) {
    const source = station.evidenceStatus === 'verified' ? 'verified_operator_poi' : 'google_places_poi';
    return `${source}:${maxDcKw}kw_for_${round(energyNeededKwh, 1)}kwh_need`;
  }

  return station.evidenceStatus === 'verified' ? 'verified_operator_poi' : 'google_places_poi';
}

function rankStationsForRoute(stations: StationPoiRow[], searchPoint: RouteSearchPoint | null) {
  return stations
    .map((station) => ({
      navigationMetrics: routeNavigationMetrics(searchPoint, station),
      station,
    }))
    .sort((left, right) => {
      const leftDetour = left.navigationMetrics.detourKm ?? Number.POSITIVE_INFINITY;
      const rightDetour = right.navigationMetrics.detourKm ?? Number.POSITIVE_INFINITY;

      if (leftDetour !== rightDetour) {
        return leftDetour - rightDetour;
      }

      return (toNumber(right.station.maxDcKw) ?? 0) - (toNumber(left.station.maxDcKw) ?? 0);
    });
}

function routeNavigationMetrics(searchPoint: RouteSearchPoint | null, station: StationPoiRow) {
  const stationLatitude = toNumber(station.latitude);
  const stationLongitude = toNumber(station.longitude);

  if (!searchPoint || stationLatitude === null || stationLongitude === null) {
    return {
      detourKm: null,
      distanceFromOriginKm: null,
      remainingToDestinationKm: null,
    };
  }

  return {
    detourKm: round(
      haversineKm(searchPoint.latitude, searchPoint.longitude, stationLatitude, stationLongitude),
      2,
    ),
    distanceFromOriginKm: searchPoint.distanceFromOriginKm,
    remainingToDestinationKm: searchPoint.remainingToDestinationKm,
  };
}

function haversineKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const earthRadiusKm = 6371;
  const dLatitude = toRadians(latitude2 - latitude1);
  const dLongitude = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(dLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function poiResultStatus(rows: RouteChargeStopPoiCandidateRow[]) {
  if (rows.length === 0) {
    return 'empty';
  }

  return rows.some((row) => row.station.evidenceStatus === 'verified')
    ? 'ready'
    : 'ready_google_places';
}

function decodePolyline(encoded: string | null | undefined) {
  if (!encoded) {
    return [];
  }

  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeResult = decodePolylineValue(encoded, index);
    index = latitudeResult.nextIndex;
    latitude += latitudeResult.value;

    const longitudeResult = decodePolylineValue(encoded, index);
    index = longitudeResult.nextIndex;
    longitude += longitudeResult.value;

    points.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return points;
}

function decodePolylineValue(encoded: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte = 0;

  do {
    byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20 && index < encoded.length);

  return {
    nextIndex: index,
    value: result & 1 ? ~(result >> 1) : result >> 1,
  };
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
