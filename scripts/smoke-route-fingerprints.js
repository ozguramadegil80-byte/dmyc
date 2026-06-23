const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE route_smoke_ids (
  user_id uuid,
  vehicle_id uuid,
  ownership_id uuid,
  trip_one_id uuid,
  trip_two_id uuid,
  trip_three_id uuid,
  short_trip_id uuid
) ON COMMIT DROP;

WITH created_user AS (
  INSERT INTO users (email, full_name, username)
  VALUES ('route-smoke-' || gen_random_uuid() || '@example.test', 'Route Smoke User', 'route-smoke-' || gen_random_uuid())
  RETURNING id
),
created_vehicle AS (
  INSERT INTO vehicles (display_name)
  VALUES ('Route Smoke Vehicle')
  RETURNING id
),
created_ownership AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id)
  SELECT created_vehicle.id, created_user.id
  FROM created_vehicle
  CROSS JOIN created_user
  RETURNING id, vehicle_id, user_id
),
trip_one AS (
  INSERT INTO trips (vehicle_id, ownership_id, user_id, started_at, ended_at, status, start_location, end_location, distance_m, duration_seconds, avg_speed_kmh)
  SELECT vehicle_id, id, user_id, now() - interval '2 hours', now() - interval '1 hour 45 minutes', 'completed', ST_SetSRID(ST_MakePoint(29.0001, 41.0001), 4326)::geography, ST_SetSRID(ST_MakePoint(29.0701, 41.0401), 4326)::geography, 8200, 900, 32.80
  FROM created_ownership
  RETURNING id
),
trip_two AS (
  INSERT INTO trips (vehicle_id, ownership_id, user_id, started_at, ended_at, status, start_location, end_location, distance_m, duration_seconds, avg_speed_kmh)
  SELECT vehicle_id, id, user_id, now() - interval '1 hour', now() - interval '43 minutes', 'completed', ST_SetSRID(ST_MakePoint(29.0002, 41.0002), 4326)::geography, ST_SetSRID(ST_MakePoint(29.0702, 41.0402), 4326)::geography, 8400, 1020, 29.65
  FROM created_ownership
  RETURNING id
),
trip_three AS (
  INSERT INTO trips (vehicle_id, ownership_id, user_id, started_at, ended_at, status, start_location, end_location, distance_m, duration_seconds, avg_speed_kmh)
  SELECT vehicle_id, id, user_id, now() - interval '50 minutes', now() - interval '35 minutes', 'completed', ST_SetSRID(ST_MakePoint(29.0002, 41.0002), 4326)::geography, ST_SetSRID(ST_MakePoint(29.1502, 41.0802), 4326)::geography, 13200, 900, 52.80
  FROM created_ownership
  RETURNING id
),
short_trip AS (
  INSERT INTO trips (vehicle_id, ownership_id, user_id, started_at, ended_at, status, start_location, end_location, distance_m, duration_seconds, avg_speed_kmh)
  SELECT vehicle_id, id, user_id, now() - interval '30 minutes', now() - interval '29 minutes 30 seconds', 'completed', ST_SetSRID(ST_MakePoint(29.0002, 41.0002), 4326)::geography, ST_SetSRID(ST_MakePoint(29.0004, 41.0004), 4326)::geography, 50, 30, 6.00
  FROM created_ownership
  RETURNING id
)
INSERT INTO route_smoke_ids (user_id, vehicle_id, ownership_id, trip_one_id, trip_two_id, trip_three_id, short_trip_id)
SELECT created_ownership.user_id, created_ownership.vehicle_id, created_ownership.id, trip_one.id, trip_two.id, trip_three.id, short_trip.id
FROM created_ownership
CROSS JOIN trip_one
CROSS JOIN trip_two
CROSS JOIN trip_three
CROSS JOIN short_trip;

