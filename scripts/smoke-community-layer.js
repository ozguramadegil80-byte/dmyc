const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE community_smoke_ids (
  vehicle_spec_id uuid,
  target_vehicle_id uuid,
  target_route_fingerprint_id uuid,
  alternate_route_key text
) ON COMMIT DROP;

WITH spec AS (
  SELECT id AS vehicle_spec_id, canonical_vehicle_id
  FROM vehicle_specs
  WHERE official_efficiency_wh_km IS NOT NULL
  ORDER BY brand, model, variant
  LIMIT 1
),
users_created AS (
  INSERT INTO users (email, full_name, username)
  SELECT 'community-smoke-' || n || '-' || gen_random_uuid() || '@example.test', 'Community Smoke User ' || n, 'community-smoke-' || n || '-' || gen_random_uuid()
  FROM generate_series(1, 4) AS n
  RETURNING id
),
numbered_users AS (
  SELECT id, row_number() OVER () AS rn
  FROM users_created
),
vehicles_created AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT spec.vehicle_spec_id, spec.canonical_vehicle_id, 'Community Smoke Vehicle ' || numbered_users.rn
  FROM numbered_users
  CROSS JOIN spec
  RETURNING id, vehicle_spec_id
),
numbered_vehicles AS (
  SELECT id, vehicle_spec_id, row_number() OVER () AS rn
  FROM vehicles_created
),
ownerships_created AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id)
  SELECT numbered_vehicles.id, numbered_users.id
  FROM numbered_vehicles
  JOIN numbered_users ON numbered_users.rn = numbered_vehicles.rn
  RETURNING id, vehicle_id, user_id
),
route_fingerprints_created AS (
  INSERT INTO route_fingerprints (
    vehicle_id,
    ownership_id,
    user_id,
    route_key,
    origin_cell,
    destination_cell,
    normal_distance_m,
    normal_duration_seconds,
    normal_avg_speed_kmh,
    observed_trip_count,
    confidence_score
  )
  SELECT
    ownerships_created.vehicle_id,
    ownerships_created.id,
    ownerships_created.user_id,
    CASE WHEN numbered_vehicles.rn = 4 THEN '41.00,29.00|41.09,29.18|14000' ELSE '41.00,29.00|41.04,29.07|8000' END,
    '41.00,29.00',
    CASE WHEN numbered_vehicles.rn = 4 THEN '41.09,29.18' ELSE '41.04,29.07' END,
    CASE WHEN numbered_vehicles.rn = 4 THEN 14000 ELSE 8200 END,
    CASE WHEN numbered_vehicles.rn = 4 THEN 1200 ELSE 900 END,
    CASE WHEN numbered_vehicles.rn = 4 THEN 42.00 ELSE 32.80 END,
    1,
    0.30
  FROM ownerships_created
  JOIN numbered_vehicles ON numbered_vehicles.id = ownerships_created.vehicle_id
  RETURNING id, vehicle_id, route_key
),
trips_created AS (
  INSERT INTO trips (vehicle_id, ownership_id, user_id, started_at, ended_at, status, distance_m, duration_seconds, avg_speed_kmh)
  SELECT
    ownerships_created.vehicle_id,
    ownerships_created.id,
    ownerships_created.user_id,
    now() - interval '1 hour',
    now() - interval '45 minutes',
    'completed',
    CASE WHEN numbered_vehicles.rn = 4 THEN 14000 ELSE 8200 + (numbered_vehicles.rn * 100) END,
    CASE WHEN numbered_vehicles.rn = 4 THEN 1200 ELSE 900 + (numbered_vehicles.rn * 20) END,
    CASE WHEN numbered_vehicles.rn = 4 THEN 42.00 ELSE 32.00 + numbered_vehicles.rn END
  FROM ownerships_created
  JOIN numbered_vehicles ON numbered_vehicles.id = ownerships_created.vehicle_id
  RETURNING id, vehicle_id
),
assignments_created AS (
  INSERT INTO trip_route_assignments (trip_id, route_fingerprint_id, assignment_confidence)
  SELECT trips_created.id, route_fingerprints_created.id, 0.40
  FROM trips_created
  JOIN route_fingerprints_created ON route_fingerprints_created.vehicle_id = trips_created.vehicle_id
  RETURNING id
)
INSERT INTO community_smoke_ids (vehicle_spec_id, target_vehicle_id, target_route_fingerprint_id, alternate_route_key)
SELECT
  spec.vehicle_spec_id,
  (SELECT vehicle_id FROM route_fingerprints_created WHERE route_key = '41.00,29.00|41.04,29.07|8000' LIMIT 1),
  (SELECT id FROM route_fingerprints_created WHERE route_key = '41.00,29.00|41.04,29.07|8000' LIMIT 1),
  '41.00,29.00|41.09,29.18|14000'
