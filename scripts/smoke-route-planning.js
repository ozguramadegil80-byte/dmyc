const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE route_plan_smoke_ids (
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
  VALUES ('route-plan-smoke-' || gen_random_uuid() || '@example.test', 'Route Plan Smoke User', 'route-plan-smoke-' || gen_random_uuid())
  RETURNING id
), created_vehicle AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT spec.vehicle_spec_id, spec.canonical_vehicle_id, 'Route Plan Smoke Vehicle'
  FROM spec
  RETURNING id
), created_ownership AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id)
  SELECT created_vehicle.id, created_user.id
  FROM created_vehicle
  CROSS JOIN created_user
  RETURNING id, vehicle_id, user_id
), created_profile AS (
  INSERT INTO usage_profiles (vehicle_id, ownership_id, user_id, profile_type, avg_daily_km, confidence_score)
  SELECT vehicle_id, id, user_id, 'mixed', 42, 0.55
  FROM created_ownership
  RETURNING vehicle_id
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
  SELECT vehicle_id, id, user_id, 'Smoke Origin', 'Smoke Destination', 420, 390, 0.62, 'tight'
  FROM created_ownership
  RETURNING id
), inserted_scenario AS (
  INSERT INTO route_scenarios (
    route_plan_id,
    passenger_count,
    cargo_level,
    weather_profile,
    road_profile,
    start_soc,
    target_arrival_soc,
    estimated_consumption_wh_km,
    estimated_energy_kwh,
    usable_energy_kwh,
    energy_margin_kwh,
    expected_range_km
  )
  SELECT id, 2, 'normal', 'normal', 'mixed', 80, 15, 168.5, 70.77, 48.1, -22.67, 285.46
  FROM inserted_plan
), inserted_strategy AS (
  INSERT INTO route_strategies (
    route_plan_id,
    strategy_type,
    summary,
    recommended_start_soc,
    recommended_arrival_buffer_soc,
    charge_needed,
    estimated_charge_stops
  )
  SELECT id, 'plan_charge_stop', 'Smoke strategy', 90, 20, true, 1
  FROM inserted_plan
), inserted_stop AS (
  INSERT INTO route_charge_stop_candidates (route_plan_id, sequence, reason, energy_needed_kwh, estimated_dc_minutes)
  SELECT id, 1, 'energy_shortfall_buffer', 28.2, 22
  FROM inserted_plan
)
INSERT INTO route_plan_smoke_ids (route_plan_id)
SELECT id FROM inserted_plan;

DO $$
DECLARE
  plan_count integer;
  scenario_count integer;
  strategy_count integer;
  stop_count integer;
  candidate_trip_column_count integer;
BEGIN
  SELECT count(*) INTO plan_count FROM route_plans WHERE id = (SELECT route_plan_id FROM route_plan_smoke_ids);
  SELECT count(*) INTO scenario_count FROM route_scenarios WHERE route_plan_id = (SELECT route_plan_id FROM route_plan_smoke_ids);
  SELECT count(*) INTO strategy_count FROM route_strategies WHERE route_plan_id = (SELECT route_plan_id FROM route_plan_smoke_ids);
  SELECT count(*) INTO stop_count FROM route_charge_stop_candidates WHERE route_plan_id = (SELECT route_plan_id FROM route_plan_smoke_ids);
  SELECT count(*) INTO candidate_trip_column_count
  FROM information_schema.columns
  WHERE table_name = 'route_charge_stop_candidates'
    AND column_name IN ('user_id', 'ownership_id', 'trip_id');

  IF plan_count <> 1 THEN RAISE EXCEPTION 'Expected 1 route plan, got %', plan_count; END IF;
  IF scenario_count <> 1 THEN RAISE EXCEPTION 'Expected 1 route scenario, got %', scenario_count; END IF;
  IF strategy_count <> 1 THEN RAISE EXCEPTION 'Expected 1 route strategy, got %', strategy_count; END IF;
  IF stop_count <> 1 THEN RAISE EXCEPTION 'Expected 1 charge stop candidate, got %', stop_count; END IF;
  IF candidate_trip_column_count <> 0 THEN RAISE EXCEPTION 'Charge stop candidates should not expose user/ownership/trip columns.'; END IF;
END $$;

SELECT
  route_plans.feasibility_status,
  route_scenarios.expected_range_km,
  route_strategies.estimated_charge_stops,
  route_charge_stop_candidates.estimated_dc_minutes
FROM route_plans
JOIN route_scenarios ON route_scenarios.route_plan_id = route_plans.id
JOIN route_strategies ON route_strategies.route_plan_id = route_plans.id
LEFT JOIN route_charge_stop_candidates ON route_charge_stop_candidates.route_plan_id = route_plans.id
WHERE route_plans.id = (SELECT route_plan_id FROM route_plan_smoke_ids);

ROLLBACK;
`);
