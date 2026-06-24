# Sürüş Davranışı Sistemi (Behavior Detection)

## Neden?

Kullanıcı bir rotayı kaydeder (örn. "Ev → İş"). Bu rota üzerinde her geçişte araç **nasıl kullanıldığı** loglanır: sert fren mi yapılıyor, ani hızlanma var mı, aşırı hız var mı? Rota bazlı davranış skoru, EV Karnesi'nin temel girdisi olur.

> Rotayı kaydetmenin amacı otomatik başlatma değil; davranış analizinin tutturulacağı bağlamı oluşturmaktır. Otomatik başlatma bu sistemin yan ürünüdür.

---

## Veri Kaynağı

`trip_points` tablosundaki `speed_kmh` sütunu saniyede ~1-3 örnek içerir. GPS hızı kısa süreli olaylar için hassasiyeti sınırlıdır; bu nedenle şunlar dikkate alınır:

- **Eşik**: minimum 2 saniye aralıkta ölçülen hız farkı
- **Filtreleme**: `accuracy_m > 30` olan noktalar event hesabına dahil edilmez
- Accelerometer entegrasyonu (ileride) — şimdilik sadece GPS hızı

---

## Event Tipleri ve Eşikler

| Event | Koşul | Örnek |
|-------|-------|-------|
| `hard_brake` | ≤ 3 saniyede hız ≥ 20 km/h düştü | 60 → 35 km/h |
| `rapid_accel` | ≤ 3 saniyede hız ≥ 20 km/h arttı | 0 → 30 km/h |
| `over_speed` | > 30 saniye boyunca hız > 100 km/h | Şehir içi sürekli hız |

### Şiddet Seviyeleri

| Seviye | Delta (km/h) |
|--------|-------------|
| `mild` | 20–30 |
| `moderate` | 31–45 |
| `severe` | > 45 |

---

## Tablo Yapısı

### `trip_behavior_events`
Ham event'ler — trip kapandıktan sonra analiz motoru üretir.

```
trip_id          → hangi yolculukta
route_fingerprint_id → hangi rotada (nullable; öğrenilmemiş rotalar dahil)
event_type       → hard_brake | rapid_accel | over_speed
occurred_at      → tam zaman
location         → haritada nokta
speed_kmh_before
speed_kmh_after
delta_kmh_per_second
severity         → mild | moderate | severe
```

### `route_fingerprints` (ek sütunlar)
Rota başına rolling ortalama — her yeni trip sonrasında güncellenir.

```
avg_hard_brake_count     → o rotada ortalama sert fren/yolculuk
avg_rapid_accel_count    → ortalama ani hızlanma/yolculuk
avg_over_speed_seconds   → ortalama aşırı hız süresi (sn)
behavior_eco_score       → 0–100 skor (formül aşağıda)
behavior_trip_count      → davranış ortalamasına dahil edilen yolculuk sayısı
```

---

## Eco Score Formülü

```
score = 100
score -= hard_brake_count × (5 | 10 | 20)   # mild | moderate | severe
score -= rapid_accel_count × (3 | 7 | 15)   # mild | moderate | severe
score -= floor(over_speed_seconds / 30)      # her 30 saniye için -1
score = max(score, 0)
```

Tek seferlik score → rota `behavior_eco_score` = rolling average (exponential, α=0.3):
```
new_avg = old_avg × 0.7 + trip_score × 0.3
```

---

## Akış

```
Trip biter
  → analiz motoru trip_points okur (hız serisi)
  → sliding window (3s) ile delta hesapla
  → eşiği geçen noktaları trip_behavior_events'e yaz
  → bu trip'e ait event'lerden trip_score hesapla
  → route_fingerprint varsa → behavior_eco_score güncelle
  → route_fingerprint yoksa → event'ler yine kaydedilir, score anonymous kalır
```

---

## UI

- **HATLARIM kartı**: rota adı + eco score badge (yeşil/turuncu/kırmızı)
- **Rota detay sayfası**: son 10 yolculukta event sayıları ve trend
- **Yolculuk özeti**: o trip'e özgü event'ler + skor
- **Aylık rapor**: rota bazlı davranış trendi (Plan 28)

---

## Sınırlamalar

- GPS hızı 30 km/h altında olay tespiti güvenilir değil (şehir içi düşük hız)
- Dur-kalk trafikte `rapid_accel` sayısı şişer — `over_speed` riski düşük olduğundan daha az ağırlık verilmeli
- İlk 3 yolculukta yeterli istatistik olmadığından `behavior_eco_score` gösterilmez (`behavior_trip_count < 3`)