CREATE OR REPLACE FUNCTION pg_temp.smoke_refresh_route(target_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM trip_route_assignments WHERE trip_id = target_trip_id) THEN
    RETURN;
  END IF;

  WITH trip_context AS (
    SELECT
      id AS trip_id,
      vehicle_id,
      ownership_id,
      user_id,
      started_at,
      ended_at,
      distance_m,
      duration_seconds,
      avg_speed_kmh,
      concat(round(ST_Y(start_location::geometry)::numeric, 2)::text, ',', round(ST_X(start_location::geometry)::numeric, 2)::text) AS origin_cell,
      concat(round(ST_Y(end_location::geometry)::numeric, 2)::text, ',', round(ST_X(end_location::geometry)::numeric, 2)::text) AS destination_cell,
      ST_SetSRID(ST_MakePoint(round(ST_X(start_location::geometry)::numeric, 2), round(ST_Y(start_location::geometry)::numeric, 2)), 4326)::geography AS origin_centroid,
      ST_SetSRID(ST_MakePoint(round(ST_X(end_location::geometry)::numeric, 2), round(ST_Y(end_location::geometry)::numeric, 2)), 4326)::geography AS destination_centroid,
      (round(distance_m::numeric / 1000.0) * 1000)::int AS distance_band_m
    FROM trips
    WHERE id = target_trip_id
      AND status = 'completed'
      AND start_location IS NOT NULL
      AND end_location IS NOT NULL
      AND COALESCE(distance_m, 0) >= 500
      AND COALESCE(duration_seconds, 0) >= 60
  ),
  prepared AS (
    SELECT *, concat(origin_cell, '|', destination_cell, '|', distance_band_m::text) AS route_key
    FROM trip_context
  ),
  upserted AS (
    INSERT INTO route_fingerprints (vehicle_id, ownership_id, user_id, route_key, origin_cell, destination_cell, origin_centroid, destination_centroid, normal_distance_m, normal_duration_seconds, normal_avg_speed_kmh, observed_trip_count, confidence_score, first_seen_at, last_seen_at)
    SELECT vehicle_id, ownership_id, user_id, route_key, origin_cell, destination_cell, origin_centroid, destination_centroid, distance_m, duration_seconds, avg_speed_kmh, 1, 0.15, started_at, COALESCE(ended_at, started_at)
    FROM prepared
    ON CONFLICT (vehicle_id, route_key) DO UPDATE SET
      ownership_id = COALESCE(EXCLUDED.ownership_id, route_fingerprints.ownership_id),
      user_id = COALESCE(EXCLUDED.user_id, route_fingerprints.user_id),
      normal_distance_m = round(((COALESCE(route_fingerprints.normal_distance_m, 0) * route_fingerprints.observed_trip_count) + EXCLUDED.normal_distance_m)::numeric / GREATEST(1, route_fingerprints.observed_trip_count + 1))::int,
      normal_duration_seconds = round(((COALESCE(route_fingerprints.normal_duration_seconds, 0) * route_fingerprints.observed_trip_count) + EXCLUDED.normal_duration_seconds)::numeric / GREATEST(1, route_fingerprints.observed_trip_count + 1))::int,
      normal_avg_speed_kmh = round(((COALESCE(route_fingerprints.normal_avg_speed_kmh, 0) * route_fingerprints.observed_trip_count) + COALESCE(EXCLUDED.normal_avg_speed_kmh, 0))::numeric / GREATEST(1, route_fingerprints.observed_trip_count + 1), 2),
      observed_trip_count = route_fingerprints.observed_trip_count + 1,
      confidence_score = LEAST(0.95, 0.15 + ((route_fingerprints.observed_trip_count + 1) * 0.12)),
      last_seen_at = GREATEST(route_fingerprints.last_seen_at, EXCLUDED.last_seen_at),
      updated_at = now()
    RETURNING id, normal_distance_m, normal_duration_seconds, observed_trip_count, confidence_score
  )
  INSERT INTO trip_route_assignments (trip_id, route_fingerprint_id, assignment_confidence, deviation_distance_ratio, deviation_duration_ratio)
  SELECT
    prepared.trip_id,
    upserted.id,
    upserted.confidence_score,
    CASE WHEN upserted.observed_trip_count < 2 OR COALESCE(upserted.normal_distance_m, 0) = 0 THEN NULL ELSE round(((prepared.distance_m - upserted.normal_distance_m)::numeric / upserted.normal_distance_m), 4) END,
    CASE WHEN upserted.observed_trip_count < 2 OR COALESCE(upserted.normal_duration_seconds, 0) = 0 THEN NULL ELSE round(((prepared.duration_seconds - upserted.normal_duration_seconds)::numeric / upserted.normal_duration_seconds), 4) END
  FROM prepared
  CROSS JOIN upserted
  ON CONFLICT (trip_id) DO NOTHING;
END $$;

SELECT pg_temp.smoke_refresh_route(trip_one_id) FROM route_smoke_ids;
SELECT pg_temp.smoke_refresh_route(trip_two_id) FROM route_smoke_ids;
SELECT pg_temp.smoke_refresh_route(trip_three_id) FROM route_smoke_ids;
SELECT pg_temp.smoke_refresh_route(short_trip_id) FROM route_smoke_ids;
SELECT pg_temp.smoke_refresh_route(trip_one_id) FROM route_smoke_ids;

DO $$
DECLARE
  route_count integer;
  assignment_count integer;
  observed_count integer;
  short_assignment_count integer;
BEGIN
  SELECT count(*) INTO route_count FROM route_fingerprints WHERE vehicle_id = (SELECT vehicle_id FROM route_smoke_ids);
  SELECT count(*) INTO assignment_count FROM trip_route_assignments WHERE trip_id IN (SELECT trip_one_id FROM route_smoke_ids UNION ALL SELECT trip_two_id FROM route_smoke_ids UNION ALL SELECT trip_three_id FROM route_smoke_ids);
  SELECT max(observed_trip_count) INTO observed_count FROM route_fingerprints WHERE vehicle_id = (SELECT vehicle_id FROM route_smoke_ids);
  SELECT count(*) INTO short_assignment_count FROM trip_route_assignments WHERE trip_id = (SELECT short_trip_id FROM route_smoke_ids);

  IF route_count <> 2 THEN RAISE EXCEPTION 'Expected 2 route fingerprints, got %', route_count; END IF;
  IF assignment_count <> 3 THEN RAISE EXCEPTION 'Expected 3 route assignments, got %', assignment_count; END IF;
  IF observed_count <> 2 THEN RAISE EXCEPTION 'Expected observed_trip_count 2, got %', observed_count; END IF;
  IF short_assignment_count <> 0 THEN RAISE EXCEPTION 'Expected short trip to stay unassigned, got %', short_assignment_count; END IF;
END $$;

SELECT route_key, observed_trip_count, confidence_score
FROM route_fingerprints
WHERE vehicle_id = (SELECT vehicle_id FROM route_smoke_ids);

ROLLBACK;
`);