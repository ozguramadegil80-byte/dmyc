# DMyC Aylık / Yıllık Karne Planı

## Amaç

Roadmap Faz 4'ün tamamlanmamış kısmını kapatmak: `monthly_reports` ve `annual_reports`.

İlk Karne (first-card) ve Usage Profile hazır. Eksik olan, bu verilerin dönemsel olarak
raporlanması. Kullanıcıya "bu ay ne kadar harcadım?" ve "yıllık sahiplik bana kaça mal oluyor?"
sorularının cevabını vermek ürünün elde tutma mekanizmasıdır.

Bu faz sürücü puanı veya yargılayıcı dil içermez. Sadece ekonomik görünürlük üretir.

---

## Roadmap Bağlamı

```text
Faz 4 — İlk Karne (kısmi kapandı → bu plan kapatır)
```

Bağımlı mevcut temel:

```text
trips, trip_points
charge_sessions
usage_profiles
vehicle_specs (WLTP, referans tüketim)
vehicle_ownerships
```

---

## Kapsam

### Kapsam İçi

```text
monthly_reports tablosu
annual_reports tablosu
MonthlyReportService (aggregasyon + upsert)
AnnualReportService (aylık raporlardan yıllık aggregasyon)
GET /vehicles/:id/monthly-reports/latest
GET /vehicles/:id/annual-reports/latest
finishTrip sonrası otomatik refresh
createChargeSession sonrası otomatik refresh
Mobil karne ekranında aylık özet kartı
```

### Kapsam Dışı

```text
PDF karne üretimi
Push notification
Tarihsel arşiv UI (ilk sürümde sadece son dönem)
Benzinli araç gerçek yakıt fiyatı API'si (sabit referans yeterli)
Kasko / MTV otomatik çekme
```

---

## Veri Modeli

### monthly_reports

```sql
vehicle_id        uuid NOT NULL
ownership_id      uuid
user_id           uuid
period_year       integer NOT NULL
period_month      integer NOT NULL   -- 1-12
trip_count        integer
total_distance_m  integer
total_duration_s  integer
avg_speed_kmh     numeric(7,2)
total_energy_kwh  numeric(10,3)
total_cost_amount numeric(12,2)
currency          text DEFAULT 'TRY'
cost_per_km       numeric(10,4)
ac_charge_count   integer
dc_charge_count   integer
fossil_equiv_cost numeric(12,2)      -- sabit referans: 45 TL/L × WLTP_L_100km
estimated_savings numeric(12,2)
confidence_score  numeric(5,4)
last_calculated_at timestamptz
UNIQUE (vehicle_id, period_year, period_month)
```

### annual_reports

```sql
vehicle_id          uuid NOT NULL
ownership_id        uuid
user_id             uuid
period_year         integer NOT NULL
total_distance_m    integer
total_energy_kwh    numeric(10,3)
total_cost_amount   numeric(12,2)
currency            text DEFAULT 'TRY'
cost_per_km         numeric(10,4)
fossil_equiv_cost   numeric(12,2)
estimated_savings   numeric(12,2)
optional_insurance  numeric(12,2)    -- kullanıcı girişi
optional_service    numeric(12,2)    -- servis ziyaretlerinden (opsiyonel)
total_ownership_cost numeric(12,2)
confidence_score    numeric(5,4)
last_calculated_at  timestamptz
UNIQUE (vehicle_id, period_year)
```

---

## Fazlar

### Faz 19A: Plan ve Roadmap Senkronu

- `[x]` Plan 18 (Trip Recap) kapalı kabul edilir.
- `[x]` Roadmap aktif yürütme notu bu plana güncellenir.
- `[x]` Aylık hesap kuralları netleştirilir (benzinli referans sabit: 45 TL/L, WLTP L/100km).

### Faz 19B: DB Migration

- `[x]` `monthly_reports` tablosu eklenir.
- `[x]` `annual_reports` tablosu eklenir.
- `[x]` `vehicle_id + period` unique constraint eklenir.
- `[x]` İndeksler eklenir.

### Faz 19C: MonthlyReportService

- `[x]` `refreshForVehicle(vehicleId, year, month)` yazılır.
- `[x]` O döneme ait trips aggregasyonu (km, süre, hız) yapılır.
- `[x]` O döneme ait charge_sessions aggregasyonu (kWh tahmini, maliyet) yapılır.
- `[x]` Benzinli eşdeğer hesabı deterministik kuralla üretilir.
- `[x]` Tasarruf = fossil_equiv_cost − total_cost_amount olarak hesaplanır.
- `[x]` `getLatestForVehicle(vehicleId)` yazılır.

### Faz 19D: AnnualReportService

- `[x]` `refreshForVehicle(vehicleId, year)` yazılır.
- `[x]` O yıla ait aylık raporlardan aggregasyon yapılır.
- `[x]` `getLatestForVehicle(vehicleId)` yazılır.

### Faz 19E: API Yüzeyi

- `[x]` `GET /vehicles/:id/monthly-reports/latest` eklenir.
- `[x]` `GET /vehicles/:id/annual-reports/latest` eklenir.

### Faz 19F: Otomatik Refresh Entegrasyonu

- `[x]` `finishTrip` sonrası o ay için `monthlyReport.refreshForVehicle` çağrılır.
- `[x]` `createChargeSession` sonrası o ay için `monthlyReport.refreshForVehicle` çağrılır.
- `[x]` Yıl sonu (Ocak'ta yeni trip/şarj gelince) `annualReport.refresh` tetiklenir.

### Faz 19G: Mobil Görünürlük

- `[x]` Karne ekranına "Bu Ay" özet kartı eklenir.
- `[x]` Toplam km, toplam maliyet, km başı maliyet gösterilir.
- `[x]` Benzinli eşdeğer ve tahmini tasarruf gösterilir.
- `[x]` Güven skoru düşükse "Daha fazla veri gerekiyor" mesajı çıkar.
- `[x]` Metinler çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 19H: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Aylık rapor smoke doğrulanır.
- `[x]` Mobil özet kartı gözle kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Araç bazlı aylık km, enerji ve maliyet özeti üretiliyor.
Benzinli eşdeğer maliyet karşılaştırması gösteriliyor.
Kullanıcı "bu ay ne kadar harcadım?" sorusuna cevap alıyor.
Yıllık sahiplik ekonomisi hesabı üretiliyor.
```

---

## Sonraki Plana Açılan Kapı

- Araç Sicili için yıllık rapor verisi kaynak olur.
- Public EV Karnesi için aylık/yıllık özet metrikler hazır olur.
