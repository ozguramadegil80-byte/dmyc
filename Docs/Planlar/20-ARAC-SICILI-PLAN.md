# DMyC Araç Sicili Planı

## Amaç

Roadmap Faz 11'i uygulamak: araç merkezli dijital sicil.

Kullanıcı değişir, araç kalır. Sahip değişse de batarya geçmişi, şarj döngüsü, km aralıkları
ve sahiplik dönemleri silinmez. Bu katman ikinci el piyasasında güven üretir ve ürünün en
savunulabilir uzun vadeli rekabet avantajını oluşturur.

---

## Roadmap Bağlamı

```text
Faz 11 — Araç Sicili
```

Bağımlı mevcut temel:

```text
vehicles, vehicle_ownerships
trips, charge_sessions
battery_cycle_events, vehicle_battery_lifecycle_stats
route_fingerprints
monthly_reports, annual_reports (Plan 19 ile gelir)
```

---

## Kapsam

### Kapsam İçi

```text
vehicle_state_snapshots   — dönemsel araç durum anlık görüntüsü
vehicle_drivers           — araçla ilişkili sürücü kayıtları
trip_driver_assignments   — sürücü-trip eşleştirmesi
co_presence_events        — yolcu tespiti (multi-driver senaryosu)
transfer_requests         — araç devir talebi
vehicle_public_reports    — QR ile paylaşılabilir sicil özeti (Plan 21 için zemin)
VehicleRegistryService
GET /vehicles/:id/registry
POST /vehicles/:id/transfer-requests
GET /vehicles/:id/transfer-requests
```

### Kapsam Dışı

```text
QR token üretimi ve public URL (Plan 21)
Ruhsat sahibi doğrulama API'si
OEM veri eşleştirme
Gerçek araç telemetri entegrasyonu
```

---

## Veri Modeli

### vehicle_state_snapshots

Sahiplik dönemi kapandığında veya yıllık periyotta otomatik üretilen donmuş durum kaydı.

```sql
id                    uuid PRIMARY KEY
vehicle_id            uuid NOT NULL REFERENCES vehicles(id)
ownership_id          uuid REFERENCES vehicle_ownerships(id)
snapshot_reason       text   -- 'ownership_end' | 'annual' | 'manual'
snapshot_date         date   NOT NULL
odometer_km           integer
trip_count            integer
total_distance_m      integer
total_energy_kwh      numeric(10,3)
battery_usage_grade   text
total_efc             numeric(10,4)
confidence_score      numeric(5,4)
created_at            timestamptz
```

### vehicle_drivers

```sql
id              uuid PRIMARY KEY
vehicle_id      uuid NOT NULL REFERENCES vehicles(id)
user_id         uuid REFERENCES users(id)
driver_label    text    -- 'primary' | 'secondary' | 'occasional'
active_since    date
active_until    date
created_at      timestamptz
```

### trip_driver_assignments

```sql
id                uuid PRIMARY KEY
trip_id           uuid NOT NULL REFERENCES trips(id)
user_id           uuid REFERENCES users(id)
assignment_method text    -- 'bluetooth' | 'phone_motion' | 'manual' | 'inferred'
confidence_score  numeric(5,4)
created_at        timestamptz
UNIQUE (trip_id)
```

### co_presence_events

```sql
id            uuid PRIMARY KEY
trip_id       uuid NOT NULL REFERENCES trips(id)
vehicle_id    uuid NOT NULL REFERENCES vehicles(id)
estimated_occupancy integer   -- tahmini yolcu sayısı
detection_method    text      -- 'weight_signal' | 'bluetooth' | 'manual'
confidence_score    numeric(5,4)
created_at          timestamptz
```

### transfer_requests

```sql
id                uuid PRIMARY KEY
vehicle_id        uuid NOT NULL REFERENCES vehicles(id)
from_ownership_id uuid REFERENCES vehicle_ownerships(id)
to_user_id        uuid REFERENCES users(id)
status            text DEFAULT 'pending'  -- 'pending' | 'accepted' | 'cancelled'
data_share_consent boolean DEFAULT false
requested_at      timestamptz
resolved_at       timestamptz
created_at        timestamptz
```

### vehicle_public_reports

Plan 21'de QR ile bağlanır; bu fazda sadece veri modeli ve üretim mantığı kurulur.

```sql
id              uuid PRIMARY KEY
vehicle_id      uuid NOT NULL REFERENCES vehicles(id)
share_token     text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
verification_level text DEFAULT 'basic'  -- 'basic' | 'confirmed' | 'verified'
period_start    date
period_end      date
snapshot_data   jsonb   -- public görünecek metrikler
view_count      integer DEFAULT 0
expires_at      timestamptz
created_at      timestamptz
```

---

## Fazlar

### Faz 20A: Plan ve Roadmap Senkronu

- `[x]` Plan 19 (Aylık/Yıllık Karne) kapalı kabul edilir.
- `[x]` Roadmap aktif yürütme notu bu plana güncellenir.
- `[x]` Sahiplik kapanış tetikleyicisi netleştirilir.

### Faz 20B: DB Migration

- `[x]` `vehicle_state_snapshots` tablosu eklenir.
- `[x]` `vehicle_drivers` tablosu eklenir.
- `[x]` `trip_driver_assignments` tablosu eklenir.
- `[x]` `co_presence_events` tablosu eklenir.
- `[x]` `transfer_requests` tablosu eklenir.
- `[x]` `vehicle_public_reports` tablosu eklenir.
- `[x]` İndeksler eklenir.

### Faz 20C: VehicleRegistryService

- `[x]` `createStateSnapshot(vehicleId, reason)` yazılır.
- `[x]` Ownership kapandığında otomatik snapshot tetiklenir.
- `[x]` `getRegistrySummary(vehicleId)` yazılır (sahiplik dönemleri, snapshot'lar, driver'lar).
- `[x]` `generatePublicReport(vehicleId)` yazılır.

### Faz 20D: Transfer Akışı

- `[x]` `POST /vehicles/:id/transfer-requests` eklenir.
- `[x]` `GET /vehicles/:id/transfer-requests` eklenir.
- `[x]` `PATCH /transfer-requests/:id` (kabul/iptal) eklenir.
- `[x]` Transfer kabul edilince yeni ownership başlatılır.
- `[x]` Veri paylaşım onayı yönetimi eklenir.

### Faz 20E: API Yüzeyi

- `[x]` `GET /vehicles/:id/registry` eklenir.
- `[x]` `GET /vehicles/:id/state-snapshots` eklenir.
- `[x]` `GET /vehicles/:id/drivers` eklenir.

### Faz 20F: Mobil Görünürlük

- `[x]` Karne ekranında "Araç Geçmişi" bölümü eklenir.
- `[x]` Sahiplik dönemleri kronolojik gösterilir.
- `[x]` Transfer talebi oluşturma akışı eklenir.
- `[x]` Metinler çoklu dil yapısına uygun hazırlanır.

### Faz 20G: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Snapshot, transfer ve registry smoke doğrulanır.
- `[x]` Mobil Araç Geçmişi ekranı gözle kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Araç bazlı dönemsel snapshot kayıtları üretiliyor.
Sahip değişiminde transfer akışı çalışıyor.
Araç geçmişi (km aralıkları, dönemler, batarya) görüntülenebiliyor.
Public report için veri modeli ve üretim mantığı hazır.
```

---

## Sonraki Plana Açılan Kapı

- Plan 21: vehicle_public_reports üzerinden QR token + public URL.
- Plan 23: service_visits verisi sicile eklenir.
