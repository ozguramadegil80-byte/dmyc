# DMyC Route Fingerprint Planı

## Amaç

Bu planın amacı, kullanıcının tekrarlayan rotalarını tam adres saklamadan öğrenmek ve
yolculuk bazlı normal tüketim/süre profili üretmektir.

Bu faz bir harita, navigasyon veya adres defteri fazı değildir.

İlk hedef:

```text
Tamamlanmış trip verilerinden privacy-safe rota fingerprint üretmek.
Benzer yolculukları aynı rota altında toplamak.
Sapma ve normal rota profilini ölçülebilir hale getirmek.
```

---

## Roadmap Bağlamı

Roadmap sırası:

```text
Faz 5 — Route Fingerprint
```

Plan 10 kapsamında kullanıcı kaydı, ownership, takip modu, trip, charge, usage profile ve ilk
karne akışı kapandı. Bu yüzden sıradaki ürün fazı, elde edilen gerçek trip verisini rota
örüntüsüne çevirmektir.

Bağımlı mevcut temel:

```text
trips
trip_points
vehicles
vehicle_ownerships
usage_profiles
```

Mevcut foundation kararları:

```text
Rotalar tam adres değil, privacy-safe origin/destination cluster ve fingerprint ile tutulmalı.
Canonical route mantığı sonradan tüketim benchmark ve community layer için kaynak olmalı.
```

---

## Kapsam Dışı

Bu fazda yapılmayacak işler:

```text
Tam adres saklama
Ev / iş gibi manuel rota etiketi isteme
Canlı navigasyon
Harita üzerinde rota çizimi
Community benchmark
Premium insight
Batarya lifecycle hesabı
```

Bu işler roadmap'te daha sonraki fazlara bırakılır.

---

## Veri Modeli

### route_fingerprints

Tekrarlayan rota kimliğini tutar.

Önerilen alanlar:

```text
id
user_id
vehicle_id
ownership_id
route_key
origin_cell
destination_cell
origin_centroid
destination_centroid
normal_distance_m
normal_duration_seconds
normal_avg_speed_kmh
observed_trip_count
confidence_score
first_seen_at
last_seen_at
created_at
updated_at
```

Kurallar:

```text
origin_cell ve destination_cell tam adres değildir.
route_key aynı kullanıcı/araç bağlamında deterministik üretilir.
confidence_score tek yolculukta yüksek güvene çıkmaz.
```

### trip_route_assignments

Bir trip'in hangi rota fingerprint'e bağlandığını tutar.

Önerilen alanlar:

```text
id
trip_id
route_fingerprint_id
assignment_confidence
deviation_distance_ratio
deviation_duration_ratio
created_at
```

Kurallar:

```text
Her tamamlanmış trip en fazla bir aktif route assignment alır.
Kısa veya eksik trip'ler fingerprint üretmeyebilir.
Sapma hesabı yeterli gözlem sayısından sonra anlamlı kabul edilir.
```

---

## Fingerprint Kuralları

İlk MVP kuralı:

```text
Başlangıç noktası privacy cell'e yuvarlanır.
Bitiş noktası privacy cell'e yuvarlanır.
Mesafe bandı route_key'e dahil edilir.
Yön ayrı rota kabul edilir.
```

Örnek route_key:

```text
origin_cell + destination_cell + distance_band
```

Başlangıç eşikleri:

```text
minimum_distance_m: 500
minimum_duration_seconds: 60
minimum_observed_trip_count_for_profile: 2
```

Bu değerler ilk uygulamada sabit başlayabilir, sonra konfigürasyona alınabilir.

---

## Fazlar

### Faz 12A: Plan ve Kaynak Senkronu

- `[x]` Roadmap Faz 5'in sıradaki ürün fazı olduğu netleşir.
- `[x]` Plan 10'un kapandığı ve yeni fazın buradan başladığı kayda geçer.
- `[x]` Roadmap aktif yürütme notu bu plana bağlanır.

### Faz 12B: DB Migration