FROM spec;

WITH trip_source AS (
  SELECT
    vehicles.vehicle_spec_id,
    route_fingerprints.route_key AS route_cluster_key,
    CASE
      WHEN COALESCE(trips.avg_speed_kmh, 0) < 45 THEN 'eco'
      WHEN COALESCE(trips.avg_speed_kmh, 0) >= 90 THEN 'fast'
      ELSE 'normal'
    END AS speed_profile_bucket,
    trips.distance_m,
    trips.duration_seconds,
    trips.avg_speed_kmh,
    vehicle_specs.official_efficiency_wh_km
  FROM trips
  JOIN vehicles ON vehicles.id = trips.vehicle_id
  JOIN trip_route_assignments ON trip_route_assignments.trip_id = trips.id
  JOIN route_fingerprints ON route_fingerprints.id = trip_route_assignments.route_fingerprint_id
  LEFT JOIN vehicle_specs ON vehicle_specs.id = vehicles.vehicle_spec_id
  WHERE trips.status = 'completed'
    AND vehicles.vehicle_spec_id = (SELECT vehicle_spec_id FROM community_smoke_ids)
    AND trips.distance_m IS NOT NULL
    AND trips.duration_seconds IS NOT NULL
),
aggregate_source AS (
  SELECT
    vehicle_spec_id,
    route_cluster_key,
    'unknown'::text AS passenger_bucket,
    'unknown'::text AS cargo_bucket,
    'unknown'::text AS climate_bucket,
    speed_profile_bucket,
    'unknown'::text AS temperature_bucket,
    count(*)::int AS trip_count,
    round(avg(distance_m))::int AS avg_distance_m,
    round(avg(duration_seconds))::int AS avg_duration_seconds,
    round(avg(avg_speed_kmh)::numeric, 2) AS avg_speed_kmh,
    round((avg(official_efficiency_wh_km)::numeric / 1000.0), 3) AS avg_consumption_kwh_100km,
    LEAST(0.95, 0.15 + count(*) * 0.10) AS confidence_score
  FROM trip_source
  GROUP BY vehicle_spec_id, route_cluster_key, speed_profile_bucket
)
INSERT INTO similar_trip_clusters (vehicle_spec_id, route_cluster_key, passenger_bucket, cargo_bucket, climate_bucket, speed_profile_bucket, temperature_bucket, trip_count, avg_distance_m, avg_duration_seconds, avg_speed_kmh, avg_consumption_kwh_100km, confidence_score, last_calculated_at)
SELECT vehicle_spec_id, route_cluster_key, passenger_bucket, cargo_bucket, climate_bucket, speed_profile_bucket, temperature_bucket, trip_count, avg_distance_m, avg_duration_seconds, avg_speed_kmh, avg_consumption_kwh_100km, confidence_score, now()
FROM aggregate_source
ON CONFLICT (vehicle_spec_id, route_cluster_key, passenger_bucket, cargo_bucket, climate_bucket, speed_profile_bucket, temperature_bucket) DO UPDATE SET
  trip_count = EXCLUDED.trip_count,
  avg_distance_m = EXCLUDED.avg_distance_m,
  avg_duration_seconds = EXCLUDED.avg_duration_seconds,
  avg_speed_kmh = EXCLUDED.avg_speed_kmh,
  avg_consumption_kwh_100km = EXCLUDED.avg_consumption_kwh_100km,
  confidence_score = EXCLUDED.confidence_score,
  last_calculated_at = EXCLUDED.last_calculated_at,
  updated_at = now();

