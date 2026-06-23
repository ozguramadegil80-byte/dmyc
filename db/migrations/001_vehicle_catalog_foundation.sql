CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS canonical_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL UNIQUE,
  brand text NOT NULL,
  model text NOT NULL,
  variant text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_vehicle_id uuid NOT NULL REFERENCES canonical_vehicles(id),
  brand text NOT NULL,
  model text NOT NULL,
  variant text NOT NULL,
  year_from integer,
  year_to integer,
  official_sales_status text,
  battery_gross_kwh numeric(7,2),
  battery_net_kwh numeric(7,2),
  wltp_range_km integer,
  ac_max_kw numeric(7,2),
  dc_max_kw numeric(7,2),
  drive_type text,
  vehicle_class text,
  curb_weight_kg integer,
  official_efficiency_wh_km integer,
  recommended_daily_soc_min integer,
  recommended_daily_soc_max integer,
  heat_pump_available boolean,
  heat_pump_standard boolean,
  battery_chemistry text,
  charging_port_type text,
  towing_capacity_kg integer,
  seats integer,
  source_name text,
  source_url text,
  verification_level text,
  raw_source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canonical_vehicle_id, year_from, year_to)
);

CREATE INDEX IF NOT EXISTS vehicle_specs_brand_model_idx
  ON vehicle_specs (brand, model);

CREATE INDEX IF NOT EXISTS vehicle_specs_canonical_vehicle_id_idx
  ON vehicle_specs (canonical_vehicle_id);
