# DMyC Gün 0 Değerlendirme Motoru Planı

## Amaç

Kullanıcı aracı sisteme **ilk eklediği anda** deterministik bir değerlendirme üretmek.

GPS verisi yok. Şarj geçmişi yok. Yalnızca iki kaynak:

```text
fabrika verisi (vehicle_specs) + kullanıcı anketi (km, yıl, şehir)
→ deterministik hesap motoru
→ 3 senaryodan biri
→ hazır template → ilk karne
```

Bu, telemetri sisteminin **öncesinde** değer üretir. Kullanıcı ilk günden anlık bir değerlendirme görür; telemetri verileri geldikçe bu değerlendirme yerini gerçek lifecycle metriklerine bırakır.

---

## Roadmap Bağlamı

```text
Faz 4 — İlk Karne (kısmen kapalı → bu plan Gün 0 katmanını ekler)
```

Mevcut durum:

```text
- buildFirstCard (mobil) → fabrika menzil aralığı hesabı var
- vehicle_specs → WLTP, batarya, AC/DC verileri var
- first-card endpoint → menzil kartı mevcut
```

Eksik olan:

```text
- purchaseYear + odometer_km araç kayıt akışında yok
- Şehir trafik profili yok
- Yıllık km / tahmini döngü hesabı yok
- 3-senaryo sınıflandırması yok
- Template mesaj üretimi yok
- Değerlendirme sonucu DB'de saklanmıyor
```

---

## AI Kullanım Sınırı

Bu modülde AI üretimde çalışmaz.

```text
Kullanıcı veri girer
→ Deterministik motor hesap yapar
→ Araç 3 senaryodan birine düşer
→ Hazır mesaj template'i değerlerle doldurulur
→ Kullanıcı ilk araç karnesini görür
```

AI yalnızca geliştirme aşamasında 3 senaryo mesaj metninin yazımında kullanılabilir.

---

## Kapsam

### Kapsam İçi

```text
purchase_year + odometer_km → vehicle_ownerships tablosuna eklenir
Şehir trafik profilleri → sabit JSON yapısı (5 büyük şehir + default)
EvAssessmentService → deterministik hesap + 3-senaryo karar motoru
vehicle_assessments tablosu → sonuç saklanır
POST /vehicles/:id/assessment → tetikleyici endpoint
GET /vehicles/:id/assessment/latest → son değerlendirme
Mobil → ilk karne kartında Gün 0 değerlendirme bloğu
```

### Kapsam Dışı

```text
Gerçek batarya SOH ölçümü (servis cihazı gerektirir)
OEM telemetri entegrasyonu
Anlık yeniden hesaplama (kullanıcı km güncellediğinde tetikleme — sonraki faz)
Multi-variant batarya degradasyon eğrisi (ileri faz)
```

---

## Veri Modeli

### vehicle_ownerships tablosuna eklenecek alanlar

```sql
ALTER TABLE vehicle_ownerships
  ADD COLUMN purchase_year   integer,
  ADD COLUMN odometer_km     integer;
```

### city_traffic_profiles (sabit yapı — kod içi JSON)

```json
{
  "İstanbul":  { "trafficClass": "very_high", "usageLoadMultiplier": 1.15 },
  "Ankara":    { "trafficClass": "high",      "usageLoadMultiplier": 1.08 },
  "İzmir":     { "trafficClass": "high",      "usageLoadMultiplier": 1.07 },
  "Bursa":     { "trafficClass": "high",      "usageLoadMultiplier": 1.06 },
  "Antalya":   { "trafficClass": "high_hot",  "usageLoadMultiplier": 1.08 },
  "default":   { "trafficClass": "medium",    "usageLoadMultiplier": 1.00 }
}
```

### vehicle_assessments

```sql
CREATE TABLE vehicle_assessments (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id                      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  ownership_id                    uuid REFERENCES vehicle_ownerships(id) ON DELETE SET NULL,

  -- Anket girdileri
  purchase_year                   integer,
  odometer_km                     integer NOT NULL,
  city                            text,
  usage_type                      text,          -- 'city' | 'mixed' | 'highway'

  -- Hesaplanan değerler
  vehicle_age_years               integer NOT NULL,
  annual_km                       integer NOT NULL,
  monthly_km                      integer NOT NULL,
  practical_range_km              integer,
  estimated_total_full_cycles     numeric(8,1),
  estimated_monthly_full_cycles   numeric(6,2),
  city_traffic_class              text,
  usage_load_multiplier           numeric(5,3),
  usage_load_adjusted_annual_km   integer,

  -- Senaryo sonucu
  scenario_id                     text NOT NULL,  -- 'UNDER_USED_CLEAN' | 'NORMAL_USAGE' | 'HEAVY_USED_WORN'
  scenario_title                  text NOT NULL,
  scenario_body                   text NOT NULL,
  confidence                      text NOT NULL DEFAULT 'estimated',

  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_assessments_vehicle_idx
  ON vehicle_assessments (vehicle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vehicle_assessments_ownership_idx
  ON vehicle_assessments (ownership_id, created_at DESC)
  WHERE ownership_id IS NOT NULL;
```

