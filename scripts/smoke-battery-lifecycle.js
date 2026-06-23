const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

CREATE TEMP TABLE battery_smoke_ids (
  user_id uuid,
  vehicle_id uuid,
  ownership_id uuid,
  ac_charge_id uuid,
  dc_charge_id uuid,
  missing_soc_charge_id uuid
) ON COMMIT DROP;

WITH created_user AS (
  INSERT INTO users (email, full_name, username)
  VALUES ('battery-smoke-' || gen_random_uuid() || '@example.test', 'Battery Smoke User', 'battery-smoke-' || gen_random_uuid())
  RETURNING id
),
created_vehicle AS (
  INSERT INTO vehicles (display_name)
  VALUES ('Battery Smoke Vehicle')
  RETURNING id
),
created_ownership AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id)
  SELECT created_vehicle.id, created_user.id
  FROM created_vehicle
  CROSS JOIN created_user
  RETURNING id, vehicle_id, user_id
),
ac_charge AS (
  INSERT INTO charge_sessions (vehicle_id, ownership_id, user_id, started_at, ended_at, charge_location_type, connector_type, start_soc, end_soc, energy_kwh, confidence_score)
  SELECT vehicle_id, id, user_id, now() - interval '3 hours', now() - interval '2 hours', 'home', 'ac', 20, 80, 44.0, 0.35
  FROM created_ownership
  RETURNING id
),
dc_charge AS (
  INSERT INTO charge_sessions (vehicle_id, ownership_id, user_id, started_at, ended_at, charge_location_type, connector_type, start_soc, end_soc, energy_kwh, confidence_score)
  SELECT vehicle_id, id, user_id, now() - interval '1 hour', now() - interval '30 minutes', 'public_dc', 'ccs_dc', 70, 95, 18.5, 0.40
  FROM created_ownership
  RETURNING id
),
missing_soc_charge AS (
  INSERT INTO charge_sessions (vehicle_id, ownership_id, user_id, started_at, ended_at, charge_location_type, connector_type, energy_kwh, confidence_score)
  SELECT vehicle_id, id, user_id, now() - interval '20 minutes', now() - interval '10 minutes', 'home', 'ac', 11.0, 0.10
  FROM created_ownership
  RETURNING id
)
INSERT INTO battery_smoke_ids (user_id, vehicle_id, ownership_id, ac_charge_id, dc_charge_id, missing_soc_charge_id)
SELECT created_ownership.user_id, created_ownership.vehicle_id, created_ownership.id, ac_charge.id, dc_charge.id, missing_soc_charge.id
FROM created_ownership
CROSS JOIN ac_charge
CROSS JOIN dc_charge
CROSS JOIN missing_soc_charge;

