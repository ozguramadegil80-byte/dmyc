# DMyC Premium Güven Katmanı Planı

## Amaç

Roadmap Faz 9'un amacı, menzil güven planını ücretli katmana taşınabilecek rehberlik altyapısına bağlamaktır.

Bu fazın ilk sürümü Google Maps veya canlı navigasyon entegrasyonu değildir. Önce route plan sonucundan kalıcı tavsiye kayıtları üretilir; canlı rota, şarj operatörü ve sesli koç sonraki adımlarda bu kayıt modeline bağlanır.

---

## Kapsam

### Kapsam İçi

```text
route_guidance_sessions
trip_advisories
Route plan üstünden premium guidance üretimi
Araç bazlı son trip advisory okuma
Mobil menzil ekranında premium güven tavsiyeleri
Çoklu dilde görünen advisory başlık/aksiyonları
```

### Kapsam Dışı

```text
Google Maps Directions API entegrasyonu
Gerçek şarj istasyonu operatör verisi
Canlı rota geometri takibi
Background navigation
Sesli koç TTS çıktısı
Ücret/abonelik tahsilat sistemi
```

---

## Fazlar

### Faz 17A: Plan ve Roadmap Senkronu

- `[x]` Roadmap aktif yürütme notu bu plana taşınır.
- `[x]` Faz 8'in manuel menzil güven çıktısı Faz 9'un girdisi olarak kabul edilir.
- `[x]` Google Maps/canlı takip bu foundation üstüne gelecek ayrı alt adımlar olarak korunur.

### Faz 17B: DB Foundation

- `[x]` `route_guidance_sessions` tablosu eklenir.
- `[x]` `trip_advisories` tablosu eklenir.
- `[x]` Araç, route plan ve session bazlı indeksler eklenir.

### Faz 17C: Premium Guidance API

- `[x]` `POST /route-plans/:id/premium-guidance` eklenir.
- `[x]` `GET /vehicles/:id/trip-advisories/latest` eklenir.
- `[x]` Şarj molası, enerji tamponu, hız ve enerji koçu tavsiyeleri üretilir.
- `[x]` API ham tavsiye kodlarını ve trigger context'i saklar.

### Faz 17D: Mobil Görünürlük

- `[x]` Menzil planı oluşunca premium guidance otomatik üretilir.
- `[x]` Son route plan yüklenirken son trip advisory seti de okunur.
- `[x]` Menzil sonuç kartına Premium Güven bölümü eklenir.
- `[x]` Görünen advisory başlıkları ve aksiyonları çoklu dil sözlüğünden gelir.

### Faz 17E: Sonraki Genişleme

- `[x]` Google Maps Directions / rota geometri adaptörü eklenir.
- `[x]` Google Places Autocomplete ile nereden/nereye seçimi eklenir.
- `[x]` `GOOGLE_MAPS_API_KEY` yoksa manuel mesafe fallback korunur.
- `[x]` Şarj durağı adayları gerçek POI/operatör verisiyle zenginleştirilir.
- `[x]` Canlı rota takibi route guidance session'a bağlanır.
- `[x]` Sesli Enerji Koçu için advisory-to-speech metinleri hazırlanır.
- `[x]` Premium abonelik / erişim kontrolü eklenir.

### Faz 17F: Doğrulama

- `[x]` DB migration uygulanır.
- `[x]` Premium guidance smoke geçer.
- `[x]` API typecheck geçer.
- `[x]` Mobile typecheck geçer.
- `[x]` Route geometry migration uygulanır.
- `[x]` Route geometry smoke geçer.
- `[x]` Charge stop POI migration uygulanır.
- `[x]` Charge stop POI smoke geçer.
- `[x]` Canlı trip guidance API/build doğrulaması geçer.
- `[x]` Premium access migration/API/typecheck doğrulaması geçer.
- `[x]` Mobil ekranda premium tavsiye kartı gözle kontrol edilir.

---

## Kabul Kriterleri

Bu faz tamamlandığında:

```text
Kullanıcı menzil planı oluşturduğunda sistem rota için premium guidance session üretir.
Trip advisory kayıtları backend'de kalıcı olarak saklanır.
Mobil sonuç ekranı şarj, enerji tamponu, hız ve enerji koçu tavsiyelerini kullanıcının dilinde gösterir.
Google Maps ve canlı rota takibi için bağlanacak veri modeli hazır olur.
```
