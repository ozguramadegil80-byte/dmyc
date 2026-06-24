-- Aşama 2: vehicle_user_access + charge_sessions actor/driver ayrımı
--
-- Bölüm 1: vehicle_user_access tablosu
--   Operasyonel erişim — "Bu araçta kim ne yapabilir?"
--   vehicle_ownerships = tarihsel sahiplik sicili (ayrı şey).
--
-- Bölüm 2: Mevcut aktif sahipliklerden owner access backfill
-- Bölüm 3: charge_sessions.actor_user_id / driver_user_id kolonları
-- Bölüm 4: İndeksler

-- ── Bölüm 1 ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_user_access (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  vehicle_id        UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ownership_id      UUID REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,

  role              TEXT NOT NULL
                    CHECK (role IN ('owner', 'manager', 'driver', 'viewer')),

  permissions       JSONB NOT NULL DEFAULT '[]'::jsonb,

  access_status     TEXT NOT NULL DEFAULT 'active'
                    CHECK (access_status IN ('invited', 'active', 'suspended', 'revoked')),

  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  accepted_at       TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (vehicle_id, user_id, role)
);

-- ── Bölüm 2: owner access backfill ──────────────────────────────────────

INSERT INTO vehicle_user_access (
  vehicle_id,
  user_id,
  ownership_id,
  role,
  permissions,
  access_status,
  accepted_at
)
SELECT
  vo.vehicle_id,
  vo.user_id,
  vo.id,
  'owner',
  '[
    "manage_vehicle",
    "add_charge",
    "add_drive",
    "add_driver",
    "transfer_vehicle",
    "view_card",
    "view_costs"
  ]'::jsonb,
  'active',
  now()
FROM vehicle_ownerships vo
WHERE vo.ownership_status = 'active'
ON CONFLICT (vehicle_id, user_id, role) DO NOTHING;

-- ── Bölüm 3: charge_sessions actor/driver kolonları ───────────────────────

ALTER TABLE charge_sessions
  ADD COLUMN IF NOT EXISTS actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE charge_sessions
SET
  actor_user_id  = COALESCE(actor_user_id,  user_id),
  driver_user_id = COALESCE(driver_user_id, user_id)
WHERE user_id IS NOT NULL;

-- ── Bölüm 4: İndeksler ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vehicle_user_access_user_status
  ON vehicle_user_access (user_id, access_status);

CREATE INDEX IF NOT EXISTS idx_vehicle_user_access_vehicle_status
  ON vehicle_user_access (vehicle_id, access_status);

CREATE INDEX IF NOT EXISTS idx_charge_sessions_actor_user
  ON charge_sessions (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_charge_sessions_driver_user
  ON charge_sessions (driver_user_id);
