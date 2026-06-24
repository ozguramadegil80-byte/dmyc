import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

type CreateSavedLocationBody = {
  label?: string;
  locationKind?: string;
  address?: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
};

type CreateSavedRouteBody = {
  label?: string;
  originLocationId?: string;
  destinationLocationId?: string;
};

type SavedLocationRow = {
  id: string;
  userId: string;
  label: string;
  locationKind: string;
  address: string | null;
  googlePlaceId: string | null;
  latitude: string;
  longitude: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type SavedRouteRow = {
  id: string;
  userId: string;
  originLocationId: string;
  destinationLocationId: string;
  label: string;
  confirmationCount: number;
  confidenceScore: string;
  lastConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  originLabel: string;
  destinationLabel: string;
};

@Injectable()
export class SavedLocationsService {
  constructor(private readonly db: DatabaseService) {}

  async listLocations(userId: string) {
    const result = await this.db.query<SavedLocationRow>(
      `
        SELECT
          id,
          user_id AS "userId",
          label,
          location_kind AS "locationKind",
          address,
          google_place_id AS "googlePlaceId",
          ST_Y(location::geometry)::text AS latitude,
          ST_X(location::geometry)::text AS longitude,
          source,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM user_saved_locations
        WHERE user_id = $1
        ORDER BY
          CASE location_kind
            WHEN 'home' THEN 1
            WHEN 'work' THEN 2
            WHEN 'school' THEN 3
            ELSE 4
          END,
          updated_at DESC
      `,
      [userId],
    );

    return result.rows.map(normalizeLocation);
  }

  async createLocation(userId: string, body: CreateSavedLocationBody) {
    const label = body.label?.trim();
    const latitude = toFiniteNumber(body.latitude);
    const longitude = toFiniteNumber(body.longitude);

    if (!label || latitude === null || longitude === null) {
      throw new BadRequestException('Konum adı, enlem ve boylam gerekli.');
    }

    const result = await this.db.query<SavedLocationRow>(
      `
        INSERT INTO user_saved_locations (
          user_id,
          label,
          location_kind,
          address,
          google_place_id,
          location,
          source,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          ST_SetSRID(ST_MakePoint($7::numeric, $6::numeric), 4326)::geography,
          $8,
          now()
        )
        ON CONFLICT (user_id, label)
        DO UPDATE SET
          location_kind = EXCLUDED.location_kind,
          address = EXCLUDED.address,
          google_place_id = EXCLUDED.google_place_id,
          location = EXCLUDED.location,
          source = EXCLUDED.source,
          updated_at = now()
        RETURNING
          id,
          user_id AS "userId",
          label,
          location_kind AS "locationKind",
          address,
          google_place_id AS "googlePlaceId",
          ST_Y(location::geometry)::text AS latitude,
          ST_X(location::geometry)::text AS longitude,
          source,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        userId,
        label,
        normalizeLocationKind(body.locationKind),
        body.address?.trim() || null,
        body.googlePlaceId?.trim() || null,
        latitude,
        longitude,
        body.source?.trim() || 'mobile_pin',
      ],
    );

    return normalizeLocation(result.rows[0]);
  }

  async listRoutes(userId: string) {
    const result = await this.db.query<SavedRouteRow>(
      `
        SELECT
          user_saved_routes.id,
          user_saved_routes.user_id AS "userId",
          user_saved_routes.origin_location_id AS "originLocationId",
          user_saved_routes.destination_location_id AS "destinationLocationId",
          user_saved_routes.label,
          user_saved_routes.confirmation_count AS "confirmationCount",
          user_saved_routes.confidence_score AS "confidenceScore",
          user_saved_routes.last_confirmed_at AS "lastConfirmedAt",
          user_saved_routes.created_at AS "createdAt",
          user_saved_routes.updated_at AS "updatedAt",
          origin.label AS "originLabel",
          destination.label AS "destinationLabel"
        FROM user_saved_routes
        JOIN user_saved_locations origin ON origin.id = user_saved_routes.origin_location_id
        JOIN user_saved_locations destination ON destination.id = user_saved_routes.destination_location_id
        WHERE user_saved_routes.user_id = $1
        ORDER BY user_saved_routes.updated_at DESC
      `,
      [userId],
    );

    return result.rows.map(normalizeRoute);
  }

  async deleteLocation(userId: string, locationId: string) {
    await this.db.query(
      `DELETE FROM user_saved_locations WHERE id = $1 AND user_id = $2`,
      [locationId, userId],
    );
  }

  async updateLocation(userId: string, locationId: string, body: { label?: string; locationKind?: string }) {
    const label = body.label?.trim();
    const kind = normalizeLocationKind(body.locationKind);

    if (!label) throw new BadRequestException('Konum adı gerekli.');

    const result = await this.db.query<SavedLocationRow>(
      `
        UPDATE user_saved_locations
        SET label = $3, location_kind = $4, updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING
          id, user_id AS "userId", label, location_kind AS "locationKind",
          address, google_place_id AS "googlePlaceId",
          ST_Y(location::geometry)::text AS latitude,
          ST_X(location::geometry)::text AS longitude,
          source, created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [locationId, userId, label, kind],
    );

    if (!result.rows[0]) throw new BadRequestException('Konum bulunamadı.');
    return normalizeLocation(result.rows[0]);
  }

  async deleteRoute(userId: string, routeId: string) {
    await this.db.query(
      `DELETE FROM user_saved_routes WHERE id = $1 AND user_id = $2`,
      [routeId, userId],
    );
  }

  async createRoute(userId: string, body: CreateSavedRouteBody) {
    const originLocationId = body.originLocationId?.trim();
    const destinationLocationId = body.destinationLocationId?.trim();

    if (!originLocationId || !destinationLocationId || originLocationId === destinationLocationId) {
      throw new BadRequestException('Başlangıç ve varış konumu farklı olmalı.');
    }

    const label = body.label?.trim() || 'Kayıtlı rota';

    const result = await this.db.query<SavedRouteRow>(
      `
        WITH inserted AS (
          INSERT INTO user_saved_routes (
            user_id,
            origin_location_id,
            destination_location_id,
            label,
            updated_at
          )
          SELECT $1, origin.id, destination.id, $4, now()
          FROM user_saved_locations origin
          JOIN user_saved_locations destination ON destination.id = $3 AND destination.user_id = $1
          WHERE origin.id = $2 AND origin.user_id = $1
          ON CONFLICT (user_id, origin_location_id, destination_location_id, label)
          DO UPDATE SET updated_at = now()
          RETURNING *
        )
        SELECT
          inserted.id,
          inserted.user_id AS "userId",
          inserted.origin_location_id AS "originLocationId",
          inserted.destination_location_id AS "destinationLocationId",
          inserted.label,
          inserted.confirmation_count AS "confirmationCount",
          inserted.confidence_score AS "confidenceScore",
          inserted.last_confirmed_at AS "lastConfirmedAt",
          inserted.created_at AS "createdAt",
          inserted.updated_at AS "updatedAt",
          origin.label AS "originLabel",
          destination.label AS "destinationLabel"
        FROM inserted
        JOIN user_saved_locations origin ON origin.id = inserted.origin_location_id
        JOIN user_saved_locations destination ON destination.id = inserted.destination_location_id
      `,
      [userId, originLocationId, destinationLocationId, label],
    );

    const route = result.rows[0];

    if (!route) {
      throw new BadRequestException('Kayıtlı konumlar bulunamadı.');
    }

    return normalizeRoute(route);
  }
}

function normalizeLocation(row: SavedLocationRow) {
  return {
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}

function normalizeRoute(row: SavedRouteRow) {
  return {
    ...row,
    confidenceScore: Number(row.confidenceScore),
  };
}

function normalizeLocationKind(kind: string | undefined) {
  const normalized = kind?.trim().toLowerCase();

  if (normalized === 'home' || normalized === 'work' || normalized === 'school') {
    return normalized;
  }

  return 'custom';
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
