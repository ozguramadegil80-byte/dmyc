import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
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

type AdminProfileBody = {
  avatarUrl?: string;
  email?: string;
  fullName?: string;
  password?: string;
  passwordConfirmation?: string;
  username?: string;
};

type AdminCredentialBody = {
  password?: string;
  username?: string;
};

@Injectable()
export class VehiclesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly firstCard: FirstCardService,
    private readonly premiumAccess: PremiumAccessService,
    private readonly usageProfile: UsageProfileService,
    private readonly vehicleSpecs: VehicleSpecsService,
    private readonly jwt: JwtService,
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

      return {
        ...user,
        token: this.jwt.sign({ sub: user.id, email: user.email }),
      };
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
            token: this.jwt.sign({ sub: existingUser.id, email: existingUser.email }),
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
    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      createdAt: user.created_at,
      token: this.jwt.sign({ sub: user.id, email: user.email }),
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

  private buildVehicleBinding(row: Record<string, unknown>) {
    const vinLast5 = (row.vin_last5 as string | null) ?? null;
    const vinVerifiedAt = (row.vin_verified_at as string | null) ?? null;
    // OCR doğrulaması gelene kadar her zaman 'declared' — vinLast5 kayıtlı olsa bile.
    const identityLevel: 'declared' | 'vin_matched' = 'declared';
    return {
      catalogKey:
        makeCatalogKey(row.brand as string, row.model as string, row.variant as string) ??
        (row.canonical_key as string) ??
        (row.vehicle_spec_id as string),
      ownership: {
        id: row.ownership_id as string,
        ownershipStatus: row.ownership_status as string,
        startedAt: row.started_at as string,
        userId: row.user_id as string,
        vehicleId: row.vehicle_id as string,
      },
      vehicle: {
        canonicalVehicleId: row.canonical_vehicle_id as string,
        createdAt: row.vehicle_created_at as string,
        displayName: row.display_name as string,
        id: row.vehicle_id as string,
        vehicleSpecId: row.vehicle_spec_id as string,
        vin: row.vin as string | null,
        vinLast5,
        vinVerifiedAt,
        identityLevel,
      },
    };
  }

  private vehicleBindingQuery = `
    SELECT
      vo.id AS ownership_id,
      vo.vehicle_id,
      vo.user_id,
      vo.started_at,
      vo.ownership_status,
      v.vehicle_spec_id,
      v.canonical_vehicle_id,
      v.vin,
      v.vin_last5,
      v.vin_verified_at,
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
  `;

  // Returns all vehicles the user can access (own + driver/viewer roles via vehicle_user_access).
  // Falls back to ownership-only query for vehicles that have no access rows yet (pre-migration).
  async getActiveVehiclesForUser(userId: string) {
    const result = await this.db.query(
      `
        SELECT DISTINCT ON (v.id)
          vua.id              AS access_id,
          vua.role            AS user_role,
          vua.permissions     AS user_permissions,
          vo.id               AS ownership_id,
          vo.vehicle_id,
          vo.user_id,
          vo.started_at,
          vo.ownership_status,
          v.vehicle_spec_id,
          v.canonical_vehicle_id,
          v.vin,
          v.vin_last5,
          v.vin_verified_at,
          v.display_name,
          v.created_at        AS vehicle_created_at,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant
        FROM vehicle_user_access vua
        INNER JOIN vehicles v ON v.id = vua.vehicle_id
        LEFT JOIN vehicle_ownerships vo
          ON vo.vehicle_id = v.id
          AND vo.ownership_status = 'active'
          AND vo.user_id = vua.user_id
        LEFT JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
        LEFT JOIN canonical_vehicles cv
          ON cv.id = COALESCE(vs.canonical_vehicle_id, v.canonical_vehicle_id)
        WHERE vua.user_id = $1
          AND vua.access_status = 'active'
        ORDER BY v.id, vo.started_at DESC
      `,
      [userId],
    );
    return result.rows.map((row) => ({
      ...this.buildVehicleBinding(row),
      access: {
        id: row.access_id as string,
        role: row.user_role as string,
        permissions: (row.user_permissions as string[]) ?? [],
      },
    }));
  }

  async getCurrentVehicleContext(userId: string) {
    // Primary vehicle = most recently started active ownership where user is owner.
    // Falls back to any active access if no ownership exists.
    const result = await this.db.query(
      `
        SELECT
          vua.id              AS access_id,
          vua.role            AS user_role,
          vua.permissions     AS user_permissions,
          vo.id               AS ownership_id,
          vo.vehicle_id,
          vo.user_id,
          vo.started_at,
          vo.ownership_status,
          v.vehicle_spec_id,
          v.canonical_vehicle_id,
          v.vin,
          v.vin_last5,
          v.vin_verified_at,
          v.display_name,
          v.created_at        AS vehicle_created_at,
          cv.canonical_key,
          vs.brand,
          vs.model,
          vs.variant
        FROM vehicle_user_access vua
        INNER JOIN vehicles v ON v.id = vua.vehicle_id
        LEFT JOIN vehicle_ownerships vo
          ON vo.vehicle_id = v.id
          AND vo.ownership_status = 'active'
          AND vo.user_id = vua.user_id
        LEFT JOIN vehicle_specs vs ON vs.id = v.vehicle_spec_id
        LEFT JOIN canonical_vehicles cv
          ON cv.id = COALESCE(vs.canonical_vehicle_id, v.canonical_vehicle_id)
        WHERE vua.user_id = $1
          AND vua.access_status = 'active'
        ORDER BY
          CASE WHEN vua.role = 'owner' THEN 0 ELSE 1 END,
          vo.started_at DESC NULLS LAST
        LIMIT 1
      `,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...this.buildVehicleBinding(row),
      access: {
        id: row.access_id as string,
        role: row.user_role as string,
        permissions: (row.user_permissions as string[]) ?? [],
      },
    };
  }

  // Backward-compatible alias kept for existing mobile clients.
  async getActiveBindingForUser(userId: string) {
    return this.getCurrentVehicleContext(userId);
  }

  async getVehicleAccessForUser(userId: string, vehicleId: string) {
    const result = await this.db.query<{
      id: string; role: string; permissions: string[]; access_status: string;
    }>(
      `SELECT id, role, permissions, access_status
       FROM vehicle_user_access
       WHERE user_id = $1 AND vehicle_id = $2
       ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'driver' THEN 2 ELSE 3 END
       LIMIT 1`,
      [userId, vehicleId],
    );
    return result.rows[0] ?? null;
  }

  async canAccessVehicle(userId: string, vehicleId: string): Promise<boolean> {
    const access = await this.getVehicleAccessForUser(userId, vehicleId);
    return access !== null && access.access_status === 'active';
  }

  async canUseVehiclePermission(
    userId: string,
    vehicleId: string,
    permission: string,
  ): Promise<boolean> {
    const access = await this.getVehicleAccessForUser(userId, vehicleId);
    if (!access || access.access_status !== 'active') return false;
    const perms: string[] = Array.isArray(access.permissions) ? access.permissions : [];
    return perms.includes(permission);
  }

  // GET /vehicles/:vehicleId/access/me
  async getMyVehicleAccess(userId: string, vehicleId: string) {
    const access = await this.getVehicleAccessForUser(userId, vehicleId);
    if (!access || access.access_status !== 'active') {
      throw new ForbiddenException('Bu araca erişiminiz yok.');
    }
    return {
      vehicleId,
      role: access.role,
      permissions: (access.permissions as string[]) ?? [],
      accessStatus: access.access_status,
    };
  }

  // GET /vehicles/:vehicleId/access  (owner / manager görür)
  async listVehicleAccess(userId: string, vehicleId: string) {
    const allowed = await this.canUseVehiclePermission(userId, vehicleId, 'manage_vehicle');
    if (!allowed) throw new ForbiddenException('Sürücü listesini görme izniniz yok.');

    const result = await this.db.query(
      `SELECT
         vua.id            AS "accessId",
         vua.user_id       AS "userId",
         u.username,
         u.full_name       AS "fullName",
         vua.role,
         vua.permissions,
         vua.access_status AS "accessStatus",
         vua.created_at    AS "createdAt"
       FROM vehicle_user_access vua
       LEFT JOIN users u ON u.id = vua.user_id
       WHERE vua.vehicle_id = $1
         AND vua.access_status = 'active'
       ORDER BY
         CASE vua.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'driver' THEN 2 ELSE 3 END,
         vua.created_at ASC`,
      [vehicleId],
    );
    return result.rows;
  }

  // POST /vehicles/:vehicleId/access/:accessId/revoke
  async revokeVehicleAccess(userId: string, vehicleId: string, accessId: string) {
    const allowed = await this.canUseVehiclePermission(userId, vehicleId, 'manage_vehicle');
    if (!allowed) throw new ForbiddenException('Erişim kapatma izniniz yok.');

    const result = await this.db.query(
      `UPDATE vehicle_user_access
       SET access_status = 'revoked', revoked_at = now(), updated_at = now()
       WHERE id = $1 AND vehicle_id = $2 AND role != 'owner'
       RETURNING id, access_status AS "accessStatus"`,
      [accessId, vehicleId],
    );
    if (!result.rows[0]) throw new NotFoundException('Erişim kaydı bulunamadı veya owner kaldırılamaz.');
    return result.rows[0];
  }

  // POST /vehicles/:vehicleId/invites
  async createVehicleInvite(
    userId: string,
    vehicleId: string,
    body: { identifier: string; role?: string; permissions?: string[] },
  ) {
    const allowed = await this.canUseVehiclePermission(userId, vehicleId, 'add_driver');
    if (!allowed) throw new ForbiddenException('Sürücü davet etme izniniz yok.');

    const role = body.role ?? 'driver';
    if (!['driver', 'viewer', 'manager'].includes(role)) {
      throw new BadRequestException('Geçersiz rol.');
    }
    const permissions: string[] =
      body.permissions ?? (role === 'driver' ? ['add_charge', 'add_drive', 'view_card'] : ['view_card']);

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Davet edileni sistemde ara (var/yok bilgisini dışarı sızdırma)
    const inviteeRes = await this.db.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1) OR phone = $1 LIMIT 1`,
      [body.identifier],
    );
    const inviteeUserId = inviteeRes.rows[0]?.id ?? null;

    await this.db.query(
      `INSERT INTO vehicle_access_invites
         (vehicle_id, invited_by_user_id, invitee_identifier, invitee_user_id,
          role, permissions, invite_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [vehicleId, userId, body.identifier, inviteeUserId, role, JSON.stringify(permissions), tokenHash],
    );

    return {
      status: 'PENDING',
      shareUrl: `dmyc://vehicle-invite/${token}`,
      webUrl: `https://dmyc.digital/invite/${token}`,
    };
  }

  // POST /vehicle-invites/:token/accept
  async acceptVehicleInvite(token: string, currentUserId: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const inviteRes = await this.db.query<{
      id: string; vehicle_id: string; invited_by_user_id: string;
      role: string; permissions: string[]; status: string; expires_at: string;
    }>(
      `SELECT id, vehicle_id, invited_by_user_id, role, permissions, status, expires_at
       FROM vehicle_access_invites
       WHERE invite_token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );
    const invite = inviteRes.rows[0];

    if (!invite) throw new NotFoundException('Davet bulunamadı.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Bu davet artık geçerli değil.');
    if (new Date(invite.expires_at) < new Date()) {
      await this.db.query(
        `UPDATE vehicle_access_invites SET status = 'EXPIRED', updated_at = now() WHERE id = $1`,
        [invite.id],
      );
      throw new BadRequestException('Davet süresi dolmuş.');
    }

    // İzin kontrol: aynı kullanıcı bu araçta zaten owner olamaz
    const existingOwner = await this.db.query(
      `SELECT id FROM vehicle_user_access
       WHERE vehicle_id = $1 AND user_id = $2 AND role = 'owner' AND access_status = 'active'
       LIMIT 1`,
      [invite.vehicle_id, currentUserId],
    );
    if (existingOwner.rows[0]) {
      throw new BadRequestException('Bu aracın sahibi daveti kabul edemez.');
    }

    await this.db.query(
      `UPDATE vehicle_access_invites
       SET status = 'ACCEPTED', invitee_user_id = $1, accepted_at = now(), updated_at = now()
       WHERE id = $2`,
      [currentUserId, invite.id],
    );

    await this.db.query(
      `INSERT INTO vehicle_user_access
         (vehicle_id, user_id, role, permissions, access_status, invited_by_user_id, accepted_at)
       VALUES ($1, $2, $3, $4::jsonb, 'active', $5, now())
       ON CONFLICT (vehicle_id, user_id, role) DO UPDATE
         SET access_status = 'active', accepted_at = now(), updated_at = now()`,
      [invite.vehicle_id, currentUserId, invite.role, JSON.stringify(invite.permissions), invite.invited_by_user_id],
    );

    return { vehicleId: invite.vehicle_id, role: invite.role, accessStatus: 'active' };
  }

  // PATCH /vehicles/:id/vin — VIN son 5 karakter kaydetme (KVKK uyumlu)
  async updateVehicleVin(vehicleId: string, userId: string, body: { vinLast5?: string }) {
    const access = await this.getVehicleAccessForUser(userId, vehicleId);
    if (!access || access.access_status !== 'active' || access.role !== 'owner') {
      throw new ForbiddenException('Bu işlem için araç sahibi olmanız gerekiyor.');
    }

    const raw = (body.vinLast5 ?? '').trim().toUpperCase();
    if (!raw || raw.length < 3 || raw.length > 17 || !/^[A-Z0-9]+$/.test(raw)) {
      throw new BadRequestException('VIN son karakterleri 3–17 arası harf ve rakamdan oluşmalıdır.');
    }
    const vinLast5 = raw.slice(-5).padStart(5, '*');

    const result = await this.db.query(
      `UPDATE vehicles
       SET vin_last5 = $1, vin_verified_at = now(), updated_at = now()
       WHERE id = $2
       RETURNING vin_last5, vin_verified_at`,
      [vinLast5, vehicleId],
    );
    if (!result.rows[0]) throw new NotFoundException('Araç bulunamadı.');

    return {
      vehicleId,
      vinLast5: result.rows[0].vin_last5 as string,
      vinVerifiedAt: result.rows[0].vin_verified_at as string,
      identityLevel: 'vin_matched' as const,
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
          max(t.started_at) AS "lastTripAt",
          u.last_login_at AS "lastLoginAt"
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

  async getAdminProfile() {
    await this.ensureAdminProfileTable();
    const result = await this.db.query(
      `
        SELECT
          username,
          email,
          full_name AS "fullName",
          avatar_url AS "avatarUrl",
          updated_at AS "updatedAt"
        FROM admin_profiles
        WHERE id = 'default'
        LIMIT 1
      `,
    );

    return result.rows[0] ?? {
      avatarUrl: '',
      email: '',
      fullName: 'Panel Yöneticisi',
      username: process.env.DMYC_ADMIN_USERNAME ?? 'admin',
      updatedAt: new Date(0).toISOString(),
    };
  }

  async updateAdminProfile(body: AdminProfileBody) {
    await this.ensureAdminProfileTable();

    const username = normalizeText(body.username);
    const email = normalizeText(body.email);
    const fullName = normalizeText(body.fullName);
    const avatarUrl = normalizeText(body.avatarUrl);
    const passwordHash = this.nextAdminPasswordHash(body);

    const result = await this.db.query(
      `
        INSERT INTO admin_profiles (id, username, email, full_name, avatar_url, password_hash, updated_at)
        VALUES (
          'default',
          COALESCE($1, $6),
          $2,
          COALESCE($3, 'Panel Yöneticisi'),
          $4,
          $5,
          now()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          username = COALESCE(EXCLUDED.username, admin_profiles.username),
          email = EXCLUDED.email,
          full_name = COALESCE(EXCLUDED.full_name, admin_profiles.full_name),
          avatar_url = EXCLUDED.avatar_url,
          password_hash = COALESCE(EXCLUDED.password_hash, admin_profiles.password_hash),
          updated_at = now()
        RETURNING
          username,
          email,
          full_name AS "fullName",
          avatar_url AS "avatarUrl",
          updated_at AS "updatedAt"
      `,
      [username, email, fullName, avatarUrl, passwordHash, process.env.DMYC_ADMIN_USERNAME ?? 'admin'],
    );

    return result.rows[0];
  }

  async verifyAdminProfileCredentials(body: AdminCredentialBody) {
    await this.ensureAdminProfileTable();

    const username = normalizeText(body.username) ?? '';
    const password = body.password ?? '';
    const result = await this.db.query<{
      password_hash: string | null;
      username: string;
    }>(
      `
        SELECT username, password_hash
        FROM admin_profiles
        WHERE id = 'default'
        LIMIT 1
      `,
    );

    const profile = result.rows[0];

    if (profile?.password_hash) {
      return {
        ok: username === profile.username && verifyPasswordHash(password, profile.password_hash),
        source: 'database',
      };
    }

    const expectedUsername = process.env.DMYC_ADMIN_USERNAME ?? 'admin';
    const expectedPassword = process.env.DMYC_ADMIN_PASSWORD ?? 'DMyC-admin-2026';

    return {
      ok: username === expectedUsername && password === expectedPassword,
      source: 'environment',
    };
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
    await this.db.query('BEGIN');

    try {
      await this.getAdminUser(userId);

      const ownerships = await this.db.query<{ id: string }>(
        'SELECT id FROM vehicle_ownerships WHERE user_id = $1',
        [userId],
      );
      const ownershipIds = ownerships.rows.map((row) => row.id);

      for (const cleanup of USER_DELETE_DIRECT_DELETES) {
        await this.db.query(`DELETE FROM ${cleanup.table} WHERE ${cleanup.column} = $1`, [userId]);
      }

      for (const cleanup of USER_DELETE_NULLABLE_REFS) {
        await this.db.query(`UPDATE ${cleanup.table} SET ${cleanup.column} = NULL WHERE ${cleanup.column} = $1`, [userId]);
      }

      if (ownershipIds.length > 0) {
        for (const cleanup of OWNERSHIP_DELETE_NULLABLE_REFS) {
          await this.db.query(`UPDATE ${cleanup.table} SET ${cleanup.column} = NULL WHERE ${cleanup.column} = ANY($1::uuid[])`, [
            ownershipIds,
          ]);
        }
      }

      const ownershipResult = await this.db.query('DELETE FROM vehicle_ownerships WHERE user_id = $1', [userId]);
      const result = await this.db.query('DELETE FROM users WHERE id = $1', [userId]);

      await this.db.query('COMMIT');

      return {
        deleted: result.rowCount ?? 0,
        id: userId,
        detachedOwnerships: ownershipResult.rowCount ?? 0,
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
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

  private nextAdminPasswordHash(body: AdminProfileBody) {
    if (body.password === undefined && body.passwordConfirmation === undefined) {
      return null;
    }

    if (!body.password && !body.passwordConfirmation) {
      return null;
    }

    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Admin şifresi en az 8 karakter olmalı.');
    }

    if (body.password !== body.passwordConfirmation) {
      throw new BadRequestException('Admin şifre doğrulaması eşleşmiyor.');
    }

    return hashPassword(body.password);
  }

  private async ensureAdminProfileTable() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS admin_profiles (
        id TEXT PRIMARY KEY DEFAULT 'default',
        username TEXT NOT NULL DEFAULT 'admin',
        email TEXT,
        full_name TEXT NOT NULL DEFAULT 'Panel Yöneticisi',
        avatar_url TEXT,
        password_hash TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await this.db.query(
      `
        INSERT INTO admin_profiles (id, username, full_name)
        VALUES ('default', $1, 'Panel Yöneticisi')
        ON CONFLICT (id) DO NOTHING
      `,
      [process.env.DMYC_ADMIN_USERNAME ?? 'admin'],
    );
  }
}

type CleanupReference = {
  table: string;
  column: string;
};

const USER_DELETE_DIRECT_DELETES: CleanupReference[] = [
  { table: 'driver_vehicle_profiles', column: 'user_id' },
  { table: 'user_premium_entitlements', column: 'user_id' },
  { table: 'user_saved_routes', column: 'user_id' },
  { table: 'user_saved_locations', column: 'user_id' },
  { table: 'vehicle_access_invites', column: 'invited_by_user_id' },
  { table: 'vehicle_user_access', column: 'user_id' },
  { table: 'weekly_route_driver_snapshots', column: 'user_id' },
];

const USER_DELETE_NULLABLE_REFS: CleanupReference[] = [
  { table: 'annual_reports', column: 'user_id' },
  { table: 'battery_cycle_events', column: 'user_id' },
  { table: 'charge_sessions', column: 'actor_user_id' },
  { table: 'charge_sessions', column: 'driver_user_id' },
  { table: 'charge_sessions', column: 'user_id' },
  { table: 'charging_decision_events', column: 'user_id' },
  { table: 'monthly_reports', column: 'user_id' },
  { table: 'route_fingerprints', column: 'user_id' },
  { table: 'route_guidance_sessions', column: 'user_id' },
  { table: 'route_plans', column: 'user_id' },
  { table: 'service_visits', column: 'user_id' },
  { table: 'transfer_requests', column: 'to_user_id' },
  { table: 'trip_driver_assignments', column: 'user_id' },
  { table: 'trip_recaps', column: 'user_id' },
  { table: 'trip_route_intents', column: 'user_id' },
  { table: 'trips', column: 'user_id' },
  { table: 'usage_profiles', column: 'user_id' },
  { table: 'usage_signals', column: 'user_id' },
  { table: 'vehicle_access_invites', column: 'invitee_user_id' },
  { table: 'vehicle_battery_lifecycle_stats', column: 'user_id' },
  { table: 'vehicle_drivers', column: 'user_id' },
  { table: 'vehicle_user_access', column: 'invited_by_user_id' },
];

const OWNERSHIP_DELETE_NULLABLE_REFS: CleanupReference[] = [
  { table: 'annual_reports', column: 'ownership_id' },
  { table: 'battery_cycle_events', column: 'ownership_id' },
  { table: 'charge_sessions', column: 'ownership_id' },
  { table: 'charging_decision_events', column: 'ownership_id' },
  { table: 'external_battery_reports', column: 'ownership_id' },
  { table: 'monthly_reports', column: 'ownership_id' },
  { table: 'premium_vehicle_reports', column: 'ownership_id' },
  { table: 'route_fingerprints', column: 'ownership_id' },
  { table: 'route_guidance_sessions', column: 'ownership_id' },
  { table: 'route_plans', column: 'ownership_id' },
  { table: 'service_visits', column: 'ownership_id' },
  { table: 'transfer_requests', column: 'from_ownership_id' },
  { table: 'trip_recaps', column: 'ownership_id' },
  { table: 'trips', column: 'ownership_id' },
  { table: 'usage_profiles', column: 'ownership_id' },
  { table: 'usage_signals', column: 'ownership_id' },
  { table: 'vehicle_assessments', column: 'ownership_id' },
  { table: 'vehicle_battery_lifecycle_stats', column: 'ownership_id' },
  { table: 'vehicle_state_snapshots', column: 'ownership_id' },
  { table: 'vehicle_user_access', column: 'ownership_id' },
];

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
