# DMyC Servis ve Bakım Takip Planı

## Amaç

Araç sicilinin bakım boyutunu oluşturmak.

Sistem servis noktasına yakın uzun süreli duraklamayı algılar, kullanıcıya sorar.
Kullanıcı onaylarsa belge/fotoğraf ekleyebilir. Sistem yargılayıcı etiket üretmez;
üretici bakım takvimine uyum oranını görünür kılar.

---

## Roadmap Bağlamı

```text
Vision §15 — Servis ve Bakım Takvimi
Faz 11 Araç Sicili'nin bakım verisi boyutu
```

Bağımlı mevcut temel:

```text
vehicles, vehicle_ownerships
vehicle_specs (üretici bakım periyodu)
trips, trip_points (GPS ile servis lokasyonu tespiti)
vehicle_public_reports (sicile uyum oranı eklenir)
```

---

## Kapsam

### Kapsam İçi

```text
service_visits tablosu
service_evidence tablosu
ServiceVisitService
Servis noktası yakınında durma tespiti (PostGIS)
POST /service-visits
GET /vehicles/:id/service-visits
POST /service-visits/:id/evidence
Bakım uyum oranı hesabı
Mobil Servis Geçmişi ekranı
```

### Kapsam Dışı

```text
Yetkili servis listesi API'si (manuel POI yeterli şimdilik)
OBD/CAN verisi ile servis teşhisi
Sigorta entegrasyonu
Hatırlatma push notification (ileride)
```

---

## Veri Modeli

### service_visits

```sql
id               uuid PRIMARY KEY
vehicle_id       uuid NOT NULL REFERENCES vehicles(id)
ownership_id     uuid REFERENCES vehicle_ownerships(id)
user_id          uuid REFERENCES users(id)
visit_date       date NOT NULL
visit_type       text   -- 'periodic' | 'repair' | 'tire' | 'battery_check' | 'other'
odometer_km      integer
service_location_name text
detection_method text   -- 'gps_proximity' | 'manual'
user_confirmed   boolean DEFAULT false
notes            text
confidence_score numeric(5,4) DEFAULT 0
created_at       timestamptz
updated_at       timestamptz
```

### service_evidence

```sql
id               uuid PRIMARY KEY
service_visit_id uuid NOT NULL REFERENCES service_visits(id)
evidence_type    text   -- 'photo' | 'invoice' | 'user_confirm'
storage_uri      text
raw_payload      jsonb
confidence_score numeric(5,4) DEFAULT 0
created_at       timestamptz
```

---

## Bakım Uyum Oranı

Üretici periyodik bakım aralığı vehicle_specs'ten alınır (km bazlı).
Sistem gerçek km geçişini izler:

```text
Zamanında bakım = servis_km ≤ önerilen_km + tolerans(%10)
Geç bakım = servis_km > önerilen_km + tolerans
Uyum oranı = zamanında_bakım_sayısı / toplam_bakım_sayısı
```

---

## GPS Servis Tespiti

Trip bitişinde araç belirli bir servis POI'ye ≤ 100m yakınsa ve
orada ≥ 30 dakika kaldıysa sistem şunu sorar:

```text
"Servis ziyareti algıladım. Bakım mı yaptırdın?"
```

Seçenekler: Evet → hızlı kaydet / Hayır → iptal / Sonra ekle

---

## Fazlar

### Faz 23A: Plan ve Roadmap Senkronu

- `[x]` Bakım periyodu verisi vehicle_specs'te hangi alanda tutulacağı netleştirilir.
- `[x]` Servis tespiti GPS eşik değerleri belirlenir.

### Faz 23B: DB Migration

- `[x]` `service_visits` tablosu eklenir.
- `[x]` `service_evidence` tablosu eklenir.
- `[x]` İndeksler eklenir.

### Faz 23C: ServiceVisitService

- `[x]` `createVisit(vehicleId, body)` yazılır.
- `[x]` `listForVehicle(vehicleId)` yazılır.
- `[x]` `addEvidence(visitId, body)` yazılır.
- `[x]` `calculateComplianceRate(vehicleId)` yazılır.

### Faz 23D: GPS Servis Tespiti

- `[x]` Trip bitişi sırasında son noktanın bilinen servis lokasyonlarına yakınlığı kontrol edilir.
- `[x]` Eşik aşıldıysa `trip_context_questions`'a servis sorusu eklenir.

### Faz 23E: API Yüzeyi

- `[x]` `POST /service-visits` eklenir.
- `[x]` `GET /vehicles/:id/service-visits` eklenir.
- `[x]` `POST /service-visits/:id/evidence` eklenir.
- `[x]` `GET /vehicles/:id/service-compliance` eklenir.

### Faz 23F: Mobil Görünürlük

- `[x]` Araç Sicili ekranına Servis Geçmişi bölümü eklenir.
- `[x]` Bakım uyum oranı gösterilir.
- `[x]` Sonraki tahmini bakım km'si gösterilir.
- `[x]` Metinler çoklu dil yapısına uygun hazırlanır.

### Faz 23G: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Servis visit oluşturma ve evidence smoke doğrulanır.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Servis ziyaretleri kaydedilebiliyor.
GPS ile servis noktasına yakınlık tespiti çalışıyor.
Bakım uyum oranı hesaplanıyor.
Public karne doğrulama seviyesi 'verified'e çıkabiliyor.
```

---

## Sonraki Plana Açılan Kapı

- Public EV Karnesi doğrulama seviyesi bu veriden beslenir.
- Yıllık karnede bakım maliyeti görünür olur.