---

## Hesap Formülleri

```text
vehicleAgeYears = max(1, currentYear - purchaseYear)

annualKm = odometer_km / vehicleAgeYears
monthlyKm = annualKm / 12

practicalRangeKm = vehicle_specs.system_default_practical_range_km
                   ?? ROUND(vehicle_specs.wltp_range_km * 0.85)

estimatedTotalFullCycles = odometer_km / practicalRangeKm
estimatedMonthlyFullCycles = monthlyKm / practicalRangeKm

usageLoadMultiplier = cityTrafficProfiles[city]?.usageLoadMultiplier ?? 1.0
usageLoadAdjustedAnnualKm = annualKm * usageLoadMultiplier
```

Edge case kuralları:

```text
- purchaseYear null veya 0 → vehicleAgeYears = 1 (araç yeni kabul edilir)
- practicalRangeKm 0 ise → hesap yapılamaz, confidence = 'low'
- odometer_km > 500.000 → validasyon hatası
- purchaseYear > currentYear → validasyon hatası
- odometer_km < 0 → validasyon hatası
```

---

## 3 Senaryo Karar Motoru

Karar öncelik sırası: önce HEAVY_USED kontrol edilir, sonra UNDER_USED, geri kalan NORMAL.

### UNDER_USED_CLEAN — Değerinin Altında / Temiz Kullanılmış

```text
Koşul:
  annualKm < 12.000
  VE estimatedTotalFullCycles < 120
```

Başlık: `Değerinin altında / temiz kullanılmış`

Template:

```text
Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.
Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım
anlamına gelir. {city} kullanım koşulları dikkate alındığında bu değer
aracın yaşına göre düşük/temiz kullanım bandındadır.

Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden
hesaplandığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj
eşdeğeri kullanmış görünür. Toplam tahmini batarya döngüsü
{estimatedTotalFullCycles} civarındadır.

Bu tablo, aracın batarya ve genel kullanım açısından değerinin altında
kullanılmış olabileceğini gösterir. Yine de gerçek batarya sağlığı için
tam şarj sonrası menzil, servis batarya ölçümü ve hızlı şarj geçmişi
ayrıca kontrol edilmelidir.
```

### NORMAL_USAGE — Orta / Normal Kullanılmış

```text
Koşul:
  annualKm >= 12.000 VE annualKm <= 30.000
  VE estimatedTotalFullCycles >= 80 VE estimatedTotalFullCycles <= 350
```

Başlık: `Orta / normal kullanım`

Template:

```text
Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.
Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım
anlamına gelir. {city} gibi trafik yükü yüksek bir şehir için bu kullanım
ortalamanın biraz üzerinde görünse de tek başına yıpratıcı kabul edilmez.

Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden
bakıldığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj eşdeğeri
kullanmış olur. Toplam tahmini batarya döngüsü {estimatedTotalFullCycles}
civarındadır.

Bu değerler aracın çok az kullanılmamış olduğunu, ancak batarya açısından
ağır yıpranmış sınıfa da girmediğini gösterir. Mevcut verilerle araç
orta / normal kullanım bandında değerlendirilir.
```

### HEAVY_USED_WORN — Çok Yıpranmış / Ağır Kullanılmış

```text
Koşul:
  annualKm > 30.000
  VEYA estimatedTotalFullCycles > 350
```

Başlık: `Yüksek kullanım`

Template:

```text
Aracınız {vehicleAgeYears} yılda {odometer_km} km yapmış görünüyor.
Bu yıllık ortalama {annualKm} km, aylık yaklaşık {monthlyKm} km kullanım
anlamına gelir. {city} koşulları dikkate alınsa bile bu değer aracın
yaşına göre yüksek kullanım bandındadır.

Fabrika verisindeki yaklaşık {practicalRangeKm} km pratik menzil üzerinden
hesaplandığında araç ayda ortalama {estimatedMonthlyFullCycles} tam şarj
eşdeğeri kullanmış görünür. Toplam tahmini batarya döngüsü
{estimatedTotalFullCycles} civarındadır.

Bu tablo aracın yoğun kullanılmış olabileceğini gösterir. Yalnızca km'ye
bakmak bu aşamada yeterli değildir; tam şarj sonrası gerçek menzil,
batarya sağlık raporu, hızlı şarj oranı ve servis kayıtları mutlaka
kontrol edilmelidir.
```

