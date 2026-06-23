# DMyC Community Layer Planı

## Amaç

Bu planın amacı, tamamlanmış yolculuk ve route fingerprint verisinden anonim topluluk benchmark katmanı üretmektir.

Bu faz tekil kullanıcı verisi göstermez.

İlk hedef:

```text
Benzer araç ve benzer rota kümeleri için aggregate benchmark üretmek.
Kullanıcıya kendi aracıyla benzer araçların öğrenme/karşılaştırma durumunu göstermek.
Yetersiz örneklemde kesin karşılaştırma yapmamak.
```

---

## Roadmap Bağlamı

Roadmap sırası:

```text
Faz 7 — Community Layer
```

Plan 13 kapsamında Battery Lifecycle fazı kapanmıştır. Sıradaki ürün katmanı, araç ve rota
sinyallerinden anonim topluluk benchmark üretmektir.

Bağımlı mevcut temel:

```text
trips
trip_route_assignments
route_fingerprints
vehicles
vehicle_specs
usage_profiles
```

Veri dili kararı:

```text
Topluluk katmanı anonim ve agregasyonlu çalışır.
Tekil kullanıcı, trip veya sahiplik bilgisi benchmark çıktısında gösterilmez.
Örneklem küçükse sistem learning/insufficient_sample döner.
```

---

## Kapsam Dışı

Bu fazda yapılmayacak işler:

```text
Public leaderboard
Tekil kullanıcı sıralaması
Şehir/iklim gerçek entegrasyonu
Route plan önerisi
Premium rota güven planı
B2B insight studio
```

---

## Veri Modeli

### similar_trip_clusters

Benzer yolculuk kümelerini anonim aggregate olarak tutar.

Önerilen alanlar:

```text
id
vehicle_spec_id
route_cluster_key
passenger_bucket
cargo_bucket
climate_bucket
speed_profile_bucket
temperature_bucket
trip_count
avg_distance_m
avg_duration_seconds
avg_consumption_kwh_100km
avg_soc_drop
avg_arrival_soc
avg_speed_kmh
confidence_score
last_calculated_at
created_at
updated_at
```

### route_community_benchmarks

Bir aracın route fingerprint'i için topluluk aggregate eşleşmesini tutar.

Önerilen alanlar:

```text
id
vehicle_id
route_fingerprint_id
similar_trip_cluster_id
matched_trip_count
match_quality_score
community_avg_distance_m
community_avg_duration_seconds
community_avg_speed_kmh
community_avg_consumption_kwh_100km
community_warning
created_at
updated_at
```

---

## Fazlar

### Faz 14A: Plan ve Roadmap Senkronu

- `[x]` Roadmap Faz 7'nin sıradaki ürün fazı olduğu netleşir.
- `[x]` Plan 13'ün kapandığı ve yeni fazın buradan başladığı kayda geçer.
- `[x]` Roadmap aktif yürütme notu bu plana bağlanır.

### Faz 14B: DB Migration

- `[x]` `similar_trip_clusters` tablosu eklenir.
- `[x]` `route_community_benchmarks` tablosu eklenir.
- `[x]` Aggregate unique key ve indeksler eklenir.

### Faz 14C: Community Benchmark Service

- `[x]` Completed trip + route assignment verisinden cluster üretilir.
- `[x]` Araç spec ve route cluster bazında aggregate hesaplanır.
- `[x]` Vehicle route fingerprint için community benchmark projection yenilenir.
- `[x]` Örneklem küçükse benchmark learning olarak kalır.

### Faz 14D: Route Entegrasyonu

- `[x]` `finishTrip` sonrası route fingerprint ile birlikte community refresh çalışır.
- `[x]` Mevcut route fingerprint ve usage profile akışı bozulmaz.

### Faz 14E: API Okuma Yüzeyi

- `[x]` `GET /vehicles/:id/community-benchmark` eklenir.
- `[x]` API tekil kullanıcı/trip/sahiplik bilgisi döndürmez.
- `[x]` Düşük örneklem için learning durumu döner.

### Faz 14F: Mobil Görünürlük

- `[x]` Karne ekranında community benchmark kartı gösterilir.
- `[x]` Örneklem küçükse öğrenme dili kullanılır.
- `[x]` UI metinleri çoklu dil yapısına uygun anahtarlarla hazırlanır.

### Faz 14G: Doğrulama ve Smoke

- `[x]` Aynı araç spec ve route cluster için aggregate oluşur.
- `[x]` Farklı route farklı cluster üretir.
- `[x]` Düşük örneklem learning döner.
- `[x]` API tekil kullanıcı verisi döndürmez.

---

## Kabul Kriterleri

Bu faz tamamlandı sayılırsa:

```text
Benzer trip cluster'ları anonim aggregate olarak oluşuyor.
Route fingerprint için community benchmark projection üretilebiliyor.
API community benchmark özetini döndürüyor.
Mobil karne ekranında topluluk öğrenme/benchmark durumu görünüyor.
Tekil kullanıcı/sahiplik/trip detayı benchmark çıktısında yok.
```

---

## İlk Uygulama Kararı

İlk kodlama sırası:

```text
1. DB migration
2. CommunityBenchmarkService
3. finishTrip sonrası refresh entegrasyonu
4. API okuma endpointi
5. Mobil görünürlük
6. Smoke doğrulama
```

Bu faz sıralama veya yargı diliyle başlamamalıdır. Önce anonim aggregate ve düşük örneklem güvenliği kurulmalıdır.
---

## Uygulama Notları

2026-06-19 durumu:

```text
DB migration uygulandı.
API typecheck ve API build geçti.
Mobile typecheck geçti.
Mevcut db smoke geçti.
Community layer smoke geçti.
Faz 14 kapandı.
```