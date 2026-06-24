-- Migration 040: VIN hash security foundation
-- Raw VIN is PII. Store SHA-256 hash + last-5 suffix for deduplication.
-- Raw vin column stays (nullable) but is deprecated for new inserts.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vin_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS vin_last5 TEXT,
  ADD COLUMN IF NOT EXISTS vin_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_serial_hash TEXT UNIQUE;

-- Backfill vin_hash and vin_last5 from existing vin values
UPDATE vehicles
SET
  vin_hash  = encode(sha256(vin::bytea), 'hex'),
  vin_last5 = right(vin, 5)
WHERE vin IS NOT NULL
  AND vin_hash IS NULL;

-- Index for lookup by vin_hash (primary dedup path)
CREATE INDEX IF NOT EXISTS vehicles_vin_hash_idx
  ON vehicles (vin_hash)
  WHERE vin_hash IS NOT NULL;

-- Index for last-5 suffix search (partial match display)
CREATE INDEX IF NOT EXISTS vehicles_vin_last5_idx
  ON vehicles (vin_last5)
  WHERE vin_last5 IS NOT NULL;
