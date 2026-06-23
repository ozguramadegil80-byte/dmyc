const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE charge_stop_poi_smoke_ids (
  route_plan_id uuid
) ON COMMIT DROP;

WITH spec AS (
  SELECT id AS vehicle_spec_id, canonical_vehicle_id
  FROM vehicle_specs
  WHERE battery_net_kwh IS NOT NULL
    AND wltp_range_km IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1
), created_user AS (
  INSERT INTO users (email, full_name, username)
  VALUES ('charge-stop-poi-smoke-' || gen_random_uuid() || '@example.test', 'Charge Stop POI Smoke User', 'charge-stop-poi-smoke-' || gen_random_uuid())
  RETURNING id
), created_vehicle AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT spec.vehicle_spec_id, spec.canonical_vehicle_id, 'Charge Stop POI Smoke Vehicle'
  FROM spec
  RETURNING id
), created_ownership AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id)
  SELECT created_vehicle.id, created_user.id
  FROM created_vehicle
  CROSS JOIN created_user
  RETURNING id, vehicle_id, user_id
), inserted_plan AS (
  INSERT INTO route_plans (
    vehicle_id,
    ownership_id,
    user_id,
    origin_label,
    destination_label,
    requested_distance_km,
    estimated_duration_minutes,
    confidence_score,
    feasibility_status
  )
  SELECT vehicle_id, id, user_id, 'Smoke Origin', 'Smoke Destination', 450, 420, 0.61, 'charge_required'
  FROM created_ownership
  RETURNING id
), inserted_stop AS (
  INSERT INTO route_charge_stop_candidates (
    route_plan_id,
    sequence,
    reason,
    energy_needed_kwh,
    estimated_dc_minutes
  )
  SELECT id, 1, 'energy_shortfall_buffer', 38.5, 29
  FROM inserted_plan
  RETURNING id, route_plan_id
), inserted_station AS (
  INSERT INTO charging_station_pois (
    market_code,
    operator_name,
    station_name,
    address,
    latitude,
    longitude,
    max_dc_kw,
    connector_types,
    operational_status,
    evidence_status,
    source_label
  )
  VALUES (
    'TR',
    'Smoke Operator',
    'Smoke DC Station',
    'Smoke highway test address',
    40.7600000,
    30.3900000,
    180,
    '["ccs2"]'::jsonb,
    'active',
    'verified',
    'smoke-test'
  )
  RETURNING id
), inserted_match AS (
  INSERT INTO route_charge_stop_poi_candidates (
    route_plan_id,
    charge_stop_candidate_id,
    station_poi_id,
    rank,
    detour_km,
    match_score,
    recommendation_reason
  )
  SELECT
    inserted_stop.route_plan_id,
    inserted_stop.id,
    inserted_station.id,
    1,
    NULL,
    0.83,
    'verified_operator_poi:180kw_for_38.5kwh_need'
  FROM inserted_stop
  CROSS JOIN inserted_station
)
INSERT INTO charge_stop_poi_smoke_ids (route_plan_id)
SELECT id FROM inserted_plan;

DO $$
DECLARE
  match_count integer;
  verified_station_count integer;
BEGIN
  SELECT count(*) INTO match_count
  FROM route_charge_stop_poi_candidates
  WHERE route_plan_id = (SELECT route_plan_id FROM charge_stop_poi_smoke_ids);

  SELECT count(*) INTO verified_station_count
  FROM charging_station_pois
  WHERE operator_name = 'Smoke Operator'
    AND evidence_status = 'verified'
    AND operational_status = 'active';

  IF match_count <> 1 THEN RAISE EXCEPTION 'Expected 1 POI candidate, got %', match_count; END IF;
  IF verified_station_count <> 1 THEN RAISE EXCEPTION 'Expected 1 verified station, got %', verified_station_count; END IF;
END $$;

SELECT
  charging_station_pois.operator_name,
  charging_station_pois.station_name,
  route_charge_stop_poi_candidates.rank,
  route_charge_stop_poi_candidates.match_score
FROM route_charge_stop_poi_candidates
JOIN charging_station_pois ON charging_station_pois.id = route_charge_stop_poi_candidates.station_poi_id
WHERE route_charge_stop_poi_candidates.route_plan_id = (SELECT route_plan_id FROM charge_stop_poi_smoke_ids);

ROLLBACK;
`);
