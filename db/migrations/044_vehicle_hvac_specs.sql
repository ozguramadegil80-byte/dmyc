-- HVAC power consumption per vehicle spec, used for energy accounting on hot/cold trips.
-- heat_pump_available already exists in catalog; heating_kw auto-selects based on it.

ALTER TABLE vehicle_specs
  ADD COLUMN IF NOT EXISTS hvac_cooling_kw numeric(5,2),
  ADD COLUMN IF NOT EXISTS hvac_heating_kw numeric(5,2);