CREATE OR REPLACE FUNCTION pg_temp.smoke_refresh_battery(target_charge_session_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_vehicle_id uuid;
BEGIN
  WITH session_context AS (
    SELECT
      id AS charge_session_id,
      vehicle_id,
      ownership_id,
      user_id,
      start_soc,
      end_soc,
      GREATEST(0, end_soc - start_soc) AS soc_delta,
      lower(COALESCE(charge_location_type, 'unknown')) AS charge_location_type,
      lower(COALESCE(connector_type, '')) AS connector_type,
      confidence_score
    FROM charge_sessions
    WHERE id = target_charge_session_id
      AND start_soc IS NOT NULL
      AND end_soc IS NOT NULL
      AND end_soc > start_soc
      AND start_soc >= 0
      AND end_soc <= 100
  ),
  prepared AS (
    SELECT
      *,
      round((soc_delta / 100.0)::numeric, 4) AS efc_value,
      CASE
        WHEN end_soc >= 90 THEN 'very_high_soc'
        WHEN end_soc >= 80 THEN 'high_soc'
        WHEN start_soc <= 15 THEN 'low_soc'
        ELSE 'normal_soc'
      END AS soc_band,
      CASE
        WHEN charge_location_type IN ('dc', 'public_dc', 'fast_dc') OR connector_type LIKE '%dc%' THEN 'dc'
        WHEN charge_location_type IN ('home', 'work', 'ac', 'public_ac') THEN 'ac'
        ELSE 'unknown'
      END AS charge_type
    FROM session_context
  ),
  scored AS (
    SELECT
      *,
      CASE
        WHEN end_soc >= 90 THEN 0.35
        WHEN end_soc >= 80 THEN 0.20
        WHEN start_soc <= 15 THEN 0.10
        ELSE 0.00
      END AS soc_stress_score,
      0.00::numeric AS temperature_stress_score,
      CASE WHEN charge_type = 'dc' THEN 0.12 ELSE 0.00 END AS charge_power_stress_score,
      CASE WHEN charge_type = 'dc' THEN 0.15 ELSE 0.00 END AS dc_stress_score
    FROM prepared
  ),
  final_event AS (
    SELECT
      *,
      LEAST(1.80, 1.00 + soc_stress_score + temperature_stress_score + charge_power_stress_score + dc_stress_score) AS stress_multiplier
    FROM scored
  ),
  upserted AS (
    INSERT INTO battery_cycle_events (vehicle_id, ownership_id, user_id, charge_session_id, start_soc, end_soc, soc_delta, efc_value, soc_band, charge_type, estimated_battery_temp_band, soc_stress_score, temperature_stress_score, charge_power_stress_score, dc_stress_score, stress_multiplier, stress_adjusted_cycle, confidence_score)
    SELECT vehicle_id, ownership_id, user_id, charge_session_id, start_soc, end_soc, soc_delta, efc_value, soc_band, charge_type, 'unknown', soc_stress_score, temperature_stress_score, charge_power_stress_score, dc_stress_score, stress_multiplier, round((efc_value * stress_multiplier)::numeric, 4), LEAST(0.95, GREATEST(0.15, confidence_score + 0.20))
    FROM final_event
    ON CONFLICT (charge_session_id) DO UPDATE SET
      efc_value = EXCLUDED.efc_value,
      stress_multiplier = EXCLUDED.stress_multiplier,
      stress_adjusted_cycle = EXCLUDED.stress_adjusted_cycle,
      updated_at = now()
    RETURNING vehicle_id
  )
  SELECT vehicle_id INTO target_vehicle_id FROM upserted LIMIT 1;

  IF target_vehicle_id IS NULL THEN
    RETURN;
  END IF;

  WITH owner_context AS (
    SELECT id AS ownership_id, user_id
    FROM vehicle_ownerships
    WHERE vehicle_id = target_vehicle_id AND ownership_status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
  ),
  event_stats AS (
    SELECT
      target_vehicle_id AS vehicle_id,
      count(*)::int AS event_count,
      COALESCE(sum(efc_value), 0)::numeric AS total_efc,
      COALESCE(sum(stress_adjusted_cycle), 0)::numeric AS total_stress_adjusted_cycles,
      avg(start_soc) AS avg_charge_start_soc,
      avg(end_soc) AS avg_charge_end_soc,
      count(*) FILTER (WHERE charge_type = 'ac')::int AS ac_charge_count,
      count(*) FILTER (WHERE charge_type = 'dc')::int AS dc_charge_count,
      count(*) FILTER (WHERE end_soc >= 80)::int AS high_soc_charge_count,
      count(*) FILTER (WHERE start_soc <= 15)::int AS low_soc_charge_count,
      COALESCE(avg(stress_multiplier), 0)::numeric AS avg_stress_multiplier,
      COALESCE(avg(confidence_score), 0)::numeric AS avg_confidence_score
    FROM battery_cycle_events
    WHERE vehicle_id = target_vehicle_id
  ),
  projection AS (
    SELECT
      event_stats.vehicle_id,
      owner_context.ownership_id,
      owner_context.user_id,
      event_stats.event_count,
      round(event_stats.total_efc, 4) AS total_efc,
      round(event_stats.total_stress_adjusted_cycles, 4) AS total_stress_adjusted_cycles,
      round(event_stats.avg_charge_start_soc, 2) AS avg_charge_start_soc,
      round(event_stats.avg_charge_end_soc, 2) AS avg_charge_end_soc,
      event_stats.ac_charge_count,
      event_stats.dc_charge_count,
      CASE WHEN event_stats.event_count = 0 THEN NULL ELSE round((event_stats.dc_charge_count::numeric / event_stats.event_count), 4) END AS dc_charge_ratio,
      event_stats.high_soc_charge_count,
      event_stats.low_soc_charge_count,
      (event_stats.high_soc_charge_count * 4)::numeric AS estimated_high_soc_hours,
      event_stats.low_soc_charge_count AS estimated_low_soc_events,
      round(event_stats.avg_stress_multiplier, 4) AS avg_stress_multiplier,
      CASE
        WHEN event_stats.event_count = 0 THEN 'unknown'
        WHEN event_stats.avg_stress_multiplier >= 1.35 OR event_stats.dc_charge_count::numeric / GREATEST(1, event_stats.event_count) >= 0.60 THEN 'high_stress'
        WHEN event_stats.avg_stress_multiplier >= 1.15 OR event_stats.high_soc_charge_count > 0 THEN 'watch'
        ELSE 'balanced'
      END AS battery_usage_grade,
      LEAST(0.95, event_stats.avg_confidence_score + LEAST(0.30, event_stats.event_count * 0.05)) AS confidence_score
    FROM event_stats
    LEFT JOIN owner_context ON true
  )
  INSERT INTO vehicle_battery_lifecycle_stats (vehicle_id, ownership_id, user_id, total_efc, total_stress_adjusted_cycles, avg_charge_start_soc, avg_charge_end_soc, ac_charge_count, dc_charge_count, dc_charge_ratio, high_soc_charge_count, low_soc_charge_count, estimated_high_soc_hours, estimated_low_soc_events, avg_stress_multiplier, battery_usage_grade, confidence_score, last_calculated_at)
  SELECT vehicle_id, ownership_id, user_id, total_efc, total_stress_adjusted_cycles, avg_charge_start_soc, avg_charge_end_soc, ac_charge_count, dc_charge_count, dc_charge_ratio, high_soc_charge_count, low_soc_charge_count, estimated_high_soc_hours, estimated_low_soc_events, avg_stress_multiplier, battery_usage_grade, confidence_score, now()
  FROM projection
  ON CONFLICT (vehicle_id) DO UPDATE SET
    total_efc = EXCLUDED.total_efc,
    total_stress_adjusted_cycles = EXCLUDED.total_stress_adjusted_cycles,
    ac_charge_count = EXCLUDED.ac_charge_count,
    dc_charge_count = EXCLUDED.dc_charge_count,
    dc_charge_ratio = EXCLUDED.dc_charge_ratio,
    high_soc_charge_count = EXCLUDED.high_soc_charge_count,
    low_soc_charge_count = EXCLUDED.low_soc_charge_count,
    avg_stress_multiplier = EXCLUDED.avg_stress_multiplier,
    battery_usage_grade = EXCLUDED.battery_usage_grade,
    confidence_score = EXCLUDED.confidence_score,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = now();
END $$;

SELECT pg_temp.smoke_refresh_battery(ac_charge_id) FROM battery_smoke_ids;
SELECT pg_temp.smoke_refresh_battery(dc_charge_id) FROM battery_smoke_ids;
SELECT pg_temp.smoke_refresh_battery(missing_soc_charge_id) FROM battery_smoke_ids;
SELECT pg_temp.smoke_refresh_battery(ac_charge_id) FROM battery_smoke_ids;

DO $$
DECLARE
  event_count integer;
  ac_efc numeric;
  ac_stress numeric;
  dc_stress numeric;
  missing_event_count integer;
  projected_total_efc numeric;
  projected_dc_ratio numeric;
BEGIN
  SELECT count(*) INTO event_count FROM battery_cycle_events WHERE vehicle_id = (SELECT vehicle_id FROM battery_smoke_ids);
  SELECT efc_value, stress_multiplier INTO ac_efc, ac_stress FROM battery_cycle_events WHERE charge_session_id = (SELECT ac_charge_id FROM battery_smoke_ids);
  SELECT stress_multiplier INTO dc_stress FROM battery_cycle_events WHERE charge_session_id = (SELECT dc_charge_id FROM battery_smoke_ids);
  SELECT count(*) INTO missing_event_count FROM battery_cycle_events WHERE charge_session_id = (SELECT missing_soc_charge_id FROM battery_smoke_ids);
  SELECT stats.total_efc, stats.dc_charge_ratio INTO projected_total_efc, projected_dc_ratio FROM vehicle_battery_lifecycle_stats stats WHERE vehicle_id = (SELECT vehicle_id FROM battery_smoke_ids);

  IF event_count <> 2 THEN RAISE EXCEPTION 'Expected 2 battery events, got %', event_count; END IF;
  IF ac_efc <> 0.6000 THEN RAISE EXCEPTION 'Expected 0.6000 EFC, got %', ac_efc; END IF;
  IF dc_stress <= ac_stress THEN RAISE EXCEPTION 'Expected DC/high SOC stress % to exceed AC stress %', dc_stress, ac_stress; END IF;
  IF missing_event_count <> 0 THEN RAISE EXCEPTION 'Expected missing SOC to stay without event, got %', missing_event_count; END IF;
  IF projected_total_efc <> 0.8500 THEN RAISE EXCEPTION 'Expected total EFC 0.8500, got %', projected_total_efc; END IF;
  IF projected_dc_ratio <> 0.5000 THEN RAISE EXCEPTION 'Expected DC ratio 0.5000, got %', projected_dc_ratio; END IF;
END $$;

SELECT
  total_efc,
  total_stress_adjusted_cycles,
  dc_charge_ratio,
  battery_usage_grade,
  confidence_score
FROM vehicle_battery_lifecycle_stats
WHERE vehicle_id = (SELECT vehicle_id FROM battery_smoke_ids);

ROLLBACK;
`);