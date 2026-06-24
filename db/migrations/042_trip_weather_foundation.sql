-- Weather conditions recorded at trip time, used for HVAC energy accounting and range adjustment.
-- hvac_source tracks whether inference came from weather model or user confirmation.
-- hvac_confirmation_status tracks the full lifecycle of the user prompt.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS ambient_temp_c          numeric(5,2),
  ADD COLUMN IF NOT EXISTS weather_condition        text,
  ADD COLUMN IF NOT EXISTS weather_fetched_at       timestamptz,
  ADD COLUMN IF NOT EXISTS hvac_inferred            text
    CHECK (hvac_inferred IN ('cooling', 'heating', 'none', 'unknown')),
  ADD COLUMN IF NOT EXISTS hvac_source              text
    CHECK (hvac_source IN ('weather_inferred', 'user_confirmed', 'user_denied', 'auto_learned')),
  ADD COLUMN IF NOT EXISTS hvac_user_confirmed      boolean,
  ADD COLUMN IF NOT EXISTS hvac_confirmation_status text
    CHECK (hvac_confirmation_status IN ('pending', 'confirmed', 'denied', 'skipped', 'auto'));
