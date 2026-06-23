import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { DatabaseService } from './database.service';
import { FirstCardService } from './first-card.service';
import { PremiumAccessService } from './premium-access.service';
import { UsageProfileService } from './usage-profile.service';
import { VehicleSpecsService } from './vehicle-specs.service';

type CreateUserBody = {
  username?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  password?: string;
  passwordConfirmation?: string;
};

type LoginUserBody = {
  email?: string;
  password?: string;
};

type CreateVehicleBody = {
  vehicleSpecId?: string;
  catalogKey?: string;
  vin?: string;
};

type CreateOwnershipBody = {
  vehicleId: string;
  userId: string;
  startOdometerKm?: number;
  purchaseYear?: number | null;
  odometerKm?: number | null;
};

type CreateUsageSignalBody = {
  vehicleId?: string;
  ownershipId?: string;
  userId?: string;
  signalType: string;
  payload?: Record<string, unknown>;
  source?: string;
};

type AdminUpdateUserBody = {
  username?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  password?: string;
  passwordConfirmation?: string;
};

@Injectable()
export class VehiclesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly firstCard: FirstCardService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly usageProfile: UsageProfileService,
    private readonly vehicleSpecs: VehicleSpecsService,
  ) {}

  async createUser(body: CreateUserBody) {
    const username = normalizeText(body.username);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const fullName = normalizeText(body.fullName) ?? username;

    if (!username) {
      throw new BadRequestException('Username is required.');
    }

    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    if (!phone) {
      throw new BadRequestException('Phone is required.');
    }

    if (!isValidEmail(email)) {
      throw new BadRequestException('Email format is invalid.');
    }

    if (!isValidPhone(phone)) {
      throw new BadRequestException('Phone format is invalid.');
    }

    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    if (body.password !== body.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const passwordHash = hashPassword(body.password);

    try {
      const result = await this.db.query(
        `
          INSERT INTO users (username, email, phone, full_name, password_hash)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, email, phone, full_name AS "fullName", created_at AS "createdAt"
        `,
        [username, email, phone, fullName, passwordHash],
      );

      const user = result.rows[0];
      await this.premiumAccess.ensureTrialForUser(user.id);

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existingUser = await this.findExistingUser(username, email, phone);

        if (existingUser && verifyPasswordHash(body.password, existingUser.password_hash)) {
          await this.premiumAccess.ensureTrialForUser(existingUser.id);

          return {
            id: existingUser.id,
            username: existingUser.username,
            email: existingUser.email,
            phone: existingUser.phone,
            fullName: existingUser.full_name,
            createdAt: existingUser.created_at,
          };
        }

        throw new ConflictException('User with this username, email or phone already exists.');
      }

      throw error;
    }
  }

  async loginUser(body: LoginUserBody) {
    const email = normalizeEmail(body.email);

    if (!email || !body.password) {
      throw new BadRequestException('Email and password are required.');
    }

    const result = await this.db.query<{
      id: string;
      username: string;
      email: string;
      phone: string;
      full_name: string;
      password_hash: string | null;
      created_at: string;
    }>(
      `
        SELECT id, username, email, phone, full_name, password_hash, created_at
        FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [email],
    );
    const user = result.rows[0];

    if (!user?.password_hash || !verifyPasswordHash(body.password, user.password_hash)) {
      throw new UnauthorizedException('Email or password is invalid.');
    }

    await this.premiumAccess.ensureTrialForUser(user.id);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      createdAt: user.created_at,
    };
  }

  private async findExistingUser(username: string, email: string, phone: string) {
    const result = await this.db.query<{
      id: string;
      username: string;
      email: string;
      phone: string;
      full_name: string;
      password_hash: string;
      created_at: string;
    }>(
      `
        SELECT id, username, email, phone, full_name, password_hash, created_at
        FROM users
        WHERE lower(username) = lower($1)
          OR lower(email) = lower($2)
          OR phone = $3
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [username, email, phone],
    );

    return result.rows[0] ?? null;
  }

  async verifyPassword(userId: string, password: string) {
    const result = await this.db.query<{ password_hash: string | null }>(
      `
        SELECT password_hash
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    const passwordHash = result.rows[0]?.password_hash;

    return passwordHash ? verifyPasswordHash(password, passwordHash) : false;
  }

  async createVehicle(body: CreateVehicleBody) {
    const spec = body.vehicleSpecId
      ? await this.vehicleSpecs.getById(body.vehicleSpecId)
      : body.catalogKey
        ? await this.vehicleSpecs.getByCatalogKey(body.catalogKey)
        : null;

    if (!spec) {
      throw new NotFoundException('Vehicle spec not found.');
    }

    const result = await this.db.query(
      `
        INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, vin, display_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, vehicle_spec_id AS "vehicleSpecId", canonical_vehicle_id AS "canonicalVehicleId", vin, display_name AS "displayName", created_at AS "createdAt"
      `,
      [spec.vehicleSpecId, spec.canonicalVehicleId, body.vin ?? null, spec.displayName],
    );

    return result.rows[0];
  }

  async createOwnership(body: CreateOwnershipBody) {
    const result = await this.db.query(
      `
        INSERT INTO vehicle_ownerships (vehicle_id, user_id, start_odometer_km, purchase_year, odometer_km)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, vehicle_id AS "vehicleId", user_id AS "userId", started_at AS "startedAt", ownership_status AS "ownershipStatus"
      `,
      [body.vehicleId, body.userId, body.startOdometerKm ?? null, body.purchaseYear ?? null, body.odometerKm ?? null],
    );

    return result.rows[0];
  }

  async createUsageSignal(body: CreateUsageSignalBody) {
    const result = await this.db.query(
      `
        INSERT INTO usage_signals (vehicle_id, ownership_id, user_id, signal_type, payload, source)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING id, vehicle_id AS "vehicleId", ownership_id AS "ownershipId", user_id AS "userId", signal_type AS "signalType", payload, source, created_at AS "createdAt"
      `,
      [
        body.vehicleId ?? null,
        body.ownershipId ?? null,
        body.userId ?? null,
        body.signalType,
        JSON.stringify(body.payload ?? {}),
        body.source ?? 'mobile_local',
      ],
    );

    return result.rows[0];
  }

  async getFirstCard(vehicleId: string) {
    const result = await this.db.query<{ vehicle_spec_id: string }>(
      'SELECT vehicle_spec_id FROM vehicles WHERE id = $1 LIMIT 1',
      [vehicleId],
    );

    const vehicle = result.rows[0];

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }

    const spec = await this.vehicleSpecs.getById(vehicle.vehicle_spec_id);

    if (!spec) {
      throw new NotFoundException('Vehicle spec not found.');
    }

    const profile = await this.usageProfile.getByVehicle(vehicleId);

    return this.firstCard.build(spec, profile);
  }

  async getUsageProfile(vehicleId: string) {
    return this.usageProfile.getByVehicle(vehicleId);
  }

  async getActiveBindingForUser(userId: string) {
    const result = await this.db.query(
      `
        SELECT
          vo.id AS ownership_id,
          vo.vehicle_id,
          vo.user_id,
          vo.started_at,
          vo.ownership_status,
          v.vehicle_spec_id,
          v.canonical_vehicle_id,
          v.vin,
          v.display_name,
          v.created_at AS vehicle_created_at,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant
        FROM vehicle_ownerships vo
        INNER JOIN vehicles v ON v.id = vo.vehicle_id
        LEFT JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
        LEFT JOIN canonical_vehicles cv ON cv.id = COALESCE(vs.canonical_vehicle_id, v.canonical_vehicle_id)
        WHERE vo.user_id = $1
          AND vo.ownership_status = 'active'
        ORDER BY vo.started_at DESC
        LIMIT 1
      `,
      [userId],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      catalogKey: makeCatalogKey(row.brand, row.model, row.variant) ?? row.canonical_key ?? row.vehicle_spec_id,
      ownership: {
        id: row.ownership_id,
        ownershipStatus: row.ownership_status,
        startedAt: row.started_at,
        userId: row.user_id,
        vehicleId: row.vehicle_id,
      },
      vehicle: {
        canonicalVehicleId: row.canonical_vehicle_id,
        createdAt: row.vehicle_created_at,
        displayName: row.display_name,
        id: row.vehicle_id,
        vehicleSpecId: row.vehicle_spec_id,
        vin: row.vin,
      },
    };
  }

  async listAdminUsers() {
    const result = await this.db.query(
      `
        SELECT
          u.id,
          u.username,
          u.email,
          u.phone,
          u.full_name AS "fullName",
          u.created_at AS "createdAt",
          count(DISTINCT vo.vehicle_id)::int AS "vehicleCount",
          COALESCE(
            jsonb_agg(DISTINCT jsonb_build_object(
              'id', v.id,
              'displayName', v.display_name,
              'ownershipStatus', vo.ownership_status
            )) FILTER (WHERE v.id IS NOT NULL),
            '[]'::jsonb
          ) AS vehicles,
          max(t.started_at) AS "lastTripAt"
        FROM users u
        LEFT JOIN vehicle_ownerships vo ON vo.user_id = u.id
        LEFT JOIN vehicles v ON v.id = vo.vehicle_id
        LEFT JOIN trips t ON t.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `,
    );

    return result.rows;
  }

  async createAdminUser(body: CreateUserBody) {
    return this.createUser(body);
  }

  async updateAdminUser(userId: string, body: AdminUpdateUserBody) {
    const current = await this.db.query<{ id: string }>('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);

    if (!current.rows[0]) {
      throw new NotFoundException('User not found.');
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    addUpdate(updates, values, 'username', body.username === undefined ? undefined : normalizeText(body.username));
    addUpdate(updates, values, 'email', body.email === undefined ? undefined : normalizeEmail(body.email));
    addUpdate(updates, values, 'phone', body.phone === undefined ? undefined : normalizePhone(body.phone));
    addUpdate(updates, values, 'full_name', body.fullName === undefined ? undefined : normalizeText(body.fullName));

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (!email || !isValidEmail(email)) {
        throw new BadRequestException('Email format is invalid.');
      }
    }

    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      if (!phone || !isValidPhone(phone)) {
        throw new BadRequestException('Phone format is invalid.');
      }
    }

    if (body.password !== undefined || body.passwordConfirmation !== undefined) {
      if (!body.password || body.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters.');
      }

      if (body.password !== body.passwordConfirmation) {
        throw new BadRequestException('Password confirmation does not match.');
      }

      addUpdate(updates, values, 'password_hash', hashPassword(body.password));
    }

    if (updates.length === 0) {
      return this.getAdminUser(userId);
    }

    values.push(userId);

    try {
      const result = await this.db.query(
        `
          UPDATE users
          SET ${updates.join(', ')}, updated_at = now()
          WHERE id = ${values.length}
          RETURNING id, username, email, phone, full_name AS "fullName", created_at AS "createdAt"
        `,
        values,
      );

      return result.rows[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('User with this username, email or phone already exists.');
      }

      throw error;
    }
  }

  async deleteAdminUser(userId: string) {
    await this.getAdminUser(userId);

    await this.db.query('UPDATE usage_signals SET user_id = NULL WHERE user_id = $1', [userId]);
    await this.db.query('UPDATE usage_profiles SET user_id = NULL, ownership_id = NULL WHERE user_id = $1', [userId]);
    await this.db.query('UPDATE trips SET user_id = NULL, ownership_id = NULL WHERE user_id = $1', [userId]);
    await this.db.query('UPDATE trip_driver_assignments SET user_id = NULL WHERE user_id = $1', [userId]);
    await this.db.query('DELETE FROM vehicle_ownerships WHERE user_id = $1', [userId]);
    const result = await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

    return { deleted: result.rowCount ?? 0, id: userId };
  }

  private async getAdminUser(userId: string) {
    const result = await this.db.query(
      `
        SELECT id, username, email, phone, full_name AS "fullName", created_at AS "createdAt"
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }
}

function makeCatalogKey(brand?: string | null, model?: string | null, variant?: string | null) {
  if (!brand || !model || !variant) {
    return null;
  }

  return [brand, model, variant].map((part) => part.trim().toLocaleLowerCase('tr-TR')).join('|');
}

function normalizeText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeEmail(value?: string) {
  return normalizeText(value)?.toLocaleLowerCase('tr-TR') ?? null;
}

function normalizePhone(value?: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const sign = normalized.trim().startsWith('+') ? '+' : '';
  return `${sign}${normalized.replace(/\D/g, '')}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\+?[0-9]{10,15}$/.test(value);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${key}`;
}

function verifyPasswordHash(password: string, passwordHash: string) {
  const [algorithm, salt, storedKey] = passwordHash.split(':');

  if (algorithm !== 'scrypt' || !salt || !storedKey) {
    return false;
  }

  const key = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedKey, 'hex');

  return stored.length === key.length && timingSafeEqual(stored, key);
}

function addUpdate(updates: string[], values: unknown[], column: string, value: unknown) {
  if (value === undefined) {
    return;
  }

  values.push(value);
  updates.push(`${column} = ${values.length}`);
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}
