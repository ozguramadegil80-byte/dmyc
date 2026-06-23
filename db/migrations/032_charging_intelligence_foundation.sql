-- Per-vehicle charging decision pattern clusters (deterministic, not ML)
CREATE TABLE IF NOT EXISTS charging_need_clusters (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_spec_id       uuid REFERENCES vehicle_specs(id),
  soc_band_at_decision  text NOT NULL,  -- 'low' | 'medium' | 'high'
  trip_distance_band    text NOT NULL,  -- 'short' | 'medium' | 'long'
  location_context      text NOT NULL,  -- 'home_area' | 'work_area' | 'highway' | 'unknown'
  avg_start_soc         numeric(5,2),
  avg_target_soc        numeric(5,2),
  event_count           integer NOT NULL DEFAULT 0,
  confidence_score      numeric(5,4) NOT NULL DEFAULT 0,
  last_calculated_at    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, soc_band_at_decision, trip_distance_band, location_context)
);

-- Regional charging demand aggregation — no personal data, privacy-safe grid cells
CREATE TABLE IF NOT EXISTS charging_demand_hotspots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_cell             text NOT NULL,   -- "lat_2dp|lon_2dp" ~1.1km grid
  radius_m              integer NOT NULL DEFAULT 500,
  demand_level          text NOT NULL,   -- 'low' | 'medium' | 'high' | 'very_high'
  event_count           integer NOT NULL DEFAULT 0,
  avg_start_soc         numeric(5,2),
  vehicle_spec_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_calculated_at    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grid_cell, radius_m)
);

CREATE INDEX IF NOT EXISTS charging_need_clusters_vehicle_idx
  ON charging_need_clusters (vehicle_id);

CREATE INDEX IF NOT EXISTS charging_need_clusters_spec_idx
  ON charging_need_clusters (vehicle_spec_id);

CREATE INDEX IF NOT EXISTS charging_need_clusters_soc_band_idx
  ON charging_need_clusters (vehicle_id, soc_band_at_decision);

CREATE INDEX IF NOT EXISTS charging_demand_hotspots_demand_level_idx
  ON charging_demand_hotspots (demand_level);

CREATE INDEX IF NOT EXISTS charging_demand_hotspots_grid_cell_idx
  ON charging_demand_hotspots (grid_cell);
