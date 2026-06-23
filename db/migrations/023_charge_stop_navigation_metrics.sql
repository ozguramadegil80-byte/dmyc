ALTER TABLE route_charge_stop_poi_candidates
  ADD COLUMN IF NOT EXISTS distance_from_origin_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS remaining_to_destination_km numeric(8,2);
