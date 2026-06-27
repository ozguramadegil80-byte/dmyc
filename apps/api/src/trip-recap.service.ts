import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from './database.service';

type TripContextRow = {
  tripId: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  vehicleName: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  distanceM: number | null;
  durationSeconds: number | null;
  avgSpeedKmh: string | null;
};

type TripRecapRow = {
  id: string;
  tripId: string;
  vehicleId: string;
  ownershipId: string | null;
  userId: string | null;
  distanceKm: string;
  durationMinutes: number;
  chargeDurationMinutes: number;
  energyUsedKwh: string | null;
  energyCost: string | null;
  arrivalSoc: string | null;
  passengerCount: number | null;
  climateUsage: string | null;
  efficiencyRating: string;
  drivingProfile: string;
  tripSummary: string;
  shareText: string;
  createdAt: string;
  updatedAt: string;
};

type TripShareCardRow = {
  id: string;
  tripRecapId: string;
  tripId: string;
  vehicleId: string;
  cardType: string;
  publicToken: string;
  shareCount: number;
  sharePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type CreateShareCardBody = {
  cardType?: 'story' | 'whatsapp' | 'x' | 'public';
};

@Injectable()
export class TripRecapService {
  constructor(private readonly db: DatabaseService) {}

  async createRecap(tripId: string) {
    const trip = await this.getTripContext(tripId);

    if (trip.status !== 'completed' || !trip.endedAt) {
      throw new BadRequestException('Trip recap can only be created for completed trips.');
    }

    const distanceKm = round((Number(trip.distanceM ?? 0) || 0) / 1000, 2);
    const durationMinutes = Math.max(0, Math.round((Number(trip.durationSeconds ?? 0) || 0) / 60));
    const avgSpeedKmh = toNumber(trip.avgSpeedKmh);
    const drivingProfile = drivingProfileFor(avgSpeedKmh, durationMinutes, distanceKm);
    const efficiencyRating = distanceKm > 0 ? 'estimated' : 'learning';
    const tripSummary = buildTripSummary(distanceKm, durationMinutes, drivingProfile);
    const shareText = buildShareText(trip.vehicleName, distanceKm, durationMinutes, drivingProfile);

    const result = await this.db.query<TripRecapRow>(
      `
        INSERT INTO trip_recaps (
          trip_id,
          vehicle_id,
          ownership_id,
          user_id,
          distance_km,
          duration_minutes,
          efficiency_rating,
          driving_profile,
          trip_summary,
          share_text
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (trip_id)
        DO UPDATE SET
          distance_km = EXCLUDED.distance_km,
          duration_minutes = EXCLUDED.duration_minutes,
          efficiency_rating = EXCLUDED.efficiency_rating,
          driving_profile = EXCLUDED.driving_profile,
          trip_summary = EXCLUDED.trip_summary,
          share_text = EXCLUDED.share_text,
          updated_at = now()
        RETURNING
          id,
          trip_id AS "tripId",
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          distance_km AS "distanceKm",
          duration_minutes AS "durationMinutes",
          charge_duration_minutes AS "chargeDurationMinutes",
          energy_used_kwh AS "energyUsedKwh",
          energy_cost AS "energyCost",
          arrival_soc AS "arrivalSoc",
          passenger_count AS "passengerCount",
          climate_usage AS "climateUsage",
          efficiency_rating AS "efficiencyRating",
          driving_profile AS "drivingProfile",
          trip_summary AS "tripSummary",
          share_text AS "shareText",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        trip.tripId,
        trip.vehicleId,
        trip.ownershipId,
        trip.userId,
        distanceKm,
        durationMinutes,
        efficiencyRating,
        drivingProfile,
        tripSummary,
        shareText,
      ],
    );

    return result.rows[0];
  }

  async getRecapByTrip(tripId: string) {
    const result = await this.db.query<TripRecapRow>(
      `
        SELECT
          id,
          trip_id AS "tripId",
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          distance_km AS "distanceKm",
          duration_minutes AS "durationMinutes",
          charge_duration_minutes AS "chargeDurationMinutes",
          energy_used_kwh AS "energyUsedKwh",
          energy_cost AS "energyCost",
          arrival_soc AS "arrivalSoc",
          passenger_count AS "passengerCount",
          climate_usage AS "climateUsage",
          efficiency_rating AS "efficiencyRating",
          driving_profile AS "drivingProfile",
          trip_summary AS "tripSummary",
          share_text AS "shareText",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM trip_recaps
        WHERE trip_id = $1
        LIMIT 1
      `,
      [tripId],
    );

    return result.rows[0] ?? null;
  }

  async createShareCard(recapId: string, body: CreateShareCardBody = {}) {
    const recap = await this.getRecap(recapId);
    const cardType = normalizeCardType(body.cardType);
    const payload = {
      cardType,
      distanceKm: Number(recap.distanceKm),
      drivingProfile: recap.drivingProfile,
      durationMinutes: recap.durationMinutes,
      shareText: recap.shareText,
      tripSummary: recap.tripSummary,
    };
    const token = await this.createUniqueToken();

    const result = await this.db.query<TripShareCardRow>(
      `
        INSERT INTO trip_share_cards (
          trip_recap_id,
          trip_id,
          vehicle_id,
          card_type,
          public_token,
          share_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          trip_recap_id AS "tripRecapId",
          trip_id AS "tripId",
          vehicle_id AS "vehicleId",
          card_type AS "cardType",
          public_token AS "publicToken",
          share_count AS "shareCount",
          share_payload AS "sharePayload",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [recap.id, recap.tripId, recap.vehicleId, cardType, token, JSON.stringify(payload)],
    );

    return result.rows[0];
  }

  async getShareCard(publicToken: string) {
    const result = await this.db.query<TripShareCardRow>(
      `
        UPDATE trip_share_cards
        SET
          share_count = share_count + 1,
          updated_at = now()
        WHERE public_token = $1
        RETURNING
          id,
          trip_recap_id AS "tripRecapId",
          trip_id AS "tripId",
          vehicle_id AS "vehicleId",
          card_type AS "cardType",
          public_token AS "publicToken",
          share_count AS "shareCount",
          share_payload AS "sharePayload",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [publicToken],
    );

    const card = result.rows[0];

    if (!card) {
      throw new NotFoundException('Trip share card not found.');
    }

    return card;
  }

  private async getTripContext(tripId: string) {
    const result = await this.db.query<TripContextRow>(
      `
        SELECT
          trips.id AS "tripId",
          trips.vehicle_id AS "vehicleId",
          trips.ownership_id AS "ownershipId",
          trips.user_id AS "userId",
          COALESCE(vehicles.display_name, vehicle_specs.variant_display_name, vehicle_specs.variant, vehicles.canonical_vehicle_id::text, vehicles.id::text) AS "vehicleName",
          trips.started_at AS "startedAt",
          trips.ended_at AS "endedAt",
          trips.status,
          trips.distance_m AS "distanceM",
          trips.duration_seconds AS "durationSeconds",
          trips.avg_speed_kmh AS "avgSpeedKmh"
        FROM trips
        JOIN vehicles ON vehicles.id = trips.vehicle_id
        LEFT JOIN vehicle_specs ON vehicle_specs.id = vehicles.vehicle_spec_id
        WHERE trips.id = $1
        LIMIT 1
      `,
      [tripId],
    );

    const trip = result.rows[0];

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }

    return trip;
  }

  private async getRecap(recapId: string) {
    const result = await this.db.query<TripRecapRow>(
      `
        SELECT
          id,
          trip_id AS "tripId",
          vehicle_id AS "vehicleId",
          ownership_id AS "ownershipId",
          user_id AS "userId",
          distance_km AS "distanceKm",
          duration_minutes AS "durationMinutes",
          charge_duration_minutes AS "chargeDurationMinutes",
          energy_used_kwh AS "energyUsedKwh",
          energy_cost AS "energyCost",
          arrival_soc AS "arrivalSoc",
          passenger_count AS "passengerCount",
          climate_usage AS "climateUsage",
          efficiency_rating AS "efficiencyRating",
          driving_profile AS "drivingProfile",
          trip_summary AS "tripSummary",
          share_text AS "shareText",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM trip_recaps
        WHERE id = $1
        LIMIT 1
      `,
      [recapId],
    );

    const recap = result.rows[0];

    if (!recap) {
      throw new NotFoundException('Trip recap not found.');
    }

    return recap;
  }

  private async createUniqueToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(12).toString('base64url');
      const existing = await this.db.query('SELECT id FROM trip_share_cards WHERE public_token = $1 LIMIT 1', [token]);

      if (existing.rowCount === 0) {
        return token;
      }
    }

    throw new BadRequestException('Trip share token could not be generated.');
  }
}

function normalizeCardType(cardType?: string) {
  return cardType === 'whatsapp' || cardType === 'x' || cardType === 'public' ? cardType : 'story';
}

function drivingProfileFor(avgSpeedKmh: number | null, durationMinutes: number, distanceKm: number) {
  if (distanceKm <= 0 || durationMinutes <= 0) {
    return 'learning';
  }

  if (avgSpeedKmh === null) {
    return 'balanced';
  }

  if (avgSpeedKmh >= 92) {
    return 'dynamic';
  }

  if (avgSpeedKmh <= 38 && distanceKm >= 8) {
    return 'comfort';
  }

  if (avgSpeedKmh >= 55 && avgSpeedKmh <= 88) {
    return 'efficient';
  }

  return 'balanced';
}

function buildTripSummary(distanceKm: number, durationMinutes: number, drivingProfile: string) {
  const profileLabel = drivingProfileLabel(drivingProfile);

  if (distanceKm <= 0) {
    return 'Bu yolculuk kaydedildi. Daha fazla GPS noktası geldikçe özet kalitesi artacak.';
  }

  return `${distanceKm} km ve ${durationMinutes} dakikalık yolculuk ${profileLabel} karakterde tamamlandı.`;
}

function buildShareText(vehicleName: string, distanceKm: number, durationMinutes: number, drivingProfile: string) {
  const profileLabel = drivingProfileLabel(drivingProfile);

  return `${vehicleName} ile ${distanceKm} km yolculuk. Süre: ${durationMinutes} dk. Sürüş karakteri: ${profileLabel}. Araç Karnesi`;
}

function drivingProfileLabel(drivingProfile: string) {
  if (drivingProfile === 'dynamic') {
    return 'dinamik';
  }

  if (drivingProfile === 'efficient') {
    return 'verimlilik odaklı';
  }

  if (drivingProfile === 'comfort') {
    return 'konfor odaklı';
  }

  if (drivingProfile === 'balanced') {
    return 'dengeli';
  }

  return 'öğrenme aşamasında';
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