WITH vehicle_context AS (
  SELECT target_vehicle_id AS vehicle_id, vehicle_spec_id
  FROM community_smoke_ids
),
route_context AS (
  SELECT
    route_fingerprints.id AS route_fingerprint_id,
    route_fingerprints.route_key,
    route_fingerprints.normal_avg_speed_kmh,
    vehicle_context.vehicle_id,
    vehicle_context.vehicle_spec_id
  FROM route_fingerprints
  JOIN vehicle_context ON vehicle_context.vehicle_id = route_fingerprints.vehicle_id
),
matched AS (
  SELECT DISTINCT ON (route_context.route_fingerprint_id)
    route_context.vehicle_id,
    route_context.route_fingerprint_id,
    similar_trip_clusters.id AS similar_trip_cluster_id,
    similar_trip_clusters.trip_count AS matched_trip_count,
    CASE
      WHEN similar_trip_clusters.trip_count >= 3 THEN LEAST(0.95, similar_trip_clusters.confidence_score)
      ELSE LEAST(0.45, similar_trip_clusters.confidence_score)
    END AS match_quality_score,
    similar_trip_clusters.avg_distance_m AS community_avg_distance_m,
    similar_trip_clusters.avg_duration_seconds AS community_avg_duration_seconds,
    similar_trip_clusters.avg_speed_kmh AS community_avg_speed_kmh,
    similar_trip_clusters.avg_consumption_kwh_100km AS community_avg_consumption_kwh_100km,
    CASE WHEN similar_trip_clusters.trip_count < 3 THEN 'learning_sample' ELSE NULL END AS community_warning
  FROM route_context
  JOIN similar_trip_clusters
    ON similar_trip_clusters.vehicle_spec_id = route_context.vehicle_spec_id
    AND similar_trip_clusters.route_cluster_key = route_context.route_key
  ORDER BY route_context.route_fingerprint_id, similar_trip_clusters.trip_count DESC, similar_trip_clusters.confidence_score DESC
)
INSERT INTO route_community_benchmarks (vehicle_id, route_fingerprint_id, similar_trip_cluster_id, matched_trip_count, match_quality_score, community_avg_distance_m, community_avg_duration_seconds, community_avg_speed_kmh, community_avg_consumption_kwh_100km, community_warning)
SELECT vehicle_id, route_fingerprint_id, similar_trip_cluster_id, matched_trip_count, match_quality_score, community_avg_distance_m, community_avg_duration_seconds, community_avg_speed_kmh, community_avg_consumption_kwh_100km, community_warning
FROM matched
ON CONFLICT (vehicle_id, route_fingerprint_id) DO UPDATE SET
  similar_trip_cluster_id = EXCLUDED.similar_trip_cluster_id,
  matched_trip_count = EXCLUDED.matched_trip_count,
  match_quality_score = EXCLUDED.match_quality_score,
  community_avg_distance_m = EXCLUDED.community_avg_distance_m,
  community_avg_duration_seconds = EXCLUDED.community_avg_duration_seconds,
  community_avg_speed_kmh = EXCLUDED.community_avg_speed_kmh,
  community_avg_consumption_kwh_100km = EXCLUDED.community_avg_consumption_kwh_100km,
  community_warning = EXCLUDED.community_warning,
  updated_at = now();

DO $$
DECLARE
  cluster_count integer;
  ready_trip_count integer;
  alternate_trip_count integer;
  benchmark_count integer;
  user_column_count integer;
BEGIN
  SELECT count(*) INTO cluster_count
  FROM similar_trip_clusters
  WHERE vehicle_spec_id = (SELECT vehicle_spec_id FROM community_smoke_ids);

  SELECT trip_count INTO ready_trip_count
  FROM similar_trip_clusters
  WHERE vehicle_spec_id = (SELECT vehicle_spec_id FROM community_smoke_ids)
    AND route_cluster_key = '41.00,29.00|41.04,29.07|8000';

  SELECT trip_count INTO alternate_trip_count
  FROM similar_trip_clusters
  WHERE vehicle_spec_id = (SELECT vehicle_spec_id FROM community_smoke_ids)
    AND route_cluster_key = (SELECT alternate_route_key FROM community_smoke_ids);

  SELECT count(*) INTO benchmark_count
  FROM route_community_benchmarks
  WHERE vehicle_id = (SELECT target_vehicle_id FROM community_smoke_ids)
    AND matched_trip_count >= 3;

  SELECT count(*) INTO user_column_count
  FROM information_schema.columns
  WHERE table_name = 'route_community_benchmarks'
    AND column_name IN ('user_id', 'ownership_id', 'trip_id');

  IF cluster_count < 2 THEN RAISE EXCEPTION 'Expected at least 2 clusters, got %', cluster_count; END IF;
  IF ready_trip_count <> 3 THEN RAISE EXCEPTION 'Expected ready route trip_count 3, got %', ready_trip_count; END IF;
  IF alternate_trip_count <> 1 THEN RAISE EXCEPTION 'Expected alternate route trip_count 1, got %', alternate_trip_count; END IF;
  IF benchmark_count <> 1 THEN RAISE EXCEPTION 'Expected 1 ready benchmark, got %', benchmark_count; END IF;
  IF user_column_count <> 0 THEN RAISE EXCEPTION 'Benchmark table exposes user/trip ownership columns'; END IF;
END $$;

SELECT
  route_cluster_key,
  trip_count,
  avg_speed_kmh,
  confidence_score
FROM similar_trip_clusters
WHERE vehicle_spec_id = (SELECT vehicle_spec_id FROM community_smoke_ids)
ORDER BY trip_count DESC, route_cluster_key;

ROLLBACK;
`);