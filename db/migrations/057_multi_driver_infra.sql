-- Migration 057: Çoklu sürücü altyapısı — device links + trips driver kolonları

-- Bluetooth / CarPlay / Android Auto araç-cihaz bağlantıları
CREATE TABLE IF NOT EXISTS vehicle_device_links (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id             UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id                UUID,
  device_type            TEXT NOT NULL,
  -- phone | bluetooth | carplay | android_auto | ble_tag | oem_account
  device_display_name    TEXT,
  device_identifier_hash TEXT NOT NULL,
  link_status            TEXT NOT NULL DEFAULT 'active',
  -- active | removed
  last_seen_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_device_links_vehicle_idx ON vehicle_device_links(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_device_links_user_idx    ON vehicle_device_links(user_id);

-- Trips tablosuna sürücü ve araç tespit kolonları
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS driver_user_id          UUID,
  ADD COLUMN IF NOT EXISTS vehicle_source          TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_confidence_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS driver_source           TEXT,
  ADD COLUMN IF NOT EXISTS driver_confidence_score  NUMERIC(4,3);

COMMENT ON COLUMN trips.driver_user_id           IS 'Yolculuğu yapan sürücünün user_id''si (null = bilinmiyor)';
COMMENT ON COLUMN trips.vehicle_source           IS 'single_active_vehicle | bluetooth_detected | user_selected | inferred | unknown';
COMMENT ON COLUMN trips.driver_source            IS 'phone_detected | user_selected | co_presence_confirmed | inferred | unknown';
