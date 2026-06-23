/**
 * seed-oxgurunal-demo.js
 *
 * oxgurunal kullanıcısının tüm verisini sıfırlar ve kapsamlı bir demo seti oluşturur:
 *   - Togg T10F V1 RWD Uzun Menzil (88.5 kWh, 522 km WLTP)
 *   - purchase_year=2023, odometer_km=225000 → HEAVY_USED_WORN senaryosu
 *   - 30 günlük İstanbul şehir içi trip verisi
 *   - AC + DC şarj oturumları
 *   - Batarya döngü olayları + lifecycle stats
 *   - Kullanım profili
 *   - Aylık (Mayıs + Haziran 2026) ve yıllık rapor (2026)
 *   - Gün 0 değerlendirmesi
 *
 * Çalıştır: node scripts/seed-oxgurunal-demo.js
 */

const { runPsql } = require('./lib/docker-psql');

runPsql(`
BEGIN;

-- ─── 1. oxgurunal kullanıcısını bul ───────────────────────────────────────
CREATE TEMP TABLE demo_ids (
  user_id        uuid,
  vehicle_id     uuid,
  ownership_id   uuid,
  spec_id        uuid
) ON COMMIT DROP;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE lower(username) = 'oxgurunal' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'oxgurunal kullanıcısı bulunamadı. Önce kayıt yaptır.';
  END IF;
END $$;

-- ─── 2. oxgurunal'ın mevcut verilerini sil ────────────────────────────────
-- Silme sırası: FK bağımlılığına göre yapraktan köke

DELETE FROM premium_vehicle_reports
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM external_battery_reports
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM vehicle_assessments
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM annual_reports
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM monthly_reports
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM vehicle_battery_lifecycle_stats
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM battery_cycle_events
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM charge_sessions
  WHERE vehicle_id IN (
    SELECT vo.vehicle_id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM trip_points
  WHERE trip_id IN (
    SELECT t.id FROM trips t
    JOIN vehicle_ownerships vo ON vo.id = t.ownership_id
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM trips
  WHERE ownership_id IN (
    SELECT vo.id FROM vehicle_ownerships vo
    JOIN users u ON u.id = vo.user_id WHERE lower(u.username) = 'oxgurunal'
  );

DELETE FROM usage_profiles
  WHERE user_id IN (SELECT id FROM users WHERE lower(username) = 'oxgurunal');

DELETE FROM usage_signals
  WHERE user_id IN (SELECT id FROM users WHERE lower(username) = 'oxgurunal');

DELETE FROM vehicle_ownerships
  WHERE user_id IN (SELECT id FROM users WHERE lower(username) = 'oxgurunal');

DELETE FROM vehicles
  WHERE id NOT IN (SELECT vehicle_id FROM vehicle_ownerships)
    AND display_name LIKE '%Demo%';

-- ─── 3. Uygun vehicle_spec bul (Togg T10F öncelikli, yoksa büyük batarya) ──
INSERT INTO demo_ids (user_id, spec_id)
SELECT
  u.id,
  COALESCE(
    -- Togg T10F uzun menzil
    (SELECT vs.id FROM vehicle_specs vs
     WHERE lower(vs.model) LIKE '%t10f%'
       AND vs.battery_net_kwh IS NOT NULL
       AND vs.wltp_range_km IS NOT NULL
     ORDER BY vs.wltp_range_km DESC LIMIT 1),
    -- Togg T10X fallback
    (SELECT vs.id FROM vehicle_specs vs
     WHERE lower(vs.model) LIKE '%t10x%'
       AND vs.battery_net_kwh IS NOT NULL
       AND vs.wltp_range_km IS NOT NULL
     ORDER BY vs.wltp_range_km DESC LIMIT 1),
    -- Herhangi büyük batarya (>=70 kWh)
    (SELECT vs.id FROM vehicle_specs vs
     WHERE vs.battery_net_kwh >= 70
       AND vs.wltp_range_km IS NOT NULL
     ORDER BY vs.wltp_range_km DESC LIMIT 1)
  )
FROM users u WHERE lower(u.username) = 'oxgurunal';

DO $$
BEGIN
  IF (SELECT spec_id FROM demo_ids LIMIT 1) IS NULL THEN
    RAISE EXCEPTION 'Uygun vehicle_spec bulunamadı. seed-vehicle-specs çalıştırıldı mı?';
  END IF;
END $$;

-- ─── 4. Araç oluştur ──────────────────────────────────────────────────────
WITH new_vehicle AS (
  INSERT INTO vehicles (vehicle_spec_id, canonical_vehicle_id, display_name)
  SELECT
    d.spec_id,
    vs.canonical_vehicle_id,
    COALESCE(vs.brand || ' ' || vs.model || ' ' || vs.variant, 'Togg T10F Demo')
  FROM demo_ids d
  JOIN vehicle_specs vs ON vs.id = d.spec_id
  RETURNING id
)
UPDATE demo_ids SET vehicle_id = (SELECT id FROM new_vehicle);

-- ─── 5. Sahiplik oluştur — 2023 satın alım, 225 000 km ───────────────────
WITH new_ownership AS (
  INSERT INTO vehicle_ownerships (vehicle_id, user_id, purchase_year, odometer_km, start_odometer_km, ownership_status)
  SELECT vehicle_id, user_id, 2023, 225000, 0, 'active'
  FROM demo_ids
  RETURNING id
)
UPDATE demo_ids SET ownership_id = (SELECT id FROM new_ownership);

-- ─── 6. Trippler — son 30 gün İstanbul şehir içi ─────────────────────────
-- Hafta içi: 2 trip/gün (sabah+akşam), hafta sonu: 1 uzun trip
-- Koordinatlar: Kadıköy → Beşiktaş → Şişli → Maslak → Ataşehir gibi şehir rotaları
INSERT INTO trips (
  vehicle_id, ownership_id, user_id,
  started_at, ended_at, status,
  start_location, end_location,
  distance_m, duration_seconds, avg_speed_kmh,
  source
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  trip_start, trip_start + (dur_min * interval '1 minute'),
  'completed',
  ST_SetSRID(ST_MakePoint(lng_start, lat_start), 4326)::geography,
  ST_SetSRID(ST_MakePoint(lng_end, lat_end), 4326)::geography,
  dist_m, dur_min * 60, avg_speed,
  'mobile_gps'
FROM demo_ids d
CROSS JOIN (
  VALUES
  -- Gün 30-22: hafta içi sabah+akşam
  (now() - interval '30 days' + interval '7 hours 30 minutes',  45, 29.15, 41.035, 29.01, 41.102, 45600, 33.5),
  (now() - interval '30 days' + interval '18 hours',            38, 28.98, 41.102, 29.15, 41.035, 41800, 31.2),
  (now() - interval '29 days' + interval '7 hours 45 minutes',  52, 29.05, 41.066, 28.87, 41.112, 48200, 36.1),
  (now() - interval '29 days' + interval '18 hours 15 minutes', 44, 28.87, 41.112, 29.05, 41.066, 43500, 34.8),
  (now() - interval '28 days' + interval '8 hours',             61, 28.78, 41.045, 29.18, 41.098, 55000, 39.4),
  (now() - interval '28 days' + interval '17 hours 30 minutes', 55, 29.18, 41.098, 28.78, 41.045, 49800, 37.2),
  (now() - interval '27 days' + interval '7 hours',             48, 29.10, 41.058, 28.95, 41.115, 46500, 35.0),
  (now() - interval '27 days' + interval '18 hours',            42, 28.95, 41.115, 29.10, 41.058, 44200, 32.8),
  (now() - interval '26 days' + interval '8 hours 15 minutes',  57, 29.01, 41.042, 29.22, 41.070, 51000, 38.2),
  (now() - interval '26 days' + interval '17 hours 45 minutes', 50, 29.22, 41.070, 29.01, 41.042, 47000, 35.5),
  -- Hafta sonu - uzun
  (now() - interval '25 days' + interval '10 hours',           110, 29.00, 41.020, 29.60, 40.850, 98000, 53.5),
  (now() - interval '24 days' + interval '11 hours',            90, 29.60, 40.850, 29.00, 41.020, 82000, 54.7),
  -- Hafta içi
  (now() - interval '23 days' + interval '7 hours 30 minutes',  47, 29.05, 41.060, 28.92, 41.103, 45000, 34.1),
  (now() - interval '23 days' + interval '18 hours',            41, 28.92, 41.103, 29.05, 41.060, 43000, 32.5),
  (now() - interval '22 days' + interval '8 hours',             53, 28.80, 41.050, 29.12, 41.090, 49500, 37.5),
  (now() - interval '22 days' + interval '17 hours 30 minutes', 46, 29.12, 41.090, 28.80, 41.050, 44800, 35.1),
  (now() - interval '21 days' + interval '7 hours 45 minutes',  58, 29.15, 41.055, 28.88, 41.108, 52200, 38.8),
  (now() - interval '21 days' + interval '18 hours 15 minutes', 51, 28.88, 41.108, 29.15, 41.055, 48000, 36.4),
  (now() - interval '20 days' + interval '8 hours',             44, 28.95, 41.038, 29.20, 41.075, 43500, 33.7),
  (now() - interval '20 days' + interval '18 hours',            39, 29.20, 41.075, 28.95, 41.038, 41000, 32.0),
  (now() - interval '19 days' + interval '7 hours 30 minutes',  62, 29.08, 41.065, 28.82, 41.098, 56500, 40.2),
  (now() - interval '19 days' + interval '17 hours 45 minutes', 54, 28.82, 41.098, 29.08, 41.065, 50200, 37.9),
  -- Hafta sonu
  (now() - interval '18 days' + interval '9 hours 30 minutes', 105, 29.00, 41.015, 30.10, 40.780, 95000, 54.3),
  (now() - interval '17 days' + interval '12 hours',            85, 30.10, 40.780, 29.00, 41.015, 78000, 55.1),
  -- Hafta içi
  (now() - interval '16 days' + interval '7 hours 30 minutes',  49, 29.02, 41.058, 28.90, 41.108, 46800, 34.9),
  (now() - interval '16 days' + interval '18 hours',            43, 28.90, 41.108, 29.02, 41.058, 44000, 33.2),
  (now() - interval '15 days' + interval '8 hours 15 minutes',  56, 28.85, 41.048, 29.16, 41.088, 50800, 38.0),
  (now() - interval '15 days' + interval '17 hours 30 minutes', 48, 29.16, 41.088, 28.85, 41.048, 46200, 35.6),
  (now() - interval '14 days' + interval '7 hours',             60, 29.10, 41.062, 28.86, 41.110, 54000, 39.7),
  (now() - interval '14 days' + interval '18 hours 15 minutes', 52, 28.86, 41.110, 29.10, 41.062, 48500, 37.0),
  (now() - interval '13 days' + interval '8 hours',             45, 28.98, 41.042, 29.22, 41.072, 43800, 34.4),
  (now() - interval '13 days' + interval '18 hours',            40, 29.22, 41.072, 28.98, 41.042, 42000, 32.1),
  (now() - interval '12 days' + interval '7 hours 45 minutes',  55, 29.05, 41.055, 28.88, 41.105, 50500, 37.8),
  (now() - interval '12 days' + interval '17 hours 45 minutes', 47, 28.88, 41.105, 29.05, 41.055, 45500, 35.3),
  -- Hafta sonu
  (now() - interval '11 days' + interval '10 hours',            95, 28.95, 41.018, 29.55, 40.860, 88000, 55.6),
  (now() - interval '10 days' + interval '11 hours 30 minutes', 88, 29.55, 40.860, 28.95, 41.018, 80000, 54.5),
  -- Son hafta
  (now() - interval '9 days' + interval '7 hours 30 minutes',   50, 29.01, 41.060, 28.91, 41.106, 47500, 35.2),
  (now() - interval '9 days' + interval '18 hours',             44, 28.91, 41.106, 29.01, 41.060, 43700, 33.5),
  (now() - interval '8 days' + interval '8 hours',              58, 28.82, 41.052, 29.14, 41.092, 52500, 38.5),
  (now() - interval '8 days' + interval '17 hours 30 minutes',  49, 29.14, 41.092, 28.82, 41.052, 46800, 35.9),
  (now() - interval '7 days' + interval '7 hours 45 minutes',   63, 29.12, 41.063, 28.84, 41.112, 57000, 40.5),
  (now() - interval '7 days' + interval '18 hours 15 minutes',  55, 28.84, 41.112, 29.12, 41.063, 50800, 37.6),
  (now() - interval '6 days' + interval '8 hours',              46, 28.96, 41.040, 29.20, 41.073, 44500, 34.2),
  (now() - interval '6 days' + interval '18 hours',             41, 29.20, 41.073, 28.96, 41.040, 42300, 32.4),
  (now() - interval '5 days' + interval '7 hours 30 minutes',   53, 29.06, 41.057, 28.89, 41.107, 49200, 37.1),
  (now() - interval '5 days' + interval '17 hours 45 minutes',  46, 28.89, 41.107, 29.06, 41.057, 44800, 35.0)
) AS t(trip_start, dur_min, lng_start, lat_start, lng_end, lat_end, dist_m, avg_speed);

-- ─── 7. Şarj oturumları — 12 AC ev + 4 DC kamu ───────────────────────────
INSERT INTO charge_sessions (
  vehicle_id, ownership_id, user_id,
  started_at, ended_at,
  charge_location_type, connector_type,
  start_soc, end_soc, energy_kwh,
  cost_amount, currency,
  confidence_score
)
SELECT d.vehicle_id, d.ownership_id, d.user_id, cs_start, cs_end, loc_type, conn_type, s_soc, e_soc, energy, cost, 'TRY', conf
FROM demo_ids d
CROSS JOIN (VALUES
  -- AC home charges (geceyarısı, 8 saat)
  (now()-interval '29 days'+interval '22 hours', now()-interval '29 days'+interval '22 hours'+interval '6 hours', 'home',      'ac',    18, 80, 54.9, 274.5, 0.72),
  (now()-interval '26 days'+interval '22 hours', now()-interval '26 days'+interval '22 hours'+interval '7 hours', 'home',      'ac',    15, 85, 61.6, 308.0, 0.74),
  (now()-interval '23 days'+interval '23 hours', now()-interval '23 days'+interval '23 hours'+interval '6 hours', 'home',      'ac',    22, 80, 51.6, 258.0, 0.71),
  (now()-interval '20 days'+interval '22 hours', now()-interval '20 days'+interval '22 hours'+interval '7 hours', 'home',      'ac',    20, 82, 54.9, 274.5, 0.73),
  (now()-interval '18 days'+interval '22 hours', now()-interval '18 days'+interval '22 hours'+interval '6 hours', 'home',      'ac',    16, 80, 57.5, 287.5, 0.72),
  (now()-interval '15 days'+interval '22 hours', now()-interval '15 days'+interval '22 hours'+interval '7 hours', 'home',      'ac',    19, 83, 56.7, 283.5, 0.74),
  (now()-interval '12 days'+interval '23 hours', now()-interval '12 days'+interval '23 hours'+interval '6 hours', 'home',      'ac',    21, 80, 51.6, 258.0, 0.71),
  (now()-interval '10 days'+interval '22 hours', now()-interval '10 days'+interval '22 hours'+interval '7 hours', 'home',      'ac',    17, 82, 57.5, 287.5, 0.73),
  (now()-interval '7 days'+interval '22 hours',  now()-interval '7 days'+interval '22 hours'+interval '6 hours',  'home',      'ac',    20, 80, 51.6, 258.0, 0.72),
  (now()-interval '5 days'+interval '22 hours',  now()-interval '5 days'+interval '22 hours'+interval '7 hours',  'home',      'ac',    15, 85, 61.6, 308.0, 0.74),
  (now()-interval '3 days'+interval '23 hours',  now()-interval '3 days'+interval '23 hours'+interval '6 hours',  'home',      'ac',    18, 80, 54.9, 274.5, 0.72),
  (now()-interval '1 day'+interval '22 hours',   now()-interval '1 day'+interval '22 hours'+interval '7 hours',   'home',      'ac',    22, 83, 53.2, 266.0, 0.73),
  -- DC public charges (hızlı şarj)
  (now()-interval '25 days'+interval '12 hours', now()-interval '25 days'+interval '12 hours'+interval '45 minutes', 'public_dc', 'ccs_dc', 28, 80, 46.0, 230.0, 0.81),
  (now()-interval '18 days'+interval '13 hours', now()-interval '18 days'+interval '13 hours'+interval '40 minutes', 'public_dc', 'ccs_dc', 25, 80, 48.8, 244.0, 0.83),
  (now()-interval '11 days'+interval '12 hours', now()-interval '11 days'+interval '12 hours'+interval '45 minutes', 'public_dc', 'ccs_dc', 30, 78, 42.5, 212.5, 0.80),
  (now()-interval '4 days'+interval '13 hours',  now()-interval '4 days'+interval '13 hours'+interval '40 minutes',  'public_dc', 'ccs_dc', 22, 80, 51.5, 257.5, 0.82)
) AS c(cs_start, cs_end, loc_type, conn_type, s_soc, e_soc, energy, cost, conf);

-- ─── 8. Batarya döngü olayları ────────────────────────────────────────────
-- EFC = soc_delta / 100 (tam dolu denk döngü payı)
-- Stres: DC → yüksek stres, AC → düşük stres
INSERT INTO battery_cycle_events (
  vehicle_id, ownership_id, user_id, charge_session_id,
  start_soc, end_soc, soc_delta,
  efc_value, soc_band, charge_type,
  soc_stress_score, charge_power_stress_score, dc_stress_score,
  stress_multiplier, stress_adjusted_cycle,
  confidence_score
)
SELECT
  cs.vehicle_id, cs.ownership_id, cs.user_id, cs.id,
  cs.start_soc, cs.end_soc, cs.end_soc - cs.start_soc,
  (cs.end_soc - cs.start_soc) / 100.0,
  CASE
    WHEN cs.start_soc < 20 THEN 'low'
    WHEN cs.end_soc > 85   THEN 'high'
    ELSE 'mid'
  END,
  cs.connector_type,
  -- SOC stres: düşük başlangıç veya çok yüksek bitiş → stres
  CASE WHEN cs.start_soc < 20 OR cs.end_soc > 85 THEN 0.15 ELSE 0.05 END,
  -- Güç stresi: DC → 0.25, AC → 0.05
  CASE WHEN cs.connector_type = 'ccs_dc' THEN 0.25 ELSE 0.05 END,
  -- DC stres
  CASE WHEN cs.connector_type = 'ccs_dc' THEN 0.30 ELSE 0.00 END,
  -- Stres çarpanı (birleşik)
  CASE WHEN cs.connector_type = 'ccs_dc' THEN 1.35 ELSE 1.05 END,
  -- Stres ayarlı döngü
  ((cs.end_soc - cs.start_soc) / 100.0) *
    CASE WHEN cs.connector_type = 'ccs_dc' THEN 1.35 ELSE 1.05 END,
  cs.confidence_score
FROM charge_sessions cs
JOIN demo_ids d ON d.vehicle_id = cs.vehicle_id;

-- ─── 9. Batarya yaşam istatistikleri ─────────────────────────────────────
INSERT INTO vehicle_battery_lifecycle_stats (
  vehicle_id, ownership_id, user_id,
  total_efc, total_stress_adjusted_cycles,
  avg_charge_start_soc, avg_charge_end_soc,
  ac_charge_count, dc_charge_count, dc_charge_ratio,
  high_soc_charge_count, low_soc_charge_count,
  estimated_high_soc_hours, estimated_low_soc_events,
  avg_stress_multiplier, battery_usage_grade,
  confidence_score, last_calculated_at
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  SUM(bce.efc_value),
  SUM(bce.stress_adjusted_cycle),
  AVG(bce.start_soc),
  AVG(bce.end_soc),
  COUNT(*) FILTER (WHERE bce.charge_type = 'ac'),
  COUNT(*) FILTER (WHERE bce.charge_type = 'ccs_dc'),
  COUNT(*) FILTER (WHERE bce.charge_type = 'ccs_dc')::numeric / NULLIF(COUNT(*), 0),
  COUNT(*) FILTER (WHERE bce.end_soc > 85),
  COUNT(*) FILTER (WHERE bce.start_soc < 20),
  COUNT(*) FILTER (WHERE bce.end_soc > 85) * 8.0,
  COUNT(*) FILTER (WHERE bce.start_soc < 20),
  AVG(bce.stress_multiplier),
  'balanced',
  0.68,
  now()
FROM battery_cycle_events bce
JOIN demo_ids d ON d.vehicle_id = bce.vehicle_id
GROUP BY d.vehicle_id, d.ownership_id, d.user_id;

-- ─── 10. Kullanım profili ─────────────────────────────────────────────────
INSERT INTO usage_profiles (
  vehicle_id, ownership_id, user_id,
  profile_type, avg_daily_km, avg_weekly_km,
  city_trip_ratio, highway_trip_ratio,
  dc_charge_ratio, home_charge_ratio,
  avg_start_soc, avg_end_soc,
  confidence_score, last_calculated_at
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  'city_heavy',
  -- avg_daily_km: toplam mesafe / 30 gün
  (SELECT SUM(distance_m) / 1000.0 / 30 FROM trips WHERE vehicle_id = d.vehicle_id),
  -- avg_weekly_km: son 7 gün
  (SELECT SUM(distance_m) / 1000.0 FROM trips WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '7 days'),
  0.82, 0.18,
  0.25, 0.75,
  19.5, 81.3,
  0.71, now()
FROM demo_ids d;

-- ─── 11. Aylık raporlar ────────────────────────────────────────────────────
-- Mayıs 2026 (30 günün eski yarısı)
INSERT INTO monthly_reports (
  vehicle_id, ownership_id, user_id,
  period_year, period_month,
  trip_count, total_distance_m, total_duration_seconds,
  avg_speed_kmh, total_energy_kwh, total_cost_amount, currency,
  cost_per_km, ac_charge_count, dc_charge_count,
  fossil_equiv_cost, estimated_savings,
  confidence_score, last_calculated_at
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  2026, 5,
  (SELECT COUNT(*) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COALESCE(SUM(distance_m), 0) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COALESCE(SUM(duration_seconds), 0) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  34.2,
  (SELECT COALESCE(SUM(energy_kwh), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COALESCE(SUM(cost_amount), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  'TRY',
  1.68,
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ac') FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ccs_dc') FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5 FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5
     - COALESCE(SUM(cost_amount), 0)
   FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at < now() - interval '15 days'),
  0.70, now()
FROM demo_ids d;

-- Haziran 2026 (son 15 gün)
INSERT INTO monthly_reports (
  vehicle_id, ownership_id, user_id,
  period_year, period_month,
  trip_count, total_distance_m, total_duration_seconds,
  avg_speed_kmh, total_energy_kwh, total_cost_amount, currency,
  cost_per_km, ac_charge_count, dc_charge_count,
  fossil_equiv_cost, estimated_savings,
  confidence_score, last_calculated_at
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  2026, 6,
  (SELECT COUNT(*) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COALESCE(SUM(distance_m), 0) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COALESCE(SUM(duration_seconds), 0) FROM trips WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  35.1,
  (SELECT COALESCE(SUM(energy_kwh), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COALESCE(SUM(cost_amount), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  'TRY',
  1.65,
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ac') FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ccs_dc') FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5 FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5
     - COALESCE(SUM(cost_amount), 0)
   FROM charge_sessions WHERE vehicle_id = d.vehicle_id AND started_at >= now() - interval '15 days'),
  0.72, now()
FROM demo_ids d;

-- ─── 12. Yıllık rapor 2026 ────────────────────────────────────────────────
INSERT INTO annual_reports (
  vehicle_id, ownership_id, user_id,
  period_year,
  total_distance_m, total_duration_seconds,
  avg_speed_kmh, total_energy_kwh, total_cost_amount, currency,
  cost_per_km, ac_charge_count, dc_charge_count,
  fossil_equiv_cost, estimated_savings,
  confidence_score, last_calculated_at
)
SELECT
  d.vehicle_id, d.ownership_id, d.user_id,
  2026,
  (SELECT COALESCE(SUM(distance_m), 0) FROM trips WHERE vehicle_id = d.vehicle_id),
  (SELECT COALESCE(SUM(duration_seconds), 0) FROM trips WHERE vehicle_id = d.vehicle_id),
  34.6,
  (SELECT COALESCE(SUM(energy_kwh), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  (SELECT COALESCE(SUM(cost_amount), 0) FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  'TRY',
  1.67,
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ac') FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  (SELECT COUNT(*) FILTER (WHERE connector_type = 'ccs_dc') FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5 FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  (SELECT COALESCE(SUM(energy_kwh), 0) * 12.5
     - COALESCE(SUM(cost_amount), 0)
   FROM charge_sessions WHERE vehicle_id = d.vehicle_id),
  0.71, now()
FROM demo_ids d;

-- ─── 13. Gün 0 değerlendirmesi ────────────────────────────────────────────
-- 2023'ten 2026'ya 3 yıl, 225 000 km → 75 000 km/yıl → HEAVY_USED_WORN
INSERT INTO vehicle_assessments (
  vehicle_id, ownership_id,
  purchase_year, odometer_km, city,
  vehicle_age_years, annual_km, monthly_km,
  practical_range_km, estimated_total_full_cycles, estimated_monthly_full_cycles,
  city_traffic_class, usage_load_multiplier, usage_load_adjusted_annual_km,
  scenario_id, scenario_title, scenario_body,
  confidence
)
SELECT
  d.vehicle_id, d.ownership_id,
  2023, 225000, 'İstanbul',
  3, 75000, 6250,
  -- practical_range = wltp * 0.85 (Togg T10F Uzun ~522 km → ~444 km)
  COALESCE(ROUND(vs.wltp_range_km * 0.85), 444),
  -- estimated_total_full_cycles = odometer / practical_range
  ROUND((225000.0 / COALESCE(vs.wltp_range_km * 0.85, 444))::numeric, 1),
  -- monthly_full_cycles = annual / practical_range / 12
  ROUND((75000.0 / COALESCE(vs.wltp_range_km * 0.85, 444) / 12)::numeric, 2),
  'heavy', 1.150, 86250,
  'HEAVY_USED_WORN',
  'Yüksek Kullanım – Yoğun Döngü',
  'Bu araç 3 yılda 225 000 km yapmış; yıllık ortalama 75 000 km İstanbul trafiğinde '
  || 'kullanılmıştır. Tahmini batarya döngüsü 500+ EFC seviyesinde. '
  || 'Şarj davranışınız ve servis takibiniz bu noktada kritik önem taşımaktadır.',
  'estimated'
FROM demo_ids d
JOIN vehicle_specs vs ON vs.id = d.spec_id;

-- ─── 14. Özet ─────────────────────────────────────────────────────────────
SELECT
  'TAMAMLANDI' AS durum,
  (SELECT COUNT(*) FROM trips WHERE vehicle_id = d.vehicle_id)              AS trip_sayisi,
  (SELECT ROUND(SUM(distance_m)/1000.0) FROM trips WHERE vehicle_id = d.vehicle_id) AS toplam_km,
  (SELECT COUNT(*) FROM charge_sessions WHERE vehicle_id = d.vehicle_id)    AS sarj_sayisi,
  (SELECT ROUND(total_efc::numeric, 2) FROM vehicle_battery_lifecycle_stats WHERE vehicle_id = d.vehicle_id) AS toplam_efc,
  (SELECT scenario_id FROM vehicle_assessments WHERE vehicle_id = d.vehicle_id LIMIT 1) AS senaryo,
  d.vehicle_id, d.ownership_id
FROM demo_ids d;

COMMIT;
`);
