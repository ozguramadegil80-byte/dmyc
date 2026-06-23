const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE route_geometry_smoke_ids (
  snapshot_id uuid
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
  VALUES ('route-geometry-smoke-' || gen_random_uuid() || '@example.test', 'Route Geometry Smoke User', 'route-geometry-smoke-' || gen_random_uuid())
  RETURNING id
), created_vehicle AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT spec.vehicle_spec_id, spec.canonical_vehicle_id, 'Route Geometry Smoke Vehicle'
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
  RETURNING id, vehicle_id
), inserted_snapshot AS (
  INSERT INTO route_geometry_snapshots (
    route_plan_id,
    vehicle_id,
    provider,
    origin_label,
    destination_label,
    distance_km,
    duration_minutes,
    bounds,
    steps,
    confidence_score
  )
  SELECT
    id,
    vehicle_id,
    'manual_estimate',
    'Smoke Origin',
    'Smoke Destination',
    450,
    420,
    '{"source":"manual_estimate","status":"geometry_not_resolved"}'::jsonb,
    '[{"sequence":1,"instructionCode":"manual_route_estimate"}]'::jsonb,
    0.25
  FROM inserted_plan
  RETURNING id
)
INSERT INTO route_geometry_smoke_ids (snapshot_id)
SELECT id FROM inserted_snapshot;

DO $$
DECLARE
  snapshot_count integer;
  step_count integer;
BEGIN
  SELECT count(*) INTO snapshot_count
  FROM route_geometry_snapshots
  WHERE id = (SELECT snapshot_id FROM route_geometry_smoke_ids);

  SELECT jsonb_array_length(steps) INTO step_count
  FROM route_geometry_snapshots
  WHERE id = (SELECT snapshot_id FROM route_geometry_smoke_ids);

  IF snapshot_count <> 1 THEN RAISE EXCEPTION 'Expected 1 route geometry snapshot, got %', snapshot_count; END IF;
  IF step_count <> 1 THEN RAISE EXCEPTION 'Expected 1 route geometry step, got %', step_count; END IF;
END $$;

SELECT
  provider,
  distance_km,
  duration_minutes,
  confidence_score
FROM route_geometry_snapshots
WHERE id = (SELECT snapshot_id FROM route_geometry_smoke_ids);

ROLLBACK;
`);
