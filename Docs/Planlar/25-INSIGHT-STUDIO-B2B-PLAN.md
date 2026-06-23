# DMyC Insight Studio ve B2B Analiz Planı

## Amaç

Roadmap Faz 15'i uygulamak: B2B analiz katmanını açmak.

Sistem doğrulanmış davranış verisi üretir. Insight Studio bu veriyi OEM, batarya firmaları,
şarj operatörleri, sigorta şirketleri ve filo yöneticileri için sorgulanabilir hale getirir.

Ham veri satılmaz. Agregasyonlu, anonim, deterministik olarak üretilmiş davranış paternleri satılır.

---

## Roadmap Bağlamı

```text
Faz 15 — Insight Studio
```

Bağımlı mevcut temel:

```text
vehicle_specs, usage_profiles
trips (aggregasyon)
charge_sessions, battery_cycle_events
route_fingerprints
charging_need_clusters, charging_demand_hotspots (Plan 24)
monthly_reports, annual_reports (Plan 19)
```

---

## Kapsam

### Kapsam İçi

```text
ad_segments tablosu
insight_queries tablosu
InsightStudioService
AND/OR filtre paneli (admin API seviyesinde)
OEM sorgulama: model + bölge + şarj tipi + sıcaklık bandı
Şarj operatörü sorgulama: bölge + talep yoğunluğu
Filo sorgulama: araç bazlı kullanım profili
GET /admin/insight-queries
POST /admin/insight-queries
GET /admin/ad-segments
POST /admin/ad-segments
```

### Kapsam Dışı

```text
Gerçek zamanlı dashboard (statik sorgu yeterli)
Kullanıcı kimliği içeren herhangi bir çıktı
Otomatik reklam gösterimi
Ücret / faturalandırma sistemi
```

---

## Veri Modeli

### ad_segments

Davranış bazlı reklam segmenti tanımı.

```sql
id                uuid PRIMARY KEY
segment_key       text UNIQUE NOT NULL   -- 'high_dc_user' | 'long_trip_ev' vb.
label             text NOT NULL
description       text
filter_rules      jsonb NOT NULL         -- deterministik kural seti
vehicle_count     integer DEFAULT 0
last_calculated_at timestamptz
created_at        timestamptz
updated_at        timestamptz
```

### insight_queries

B2B sorgu kaydı.

```sql
id              uuid PRIMARY KEY
query_name      text NOT NULL
requester_label text    -- 'oem' | 'fleet' | 'insurer' | 'charge_operator'
filter_rules    jsonb NOT NULL
result_summary  jsonb
vehicle_count   integer
trip_count      integer
confidence_avg  numeric(5,4)
executed_at     timestamptz
created_at      timestamptz
```

---

## Filtre Boyutları

```text
Araç filtresi:
  vehicle_spec_id, brand, model, year
  battery_size_band, wltp_band

Kullanım filtresi:
  city_trip_ratio, dc_charge_ratio, home_charge_ratio
  avg_daily_km_band, usage_pattern ('city' | 'highway' | 'mixed')

Batarya filtresi:
  battery_usage_grade, total_efc_band, stress_multiplier_band

Şarj filtresi:
  charge_type, avg_start_soc_band, high_soc_charge_ratio

Konum filtresi:
  market_code, region (grid cell cluster)
  temperature_band

Güven filtresi:
  min_confidence_score
  min_trip_count
```

---

## Segment Örnekleri

```text
'high_dc_user'     — dc_charge_ratio > 0.4
'long_trip_ev'     — avg_trip_distance > 80km
'city_only'        — city_trip_ratio > 0.8
'high_stress_battery' — battery_usage_grade = 'high_stress'
'second_hand_ready' — ownership_duration > 365 days AND public_report EXISTS
'frequent_charger' — charge_session_count / month > 8
```

---

## Fazlar

### Faz 25A: Plan ve Roadmap Senkronu

- `[x]` Filtre boyutları ve segment tanımları netleştirilir.
- `[x]` B2B çıktıda hangi verilerin anonim olduğu belirlenir.

### Faz 25B: DB Migration

- `[x]` `ad_segments` tablosu eklenir.
- `[x]` `insight_queries` tablosu eklenir.
- `[x]` İndeksler eklenir.

### Faz 25C: InsightStudioService

- `[x]` `executeQuery(filterRules)` yazılır — tüm filtreleri AND/OR ile uygular.
- `[x]` `refreshSegment(segmentKey)` yazılır — segment vehicle_count günceller.
- `[x]` `listSegments()` yazılır.
- `[x]` `saveQuery(label, filterRules)` yazılır.

### Faz 25D: Admin API Yüzeyi

- `[x]` `POST /admin/insight-queries` eklenir (admin guard ile).
- `[x]` `GET /admin/insight-queries` eklenir.
- `[x]` `GET /admin/ad-segments` eklenir.
- `[x]` `POST /admin/ad-segments` eklenir.
- `[x]` `POST /admin/ad-segments/:key/refresh` eklenir.

### Faz 25E: İlk Segment Tanımları

- `[x]` `high_dc_user`, `long_trip_ev`, `city_only`, `high_stress_battery` segmentleri tanımlanır.
- `[x]` Her segment için filtre kuralları ve vehicle_count doğrulanır.

### Faz 25F: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Sorgu çalıştırma smoke doğrulanır.
- `[x]` Çıktıda kullanıcı kimliği bulunmadığı kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Admin AND/OR filtre ile araç davranış segmenti sorgulayabiliyor.
Segment bazlı vehicle_count üretiliyor.
Tüm çıktılar anonim ve agregasyonlu.
İlk B2B demo için hazır veri mevcut.
```

---

## Sonraki Adım

Faz 16 (Vehicle Reality Layer): Sistem artık tam vizyon soruları yanıtlayabilir.

```text
Araç ne yaptı?
Kullanıcı nasıl kullandı?
Batarya nasıl yaşlandı?
Şarj ihtiyacı nerede doğdu?
Araç değeri nasıl değişti?
```
