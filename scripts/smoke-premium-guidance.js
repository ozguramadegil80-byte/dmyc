const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE premium_guidance_smoke_ids (
  guidance_session_id uuid
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
  VALUES ('premium-guidance-smoke-' || gen_random_uuid() || '@example.test', 'Premium Guidance Smoke User', 'premium-guidance-smoke-' || gen_random_uuid())
  RETURNING id
), created_vehicle AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT spec.vehicle_spec_id, spec.canonical_vehicle_id, 'Premium Guidance Smoke Vehicle'
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
  RETURNING id, vehicle_id, ownership_id, user_id
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
  SELECT id, 2, 'normal', 'normal', 'highway', 80, 15, 185.5, 83.48, 48.1, -35.38, 259.29
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
  SELECT id, 'plan_charge_stop', 'Smoke premium strategy', 90, 20, true, 1
  FROM inserted_plan
), inserted_stop AS (
  INSERT INTO route_charge_stop_candidates (route_plan_id, sequence, reason, energy_needed_kwh, estimated_dc_minutes)
  SELECT id, 1, 'energy_shortfall_buffer', 41.2, 31
  FROM inserted_plan
), inserted_session AS (
  INSERT INTO route_guidance_sessions (
    vehicle_id,
    route_plan_id,
    ownership_id,
    user_id,
    status,
    guidance_mode
  )
  SELECT vehicle_id, id, ownership_id, user_id, 'planned', 'premium_foundation'
  FROM inserted_plan
  RETURNING id, vehicle_id, route_plan_id
), inserted_advisories AS (
  INSERT INTO trip_advisories (
    vehicle_id,
    route_plan_id,
    guidance_session_id,
    advisory_type,
    severity,
    title,
    message,
    recommended_action,
    trigger_context,
    priority
  )
  SELECT vehicle_id, route_plan_id, id, 'charge_stop', 'critical', 'Charge stop required', 'Smoke advisory', 'Add stop', '{"estimatedChargeStops":1}'::jsonb, 10
  FROM inserted_session
  UNION ALL
  SELECT vehicle_id, route_plan_id, id, 'coach', 'info', 'Energy coach ready', 'Smoke coach', 'Follow buffer', '{"feasibilityStatus":"charge_required"}'::jsonb, 50
  FROM inserted_session
)
INSERT INTO premium_guidance_smoke_ids (guidance_session_id)
SELECT id FROM inserted_session;

DO $$
DECLARE
  session_count integer;
  advisory_count integer;
  missing_context_count integer;
BEGIN
  SELECT count(*) INTO session_count
  FROM route_guidance_sessions
  WHERE id = (SELECT guidance_session_id FROM premium_guidance_smoke_ids);

  SELECT count(*) INTO advisory_count
  FROM trip_advisories
  WHERE guidance_session_id = (SELECT guidance_session_id FROM premium_guidance_smoke_ids);

  SELECT count(*) INTO missing_context_count
  FROM trip_advisories
  WHERE guidance_session_id = (SELECT guidance_session_id FROM premium_guidance_smoke_ids)
    AND trigger_context = '{}'::jsonb;

  IF session_count <> 1 THEN RAISE EXCEPTION 'Expected 1 guidance session, got %', session_count; END IF;
  IF advisory_count <> 2 THEN RAISE EXCEPTION 'Expected 2 advisories, got %', advisory_count; END IF;
  IF missing_context_count <> 0 THEN RAISE EXCEPTION 'Expected advisory trigger contexts.'; END IF;
END $$;

SELECT
  route_guidance_sessions.status,
  route_guidance_sessions.guidance_mode,
  count(trip_advisories.id) AS advisory_count
FROM route_guidance_sessions
JOIN trip_advisories ON trip_advisories.guidance_session_id = route_guidance_sessions.id
WHERE route_guidance_sessions.id = (SELECT guidance_session_id FROM premium_guidance_smoke_ids)
GROUP BY route_guidance_sessions.status, route_guidance_sessions.guidance_mode;

ROLLBACK;
`);
