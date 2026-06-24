-- Per-user HVAC preference learning: after 2 confirmations system stops asking and auto-infers.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hvac_cooling_learned       text NOT NULL DEFAULT 'unknown'
    CHECK (hvac_cooling_learned IN ('yes', 'no', 'unknown')),
  ADD COLUMN IF NOT EXISTS hvac_heating_learned       text NOT NULL DEFAULT 'unknown'
    CHECK (hvac_heating_learned IN ('yes', 'no', 'unknown')),
  ADD COLUMN IF NOT EXISTS hvac_cooling_confirmations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hvac_heating_confirmations integer NOT NULL DEFAULT 0;
