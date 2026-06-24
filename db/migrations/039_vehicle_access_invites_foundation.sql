-- Aşama 3: vehicle_access_invites
--
-- Sürücü daveti invite_token_hash üzerinden çalışır.
-- invitee_user_id: davet edildiğinde kullanıcı kayıtlıysa dolar, değilse null kalır.
-- Kabul anında vehicle_user_access satırı üretilir.

CREATE TABLE IF NOT EXISTS vehicle_access_invites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  vehicle_id          UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  invited_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  invitee_identifier  TEXT NOT NULL,
  invitee_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,

  role                TEXT NOT NULL
                      CHECK (role IN ('driver', 'viewer', 'manager')),

  permissions         JSONB NOT NULL DEFAULT '[]'::jsonb,

  invite_token_hash   TEXT NOT NULL UNIQUE,

  status              TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED')),

  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  accepted_at         TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_access_invites_vehicle
  ON vehicle_access_invites (vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicle_access_invites_invitee_user
  ON vehicle_access_invites (invitee_user_id, status)
  WHERE invitee_user_id IS NOT NULL;