---

## Güvenlik ve Sorumluluk Notu

Kullanıcıya kesin batarya sağlığı iddiası verilmez. Tüm metinlerde:

```text
✓ Kullanılacak: görünüyor · tahmini · fabrika verisi üzerinden · ön değerlendirme
✗ Kaçınılacak: bataryanız sağlıklı · kesin değer · garanti edilir
```

---

## Fazlar

### Faz 26A: Plan ve Roadmap Senkronu

- `[ ]` Plan 25 (Insight Studio) açık sayılır, bu plan paralel ilerler.
- `[ ]` Roadmap Faz 4 bağlantısı belgelenir.
- `[ ]` Senaryo eşikleri netleştirilir (ilk MVP değerleri).

### Faz 26B: DB Migration

- `[ ]` `vehicle_ownerships` tablosuna `purchase_year` ve `odometer_km` eklenir.
- `[ ]` `vehicle_assessments` tablosu oluşturulur.
- `[ ]` İndeksler eklenir.

### Faz 26C: EvAssessmentService

- `[ ]` `cityTrafficProfiles` sabit JSON yapısı tanımlanır.
- `[ ]` `computeAssessment(input)` → hesap motoru yazılır.
- `[ ]` `selectScenario(computed)` → 3 senaryodan birini seçer.
- `[ ]` `renderTemplate(scenarioId, computed)` → template doldurulur.
- `[ ]` `createAssessment(vehicleId, ownershipId, input)` → DB'ye yazar.
- `[ ]` `getLatestAssessment(vehicleId)` → son değerlendirmeyi döner.

### Faz 26D: API Yüzeyi

- `[ ]` `POST /vehicles/:id/assessment` eklenir.
- `[ ]` `GET /vehicles/:id/assessment/latest` eklenir.
- `[ ]` Servis app.module.ts ve app.controller.ts'e eklenir.

### Faz 26E: Araç Kayıt Akışı Güncelleme

- `[ ]` `createOwnership` isteğine `purchaseYear` ve `odometerKm` alanları eklenir.
- `[ ]` `vehicle_ownerships` kaydında bu alanlar saklanır.
- `[ ]` Ownership oluşturulduktan sonra `createAssessment` otomatik tetiklenir.

### Faz 26F: Mobil Görünürlük

- `[ ]` `apiClient.ts`'e `ApiAssessment` tipi ve fetch/create fonksiyonları eklenir.
- `[ ]` Araç kayıt akışına şehir + km sorusu eklenir.
- `[ ]` SummaryStep'e "GÜN 0 DEĞERLENDİRME" bloğu eklenir.
- `[ ]` Senaryo başlığı, özet metrik (yıllık km, tahmini döngü, şehir sınıfı) gösterilir.
- `[ ]` Tam senaryo metni toggle ile açılabilir (uzun metin).
- `[ ]` Metinler çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 26G: Doğrulama

- `[ ]` DB migration uygulanır.
- `[ ]` API typecheck geçer.
- `[ ]` Mobile typecheck geçer.
- `[ ]` Senaryo seçimi 3 örnek inputla smoke doğrulanır.
- `[ ]` Template render çıktısı gözle kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Kullanıcı araç eklerken km ve yıl bilgisi girebiliyor.
Sistem araçı 3 senaryodan birine düşürüyor.
Deterministik template kullanıcıya okunabilir metin üretiyor.
Değerlendirme sonucu DB'de saklanıyor.
Mobil karne ekranında Gün 0 bloğu görünüyor.
AI üretim ortamında çalışmıyor.
```

---

## Senaryo Eşikleri (MVP — Ayarlanabilir)

```text
UNDER_USED_CLEAN:
  annualKm < 12.000
  estimatedTotalFullCycles < 120

NORMAL_USAGE:
  12.000 ≤ annualKm ≤ 30.000
  80 ≤ estimatedTotalFullCycles ≤ 350

HEAVY_USED_WORN:
  annualKm > 30.000
  VEYA estimatedTotalFullCycles > 350
```

Not: Çakışan aralıklar için HEAVY_USED önce kontrol edilir, sonra UNDER_USED, kalan NORMAL.
İleride admin panelden bu eşikler ayarlanabilir hale getirilebilir.

---

## Sonraki Plana Açılan Kapı

- Plan 21-25 tamamlandıkça bu değerlendirme üzerine ek katman eklenebilir.
- Servis ziyareti verisi (Plan 23) geldikçe `confidence` seviyesi güncellenebilir.
- Kullanıcı km bilgisini güncellediğinde yeni assessment tetiklenebilir.
- Gerçek SOH verisi gelirse (servis raporu) senaryo sonucu revize edilebilir.
