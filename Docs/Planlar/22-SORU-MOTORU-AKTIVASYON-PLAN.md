# DMyC Soru Motoru Aktivasyon Planı

## Amaç

Roadmap Faz 2'nin eksik kalan parçasını kapatmak: davranış soru motoru ve sessizleşme.

Veri modeli (`trip_contexts`, `trip_context_questions`, `trip_behavior_signals`) zaten var.
Eksik olan: bu tabloların mobil akışa bağlanması, soru tetikleme mantığı ve sessizleşme kuralı.

Vizyon prensibi: "Sistem gözlemler, emin olamadığında sorar, zamanla susar."

---

## Roadmap Bağlamı

```text
Faz 2 — Trip Context Engine (kısmi kapandı → bu plan kapatır)
```

Bağımlı mevcut temel:

```text
trips, trip_points
trip_contexts (tablo var)
trip_context_questions (tablo var)
trip_behavior_signals (tablo var)
route_fingerprints (sapma tespiti için)
```

---

## Kapsam

### Kapsam İçi

```text
Trip bitişi sonrası soru tetikleme mantığı
Sessizleşme kuralı (aynı rota N kez tekrarlandıysa sorma)
Sapma tespiti → "Bugün farklı gitti" push/bildirim hazırlığı
Klima, yolcu sayısı, yük soruları
TripContextService (soru üretimi + yanıt kaydı)
POST /trips/:id/context-answer
GET /trips/:id/context-questions
Mobil trip bitişi sonrası mini soru kartı
```

### Kapsam Dışı

```text
Push notification altyapısı
Sürücü davranış puanı
Bluetooth sürücü tespiti (ileride ayrı plan)
Hava durumu API entegrasyonu (sabit veri yeterli şimdilik)
```

---

## Sessizleşme Kuralı

```text
Aynı route_key için:
  observed_trip_count < 3  → klima + yolcu sor
  observed_trip_count 3-9  → sadece anormalse sor
  observed_trip_count ≥ 10 → hiç sorma (silence)

Sapma varsa (deviation_distance_ratio > 0.2):
  Sessizlik kırılır, tek soru sorulur.
```

---

## Soru Tipleri

```text
CLIMATE_USAGE  — "Klima açık mıydı?" (evet/hayır/bilmiyorum)
PASSENGER_COUNT — "Araçta kaç kişiydiniz?" (1/2/3+)
CARGO_PRESENCE — "Ağır yük var mıydı?" (evet/hayır)
DEVIATION_REASON — "Bu yolculuk farklı görünüyor. Açıklama?"
```

---

## Fazlar

### Faz 22A: Plan ve Roadmap Senkronu

- `[x]` Soru tipleri ve sessizleşme eşikleri netleştirilir.
- `[x]` Mevcut trip_contexts, trip_context_questions tablolarının yapısı doğrulanır.

### Faz 22B: TripContextService

- `[x]` `generateQuestionsForTrip(tripId)` yazılır.
- `[x]` Route fingerprint confidence'a ve observed_trip_count'a bakarak sessizleşme uygulanır.
- `[x]` Sapma oranı eşiği aşıldıysa deviation sorusu üretilir.
- `[x]` `recordAnswer(tripId, questionType, answer)` yazılır.
- `[x]` Yanıtlar `trip_behavior_signals`'e kaydedilir.

### Faz 22C: finishTrip Entegrasyonu

- `[x]` `finishTrip` sonrası `tripContext.generateQuestionsForTrip` çağrılır.
- `[x]` Soru üretilmişse trip response'una `hasPendingQuestions: true` eklenir.

### Faz 22D: API Yüzeyi

- `[x]` `GET /trips/:id/context-questions` eklenir.
- `[x]` `POST /trips/:id/context-answers` eklenir.
- `[x]` Yanıt gönderildikten sonra usage profile refresh tetiklenir.

### Faz 22E: Mobil Görünürlük

- `[x]` Trip bitişi sonrası küçük soru kartı gösterilir.
- `[x]` Kullanıcı soruları atlayabilir (zorunlu değil).
- `[x]` Sessizleşmiş rotalar için soru kartı çıkmaz.
- `[x]` Metinler çoklu dil yapısına uygun hazırlanır.

### Faz 22F: Doğrulama

- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Aynı rotanın 10. tekrarında soru çıkmadığı doğrulanır.
- `[x]` Sapma olan yolculukta soru çıktığı doğrulanır.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Trip bitişinde bağlam soruları üretiliyor.
Tekrarlayan rotalarda sistem sessizleşiyor.
Sapma tespitinde sessizlik kırılıyor.
Yanıtlar behavior_signals'e kaydediliyor.
```

---

## Sonraki Plana Açılan Kapı

- Behavior signals birikince usage profile daha doğru segment üretir.
- Community benchmark için klima/yolcu verisi anlamlı hale gelir.
