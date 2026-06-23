# DMyC Şarj Davranış Kümeleme Planı

## Amaç

Roadmap Faz 13 ve 14'ü uygulamak: şarj davranışını modellemek ve şarj talep haritaları üretmek.

`charging_decision_events` tablosu ve API'si hazır. Eksik olan:
- `charging_need_clusters` — hangi kullanıcı profili nerede ve hangi koşulda şarj kararı veriyor
- `charging_demand_hotspots` — bölgesel şarj talebi haritası

Bu katman B2B insight'ının ham maddesini oluşturur.

---

## Roadmap Bağlamı

```text
Faz 13 — Charging Behavior Intelligence
Faz 14 — Charging Demand Intelligence
```

Bağımlı mevcut temel:

```text
charging_decision_events (tablo ve API hazır)
charge_sessions
trip_points (konum verisi)
vehicle_specs, usage_profiles
route_fingerprints
```

---

## Kapsam

### Kapsam İçi

```text
charging_need_clusters tablosu
charging_demand_hotspots tablosu
ChargingIntelligenceService
Kümeleme mantığı (deterministik, SOC + konum + mesafe bandı)
GET /vehicles/:id/charging-behavior
GET /charging-demand-hotspots (admin/B2B endpoint)
```

### Kapsam Dışı

```text
Makine öğrenmesi ile kümeleme
Gerçek zamanlı şarj noktası müsaitlik verisi
Kullanıcıya özel şarj tavsiyesi (Premium katman ayrı)
```

---

## Veri Modeli

### charging_need_clusters

Belirli bir kullanıcı/araç profili için şarj kararı paternini özetler.

```sql
id                    uuid PRIMARY KEY
vehicle_spec_id       uuid REFERENCES vehicle_specs(id)
soc_band_at_decision  text    -- 'low' (<30%) | 'medium' (30-60%) | 'high' (>60%)
trip_distance_band    text    -- 'short' | 'medium' | 'long'
location_context      text    -- 'home_area' | 'work_area' | 'highway' | 'unknown'
avg_start_soc         numeric(5,2)
avg_target_soc        numeric(5,2)
event_count           integer DEFAULT 0
confidence_score      numeric(5,4) DEFAULT 0
last_calculated_at    timestamptz
created_at            timestamptz
updated_at            timestamptz
UNIQUE (vehicle_spec_id, soc_band_at_decision, trip_distance_band, location_context)
```

### charging_demand_hotspots

Bölgesel şarj talep yoğunluğu. Kişisel veri içermez, agregasyondur.

```sql
id                    uuid PRIMARY KEY
grid_cell             text NOT NULL    -- "lat_2dp|lon_2dp" (privacy cell)
radius_m              integer DEFAULT 500
demand_level          text    -- 'low' | 'medium' | 'high' | 'very_high'
event_count           integer DEFAULT 0
avg_start_soc         numeric(5,2)
vehicle_spec_ids      jsonb   -- hangi araç modelleri
last_calculated_at    timestamptz
created_at            timestamptz
updated_at            timestamptz
UNIQUE (grid_cell, radius_m)
```

---

## Kümeleme Mantığı

Deterministik — makine öğrenmesi yok:

```text
SOC bandı: karar anındaki start_soc
  < 30% → 'low'
  30-60% → 'medium'
  > 60% → 'high'

Önceki trip mesafe bandı:
  < 20km → 'short'
  20-80km → 'medium'
  > 80km → 'long'

Konum bağlamı:
  Origin/destination cell'ine ≤ 500m → 'home_area' veya 'work_area'
  Otoyol grid cell'i → 'highway'
  Diğer → 'unknown'
```

---

## Fazlar

### Faz 24A: Plan ve Roadmap Senkronu

- `[x]` Kümeleme boyutları ve eşik değerleri netleştirilir.
- `[x]` Privacy cell boyutu hotspot için doğrulanır (2 decimal ≈ 1.1km).

### Faz 24B: DB Migration

- `[x]` `charging_need_clusters` tablosu eklenir.
- `[x]` `charging_demand_hotspots` tablosu eklenir.
- `[x]` İndeksler eklenir.

### Faz 24C: ChargingIntelligenceService

- `[x]` `refreshNeedClustersForVehicle(vehicleId)` yazılır.
- `[x]` `charging_decision_events` üzerinden deterministik kümeleme yapılır.
- `[x]` `refreshDemandHotspots()` yazılır (tüm araçlar için toplu).
- `[x]` `getBehaviorSummary(vehicleId)` yazılır.

### Faz 24D: createChargingDecisionEvent Entegrasyonu

- `[x]` `createChargingDecisionEvent` sonrası `needClusters.refreshForVehicle` çağrılır.
- `[x]` Hotspot refresh ayrı scheduled job'la çalışır (anlık değil).

### Faz 24E: API Yüzeyi

- `[x]` `GET /vehicles/:id/charging-behavior` eklenir.
- `[x]` `GET /charging-demand-hotspots` (admin guard ile) eklenir.

### Faz 24F: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Kümeleme smoke doğrulanır.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Şarj kararı paternleri SOC + mesafe + konum bandına göre kümeleniyor.
Bölgesel talep yoğunluğu haritası üretilebiliyor.
Kişisel veri hotspot çıktısına karışmıyor (privacy cell).
```

---

## Sonraki Plana Açılan Kapı

- Insight Studio için şarj davranış segmenti verisi hazır.
- B2B: şarj operatörlerine bölgesel talep verisi satılabilir.