- `[x]` `route_fingerprints` tablosu eklenir.
- `[x]` `trip_route_assignments` tablosu eklenir.
- `[x]` Kullanıcı, araç, ownership ve trip ilişkileri indekslenir.
- `[x]` PostGIS geography alanları için gerekli indeksler eklenir.

### Faz 12C: Route Fingerprint Service

- `[x]` Tamamlanan trip için başlangıç/bitiş cell hesabı yapılır.
- `[x]` Benzer rota varsa mevcut fingerprint güncellenir.
- `[x]` Benzer rota yoksa yeni fingerprint oluşturulur.
- `[x]` Rolling normal değerler güncellenir.
- `[x]` Trip assignment kaydı üretilir.

### Faz 12D: Trip Finish Entegrasyonu

- `[x]` `finishTrip` sonrası route fingerprint refresh çağrılır.
- `[x]` Eksik noktalı veya çok kısa trip'ler sessizce dışarıda bırakılır.
- `[x]` Mevcut trip recorder akışı bozulmadan çalışır.

### Faz 12E: API Okuma Yüzeyi

- `[x]` `GET /vehicles/:id/route-fingerprints` eklenir.
- `[x]` `GET /vehicles/:id/route-summary` eklenir.
- `[x]` Boş veri durumunda öğrenme mesajı döner.
- `[x]` API tam adres veya ham rota geometrisi döndürmez.

### Faz 12F: Mobil Görünürlük

- `[x]` Karne veya takip sonrası özet alanında rota öğrenme durumu gösterilir.
- `[x]` İlk tekrar eden rota için normal süre/mesafe görünür olur.
- `[x]` Kullanıcıya adres etiketi sorulmaz.
- `[x]` UI metinleri çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 12G: Doğrulama ve Smoke

- `[x]` İki benzer trip aynı fingerprint'e bağlanır.
- `[x]` Farklı hedefli trip farklı fingerprint üretir.
- `[x]` Kısa trip fingerprint üretmez.
- `[x]` Usage profile ve ilk karne akışı gerilemez.

---

## Kabul Kriterleri

Bu faz tamamlandı sayılırsa:

```text
Tamamlanmış trip verisinden route_fingerprint üretilebiliyor.
Benzer iki yolculuk aynı fingerprint altında toplanıyor.
Her trip için route assignment izlenebiliyor.
Normal mesafe, süre ve ortalama hız güncelleniyor.
API privacy-safe özet döndürüyor.
Mobilde rota öğrenme durumu görünür hale geliyor.
Tam adres veya ham rota path'i route fingerprint çıktısında yer almıyor.
```

---

## Riskler

```text
Çok kaba cell farklı rotaları birleştirebilir.
Çok ince cell aynı rotayı parçalayabilir.
Tek yolculuktan çıkarım yapmak kullanıcıya fazla kesin görünebilir.
Trip_points ham verisi ayrı kayıt katmanıdır; route fingerprint çıktısı privacy-safe kalmalıdır.
```

İlk uygulamada confidence düşük başlatılmalı ve tekrar sayısı arttıkça yükselmelidir.

---

## Doğrulama Komutları

```text
npm run api:typecheck
npm run api:build
npm run mobile:typecheck
node scripts/db-smoke.js
```

Bu faz için ek smoke önerisi:

```text
node scripts/smoke-route-fingerprints.js
```

---

## İlk Uygulama Kararı

İlk kodlama sırası:

```text
1. DB migration
2. RouteFingerprintService
3. finishTrip entegrasyonu
4. API okuma endpointleri
5. Mobil görünürlük
6. Smoke doğrulama
```

Bu faz UI-first ilerlememelidir. Rota eşleme deterministik ve test edilebilir hale geldikten
sonra mobil görünürlük eklenmelidir.
---

## Uygulama Notları

2026-06-18 durumu:

```text
DB migration uygulandı.
API typecheck ve API build geçti.
Mobile typecheck geçti.
Mevcut db smoke geçti.
Route fingerprint smoke scripti geçti; Faz 12G kapandı.
```